'use client';

// ---------------------------------------------------------------------------
// DAYZERO – Avatar Mantle Visual Layer
// ---------------------------------------------------------------------------
// Renders distinct SVG silhouettes and shoulder/cloak treatments for the Wayfarer.
// Supports the 4 canonical Phase 6 mantles + default Wanderer fallback.
// ---------------------------------------------------------------------------

interface MantleLayerProps {
  token: string | null;
  className?: string;
}

export function MantleLayer({ token, className = '' }: MantleLayerProps) {
  // 1. Ashen Mantle (Starter cloak with fire-resistant wool wrap and clasp)
  if (token === 'mantle_ash_cloak') {
    return (
      <g className={`mantle-ash-cloak transition-all duration-300 ${className}`}>
        {/* Deep Ash Cloak Silhouette draping down and framing shoulders */}
        <path
          d="M 28 66 
             C 18 70, 8 85, 6 112 
             C 12 116, 24 118, 36 116
             C 42 104, 46 88, 48 76 Z"
          fill="#252927"
          stroke="#414743"
          strokeWidth="1.5"
          opacity="0.9"
        />
        <path
          d="M 92 66 
             C 102 70, 112 85, 114 112 
             C 108 116, 96 118, 84 116
             C 78 104, 74 88, 72 76 Z"
          fill="#252927"
          stroke="#414743"
          strokeWidth="1.5"
          opacity="0.9"
        />
        {/* Front Cowl Collar Fold */}
        <path
          d="M 36 70 
             C 50 82, 70 82, 84 70 
             C 74 88, 46 88, 36 70 Z"
          fill="#313633"
          stroke="#525B55"
          strokeWidth="1.2"
        />
        {/* Bronze Clasp */}
        <polygon
          points="60,73 64,78 60,83 56,78"
          fill="#C6A15B"
          stroke="#E7DFC9"
          strokeWidth="0.8"
        />
      </g>
    );
  }

  // 2. Scholar Cowl (Deep indigo archivist hood with celestial runic hem)
  if (token === 'mantle_scholars_cowl') {
    return (
      <g className={`mantle-scholars-cowl transition-all duration-300 ${className}`}>
        {/* Back Indigo Draping */}
        <path
          d="M 24 62
             C 14 74, 10 92, 12 115
             C 22 118, 38 115, 46 96
             C 40 82, 36 72, 34 65 Z"
          fill="#1A1F36"
          stroke="#3B4673"
          strokeWidth="1.5"
        />
        <path
          d="M 96 62
             C 106 74, 110 92, 108 115
             C 98 118, 82 115, 74 96
             C 80 82, 84 72, 86 65 Z"
          fill="#1A1F36"
          stroke="#3B4673"
          strokeWidth="1.5"
        />
        {/* Cowl Shoulder Wrap */}
        <path
          d="M 28 66 
             C 45 88, 75 88, 92 66 
             C 82 95, 38 95, 28 66 Z"
          fill="#242B4C"
          stroke="#6877B5"
          strokeWidth="1.5"
        />
        {/* Lapis / Intellect Gem Brooch */}
        <circle cx="60" cy="80" r="4.5" fill="#4B69C6" stroke="#C6A15B" strokeWidth="1" />
        <circle cx="60" cy="80" r="2" fill="#E7DFC9" />
        {/* Runic Trim Marks */}
        <line x1="42" y1="84" x2="46" y2="86" stroke="#90A1E0" strokeWidth="1" />
        <line x1="78" y1="84" x2="74" y2="86" stroke="#90A1E0" strokeWidth="1" />
      </g>
    );
  }

  // 3. Forged Pauldrons (Heavy annealed iron shoulder guards with brass rivets)
  if (token === 'mantle_forged_pauldrons') {
    return (
      <g className={`mantle-forged-pauldrons transition-all duration-300 ${className}`}>
        {/* Left Iron Pauldron Segment */}
        <path
          d="M 8 72 
             L 28 58 
             L 42 74 
             L 22 92 
             L 6 86 Z"
          fill="#262828"
          stroke="#737976"
          strokeWidth="2"
        />
        {/* Inner Plate Lamination */}
        <path
          d="M 12 76 L 28 64 L 38 76 L 24 88 Z"
          fill="#181A1A"
          stroke="#A3ABA7"
          strokeWidth="1"
        />
        {/* Right Iron Pauldron Segment */}
        <path
          d="M 112 72 
             L 92 58 
             L 78 74 
             L 98 92 
             L 114 86 Z"
          fill="#262828"
          stroke="#737976"
          strokeWidth="2"
        />
        {/* Inner Plate Lamination */}
        <path
          d="M 108 76 L 92 64 L 82 76 L 96 88 Z"
          fill="#181A1A"
          stroke="#A3ABA7"
          strokeWidth="1"
        />
        {/* Gorget Collar Plate across chest */}
        <path
          d="M 38 72 L 60 84 L 82 72 L 74 88 L 60 94 L 46 88 Z"
          fill="#2C2F2E"
          stroke="#C6A15B"
          strokeWidth="1.5"
        />
        {/* Rivets */}
        <circle cx="16" cy="74" r="1.5" fill="#C6A15B" />
        <circle cx="104" cy="74" r="1.5" fill="#C6A15B" />
        <circle cx="60" cy="88" r="1.5" fill="#C6A15B" />
      </g>
    );
  }

  // 4. Solar Shroud (Radiant consecrated mantle with gilded solar arcs)
  if (token === 'mantle_solar_shroud') {
    return (
      <g className={`mantle-solar-shroud transition-all duration-300 ${className}`}>
        {/* Golden Solar Rays radiating behind */}
        <path
          d="M 60 22 L 60 8 M 38 28 L 26 18 M 82 28 L 94 18 M 20 45 L 8 40 M 100 45 L 112 40"
          stroke="#C6A15B"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.8"
        />
        {/* Flowing Radiant Mantle Wings */}
        <path
          d="M 22 58 
             C 10 70, 4 90, 8 116 
             C 24 114, 40 106, 48 86
             C 38 74, 30 65, 22 58 Z"
          fill="#4A3414"
          stroke="#D97732"
          strokeWidth="2"
        />
        <path
          d="M 98 58 
             C 110 70, 116 90, 112 116 
             C 96 114, 80 106, 72 86
             C 82 74, 90 65, 98 58 Z"
          fill="#4A3414"
          stroke="#D97732"
          strokeWidth="2"
        />
        {/* Gilded Collar Wings */}
        <path
          d="M 32 68 
             C 48 86, 72 86, 88 68 
             C 80 94, 40 94, 32 68 Z"
          fill="#784E18"
          stroke="#C6A15B"
          strokeWidth="2"
        />
        {/* Sun Core Emblem */}
        <circle cx="60" cy="78" r="5" fill="#D97732" stroke="#E7DFC9" strokeWidth="1.2" />
        <circle cx="60" cy="78" r="2.5" fill="#E7DFC9" />
      </g>
    );
  }

  // DEFAULT FALLBACK: Wanderer Mantle (Weathered travel wraps)
  return (
    <g className={`mantle-wanderer-default transition-all duration-300 ${className}`}>
      <path
        d="M 32 68 
           C 22 76, 16 90, 18 110 
           C 28 112, 38 110, 44 94
           C 38 84, 35 76, 32 68 Z"
        fill="#1C1E1D"
        stroke="#3A3E3B"
        strokeWidth="1.2"
        opacity="0.8"
      />
      <path
        d="M 88 68 
           C 98 76, 104 90, 102 110 
           C 92 112, 82 110, 76 94
           C 82 84, 85 76, 88 68 Z"
        fill="#1C1E1D"
        stroke="#3A3E3B"
        strokeWidth="1.2"
        opacity="0.8"
      />
      {/* Front simple rough cowl */}
      <path
        d="M 36 72 
           C 48 82, 72 82, 84 72 
           C 76 86, 44 86, 36 72 Z"
        fill="#262A28"
        stroke="#474E4A"
        strokeWidth="1"
      />
      {/* Iron pin */}
      <circle cx="60" cy="77" r="2" fill="#8B8D87" />
    </g>
  );
}
