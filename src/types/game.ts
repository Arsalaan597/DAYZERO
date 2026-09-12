// ---------------------------------------------------------------------------
// DAYZERO – Core Game Types
// ---------------------------------------------------------------------------

/** The five player attributes that map 1-to-1 with realms. */
export type Attribute =
  | 'intellect'
  | 'strength'
  | 'discipline'
  | 'wellness'
  | 'creativity';

/** The five regions of the dormant world. */
export type Realm =
  | 'academy'
  | 'wilds'
  | 'forge'
  | 'sanctuary'
  | 'atelier';

/** Quest difficulty tiers. */
export type Difficulty = 'easy' | 'medium' | 'hard';

// ---------------------------------------------------------------------------
// Descriptive / UI types
// ---------------------------------------------------------------------------

export interface RealmInfo {
  id: Realm;
  name: string;
  attribute: Attribute;
  description: string;
}

export interface DifficultyConfig {
  label: string;
  xp: number;
  gold: number;
}

// ---------------------------------------------------------------------------
// Player data shapes (mirrors DB but lives in domain layer)
// ---------------------------------------------------------------------------

export interface PlayerProfile {
  id: string;
  displayName: string;
  level: number;
  xp: number;
  gold: number;
  streak: number;
  lastActiveDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlayerAttributes {
  userId: string;
  intellect: number;
  strength: number;
  discipline: number;
  wellness: number;
  creativity: number;
}

export interface RealmProgress {
  userId: string;
  academyLevel: number;
  wildsLevel: number;
  forgeLevel: number;
  sanctuaryLevel: number;
  atelierLevel: number;
}

export interface Quest {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  attribute: Attribute;
  difficulty: Difficulty;
  xpReward: number;
  goldReward: number;
  completed: boolean;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryItem {
  id: string;
  userId: string;
  itemId: string;
  acquiredAt: string;
}

// ---------------------------------------------------------------------------
// XP / Level helpers (return types)
// ---------------------------------------------------------------------------

export interface LevelInfo {
  /** Current level the player has reached. */
  level: number;
  /** XP accumulated within the current level. */
  currentLevelXp: number;
  /** Total XP required to advance from this level to the next. */
  xpForNextLevel: number;
  /** Progress through the current level as a 0-1 ratio. */
  progress: number;
}
