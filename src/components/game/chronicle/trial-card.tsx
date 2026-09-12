'use client';

// ---------------------------------------------------------------------------
// DAYZERO – Trial Card Component (Chronicle)
// ---------------------------------------------------------------------------

import type { ActiveTrial } from '@/types/game';

interface TrialCardProps {
  trial: ActiveTrial;
}

export function TrialCard({ trial }: TrialCardProps) {
  const isFulfilled = trial.isCompleted || trial.currentProgress >= trial.targetCount;
  const progressPercent = Math.min(
    100,
    Math.round((trial.currentProgress / trial.targetCount) * 100)
  );

  return (
    <article
      className={`relative border p-5 transition-all ${
        isFulfilled
          ? 'border-gold/50 bg-gradient-to-br from-gold/10 via-obsidian/90 to-stone/40 shadow-lg shadow-gold/5'
          : 'border-ash/20 bg-stone/40 hover:border-ash/35'
      }`}
      aria-label={`Trial: ${trial.title}`}
    >
      {/* Corner runes */}
      <span className="pointer-events-none absolute top-1.5 left-2 text-[8px] text-ash/30 select-none">
        ┌
      </span>
      <span className="pointer-events-none absolute top-1.5 right-2 text-[8px] text-ash/30 select-none">
        ┐
      </span>

      {/* Header Row: Horizon & Reward */}
      <div className="flex items-center justify-between gap-2 border-b border-ash/10 pb-2.5">
        <div className="flex items-center gap-2">
          <span
            className={`font-display text-[9px] tracking-[0.25em] uppercase px-2 py-0.5 border ${
              trial.horizon === 'weekly'
                ? 'border-ember/40 bg-ember/10 text-ember'
                : 'border-ash/30 bg-void/50 text-ash/80'
            }`}
          >
            {trial.horizon}
          </span>
          <h3 className="font-display text-sm tracking-widest text-parchment uppercase">
            {trial.title}
          </h3>
        </div>

        <div className="flex items-center gap-1 font-display text-xs text-gold">
          <span>+{trial.goldReward}</span>
          <span className="text-[10px] text-gold/70 uppercase">Gold</span>
        </div>
      </div>

      {/* Description */}
      <p className="mt-3 text-xs leading-relaxed text-ash/90">
        {trial.description}
      </p>

      {/* Progress Track */}
      <div className="mt-4 space-y-1.5">
        <div className="flex items-center justify-between text-[10px] font-mono">
          <span className={isFulfilled ? 'text-gold font-display' : 'text-ash/70'}>
            {isFulfilled ? 'Vow Fulfilled' : 'Progress'}
          </span>
          <span className="text-parchment font-semibold">
            {trial.currentProgress} / {trial.targetCount}
          </span>
        </div>

        <div className="h-1.5 w-full overflow-hidden bg-void/80 border border-ash/15">
          <div
            className={`h-full transition-all duration-500 ${
              isFulfilled
                ? 'bg-gradient-to-r from-gold to-ember'
                : 'bg-gradient-to-r from-ember/80 to-ember'
            }`}
            style={{ width: `${progressPercent}%` }}
            role="progressbar"
            aria-valuenow={trial.currentProgress}
            aria-valuemin={0}
            aria-valuemax={trial.targetCount}
          />
        </div>
      </div>

      {/* Status Footer */}
      <div className="mt-3.5 pt-2 border-t border-ash/10 flex items-center justify-between text-[10px]">
        <span className="text-ash/60">Objective Bound</span>
        {isFulfilled ? (
          <span className="font-display text-gold flex items-center gap-1 tracking-wider uppercase">
            <span>✦</span> Fulfilled
          </span>
        ) : (
          <span className="text-ash/80 tracking-wider uppercase font-mono">
            Active
          </span>
        )}
      </div>
    </article>
  );
}
