'use client';

// ---------------------------------------------------------------------------
// DAYZERO – Quest Reward Reveal Modal
// ---------------------------------------------------------------------------

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { REALMS } from '@/config/game';
import { Button } from '@/components/ui/button';
import type { QuestCompletionResult } from '@/types/game';

interface RewardRevealProps {
  result: QuestCompletionResult | null;
  onDismiss: () => void;
}

export function RewardReveal({ result, onDismiss }: RewardRevealProps) {
  // Allow Esc key to dismiss
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onDismiss();
      }
    }
    if (result) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [result, onDismiss]);

  if (!result) return null;

  const realmInfo = REALMS[result.realm];

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-void/85 p-4 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reward-title"
        onClick={onDismiss}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="w-full max-w-md border border-ash/20 bg-obsidian p-8 text-center shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Ancient geometric emblem */}
          <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center border border-ember/50 bg-stone/60">
            <span className="text-sm text-ember" aria-hidden="true">
              ◆
            </span>
          </div>

          {/* Title */}
          <p className="text-xs tracking-[0.25em] text-ash uppercase">Ritual Fulfilled</p>
          <h2
            id="reward-title"
            className="mt-1 font-display text-2xl tracking-widest text-parchment uppercase"
          >
            Quest Complete
          </h2>

          {/* Level Ascension Announcement */}
          {result.leveledUp && (
            <div className="my-5 border border-gold/30 bg-gold/5 p-3.5">
              <p className="text-xs tracking-[0.25em] text-gold uppercase">
                Level Ascended
              </p>
              <p className="mt-1 font-display text-lg tracking-wider text-parchment">
                Level {result.newLevel} Wayfarer
              </p>
            </div>
          )}

          {/* Realm Awakening Announcement */}
          {result.realmLeveledUp && (
            <div className="my-5 border border-ember/30 bg-ember/5 p-3.5">
              <p className="text-xs tracking-[0.25em] text-ember uppercase">
                {realmInfo?.name ?? 'Realm'} Awakening
              </p>
              <p className="mt-1 font-display text-sm tracking-wider text-parchment">
                Resonance Tier {result.newRealmLevel} Reached
              </p>
            </div>
          )}

          {/* Reward Gains Grid */}
          <div className="my-6 grid grid-cols-3 gap-3 border-y border-ash/15 py-4">
            {/* XP Gained */}
            <div>
              <p className="text-[10px] tracking-widest text-ash uppercase">Experience</p>
              <p className="mt-1 font-display text-lg text-ember">+{result.xpGained} XP</p>
            </div>

            {/* Gold Gained */}
            <div>
              <p className="text-[10px] tracking-widest text-ash uppercase">Tribute</p>
              <p className="mt-1 font-display text-lg text-gold">+{result.goldGained} G</p>
            </div>

            {/* Attribute Gained */}
            <div>
              <p className="text-[10px] tracking-widest text-ash uppercase">
                {result.attribute}
              </p>
              <p className="mt-1 font-display text-lg text-parchment">
                +{result.attributeGained}
              </p>
            </div>
          </div>

          {/* New Totals Row */}
          <div className="mb-6 flex justify-around text-xs tracking-wider text-ash/60">
            <span>Total XP: {result.totalXp}</span>
            <span>Gold: {result.newGold}</span>
            <span>Streak: {result.newStreak}d</span>
          </div>

          {/* Dismiss CTA */}
          <Button variant="primary" className="w-full" onClick={onDismiss}>
            Accept & Continue
          </Button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
