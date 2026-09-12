// ---------------------------------------------------------------------------
// DAYZERO – Atmosphere Environment Layer
// ---------------------------------------------------------------------------
// Restrained atmospheric layer providing subtle vignette, low-opacity noise,
// ancient cartographic lines, and sparse floating ash motes.
// Pointer-events-none, ensuring zero interference with user interaction.
// ---------------------------------------------------------------------------

export function Atmosphere() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none"
      aria-hidden="true"
    >
      {/* 1. Subtle Screen Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 40%, transparent 45%, rgba(11, 12, 12, 0.4) 75%, rgba(11, 12, 12, 0.85) 100%)',
        }}
      />

      {/* 2. Micro-Noise Texture Overlay (SVG Data URI - 2.5% opacity) */}
      <div
        className="absolute inset-0 opacity-[0.03] mix-blend-screen"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
        }}
      />

      {/* 3. Faint Ancient Cartographic & Geometric Linework */}
      <svg
        className="absolute inset-0 h-full w-full stroke-ash/5"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="ancient-grid"
            width="120"
            height="120"
            patternUnits="userSpaceOnUse"
          >
            <path d="M 120 0 L 0 0 0 120" strokeWidth="0.5" stroke="rgba(139, 141, 135, 0.03)" />
            <circle cx="60" cy="60" r="0.75" fill="rgba(139, 141, 135, 0.08)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#ancient-grid)" />

        {/* Diagonal corner alignment markers */}
        <line x1="0" y1="0" x2="160" y2="160" strokeWidth="0.75" strokeDasharray="4 8" />
        <line x1="100%" y1="0" x2="calc(100% - 160px)" y2="160" strokeWidth="0.75" strokeDasharray="4 8" />

        {/* Central orbital rings in the background */}
        <circle cx="50%" cy="45%" r="240" strokeWidth="0.75" strokeDasharray="2 6" opacity="0.4" />
        <circle cx="50%" cy="45%" r="360" strokeWidth="0.5" opacity="0.3" />
      </svg>

      {/* 4. Sparse Ash / Dust Motes */}
      <div className="absolute inset-0 overflow-hidden">
        <span
          className="dayzero-ash absolute bottom-[10%] left-[20%] h-1 w-1 rounded-full bg-ember/30 blur-[0.5px]"
          style={{ animationDuration: '14s', animationDelay: '0s' }}
        />
        <span
          className="dayzero-ash absolute bottom-[15%] left-[65%] h-1.5 w-1.5 rounded-full bg-ember/20 blur-[0.5px]"
          style={{ animationDuration: '18s', animationDelay: '3s' }}
        />
        <span
          className="dayzero-ash absolute bottom-[5%] left-[45%] h-1 w-1 rounded-full bg-gold/25 blur-[0.5px]"
          style={{ animationDuration: '16s', animationDelay: '6s' }}
        />
        <span
          className="dayzero-ash absolute bottom-[25%] left-[80%] h-1 w-1 rounded-full bg-ash/30 blur-[0.5px]"
          style={{ animationDuration: '20s', animationDelay: '2s' }}
        />
        <span
          className="dayzero-ash absolute bottom-[30%] left-[10%] h-1 w-1 rounded-full bg-ember/25 blur-[0.5px]"
          style={{ animationDuration: '22s', animationDelay: '8s' }}
        />
      </div>
    </div>
  );
}
