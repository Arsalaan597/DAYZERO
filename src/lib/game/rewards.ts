// ---------------------------------------------------------------------------
// DAYZERO – Reward Helpers
// ---------------------------------------------------------------------------

import { DIFFICULTIES } from '@/config/game';
import type { Difficulty } from '@/types/game';

/**
 * Look up the XP and gold reward for a given difficulty tier.
 */
export function getRewards(difficulty: Difficulty) {
  return {
    xp: DIFFICULTIES[difficulty].xp,
    gold: DIFFICULTIES[difficulty].gold,
  };
}
