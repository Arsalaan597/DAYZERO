// ---------------------------------------------------------------------------
// DAYZERO – Wayfarer Stats Display Component
// ---------------------------------------------------------------------------

import { REALMS } from '@/config/game';
import { getLevelFromTotalXp } from '@/lib/game/xp';
import type { AttributesRow, ProfileRow, RealmProgressRow } from '@/types/database';

interface WayfarerStatsProps {
  profile: ProfileRow;
  attributes?: AttributesRow | null;
  realmProgress?: RealmProgressRow | null;
  compact?: boolean;
}

export function WayfarerStats({
  profile,
  attributes,
  realmProgress,
  compact = false,
}: WayfarerStatsProps) {
  const levelInfo = getLevelFromTotalXp(profile.xp);
  const progressPercent = Math.min(100, Math.round(levelInfo.progress * 100));

  return (
    <div className="border border-ash/15 bg-obsidian/70 p-5 backdrop-blur-xs">
      {/* Primary vitals row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Level & Name */}
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center border border-ember/40 bg-stone text-parchment">
            <span className="font-display text-lg tracking-wider text-ember">
              {profile.level}
            </span>
          </div>
          <div>
            <span className="font-display text-base tracking-widest text-parchment uppercase">
              {profile.display_name}
            </span>
            <p className="text-xs tracking-[0.15em] text-ash uppercase">
              Level {profile.level} Wayfarer
            </p>
          </div>
        </div>

        {/* Currency & Streak markers */}
        <div className="flex items-center gap-6">
          {/* Gold */}
          <div className="text-right">
            <p className="font-display text-xs tracking-widest text-ash/90 uppercase">
              Gold
            </p>
            <p className="font-display text-sm tracking-wider text-gold">
              {profile.gold} <span className="text-xs text-gold/80">G</span>
            </p>
          </div>

          {/* Streak */}
          <div className="text-right">
            <p className="font-display text-xs tracking-widest text-ash/90 uppercase">
              Streak
            </p>
            <p className="font-display text-sm tracking-wider text-ember">
              {profile.streak} <span className="text-xs text-ember/80">DAYS</span>
            </p>
          </div>
        </div>
      </div>

      {/* XP Progress Bar */}
      <div className="mt-5">
        <div className="mb-1.5 flex items-center justify-between text-xs tracking-widest text-ash/90 uppercase">
          <span>XP Progress</span>
          <span>
            {levelInfo.currentLevelXp} / {levelInfo.xpForNextLevel} XP ({progressPercent}%)
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden bg-stone">
          <div
            className="h-full bg-ember transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Five Attributes & Realm Status Grid (if attributes passed and not compact) */}
      {attributes && !compact && (
        <div className="mt-6 border-t border-ash/15 pt-5">
          <p className="mb-3 font-display text-xs tracking-[0.2em] text-ash/80 uppercase">
            Attunements & Realm Resonance
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {/* Intellect */}
            <div className="border border-ash/15 bg-stone/40 p-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs tracking-wider text-ash uppercase">Intellect</span>
                <span className="font-display text-xs text-parchment">
                  {attributes.intellect}
                </span>
              </div>
              <p className="mt-1 text-[10px] tracking-wider text-ash/70 uppercase">
                {REALMS.academy.name}
                {realmProgress && ` · Lv ${realmProgress.academy_level}`}
              </p>
            </div>

            {/* Strength */}
            <div className="border border-ash/15 bg-stone/40 p-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs tracking-wider text-ash uppercase">Strength</span>
                <span className="font-display text-xs text-parchment">
                  {attributes.strength}
                </span>
              </div>
              <p className="mt-1 text-[10px] tracking-wider text-ash/70 uppercase">
                {REALMS.wilds.name}
                {realmProgress && ` · Lv ${realmProgress.wilds_level}`}
              </p>
            </div>

            {/* Discipline */}
            <div className="border border-ash/15 bg-stone/40 p-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs tracking-wider text-ash uppercase">Discipline</span>
                <span className="font-display text-xs text-parchment">
                  {attributes.discipline}
                </span>
              </div>
              <p className="mt-1 text-[10px] tracking-wider text-ash/70 uppercase">
                {REALMS.forge.name}
                {realmProgress && ` · Lv ${realmProgress.forge_level}`}
              </p>
            </div>

            {/* Wellness */}
            <div className="border border-ash/15 bg-stone/40 p-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs tracking-wider text-ash uppercase">Wellness</span>
                <span className="font-display text-xs text-parchment">
                  {attributes.wellness}
                </span>
              </div>
              <p className="mt-1 text-[10px] tracking-wider text-ash/70 uppercase">
                {REALMS.sanctuary.name}
                {realmProgress && ` · Lv ${realmProgress.sanctuary_level}`}
              </p>
            </div>

            {/* Creativity */}
            <div className="border border-ash/15 bg-stone/40 p-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs tracking-wider text-ash uppercase">Creativity</span>
                <span className="font-display text-xs text-parchment">
                  {attributes.creativity}
                </span>
              </div>
              <p className="mt-1 text-[10px] tracking-wider text-ash/70 uppercase">
                {REALMS.atelier.name}
                {realmProgress && ` · Lv ${realmProgress.atelier_level}`}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
