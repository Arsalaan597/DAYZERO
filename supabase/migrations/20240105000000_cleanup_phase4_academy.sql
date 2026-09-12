-- =========================================================================
-- DAYZERO — Revert Phase 4 Academy Restoration Experiment
-- =========================================================================

-- 1. Drop the RPC function
DROP FUNCTION IF EXISTS public.restore_landmark(TEXT);

-- 2. Drop the landmark restorations table (cascades policies and constraints)
DROP TABLE IF EXISTS public.landmark_restorations CASCADE;
