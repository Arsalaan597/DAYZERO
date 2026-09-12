-- =========================================================================
-- DAYZERO – Initial Schema Migration
-- =========================================================================
-- Creates the core game tables, constraints, RLS policies, and the
-- auto-profile trigger that fires on new user signup.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. PROFILES
-- -------------------------------------------------------------------------

CREATE TABLE public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT 'Wayfarer',
  level       INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1),
  xp          INTEGER NOT NULL DEFAULT 0 CHECK (xp >= 0),
  gold        INTEGER NOT NULL DEFAULT 0 CHECK (gold >= 0),
  streak      INTEGER NOT NULL DEFAULT 0 CHECK (streak >= 0),
  last_active_date DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- -------------------------------------------------------------------------
-- 2. QUESTS
-- -------------------------------------------------------------------------

CREATE TABLE public.quests (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT,
  attribute    TEXT NOT NULL CHECK (attribute IN ('intellect', 'strength', 'discipline', 'wellness', 'creativity')),
  difficulty   TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  xp_reward    INTEGER NOT NULL DEFAULT 0 CHECK (xp_reward >= 0),
  gold_reward  INTEGER NOT NULL DEFAULT 0 CHECK (gold_reward >= 0),
  completed    BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.quests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own quests"
  ON public.quests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quests"
  ON public.quests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own quests"
  ON public.quests FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own quests"
  ON public.quests FOR DELETE
  USING (auth.uid() = user_id);

-- -------------------------------------------------------------------------
-- 3. ATTRIBUTES
-- -------------------------------------------------------------------------

CREATE TABLE public.attributes (
  user_id     UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  intellect   INTEGER NOT NULL DEFAULT 0 CHECK (intellect >= 0),
  strength    INTEGER NOT NULL DEFAULT 0 CHECK (strength >= 0),
  discipline  INTEGER NOT NULL DEFAULT 0 CHECK (discipline >= 0),
  wellness    INTEGER NOT NULL DEFAULT 0 CHECK (wellness >= 0),
  creativity  INTEGER NOT NULL DEFAULT 0 CHECK (creativity >= 0)
);

ALTER TABLE public.attributes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own attributes"
  ON public.attributes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own attributes"
  ON public.attributes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own attributes"
  ON public.attributes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- -------------------------------------------------------------------------
-- 4. REALM PROGRESS
-- -------------------------------------------------------------------------

CREATE TABLE public.realm_progress (
  user_id          UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  academy_level    INTEGER NOT NULL DEFAULT 0 CHECK (academy_level >= 0),
  wilds_level      INTEGER NOT NULL DEFAULT 0 CHECK (wilds_level >= 0),
  forge_level      INTEGER NOT NULL DEFAULT 0 CHECK (forge_level >= 0),
  sanctuary_level  INTEGER NOT NULL DEFAULT 0 CHECK (sanctuary_level >= 0),
  atelier_level    INTEGER NOT NULL DEFAULT 0 CHECK (atelier_level >= 0)
);

ALTER TABLE public.realm_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own realm progress"
  ON public.realm_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own realm progress"
  ON public.realm_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own realm progress"
  ON public.realm_progress FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- -------------------------------------------------------------------------
-- 5. INVENTORY
-- -------------------------------------------------------------------------

CREATE TABLE public.inventory (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  item_id     TEXT NOT NULL,
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own inventory"
  ON public.inventory FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own inventory"
  ON public.inventory FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own inventory"
  ON public.inventory FOR DELETE
  USING (auth.uid() = user_id);

-- -------------------------------------------------------------------------
-- 6. AUTO-CREATE PROFILE ON SIGNUP
-- -------------------------------------------------------------------------
-- When a new user signs up via Supabase Auth, automatically create their
-- profile, attributes, and realm_progress rows so the game is ready.
-- -------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'Wayfarer')
  );

  INSERT INTO public.attributes (user_id)
  VALUES (NEW.id);

  INSERT INTO public.realm_progress (user_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- -------------------------------------------------------------------------
-- 7. UPDATED_AT TRIGGER
-- -------------------------------------------------------------------------
-- Automatically bump `updated_at` on profiles and quests whenever a row
-- is modified.
-- -------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER quests_updated_at
  BEFORE UPDATE ON public.quests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
