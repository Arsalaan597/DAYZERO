'use client';

// ---------------------------------------------------------------------------
// DAYZERO – Chronicle Client View
// ---------------------------------------------------------------------------

import { useState } from 'react';
import Link from 'next/link';
import { TrialCard } from '@/components/game/chronicle/trial-card';
import { InscriptionCard } from '@/components/game/chronicle/inscription-card';
import type { ActiveTrial, ChronicleData } from '@/types/game';

interface ChronicleClientProps {
  initialTrials: ActiveTrial[];
  initialChronicle: ChronicleData;
}

export function ChronicleClient({
  initialTrials,
  initialChronicle,
}: ChronicleClientProps) {
  const [filter, setFilter] = useState<'all' | 'earned' | 'unearned'>('all');

  const filteredInscriptions = initialChronicle.inscriptions.filter((item) => {
    if (filter === 'earned') return item.earned;
    if (filter === 'unearned') return !item.earned;
    return true;
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10 space-y-12">
      {/* ---------------------------------------------------------------- */}
      {/* Header Banner                                                    */}
      {/* ---------------------------------------------------------------- */}
      <header className="relative border border-ash/20 bg-stone/40 p-6 sm:p-8 backdrop-blur-sm shadow-xl">
        {/* Corner Accents */}
        <span className="pointer-events-none absolute top-2 left-2 text-[9px] text-ash/40">╔</span>
        <span className="pointer-events-none absolute top-2 right-2 text-[9px] text-ash/40">╗</span>
        <span className="pointer-events-none absolute bottom-2 left-2 text-[9px] text-ash/40">╚</span>
        <span className="pointer-events-none absolute bottom-2 right-2 text-[9px] text-ash/40">╝</span>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-ember text-sm">✦</span>
              <p className="font-display text-[10px] tracking-[0.3em] text-ember uppercase">
                The Historical Record
              </p>
            </div>
            <h1 className="mt-1 font-display text-2xl sm:text-3xl tracking-widest text-parchment uppercase">
              The Chronicle
            </h1>
            <p className="mt-1.5 max-w-xl text-xs sm:text-sm text-ash/80 leading-relaxed">
              A permanent testament to deeds completed in the physical realm. Inscriptions commemorate
              historical character growth; Trials reward consistent execution of planned vows.
            </p>
          </div>

          {/* Chronicle Stats Plaque */}
          <div className="flex items-center gap-6 border border-ash/15 bg-obsidian/70 px-5 py-3.5 shrink-0">
            <div className="text-left">
              <p className="text-[9px] tracking-widest text-ash/70 uppercase">Inscriptions</p>
              <p className="font-display text-lg sm:text-xl text-gold">
                {initialChronicle.earnedCount} <span className="text-xs text-ash/60">/ {initialChronicle.totalCount}</span>
              </p>
            </div>
            <div className="h-7 w-px bg-ash/15" aria-hidden="true" />
            <div className="text-left">
              <p className="text-[9px] tracking-widest text-ash/70 uppercase">Latest Seal</p>
              <p className="font-display text-xs text-parchment truncate max-w-[140px]">
                {initialChronicle.latestEarned ? initialChronicle.latestEarned.title : 'None Yet'}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* ---------------------------------------------------------------- */}
      {/* SECTION 1: ACTIVE TRIALS                                         */}
      {/* ---------------------------------------------------------------- */}
      <section aria-labelledby="trials-heading" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-ash/15 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-ember text-xs">◆</span>
              <h2 id="trials-heading" className="font-display text-base tracking-[0.2em] text-parchment uppercase">
                Active Trials
              </h2>
            </div>
            <p className="mt-0.5 text-xs text-ash/70">
              Observing what you already planned. Trials award bonus Gold upon completion (0 XP).
            </p>
          </div>

          <Link
            href="/game/today"
            className="text-xs font-display tracking-wider text-ember hover:text-gold transition-colors inline-flex items-center gap-1"
          >
            <span>Go to Today&apos;s Run</span>
            <span>→</span>
          </Link>
        </div>

        {/* 3 Active Trials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {initialTrials.map((trial) => (
            <TrialCard key={trial.id} trial={trial} />
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* SECTION 2: INSCRIPTIONS OF RECORD                                */}
      {/* ---------------------------------------------------------------- */}
      <section aria-labelledby="inscriptions-heading" className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ash/15 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-gold text-xs">✦</span>
              <h2 id="inscriptions-heading" className="font-display text-base tracking-[0.2em] text-parchment uppercase">
                Inscriptions of Record
              </h2>
            </div>
            <p className="mt-0.5 text-xs text-ash/70">
              Permanent character milestones earned from physical deeds. Inscriptions award 0 Gold and 0 XP.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 border border-ash/15 bg-obsidian/60 p-1" role="tablist">
            {(['all', 'earned', 'unearned'] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={filter === t}
                onClick={() => setFilter(t)}
                className={`px-3 py-1 font-display text-[10px] tracking-wider uppercase transition-colors ${
                  filter === t
                    ? 'bg-stone text-parchment font-semibold border border-ash/30'
                    : 'text-ash/70 hover:text-parchment'
                }`}
              >
                {t === 'all' ? `All (${initialChronicle.totalCount})` : t === 'earned' ? `Earned (${initialChronicle.earnedCount})` : `Locked (${initialChronicle.totalCount - initialChronicle.earnedCount})`}
              </button>
            ))}
          </div>
        </div>

        {/* 12 Inscriptions Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInscriptions.map((inscription) => (
            <InscriptionCard key={inscription.id} inscription={inscription} />
          ))}
        </div>
      </section>
    </div>
  );
}
