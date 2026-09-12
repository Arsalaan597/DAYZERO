'use server';

// ---------------------------------------------------------------------------
// DAYZERO – Quest Server Actions
// ---------------------------------------------------------------------------

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type {
  Attribute,
  Difficulty,
  QuestCompletionResult,
} from '@/types/game';
import type { CompleteQuestRpcRow, QuestRow } from '@/types/database';

const VALID_ATTRIBUTES: readonly Attribute[] = [
  'intellect',
  'strength',
  'discipline',
  'wellness',
  'creativity',
];

const VALID_DIFFICULTIES: readonly Difficulty[] = ['easy', 'medium', 'hard'];

export interface ActionResult<T = unknown> {
  success: boolean;
  error?: string;
  data?: T;
}

// ---------------------------------------------------------------------------
// Validation Helper
// ---------------------------------------------------------------------------

function validateQuestInput(params: {
  title: string;
  description?: string | null;
  attribute: string;
  difficulty: string;
}): {
  isValid: boolean;
  error?: string;
  sanitized?: {
    title: string;
    description: string | null;
    attribute: Attribute;
    difficulty: Difficulty;
  };
} {
  const trimmedTitle = (params.title ?? '').trim();
  if (!trimmedTitle) {
    return { isValid: false, error: 'Quest title cannot be empty.' };
  }
  if (trimmedTitle.length > 120) {
    return { isValid: false, error: 'Quest title must be 120 characters or fewer.' };
  }

  const trimmedDesc = params.description ? params.description.trim() : null;
  if (trimmedDesc && trimmedDesc.length > 500) {
    return { isValid: false, error: 'Quest description must be 500 characters or fewer.' };
  }

  if (!VALID_ATTRIBUTES.includes(params.attribute as Attribute)) {
    return { isValid: false, error: 'Invalid attribute chosen.' };
  }

  if (!VALID_DIFFICULTIES.includes(params.difficulty as Difficulty)) {
    return { isValid: false, error: 'Invalid difficulty tier selected.' };
  }

  return {
    isValid: true,
    sanitized: {
      title: trimmedTitle,
      description: trimmedDesc || null,
      attribute: params.attribute as Attribute,
      difficulty: params.difficulty as Difficulty,
    },
  };
}

// ---------------------------------------------------------------------------
// CREATE QUEST ACTION
// ---------------------------------------------------------------------------

export async function createQuestAction(formData: {
  title: string;
  description?: string | null;
  attribute: string;
  difficulty: string;
}): Promise<ActionResult<QuestRow>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthenticated. Please sign in.' };
  }

  const validation = validateQuestInput(formData);
  if (!validation.isValid || !validation.sanitized) {
    return { success: false, error: validation.error };
  }

  const { title, description, attribute, difficulty } = validation.sanitized;

  // Insert only safe, client-allowed columns.
  // xp_reward, gold_reward, completed, completed_at are database-controlled.
  const { data, error } = await supabase
    .from('quests')
    .insert({
      user_id: user.id,
      title,
      description,
      attribute,
      difficulty,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/game/quests');
  revalidatePath('/game');
  return { success: true, data: data as QuestRow };
}

// ---------------------------------------------------------------------------
// UPDATE QUEST ACTION
// ---------------------------------------------------------------------------

export async function updateQuestAction(formData: {
  id: string;
  title: string;
  description?: string | null;
  attribute: string;
  difficulty: string;
}): Promise<ActionResult<QuestRow>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthenticated. Please sign in.' };
  }

  if (!formData.id) {
    return { success: false, error: 'Quest ID is required.' };
  }

  const validation = validateQuestInput(formData);
  if (!validation.isValid || !validation.sanitized) {
    return { success: false, error: validation.error };
  }

  const { title, description, attribute, difficulty } = validation.sanitized;

  // Update only safe quest fields belonging to this authenticated user.
  // Prohibits completion and reward tampering.
  const { data, error } = await supabase
    .from('quests')
    .update({
      title,
      description,
      attribute,
      difficulty,
    })
    .eq('id', formData.id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/game/quests');
  revalidatePath('/game');
  return { success: true, data: data as QuestRow };
}

// ---------------------------------------------------------------------------
// DELETE QUEST ACTION
// ---------------------------------------------------------------------------

export async function deleteQuestAction(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthenticated. Please sign in.' };
  }

  if (!id) {
    return { success: false, error: 'Quest ID is required.' };
  }

  const { error } = await supabase
    .from('quests')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/game/quests');
  revalidatePath('/game');
  return { success: true };
}

// ---------------------------------------------------------------------------
// COMPLETE QUEST ACTION (RPC)
// ---------------------------------------------------------------------------

export async function completeQuestAction(
  questId: string,
): Promise<ActionResult<QuestCompletionResult>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthenticated. Please sign in.' };
  }

  if (!questId) {
    return { success: false, error: 'Quest ID is required.' };
  }

  // Call the atomic SECURITY DEFINER RPC
  const { data, error } = await supabase.rpc('complete_quest', {
    p_quest_id: questId,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  const rpcResult = data as CompleteQuestRpcRow;

  const formattedResult: QuestCompletionResult = {
    success: rpcResult.success,
    questId: rpcResult.quest_id,
    xpGained: rpcResult.xp_gained,
    goldGained: rpcResult.gold_gained,
    attribute: rpcResult.attribute,
    attributeGained: rpcResult.attribute_gained,
    newAttributeValue: rpcResult.new_attribute_value,
    previousLevel: rpcResult.previous_level,
    newLevel: rpcResult.new_level,
    leveledUp: rpcResult.leveled_up,
    totalXp: rpcResult.total_xp,
    newGold: rpcResult.new_gold,
    newStreak: rpcResult.new_streak,
    realm: rpcResult.realm,
    previousRealmLevel: rpcResult.previous_realm_level,
    newRealmLevel: rpcResult.new_realm_level,
    realmLeveledUp: rpcResult.realm_leveled_up,
  };

  // Revalidate all game routes where progression is displayed
  revalidatePath('/game/quests');
  revalidatePath('/game');
  revalidatePath('/game/wayfarer');

  return { success: true, data: formattedResult };
}
