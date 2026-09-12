'use client';

// ---------------------------------------------------------------------------
// DAYZERO – Wayfarer Character Sheet Component
// ---------------------------------------------------------------------------
// Atmospheric, parchment-and-stone etched codex sheet for the Wayfarer.
// Features modular 2D layered avatar, equipped titles/mantles/crests,
// and the ENTER THE VAULT primary CTA.
// ---------------------------------------------------------------------------

import Link from 'next/link';
import { REALMS } from '@/config/game';
import { formatDeterministicDate } from '@/lib/game/dates';
import { getLevelFromTotalXp } from '@/lib/game/xp';
import { WayfarerAvatar } from '@/components/game/avatar/wayfarer-avatar';
import type { AttributesRow, ProfileRow, RealmProgressRow, EquippedCosmeticRow, VaultItemRow } from '@/types/database';
import type { Realm } from '@/types/game';

interface CharacterSheetProps {
  profile: ProfileRow;
  attributes: AttributesRow | null;
  realmProgress: RealmProgressRow | null;
  equippedCosmetics?: EquippedCosmeticRow[];
  vaultItems?: VaultItemRow[];
}

export function CharacterSheet({
  profile,
  attributes,
  realmProgress,
  equippedCosmetics = [],
  vaultItems = [],
}: CharacterSheetProps) {
  const levelInfo = getLevelFromTotalXp(profile.xp);
  const progressPercent = Math.min(100, Math.round(levelInfo.progress * 100));

  // Build lookup map for vault items
  const vaultItemsMap = new Map<string, VaultItemRow>();
  vaultItems.forEach((item) => vaultItemsMap.set(item.id, item));

  // Determine equipped items per category
  const equippedMantleItem = equippedCosmetics.find((e) => e.category === 'mantle');
  const equippedCrestItem = equippedCosmetics.find((e) => e.category === 'crest');
  const equippedTitleItem = equippedCosmetics.find((e) => e.category === 'title');

  const mantleVaultItem = equippedMantleItem ? vaultItemsMap.get(equippedMantleItem.vault_item_id) : null;
  const crestVaultItem = equippedCrestItem ? vaultItemsMap.get(equippedCrestItem.vault_item_id) : null;
  const titleVaultItem = equippedTitleItem ? vaultItemsMap.get(equippedTitleItem.vault_item_id) : null;

  // Active tokens or defaults
  const mantleToken = mantleVaultItem?.visual_token ?? null;
  const crestToken = crestVaultItem?.visual_token ?? null;

  // Fallback title based on level if no custom cosmetic title equipped
  const fallbackLevelTitle =
    profile.level >= 10
      ? 'Architect of the Reborn'
      : profile.level >= 5
      ? 'Keeper of the Zeroflame'
      : profile.level >= 2
      ? 'Seeker of the Five Realms'
      : 'Initiate of the First Spark';

  const activeTitle = titleVaultItem?.name ?? fallbackLevelTitle;

  // 5 Realm/Attribute mappings
  const attunements: Array<{
    attributeKey: keyof Omit<AttributesRow, 'user_id'>;
    name: string;
    realmKey: Realm;
    score: number;
    level: number;
    description: string;
  }> = [
    {
      attributeKey: 'intellect',
      name: 'Intellect',
      realmKey: 'academy',
      score: attributes?.intellect ?? 0,
      level: realmProgress?.academy_level ?? 0,
      description: 'Governs study, analysis, and remembrance of ancient sciences.',
    },
    {
      attributeKey: 'strength',
      name: 'Strength',
      realmKey: 'wilds',
      score: attributes?.strength ?? 0,
      level: realmProgress?.wilds_level ?? 0,
      description: 'Governs endurance, physical trial, and survival against the wilderness.',
    },
    {
      attributeKey: 'discipline',
      name: 'Discipline',
      realmKey: 'forge',
      score: attributes?.discipline ?? 0,
      level: realmProgress?.forge_level ?? 0,
      description: 'Governs consistency, craft, and unbroken daily resolve.',
    },
    {
      attributeKey: 'wellness',
      name: 'Wellness',
      realmKey: 'sanctuary',
      score: attributes?.wellness ?? 0,
      level: realmProgress?.sanctuary_level ?? 0,
      description: 'Governs restoration, nourishment, stillness, and inner clarity.',
    },
    {
      attributeKey: 'creativity',
      name: 'Creativity',
      realmKey: 'atelier',
      score: attributes?.creativity ?? 0,
      level: realmProgress?.atelier_level ?? 0,
      description: 'Governs imagination, creation, prose, and transformative expression.',
    },
  ];

  const tierNames = ['Dormant (Tier 0)', 'Awakening (Tier I)', 'Active (Tier II)', 'Restored (Tier III)'];

  return (
    <article
      className="relative mx-auto max-w-4xl border border-ash/25 bg-obsidian/85 p-6 sm:p-10 shadow-2xl backdrop-blur-sm"
      aria-label="Wayfarer Character Codex"
    >
      {/* Corner Carvings / Flourishes */}
      <div className="pointer-events-none absolute top-2 left-2 text-[10px] text-ash/40 select-none" aria-hidden="true">
        ╔
      </div>
      <div className="pointer-events-none absolute top-2 right-2 text-[10px] text-ash/40 select-none" aria-hidden="true">
        ╗
      </div>
      <div className="pointer-events-none absolute bottom-2 left-2 text-[10px] text-ash/40 select-none" aria-hidden="true">
        ╚
      </div>
      <div className="pointer-events-none absolute bottom-2 right-2 text-[10px] text-ash/40 select-none" aria-hidden="true">
        ╝
      </div>

      {/* Codex Header Badge */}
      <div className="text-center">
        <p className="font-display text-[10px] tracking-[0.3em] text-ember uppercase">
          Annal of the Awakening
        </p>
        <h1 className="mt-1 font-display text-2xl tracking-[0.2em] text-parchment uppercase sm:text-3xl">
          The Wayfarer Record
        </h1>
        <div className="mx-auto mt-2 flex items-center justify-center gap-3 text-ash/40">
          <span className="h-px w-12 bg-ash/20" />
          <span className="text-[10px] text-ember">◆</span>
          <span className="h-px w-12 bg-ash/20" />
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Main Identity & Hero Avatar Header Panel                            */}
      {/* ------------------------------------------------------------------ */}
      <section className="mt-8 grid gap-8 border border-ash/20 bg-stone/40 p-6 sm:p-8 lg:grid-cols-12 lg:items-center">
        {/* Left: Modular 2D Wayfarer Hero Avatar with Layered SVG Mantle & Crest */}
        <div className="flex flex-col items-center justify-center border-b border-ash/15 pb-8 lg:col-span-6 lg:border-r lg:border-b-0 lg:pb-0 lg:pr-8">
          <div className="relative flex items-center justify-center p-2">
            <WayfarerAvatar
              streak={profile.streak}
              mantleToken={mantleToken}
              crestToken={crestToken}
              size="xl"
            />
          </div>
          <p className="mt-4 font-display text-base tracking-[0.2em] text-parchment uppercase font-bold text-center">
            {profile.display_name}
          </p>
          <span className="mt-1 text-xs tracking-widest text-ember font-semibold uppercase font-display text-center">
            {activeTitle}
          </span>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 border border-ash/15 bg-stone/70 px-3 py-1 text-[11px] tracking-wider text-ash uppercase">
            <span>Mantle: <strong className="text-parchment font-normal">{mantleVaultItem?.name ?? 'Wanderer'}</strong></span>
            <span className="text-ash/40">◆</span>
            <span>Crest: <strong className="text-parchment font-normal">{crestVaultItem?.name ?? 'Spark'}</strong></span>
          </div>
        </div>

        {/* Right: Primary Folio Vitals & Vault CTA */}
        <div className="flex flex-col justify-center lg:col-span-6">
          {/* Level & Gold Vault */}
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-ash/15 pb-4">
            <div>
              <span className="text-xs tracking-[0.15em] text-ash uppercase">
                Current Standing
              </span>
              <p className="font-display text-2xl tracking-wider text-parchment">
                Level {profile.level}{' '}
                <span className="text-xs font-normal text-ash tracking-normal">
                  ({levelInfo.currentLevelXp} / {levelInfo.xpForNextLevel} XP to Level {profile.level + 1})
                </span>
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs tracking-[0.15em] text-gold uppercase">
                Tribute Vault
              </span>
              <p className="font-display text-2xl tracking-wider text-gold font-semibold">
                {profile.gold} <span className="text-xs text-gold/80">G</span>
              </p>
            </div>
          </div>

          {/* XP Progress Bar */}
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs text-ash">
              <span className="uppercase tracking-wider">Level Ascension Progress</span>
              <span className="font-display text-parchment">{progressPercent}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden border border-ash/20 bg-void">
              <div
                className="h-full bg-gradient-to-r from-ember to-gold transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Streak & Continuity Metrics */}
          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-ash/15 pt-4 text-xs">
            <div>
              <span className="text-xs tracking-widest text-ash uppercase">
                Flame Continuity
              </span>
              <p className="font-display text-sm text-ember">
                {profile.streak} {profile.streak === 1 ? 'Day' : 'Days'} Unbroken
              </p>
            </div>
            <div>
              <span className="text-xs tracking-widest text-ash uppercase">
                Last Inscription
              </span>
              <p className="font-display text-sm text-parchment">
                {profile.last_active_date
                  ? formatDeterministicDate(profile.last_active_date, true)
                  : 'Awaiting first vow'}
              </p>
            </div>
            <div>
              <span className="text-xs tracking-widest text-ash uppercase">
                Temporal Anchor
              </span>
              <p className="font-display text-sm text-parchment truncate max-w-[140px]">
                {profile.timezone || 'UTC'}
              </p>
            </div>
          </div>

          {/* Thematic Primary Vault CTA */}
          <div className="mt-6 border-t border-ash/15 pt-4">
            <Link
              href="/game/vault"
              className="flex w-full items-center justify-between border border-gold/40 bg-gradient-to-r from-gold/15 to-ember/15 px-4 py-3 text-gold transition-all hover:border-gold hover:bg-gold/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              <div className="flex items-center gap-2">
                <span className="text-base text-gold">🏛</span>
                <span className="font-display text-xs tracking-[0.2em] font-semibold uppercase sm:text-sm">
                  ENTER THE VAULT
                </span>
              </div>
              <div className="flex items-center gap-1 font-display text-xs tracking-wider text-parchment">
                <span>Armoury &amp; Relics</span>
                <span className="text-gold">→</span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Ancient Ornamental Divider                                         */}
      {/* ------------------------------------------------------------------ */}
      <div className="my-8 flex items-center justify-center gap-4 text-ash/30" aria-hidden="true">
        <div className="h-px flex-1 bg-ash/20" />
        <span className="font-display text-xs tracking-widest text-ash/80 uppercase">
          ✦ Attunements &amp; Ancestral Resonances ✦
        </span>
        <div className="h-px flex-1 bg-ash/20" />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* The Five Attunements & Realm Codices                               */}
      {/* ------------------------------------------------------------------ */}
      <section className="space-y-4" aria-label="Attunements and Realm Resonances">
        {attunements.map(({ name, realmKey, score, level, description }) => {
          const realm = REALMS[realmKey];
          return (
            <div
              key={realmKey}
              className="border border-ash/15 bg-stone/50 p-4 transition-colors hover:border-ash/30 sm:p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ash/10 pb-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="font-display text-sm tracking-wider text-parchment uppercase sm:text-base">
                    {name}
                  </span>
                  <span className="text-ash/40">/</span>
                  <span className="font-display text-xs tracking-wider text-ash uppercase">
                    {realm.name}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`border px-2 py-0.5 font-display text-[10px] tracking-wider uppercase ${
                      level === 3
                        ? 'border-gold/60 bg-gold/15 text-gold'
                        : level >= 1
                        ? 'border-ember/40 bg-stone text-ember'
                        : 'border-ash/30 bg-void/60 text-ash'
                    }`}
                  >
                    {tierNames[level]}
                  </span>
                  <span className="font-display text-sm tracking-wider text-parchment">
                    {score} <span className="text-[10px] text-ash/80 uppercase">pts</span>
                  </span>
                </div>
              </div>

              <div className="mt-2.5 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                <p className="text-xs sm:text-sm leading-relaxed text-ash">
                  {description}
                </p>
                <span className="shrink-0 text-xs tracking-wide text-ash/80">
                  Realm: {realm.description.slice(0, 45)}…
                </span>
              </div>
            </div>
          );
        })}
      </section>

      {/* Ancient Tagline Footer */}
      <footer className="mt-10 border-t border-ash/20 pt-6 text-center">
        <p className="font-display text-xs tracking-[0.25em] text-ember uppercase">
          &ldquo;Your world starts when you do.&rdquo;
        </p>
        <p className="mt-1 text-xs text-ash/80">
          Dayzero marked the freezing of time. Real-world devotion restores resonance to the Five Realms.
        </p>
      </footer>
    </article>
  );
}
