'use server';

// ---------------------------------------------------------------------------
// DAYZERO – Quest Server Actions
// ---------------------------------------------------------------------------

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type {
  Attribute,
  Difficulty,
  Effort,
  Challenge,
  QuestCompletionResult,
  CreateQuestInput,
  UpdateQuestInput,
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
const VALID_EFFORTS: readonly Effort[] = ['light', 'standard', 'deep'];
const VALID_CHALLENGES: readonly Challenge[] = ['routine', 'challenging', 'hard'];

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
  difficulty?: string;
  effort?: string | null;
  challenge?: string | null;
}): {
  isValid: boolean;
  error?: string;
  sanitized?: {
    title: string;
    description: string | null;
    attribute: Attribute;
    difficulty: Difficulty;
    effort: Effort | null;
    challenge: Challenge | null;
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

  // Difficulty defaults to medium if not given
  const diff = (params.difficulty || 'medium') as Difficulty;
  if (!VALID_DIFFICULTIES.includes(diff)) {
    return { isValid: false, error: 'Invalid difficulty tier selected.' };
  }

  const eff = params.effort ? (params.effort as Effort) : null;
  if (eff && !VALID_EFFORTS.includes(eff)) {
    return { isValid: false, error: 'Invalid effort tier selected.' };
  }

  const chal = params.challenge ? (params.challenge as Challenge) : null;
  if (chal && !VALID_CHALLENGES.includes(chal)) {
    return { isValid: false, error: 'Invalid challenge tier selected.' };
  }

  return {
    isValid: true,
    sanitized: {
      title: trimmedTitle,
      description: trimmedDesc || null,
      attribute: params.attribute as Attribute,
      difficulty: diff,
      effort: eff,
      challenge: chal,
    },
  };
}

// ---------------------------------------------------------------------------
// CREATE QUEST ACTION
// ---------------------------------------------------------------------------

export async function createQuestAction(
  formData: CreateQuestInput
): Promise<ActionResult<QuestRow>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthenticated. Please sign in.' };
  }

  const validation = validateQuestInput({
    title: formData.title,
    description: formData.description,
    attribute: formData.attribute,
    difficulty: formData.difficulty,
    effort: formData.effort,
    challenge: formData.challenge,
  });

  if (!validation.isValid || !validation.sanitized) {
    return { success: false, error: validation.error };
  }

  const { title, description, attribute, difficulty, effort, challenge } =
    validation.sanitized;

  // Insert client-allowed columns.
  // xp_reward, gold_reward, completed, completed_at are database-controlled.
  const { data, error } = await supabase
    .from('quests')
    .insert({
      user_id: user.id,
      title,
      description,
      attribute,
      difficulty,
      effort,
      challenge,
      scheduled_date: formData.scheduledDate || null,
      scheduled_start_time: formData.scheduledStartTime || null,
      estimated_minutes:
        formData.estimatedMinutes && formData.estimatedMinutes > 0
          ? formData.estimatedMinutes
          : null,
      is_main_quest: Boolean(formData.isMainQuest && formData.scheduledDate),
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/game/quests');
  revalidatePath('/game/today');
  revalidatePath('/game/week');
  revalidatePath('/game');
  return { success: true, data: data as QuestRow };
}

// ---------------------------------------------------------------------------
// UPDATE QUEST ACTION
// ---------------------------------------------------------------------------

export async function updateQuestAction(
  formData: UpdateQuestInput
): Promise<ActionResult<QuestRow>> {
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

  const validation = validateQuestInput({
    title: formData.title,
    description: formData.description,
    attribute: formData.attribute,
    difficulty: formData.difficulty,
    effort: formData.effort,
    challenge: formData.challenge,
  });

  if (!validation.isValid || !validation.sanitized) {
    return { success: false, error: validation.error };
  }

  const { title, description, attribute, difficulty, effort, challenge } =
    validation.sanitized;

  const updatePayload: Record<string, unknown> = {
    title,
    description,
    attribute,
    difficulty,
    effort,
    challenge,
  };

  if (formData.scheduledDate !== undefined) {
    updatePayload.scheduled_date = formData.scheduledDate || null;
  }
  if (formData.scheduledStartTime !== undefined) {
    updatePayload.scheduled_start_time = formData.scheduledStartTime || null;
  }
  if (formData.estimatedMinutes !== undefined) {
    updatePayload.estimated_minutes =
      formData.estimatedMinutes && formData.estimatedMinutes > 0
        ? formData.estimatedMinutes
        : null;
  }
  if (formData.isMainQuest !== undefined) {
    updatePayload.is_main_quest = Boolean(formData.isMainQuest);
  }

  const { data, error } = await supabase
    .from('quests')
    .update(updatePayload)
    .eq('id', formData.id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/game/quests');
  revalidatePath('/game/today');
  revalidatePath('/game/week');
  revalidatePath('/game');
  return { success: true, data: data as QuestRow };
}

// ---------------------------------------------------------------------------
// RESCHEDULE QUEST ACTION
// ---------------------------------------------------------------------------

export async function rescheduleQuestAction(
  questId: string,
  scheduledDate: string | null,
  scheduledStartTime?: string | null
): Promise<ActionResult<QuestRow>> {
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

  const payload: Record<string, unknown> = {
    scheduled_date: scheduledDate || null,
  };

  if (scheduledStartTime !== undefined) {
    payload.scheduled_start_time = scheduledStartTime || null;
  }

  // If unscheduling, also unmark main quest
  if (!scheduledDate) {
    payload.is_main_quest = false;
  }

  const { data, error } = await supabase
    .from('quests')
    .update(payload)
    .eq('id', questId)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/game/today');
  revalidatePath('/game/week');
  revalidatePath('/game/quests');
  return { success: true, data: data as QuestRow };
}

// ---------------------------------------------------------------------------
// SET MAIN QUEST ACTION
// ---------------------------------------------------------------------------

export async function setMainQuestAction(
  questId: string,
  isMainQuest: boolean
): Promise<ActionResult<QuestRow>> {
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

  const { data, error } = await supabase
    .from('quests')
    .update({ is_main_quest: isMainQuest })
    .eq('id', questId)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/game/today');
  revalidatePath('/game/week');
  revalidatePath('/game/quests');
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
  revalidatePath('/game/today');
  revalidatePath('/game/week');
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
    newAchievements: rpcResult.new_achievements,
    completedChallenges: rpcResult.completed_challenges?.map((c) => ({
      id: c.id,
      title: c.title,
      goldAwarded: c.gold_awarded ?? c.gold_reward ?? 0,
    })),
    challengeGoldTotal: rpcResult.challenge_gold_total,

  };

  // Revalidate all game routes where progression is displayed
  revalidatePath('/game/today');
  revalidatePath('/game/week');
  revalidatePath('/game/quests');
  revalidatePath('/game');
  revalidatePath('/game/wayfarer');
  revalidatePath('/game/chronicle');

  return { success: true, data: formattedResult };
}

