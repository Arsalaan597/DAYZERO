-- =========================================================================
-- DAYZERO — Phase 4: Academy Restoration Migration
-- =========================================================================

-- Create landmark restorations table
CREATE TABLE public.landmark_restorations (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  landmark_id TEXT NOT NULL,
  restored_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, landmark_id)
);

-- Enable RLS
ALTER TABLE public.landmark_restorations ENABLE ROW LEVEL SECURITY;

-- Authenticated users may SELECT only their own restoration rows
CREATE POLICY "Users can read own restorations"
  ON public.landmark_restorations FOR SELECT
  USING (auth.uid() = user_id);

-- Explicitly block direct client writes on landmark_restorations
-- Only trusted backend logic / SECURITY DEFINER functions can mutate restorations
REVOKE ALL ON TABLE public.landmark_restorations FROM PUBLIC, anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.landmark_restorations FROM authenticated;
GRANT SELECT ON TABLE public.landmark_restorations TO authenticated;

-- Create secure atomic restoration RPC
CREATE OR REPLACE FUNCTION public.restore_landmark(p_landmark_id TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $body$
DECLARE
    v_user_id UUID;
    v_cost INTEGER;
    v_current_gold INTEGER;
    v_already_restored BOOLEAN;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Validate landmark and determine canonical cost
    IF p_landmark_id = 'academy_observatory' THEN
        v_cost := 40;
    ELSE
        RAISE EXCEPTION 'Unknown or unrestorable landmark ID: %', p_landmark_id;
    END IF;

    -- Lock the player's profile row to prevent race conditions and concurrent double-spends
    SELECT gold INTO v_current_gold
    FROM public.profiles
    WHERE id = v_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Profile not found';
    END IF;

    -- Check if already restored
    SELECT EXISTS (
        SELECT 1 FROM public.landmark_restorations
        WHERE user_id = v_user_id AND landmark_id = p_landmark_id
    ) INTO v_already_restored;

    IF v_already_restored THEN
        RAISE EXCEPTION 'Landmark % is already restored', p_landmark_id;
    END IF;

    -- Check if player has enough gold
    IF v_current_gold < v_cost THEN
        RAISE EXCEPTION 'Insufficient gold for %. Requires %, has %', p_landmark_id, v_cost, v_current_gold;
    END IF;

    -- Deduct gold
    UPDATE public.profiles
    SET gold = gold - v_cost,
        updated_at = pg_catalog.now()
    WHERE id = v_user_id;

    -- Insert restoration record
    INSERT INTO public.landmark_restorations (user_id, landmark_id, restored_at)
    VALUES (v_user_id, p_landmark_id, pg_catalog.now());

    -- Return authoritative result
    RETURN pg_catalog.jsonb_build_object(
        'landmark_id', p_landmark_id,
        'cost', v_cost,
        'gold', v_current_gold - v_cost,
        'restored_at', pg_catalog.now(),
        'restored', true
    );
END;
$body$;

-- Function execution security
REVOKE EXECUTE ON FUNCTION public.restore_landmark(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.restore_landmark(TEXT) TO authenticated;
