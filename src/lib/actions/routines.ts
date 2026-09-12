'use server';

// ---------------------------------------------------------------------------
// DAYZERO – Routine Server Actions
// ---------------------------------------------------------------------------

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type {
  Attribute,
  CreateRoutineInput,
  UpdateRoutineInput,
  QuestCompletionResult,
} from '@/types/game';
import type { CompleteQuestRpcRow, RoutineRow } from '@/types/database';

export interface ActionResult<T = unknown> {
  success: boolean;
  error?: string;
  data?: T;
}

const VALID_ATTRIBUTES: readonly Attribute[] = [
  'intellect',
  'strength',
  'discipline',
  'wellness',
  'creativity',
];

const VALID_EFFORTS = ['light', 'standard', 'deep'] as const;
const VALID_CHALLENGES = ['routine', 'challenging', 'hard'] as const;

export async function createRoutineAction(
  input: CreateRoutineInput
): Promise<ActionResult<RoutineRow>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthenticated. Please sign in.' };
  }

  const title = (input.title ?? '').trim();
  if (!title) {
    return { success: false, error: 'Routine title cannot be empty.' };
  }
  if (title.length > 120) {
    return { success: false, error: 'Title must be 120 characters or fewer.' };
  }

  if (!VALID_ATTRIBUTES.includes(input.attribute)) {
    return { success: false, error: 'Invalid attribute chosen.' };
  }

  if (!VALID_EFFORTS.includes(input.effort)) {
    return { success: false, error: 'Invalid effort tier chosen.' };
  }

  if (!VALID_CHALLENGES.includes(input.challenge)) {
    return { success: false, error: 'Invalid challenge tier chosen.' };
  }

  if (!input.daysOfWeek || input.daysOfWeek.length === 0) {
    return { success: false, error: 'Please select at least one day of the week.' };
  }

  const validDays = input.daysOfWeek.filter((d) => d >= 0 && d <= 6);
  if (validDays.length === 0) {
    return { success: false, error: 'Days of week must be between 0 (Sunday) and 6 (Saturday).' };
  }

  const { data, error } = await supabase
    .from('routines')
    .insert({
      user_id: user.id,
      title,
      description: input.description?.trim() || null,
      attribute: input.attribute,
      days_of_week: validDays,
      start_time: input.startTime || null,
      estimated_minutes: input.estimatedMinutes && input.estimatedMinutes > 0 ? input.estimatedMinutes : null,
      effort: input.effort,
      challenge: input.challenge,
      starts_on: input.startsOn || new Date().toISOString().slice(0, 10),
      ends_on: input.endsOn || null,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/game/today');
  revalidatePath('/game/week');
  return { success: true, data: data as RoutineRow };
}

export async function updateRoutineAction(
  input: UpdateRoutineInput
): Promise<ActionResult<RoutineRow>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthenticated. Please sign in.' };
  }

  if (!input.id) {
    return { success: false, error: 'Routine ID is required.' };
  }

  const title = (input.title ?? '').trim();
  if (!title) {
    return { success: false, error: 'Routine title cannot be empty.' };
  }

  if (!VALID_ATTRIBUTES.includes(input.attribute)) {
    return { success: false, error: 'Invalid attribute chosen.' };
  }

  if (!input.daysOfWeek || input.daysOfWeek.length === 0) {
    return { success: false, error: 'Please select at least one day of the week.' };
  }

  const validDays = input.daysOfWeek.filter((d) => d >= 0 && d <= 6);

  const { data, error } = await supabase
    .from('routines')
    .update({
      title,
      description: input.description?.trim() || null,
      attribute: input.attribute,
      days_of_week: validDays,
      start_time: input.startTime || null,
      estimated_minutes: input.estimatedMinutes && input.estimatedMinutes > 0 ? input.estimatedMinutes : null,
      effort: input.effort,
      challenge: input.challenge,
      starts_on: input.startsOn,
      ends_on: input.endsOn || null,
      ...(input.isActive !== undefined ? { is_active: input.isActive } : {}),
    })
    .eq('id', input.id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/game/today');
  revalidatePath('/game/week');
  return { success: true, data: data as RoutineRow };
}

export async function deleteRoutineAction(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthenticated. Please sign in.' };
  }

  const { error } = await supabase
    .from('routines')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/game/today');
  revalidatePath('/game/week');
  return { success: true };
}

export async function toggleRoutineAction(
  id: string,
  isActive: boolean
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthenticated. Please sign in.' };
  }

  const { error } = await supabase
    .from('routines')
    .update({ is_active: isActive })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/game/today');
  revalidatePath('/game/week');
  return { success: true };
}

export async function ensureRoutineInstancesAction(
  startDate: string,
  endDate: string
): Promise<ActionResult<number>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthenticated. Please sign in.' };
  }

  const { data, error } = await supabase.rpc('ensure_routine_instances', {
    p_start_date: startDate,
    p_end_date: endDate,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as number };
}

export async function completeRoutineInstanceAction(
  instanceId: string
): Promise<ActionResult<QuestCompletionResult>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthenticated. Please sign in.' };
  }

  if (!instanceId) {
    return { success: false, error: 'Instance ID is required.' };
  }

  const { data, error } = await supabase.rpc('complete_routine_instance', {
    p_instance_id: instanceId,
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

  revalidatePath('/game/today');
  revalidatePath('/game/week');
  revalidatePath('/game');
  revalidatePath('/game/wayfarer');
  revalidatePath('/game/chronicle');

  return { success: true, data: formattedResult };
}

