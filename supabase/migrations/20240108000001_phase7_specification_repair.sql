-- ============================================================================
-- DAYZERO Phase 7 Specification Repair Forward Migration
-- Migration: 20240108000001_phase7_specification_repair.sql
--
-- Rectifies canonical achievement thresholds and enforces strict
-- PLANNED_ACTIVITY_COMPLETIONS challenge criteria:
-- 1. First Awakening: ANY_REALM_TIER >= 1 (Realm Tier 1)
-- 2. World Restored: ANY_REALM_TIER >= 3 (Realm Tier 3 - Restored cap)
-- 3. Rhythm Forged: ROUTINE_COMPLETIONS >= 10
-- 4. Deeds Recorded: TOTAL_COMPLETIONS >= 10
-- 5. Path Made Visible: ANY_ATTRIBUTE_VALUE >= 50
-- 6. Challenges check constraint and catalog strictly enforce PLANNED_ACTIVITY_COMPLETIONS
-- 7. evaluate_chronicle & backfill_user_inscriptions updated to guarantee exact semantics
-- ============================================================================

-- -------------------------------------------------------------------------
-- 1. UPDATE CHALLENGES CONSTRAINT & SEED CATALOG
-- -------------------------------------------------------------------------

ALTER TABLE public.challenges
  DROP CONSTRAINT IF EXISTS challenges_criteria_type_check;

ALTER TABLE public.challenges
  ADD CONSTRAINT challenges_criteria_type_check
  CHECK (criteria_type IN (
    'PLANNED_ACTIVITY_COMPLETIONS',
    'ROUTINE_COMPLETIONS',
    'MAIN_QUEST_COMPLETIONS'
  ));

UPDATE public.challenges
SET criteria_type = 'PLANNED_ACTIVITY_COMPLETIONS',
    target_count = 3,
    gold_reward = 8,
    description = 'Complete 3 planned activities (scheduled quests or habits) today.'
WHERE id = 'daily_planned_three';

-- -------------------------------------------------------------------------
-- 2. UPDATE ACHIEVEMENTS SEED CATALOG WITH CANONICAL LOCKED THRESHOLDS
-- -------------------------------------------------------------------------

UPDATE public.achievements
SET target_value = 1,
    description = 'Attain Tier 1 in any Realm Sanctuary.'
WHERE id = 'first_awakening';

UPDATE public.achievements
SET target_value = 3,
    description = 'Attain Tier 3 in any Realm Sanctuary (Fully Restored).'
WHERE id = 'world_restored';

UPDATE public.achievements
SET target_value = 10,
    description = 'Complete 10 routine habit instances.'
WHERE id = 'rhythm_forged';

UPDATE public.achievements
SET target_value = 10,
    description = 'Complete 10 total real-life activities.'
WHERE id = 'deeds_recorded';

UPDATE public.achievements
SET target_value = 50,
    description = 'Reach 50 points in any single attribute.'
WHERE id = 'path_made_visible';

-- Ensure all other 7 achievements have canonical values
UPDATE public.achievements SET target_value = 1 WHERE id = 'the_first_step';
UPDATE public.achievements SET target_value = 1 WHERE id = 'vow_kept';
UPDATE public.achievements SET target_value = 3 WHERE id = 'spark_of_resolve';
UPDATE public.achievements SET target_value = 7 WHERE id = 'blazing_hearth';
UPDATE public.achievements SET target_value = 5 WHERE id = 'ascendant';
UPDATE public.achievements SET target_value = 10 WHERE id = 'wayfarer_unbound';
UPDATE public.achievements SET target_value = 1 WHERE id = 'patron_of_the_vault';

-- -------------------------------------------------------------------------
-- 3. UPDATE EVALUATOR HELPER WITH CANONICAL RULES & ZERO LEAKS
-- -------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.evaluate_chronicle(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_profile record;
  v_tz text;
  v_user_today date;
  v_week_start date;

  v_quest_count integer;
  v_routine_count integer;
  v_total_completions integer;
  v_main_quest_count integer;
  v_max_realm_tier integer;
  v_max_attr integer;
  v_vault_count integer;

  r_ach record;
  v_ach_qualified boolean;
  v_new_ach_id text;
  v_new_achievements jsonb := '[]'::jsonb;

  r_chal record;
  v_chal_progress integer;
  v_period_start date;
  v_new_chal_id text;
  v_completed_challenges jsonb := '[]'::jsonb;
  v_challenge_gold_total integer := 0;
BEGIN
  -- 1. Load user profile for timezone, streak, level, gold
  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'new_achievements', '[]'::jsonb,
      'completed_challenges', '[]'::jsonb,
      'challenge_gold_total', 0
    );
  END IF;

  v_tz := COALESCE(v_profile.timezone, 'UTC');
  BEGIN
    v_user_today := (now() AT TIME ZONE v_tz)::date;
  EXCEPTION WHEN OTHERS THEN
    v_user_today := (now() AT TIME ZONE 'UTC')::date;
  END;

  v_week_start := date_trunc('week', v_user_today::timestamp)::date;

  -- 2. Aggregate player metrics
  SELECT count(*) INTO v_quest_count
  FROM public.quests
  WHERE user_id = p_user_id AND completed = TRUE;

  SELECT count(*) INTO v_routine_count
  FROM public.routine_instances
  WHERE user_id = p_user_id AND status = 'completed';

  v_total_completions := v_quest_count + v_routine_count;

  SELECT count(*) INTO v_main_quest_count
  FROM public.quests
  WHERE user_id = p_user_id AND is_main_quest = TRUE AND completed = TRUE;

  SELECT COALESCE(GREATEST(academy_level, wilds_level, forge_level, sanctuary_level, atelier_level), 0)
  INTO v_max_realm_tier
  FROM public.realm_progress
  WHERE user_id = p_user_id;

  SELECT COALESCE(GREATEST(intellect, strength, discipline, wellness, creativity), 0)
  INTO v_max_attr
  FROM public.attributes
  WHERE user_id = p_user_id;

  SELECT count(*) INTO v_vault_count
  FROM public.inventory
  WHERE user_id = p_user_id AND vault_item_id IS NOT NULL;

  -- 3. Evaluate Active Achievements (Inscriptions)
  FOR r_ach IN
    SELECT * FROM public.achievements
    WHERE is_active = TRUE
    ORDER BY sort_order ASC
  LOOP
    v_ach_qualified := FALSE;

    IF r_ach.criteria_type = 'TOTAL_COMPLETIONS' THEN
      v_ach_qualified := (v_total_completions >= r_ach.target_value);
    ELSIF r_ach.criteria_type = 'MAIN_QUEST_COMPLETIONS' THEN
      v_ach_qualified := (v_main_quest_count >= r_ach.target_value);
    ELSIF r_ach.criteria_type = 'STREAK' THEN
      v_ach_qualified := (v_profile.streak >= r_ach.target_value);
    ELSIF r_ach.criteria_type = 'LEVEL' THEN
      v_ach_qualified := (v_profile.level >= r_ach.target_value);
    ELSIF r_ach.criteria_type = 'ANY_REALM_TIER' THEN
      v_ach_qualified := (v_max_realm_tier >= r_ach.target_value);
    ELSIF r_ach.criteria_type = 'ROUTINE_COMPLETIONS' THEN
      v_ach_qualified := (v_routine_count >= r_ach.target_value);
    ELSIF r_ach.criteria_type = 'ANY_ATTRIBUTE_VALUE' THEN
      v_ach_qualified := (v_max_attr >= r_ach.target_value);
    ELSIF r_ach.criteria_type = 'VAULT_PURCHASES' THEN
      v_ach_qualified := (v_vault_count >= r_ach.target_value);
    END IF;

    IF v_ach_qualified THEN
      INSERT INTO public.user_achievements (user_id, achievement_id, earned_at)
      VALUES (p_user_id, r_ach.id, now())
      ON CONFLICT (user_id, achievement_id) DO NOTHING
      RETURNING achievement_id INTO v_new_ach_id;

      IF v_new_ach_id IS NOT NULL THEN
        v_new_achievements := v_new_achievements || jsonb_build_array(
          jsonb_build_object(
            'id', r_ach.id,
            'title', r_ach.title
          )
        );
      END IF;
    END IF;
  END LOOP;

  -- 4. Evaluate Active Trials (Challenges)
  FOR r_chal IN
    SELECT * FROM public.challenges
    WHERE is_active = TRUE
    ORDER BY sort_order ASC
  LOOP
    IF r_chal.horizon = 'daily' THEN
      v_period_start := v_user_today;
    ELSE
      v_period_start := v_week_start;
    END IF;

    v_chal_progress := 0;

    IF r_chal.criteria_type = 'PLANNED_ACTIVITY_COMPLETIONS' THEN
      -- Strict PLANNED_ACTIVITY_COMPLETIONS:
      -- A. One-off quests scheduled for today and completed
      -- PLUS
      -- B. Routine instances for today and completed
      -- Unscheduled quests (scheduled_date IS NULL) or quests scheduled for other dates DO NOT COUNT!
      SELECT (
        (SELECT count(*) FROM public.quests
         WHERE user_id = p_user_id
           AND scheduled_date IS NOT NULL
           AND scheduled_date = v_user_today
           AND completed = TRUE)
        +
        (SELECT count(*) FROM public.routine_instances
         WHERE user_id = p_user_id
           AND local_date = v_user_today
           AND status = 'completed')
      ) INTO v_chal_progress;

    ELSIF r_chal.criteria_type = 'ROUTINE_COMPLETIONS' THEN
      SELECT count(*) INTO v_chal_progress
      FROM public.routine_instances
      WHERE user_id = p_user_id AND local_date = v_user_today AND status = 'completed';

    ELSIF r_chal.criteria_type = 'MAIN_QUEST_COMPLETIONS' THEN
      SELECT count(*) INTO v_chal_progress
      FROM public.quests
      WHERE user_id = p_user_id
        AND is_main_quest = TRUE
        AND completed = TRUE
        AND scheduled_date >= v_week_start
        AND scheduled_date < v_week_start + 7;
    END IF;

    -- If threshold met, attempt idempotent insertion
    IF v_chal_progress >= r_chal.target_count THEN
      INSERT INTO public.user_challenge_completions (
        user_id, challenge_id, period_start, completed_at, gold_awarded
      )
      VALUES (
        p_user_id, r_chal.id, v_period_start, now(), r_chal.gold_reward
      )
      ON CONFLICT (user_id, challenge_id, period_start) DO NOTHING
      RETURNING challenge_id INTO v_new_chal_id;

      -- Award Trial Gold ONLY when the row was newly inserted
      IF v_new_chal_id IS NOT NULL THEN
        v_challenge_gold_total := v_challenge_gold_total + r_chal.gold_reward;
        v_completed_challenges := v_completed_challenges || jsonb_build_array(
          jsonb_build_object(
            'id', r_chal.id,
            'title', r_chal.title,
            'gold_reward', r_chal.gold_reward,
            'gold_awarded', r_chal.gold_reward
          )
        );
      END IF;
    END IF;
  END LOOP;

  -- 5. Atomically update player gold if any challenges were completed
  IF v_challenge_gold_total > 0 THEN
    UPDATE public.profiles
    SET gold = gold + v_challenge_gold_total,
        updated_at = now()
    WHERE id = p_user_id;
  END IF;

  RETURN jsonb_build_object(
    'new_achievements', v_new_achievements,
    'completed_challenges', v_completed_challenges,
    'challenge_gold_total', v_challenge_gold_total
  );
END;
$$;

REVOKE ALL ON FUNCTION public.evaluate_chronicle(uuid) FROM PUBLIC, anon, authenticated;

-- -------------------------------------------------------------------------
-- 4. UPDATE BACKFILL FUNCTION & RUN RE-BACKFILL
-- -------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.backfill_user_inscriptions(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_profile record;
  v_quest_count integer;
  v_routine_count integer;
  v_total_completions integer;
  v_main_quest_count integer;
  v_max_realm_tier integer;
  v_max_attr integer;
  v_vault_count integer;

  r_ach record;
  v_ach_qualified boolean;
BEGIN
  SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT count(*) INTO v_quest_count FROM public.quests WHERE user_id = p_user_id AND completed = TRUE;
  SELECT count(*) INTO v_routine_count FROM public.routine_instances WHERE user_id = p_user_id AND status = 'completed';
  v_total_completions := v_quest_count + v_routine_count;

  SELECT count(*) INTO v_main_quest_count FROM public.quests WHERE user_id = p_user_id AND is_main_quest = TRUE AND completed = TRUE;
  SELECT COALESCE(GREATEST(academy_level, wilds_level, forge_level, sanctuary_level, atelier_level), 0) INTO v_max_realm_tier FROM public.realm_progress WHERE user_id = p_user_id;
  SELECT COALESCE(GREATEST(intellect, strength, discipline, wellness, creativity), 0) INTO v_max_attr FROM public.attributes WHERE user_id = p_user_id;
  SELECT count(*) INTO v_vault_count FROM public.inventory WHERE user_id = p_user_id AND vault_item_id IS NOT NULL;

  FOR r_ach IN SELECT * FROM public.achievements WHERE is_active = TRUE LOOP
    v_ach_qualified := FALSE;

    IF r_ach.criteria_type = 'TOTAL_COMPLETIONS' THEN
      v_ach_qualified := (v_total_completions >= r_ach.target_value);
    ELSIF r_ach.criteria_type = 'MAIN_QUEST_COMPLETIONS' THEN
      v_ach_qualified := (v_main_quest_count >= r_ach.target_value);
    ELSIF r_ach.criteria_type = 'STREAK' THEN
      v_ach_qualified := (v_profile.streak >= r_ach.target_value);
    ELSIF r_ach.criteria_type = 'LEVEL' THEN
      v_ach_qualified := (v_profile.level >= r_ach.target_value);
    ELSIF r_ach.criteria_type = 'ANY_REALM_TIER' THEN
      v_ach_qualified := (v_max_realm_tier >= r_ach.target_value);
    ELSIF r_ach.criteria_type = 'ROUTINE_COMPLETIONS' THEN
      v_ach_qualified := (v_routine_count >= r_ach.target_value);
    ELSIF r_ach.criteria_type = 'ANY_ATTRIBUTE_VALUE' THEN
      v_ach_qualified := (v_max_attr >= r_ach.target_value);
    ELSIF r_ach.criteria_type = 'VAULT_PURCHASES' THEN
      v_ach_qualified := (v_vault_count >= r_ach.target_value);
    END IF;

    IF v_ach_qualified THEN
      INSERT INTO public.user_achievements (user_id, achievement_id, earned_at)
      VALUES (p_user_id, r_ach.id, now())
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
    END IF;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.backfill_user_inscriptions(uuid) FROM PUBLIC, anon, authenticated;

-- Run safe backfill across all existing users
DO $$
DECLARE
  r_usr RECORD;
BEGIN
  FOR r_usr IN SELECT id FROM public.profiles LOOP
    PERFORM public.backfill_user_inscriptions(r_usr.id);
  END LOOP;
END $$;
