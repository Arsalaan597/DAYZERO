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
  created_at: string;
  updated_at: string;
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
  acquired_at: string;
}
