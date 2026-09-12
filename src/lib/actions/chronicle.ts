'use server';

// ---------------------------------------------------------------------------
// DAYZERO – Chronicle & Trials Server Actions
// ---------------------------------------------------------------------------

import { createClient } from '@/lib/supabase/server';
import type { ActiveTrial, ChronicleData } from '@/types/game';
import type { ActiveTrialRpcRow, ChronicleDataRpcRow } from '@/types/database';

export interface ActionResult<T = unknown> {
  success: boolean;
  error?: string;
  data?: T;
}

/**
 * Fetch the 3 deterministic active trials for the authenticated user,
 * along with their current evaluated progress.
 */
export async function getActiveTrialsAction(): Promise<ActionResult<ActiveTrial[]>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthenticated. Please sign in.' };
  }

  const { data, error } = await supabase.rpc('get_active_trials');

  if (error) {
    return { success: false, error: error.message };
  }

  const rows = (data || []) as ActiveTrialRpcRow[];
  const trials: ActiveTrial[] = rows.map((r) => ({
    id: r.id,
    horizon: r.horizon,
    title: r.title,
    description: r.description,
    criteriaType: r.criteria_type,
    currentProgress: r.current_progress,
    targetCount: r.target_count,
    isCompleted: r.is_completed,
    goldReward: r.gold_reward,
    sortOrder: r.sort_order,
  }));

  return { success: true, data: trials };
}

/**
 * Fetch the complete Chronicle catalogue and the user's earned Inscriptions.
 */
export async function getChronicleDataAction(): Promise<ActionResult<ChronicleData>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthenticated. Please sign in.' };
  }

  const { data, error } = await supabase.rpc('get_chronicle_data');

  if (error) {
    return { success: false, error: error.message };
  }

  const raw = data as ChronicleDataRpcRow;
  const chronicle: ChronicleData = {
    inscriptions: (raw.inscriptions || []).map((i) => ({
      id: i.id,
      title: i.title,
      description: i.description,
      criteriaType: i.criteria_type,
      criteriaKey: i.criteria_key,
      targetValue: i.target_value,
      sortOrder: i.sort_order,
      earned: i.earned,
      earnedAt: i.earned_at,
    })),
    earnedCount: raw.earned_count,
    totalCount: raw.total_count,
    latestEarned: raw.latest_earned
      ? {
          id: raw.latest_earned.id,
          title: raw.latest_earned.title,
          earnedAt: raw.latest_earned.earned_at,
        }
      : null,
  };

  return { success: true, data: chronicle };
}
