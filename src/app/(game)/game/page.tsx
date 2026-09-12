import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function GamePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Pull display_name from user metadata (set during signup)
  const displayName =
    (user.user_metadata?.display_name as string) ?? 'Wayfarer';

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      {/* Welcome section */}
      <section className="mb-16 text-center">
        <p className="text-xs tracking-[0.2em] text-ash uppercase">
          Welcome back
        </p>
        <h1 className="mt-2 font-display text-3xl tracking-wider text-parchment sm:text-4xl">
          {displayName}
        </h1>
        <div className="mx-auto mt-4 flex items-center justify-center gap-3" aria-hidden="true">
          <span className="h-px w-8 bg-ash/20" />
          <span className="text-ember text-xs">◆</span>
          <span className="h-px w-8 bg-ash/20" />
        </div>
      </section>

      {/* Realm zone — future primary visual area */}
      <section
        className="mx-auto max-w-2xl border border-ash/10 bg-obsidian/40 px-8 py-16 text-center"
        aria-label="Realm overview"
      >
        <p className="font-display text-sm tracking-[0.2em] text-ash/60 uppercase">
          The Realm
        </p>
        <p className="mt-4 text-sm leading-relaxed text-ash/40">
          The world is dormant. Your actions will awaken it.
        </p>
      </section>

      {/* Placeholder zones — future content areas */}
      <div className="mt-12 grid gap-6 sm:grid-cols-2">
        <section
          className="border border-ash/10 bg-obsidian/20 px-6 py-8 text-center"
          aria-label="Wayfarer overview"
        >
          <p className="font-display text-xs tracking-[0.2em] text-ash/40 uppercase">
            Wayfarer
          </p>
          <p className="mt-2 text-xs text-ash/30">
            Your journey begins here.
          </p>
        </section>
        <section
          className="border border-ash/10 bg-obsidian/20 px-6 py-8 text-center"
          aria-label="Quests overview"
        >
          <p className="font-display text-xs tracking-[0.2em] text-ash/40 uppercase">
            Quests
          </p>
          <p className="mt-2 text-xs text-ash/30">
            No quests assigned yet.
          </p>
        </section>
      </div>
    </div>
  );
}
