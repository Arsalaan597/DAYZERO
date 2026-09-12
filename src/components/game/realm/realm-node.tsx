'use client';

// ---------------------------------------------------------------------------
// DAYZERO – Realm Node Component
// ---------------------------------------------------------------------------
// Visual node representing one of the five ancestral realms.
// Visually transforms across 4 levels (0: Dormant, 1: Awakening, 2: Active, 3: Restored).
// Relies on shape, border styling, iconography, linework, and semantic badges,
// adhering strictly to the DAYZERO palette (obsidian, ash, parchment, ember, brass).
// ---------------------------------------------------------------------------

import { motion } from 'motion/react';
import type { Realm, RealmInfo } from '@/types/game';

interface RealmNodeProps {
  realm: RealmInfo;
  level: number; // 0..3
  score: number;
  isPulsing?: boolean;
  className?: string;
}

export function RealmNode({
  realm,
  level,
  score,
  isPulsing = false,
  className = '',
}: RealmNodeProps) {
  // Normalize level
  const tier = Math.max(0, Math.min(3, Math.floor(level))) as 0 | 1 | 2 | 3;

  const tierMeta = {
    0: {
      statusLabel: 'Dormant',
      romanTier: 'Tier 0',
      borderClass: 'border-dashed border-ash/40 bg-stone/40 hover:border-ash/60',
      badgeClass: 'border-ash/35 bg-void/80 text-ash',
      iconOpacity: 0.7,
      fogOverlay: false,
      pulseAnim: false,
    },
    1: {
      statusLabel: 'Awakening',
      romanTier: 'Tier I',
      borderClass: 'border-solid border-ash/60 bg-stone/70 shadow-sm',
      badgeClass: 'border-ember/40 bg-stone text-ember',
      iconOpacity: 0.8,
      fogOverlay: false,
      pulseAnim: true,
    },
    2: {
      statusLabel: 'Active',
      romanTier: 'Tier II',
      borderClass: 'border-solid border-ember/50 bg-stone/90 shadow-md',
      badgeClass: 'border-ember/60 bg-stone text-parchment',
      iconOpacity: 0.9,
      fogOverlay: false,
      pulseAnim: true,
    },
    3: {
      statusLabel: 'Restored',
      romanTier: 'Tier III',
      borderClass: 'border-double border-gold/70 bg-stone shadow-lg shadow-gold/5 ring-1 ring-gold/30',
      badgeClass: 'border-gold/70 bg-gold/15 text-gold',
      iconOpacity: 1.0,
      fogOverlay: false,
      pulseAnim: true,
    },
  }[tier];

  return (
    <motion.div
      animate={{
        scale: isPulsing ? [1, 1.08, 1] : 1,
        borderColor: isPulsing ? '#D97732' : undefined,
      }}
      transition={{ duration: 0.7, ease: 'easeOut' }}
      className={`group relative flex flex-col items-center p-3.5 sm:p-4 transition-all duration-300 ${tierMeta.borderClass} ${className}`}
      tabIndex={0}
      role="region"
      aria-label={`${realm.name}: Level ${tier} (${tierMeta.statusLabel}). ${realm.attribute} score: ${score} points.`}
    >
      {/* Tier 0 Faint broken stone texture background (non-blurring) */}
      {tier === 0 && (
        <div
          className="pointer-events-none absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, #8B8D87 0, #8B8D87 1px, transparent 0, transparent 8px)',
          }}
          aria-hidden="true"
        />
      )}

      {/* Level 3 Restored Corner Diamond Accents */}
      {tier === 3 && (
        <>
          <span className="absolute -top-1 -left-1 text-[8px] text-gold select-none" aria-hidden="true">
            ◆
          </span>
          <span className="absolute -top-1 -right-1 text-[8px] text-gold select-none" aria-hidden="true">
            ◆
          </span>
          <span className="absolute -bottom-1 -left-1 text-[8px] text-gold select-none" aria-hidden="true">
            ◆
          </span>
          <span className="absolute -bottom-1 -right-1 text-[8px] text-gold select-none" aria-hidden="true">
            ◆
          </span>
        </>
      )}

      {/* Level 2 Active Corner Notches */}
      {tier === 2 && (
        <>
          <span className="absolute top-1 left-1 h-1.5 w-1.5 border-t border-l border-ember/60" aria-hidden="true" />
          <span className="absolute top-1 right-1 h-1.5 w-1.5 border-t border-r border-ember/60" aria-hidden="true" />
          <span className="absolute bottom-1 left-1 h-1.5 w-1.5 border-b border-l border-ember/60" aria-hidden="true" />
          <span className="absolute bottom-1 right-1 h-1.5 w-1.5 border-b border-r border-ember/60" aria-hidden="true" />
        </>
      )}

      {/* Realm Emblem / Iconography */}
      <div className="relative mb-2 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center">
        <RealmIcon realmId={realm.id} tier={tier} opacity={tierMeta.iconOpacity} isPulsing={isPulsing} />
      </div>

      {/* Realm Name */}
      <h3 className="text-center font-display text-xs sm:text-sm tracking-wider text-parchment uppercase line-clamp-1">
        {realm.name}
      </h3>

      {/* Tier & State Badge */}
      <div className="mt-1.5 flex items-center gap-1.5">
        <span
          className={`border px-2 py-0.5 font-display text-[10px] tracking-wider uppercase ${tierMeta.badgeClass}`}
        >
          {tierMeta.romanTier} · {tierMeta.statusLabel}
        </span>
      </div>

      {/* Attribute & Score Indicator */}
      <div className="mt-2 flex items-center gap-1.5 text-xs tracking-wider text-ash uppercase">
        <span>{realm.attribute}</span>
        <span className="text-ash/50">·</span>
        <span className="font-display text-parchment font-medium">{score} pts</span>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Realm SVG Iconography – Distinct Ancient Architectural Motifs
// ---------------------------------------------------------------------------

function RealmIcon({
  realmId,
  tier,
  opacity,
  isPulsing,
}: {
  realmId: Realm;
  tier: number;
  opacity: number;
  isPulsing?: boolean;
}) {
  const strokeColor = isPulsing ? '#D97732' : tier === 3 ? '#C6A15B' : tier >= 1 ? '#D97732' : '#8B8D87';

  return (
    <svg
      viewBox="0 0 48 48"
      className="h-full w-full transition-transform duration-300"
      style={{ opacity }}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Realm-specific iconography */}
      {realmId === 'academy' && (
        /* The Academy: Concentric Astrolabe / Celestial Tome */
        <g stroke={strokeColor} strokeWidth={tier >= 2 ? '1.5' : '1'}>
          <circle cx="24" cy="24" r="18" strokeDasharray={tier === 0 ? '3 3' : undefined} />
          <circle cx="24" cy="24" r="11" />
          <circle cx="24" cy="24" r="4" fill={tier >= 1 ? strokeColor : 'none'} />
          <line x1="24" y1="6" x2="24" y2="42" strokeDasharray="1 3" />
          <line x1="6" y1="24" x2="42" y2="24" strokeDasharray="1 3" />
          {tier >= 2 && (
            <>
              <line x1="12" y1="12" x2="36" y2="36" strokeWidth="0.75" />
              <line x1="36" y1="12" x2="12" y2="36" strokeWidth="0.75" />
            </>
          )}
        </g>
      )}

      {realmId === 'wilds' && (
        /* The Wilds: Ancient Standing Stone with Nature Vines */
        <g stroke={strokeColor} strokeWidth={tier >= 2 ? '1.5' : '1'}>
          {/* Central Monolith */}
          <polygon
            points="24,8 33,38 15,38"
            strokeDasharray={tier === 0 ? '3 3' : undefined}
          />
          {/* Ground stone base */}
          <line x1="10" y1="40" x2="38" y2="40" strokeWidth="1.5" />
          {/* Bramble / antler tendrils */}
          {tier >= 1 && (
            <path
              d="M 19 32 Q 14 26 11 28 Q 15 22 20 24"
              strokeWidth="1"
            />
          )}
          {tier >= 2 && (
            <path
              d="M 29 32 Q 34 26 37 28 Q 33 22 28 24"
              strokeWidth="1"
            />
          )}
          {tier >= 1 && <circle cx="24" cy="20" r="2" fill={strokeColor} />}
        </g>
      )}

      {realmId === 'forge' && (
        /* The Forge: Ancient Anvil & Geometric Hammer */
        <g stroke={strokeColor} strokeWidth={tier >= 2 ? '1.5' : '1'}>
          {/* Anvil Horn and Body */}
          <path
            d="M 12 18 L 36 18 L 33 28 L 27 28 L 30 38 L 18 38 L 21 28 L 15 28 Z"
            strokeDasharray={tier === 0 ? '3 3' : undefined}
          />
          {/* Center heat chamber / core */}
          <circle cx="24" cy="23" r="2.5" fill={tier >= 1 ? strokeColor : 'none'} />
          {tier >= 2 && (
            <>
              {/* Sparks */}
              <line x1="20" y1="14" x2="18" y2="10" strokeWidth="1" />
              <line x1="28" y1="14" x2="30" y2="10" strokeWidth="1" />
              <line x1="24" y1="13" x2="24" y2="8" strokeWidth="1" />
            </>
          )}
        </g>
      )}

      {realmId === 'sanctuary' && (
        /* The Sanctuary: Sacred Concentric Spring Teardrop */
        <g stroke={strokeColor} strokeWidth={tier >= 2 ? '1.5' : '1'}>
          {/* Sacred Droplet */}
          <path
            d="M 24 10 C 24 10, 14 24, 14 30 C 14 36, 18.5 40, 24 40 C 29.5 40, 34 36, 34 30 C 34 24, 24 10, 24 10 Z"
            strokeDasharray={tier === 0 ? '3 3' : undefined}
          />
          {/* Inner ripple pool */}
          {tier >= 1 && (
            <ellipse cx="24" cy="31" rx="5" ry="3" strokeWidth="1" />
          )}
          {tier >= 2 && (
            <ellipse cx="24" cy="31" rx="8" ry="5" strokeDasharray="2 2" strokeWidth="0.75" />
          )}
          {tier >= 1 && <circle cx="24" cy="22" r="1.5" fill={strokeColor} />}
        </g>
      )}

      {realmId === 'atelier' && (
        /* The Atelier: Crystalline Prism / Compass Arc */
        <g stroke={strokeColor} strokeWidth={tier >= 2 ? '1.5' : '1'}>
          {/* Prism Triangle */}
          <polygon
            points="24,9 38,37 10,37"
            strokeDasharray={tier === 0 ? '3 3' : undefined}
          />
          {/* Refraction lines */}
          <line x1="24" y1="9" x2="24" y2="37" strokeWidth="0.75" strokeDasharray="2 2" />
          {tier >= 1 && (
            <>
              <line x1="24" y1="24" x2="42" y2="28" strokeWidth="1" />
              <line x1="24" y1="24" x2="40" y2="22" strokeWidth="1" />
            </>
          )}
          {tier >= 2 && (
            <circle cx="24" cy="24" r="3" fill={strokeColor} />
          )}
        </g>
      )}
    </svg>
  );
}
