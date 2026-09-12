import Link from 'next/link';
import { redirect } from 'next/navigation';
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
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 pb-16">
      {/* Wayfarer Vitals & Attributes */}
      <section className="mb-10">
        <WayfarerStats
          profile={safeProfile}
          attributes={attributes}
          realmProgress={realmProgress}
        />
      </section>

      {/* Realm overview banner */}
      <section
        className="border border-ash/15 bg-obsidian/40 px-8 py-12 text-center"
        aria-label="Realm overview"
      >
        <p className="font-display text-xs tracking-[0.25em] text-ember uppercase">
          World Resonance
        </p>
        <h2 className="mt-2 font-display text-2xl tracking-wider text-parchment uppercase sm:text-3xl">
          The Dormant World
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-xs leading-relaxed text-ash/70">
          The world has been frozen since DAYZERO. Real-world vows inscribe your path
          and channel resonance into the five ancestral realms.
        </p>
        <div className="mt-6 flex justify-center gap-4">
          <Link href="/game/quests">
            <Button variant="primary">Enter Quest Board</Button>
          </Link>
          <Link href="/game/wayfarer">
            <Button variant="secondary">Wayfarer Chronicle</Button>
          </Link>
        </div>
      </section>

      {/* Active Quests Preview Section */}
      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between border-b border-ash/10 pb-2">
          <h3 className="font-display text-xs tracking-[0.2em] text-ash uppercase">
            Active Vows ({activeQuests.length})
          </h3>
          <Link
            href="/game/quests"
            className="text-xs text-ash/60 transition-colors hover:text-parchment"
          >
            View All →
          </Link>
        </div>

        {activeQuests.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-3">
            {activeQuests.map((q) => (
              <div
                key={q.id}
                className="border border-ash/15 bg-obsidian/50 p-4 transition-colors hover:border-ash/30"
              >
                <div className="flex items-center justify-between text-[10px] tracking-wider text-ash/60 uppercase">
                  <span>{q.attribute}</span>
                  <span className="text-ember">+{q.xp_reward} XP</span>
                </div>
                <h4 className="mt-2 font-display text-sm text-parchment line-clamp-1">
                  {q.title}
                </h4>
                {q.description && (
                  <p className="mt-1 text-[11px] text-ash/60 line-clamp-2">
                    {q.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-ash/10 bg-obsidian/20 p-8 text-center">
            <p className="text-xs text-ash/50">No vows currently inscribed.</p>
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
