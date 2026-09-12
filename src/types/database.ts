// ---------------------------------------------------------------------------
// DAYZERO – Database Row Types
// ---------------------------------------------------------------------------
//
// These types mirror the PostgreSQL schema 1-to-1 and use snake_case column
// names so they can be used directly with Supabase query results.
//
// ---------------------------------------------------------------------------

export interface ProfileRow {
  id: string;
  display_name: string;
  level: number;
  xp: number;
  gold: number;
  streak: number;
  last_active_date: string | null;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface QuestRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  attribute: 'intellect' | 'strength' | 'discipline' | 'wellness' | 'creativity';
  difficulty: 'easy' | 'medium' | 'hard';
  xp_reward: number;
  gold_reward: number;
  completed: boolean;
  completed_at: string | null;
  scheduled_date: string | null;
  scheduled_start_time: string | null;
  estimated_minutes: number | null;
  effort: 'light' | 'standard' | 'deep' | null;
  challenge: 'routine' | 'challenging' | 'hard' | null;
  is_main_quest: boolean;
  created_at: string;
  updated_at: string;
}

export interface RoutineRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  attribute: 'intellect' | 'strength' | 'discipline' | 'wellness' | 'creativity';
  days_of_week: number[];
  start_time: string | null;
  estimated_minutes: number | null;
  effort: 'light' | 'standard' | 'deep';
  challenge: 'routine' | 'challenging' | 'hard';
  starts_on: string;
  ends_on: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RoutineInstanceRow {
  id: string;
  routine_id: string;
  user_id: string;
  local_date: string;
  title_snapshot: string;
  attribute_snapshot: 'intellect' | 'strength' | 'discipline' | 'wellness' | 'creativity';
  effort_snapshot: 'light' | 'standard' | 'deep';
  challenge_snapshot: 'routine' | 'challenging' | 'hard';
  scheduled_start_time: string | null;
  estimated_minutes_snapshot: number | null;
  status: 'scheduled' | 'completed' | 'skipped' | 'missed';
  completed_at: string | null;
  xp_awarded: number;
  gold_awarded: number;
  attribute_awarded: number;
  created_at: string;
}

export interface AttributesRow {
  user_id: string;
  intellect: number;
  strength: number;
  discipline: number;
  wellness: number;
  creativity: number;
}

export interface RealmProgressRow {
  user_id: string;
  academy_level: number;
  wilds_level: number;
  forge_level: number;
  sanctuary_level: number;
  atelier_level: number;
}

export interface InventoryRow {
  id: string;
  user_id: string;
  item_id: string;
  vault_item_id: string | null;
  acquired_at: string;
}

export interface VaultItemRow {
  id: string;
  item_key: string;
  name: string;
  description: string | null;
  category: 'mantle' | 'crest' | 'title';
  price_gold: number;
  visual_token: string;
  min_level: number | null;
  req_attribute: 'intellect' | 'strength' | 'discipline' | 'wellness' | 'creativity' | null;
  req_attribute_value: number | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface EquippedCosmeticRow {
  user_id: string;
  category: 'mantle' | 'crest' | 'title';
  vault_item_id: string;
  equipped_at: string;
}

export interface PurchaseVaultItemRpcRow {
  success: boolean;
  vault_item_id: string;
  item_key: string;
  name: string;
  category: 'mantle' | 'crest' | 'title';
  price_paid: number;
  new_gold: number;
  inventory_id: string;
  new_achievements?: Array<{ id: string; title: string }>;
}

export interface EquipVaultItemRpcRow {
  success: boolean;
  category: 'mantle' | 'crest' | 'title';
  vault_item_id: string;
  item_key: string;
  visual_token: string;
  name: string;
}

export interface AchievementRow {
  id: string;
  title: string;
  description: string;
  criteria_type:
    | 'TOTAL_COMPLETIONS'
    | 'MAIN_QUEST_COMPLETIONS'
    | 'STREAK'
    | 'LEVEL'
    | 'ANY_REALM_TIER'
    | 'ROUTINE_COMPLETIONS'
    | 'ANY_ATTRIBUTE_VALUE'
    | 'VAULT_PURCHASES';
  criteria_key: string | null;
  target_value: number;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface UserAchievementRow {
  user_id: string;
  achievement_id: string;
  earned_at: string;
}

export interface ChallengeRow {
  id: string;
  horizon: 'daily' | 'weekly';
  title: string;
  description: string;
  criteria_type:
    | 'PLANNED_ACTIVITY_COMPLETIONS'
    | 'ROUTINE_COMPLETIONS'
    | 'MAIN_QUEST_COMPLETIONS';
  target_count: number;
  gold_reward: number;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface UserChallengeCompletionRow {
  id: string;
  user_id: string;
  challenge_id: string;
  period_start: string;
  completed_at: string;
  gold_awarded: number;
}

export interface ActiveTrialRpcRow {
  id: string;
  horizon: 'daily' | 'weekly';
  title: string;
  description: string;
  criteria_type:
    | 'PLANNED_ACTIVITY_COMPLETIONS'
    | 'ROUTINE_COMPLETIONS'
    | 'MAIN_QUEST_COMPLETIONS';
  current_progress: number;
  target_count: number;
  is_completed: boolean;
  gold_reward: number;
  sort_order: number;
}

export interface ChronicleInscriptionItem {
  id: string;
  title: string;
  description: string;
  criteria_type: string;
  criteria_key: string | null;
  target_value: number;
  sort_order: number;
  earned: boolean;
  earned_at: string | null;
}

export interface ChronicleDataRpcRow {
  inscriptions: ChronicleInscriptionItem[];
  earned_count: number;
  total_count: number;
  latest_earned: { id: string; title: string; earned_at: string } | null;
}

export interface CompleteQuestRpcRow {
  success: boolean;
  quest_id: string;
  xp_gained: number;
  gold_gained: number;
  attribute: 'intellect' | 'strength' | 'discipline' | 'wellness' | 'creativity';
  attribute_gained: number;
  new_attribute_value: number;
  previous_level: number;
  new_level: number;
  leveled_up: boolean;
  total_xp: number;
  new_gold: number;
  new_streak: number;
  realm: 'academy' | 'wilds' | 'forge' | 'sanctuary' | 'atelier';
  previous_realm_level: number;
  new_realm_level: number;
  realm_leveled_up: boolean;
  new_achievements?: Array<{ id: string; title: string }>;
  completed_challenges?: Array<{ id: string; title: string; gold_awarded?: number; gold_reward?: number }>;
  challenge_gold_total?: number;
}


