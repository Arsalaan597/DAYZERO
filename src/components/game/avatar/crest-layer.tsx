'use client';

// ---------------------------------------------------------------------------
// DAYZERO – Avatar Crest Visual Layer
// ---------------------------------------------------------------------------
// Custom vector insignia rendered cleanly in the center of the Wayfarer frame.
// Supports the 4 canonical Phase 6 crests + default Wayfarer spark crest.
// ---------------------------------------------------------------------------

interface CrestLayerProps {
  token: string | null;
  className?: string;
}

export function CrestLayer({ token, className = '' }: CrestLayerProps) {
  // 1. Crest of the Spark (Sharp 4-pointed radiant stellar insignia with golden ring)
  if (token === 'crest_ember_spark') {
    return (
      <g className={`crest-ember-spark ${className}`}>
        {/* Subtle Ember Aura */}
        <circle cx="60" cy="45" r="14" fill="#D97732" opacity="0.25" />
        {/* Fine Brass Halo Ring */}
        <circle
          cx="60"
          cy="45"
          r="10"
          fill="none"
          stroke="#C6A15B"
          strokeWidth="1.2"
          strokeDasharray="2 2"
        />
        {/* Four-Pointed Radiant Spark Star */}
        <path
          d="M 60 31 
             Q 60 45, 74 45 
             Q 60 45, 60 59 
             Q 60 45, 46 45 
             Q 60 45, 60 31 Z"
          fill="#D97732"
          stroke="#C6A15B"
          strokeWidth="1.5"
        />
        {/* Inner Diamond Jewel */}
        <polygon
          points="60,39 66,45 60,51 54,45"
          fill="#FAE6B1"
          stroke="#E7DFC9"
          strokeWidth="0.8"
        />
        {/* Center Radiant Core */}
        <circle cx="60" cy="45" r="2" fill="#FFFFFF" />
      </g>
    );
  }

  // 2. Eye of Remembrance (The archivist ocular sigil of the Academy)
  if (token === 'crest_ancient_eye') {
    return (
      <g className={`crest-ancient-eye ${className}`}>
        {/* Ocular Outline */}
        <path
          d="M 46 45 
             C 52 38, 68 38, 74 45 
             C 68 52, 52 52, 46 45 Z"
          fill="#141829"
          stroke="#7A8EC7"
          strokeWidth="1.6"
        />
        {/* Iris Circle */}
        <circle cx="60" cy="45" r="4.5" fill="#2E3A66" stroke="#C6A15B" strokeWidth="1" />
        {/* Slit Pupil / Radiant Spark */}
        <ellipse cx="60" cy="45" rx="1.5" ry="3" fill="#E7DFC9" />
        {/* Upper brow / lash line */}
        <path d="M 52 39 L 60 35 L 68 39" stroke="#C6A15B" strokeWidth="1" fill="none" />
      </g>
    );
  }

  // 3. Anvil of Resolve (Geometric forge anvil symbol)
  if (token === 'crest_iron_anvil') {
    return (
      <g className={`crest-iron-anvil ${className}`}>
        {/* Anvil Horn & Flat Body */}
        <path
          d="M 48 40 L 72 40 L 70 45 L 66 45 L 64 50 L 56 50 L 54 45 L 48 43 Z"
          fill="#2C2E2D"
          stroke="#C6A15B"
          strokeWidth="1.5"
        />
        {/* Base Pedestal */}
        <rect x="52" y="50" width="16" height="3" fill="#1C1E1D" stroke="#8B8D87" strokeWidth="1" />
        {/* Hammer Strike Spark Point */}
        <polygon points="60,37 62,39 60,41 58,39" fill="#D97732" />
      </g>
    );
  }

  // 4. Crown of the Dawn (Solar tri-pointed crown insignia)
  if (token === 'crest_crown_of_dawn') {
    return (
      <g className={`crest-crown-of-dawn ${className}`}>
        {/* Tri-pointed Crown */}
        <polygon
          points="48,51 51,41 56,46 60,36 64,46 69,41 72,51"
          fill="#4A3414"
          stroke="#C6A15B"
          strokeWidth="1.8"
        />
        {/* Crown Band */}
        <rect x="49" y="51" width="22" height="3" fill="#784E18" stroke="#E7DFC9" strokeWidth="0.8" />
        {/* Jewels on Peaks */}
        <circle cx="51" cy="41" r="1.2" fill="#E7DFC9" />
        <circle cx="60" cy="36" r="1.8" fill="#FFFFFF" stroke="#D97732" strokeWidth="0.8" />
        <circle cx="69" cy="41" r="1.2" fill="#E7DFC9" />
      </g>
    );
  }

  // DEFAULT FALLBACK: Understated Muted Iron Lozenge (Unkindled unaligned badge)
  return (
    <g className={`crest-default ${className}`}>
      <polygon
        points="60,40 65,45 60,50 55,45"
        fill="#181A19"
        stroke="#4A4E4C"
        strokeWidth="1"
        strokeDasharray="1.5 1.5"
      />
      <circle cx="60" cy="45" r="1" fill="#8B8D87" opacity="0.6" />
    </g>
  );
}
