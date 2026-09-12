'use client';

// ---------------------------------------------------------------------------
// DAYZERO – Realm Map Component
// ---------------------------------------------------------------------------
// Dominant visual element of the game screen representing the five realms
// of the post-collapse world surrounding the central Zeroflame.
// Desktop & Tablet: Radial topological map with SVG ley lines.
// Mobile: Stacked altar layout with top Zeroflame and touch-friendly realm nodes.
// ---------------------------------------------------------------------------

import { REALMS } from '@/config/game';
import { RealmNode } from '@/components/game/realm/realm-node';
import { RealmPaths } from '@/components/game/realm/realm-paths';
import { Zeroflame } from '@/components/game/realm/zeroflame';
import type { AttributesRow, RealmProgressRow } from '@/types/database';
import type { Realm } from '@/types/game';

interface RealmMapProps {
  realmProgress: RealmProgressRow | null;
  attributes: AttributesRow | null;
  streak: number;
  lastActiveDate?: string | null;
  activePulseRealm?: Realm | null;
  className?: string;
}

export function RealmMap({
  realmProgress,
  attributes,
  streak,
  activePulseRealm,
  className = '',
}: RealmMapProps) {
  // Extract realm tiers (0..3)
  const levels: Record<Realm, number> = {
    academy: realmProgress?.academy_level ?? 0,
    wilds: realmProgress?.wilds_level ?? 0,
    forge: realmProgress?.forge_level ?? 0,
    sanctuary: realmProgress?.sanctuary_level ?? 0,
    atelier: realmProgress?.atelier_level ?? 0,
  };

  // Extract attribute points
  const scores: Record<Realm, number> = {
    academy: attributes?.intellect ?? 0,
    wilds: attributes?.strength ?? 0,
    forge: attributes?.discipline ?? 0,
    sanctuary: attributes?.wellness ?? 0,
    atelier: attributes?.creativity ?? 0,
  };

  const totalAwakened = Object.values(levels).filter((lvl) => lvl > 0).length;

  return (
    <div
      className={`relative w-full border border-ash/15 bg-obsidian/60 p-4 sm:p-6 lg:p-8 ${className}`}
      aria-label="World Resonance Map"
    >
      {/* Header / Map Title Bar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-ash/10 pb-3">
        <div>
          <span className="text-[10px] tracking-[0.25em] text-ember uppercase">
            World Resonance
          </span>
          <h2 className="font-display text-lg tracking-widest text-parchment uppercase sm:text-xl">
            The Ancestral Realms
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="border border-ash/20 bg-stone/80 px-2.5 py-1 font-display text-[10px] tracking-wider text-ash uppercase">
            {totalAwakened} / 5 Realms Stirring
          </span>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 1. DESKTOP & TABLET VIEW: Radial Ancient Topological Map           */}
      {/* ------------------------------------------------------------------ */}
      <div className="hidden md:block">
        <div className="relative mx-auto aspect-square w-full max-w-[560px]">
          {/* Connecting SVG Ley Lines */}
          <RealmPaths levels={levels} activePulseRealm={activePulseRealm} />

          {/* Central Altar: The Zeroflame */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
            <div className="flex flex-col items-center">
              <Zeroflame streak={streak} size="md" showLabel />
            </div>
          </div>

          {/* 1. The Academy (Top: 50%, 14%) */}
          <div className="absolute top-[14%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-44">
            <RealmNode
              realm={REALMS.academy}
              level={levels.academy}
              score={scores.academy}
              isPulsing={activePulseRealm === 'academy'}
            />
          </div>

          {/* 2. The Wilds (Top-Right: 84%, 39%) */}
          <div className="absolute top-[39%] left-[84%] -translate-x-1/2 -translate-y-1/2 z-10 w-44">
            <RealmNode
              realm={REALMS.wilds}
              level={levels.wilds}
              score={scores.wilds}
              isPulsing={activePulseRealm === 'wilds'}
            />
          </div>

          {/* 3. The Forge (Bottom-Right: 71%, 83%) */}
          <div className="absolute top-[83%] left-[71%] -translate-x-1/2 -translate-y-1/2 z-10 w-44">
            <RealmNode
              realm={REALMS.forge}
              level={levels.forge}
              score={scores.forge}
              isPulsing={activePulseRealm === 'forge'}
            />
          </div>

          {/* 4. The Sanctuary (Bottom-Left: 29%, 83%) */}
          <div className="absolute top-[83%] left-[29%] -translate-x-1/2 -translate-y-1/2 z-10 w-44">
            <RealmNode
              realm={REALMS.sanctuary}
              level={levels.sanctuary}
              score={scores.sanctuary}
              isPulsing={activePulseRealm === 'sanctuary'}
            />
          </div>

          {/* 5. The Atelier (Top-Left: 16%, 39%) */}
          <div className="absolute top-[39%] left-[16%] -translate-x-1/2 -translate-y-1/2 z-10 w-44">
            <RealmNode
              realm={REALMS.atelier}
              level={levels.atelier}
              score={scores.atelier}
              isPulsing={activePulseRealm === 'atelier'}
            />
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 2. MOBILE VIEW: Stacked Altar Layout (Readable & Touch-Friendly)   */}
      {/* ------------------------------------------------------------------ */}
      <div className="block md:hidden">
        {/* Mobile Zeroflame Central Altar */}
        <div className="mb-4 flex flex-col items-center justify-center border border-ash/20 bg-stone/50 px-3 py-4">
          <Zeroflame streak={streak} size="md" showLabel />
        </div>

        {/* Mobile Realm Nodes List / Grid */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(['academy', 'wilds', 'forge', 'sanctuary', 'atelier'] as Realm[]).map((rKey) => (
            <RealmNode
              key={rKey}
              realm={REALMS[rKey]}
              level={levels[rKey]}
              score={scores[rKey]}
              isPulsing={activePulseRealm === rKey}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
