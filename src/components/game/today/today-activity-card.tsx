'use client';

// ---------------------------------------------------------------------------
// DAYZERO – Today Activity Card Component
// ---------------------------------------------------------------------------

import { useState } from 'react';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { REALMS } from '@/config/game';
import type { TodayActivity } from '@/types/game';

interface TodayActivityCardProps {
  activity: TodayActivity;
  onComplete: (activity: TodayActivity) => Promise<void>;
  isPending: boolean;
}

export function TodayActivityCard({
  activity,
  onComplete,
  isPending,
}: TodayActivityCardProps) {
  const [loading, setLoading] = useState(false);
  const realm = REALMS[activity.attribute === 'intellect' ? 'academy' : activity.attribute === 'strength' ? 'wilds' : activity.attribute === 'discipline' ? 'forge' : activity.attribute === 'wellness' ? 'sanctuary' : 'atelier'];

  async function handleComplete() {
    if (loading || isPending || activity.isCompleted) return;
    setLoading(true);
    try {
      await onComplete(activity);
    } finally {
      setLoading(false);
    }
  }

  const isCompleted = activity.isCompleted;
  const isMain = activity.isMainQuest;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative w-full border transition-all duration-200 ${
        isCompleted
          ? 'border-ash/15 bg-obsidian/40 opacity-70'
          : isMain
          ? 'border-ember/60 bg-obsidian/90 shadow-[0_0_20px_rgba(217,119,50,0.15)] ring-1 ring-ember/30'
          : 'border-ash/20 bg-obsidian/75 hover:border-ash/40'
      } p-4 sm:p-5`}
    >
      {/* Corner runes for Main Quest */}
      {isMain && !isCompleted && (
        <>
          <span className="pointer-events-none absolute top-1.5 left-2 text-[10px] text-ember">✦</span>
          <span className="pointer-events-none absolute top-1.5 right-2 text-[10px] text-ember">✦</span>
        </>
      )}

      {/* Header bar: Time, Type, Status */}
      <div className="flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          {activity.time ? (
            <span className="font-mono text-xs text-parchment/90 font-medium tracking-wider">
              {activity.time}
            </span>
          ) : (
            <span className="font-mono text-[11px] text-ash/60 uppercase">
              Anytime
            </span>
          )}

          {activity.estimatedMinutes && (
            <span className="text-[11px] text-ash/60">
              · {activity.estimatedMinutes}m
            </span>
          )}

          <span className="text-ash/30">|</span>

          {/* Routine vs Quest badge */}
          <span className="text-[10px] tracking-widest text-ash/70 uppercase">
            {activity.type === 'routine' ? 'Routine Habit' : 'One-Off Quest'}
          </span>
        </div>

        {/* Right tags */}
        <div className="flex items-center gap-2">
          {isMain && (
            <span className="flex items-center gap-1 border border-ember/60 bg-ember/15 px-2 py-0.5 font-display text-[9px] tracking-[0.2em] text-ember uppercase">
              <span>★</span> Main Quest
            </span>
          )}

          {isCompleted && (
            <span className="border border-gold/40 bg-gold/10 px-2 py-0.5 font-display text-[10px] tracking-widest text-gold uppercase">
              ✓ Cleared
            </span>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="mt-2.5">
        <h3
          className={`font-display text-base sm:text-lg tracking-wider ${
            isCompleted
              ? 'line-through text-ash/60'
              : isMain
              ? 'text-parchment font-semibold'
              : 'text-parchment'
          }`}
        >
          {activity.title}
        </h3>

        {activity.description && !isCompleted && (
          <p className="mt-1 text-xs text-ash/80 line-clamp-2">
            {activity.description}
          </p>
        )}
      </div>

      {/* Footer: Realm resonance, effort, challenge, rewards & complete CTA */}
      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 border-t border-ash/10 pt-3">
        {/* Realm / Classification */}
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="flex items-center gap-1 font-display tracking-wider text-parchment/90 uppercase">
            <span className="text-ember">◆</span>
            {realm.name}
          </span>

          <span className="text-ash/40">·</span>

          <span className="text-ash/70 capitalize">
            {activity.effort}
          </span>

          {activity.challenge !== 'routine' && (
            <>
              <span className="text-ash/40">·</span>
              <span className="text-gold capitalize">
                +{activity.challenge}
              </span>
            </>
          )}

          {/* Expected rewards */}
          <span className="ml-1 text-[10px] text-ash/70 tracking-wider">
            (+{activity.expectedXp} XP · +{activity.expectedGold} G)
          </span>
        </div>

        {/* Action Button */}
        {!isCompleted && (
          <Button
            variant={isMain ? 'primary' : 'secondary'}
            className={`text-xs py-1.5 px-4 tracking-wider uppercase ${
              isMain ? 'ring-1 ring-ember/50 shadow-md' : ''
            }`}
            disabled={loading || isPending}
            onClick={handleComplete}
          >
            {loading ? 'Fulfilling...' : 'Fulfill Vow'}
          </Button>
        )}
      </div>
    </motion.div>
  );
}
