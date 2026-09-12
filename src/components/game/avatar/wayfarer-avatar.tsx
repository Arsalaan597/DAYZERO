'use client';

// ---------------------------------------------------------------------------
// DAYZERO – WayfarerAvatar Component
// ---------------------------------------------------------------------------
// Atmospheric, modular 2D SVG avatar that combines:
// 1. Base Silhouette / Armored Core Frame
// 2. Behavioral Zeroflame Streak Heartbeat (0 = faint, 1-2 = small, 3-6 = sustained, 7+ = blazing)
// 3. Mantle Layer (Layered SVG cloak / cowl / pauldrons / shroud)
// 4. Crest Layer (Central vector insignia)
// 5. Distinct Border Rings & Outer Framing
// ---------------------------------------------------------------------------

import { useId } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { MantleLayer } from './mantle-layer';
import { CrestLayer } from './crest-layer';

export interface WayfarerAvatarProps {
  streak: number;
  mantleToken?: string | null;
  crestToken?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
}

export function WayfarerAvatar({
  streak,
  mantleToken = null,
  crestToken = null,
  size = 'md',
  className = '',
}: WayfarerAvatarProps) {
  const rawId = useId();
  const avatarId = rawId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const shouldReduceMotion = useReducedMotion();

  // Streak-driven flame intensity tier (0: Dormant, 1: Kindled, 2: Sustained, 3: Blazing)
  const flameTier = streak === 0 ? 0 : streak <= 2 ? 1 : streak <= 6 ? 2 : 3;

  const flameConfig = {
    0: {
      glowColor: '#3a180e',
      glowRadius: 18,
      opacity: 0.25,
      flameHeight: 26,
      coreStop: '#592e1e',
    },
    1: {
      glowColor: '#8a3c14',
      glowRadius: 28,
      opacity: 0.5,
      flameHeight: 38,
      coreStop: '#D97732',
    },
    2: {
      glowColor: '#c66c28',
      glowRadius: 40,
      opacity: 0.75,
      flameHeight: 48,
      coreStop: '#e08a46',
    },
    3: {
      glowColor: '#d97732',
      glowRadius: 55,
      opacity: 1.0,
      flameHeight: 58,
      coreStop: '#faaf6b',
    },
  }[flameTier];

  const dimensions = {
    sm: 'w-24 h-24',
    md: 'w-36 h-36',
    lg: 'w-48 h-48',
    xl: 'w-56 h-56 sm:w-60 sm:h-60',
    '2xl': 'w-64 h-64 sm:w-72 sm:h-72',
  }[size];

  return (
    <div
      className={`relative flex items-center justify-center select-none ${dimensions} ${className}`}
      role="img"
      aria-label={`Wayfarer Avatar. Streak tier: ${flameTier}. Equipped mantle: ${
        mantleToken ?? 'default'
      }. Equipped crest: ${crestToken ?? 'default'}.`}
    >
      {/* Background Ambient Flame Aura */}
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(circle at 50% 55%, ${flameConfig.glowColor} 0%, transparent 70%)`,
          opacity: flameConfig.opacity,
          filter: `blur(${flameConfig.glowRadius}px)`,
        }}
        animate={
          shouldReduceMotion
            ? undefined
            : {
                scale: flameTier === 0 ? [0.96, 1.02, 0.96] : [0.94, 1.06, 0.94],
                opacity: [flameConfig.opacity * 0.85, flameConfig.opacity * 1.15, flameConfig.opacity * 0.85],
              }
        }
        transition={{
          duration: flameTier === 0 ? 4 : 2.4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Main Layered SVG Canvas (120x120 coordinate space) */}
      <svg
        viewBox="0 0 120 120"
        className="relative h-full w-full overflow-visible drop-shadow-xl"
      >
        <defs>
          {/* Avatar Base Radial Gradient */}
          <radialGradient id={`avatar-bg-${avatarId}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#1B1E1C" />
            <stop offset="70%" stopColor="#121413" />
            <stop offset="100%" stopColor="#0B0C0C" />
          </radialGradient>

          {/* Flame Gradient */}
          <linearGradient id={`avatar-flame-${avatarId}`} x1="50%" y1="100%" x2="50%" y2="0%">
            <stop offset="0%" stopColor="#25120a" />
            <stop offset="40%" stopColor={flameConfig.coreStop} />
            <stop offset="85%" stopColor="#E7DFC9" />
            <stop offset="100%" stopColor="#FFFFFF" />
          </linearGradient>

          {/* Vignette Clip */}
          <clipPath id={`avatar-clip-${avatarId}`}>
            <circle cx="60" cy="60" r="54" />
          </clipPath>
        </defs>

        {/* Outer Heavy Ancient Frame Ring */}
        <circle
          cx="60"
          cy="60"
          r="58"
          fill="none"
          stroke="#8B8D87"
          strokeWidth="1.2"
          strokeOpacity="0.4"
        />
        <circle
          cx="60"
          cy="60"
          r="55"
          fill={`url(#avatar-bg-${avatarId})`}
          stroke="#C6A15B"
          strokeWidth="1"
          strokeOpacity={flameTier > 0 ? 0.6 : 0.3}
        />

        {/* Clipped Internal Character Layers */}
        <g clipPath={`url(#avatar-clip-${avatarId})`}>
          {/* Cartographic Coordinate Grid in Background */}
          <line x1="60" y1="6" x2="60" y2="114" stroke="#8B8D87" strokeWidth="0.5" strokeOpacity="0.15" />
          <line x1="6" y1="60" x2="114" y2="60" stroke="#8B8D87" strokeWidth="0.5" strokeOpacity="0.15" />
          <circle cx="60" cy="60" r="42" fill="none" stroke="#8B8D87" strokeWidth="0.5" strokeDasharray="3 3" strokeOpacity="0.2" />

          {/* Wayfarer Head & Torso Silhouette Base */}
          <g opacity="0.95">
            {/* Torso block */}
            <path
              d="M 44 86 
                 C 44 76, 52 74, 60 74 
                 C 68 74, 76 76, 76 86 
                 L 80 116 
                 L 40 116 Z"
              fill="#181B19"
              stroke="#2E3330"
              strokeWidth="1.2"
            />
            {/* Neck / Collarbone */}
            <rect x="56" y="66" width="8" height="10" fill="#222624" />
            {/* Hooded Head Silhouette */}
            <path
              d="M 60 32 
                 C 48 32, 44 42, 44 54 
                 C 44 66, 50 72, 60 72 
                 C 70 72, 76 66, 76 54 
                 C 76 42, 72 32, 60 32 Z"
              fill="#1F2321"
              stroke="#3B423E"
              strokeWidth="1.5"
            />
            {/* Shadow beneath hood */}
            <ellipse cx="60" cy="54" rx="10" ry="12" fill="#0E100F" />
          </g>

          {/* Ambient Streak Flame Heart in Chest/Core */}
          <g>
            {flameTier === 0 ? (
              /* Faint Ember Dot */
              <circle cx="60" cy="72" r="3" fill="#D97732" opacity="0.6" />
            ) : (
              /* Living Flame Silhouette */
              <path
                d={`M 60 ${80 - flameConfig.flameHeight} 
                   C 66 ${75 - flameConfig.flameHeight * 0.4}, 72 74, 68 84 
                   C 65 90, 55 90, 52 84 
                   C 48 74, 54 ${75 - flameConfig.flameHeight * 0.4}, 60 ${80 - flameConfig.flameHeight} Z`}
                fill={`url(#avatar-flame-${avatarId})`}
                opacity={0.9}
              />
            )}
          </g>

          {/* 1. MANTLE LAYER (Visual Layer 1) */}
          <MantleLayer token={mantleToken} />

          {/* 2. CREST LAYER (Visual Layer 2) */}
          <CrestLayer token={crestToken} />
        </g>

        {/* Decorative Compass Markings on Rim */}
        <line x1="60" y1="2" x2="60" y2="8" stroke="#C6A15B" strokeWidth="1.5" />
        <line x1="60" y1="112" x2="60" y2="118" stroke="#C6A15B" strokeWidth="1.5" />
        <line x1="2" y1="60" x2="8" y2="60" stroke="#C6A15B" strokeWidth="1.5" />
        <line x1="112" y1="60" x2="118" y2="60" stroke="#C6A15B" strokeWidth="1.5" />
      </svg>
    </div>
  );
}
