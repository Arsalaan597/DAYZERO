'use client';

// ---------------------------------------------------------------------------
// DAYZERO – Vault Item Card Component
// ---------------------------------------------------------------------------
// Atmospheric relic plaque displaying preview, requirements, price,
// and interactive state: LOCKED, INSUFFICIENT GOLD, AVAILABLE, OWNED, EQUIPPED.
// ---------------------------------------------------------------------------

import { WayfarerAvatar } from '@/components/game/avatar/wayfarer-avatar';
import type { VaultItemRow, ProfileRow, AttributesRow } from '@/types/database';

interface VaultItemCardProps {
  item: VaultItemRow;
  profile: ProfileRow;
  attributes: AttributesRow | null;
  isOwned: boolean;
  isEquipped: boolean;
  onPurchase: (item: VaultItemRow) => void;
  onEquip: (item: VaultItemRow) => void;
  isPurchasing: boolean;
  isEquipping: boolean;
  hasJustAcquired: boolean;
}

export function VaultItemCard({
  item,
  profile,
  attributes,
  isOwned,
  isEquipped,
  onPurchase,
  onEquip,
  isPurchasing,
  isEquipping,
  hasJustAcquired,
}: VaultItemCardProps) {
  // Validate Level Requirement
  const levelLocked = item.min_level !== null && profile.level < item.min_level;

  // Validate Attribute Requirement
  let attrLocked = false;
  let currentAttrVal = 0;
  if (item.req_attribute && item.req_attribute_value !== null) {
    if (item.req_attribute === 'intellect') currentAttrVal = attributes?.intellect ?? 0;
    else if (item.req_attribute === 'strength') currentAttrVal = attributes?.strength ?? 0;
    else if (item.req_attribute === 'discipline') currentAttrVal = attributes?.discipline ?? 0;
    else if (item.req_attribute === 'wellness') currentAttrVal = attributes?.wellness ?? 0;
    else if (item.req_attribute === 'creativity') currentAttrVal = attributes?.creativity ?? 0;

    attrLocked = currentAttrVal < item.req_attribute_value;
  }

  const isLocked = levelLocked || attrLocked;
  const insufficientGold = !isOwned && profile.gold < item.price_gold;

  // Determine State Badge
  let statusBadge = {
    text: 'AVAILABLE',
    className: 'border-gold/40 bg-gold/10 text-gold',
  };

  if (isEquipped) {
    statusBadge = {
      text: 'EQUIPPED ◆',
      className: 'border-ember bg-ember/20 text-ember font-semibold',
    };
  } else if (isOwned) {
    statusBadge = {
      text: 'IN POSSESSION',
      className: 'border-ash/40 bg-stone text-parchment',
    };
  } else if (isLocked) {
    statusBadge = {
      text: 'SEALED / LOCKED',
      className: 'border-danger/40 bg-danger/10 text-danger',
    };
  } else if (insufficientGold) {
    statusBadge = {
      text: 'INSUFFICIENT GOLD',
      className: 'border-ash/30 bg-void text-ash',
    };
  }

  return (
    <article
      className={`relative flex flex-col justify-between border p-5 transition-all duration-300 ${
        isEquipped
          ? 'border-ember/70 bg-obsidian/95 shadow-[0_0_20px_rgba(217,119,50,0.15)]'
          : hasJustAcquired
          ? 'border-gold bg-stone/90 animate-pulse'
          : isOwned
          ? 'border-ash/30 bg-obsidian/80 hover:border-ash/50'
          : isLocked
          ? 'border-ash/15 bg-void/70 opacity-80'
          : 'border-ash/20 bg-stone/40 hover:border-gold/50'
      }`}
      aria-label={`${item.name} (${item.category})`}
    >
      {/* Corner Carving accents */}
      <div className="pointer-events-none absolute top-1.5 left-1.5 text-[9px] text-ash/30 select-none">┌</div>
      <div className="pointer-events-none absolute top-1.5 right-1.5 text-[9px] text-ash/30 select-none">┐</div>
      <div className="pointer-events-none absolute bottom-1.5 left-1.5 text-[9px] text-ash/30 select-none">└</div>
      <div className="pointer-events-none absolute bottom-1.5 right-1.5 text-[9px] text-ash/30 select-none">┘</div>

      <div>
        {/* Header with Category & Status Badge */}
        <div className="flex items-center justify-between gap-2 border-b border-ash/15 pb-2.5">
          <span className="font-display text-[10px] tracking-[0.2em] text-ash/80 uppercase">
            {item.category}
          </span>
          <span
            className={`border px-2 py-0.5 font-display text-[10px] tracking-wider uppercase ${statusBadge.className}`}
          >
            {statusBadge.text}
          </span>
        </div>

        {/* Visual Relic Preview Panel */}
        <div className="my-4 flex h-40 items-center justify-center border border-ash/15 bg-gradient-to-b from-void/80 to-stone/50 py-3 px-2">
          {item.category === 'mantle' ? (
            <WayfarerAvatar
              streak={profile.streak}
              mantleToken={item.visual_token}
              crestToken={null}
              size="md"
            />
          ) : item.category === 'crest' ? (
            <WayfarerAvatar
              streak={profile.streak}
              mantleToken={null}
              crestToken={item.visual_token}
              size="md"
            />
          ) : (
            /* Title Preview: Ancient engraved stone plaque */
            <div className="flex h-full w-full flex-col items-center justify-center border border-ash/15 bg-obsidian/70 p-4 text-center">
              <span className="text-[10px] tracking-[0.25em] text-ash/60 uppercase">Honorific Inscription</span>
              <p className="mt-2 font-display text-base tracking-widest text-ember uppercase font-bold">
                &ldquo;{item.name}&rdquo;
              </p>
              <div className="mt-1 flex items-center justify-center gap-2 text-ash/40">
                <span className="h-px w-6 bg-ash/20" />
                <span className="text-[9px] text-ember">◆</span>
                <span className="h-px w-6 bg-ash/20" />
              </div>
              <span className="mt-1 text-[10px] text-ash/80 tracking-wider">Attuned Codex Title</span>
            </div>
          )}
        </div>

        {/* Name & Description */}
        <h3 className="font-display text-base tracking-wider text-parchment uppercase font-semibold">
          {item.name}
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-ash line-clamp-2">
          {item.description}
        </p>

        {/* Requirements & Cost Section */}
        <div className="mt-4 space-y-1.5 border-t border-ash/10 pt-3 text-xs">
          {/* Price (if unowned) */}
          {!isOwned && (
            <div className="flex items-center justify-between">
              <span className="text-ash uppercase tracking-wider text-[11px]">Tribute Cost:</span>
              <span className="font-display text-sm tracking-wider text-gold font-semibold">
                {item.price_gold} <span className="text-xs text-gold/80">G</span>
              </span>
            </div>
          )}

          {/* Level requirement */}
          {item.min_level && item.min_level > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-ash uppercase tracking-wider text-[11px]">Standing:</span>
              <span className={levelLocked ? 'font-display text-danger' : 'text-parchment'}>
                Requires Level {item.min_level} {levelLocked && `(Current: ${profile.level})`}
              </span>
            </div>
          )}

          {/* Attribute requirement */}
          {item.req_attribute && item.req_attribute_value !== null && (
            <div className="flex items-center justify-between">
              <span className="text-ash uppercase tracking-wider text-[11px]">Resonance:</span>
              <span className={attrLocked ? 'font-display text-danger' : 'text-parchment'}>
                {item.req_attribute_value} {item.req_attribute.toUpperCase()}{' '}
                {attrLocked && `(Have: ${currentAttrVal})`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-5 border-t border-ash/15 pt-3">
        {isEquipped ? (
          <button
            type="button"
            disabled
            className="flex w-full cursor-default items-center justify-center gap-1.5 border border-ember/60 bg-ember/15 py-2 font-display text-xs tracking-widest text-ember uppercase select-none"
          >
            <span>◆</span>
            <span>CURRENTLY EQUIPPED</span>
          </button>
        ) : isOwned ? (
          <button
            type="button"
            onClick={() => onEquip(item)}
            disabled={isEquipping}
            className="flex w-full items-center justify-center gap-1.5 border border-ash/40 bg-stone py-2 font-display text-xs tracking-widest text-parchment uppercase transition-colors hover:border-ember hover:text-ember focus:outline-none focus-visible:ring-1 focus-visible:ring-ember disabled:opacity-50"
          >
            <span>{isEquipping ? 'Attuning…' : 'EQUIP COSMETIC'}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onPurchase(item)}
            disabled={isLocked || insufficientGold || isPurchasing}
            className={`flex w-full items-center justify-center gap-1.5 border py-2 font-display text-xs tracking-widest uppercase transition-all focus:outline-none focus-visible:ring-1 ${
              isLocked
                ? 'cursor-not-allowed border-ash/20 bg-void/60 text-ash/40'
                : insufficientGold
                ? 'cursor-not-allowed border-ash/20 bg-stone/40 text-ash'
                : 'border-gold/60 bg-gold/15 text-gold hover:border-gold hover:bg-gold/30 hover:text-parchment focus-visible:ring-gold'
            } disabled:opacity-50`}
          >
            <span>
              {isPurchasing
                ? 'Claiming…'
                : isLocked
                ? 'LOCKED'
                : insufficientGold
                ? 'NEED MORE GOLD'
                : `CLAIM FOR ${item.price_gold} G`}
            </span>
          </button>
        )}
      </div>
    </article>
  );
}
