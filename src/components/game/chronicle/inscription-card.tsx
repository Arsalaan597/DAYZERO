'use client';

// ---------------------------------------------------------------------------
// DAYZERO – Inscription Card Component (Achievements)
// ---------------------------------------------------------------------------

import type { ChronicleInscription } from '@/types/game';

interface InscriptionCardProps {
  inscription: ChronicleInscription;
}

export function InscriptionCard({ inscription }: InscriptionCardProps) {
  const isEarned = inscription.earned;

  // Format date if earned
  let earnedFormatted = '';
  if (inscription.earnedAt) {
    try {
      const d = new Date(inscription.earnedAt);
      earnedFormatted = d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      earnedFormatted = 'Recorded';
    }
  }

  return (
    <article
      className={`relative flex flex-col justify-between border p-5 transition-all ${
        isEarned
          ? 'border-gold/40 bg-gradient-to-b from-stone/60 via-obsidian/90 to-void/90 shadow-md shadow-gold/5'
          : 'border-ash/15 bg-obsidian/50 opacity-75 hover:opacity-90'
      }`}
      aria-label={`Inscription: ${inscription.title} (${isEarned ? 'Earned' : 'Locked'})`}
    >
      {/* Ancient corner engravings */}
      <span className="pointer-events-none absolute top-1.5 left-2 text-[8px] text-ash/30 select-none">
        {isEarned ? '✦' : '·'}
      </span>
      <span className="pointer-events-none absolute top-1.5 right-2 text-[8px] text-ash/30 select-none">
        {isEarned ? '✦' : '·'}
      </span>

      <div>
        {/* Top Seal & Status Row */}
        <div className="flex items-center justify-between gap-2 border-b border-ash/10 pb-2.5">
          <div className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center border text-xs ${
                isEarned
                  ? 'border-gold bg-gold/20 text-gold'
                  : 'border-ash/25 bg-void/60 text-ash/40'
              }`}
              aria-hidden="true"
            >
              {isEarned ? '◈' : '◇'}
            </span>
            <h4
              className={`font-display text-sm tracking-wider uppercase ${
                isEarned ? 'text-parchment font-semibold' : 'text-ash/70'
              }`}
            >
              {inscription.title}
            </h4>
          </div>

          <span
            className={`font-display text-[9px] tracking-widest uppercase px-2 py-0.5 border ${
              isEarned
                ? 'border-gold/40 bg-gold/10 text-gold'
                : 'border-ash/20 bg-void/40 text-ash/50'
            }`}
          >
            {isEarned ? 'Inscribed' : 'Uninscribed'}
          </span>
        </div>

        {/* Description */}
        <p className="mt-3 text-xs leading-relaxed text-ash/80">
          {inscription.description}
        </p>
      </div>

      {/* Footer Timestamp / Requirement */}
      <div className="mt-4 pt-2.5 border-t border-ash/10 flex items-center justify-between text-[10px]">
        {isEarned ? (
          <span className="text-gold/80 font-mono">
            Inscribed: {earnedFormatted}
          </span>
        ) : (
          <span className="text-ash/50 font-mono">
            Threshold: {inscription.targetValue}
          </span>
        )}
        <span className="text-ash/40 font-mono text-[9px]">
          #{inscription.sortOrder}
        </span>
      </div>
    </article>
  );
}
