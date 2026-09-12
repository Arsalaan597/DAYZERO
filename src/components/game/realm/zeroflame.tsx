'use client';

// ---------------------------------------------------------------------------
// DAYZERO – The Zeroflame Component
// ---------------------------------------------------------------------------
// The central visual heartbeat of DAYZERO.
// Represents player momentum, streak, and the world's rekindling.
// Changes dynamically across 4 tiers based on streak count (0, 1-2, 3-6, 7+).
// Uses React useId() to guarantee deterministic, collision-free SVG defs
// across both desktop and mobile viewports.
// ---------------------------------------------------------------------------

import { useId } from 'react';
import { motion } from 'motion/react';

export interface ZeroflameProps {
  streak: number;
  size?: 'sm' | 'md' | 'lg';
  flare?: boolean;
  showLabel?: boolean;
  className?: string;
}

export function Zeroflame({
  streak,
  size = 'md',
  flare = false,
  showLabel = false,
  className = '',
}: ZeroflameProps) {
  const rawId = useId();
  const flameId = rawId.replace(/[^a-zA-Z0-9_-]/g, '_');

  // Determine flame tier
  const tier = (streak === 0 ? 0 : streak <= 2 ? 1 : streak <= 6 ? 2 : 3) as 0 | 1 | 2 | 3;

  const tierMeta = {
    0: {
      label: 'Dormant Ember',
      status: 'Awaiting ignition',
      flameScale: 0.35,
      haloIntensity: 0.15,
      haloSpread: 16,
      coreColor: '#592e1e',
      glowColor: '#3a180e',
    },
    1: {
      label: 'Kindled Spark',
      status: 'First breath of flame',
      flameScale: 0.65,
      haloIntensity: 0.4,
      haloSpread: 28,
      coreColor: '#D97732',
      glowColor: '#8a3c14',
    },
    2: {
      label: 'Sustained Flame',
      status: 'Resonant continuity',
      flameScale: 0.95,
      haloIntensity: 0.7,
      haloSpread: 44,
      coreColor: '#e08a46',
      glowColor: '#c66c28',
    },
    3: {
      label: 'Blazing Zeroflame',
      status: 'Apex world resonance',
      flameScale: 1.25,
      haloIntensity: 1.0,
      haloSpread: 64,
      coreColor: '#faaf6b',
      glowColor: '#d97732',
    },
  }[tier];

  // Compact size dimensions to minimize excessive empty vertical space on mobile
  const sizeMap = {
    sm: { container: 'w-16 h-18', svgH: 48, svgW: 38 },
    md: { container: 'w-24 h-26', svgH: 76, svgW: 56 },
    lg: { container: 'w-36 h-38', svgH: 110, svgW: 84 },
  }[size];

  return (
    <div
      className={`relative flex flex-col items-center justify-center select-none ${className}`}
      role="img"
      aria-label={`The Zeroflame: ${tierMeta.label}. Current streak: ${streak} ${
        streak === 1 ? 'day' : 'days'
      }.`}
    >
      {/* Outer Radiance Halo */}
      <motion.div
        className="pointer-events-none absolute rounded-full"
        style={{
          width: sizeMap.svgW * 1.6,
          height: sizeMap.svgH * 1.2,
          background: `radial-gradient(circle, ${tierMeta.glowColor} 0%, transparent 70%)`,
          opacity: tierMeta.haloIntensity,
          filter: `blur(${tierMeta.haloSpread}px)`,
        }}
        animate={{
          scale: flare ? [1, 1.35, 1] : tier === 0 ? [0.95, 1.05, 0.95] : [0.94, 1.06, 0.94],
          opacity: flare
            ? [tierMeta.haloIntensity, 1, tierMeta.haloIntensity]
            : [tierMeta.haloIntensity * 0.85, tierMeta.haloIntensity * 1.15, tierMeta.haloIntensity * 0.85],
        }}
        transition={{
          duration: flare ? 0.8 : tier === 0 ? 4 : 2.5,
          repeat: flare ? 0 : Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Flame Container */}
      <div className={`relative flex items-center justify-center ${sizeMap.container}`}>
        {/* SVG Flame Silhouette */}
        <motion.svg
          viewBox="0 0 60 90"
          className="overflow-visible"
          style={{ width: sizeMap.svgW, height: sizeMap.svgH }}
          animate={{
            scaleY: flare ? [1, 1.25, 1] : tier === 0 ? [0.98, 1.02, 0.98] : [0.96, 1.05, 0.96],
            scaleX: flare ? [1, 1.12, 1] : tier === 0 ? 1 : [1.02, 0.98, 1.02],
          }}
          transition={{
            duration: flare ? 0.6 : tier === 0 ? 4 : 2.2,
            repeat: flare ? 0 : Infinity,
            ease: 'easeInOut',
          }}
        >
          <defs>
            {/* Outer flame gradient - Unique per component instance */}
            <linearGradient id={`flame-outer-${flameId}`} x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#1B1E1C" />
              <stop offset="35%" stopColor={tier === 0 ? '#442114' : '#8C3D19'} />
              <stop offset="70%" stopColor={tier === 0 ? '#78351b' : '#D97732'} />
              <stop offset="100%" stopColor={tier === 0 ? '#38170c' : '#C6A15B'} />
            </linearGradient>

            {/* Core flame gradient - Unique per component instance */}
            <linearGradient id={`flame-core-${flameId}`} x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor={tier === 0 ? '#592e1e' : '#D97732'} />
              <stop offset="60%" stopColor={tier === 0 ? '#7a3922' : '#E7DFC9'} />
              <stop offset="100%" stopColor={tier === 0 ? '#38170c' : '#FFFFFF'} />
            </linearGradient>

            {/* Ember blur filter - Unique per component instance */}
            <filter id={`flame-blur-${flameId}`} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation={tier === 0 ? 1.5 : 2} result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Brazier / Altar Base (Geometric ancient pedestal) */}
          <path
            d="M 16 82 L 44 82 L 40 88 L 20 88 Z"
            fill="#161817"
            stroke="#8B8D87"
            strokeWidth="0.75"
            strokeOpacity="0.5"
          />
          <line
            x1="12"
            y1="82"
            x2="48"
            y2="82"
            stroke="#C6A15B"
            strokeWidth="1.2"
            strokeOpacity={tier > 0 ? 0.7 : 0.3}
          />

          {/* Flame Shapes (Varying by tier) */}
          {tier === 0 ? (
            /* Tier 0: Dormant Ember (Faint glowing charcoal cluster) */
            <g>
              <ellipse cx="30" cy="78" rx="8" ry="4.5" fill="#2d160e" />
              <ellipse
                cx="30"
                cy="77"
                rx="5"
                ry="3"
                fill={`url(#flame-core-${flameId}) #592e1e`}
                filter={`url(#flame-blur-${flameId})`}
              />
              <circle cx="28" cy="76" r="1.5" fill="#D97732" opacity="0.9" />
              <circle cx="32" cy="77" r="1.2" fill="#E7DFC9" opacity="0.8" />
              {/* Stray tiny cold ember mote */}
              <circle cx="30" cy="72" r="0.75" fill="#8C3D19" opacity="0.6" />
            </g>
          ) : (
            /* Tiers 1-3: Living Flame */
            <g>
              {/* Outer Flame Envelope */}
              <path
                d="M 30 18 
                   C 36 34, 48 48, 46 64 
                   C 44 76, 38 80, 30 80 
                   C 22 80, 16 76, 14 64 
                   C 12 48, 24 34, 30 18 Z"
                fill={`url(#flame-outer-${flameId}) #D97732`}
                filter={`url(#flame-blur-${flameId})`}
                opacity={0.95}
              />

              {/* Secondary dancing tongue (Tier 2 & 3) */}
              {tier >= 2 && (
                <path
                  d="M 30 26 
                     C 35 38, 42 50, 40 68 
                     C 36 78, 30 79, 30 79 
                     C 30 79, 24 78, 20 68 
                     C 18 50, 25 38, 30 26 Z"
                  fill="#C6A15B"
                  opacity={0.4}
                />
              )}

              {/* Inner Bright Heart Core */}
              <path
                d="M 30 42 
                   C 34 52, 38 60, 37 72 
                   C 35 78, 32 79, 30 79 
                   C 28 79, 25 78, 23 72 
                   C 22 60, 26 52, 30 42 Z"
                fill={`url(#flame-core-${flameId}) #E7DFC9`}
                opacity={0.95}
              />

              {/* Flame Tip Sparkle (Tier 3 Apex) */}
              {tier === 3 && (
                <>
                  <circle cx="30" cy="14" r="1.5" fill="#FFFFFF" opacity="0.9" />
                  <circle cx="34" cy="22" r="1" fill="#C6A15B" opacity="0.8" />
                  <circle cx="26" cy="28" r="1.2" fill="#D97732" opacity="0.8" />
                </>
              )}
            </g>
          )}
        </motion.svg>
      </div>

      {/* Contextual Streak Badge / Label */}
      {showLabel && (
        <div className="mt-1.5 text-center">
          <div className="flex items-center justify-center gap-1.5 font-display text-[11px] tracking-[0.2em] text-parchment uppercase">
            <span className={tier === 0 ? 'text-ash' : 'text-ember'}>◆</span>
            <span>{tierMeta.label}</span>
            <span className={tier === 0 ? 'text-ash' : 'text-ember'}>◆</span>
          </div>
          <p className="mt-0.5 text-[10px] tracking-wider text-ash/85">
            {streak === 0 ? (
              'Vow unfulfilled · Complete a quest'
            ) : (
              <span>
                <strong className="text-ember font-normal">{streak}</strong>-day unbroken streak
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
