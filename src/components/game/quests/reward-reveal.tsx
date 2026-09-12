'use client';

// ---------------------------------------------------------------------------
// DAYZERO – Quest Reward Reveal Modal
// ---------------------------------------------------------------------------
// Upgraded completion sequence:
// 0.2s: Reveal opens with ancient stone aesthetics
// 0.5s: Corresponding Realm node resonance indicator pulses
// 0.8s: Zeroflame flares with renewed momentum
// Conditional: REALM AWAKENED and LEVEL ASCENDED moments
// Usable within 1.5–2.5s, always dismissible, no particle spam.
// ---------------------------------------------------------------------------

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { REALMS } from '@/config/game';
import { Button } from '@/components/ui/button';
import { Zeroflame } from '@/components/game/realm/zeroflame';
import type { QuestCompletionResult } from '@/types/game';

interface RewardRevealProps {
  result: QuestCompletionResult | null;
  onDismiss: () => void;
}

export function RewardReveal({ result, onDismiss }: RewardRevealProps) {
  if (!result) return null;

  return <RewardRevealContent key={result.questId} result={result} onDismiss={onDismiss} />;
}

function RewardRevealContent({
  result,
  onDismiss,
}: {
  result: QuestCompletionResult;
  onDismiss: () => void;
}) {
  const [realmPulsed, setRealmPulsed] = useState(false);
  const [flameFlared, setFlameFlared] = useState(false);

  // Trigger sequence timings
  useEffect(() => {
    // 0.5s: Realm pulse
    const realmTimer = setTimeout(() => {
      setRealmPulsed(true);
    }, 500);

    // 0.8s: Zeroflame flare
    const flameTimer = setTimeout(() => {
      setFlameFlared(true);
    }, 800);

    return () => {
      clearTimeout(realmTimer);
      clearTimeout(flameTimer);
    };
  }, []);

  // Allow Esc key to dismiss
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onDismiss();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onDismiss]);

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
          initial={{ opacity: 0, scale: 0.94, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 14 }}
          transition={{ duration: 0.22, ease: 'easeOut', delay: 0.1 }}
          className="relative w-full max-w-md border border-ash/25 bg-obsidian p-6 sm:p-8 text-center shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Corner accents */}
          <span className="pointer-events-none absolute top-2 left-2 text-[9px] text-ash/40">╔</span>
          <span className="pointer-events-none absolute top-2 right-2 text-[9px] text-ash/40">╗</span>
          <span className="pointer-events-none absolute bottom-2 left-2 text-[9px] text-ash/40">╚</span>
          <span className="pointer-events-none absolute bottom-2 right-2 text-[9px] text-ash/40">╝</span>

          {/* Central Heartbeat: Flaring Zeroflame */}
          <div className="mx-auto mb-3 flex flex-col items-center justify-center">
            <Zeroflame streak={result.newStreak} size="sm" flare={flameFlared} />
          </div>

          {/* Title Header */}
          <p className="font-display text-[10px] tracking-[0.3em] text-ember uppercase">
            Vow Fulfilled
          </p>
          <h2
            id="reward-title"
            className="mt-0.5 font-display text-xl sm:text-2xl tracking-widest text-parchment uppercase"
          >
            Quest Complete
          </h2>

          {/* ---------------------------------------------------------------- */}
          {/* Conditional 1: Level Ascension Moment                             */}
          {/* ---------------------------------------------------------------- */}
          {result.leveledUp && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.35, duration: 0.3 }}
              className="my-4 border border-gold/50 bg-gold/10 p-3"
            >
              <p className="font-display text-xs tracking-[0.25em] text-gold uppercase">
                ✦ Level Ascended ✦
              </p>
              <p className="mt-1 font-display text-base tracking-wider text-parchment">
                Wayfarer Tier: Level {result.newLevel}
              </p>
            </motion.div>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* Conditional 2: Realm Awakening Moment                            */}
          {/* ---------------------------------------------------------------- */}
          {result.realmLeveledUp && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.45, duration: 0.3 }}
              className="my-4 border border-ember/60 bg-ember/10 p-3"
            >
              <p className="font-display text-xs tracking-[0.25em] text-ember uppercase">
                ✦ Realm Awakened ✦
              </p>
              <p className="mt-1 font-display text-sm tracking-wider text-parchment">
                {realmInfo?.name} Reached Tier {result.newRealmLevel}
              </p>
            </motion.div>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* Realm Node Resonance Reaction (0.5s Pulse)                       */}
          {/* ---------------------------------------------------------------- */}
          <motion.div
            animate={{
              borderColor: realmPulsed ? '#D97732' : 'rgba(139, 141, 135, 0.2)',
              backgroundColor: realmPulsed ? 'rgba(217, 119, 50, 0.08)' : 'rgba(27, 30, 28, 0.5)',
            }}
            transition={{ duration: 0.4 }}
            className="my-4 flex items-center justify-between border px-4 py-2 text-xs"
          >
            <div className="flex items-center gap-2">
              <span className={realmPulsed ? 'text-ember' : 'text-ash/60'}>◆</span>
              <span className="font-display tracking-wider text-parchment uppercase">
                {realmInfo?.name} Resonance
              </span>
            </div>
            <span className="font-display text-ember">
              +{result.attributeGained} {result.attribute}
            </span>
          </motion.div>

          {/* ---------------------------------------------------------------- */}
          {/* Reward Gains Breakdown                                           */}
          {/* ---------------------------------------------------------------- */}
          <div className="my-5 grid grid-cols-3 gap-2 border-y border-ash/15 py-3.5">
            {/* XP */}
            <div>
              <p className="text-[9px] tracking-widest text-ash/80 uppercase">Experience</p>
              <p className="mt-0.5 font-display text-base sm:text-lg text-ember">
                +{result.xpGained} XP
              </p>
            </div>

            {/* Tribute / Gold */}
            <div>
              <p className="text-[9px] tracking-widest text-ash/80 uppercase">Tribute</p>
              <p className="mt-0.5 font-display text-base sm:text-lg text-gold">
                +{result.goldGained} G
              </p>
            </div>

            {/* Streak */}
            <div>
              <p className="text-[9px] tracking-widest text-ash/80 uppercase">Flame Streak</p>
              <p className="mt-0.5 font-display text-base sm:text-lg text-parchment">
                {result.newStreak}d
              </p>
            </div>
          </div>

          {/* New Totals Row */}
          <div className="mb-5 flex justify-around text-[11px] tracking-wider text-ash/80">
            <span>Total XP: {result.totalXp}</span>
            <span>Vault: {result.newGold} G</span>
            <span>Level: {result.newLevel}</span>
          </div>

          {/* Dismiss CTA */}
          <Button variant="primary" className="w-full text-xs py-2.5" onClick={onDismiss}>
            Accept & Continue
          </Button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
