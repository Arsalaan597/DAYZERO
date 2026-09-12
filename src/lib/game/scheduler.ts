// ---------------------------------------------------------------------------
// DAYZERO – Life Scheduler Utilities & Queries
// ---------------------------------------------------------------------------

import { createClient } from '@/lib/supabase/server';
import type {
  TodayActivity,
  Effort,
  Challenge,
  Attribute,
  Routine,
  Quest,
} from '@/types/game';
import type {
  ProfileRow,
  QuestRow,
  RoutineInstanceRow,
} from '@/types/database';

/**
 * Deterministically get the user's current local date in YYYY-MM-DD format
 * based on their stored IANA timezone.
 */
export function getUserLocalDate(timeZone = 'UTC', date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone }).format(date);
  } catch {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'UTC' }).format(date);
  }
}

/**
 * Calculate expected canonical display rewards on the client/presentation layer
 */
export function calculateExpectedRewards(params: {
  isRoutine: boolean;
  effort?: Effort | null;
  challenge?: Challenge | null;
  difficulty?: string | null;
  isMainQuest?: boolean;
}) {
  let baseXp = 40;
  let baseGold = 15;

  if (params.effort) {
    if (params.effort === 'light') {
      baseXp = 20;
      baseGold = 8;
    } else if (params.effort === 'standard') {
      baseXp = 40;
      baseGold = 15;
    } else if (params.effort === 'deep') {
      baseXp = 70;
      baseGold = 25;
    }
  } else if (params.difficulty) {
    if (params.difficulty === 'easy') {
      baseXp = 25;
      baseGold = 10;
    } else if (params.difficulty === 'medium') {
      baseXp = 50;
      baseGold = 20;
    } else if (params.difficulty === 'hard') {
      baseXp = 100;
      baseGold = 40;
    }
  }

  let bonusXp = 0;
  let bonusGold = 0;

  if (params.challenge === 'challenging') {
    bonusXp += 10;
    bonusGold += 5;
  } else if (params.challenge === 'hard') {
    bonusXp += 25;
    bonusGold += 10;
  }

  if (params.isMainQuest) {
    bonusXp += 20;
    bonusGold += 10;
  }

  let finalXp = baseXp + bonusXp;
  let finalGold = baseGold + bonusGold;

  if (params.isRoutine) {
    finalXp = Math.round(finalXp * 0.75);
    finalGold = Math.round(finalGold * 0.75);
  }

  return { xp: finalXp, gold: finalGold };
}

/**
 * Fetch and lazy-ensure all activities for the user's local "Today"
 */
export async function getTodayData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // 1. Fetch profile to resolve timezone and streak
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  const userProfile = profile as ProfileRow | null;
  const userTz = userProfile?.timezone || 'UTC';
  const localToday = getUserLocalDate(userTz);

  // 2. Lazy bounded generation of routine instances for today
  await supabase.rpc('ensure_routine_instances', {
    p_start_date: localToday,
    p_end_date: localToday,
  });

  // 3. Fetch routine instances for today
  const { data: instances } = await supabase
    .from('routine_instances')
    .select('*')
    .eq('user_id', user.id)
    .eq('local_date', localToday)
    .order('scheduled_start_time', { ascending: true, nullsFirst: false });

  // 4. Fetch scheduled quests for today
  const { data: quests } = await supabase
    .from('quests')
    .select('*')
    .eq('user_id', user.id)
    .eq('scheduled_date', localToday)
    .order('scheduled_start_time', { ascending: true, nullsFirst: false });

  const routineInstances = (instances || []) as RoutineInstanceRow[];
  const scheduledQuests = (quests || []) as QuestRow[];

  // 5. Normalize into TodayActivity presentation model
  const activities: TodayActivity[] = [];

  for (const inst of routineInstances) {
    const rewards = calculateExpectedRewards({
      isRoutine: true,
      effort: inst.effort_snapshot,
      challenge: inst.challenge_snapshot,
      isMainQuest: false,
    });

    activities.push({
      id: `routine-${inst.id}`,
      type: 'routine',
      title: inst.title_snapshot,
      description: null,
      attribute: inst.attribute_snapshot as Attribute,
      time: inst.scheduled_start_time ? inst.scheduled_start_time.slice(0, 5) : null,
      estimatedMinutes: inst.estimated_minutes_snapshot,
      effort: inst.effort_snapshot as Effort,
      challenge: inst.challenge_snapshot as Challenge,
      isMainQuest: false,
      isCompleted: inst.status === 'completed',
      completedAt: inst.completed_at,
      expectedXp: inst.xp_awarded > 0 ? inst.xp_awarded : rewards.xp,
      expectedGold: inst.gold_awarded > 0 ? inst.gold_awarded : rewards.gold,
      sourceInstanceId: inst.id,
    });
  }

  for (const q of scheduledQuests) {
    const rewards = calculateExpectedRewards({
      isRoutine: false,
      effort: q.effort as Effort | null,
      challenge: q.challenge as Challenge | null,
      difficulty: q.difficulty,
      isMainQuest: q.is_main_quest,
    });

    activities.push({
      id: `quest-${q.id}`,
      type: 'quest',
      title: q.title,
      description: q.description,
      attribute: q.attribute as Attribute,
      time: q.scheduled_start_time ? q.scheduled_start_time.slice(0, 5) : null,
      estimatedMinutes: q.estimated_minutes,
      effort: (q.effort as Effort) || 'standard',
      challenge: (q.challenge as Challenge) || 'routine',
      isMainQuest: q.is_main_quest,
      isCompleted: q.completed,
      completedAt: q.completed_at,
      expectedXp: q.xp_reward > 0 ? q.xp_reward : rewards.xp,
      expectedGold: q.gold_reward > 0 ? q.gold_reward : rewards.gold,
      sourceQuestId: q.id,
    });
  }

  // Sort activities chronologically by scheduled time, with unscheduled times at the bottom
  activities.sort((a, b) => {
    // If one has a time and the other doesn't
    if (a.time && !b.time) return -1;
    if (!a.time && b.time) return 1;
    if (a.time && b.time) {
      return a.time.localeCompare(b.time);
    }
    return 0;
  });

  return {
    profile: userProfile,
    localToday,
    userTz,
    activities,
  };
}

/**
 * Fetch and lazy-ensure data for the 7-day Week planning view
 */
export async function getWeekData(targetDate?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  const userProfile = profile as ProfileRow | null;
  const userTz = userProfile?.timezone || 'UTC';
  const localToday = getUserLocalDate(userTz);
  const baseDateStr = targetDate || localToday;

  // Calculate 7-day window starting from baseDateStr (or current week Monday/Sunday)
  // Let's create a 7-day array starting from Monday of the current week
  const baseDate = new Date(`${baseDateStr}T12:00:00Z`);
  const dayOfWeek = baseDate.getUTCDay(); // 0 is Sun, 1 is Mon...
  // Distance to Monday (if 0 Sun, distance is -6; if 1 Mon, 0; etc.)
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const mondayDate = new Date(baseDate);
  mondayDate.setUTCDate(baseDate.getUTCDate() + diffToMonday);

  const sundayDate = new Date(mondayDate);
  sundayDate.setUTCDate(mondayDate.getUTCDate() + 6);

  const startDateStr = mondayDate.toISOString().slice(0, 10);
  const endDateStr = sundayDate.toISOString().slice(0, 10);

  // Lazy ensure routine instances for this 7-day range
  await supabase.rpc('ensure_routine_instances', {
    p_start_date: startDateStr,
    p_end_date: endDateStr,
  });

  // Fetch all routine definitions for the user
  const { data: routinesData } = await supabase
    .from('routines')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  // Fetch routine instances in the 7-day window
  const { data: instancesData } = await supabase
    .from('routine_instances')
    .select('*')
    .eq('user_id', user.id)
    .gte('local_date', startDateStr)
    .lte('local_date', endDateStr)
    .order('scheduled_start_time', { ascending: true, nullsFirst: false });

  // Fetch scheduled quests in the 7-day window
  const { data: questsData } = await supabase
    .from('quests')
    .select('*')
    .eq('user_id', user.id)
    .gte('scheduled_date', startDateStr)
    .lte('scheduled_date', endDateStr)
    .order('scheduled_start_time', { ascending: true, nullsFirst: false });

  // Also fetch unscheduled incomplete quests for easy scheduling
  const { data: unscheduledQuestsData } = await supabase
    .from('quests')
    .select('*')
    .eq('user_id', user.id)
    .is('scheduled_date', null)
    .eq('completed', false)
    .order('created_at', { ascending: false });

  const routines = (routinesData || []).map((r) => ({
    id: r.id,
    userId: r.user_id,
    title: r.title,
    description: r.description,
    attribute: r.attribute as Attribute,
    daysOfWeek: r.days_of_week,
    startTime: r.start_time ? r.start_time.slice(0, 5) : null,
    estimatedMinutes: r.estimated_minutes,
    effort: r.effort as Effort,
    challenge: r.challenge as Challenge,
    startsOn: r.starts_on,
    endsOn: r.ends_on,
    isActive: r.is_active,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  })) as Routine[];

  const instances = (instancesData || []) as RoutineInstanceRow[];
  const quests = (questsData || []).map((q) => ({
    id: q.id,
    userId: q.user_id,
    title: q.title,
    description: q.description,
    attribute: q.attribute as Attribute,
    difficulty: q.difficulty,
    xpReward: q.xp_reward,
    goldReward: q.gold_reward,
    completed: q.completed,
    completedAt: q.completed_at,
    scheduledDate: q.scheduled_date,
    scheduledStartTime: q.scheduled_start_time ? q.scheduled_start_time.slice(0, 5) : null,
    estimatedMinutes: q.estimated_minutes,
    effort: q.effort as Effort | null,
    challenge: q.challenge as Challenge | null,
    isMainQuest: q.is_main_quest,
    createdAt: q.created_at,
    updatedAt: q.updated_at,
  })) as Quest[];

  const unscheduledQuests = (unscheduledQuestsData || []).map((q) => ({
    id: q.id,
    userId: q.user_id,
    title: q.title,
    description: q.description,
    attribute: q.attribute as Attribute,
    difficulty: q.difficulty,
    xpReward: q.xp_reward,
    goldReward: q.gold_reward,
    completed: q.completed,
    completedAt: q.completed_at,
    scheduledDate: q.scheduled_date,
    scheduledStartTime: q.scheduled_start_time,
    estimatedMinutes: q.estimated_minutes,
    effort: q.effort as Effort | null,
    challenge: q.challenge as Challenge | null,
    isMainQuest: q.is_main_quest,
    createdAt: q.created_at,
    updatedAt: q.updated_at,
  })) as Quest[];

  // Build 7 days structures
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(mondayDate);
    d.setUTCDate(mondayDate.getUTCDate() + i);
    const dateStr = d.toISOString().slice(0, 10);

    const dayInstances = instances.filter((inst) => inst.local_date === dateStr);
    const dayQuests = quests.filter((q) => q.scheduledDate === dateStr);

    days.push({
      date: dateStr,
      dayName: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getUTCDay()],
      dayNumber: d.getUTCDate(),
      isToday: dateStr === localToday,
      instances: dayInstances,
      quests: dayQuests,
      mainQuest: dayQuests.find((q) => q.isMainQuest) || null,
    });
  }

  return {
    profile: userProfile,
    userTz,
    localToday,
    startDateStr,
    endDateStr,
    days,
    routines,
    unscheduledQuests,
  };
}
