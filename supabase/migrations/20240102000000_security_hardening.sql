-- =========================================================================
-- DAYZERO – Phase 1.1 Security Hardening Migration
-- =========================================================================
-- 1. Restricts client writes on progression tables (profiles, attributes,
--    realm_progress, inventory).
-- 2. Enforces server-side quest reward calculation on quests table.
-- 3. Ensures clients cannot freely insert arbitrary inventory items.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. PROFILES SECURITY
-- -------------------------------------------------------------------------
-- Revoke arbitrary client insert and update.
-- Clients may only update display_name; level, xp, gold, streak,
-- and last_active_date cannot be written directly from the client.

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Allow users to update ONLY their own display_name
CREATE POLICY "Users can update own profile display_name"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Restrict column privileges: revoke general UPDATE/INSERT and only GRANT UPDATE on display_name
REVOKE INSERT, UPDATE ON public.profiles FROM authenticated, anon;
GRANT UPDATE (display_name) ON public.profiles TO authenticated;

-- -------------------------------------------------------------------------
-- 2. ATTRIBUTES SECURITY
-- -------------------------------------------------------------------------
-- Progression attributes (intellect, strength, discipline, wellness, creativity)
-- must only be updated by trusted backend logic / SECURITY DEFINER functions.

DROP POLICY IF EXISTS "Users can insert own attributes" ON public.attributes;
DROP POLICY IF EXISTS "Users can update own attributes" ON public.attributes;

REVOKE INSERT, UPDATE, DELETE ON public.attributes FROM authenticated, anon;

-- -------------------------------------------------------------------------
-- 3. REALM PROGRESS SECURITY
-- -------------------------------------------------------------------------
-- Realm progress levels must only be advanced through verified game progression.

DROP POLICY IF EXISTS "Users can insert own realm progress" ON public.realm_progress;
DROP POLICY IF EXISTS "Users can update own realm progress" ON public.realm_progress;

REVOKE INSERT, UPDATE, DELETE ON public.realm_progress FROM authenticated, anon;

-- -------------------------------------------------------------------------
-- 4. INVENTORY SECURITY
-- -------------------------------------------------------------------------
-- Remove policy allowing users to directly insert items into inventory.
-- Users may only READ their own inventory.

DROP POLICY IF EXISTS "Users can insert own inventory" ON public.inventory;
DROP POLICY IF EXISTS "Users can delete own inventory" ON public.inventory;

REVOKE INSERT, UPDATE, DELETE ON public.inventory FROM authenticated, anon;

-- -------------------------------------------------------------------------
-- 5. QUEST REWARD SECURITY
-- -------------------------------------------------------------------------
-- Enforce canonical rewards based on difficulty tier:
--   easy:   25 XP, 10 gold
--   medium: 50 XP, 20 gold
--   hard:  100 XP, 40 gold
-- Overwrites client-supplied xp_reward or gold_reward on write.

CREATE OR REPLACE FUNCTION public.enforce_quest_rewards()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.difficulty = 'easy' THEN
    NEW.xp_reward := 25;
    NEW.gold_reward := 10;
  ELSIF NEW.difficulty = 'medium' THEN
    NEW.xp_reward := 50;
    NEW.gold_reward := 20;
  ELSIF NEW.difficulty = 'hard' THEN
    NEW.xp_reward := 100;
    NEW.gold_reward := 40;
  ELSE
    RAISE EXCEPTION 'Invalid quest difficulty: %', NEW.difficulty;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_quest_rewards ON public.quests;

CREATE TRIGGER trg_enforce_quest_rewards
  BEFORE INSERT OR UPDATE OF difficulty, xp_reward, gold_reward ON public.quests
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_quest_rewards();
