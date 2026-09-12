// ---------------------------------------------------------------------------
// DAYZERO – /game/wayfarer Page (Server Component)
// ---------------------------------------------------------------------------

import { redirect } from 'next/navigation';
import { REALMS } from '@/config/game';
import { WayfarerStats } from '@/components/game/wayfarer-stats';
import { createClient } from '@/lib/supabase/server';
import type { AttributesRow, ProfileRow, RealmProgressRow } from '@/types/database';

export const metadata = {
  title: 'Wayfarer | DAYZERO',
  description: 'View your attunements, streak, and realm resonance.',
};

export default async function WayfarerPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const [profileRes, attrsRes, realmRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('attributes').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('realm_progress').select('*').eq('user_id', user.id).maybeSingle(),
  ]);

  const profile = profileRes.data as ProfileRow | null;
  const attributes = attrsRes.data as AttributesRow | null;
  const realmProgress = realmRes.data as RealmProgressRow | null;

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

  const realmList = [
    {
      info: REALMS.academy,
      level: realmProgress?.academy_level ?? 0,
      score: attributes?.intellect ?? 0,
    },
    {
      info: REALMS.wilds,
      level: realmProgress?.wilds_level ?? 0,
      score: attributes?.strength ?? 0,
    },
    {
      info: REALMS.forge,
      level: realmProgress?.forge_level ?? 0,
      score: attributes?.discipline ?? 0,
    },
    {
      info: REALMS.sanctuary,
      level: realmProgress?.sanctuary_level ?? 0,
      score: attributes?.wellness ?? 0,
    },
    {
      info: REALMS.atelier,
      level: realmProgress?.atelier_level ?? 0,
      score: attributes?.creativity ?? 0,
    },
  ];

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 pb-16">
      {/* Page Header */}
      <div className="mb-8 border-b border-ash/15 pb-5">
        <span className="text-xs tracking-[0.25em] text-ash uppercase">
          Identity & Awakening
        </span>
        <h1 className="mt-1 font-display text-2xl tracking-widest text-parchment uppercase sm:text-3xl">
          The Wayfarer
        </h1>
      </div>

      {/* Stats summary */}
      <section className="mb-10">
        <WayfarerStats
          profile={safeProfile}
          attributes={attributes}
          realmProgress={realmProgress}
        />
      </section>

      {/* Realm Resonance Breakdown */}
      <section>
        <h2 className="mb-4 font-display text-base tracking-[0.2em] text-ash uppercase">
          Realm Resonance Status
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {realmList.map(({ info, level, score }) => (
            <div
              key={info.id}
              className="border border-ash/15 bg-obsidian/60 p-5 transition-colors"
            >
              <div className="flex items-center justify-between border-b border-ash/10 pb-3">
                <span className="font-display text-sm tracking-wider text-parchment uppercase">
                  {info.name}
                </span>
                <span className="border border-ash/20 bg-stone px-2 py-0.5 font-display text-[10px] text-ember uppercase">
                  {level === 0
                    ? 'Dormant'
                    : level === 1
                    ? 'Awakening I'
                    : level === 2
                    ? 'Active II'
                    : 'Restored III'}
                </span>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-ash/70">
                {info.description}
              </p>
              <div className="mt-4 flex items-center justify-between text-xs text-ash/60">
                <span className="uppercase">{info.attribute} Score</span>
                <span className="font-display text-parchment">{score} pts</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
