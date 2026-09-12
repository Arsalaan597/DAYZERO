// ---------------------------------------------------------------------------
// DAYZERO – /game/quests Page (Server Component)
// ---------------------------------------------------------------------------

import { redirect } from 'next/navigation';
import { QuestBoard } from '@/components/game/quests/quest-board';
import { createClient } from '@/lib/supabase/server';
import type { AttributesRow, ProfileRow, QuestRow, RealmProgressRow } from '@/types/database';
import type { Quest } from '@/types/game';

export const metadata = {
  title: 'Quests | DAYZERO',
  description: 'Inscribe and fulfill vows to awaken the dormant realm.',
};

export default async function QuestsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch player profile, quests, attributes, and realm progress in parallel
  const [profileRes, questsRes, attrsRes, realmRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase
      .from('quests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase.from('attributes').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('realm_progress').select('*').eq('user_id', user.id).maybeSingle(),
  ]);

  const profile = profileRes.data as ProfileRow | null;
  const questRows = (questsRes.data ?? []) as QuestRow[];
  const attributes = attrsRes.data as AttributesRow | null;
  const realmProgress = realmRes.data as RealmProgressRow | null;

  // Fallback profile if row is missing (defensive)
  const safeProfile: ProfileRow = profile ?? {
    id: user.id,
    display_name: (user.user_metadata?.display_name as string) ?? 'Wayfarer',
    level: 1,
    xp: 0,
    gold: 0,
    streak: 0,
    last_active_date: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Convert snake_case rows to domain Quest types
  const quests: Quest[] = questRows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description,
    attribute: row.attribute,
    difficulty: row.difficulty,
    xpReward: row.xp_reward,
    goldReward: row.gold_reward,
    completed: row.completed,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  return (
    <main className="min-h-screen pb-16">
      <QuestBoard
        initialQuests={quests}
        profile={safeProfile}
        attributes={attributes}
        realmProgress={realmProgress}
      />
    </main>
  );
}
