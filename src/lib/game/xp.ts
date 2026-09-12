// ---------------------------------------------------------------------------
// DAYZERO – XP / Level Calculation Utilities
// ---------------------------------------------------------------------------
//
// Pure functions with zero side-effects. Safe to call from server or client.
// Formula:  XP required to advance from level L = floor(100 × L^1.5)
//
// ---------------------------------------------------------------------------

import { XP_BASE, XP_EXPONENT } from '@/config/game';
import type { LevelInfo } from '@/types/game';

/**
 * XP required to advance from a given level to the next.
 *
 * @example xpRequiredForLevel(1) → 100
 * @example xpRequiredForLevel(5) → 1118
 */
export function xpRequiredForLevel(level: number): number {
  if (level < 1) return 0;
  return Math.floor(XP_BASE * Math.pow(level, XP_EXPONENT));
}

/**
 * Cumulative XP needed to *reach* a given level (starting from level 1).
 *
 * totalXpForLevel(1) = 0  (you start at level 1 with 0 XP)
 * totalXpForLevel(2) = 100 (need 100 XP to reach level 2)
 * totalXpForLevel(3) = 100 + floor(100 × 2^1.5) = 100 + 282 = 382
 */
export function totalXpForLevel(level: number): number {
  if (level <= 1) return 0;
  let total = 0;
  for (let l = 1; l < level; l++) {
    total += xpRequiredForLevel(l);
  }
  return total;
}

/**
 * Derive the full level breakdown from a player's total (cumulative) XP.
 *
 * Returns the current level, XP within that level, XP needed for the next
 * level, and a 0–1 progress ratio.
 */
export function getLevelFromTotalXp(totalXp: number): LevelInfo {
  if (totalXp <= 0) {
    return {
      level: 1,
      currentLevelXp: 0,
      xpForNextLevel: xpRequiredForLevel(1),
      progress: 0,
    };
  }

  let level = 1;
  let remaining = totalXp;

  while (true) {
    const required = xpRequiredForLevel(level);
    if (remaining < required) {
      return {
        level,
        currentLevelXp: remaining,
        xpForNextLevel: required,
        progress: required > 0 ? remaining / required : 0,
      };
    }
    remaining -= required;
    level++;
  }
}
