'use client';

// ---------------------------------------------------------------------------
// DAYZERO – Compact Active Trials Widget for Today
// ---------------------------------------------------------------------------

import Link from 'next/link';
import type { ActiveTrial } from '@/types/game';

interface ActiveTrialsWidgetProps {
  trials: ActiveTrial[];
}

export function ActiveTrialsWidget({ trials }: ActiveTrialsWidgetProps) {
  if (!trials || trials.length === 0) return null;

  return (
    <aside
      className="border border-ash/15 bg-obsidian/70 p-4 sm:p-5 backdrop-blur-sm"
      aria-label="Active Chronicle Trials"
    >
      {/* Widget Header */}
      <div className="flex items-center justify-between border-b border-ash/10 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-ember text-xs">◆</span>
          <h2 className="font-display text-xs tracking-[0.2em] text-parchment uppercase">
            Active Trials
          </h2>
        </div>

        <Link
          href="/game/chronicle"
          className="font-display text-[10px] tracking-widest text-gold hover:text-ember transition-colors inline-flex items-center gap-1 uppercase"
        >
          <span>View Chronicle</span>
          <span>→</span>
        </Link>
      </div>

      {/* Mini Trials List */}
      <div className="mt-3 space-y-3">
        {trials.map((trial) => {
          const isFulfilled = trial.isCompleted || trial.currentProgress >= trial.targetCount;
          const progressPercent = Math.min(
            100,
            Math.round((trial.currentProgress / trial.targetCount) * 100)
          );

          return (
            <div key={trial.id} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-display text-xs tracking-wider text-parchment uppercase">
                    {trial.title}
                  </span>
                  {trial.horizon === 'weekly' && (
                    <span className="font-mono text-[9px] text-ash/60 tracking-wider uppercase">
                      · Weekly
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 font-mono text-xs">
                  {isFulfilled ? (
                    <span className="font-display text-[10px] tracking-wider text-gold uppercase flex items-center gap-1">
                      <span>✓</span> Fulfilled
                    </span>
                  ) : (
                    <span className="text-ash/80">
                      {trial.currentProgress} / {trial.targetCount}
                    </span>
                  )}
                  <span className="text-[10px] text-gold/80 font-display">
                    +{trial.goldReward}G
                  </span>
                </div>
              </div>

              {/* Mini progress bar */}
              <div className="h-1 w-full overflow-hidden bg-void/80 border border-ash/10">
                <div
                  className={`h-full transition-all duration-300 ${
                    isFulfilled ? 'bg-gold' : 'bg-ember/80'
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
