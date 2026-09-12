import Link from 'next/link';
import { redirect } from 'next/navigation';
import { RealmMap } from '@/components/game/realm/realm-map';
import { WayfarerStats } from '@/components/game/wayfarer-stats';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/server';
import type { AttributesRow, ProfileRow, QuestRow, RealmProgressRow } from '@/types/database';

export default async function GamePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const [profileRes, attrsRes, realmRes, questsRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('attributes').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('realm_progress').select('*').eq('user_id', user.id).maybeSingle(),
    supabase
      .from('quests')
      .select('*')
      .eq('user_id', user.id)
      .eq('completed', false)
      .order('created_at', { ascending: false })
      .limit(3),
  ]);

  const profile = profileRes.data as ProfileRow | null;
  const attributes = attrsRes.data as AttributesRow | null;
  const realmProgress = realmRes.data as RealmProgressRow | null;
  const activeQuests = (questsRes.data ?? []) as QuestRow[];

  const safeProfile: ProfileRow = profile ?? {
    id: user.id,
    display_name: (user.user_metadata?.display_name as string) ?? 'Wayfarer',
    level: 1,
    xp: 0,
    gold: 0,
    streak: 0,
    last_active_date: null,
    timezone: 'UTC',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 pb-16">
      {/* Wayfarer Vitals Bar */}
      <section className="mb-8">
        <WayfarerStats
          profile={safeProfile}
          attributes={attributes}
          realmProgress={realmProgress}
          compact
        />
      </section>

      {/* Dominant Visual Element: The Ancestral Realm Map */}
      <section className="mb-10" aria-label="Ancestral Realm Visualization">
        <RealmMap
          realmProgress={realmProgress}
          attributes={attributes}
          streak={safeProfile.streak}
          lastActiveDate={safeProfile.last_active_date}
        />
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
          <Link href="/game/today">
            <Button variant="primary">Enter Today&apos;s Run</Button>
          </Link>
          <Link href="/game/week">
            <Button variant="secondary">Plan Week</Button>
          </Link>
          <Link href="/game/quests">
            <Button variant="ghost">Quest Board</Button>
          </Link>
          <Link href="/game/wayfarer">
            <Button variant="ghost">Wayfarer Record</Button>
          </Link>
        </div>
      </section>

      {/* Active Quests Preview Section */}
      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between border-b border-ash/15 pb-2">
          <h3 className="font-display text-xs tracking-[0.2em] text-ash uppercase">
            Active Inscriptions ({activeQuests.length})
          </h3>
          <Link
            href="/game/quests"
            className="text-xs text-ash/80 transition-colors hover:text-parchment"
          >
            View All Vows →
          </Link>
        </div>

        {activeQuests.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-3">
            {activeQuests.map((q) => (
              <div
                key={q.id}
                className="border border-ash/15 bg-obsidian/70 p-4 transition-colors hover:border-ash/30"
              >
                <div className="flex items-center justify-between text-[10px] tracking-wider text-ash/80 uppercase">
                  <span>{q.attribute}</span>
                  <span className="text-ember font-display">+{q.xp_reward} XP</span>
                </div>
                <h4 className="mt-2 font-display text-sm text-parchment line-clamp-1">
                  {q.title}
                </h4>
                {q.description && (
                  <p className="mt-1 text-[11px] text-ash/80 line-clamp-2">
                    {q.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-ash/15 bg-obsidian/30 p-8 text-center">
            <p className="text-xs text-ash/70">No vows currently inscribed.</p>
            <Link href="/game/quests" className="mt-3 inline-block">
              <Button variant="ghost" className="text-xs">
                + Inscribe First Quest
              </Button>
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
