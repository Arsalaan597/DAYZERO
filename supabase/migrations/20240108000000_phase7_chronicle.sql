-- =========================================================================
-- DAYZERO – Phase 7: Chronicle (Achievements + Challenges) Migration
-- =========================================================================
-- 1. Creates public.achievements catalog table (Inscriptions).
-- 2. Creates public.user_achievements ledger table with RLS & hardening.
-- 3. Creates public.challenges catalog table (Trials).
-- 4. Creates public.user_challenge_completions ledger with period_start date.
-- 5. Seeds exactly 12 commemorative Inscriptions (0 Gold, 0 XP).
-- 6. Seeds exactly 3 Trials (The Daily Three, Steadfast, The Main Path).
-- 7. Implements internal trusted public.evaluate_chronicle(p_user_id uuid).
-- 8. Implements public.backfill_user_inscriptions(p_user_id uuid) & runs backfill.
-- 9. Updates complete_quest, complete_routine_instance, purchase_vault_item.
-- 10. Implements read RPCs: get_active_trials(), get_chronicle_data().
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. ACHIEVEMENTS CATALOG (INSCRIPTIONS)
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.achievements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  criteria_type TEXT NOT NULL CHECK (criteria_type IN (
    'TOTAL_COMPLETIONS',
    'MAIN_QUEST_COMPLETIONS',
    'STREAK',
    'LEVEL',
    'ANY_REALM_TIER',
    'ROUTINE_COMPLETIONS',
    'ANY_ATTRIBUTE_VALUE',
    'VAULT_PURCHASES'
  )),
  criteria_key TEXT NULL,
  target_value INTEGER NOT NULL CHECK (target_value > 0),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -------------------------------------------------------------------------
-- 2. USER ACHIEVEMENTS (EARNED INSCRIPTIONS)
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.user_achievements (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL REFERENCES public.achievements(id) ON DELETE RESTRICT,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON public.user_achievements (user_id);

-- -------------------------------------------------------------------------
-- 3. CHALLENGES CATALOG (TRIALS)
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.challenges (
  id TEXT PRIMARY KEY,
  horizon TEXT NOT NULL CHECK (horizon IN ('daily', 'weekly')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  criteria_type TEXT NOT NULL CHECK (criteria_type IN (
    'PLANNED_ACTIVITY_COMPLETIONS',
    'ROUTINE_COMPLETIONS',
    'MAIN_QUEST_COMPLETIONS'
  )),
  target_count INTEGER NOT NULL CHECK (target_count > 0),
  gold_reward INTEGER NOT NULL DEFAULT 0 CHECK (gold_reward >= 0),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -------------------------------------------------------------------------
-- 4. USER CHALLENGE COMPLETIONS (AUDIT LEDGER)
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.user_challenge_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  challenge_id TEXT NOT NULL REFERENCES public.challenges(id) ON DELETE RESTRICT,
  period_start DATE NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  gold_awarded INTEGER NOT NULL DEFAULT 0 CHECK (gold_awarded >= 0),
  CONSTRAINT uq_user_challenge_period UNIQUE (user_id, challenge_id, period_start)
);

CREATE INDEX IF NOT EXISTS idx_user_challenge_completions_lookup 
  ON public.user_challenge_completions (user_id, period_start);

-- -------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY & PRIVILEGE HARDENING
-- -------------------------------------------------------------------------

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_challenge_completions ENABLE ROW LEVEL SECURITY;

-- Read-only policies for clients
DROP POLICY IF EXISTS "Public read active achievements" ON public.achievements;
CREATE POLICY "Public read active achievements"
  ON public.achievements FOR SELECT
  USING (is_active = TRUE);

DROP POLICY IF EXISTS "Users read own earned achievements" ON public.user_achievements;
CREATE POLICY "Users read own earned achievements"
  ON public.user_achievements FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public read active challenges" ON public.challenges;
CREATE POLICY "Public read active challenges"
  ON public.challenges FOR SELECT
  USING (is_active = TRUE);

DROP POLICY IF EXISTS "Users read own challenge completions" ON public.user_challenge_completions;
CREATE POLICY "Users read own challenge completions"
  ON public.user_challenge_completions FOR SELECT
  USING (auth.uid() = user_id);

-- Strictly revoke all client mutation privileges
REVOKE INSERT, UPDATE, DELETE ON public.achievements FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.user_achievements FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.challenges FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.user_challenge_completions FROM PUBLIC, anon, authenticated;

-- Allow authenticated reads
GRANT SELECT ON public.achievements TO authenticated, anon;
GRANT SELECT ON public.user_achievements TO authenticated;
GRANT SELECT ON public.challenges TO authenticated, anon;
GRANT SELECT ON public.user_challenge_completions TO authenticated;

-- -------------------------------------------------------------------------
-- 6. SEED EXACTLY 12 COMMEMORATIVE INSCRIPTIONS
-- -------------------------------------------------------------------------

INSERT INTO public.achievements (
  id, title, description, criteria_type, criteria_key, target_value, sort_order
) VALUES
  (
    'the_first_step',
    'The First Step',
    'Complete your first quest or routine.',
    'TOTAL_COMPLETIONS', NULL, 1, 10
  ),
  (
    'vow_kept',
    'Vow Kept',
    'Complete your first Main Quest.',
    'MAIN_QUEST_COMPLETIONS', NULL, 1, 20
  ),
  (
    'spark_of_resolve',
    'Spark of Resolve',
    'Reach a 3-day Zeroflame streak.',
    'STREAK', NULL, 3, 30
  ),
  (
    'blazing_hearth',
    'Blazing Hearth',
    'Reach a 7-day Zeroflame streak.',
    'STREAK', NULL, 7, 40
  ),
  (
    'ascendant',
    'Ascendant',
    'Reach Wayfarer Level 5.',
    'LEVEL', NULL, 5, 50
  ),
  (
    'wayfarer_unbound',
    'Wayfarer Unbound',
    'Reach Wayfarer Level 10.',
    'LEVEL', NULL, 10, 60
  ),
  (
    'first_awakening',
    'First Awakening',
    'Attain Tier 1 in any Realm.',
    'ANY_REALM_TIER', NULL, 1, 70
  ),
  (
    'world_restored',
    'World Restored',
    'Attain Tier 3 in any Realm.',
    'ANY_REALM_TIER', NULL, 3, 80
  ),
  (
    'rhythm_forged',
    'Rhythm Forged',
    'Complete 10 routine instances.',
    'ROUTINE_COMPLETIONS', NULL, 10, 90
  ),
  (
    'deeds_recorded',
    'Deeds Recorded',
    'Complete 10 total real activities.',
    'TOTAL_COMPLETIONS', NULL, 10, 100
  ),
  (
    'path_made_visible',
    'Path Made Visible',
    'Reach 50 points in any single attribute.',
    'ANY_ATTRIBUTE_VALUE', NULL, 50, 110
  ),
  (
    'patron_of_the_vault',
    'Patron of the Vault',
    'Acquire your first cosmetic item from the Vault.',
    'VAULT_PURCHASES', NULL, 1, 120
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  criteria_type = EXCLUDED.criteria_type,
  criteria_key = EXCLUDED.criteria_key,
  target_value = EXCLUDED.target_value,
  sort_order = EXCLUDED.sort_order;

-- -------------------------------------------------------------------------
-- 7. SEED EXACTLY 3 LOCKED TRIALS
-- -------------------------------------------------------------------------

INSERT INTO public.challenges (
  id, horizon, title, description, criteria_type, target_count, gold_reward, sort_order
) VALUES
  (
    'daily_planned_three',
    'daily',
    'The Daily Three',
    'Complete 3 planned activities today.',
    'PLANNED_ACTIVITY_COMPLETIONS',
    3,
    8,
    10
  ),
  (
    'daily_steadfast',
    'daily',
    'Steadfast',
    'Complete 1 planned routine today.',
    'ROUTINE_COMPLETIONS',
    1,
    6,
    20
  ),
  (
    'weekly_main_path',
    'weekly',
    'The Main Path',
    'Complete 3 Main Quests during the current local week.',
    'MAIN_QUEST_COMPLETIONS',
    3,
    20,
    30
  )
ON CONFLICT (id) DO UPDATE SET
  horizon = EXCLUDED.horizon,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  criteria_type = EXCLUDED.criteria_type,
  target_count = EXCLUDED.target_count,
  gold_reward = EXCLUDED.gold_reward,
  sort_order = EXCLUDED.sort_order;

-- -------------------------------------------------------------------------
-- 8. INTERNAL EVALUATOR HELPER (TRUSTED SERVER-AUTHORITATIVE)
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

  -- 2. Gather authoritative metrics from persisted state
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
      -- Concurrency-safe, idempotent insert
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
      -- Count completed scheduled quests for that local date + routine instances for that local date
      SELECT (
        (SELECT count(*) FROM public.quests
         WHERE user_id = p_user_id AND scheduled_date = v_user_today AND completed = TRUE)
        +
        (SELECT count(*) FROM public.routine_instances
         WHERE user_id = p_user_id AND local_date = v_user_today AND status = 'completed')
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
            'gold_awarded', r_chal.gold_reward
          )
        );
      END IF;
    END IF;
  END LOOP;

  -- 5. Atomically update profile Gold if Trial Gold was earned
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

-- Security: Revoke all external execution on internal evaluator
REVOKE ALL ON FUNCTION public.evaluate_chronicle(uuid) FROM PUBLIC, anon, authenticated;

-- -------------------------------------------------------------------------
-- 9. RETROACTIVE INCEPTION BACKFILL (IDEMPOTENT, 0 GOLD, 0 XP)
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

-- Run backfill across all existing users
DO $$
DECLARE
  r_usr RECORD;
BEGIN
  FOR r_usr IN SELECT id FROM public.profiles LOOP
    PERFORM public.backfill_user_inscriptions(r_usr.id);
  END LOOP;
END $$;

-- -------------------------------------------------------------------------
-- 10. UPDATE COMPLETE_QUEST RPC (FINAL GOLD ORDERING & CHRONICLE REVEAL)
-- -------------------------------------------------------------------------

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
  v_tz text;
  v_user_today date;

  v_xp_gained integer;
  v_gold_gained integer;
  v_attr_gained integer;

  v_new_total_xp integer;
  v_new_gold integer;
  v_prev_level integer;
  v_new_level integer;
  v_leveled_up boolean;

  v_new_streak integer;

  v_prev_attr_val integer;
  v_new_attr_val integer;
  v_realm_name text;
  v_prev_realm_level integer;
  v_new_realm_level integer;
  v_realm_leveled_up boolean;

  v_chronicle jsonb;
  v_final_gold integer;
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

  -- 7. Calculate authoritative rewards
  IF v_quest.effort IS NOT NULL THEN
    IF v_quest.effort = 'light' THEN
      v_xp_gained := 20;
      v_gold_gained := 8;
      v_attr_gained := 4;
    ELSIF v_quest.effort = 'standard' THEN
      v_xp_gained := 40;
      v_gold_gained := 15;
      v_attr_gained := 8;
    ELSIF v_quest.effort = 'deep' THEN
      v_xp_gained := 70;
      v_gold_gained := 25;
      v_attr_gained := 12;
    ELSE
      v_xp_gained := 40;
      v_gold_gained := 15;
      v_attr_gained := 8;
    END IF;

    IF v_quest.challenge = 'challenging' THEN
      v_xp_gained := v_xp_gained + 10;
      v_gold_gained := v_gold_gained + 5;
    ELSIF v_quest.challenge = 'hard' THEN
      v_xp_gained := v_xp_gained + 25;
      v_gold_gained := v_gold_gained + 10;
    END IF;
  ELSE
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
  END IF;

  -- Additive Main Quest bonus
  IF v_quest.is_main_quest = TRUE THEN
    v_xp_gained := v_xp_gained + 20;
    v_gold_gained := v_gold_gained + 10;
  END IF;

  -- 8. Mark quest as completed
  UPDATE public.quests
  SET completed = TRUE,
      completed_at = now(),
      xp_reward = v_xp_gained,
      gold_reward = v_gold_gained,
      updated_at = now()
  WHERE id = p_quest_id;

  -- 9. Calculate cumulative XP, gold, and level
  v_new_total_xp := v_profile.xp + v_xp_gained;
  v_new_gold := v_profile.gold + v_gold_gained;
  v_prev_level := v_profile.level;
  v_new_level := public.calculate_level(v_new_total_xp);
  v_leveled_up := (v_new_level > v_prev_level);

  -- 10. Update streak (User-local calendar day)
  v_tz := COALESCE(v_profile.timezone, 'UTC');
  BEGIN
    v_user_today := (now() AT TIME ZONE v_tz)::date;
  EXCEPTION WHEN OTHERS THEN
    v_user_today := (now() AT TIME ZONE 'UTC')::date;
  END;

  IF v_profile.last_active_date IS NULL THEN
    v_new_streak := 1;
  ELSIF v_profile.last_active_date = v_user_today THEN
    v_new_streak := v_profile.streak;
  ELSIF v_profile.last_active_date = v_user_today - 1 THEN
    v_new_streak := v_profile.streak + 1;
  ELSE
    v_new_streak := 1;
  END IF;

  -- 11. Update profile with core progression
  UPDATE public.profiles
  SET xp = v_new_total_xp,
      gold = v_new_gold,
      level = v_new_level,
      streak = v_new_streak,
      last_active_date = v_user_today,
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

  -- 14. Evaluate Chronicle (Inscriptions & Trials)
  v_chronicle := public.evaluate_chronicle(v_uid);

  -- 15. Authoritative Final Gold (Includes any Trial Gold awarded)
  SELECT gold INTO v_final_gold
  FROM public.profiles
  WHERE id = v_uid;

  -- 16. Return structured JSON payload with merged Chronicle events
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
    'new_gold', v_final_gold,
    'new_streak', v_new_streak,
    'realm', v_realm_name,
    'previous_realm_level', v_prev_realm_level,
    'new_realm_level', v_new_realm_level,
    'realm_leveled_up', v_realm_leveled_up,
    'new_achievements', COALESCE(v_chronicle->'new_achievements', '[]'::jsonb),
    'completed_challenges', COALESCE(v_chronicle->'completed_challenges', '[]'::jsonb),
    'challenge_gold_total', COALESCE((v_chronicle->>'challenge_gold_total')::integer, 0)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.complete_quest(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_quest(uuid) TO authenticated;

-- -------------------------------------------------------------------------
-- 11. UPDATE COMPLETE_ROUTINE_INSTANCE RPC
-- -------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.complete_routine_instance(p_instance_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid;
  v_inst record;
  v_profile record;
  v_attrs record;
  v_realm record;
  v_tz text;
  v_user_today date;

  v_base_xp integer;
  v_base_gold integer;
  v_base_attr integer;
  v_bonus_xp integer := 0;
  v_bonus_gold integer := 0;
  v_canonical_xp integer;
  v_canonical_gold integer;

  v_xp_awarded integer;
  v_gold_awarded integer;
  v_attr_awarded integer;

  v_new_total_xp integer;
  v_new_gold integer;
  v_prev_level integer;
  v_new_level integer;
  v_leveled_up boolean;
  v_new_streak integer;

  v_prev_attr_val integer;
  v_new_attr_val integer;
  v_realm_name text;
  v_prev_realm_level integer;
  v_new_realm_level integer;
  v_realm_leveled_up boolean;

  v_chronicle jsonb;
  v_final_gold integer;
BEGIN
  -- 1. Authenticate caller
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 2. Fetch & lock routine instance
  SELECT * INTO v_inst
  FROM public.routine_instances
  WHERE id = p_instance_id AND user_id = v_uid
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Routine instance not found or does not belong to user';
  END IF;

  -- 3. Verify status
  IF v_inst.status <> 'scheduled' THEN
    RAISE EXCEPTION 'Routine instance is already completed or not in scheduled status';
  END IF;

  -- 4. Determine user's local date from profiles.timezone
  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = v_uid
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Player profile not found';
  END IF;

  v_tz := COALESCE(v_profile.timezone, 'UTC');
  BEGIN
    v_user_today := (now() AT TIME ZONE v_tz)::date;
  EXCEPTION WHEN OTHERS THEN
    v_user_today := (now() AT TIME ZONE 'UTC')::date;
  END;

  -- 5. Date validation: only current local date awards progression
  IF v_inst.local_date > v_user_today THEN
    RAISE EXCEPTION 'Cannot complete future routine instances';
  END IF;

  IF v_inst.local_date < v_user_today THEN
    RAISE EXCEPTION 'Past routine instances cannot be completed for progression';
  END IF;

  -- 6. Lock attributes & realm progress
  SELECT * INTO v_attrs
  FROM public.attributes
  WHERE user_id = v_uid
  FOR UPDATE;

  SELECT * INTO v_realm
  FROM public.realm_progress
  WHERE user_id = v_uid
  FOR UPDATE;

  -- 7. Calculate canonical rewards from snapshot
  IF v_inst.effort_snapshot = 'light' THEN
    v_base_xp := 20;
    v_base_gold := 8;
    v_base_attr := 4;
  ELSIF v_inst.effort_snapshot = 'standard' THEN
    v_base_xp := 40;
    v_base_gold := 15;
    v_base_attr := 8;
  ELSIF v_inst.effort_snapshot = 'deep' THEN
    v_base_xp := 70;
    v_base_gold := 25;
    v_base_attr := 12;
  ELSE
    v_base_xp := 40;
    v_base_gold := 15;
    v_base_attr := 8;
  END IF;

  IF v_inst.challenge_snapshot = 'challenging' THEN
    v_bonus_xp := 10;
    v_bonus_gold := 5;
  ELSIF v_inst.challenge_snapshot = 'hard' THEN
    v_bonus_xp := 25;
    v_bonus_gold := 10;
  END IF;

  v_canonical_xp := v_base_xp + v_bonus_xp;
  v_canonical_gold := v_base_gold + v_bonus_gold;

  -- Apply 75% routine adjustment with deterministic integer rounding
  v_xp_awarded := ROUND(v_canonical_xp * 0.75)::integer;
  v_gold_awarded := ROUND(v_canonical_gold * 0.75)::integer;
  v_attr_awarded := v_base_attr;

  -- 8. Mark instance completed
  UPDATE public.routine_instances
  SET status = 'completed',
      completed_at = now(),
      xp_awarded = v_xp_awarded,
      gold_awarded = v_gold_awarded,
      attribute_awarded = v_attr_awarded
  WHERE id = p_instance_id;

  -- 9. Update profile progression & level
  v_new_total_xp := v_profile.xp + v_xp_awarded;
  v_new_gold := v_profile.gold + v_gold_awarded;
  v_prev_level := v_profile.level;
  v_new_level := public.calculate_level(v_new_total_xp);
  v_leveled_up := (v_new_level > v_prev_level);

  -- 10. Shared local-day Zeroflame streak calculation
  IF v_profile.last_active_date IS NULL THEN
    v_new_streak := 1;
  ELSIF v_profile.last_active_date = v_user_today THEN
    v_new_streak := v_profile.streak;
  ELSIF v_profile.last_active_date = v_user_today - 1 THEN
    v_new_streak := v_profile.streak + 1;
  ELSE
    v_new_streak := 1;
  END IF;

  UPDATE public.profiles
  SET xp = v_new_total_xp,
      gold = v_new_gold,
      level = v_new_level,
      streak = v_new_streak,
      last_active_date = v_user_today,
      updated_at = now()
  WHERE id = v_uid;

  -- 11. Advance corresponding attribute
  IF v_inst.attribute_snapshot = 'intellect' THEN
    v_prev_attr_val := v_attrs.intellect;
    v_new_attr_val := v_prev_attr_val + v_attr_awarded;
    UPDATE public.attributes SET intellect = v_new_attr_val WHERE user_id = v_uid;
    v_realm_name := 'academy';
    v_prev_realm_level := v_realm.academy_level;
  ELSIF v_inst.attribute_snapshot = 'strength' THEN
    v_prev_attr_val := v_attrs.strength;
    v_new_attr_val := v_prev_attr_val + v_attr_awarded;
    UPDATE public.attributes SET strength = v_new_attr_val WHERE user_id = v_uid;
    v_realm_name := 'wilds';
    v_prev_realm_level := v_realm.wilds_level;
  ELSIF v_inst.attribute_snapshot = 'discipline' THEN
    v_prev_attr_val := v_attrs.discipline;
    v_new_attr_val := v_prev_attr_val + v_attr_awarded;
    UPDATE public.attributes SET discipline = v_new_attr_val WHERE user_id = v_uid;
    v_realm_name := 'forge';
    v_prev_realm_level := v_realm.forge_level;
  ELSIF v_inst.attribute_snapshot = 'wellness' THEN
    v_prev_attr_val := v_attrs.wellness;
    v_new_attr_val := v_prev_attr_val + v_attr_awarded;
    UPDATE public.attributes SET wellness = v_new_attr_val WHERE user_id = v_uid;
    v_realm_name := 'sanctuary';
    v_prev_realm_level := v_realm.sanctuary_level;
  ELSIF v_inst.attribute_snapshot = 'creativity' THEN
    v_prev_attr_val := v_attrs.creativity;
    v_new_attr_val := v_prev_attr_val + v_attr_awarded;
    UPDATE public.attributes SET creativity = v_new_attr_val WHERE user_id = v_uid;
    v_realm_name := 'atelier';
    v_prev_realm_level := v_realm.atelier_level;
  ELSE
    RAISE EXCEPTION 'Invalid attribute: %', v_inst.attribute_snapshot;
  END IF;

  -- 12. Realm progression tier calculation
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

  -- 13. Evaluate Chronicle (Inscriptions & Trials)
  v_chronicle := public.evaluate_chronicle(v_uid);

  -- 14. Authoritative Final Gold
  SELECT gold INTO v_final_gold
  FROM public.profiles
  WHERE id = v_uid;

  -- 15. Return authoritative payload matching RewardReveal interface
  RETURN jsonb_build_object(
    'success', true,
    'quest_id', p_instance_id,
    'xp_gained', v_xp_awarded,
    'gold_gained', v_gold_awarded,
    'attribute', v_inst.attribute_snapshot,
    'attribute_gained', v_attr_awarded,
    'new_attribute_value', v_new_attr_val,
    'previous_level', v_prev_level,
    'new_level', v_new_level,
    'leveled_up', v_leveled_up,
    'total_xp', v_new_total_xp,
    'new_gold', v_final_gold,
    'new_streak', v_new_streak,
    'realm', v_realm_name,
    'previous_realm_level', v_prev_realm_level,
    'new_realm_level', v_new_realm_level,
    'realm_leveled_up', v_realm_leveled_up,
    'new_achievements', COALESCE(v_chronicle->'new_achievements', '[]'::jsonb),
    'completed_challenges', COALESCE(v_chronicle->'completed_challenges', '[]'::jsonb),
    'challenge_gold_total', COALESCE((v_chronicle->>'challenge_gold_total')::integer, 0)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.complete_routine_instance(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_routine_instance(uuid) TO authenticated;

-- -------------------------------------------------------------------------
-- 12. UPDATE PURCHASE_VAULT_ITEM RPC (EVALUATE VAULT INVENTORY FOR PATRON)
-- -------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.purchase_vault_item(p_item_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid;
  v_item record;
  v_profile record;
  v_attrs record;
  v_attr_val integer;
  v_new_gold integer;
  v_inv_id uuid;
  v_chronicle jsonb;
  v_final_gold integer;
BEGIN
  -- 1. Determine & validate auth.uid()
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 2. Lock player profile row
  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = v_uid
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  -- 3. Load vault item
  SELECT * INTO v_item
  FROM public.vault_items
  WHERE id = p_item_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vault item not found';
  END IF;

  IF NOT v_item.is_active THEN
    RAISE EXCEPTION 'Vault item is currently inactive';
  END IF;

  -- 4. Check if already owned in inventory
  IF EXISTS (
    SELECT 1 FROM public.inventory
    WHERE user_id = v_uid AND vault_item_id = p_item_id
  ) THEN
    RAISE EXCEPTION 'Item already owned';
  END IF;

  -- 5. Validate Level requirement
  IF v_item.min_level IS NOT NULL AND v_profile.level < v_item.min_level THEN
    RAISE EXCEPTION 'Level requirement not met (Requires Level %)', v_item.min_level;
  END IF;

  -- 6. Validate Attribute requirement
  IF v_item.req_attribute IS NOT NULL THEN
    SELECT * INTO v_attrs
    FROM public.attributes
    WHERE user_id = v_uid;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Attributes not found';
    END IF;

    IF v_item.req_attribute = 'intellect' THEN
      v_attr_val := v_attrs.intellect;
    ELSIF v_item.req_attribute = 'strength' THEN
      v_attr_val := v_attrs.strength;
    ELSIF v_item.req_attribute = 'discipline' THEN
      v_attr_val := v_attrs.discipline;
    ELSIF v_item.req_attribute = 'wellness' THEN
      v_attr_val := v_attrs.wellness;
    ELSIF v_item.req_attribute = 'creativity' THEN
      v_attr_val := v_attrs.creativity;
    ELSE
      RAISE EXCEPTION 'Unknown attribute requirement: %', v_item.req_attribute;
    END IF;

    IF v_attr_val < v_item.req_attribute_value THEN
      RAISE EXCEPTION '% requirement not met (Requires % %)',
        initcap(v_item.req_attribute), v_item.req_attribute_value, initcap(v_item.req_attribute);
    END IF;
  END IF;

  -- 7. Verify Gold balance
  IF v_profile.gold < v_item.price_gold THEN
    RAISE EXCEPTION 'Insufficient gold (Required: %, Current: %)', v_item.price_gold, v_profile.gold;
  END IF;

  -- 8. Deduct Gold atomically
  v_new_gold := v_profile.gold - v_item.price_gold;
  UPDATE public.profiles
  SET gold = v_new_gold,
      updated_at = now()
  WHERE id = v_uid;

  -- 9. Insert into inventory
  INSERT INTO public.inventory (user_id, item_id, vault_item_id)
  VALUES (v_uid, v_item.item_key, p_item_id)
  RETURNING id INTO v_inv_id;

  -- 10. Evaluate Chronicle (Allows "Patron of the Vault" to unlock)
  v_chronicle := public.evaluate_chronicle(v_uid);

  -- 11. Final Gold
  SELECT gold INTO v_final_gold
  FROM public.profiles
  WHERE id = v_uid;

  -- 12. Return authoritative result
  RETURN jsonb_build_object(
    'success', true,
    'vault_item_id', p_item_id,
    'item_key', v_item.item_key,
    'name', v_item.name,
    'category', v_item.category,
    'price_paid', v_item.price_gold,
    'new_gold', v_final_gold,
    'inventory_id', v_inv_id,
    'new_achievements', COALESCE(v_chronicle->'new_achievements', '[]'::jsonb)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.purchase_vault_item(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.purchase_vault_item(uuid) TO authenticated;

-- -------------------------------------------------------------------------
-- 13. READ RPCS: GET_ACTIVE_TRIALS() & GET_CHRONICLE_DATA()
-- -------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_active_trials()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid;
  v_profile record;
  v_tz text;
  v_user_today date;
  v_week_start date;
  r_chal record;
  v_period_start date;
  v_progress integer;
  v_is_completed boolean;
  v_results jsonb := '[]'::jsonb;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = v_uid;
  v_tz := COALESCE(v_profile.timezone, 'UTC');
  BEGIN
    v_user_today := (now() AT TIME ZONE v_tz)::date;
  EXCEPTION WHEN OTHERS THEN
    v_user_today := (now() AT TIME ZONE 'UTC')::date;
  END;
  v_week_start := date_trunc('week', v_user_today::timestamp)::date;

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

    v_progress := 0;

    IF r_chal.criteria_type = 'PLANNED_ACTIVITY_COMPLETIONS' THEN
      SELECT (
        (SELECT count(*) FROM public.quests
         WHERE user_id = v_uid AND scheduled_date = v_user_today AND completed = TRUE)
        +
        (SELECT count(*) FROM public.routine_instances
         WHERE user_id = v_uid AND local_date = v_user_today AND status = 'completed')
      ) INTO v_progress;
    ELSIF r_chal.criteria_type = 'ROUTINE_COMPLETIONS' THEN
      SELECT count(*) INTO v_progress
      FROM public.routine_instances
      WHERE user_id = v_uid AND local_date = v_user_today AND status = 'completed';
    ELSIF r_chal.criteria_type = 'MAIN_QUEST_COMPLETIONS' THEN
      SELECT count(*) INTO v_progress
      FROM public.quests
      WHERE user_id = v_uid
        AND is_main_quest = TRUE
        AND completed = TRUE
        AND scheduled_date >= v_week_start
        AND scheduled_date < v_week_start + 7;
    END IF;

    -- Check if completion record exists for this period
    SELECT EXISTS (
      SELECT 1 FROM public.user_challenge_completions
      WHERE user_id = v_uid AND challenge_id = r_chal.id AND period_start = v_period_start
    ) INTO v_is_completed;

    v_results := v_results || jsonb_build_array(
      jsonb_build_object(
        'id', r_chal.id,
        'horizon', r_chal.horizon,
        'title', r_chal.title,
        'description', r_chal.description,
        'criteria_type', r_chal.criteria_type,
        'current_progress', LEAST(v_progress, r_chal.target_count),
        'target_count', r_chal.target_count,
        'is_completed', v_is_completed,
        'gold_reward', r_chal.gold_reward,
        'sort_order', r_chal.sort_order
      )
    );
  END LOOP;

  RETURN v_results;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_active_trials() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_active_trials() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_chronicle_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid;
  v_achievements jsonb := '[]'::jsonb;
  v_earned_count integer := 0;
  v_total_count integer := 0;
  v_latest_earned jsonb := NULL;
  r_ach record;
  r_user_ach record;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  FOR r_ach IN
    SELECT * FROM public.achievements
    WHERE is_active = TRUE
    ORDER BY sort_order ASC
  LOOP
    v_total_count := v_total_count + 1;

    SELECT * INTO r_user_ach
    FROM public.user_achievements
    WHERE user_id = v_uid AND achievement_id = r_ach.id;

    IF FOUND THEN
      v_earned_count := v_earned_count + 1;
      v_achievements := v_achievements || jsonb_build_array(
        jsonb_build_object(
          'id', r_ach.id,
          'title', r_ach.title,
          'description', r_ach.description,
          'criteria_type', r_ach.criteria_type,
          'criteria_key', r_ach.criteria_key,
          'target_value', r_ach.target_value,
          'sort_order', r_ach.sort_order,
          'earned', true,
          'earned_at', r_user_ach.earned_at
        )
      );
    ELSE
      v_achievements := v_achievements || jsonb_build_array(
        jsonb_build_object(
          'id', r_ach.id,
          'title', r_ach.title,
          'description', r_ach.description,
          'criteria_type', r_ach.criteria_type,
          'criteria_key', r_ach.criteria_key,
          'target_value', r_ach.target_value,
          'sort_order', r_ach.sort_order,
          'earned', false,
          'earned_at', NULL
        )
      );
    END IF;
  END LOOP;

  -- Find latest earned achievement
  SELECT jsonb_build_object(
    'id', a.id,
    'title', a.title,
    'earned_at', ua.earned_at
  )
  INTO v_latest_earned
  FROM public.user_achievements ua
  JOIN public.achievements a ON a.id = ua.achievement_id
  WHERE ua.user_id = v_uid
  ORDER BY ua.earned_at DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'inscriptions', v_achievements,
    'earned_count', v_earned_count,
    'total_count', v_total_count,
    'latest_earned', v_latest_earned
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_chronicle_data() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_chronicle_data() TO authenticated;
