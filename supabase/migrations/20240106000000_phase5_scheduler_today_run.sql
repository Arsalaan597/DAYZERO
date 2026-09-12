-- =========================================================================
-- DAYZERO – Phase 5: Life Scheduler + Today Run Migration
-- =========================================================================
-- 1. Adds timezone to public.profiles.
-- 2. Adds scheduling and classification metadata to public.quests with
--    database-level Main Quest uniqueness and integrity triggers.
-- 3. Creates public.routines for recurring schedule definitions.
-- 4. Creates public.routine_instances with immutable snapshots and RLS.
-- 5. Implements public.ensure_routine_instances() for lazy, bounded generation.
-- 6. Implements public.complete_routine_instance() with 75% XP/Gold reduction.
-- 7. Updates public.complete_quest() for local timezone streak and Main Quest.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. PROFILES TIMEZONE SUPPORT
-- -------------------------------------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'UTC';

-- Allow authenticated users to update their own timezone
GRANT UPDATE (timezone) ON public.profiles TO authenticated;

-- Update handle_new_user trigger to preserve user timezone from metadata if supplied
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, timezone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'Wayfarer'),
    COALESCE(NEW.raw_user_meta_data->>'timezone', 'UTC')
  );

  INSERT INTO public.attributes (user_id)
  VALUES (NEW.id);

  INSERT INTO public.realm_progress (user_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$;

-- -------------------------------------------------------------------------
-- 2. QUESTS SCHEDULER METADATA & INTEGRITY
-- -------------------------------------------------------------------------

ALTER TABLE public.quests
  ADD COLUMN IF NOT EXISTS scheduled_date DATE NULL,
  ADD COLUMN IF NOT EXISTS scheduled_start_time TIME NULL,
  ADD COLUMN IF NOT EXISTS estimated_minutes INTEGER NULL CHECK (estimated_minutes IS NULL OR estimated_minutes > 0),
  ADD COLUMN IF NOT EXISTS effort TEXT NULL CHECK (effort IS NULL OR effort IN ('light', 'standard', 'deep')),
  ADD COLUMN IF NOT EXISTS challenge TEXT NULL CHECK (challenge IS NULL OR challenge IN ('routine', 'challenging', 'hard')),
  ADD COLUMN IF NOT EXISTS is_main_quest BOOLEAN NOT NULL DEFAULT FALSE;

-- Enforce that a Main Quest must have a scheduled_date
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_quest_main_quest_has_date'
  ) THEN
    ALTER TABLE public.quests
      ADD CONSTRAINT check_quest_main_quest_has_date
      CHECK (is_main_quest = FALSE OR scheduled_date IS NOT NULL);
  END IF;
END $$;

-- Database-level uniqueness: only ONE active Main Quest per user per scheduled_date
CREATE UNIQUE INDEX IF NOT EXISTS idx_quests_user_scheduled_date_main_quest
  ON public.quests (user_id, scheduled_date)
  WHERE (is_main_quest = TRUE AND scheduled_date IS NOT NULL);

-- Grant privileges on new quest columns to authenticated users
GRANT INSERT (scheduled_date, scheduled_start_time, estimated_minutes, effort, challenge, is_main_quest) ON public.quests TO authenticated;
GRANT UPDATE (scheduled_date, scheduled_start_time, estimated_minutes, effort, challenge, is_main_quest) ON public.quests TO authenticated;

-- Main Quest integrity trigger: prevent farming and moving completed main quest designations
CREATE OR REPLACE FUNCTION public.check_quest_main_quest_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Rule 4: Completed quests cannot later become Main Quest
  IF TG_OP = 'UPDATE' THEN
    IF OLD.completed = TRUE AND NEW.is_main_quest = TRUE AND OLD.is_main_quest = FALSE THEN
      RAISE EXCEPTION 'Cannot designate an already completed quest as Main Quest';
    END IF;
  END IF;

  -- Rule 6: Once that day''s Main Quest has completed, do not allow another quest on that day to become Main Quest
  IF NEW.is_main_quest = TRUE AND NEW.scheduled_date IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.quests
      WHERE user_id = NEW.user_id
        AND scheduled_date = NEW.scheduled_date
        AND is_main_quest = TRUE
        AND completed = TRUE
        AND (TG_OP = 'INSERT' OR id <> NEW.id)
    ) THEN
      RAISE EXCEPTION 'A Main Quest has already been completed for %', NEW.scheduled_date;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_quest_main_quest_rules ON public.quests;
CREATE TRIGGER trg_check_quest_main_quest_rules
  BEFORE INSERT OR UPDATE OF is_main_quest, scheduled_date ON public.quests
  FOR EACH ROW
  EXECUTE FUNCTION public.check_quest_main_quest_rules();

-- Update enforce_quest_rewards to support the new additive reward model while preserving difficulty fallbacks
CREATE OR REPLACE FUNCTION public.enforce_quest_rewards()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_base_xp integer;
  v_base_gold integer;
  v_bonus_xp integer := 0;
  v_bonus_gold integer := 0;
BEGIN
  IF NEW.effort IS NOT NULL THEN
    -- New Effort model
    IF NEW.effort = 'light' THEN
      v_base_xp := 20;
      v_base_gold := 8;
    ELSIF NEW.effort = 'standard' THEN
      v_base_xp := 40;
      v_base_gold := 15;
    ELSIF NEW.effort = 'deep' THEN
      v_base_xp := 70;
      v_base_gold := 25;
    ELSE
      RAISE EXCEPTION 'Invalid quest effort: %', NEW.effort;
    END IF;

    -- Challenge bonus
    IF NEW.challenge = 'challenging' THEN
      v_bonus_xp := v_bonus_xp + 10;
      v_bonus_gold := v_bonus_gold + 5;
    ELSIF NEW.challenge = 'hard' THEN
      v_bonus_xp := v_bonus_xp + 25;
      v_bonus_gold := v_bonus_gold + 10;
    END IF;
  ELSE
    -- Backward-compatible canonical rewards based strictly on difficulty tier
    IF NEW.difficulty = 'easy' THEN
      v_base_xp := 25;
      v_base_gold := 10;
    ELSIF NEW.difficulty = 'medium' THEN
      v_base_xp := 50;
      v_base_gold := 20;
    ELSIF NEW.difficulty = 'hard' THEN
      v_base_xp := 100;
      v_base_gold := 40;
    ELSE
      RAISE EXCEPTION 'Invalid quest difficulty tier: %', NEW.difficulty;
    END IF;
  END IF;

  -- Additive Main Quest bonus (+20 XP, +10 Gold)
  IF NEW.is_main_quest = TRUE THEN
    v_bonus_xp := v_bonus_xp + 20;
    v_bonus_gold := v_bonus_gold + 10;
  END IF;

  NEW.xp_reward := v_base_xp + v_bonus_xp;
  NEW.gold_reward := v_base_gold + v_bonus_gold;

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
  BEFORE INSERT OR UPDATE OF difficulty, effort, challenge, is_main_quest, xp_reward, gold_reward ON public.quests
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_quest_rewards();

-- -------------------------------------------------------------------------
-- 3. ROUTINES (RECURRING SCHEDULE TEMPLATES)
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  attribute TEXT NOT NULL CHECK (attribute IN ('intellect', 'strength', 'discipline', 'wellness', 'creativity')),
  days_of_week INTEGER[] NOT NULL,
  start_time TIME,
  estimated_minutes INTEGER CHECK (estimated_minutes IS NULL OR estimated_minutes > 0),
  effort TEXT NOT NULL DEFAULT 'standard' CHECK (effort IN ('light', 'standard', 'deep')),
  challenge TEXT NOT NULL DEFAULT 'routine' CHECK (challenge IN ('routine', 'challenging', 'hard')),
  starts_on DATE NOT NULL DEFAULT CURRENT_DATE,
  ends_on DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT check_routines_date_range CHECK (ends_on IS NULL OR ends_on >= starts_on),
  CONSTRAINT check_days_of_week CHECK (days_of_week <@ ARRAY[0,1,2,3,4,5,6] AND array_length(days_of_week, 1) > 0)
);

CREATE TRIGGER routines_updated_at
  BEFORE UPDATE ON public.routines
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own routines"
  ON public.routines FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own routines"
  ON public.routines FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own routines"
  ON public.routines FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own routines"
  ON public.routines FOR DELETE
  USING (auth.uid() = user_id);

REVOKE ALL ON public.routines FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.routines TO authenticated;

-- -------------------------------------------------------------------------
-- 4. ROUTINE INSTANCES (DAILY LEDGER & AUDIT SNAPSHOTS)
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.routine_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id UUID NOT NULL REFERENCES public.routines(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  local_date DATE NOT NULL,
  title_snapshot TEXT NOT NULL,
  attribute_snapshot TEXT NOT NULL CHECK (attribute_snapshot IN ('intellect', 'strength', 'discipline', 'wellness', 'creativity')),
  effort_snapshot TEXT NOT NULL CHECK (effort_snapshot IN ('light', 'standard', 'deep')),
  challenge_snapshot TEXT NOT NULL CHECK (challenge_snapshot IN ('routine', 'challenging', 'hard')),
  scheduled_start_time TIME,
  estimated_minutes_snapshot INTEGER,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'skipped', 'missed')),
  completed_at TIMESTAMPTZ,
  xp_awarded INTEGER NOT NULL DEFAULT 0 CHECK (xp_awarded >= 0),
  gold_awarded INTEGER NOT NULL DEFAULT 0 CHECK (gold_awarded >= 0),
  attribute_awarded INTEGER NOT NULL DEFAULT 0 CHECK (attribute_awarded >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_routine_instance_per_day UNIQUE (routine_id, local_date)
);

ALTER TABLE public.routine_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own routine instances"
  ON public.routine_instances FOR SELECT
  USING (auth.uid() = user_id);

-- Restrict direct client writes: mutations happen solely via trusted RPCs
REVOKE ALL ON public.routine_instances FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.routine_instances TO authenticated;

-- -------------------------------------------------------------------------
-- 5. INDEXES FOR PERFORMANCE
-- -------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_routines_user_active ON public.routines (user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_routine_instances_user_date ON public.routine_instances (user_id, local_date);
CREATE INDEX IF NOT EXISTS idx_quests_user_scheduled ON public.quests (user_id, scheduled_date);

-- -------------------------------------------------------------------------
-- 6. RPC: ENSURE ROUTINE INSTANCES (LAZY, BOUNDED GENERATION)
-- -------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ensure_routine_instances(
  p_start_date DATE,
  p_end_date DATE
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid;
  v_curr_date date;
  v_dow integer;
  v_count integer := 0;
  v_inserted integer := 0;
BEGIN
  -- Authenticate caller
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate bounded range (maximum 14 days)
  IF p_end_date < p_start_date THEN
    RAISE EXCEPTION 'End date cannot be earlier than start date';
  END IF;

  IF (p_end_date - p_start_date) > 14 THEN
    RAISE EXCEPTION 'Routine generation range cannot exceed 14 days';
  END IF;

  -- Generate instances for each active matching routine on each day in range
  FOR v_curr_date IN
    SELECT generate_series(p_start_date, p_end_date, '1 day'::interval)::date
  LOOP
    v_dow := EXTRACT(DOW FROM v_curr_date)::integer;

    WITH ins AS (
      INSERT INTO public.routine_instances (
        routine_id,
        user_id,
        local_date,
        title_snapshot,
        attribute_snapshot,
        effort_snapshot,
        challenge_snapshot,
        scheduled_start_time,
        estimated_minutes_snapshot,
        status
      )
      SELECT
        r.id,
        r.user_id,
        v_curr_date,
        r.title,
        r.attribute,
        r.effort,
        r.challenge,
        r.start_time,
        r.estimated_minutes,
        'scheduled'
      FROM public.routines r
      WHERE r.user_id = v_uid
        AND r.is_active = TRUE
        AND v_curr_date >= r.starts_on
        AND (r.ends_on IS NULL OR v_curr_date <= r.ends_on)
        AND v_dow = ANY(r.days_of_week)
      ON CONFLICT (routine_id, local_date) DO NOTHING
      RETURNING 1
    )
    SELECT count(*) INTO v_inserted FROM ins;
    v_count := v_count + v_inserted;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.ensure_routine_instances(date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_routine_instances(date, date) TO authenticated;

-- -------------------------------------------------------------------------
-- 7. RPC: COMPLETE ROUTINE INSTANCE
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

  -- 5. Date validation: only current local date awards progression in Phase 5
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
  v_attr_awarded := v_base_attr; -- 100% attribute progression preserved

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

  -- 13. Return authoritative payload matching RewardReveal interface
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
    'new_gold', v_new_gold,
    'new_streak', v_new_streak,
    'realm', v_realm_name,
    'previous_realm_level', v_prev_realm_level,
    'new_realm_level', v_new_realm_level,
    'realm_leveled_up', v_realm_leveled_up
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.complete_routine_instance(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_routine_instance(uuid) TO authenticated;

-- -------------------------------------------------------------------------
-- 8. UPDATE COMPLETE_QUEST RPC (LOCAL-DAY STREAK & ADDITIVE REWARDS)
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
    -- Effort base
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

    -- Challenge bonus
    IF v_quest.challenge = 'challenging' THEN
      v_xp_gained := v_xp_gained + 10;
      v_gold_gained := v_gold_gained + 5;
    ELSIF v_quest.challenge = 'hard' THEN
      v_xp_gained := v_xp_gained + 25;
      v_gold_gained := v_gold_gained + 10;
    END IF;
  ELSE
    -- Backward compatible fallback to difficulty
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

  -- 11. Update profile
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
