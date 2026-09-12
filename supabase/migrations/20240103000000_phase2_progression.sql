-- =========================================================================
-- DAYZERO – Phase 2: Quests & Progression Migration
-- =========================================================================
-- 1. Hardens quest write privileges using an allow-list privilege model.
-- 2. Creates the authoritative public.calculate_level(total_xp) function.
-- 3. Implements the atomic public.complete_quest(p_quest_id) RPC.
-- 4. Secures RPC and helper function execution permissions.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. QUEST WRITE PRIVILEGES (ALLOW-LIST SECURITY)
-- -------------------------------------------------------------------------
-- Authenticated users may only INSERT/UPDATE safe quest fields.
-- completed, completed_at, xp_reward, and gold_reward CANNOT be written
-- directly by clients or server actions.

REVOKE INSERT, UPDATE ON public.quests FROM authenticated, anon;
GRANT INSERT (user_id, title, description, attribute, difficulty) ON public.quests TO authenticated;
GRANT UPDATE (title, description, attribute, difficulty) ON public.quests TO authenticated;
GRANT DELETE ON public.quests TO authenticated;

-- Ensure defaults on quests table are guaranteed
ALTER TABLE public.quests ALTER COLUMN completed SET DEFAULT FALSE;
ALTER TABLE public.quests ALTER COLUMN completed_at SET DEFAULT NULL;

-- Trigger to strictly maintain canonical rewards & enforce clean insertion
CREATE OR REPLACE FUNCTION public.enforce_quest_rewards()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Canonical rewards based strictly on difficulty tier
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
    RAISE EXCEPTION 'Invalid quest difficulty tier: %', NEW.difficulty;
  END IF;

  -- Ensure new quests are never created as completed
  IF TG_OP = 'INSERT' THEN
    NEW.completed := FALSE;
    NEW.completed_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_quest_rewards ON public.quests;

CREATE TRIGGER trg_enforce_quest_rewards
  BEFORE INSERT OR UPDATE OF difficulty, xp_reward, gold_reward ON public.quests
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_quest_rewards();

-- -------------------------------------------------------------------------
-- 2. AUTHORITATIVE LEVEL CALCULATION FUNCTION
-- -------------------------------------------------------------------------
-- Formula: required XP for next level = floor(100 * level^1.5)
-- cumulative total XP starting from Level 1 with 0 XP.

CREATE OR REPLACE FUNCTION public.calculate_level(total_xp integer)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_level integer := 1;
  v_remaining integer := total_xp;
  v_required integer;
BEGIN
  IF total_xp IS NULL OR total_xp <= 0 THEN
    RETURN 1;
  END IF;

  LOOP
    v_required := floor(100.0 * (v_level::numeric ^ 1.5))::integer;
    IF v_remaining < v_required THEN
      RETURN v_level;
    END IF;
    v_remaining := v_remaining - v_required;
    v_level := v_level + 1;
  END LOOP;
END;
$$;

-- -------------------------------------------------------------------------
-- 3. COMPLETE QUEST RPC
-- -------------------------------------------------------------------------
-- Atomically validates ownership, awards XP/gold, progresses attributes,
-- recalculates level, updates streak, advances realm, and returns payload.

CREATE OR REPLACE FUNCTION public.complete_quest(p_quest_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid;
  v_quest record;
  v_profile record;
  v_attrs record;
  v_realm record;

  v_xp_gained integer;
  v_gold_gained integer;
  v_attr_gained integer;

  v_new_total_xp integer;
  v_new_gold integer;
  v_prev_level integer;
  v_new_level integer;
  v_leveled_up boolean;

  v_today date;
  v_new_streak integer;

  v_prev_attr_val integer;
  v_new_attr_val integer;
  v_realm_name text;
  v_prev_realm_level integer;
  v_new_realm_level integer;
  v_realm_leveled_up boolean;
BEGIN
  -- 1. Authenticate caller
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 2. Fetch & lock quest
  SELECT * INTO v_quest
  FROM public.quests
  WHERE id = p_quest_id AND user_id = v_uid
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quest not found or does not belong to user';
  END IF;

  -- 3. Reject already completed
  IF v_quest.completed THEN
    RAISE EXCEPTION 'Quest is already completed';
  END IF;

  -- 4. Lock player profile
  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = v_uid
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Player profile not found';
  END IF;

  -- 5. Lock attributes
  SELECT * INTO v_attrs
  FROM public.attributes
  WHERE user_id = v_uid
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Player attributes not found';
  END IF;

  -- 6. Lock realm progress
  SELECT * INTO v_realm
  FROM public.realm_progress
  WHERE user_id = v_uid
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Player realm progress not found';
  END IF;

  -- 7. Determine canonical rewards from difficulty
  IF v_quest.difficulty = 'easy' THEN
    v_xp_gained := 25;
    v_gold_gained := 10;
    v_attr_gained := 5;
  ELSIF v_quest.difficulty = 'medium' THEN
    v_xp_gained := 50;
    v_gold_gained := 20;
    v_attr_gained := 10;
  ELSIF v_quest.difficulty = 'hard' THEN
    v_xp_gained := 100;
    v_gold_gained := 40;
    v_attr_gained := 20;
  ELSE
    RAISE EXCEPTION 'Invalid quest difficulty: %', v_quest.difficulty;
  END IF;

  -- 8. Mark quest as completed
  UPDATE public.quests
  SET completed = TRUE,
      completed_at = now(),
      updated_at = now()
  WHERE id = p_quest_id;

  -- 9. Calculate cumulative XP, gold, and level
  v_new_total_xp := v_profile.xp + v_xp_gained;
  v_new_gold := v_profile.gold + v_gold_gained;
  v_prev_level := v_profile.level;
  v_new_level := public.calculate_level(v_new_total_xp);
  v_leveled_up := (v_new_level > v_prev_level);

  -- 10. Update streak (UTC calendar day)
  v_today := (now() AT TIME ZONE 'UTC')::date;
  IF v_profile.last_active_date IS NULL THEN
    v_new_streak := 1;
  ELSIF v_profile.last_active_date = v_today THEN
    v_new_streak := v_profile.streak;
  ELSIF v_profile.last_active_date = v_today - 1 THEN
    v_new_streak := v_profile.streak + 1;
  ELSE
    v_new_streak := 1;
  END IF;

  -- 11. Update profile
  UPDATE public.profiles
  SET xp = v_new_total_xp,
      gold = v_new_gold,
      level = v_new_level,
      streak = v_new_streak,
      last_active_date = v_today,
      updated_at = now()
  WHERE id = v_uid;

  -- 12. Increase corresponding attribute
  IF v_quest.attribute = 'intellect' THEN
    v_prev_attr_val := v_attrs.intellect;
    v_new_attr_val := v_prev_attr_val + v_attr_gained;
    UPDATE public.attributes SET intellect = v_new_attr_val WHERE user_id = v_uid;
    v_realm_name := 'academy';
    v_prev_realm_level := v_realm.academy_level;
  ELSIF v_quest.attribute = 'strength' THEN
    v_prev_attr_val := v_attrs.strength;
    v_new_attr_val := v_prev_attr_val + v_attr_gained;
    UPDATE public.attributes SET strength = v_new_attr_val WHERE user_id = v_uid;
    v_realm_name := 'wilds';
    v_prev_realm_level := v_realm.wilds_level;
  ELSIF v_quest.attribute = 'discipline' THEN
    v_prev_attr_val := v_attrs.discipline;
    v_new_attr_val := v_prev_attr_val + v_attr_gained;
    UPDATE public.attributes SET discipline = v_new_attr_val WHERE user_id = v_uid;
    v_realm_name := 'forge';
    v_prev_realm_level := v_realm.forge_level;
  ELSIF v_quest.attribute = 'wellness' THEN
    v_prev_attr_val := v_attrs.wellness;
    v_new_attr_val := v_prev_attr_val + v_attr_gained;
    UPDATE public.attributes SET wellness = v_new_attr_val WHERE user_id = v_uid;
    v_realm_name := 'sanctuary';
    v_prev_realm_level := v_realm.sanctuary_level;
  ELSIF v_quest.attribute = 'creativity' THEN
    v_prev_attr_val := v_attrs.creativity;
    v_new_attr_val := v_prev_attr_val + v_attr_gained;
    UPDATE public.attributes SET creativity = v_new_attr_val WHERE user_id = v_uid;
    v_realm_name := 'atelier';
    v_prev_realm_level := v_realm.atelier_level;
  ELSE
    RAISE EXCEPTION 'Invalid quest attribute: %', v_quest.attribute;
  END IF;

  -- 13. Calculate and update Realm progression
  -- Thresholds: 0-24 (Level 0), 25-74 (Level 1), 75-149 (Level 2), 150+ (Level 3)
  IF v_new_attr_val >= 150 THEN
    v_new_realm_level := 3;
  ELSIF v_new_attr_val >= 75 THEN
    v_new_realm_level := 2;
  ELSIF v_new_attr_val >= 25 THEN
    v_new_realm_level := 1;
  ELSE
    v_new_realm_level := 0;
  END IF;

  v_realm_leveled_up := (v_new_realm_level > v_prev_realm_level);

  IF v_realm_name = 'academy' THEN
    UPDATE public.realm_progress SET academy_level = v_new_realm_level WHERE user_id = v_uid;
  ELSIF v_realm_name = 'wilds' THEN
    UPDATE public.realm_progress SET wilds_level = v_new_realm_level WHERE user_id = v_uid;
  ELSIF v_realm_name = 'forge' THEN
    UPDATE public.realm_progress SET forge_level = v_new_realm_level WHERE user_id = v_uid;
  ELSIF v_realm_name = 'sanctuary' THEN
    UPDATE public.realm_progress SET sanctuary_level = v_new_realm_level WHERE user_id = v_uid;
  ELSIF v_realm_name = 'atelier' THEN
    UPDATE public.realm_progress SET atelier_level = v_new_realm_level WHERE user_id = v_uid;
  END IF;

  -- 14. Return structured JSON payload
  RETURN jsonb_build_object(
    'success', true,
    'quest_id', p_quest_id,
    'xp_gained', v_xp_gained,
    'gold_gained', v_gold_gained,
    'attribute', v_quest.attribute,
    'attribute_gained', v_attr_gained,
    'new_attribute_value', v_new_attr_val,
    'previous_level', v_prev_level,
    'new_level', v_new_level,
    'leveled_up', v_leveled_up,
    'total_xp', v_new_total_xp,
    'new_gold', v_new_gold,
    'new_streak', v_new_streak,
    'realm', v_realm_name,
    'previous_realm_level', v_prev_realm_level,
    'new_realm_level', v_new_realm_level,
    'realm_leveled_up', v_realm_leveled_up
  );
END;
$$;

-- -------------------------------------------------------------------------
-- 4. FUNCTION EXECUTION SECURITY
-- -------------------------------------------------------------------------
-- Only authenticated users may invoke the completion RPC and level calculation

REVOKE EXECUTE ON FUNCTION public.complete_quest(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_quest(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.calculate_level(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.calculate_level(integer) TO authenticated;
