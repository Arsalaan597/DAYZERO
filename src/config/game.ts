// ---------------------------------------------------------------------------
// DAYZERO – Game Constants & Configuration
// ---------------------------------------------------------------------------

import type { Attribute, Difficulty, DifficultyConfig, Realm, RealmInfo } from '@/types/game';

// ---------------------------------------------------------------------------
// Attributes
// ---------------------------------------------------------------------------

export const ATTRIBUTES: readonly Attribute[] = [
  'intellect',
  'strength',
  'discipline',
  'wellness',
  'creativity',
] as const;

// ---------------------------------------------------------------------------
// Attribute → Realm mapping
// ---------------------------------------------------------------------------

export const ATTRIBUTE_REALM_MAP: Record<Attribute, Realm> = {
  intellect: 'academy',
  strength: 'wilds',
  discipline: 'forge',
  wellness: 'sanctuary',
  creativity: 'atelier',
};

// ---------------------------------------------------------------------------
// Realm details
// ---------------------------------------------------------------------------

export const REALMS: Record<Realm, RealmInfo> = {
  academy: {
    id: 'academy',
    name: 'The Academy',
    attribute: 'intellect',
    description: 'A silent library of forgotten knowledge, waiting to be read again.',
  },
  wilds: {
    id: 'wilds',
    name: 'The Wilds',
    attribute: 'strength',
    description: 'Overgrown ruins where nature and stone compete for dominion.',
  },
  forge: {
    id: 'forge',
    name: 'The Forge',
    attribute: 'discipline',
    description: 'Cold anvils and dormant furnaces, yearning for the rhythm of craft.',
  },
  sanctuary: {
    id: 'sanctuary',
    name: 'The Sanctuary',
    attribute: 'wellness',
    description: 'A still grove threaded with ancient springs, untouched and waiting.',
  },
  atelier: {
    id: 'atelier',
    name: 'The Atelier',
    attribute: 'creativity',
    description: 'Dust-covered easels and silent instruments in a hall of faded colour.',
  },
};

// ---------------------------------------------------------------------------
// Difficulty → Rewards
// ---------------------------------------------------------------------------

export const DIFFICULTIES: Record<Difficulty, DifficultyConfig> = {
  easy: { label: 'Easy', xp: 25, gold: 10 },
  medium: { label: 'Medium', xp: 50, gold: 20 },
  hard: { label: 'Hard', xp: 100, gold: 40 },
};

// ---------------------------------------------------------------------------
// XP formula constants
// ---------------------------------------------------------------------------

/** Base XP for the formula: XP_required = BASE * level ^ EXPONENT */
export const XP_BASE = 100;

/** Growth exponent for the formula: XP_required = BASE * level ^ EXPONENT */
export const XP_EXPONENT = 1.5;

/** Every player starts at this level. */
export const STARTING_LEVEL = 1;
