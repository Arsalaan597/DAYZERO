// ---------------------------------------------------------------------------
// DAYZERO – /game/wayfarer Page (Server Component)
// ---------------------------------------------------------------------------

import { redirect } from 'next/navigation';
import { CharacterSheet } from '@/components/game/wayfarer/character-sheet';
import { createClient } from '@/lib/supabase/server';
import type { AttributesRow, ProfileRow, RealmProgressRow } from '@/types/database';

export const metadata = {
  title: 'Wayfarer Record | DAYZERO',
  description: 'View your character sheet, attunements, streak, and realm resonance.',
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
    timezone: 'UTC',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 pb-16">
      <CharacterSheet
        profile={safeProfile}
        attributes={attributes}
        realmProgress={realmProgress}
      />
    </main>
  );
}
