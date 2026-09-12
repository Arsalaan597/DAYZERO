'use client';

// ---------------------------------------------------------------------------
// DAYZERO – Realm Connection Paths
// ---------------------------------------------------------------------------
// Renders the ancient resonant ley lines connecting the central Zeroflame
// to the five ancestral realms in the radial map layout.
// Lines visually reflect realm awakening tier (dormant vs energized).
// ---------------------------------------------------------------------------

import type { Realm } from '@/types/game';

interface RealmPathsProps {
  levels: Record<Realm, number>;
  activePulseRealm?: Realm | null;
}

export function RealmPaths({ levels, activePulseRealm }: RealmPathsProps) {
  // Target node coordinates (in SVG coordinate space: 500 x 500)
  // Center is (250, 250)
  const paths: Array<{ realm: Realm; x: number; y: number }> = [
    { realm: 'academy', x: 250, y: 70 }, // Top
    { realm: 'wilds', x: 420, y: 195 }, // Top-right
    { realm: 'forge', x: 355, y: 415 }, // Bottom-right
    { realm: 'sanctuary', x: 145, y: 415 }, // Bottom-left
    { realm: 'atelier', x: 80, y: 195 }, // Top-left
  ];

  return (
    <svg
      viewBox="0 0 500 500"
      className="pointer-events-none absolute inset-0 h-full w-full select-none"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        {/* Ancient resonance pulse animation */}
        <filter id="path-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Central ancient glyph / orbital boundary */}
      <circle
        cx="250"
        cy="250"
        r="68"
        stroke="rgba(139, 141, 135, 0.12)"
        strokeWidth="1"
        strokeDasharray="4 6"
      />
      <circle
        cx="250"
        cy="250"
        r="170"
        stroke="rgba(139, 141, 135, 0.08)"
        strokeWidth="0.75"
        strokeDasharray="2 8"
      />

      {/* Ley lines to each realm */}
      {paths.map(({ realm, x, y }) => {
        const tier = levels[realm] ?? 0;
        const isAwakened = tier > 0;
        const isPulsing = activePulseRealm === realm;

        return (
          <g key={realm}>
            {/* Base line */}
            <line
              x1="250"
              y1="250"
              x2={x}
              y2={y}
              stroke={
                isPulsing
                  ? '#D97732'
                  : isAwakened
                  ? tier === 3
                    ? '#C6A15B'
                    : '#D97732'
                  : '#8B8D87'
              }
              strokeWidth={isPulsing ? 2 : isAwakened ? 1.25 : 0.75}
              strokeDasharray={isAwakened ? (tier >= 2 ? undefined : '6 4') : '3 6'}
              strokeOpacity={isPulsing ? 0.9 : isAwakened ? (tier === 3 ? 0.6 : 0.4) : 0.18}
              filter={isPulsing || tier === 3 ? 'url(#path-glow)' : undefined}
            />

            {/* Small node anchor pip */}
            <circle
              cx={x}
              cy={y}
              r={tier >= 2 ? 3 : 2}
              fill={isAwakened ? (tier === 3 ? '#C6A15B' : '#D97732') : '#8B8D87'}
              opacity={isAwakened ? 0.8 : 0.3}
            />
          </g>
        );
      })}
    </svg>
  );
}
