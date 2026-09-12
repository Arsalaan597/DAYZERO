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

/** Quest difficulty tiers (backward-compatible). */
export type Difficulty = 'easy' | 'medium' | 'hard';

/** Phase 5: Effort tiers */
export type Effort = 'light' | 'standard' | 'deep';

/** Phase 5: Challenge bonus tiers */
export type Challenge = 'routine' | 'challenging' | 'hard';

/** Phase 6: Cosmetic categories */
export type CosmeticCategory = 'mantle' | 'crest' | 'title';

export interface VaultItem {
  id: string;
  itemKey: string;
  name: string;
  description: string | null;
  category: CosmeticCategory;
  priceGold: number;
  visualToken: string;
  minLevel: number | null;
  reqAttribute: Attribute | null;
  reqAttributeValue: number | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface EquippedCosmetic {
  userId: string;
  category: CosmeticCategory;
  vaultItemId: string;
  equippedAt: string;
}

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
  timezone: string;
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
  scheduledDate: string | null;
  scheduledStartTime: string | null;
  estimatedMinutes: number | null;
  effort: Effort | null;
  challenge: Challenge | null;
  isMainQuest: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Routine {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  attribute: Attribute;
  daysOfWeek: number[]; // 0 = Sun, 1 = Mon, ..., 6 = Sat
  startTime: string | null;
  estimatedMinutes: number | null;
  effort: Effort;
  challenge: Challenge;
  startsOn: string;
  endsOn: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RoutineInstance {
  id: string;
  routineId: string;
  userId: string;
  localDate: string;
  titleSnapshot: string;
  attributeSnapshot: Attribute;
  effortSnapshot: Effort;
  challengeSnapshot: Challenge;
  scheduledStartTime: string | null;
  estimatedMinutesSnapshot: number | null;
  status: 'scheduled' | 'completed' | 'skipped' | 'missed';
  completedAt: string | null;
  xpAwarded: number;
  goldAwarded: number;
  attributeAwarded: number;
  createdAt: string;
}

/** Unified Today item normalized for presentation */
export interface TodayActivity {
  id: string;
  type: 'routine' | 'quest';
  title: string;
  description?: string | null;
  attribute: Attribute;
  time: string | null; // e.g. "07:00"
  estimatedMinutes: number | null;
  effort: Effort;
  challenge: Challenge;
  isMainQuest: boolean;
  isCompleted: boolean;
  completedAt: string | null;
  expectedXp: number;
  expectedGold: number;
  sourceInstanceId?: string; // For routines
  sourceQuestId?: string; // For quests
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

// ---------------------------------------------------------------------------
// Phase 7: Chronicle & Trial Types
// ---------------------------------------------------------------------------

export interface ActiveTrial {
  id: string;
  horizon: 'daily' | 'weekly';
  title: string;
  description: string;
  criteriaType: string;
  currentProgress: number;
  targetCount: number;
  isCompleted: boolean;
  goldReward: number;
  sortOrder: number;
}

export interface ChronicleInscription {
  id: string;
  title: string;
  description: string;
  criteriaType: string;
  criteriaKey: string | null;
  targetValue: number;
  sortOrder: number;
  earned: boolean;
  earnedAt: string | null;
}

export interface ChronicleData {
  inscriptions: ChronicleInscription[];
  earnedCount: number;
  totalCount: number;
  latestEarned: { id: string; title: string; earnedAt: string } | null;
}

// ---------------------------------------------------------------------------
// Completion & Action Result Types
// ---------------------------------------------------------------------------

export interface QuestCompletionResult {
  success: boolean;
  questId: string;
  xpGained: number;
  goldGained: number;
  attribute: Attribute;
  attributeGained: number;
  newAttributeValue: number;
  previousLevel: number;
  newLevel: number;
  leveledUp: boolean;
  totalXp: number;
  newGold: number;
  newStreak: number;
  realm: Realm;
  previousRealmLevel: number;
  newRealmLevel: number;
  realmLeveledUp: boolean;
  newAchievements?: Array<{ id: string; title: string }>;
  completedChallenges?: Array<{ id: string; title: string; goldAwarded: number }>;
  challengeGoldTotal?: number;
}


export interface CreateQuestInput {
  title: string;
  description?: string | null;
  attribute: Attribute;
  difficulty?: Difficulty;
  scheduledDate?: string | null;
  scheduledStartTime?: string | null;
  estimatedMinutes?: number | null;
  effort?: Effort | null;
  challenge?: Challenge | null;
  isMainQuest?: boolean;
}

export interface UpdateQuestInput {
  id: string;
  title: string;
  description?: string | null;
  attribute: Attribute;
  difficulty?: Difficulty;
  scheduledDate?: string | null;
  scheduledStartTime?: string | null;
  estimatedMinutes?: number | null;
  effort?: Effort | null;
  challenge?: Challenge | null;
  isMainQuest?: boolean;
}

export interface CreateRoutineInput {
  title: string;
  description?: string | null;
  attribute: Attribute;
  daysOfWeek: number[];
  startTime?: string | null;
  estimatedMinutes?: number | null;
  effort: Effort;
  challenge: Challenge;
  startsOn?: string;
  endsOn?: string | null;
}

export interface UpdateRoutineInput {
  id: string;
  title: string;
  description?: string | null;
  attribute: Attribute;
  daysOfWeek: number[];
  startTime?: string | null;
  estimatedMinutes?: number | null;
  effort: Effort;
  challenge: Challenge;
  startsOn?: string;
  endsOn?: string | null;
  isActive?: boolean;
}
