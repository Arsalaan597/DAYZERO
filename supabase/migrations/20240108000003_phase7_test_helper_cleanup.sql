-- =============================================================================
-- DAYZERO Phase 7 – Test Helper Cleanup
-- Migration: 20240108000003_phase7_test_helper_cleanup.sql
-- =============================================================================
-- Purpose: Remove all temporary diagnostic and test helper functions that were
-- introduced during Phase 7 development. These must not exist in production.
-- =============================================================================

-- Drop the semantic audit helper (created in 20240108000002)
DROP FUNCTION IF EXISTS public.run_chronicle_semantic_audit();

-- Drop any other stray test/diagnostic helpers from Phase 7 repair sessions
DROP FUNCTION IF EXISTS public.test_diag();
DROP FUNCTION IF EXISTS public.test_step_by_step();
DROP FUNCTION IF EXISTS public.test_quests_inspect();

-- Verify no Chronicle Test Auditor users exist (cleanup guard)
-- The audit UUID used in tests was: a0000000-0000-0000-0000-000000000001
-- run_chronicle_semantic_audit() already performs internal cleanup, but we
-- ensure residual rows are purged in case the function exited mid-run.
DELETE FROM public.user_achievements
  WHERE user_id = 'a0000000-0000-0000-0000-000000000001'::uuid;

DELETE FROM public.user_challenge_completions
  WHERE user_id = 'a0000000-0000-0000-0000-000000000001'::uuid;
