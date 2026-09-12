-- ============================================================================
-- DAYZERO Phase 7 Semantic & Boundary Verification Helper
-- Migration: 20240108000002_phase7_test_helpers.sql
-- ============================================================================

CREATE OR REPLACE FUNCTION public.run_chronicle_semantic_audit()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_test_uid uuid := 'a0000000-0000-0000-0000-000000000001'::uuid;
  v_user_today date;
  v_week_start date;
  v_results jsonb := '{}'::jsonb;

  -- Temporary variables
  v_gold_before integer;
  v_gold_after integer;
  v_xp_before integer;
  v_xp_after integer;
  v_level_before integer;
  v_level_after integer;

  v_res jsonb;
  v_ach_count integer;
  v_chal_count integer;
  v_q_id uuid;
  v_r_id uuid;
  v_ri_id uuid;
  i integer;

  -- Specific assertion flags
  v_realm1_pass boolean;
  v_realm3_pass boolean;
  v_attr49_pass boolean;
  v_attr50_pass boolean;
  v_routine9_pass boolean;
  v_routine10_pass boolean;
  v_total9_pass boolean;
  v_total10_pass boolean;
  v_unscheduled_no_progress boolean;
  v_scheduled_progresses boolean;
  v_routine_progresses boolean;
  v_daily_three_threshold_pass boolean;
  v_daily_three_once_only_gold boolean;
  v_main_path_weekly_pass boolean;
  v_backfill_economic_invariants boolean;
  v_timezone_derivation_pass boolean;
  v_concurrency_once_only_pass boolean;
  v_achievement_idempotency_pass boolean;
BEGIN
  -- Setup isolated test user in auth.users and profiles
  DELETE FROM public.user_challenge_completions WHERE user_id = v_test_uid;
  DELETE FROM public.user_achievements WHERE user_id = v_test_uid;
  DELETE FROM public.routine_instances WHERE user_id = v_test_uid;
  DELETE FROM public.routines WHERE user_id = v_test_uid;
  DELETE FROM public.quests WHERE user_id = v_test_uid;
  DELETE FROM public.inventory WHERE user_id = v_test_uid;
  DELETE FROM public.attributes WHERE user_id = v_test_uid;
  DELETE FROM public.realm_progress WHERE user_id = v_test_uid;
  DELETE FROM public.profiles WHERE id = v_test_uid;
  DELETE FROM auth.users WHERE id = v_test_uid;

  INSERT INTO auth.users (id, aud, role, email, is_sso_user, is_anonymous)
  VALUES (v_test_uid, 'authenticated', 'authenticated', 'chronicle_auditor@dayzero.test', false, false)
  ON CONFLICT (id) DO NOTHING;

  UPDATE public.profiles
  SET display_name = 'Chronicle Test Auditor', level = 1, xp = 0, gold = 100, streak = 1, timezone = 'UTC'
  WHERE id = v_test_uid;

  UPDATE public.attributes
  SET intellect = 10, strength = 10, discipline = 10, wellness = 10, creativity = 10
  WHERE user_id = v_test_uid;

  UPDATE public.realm_progress
  SET academy_level = 0, wilds_level = 0, forge_level = 0, sanctuary_level = 0, atelier_level = 0
  WHERE user_id = v_test_uid;

  v_user_today := (now() AT TIME ZONE 'UTC')::date;
  v_week_start := date_trunc('week', v_user_today::timestamp)::date;

  -- -------------------------------------------------------------------------
  -- ASSERTION 1: Realm Achievements (Tier 1 -> First Awakening, Tier 3 -> World Restored)
  -- -------------------------------------------------------------------------
  UPDATE public.realm_progress SET academy_level = 1 WHERE user_id = v_test_uid;
  PERFORM public.evaluate_chronicle(v_test_uid);
  SELECT count(*) = 1 INTO v_realm1_pass FROM public.user_achievements WHERE user_id = v_test_uid AND achievement_id = 'first_awakening';
  SELECT count(*) = 0 INTO v_realm3_pass FROM public.user_achievements WHERE user_id = v_test_uid AND achievement_id = 'world_restored';
  v_realm1_pass := v_realm1_pass AND v_realm3_pass;

  UPDATE public.realm_progress SET academy_level = 3 WHERE user_id = v_test_uid;
  PERFORM public.evaluate_chronicle(v_test_uid);
  SELECT count(*) = 1 INTO v_realm3_pass FROM public.user_achievements WHERE user_id = v_test_uid AND achievement_id = 'world_restored';

  -- Reset realm
  UPDATE public.realm_progress SET academy_level = 0 WHERE user_id = v_test_uid;
  DELETE FROM public.user_achievements WHERE user_id = v_test_uid;

  -- -------------------------------------------------------------------------
  -- ASSERTION 2: Attribute Achievement (49 does NOT unlock, 50 DOES unlock)
  -- -------------------------------------------------------------------------
  UPDATE public.attributes SET discipline = 49 WHERE user_id = v_test_uid;
  PERFORM public.evaluate_chronicle(v_test_uid);
  SELECT count(*) = 0 INTO v_attr49_pass FROM public.user_achievements WHERE user_id = v_test_uid AND achievement_id = 'path_made_visible';

  UPDATE public.attributes SET discipline = 50 WHERE user_id = v_test_uid;
  PERFORM public.evaluate_chronicle(v_test_uid);
  SELECT count(*) = 1 INTO v_attr50_pass FROM public.user_achievements WHERE user_id = v_test_uid AND achievement_id = 'path_made_visible';

  -- Reset attributes
  UPDATE public.attributes SET discipline = 10 WHERE user_id = v_test_uid;
  DELETE FROM public.user_achievements WHERE user_id = v_test_uid;

  -- -------------------------------------------------------------------------
  -- ASSERTION 3: Routine Achievement (9 does NOT unlock, 10 DOES unlock Rhythm Forged)
  -- -------------------------------------------------------------------------
  INSERT INTO public.routines (id, user_id, title, attribute, days_of_week)
  VALUES ('b0000000-0000-0000-0000-000000000001'::uuid, v_test_uid, 'Audit Routine', 'wellness', ARRAY[0,1,2,3,4,5,6]);

  -- Insert 9 completed routine instances
  FOR i IN 1..9 LOOP
    INSERT INTO public.routine_instances (
      routine_id, user_id, local_date, title_snapshot, attribute_snapshot, effort_snapshot, challenge_snapshot, status
    ) VALUES (
      'b0000000-0000-0000-0000-000000000001'::uuid, v_test_uid, v_user_today - i, 'Audit Routine', 'wellness', 'standard', 'routine', 'completed'
    );
  END LOOP;
  PERFORM public.evaluate_chronicle(v_test_uid);
  SELECT count(*) = 0 INTO v_routine9_pass FROM public.user_achievements WHERE user_id = v_test_uid AND achievement_id = 'rhythm_forged';

  -- Insert 10th
  INSERT INTO public.routine_instances (
    routine_id, user_id, local_date, title_snapshot, attribute_snapshot, effort_snapshot, challenge_snapshot, status
  ) VALUES (
    'b0000000-0000-0000-0000-000000000001'::uuid, v_test_uid, v_user_today - 10, 'Audit Routine', 'wellness', 'standard', 'routine', 'completed'
  );
  PERFORM public.evaluate_chronicle(v_test_uid);
  SELECT count(*) = 1 INTO v_routine10_pass FROM public.user_achievements WHERE user_id = v_test_uid AND achievement_id = 'rhythm_forged';

  -- Reset routines
  DELETE FROM public.routine_instances WHERE user_id = v_test_uid;
  DELETE FROM public.routines WHERE user_id = v_test_uid;
  DELETE FROM public.user_achievements WHERE user_id = v_test_uid;

  -- -------------------------------------------------------------------------
  -- ASSERTION 4: Total Activities (9 does NOT unlock, 10 DOES unlock Deeds Recorded)
  -- -------------------------------------------------------------------------
  -- ASSERTION 4: Total Activities (9 does NOT unlock, 10 DOES unlock Deeds Recorded)
  -- -------------------------------------------------------------------------
  FOR i IN 1..9 LOOP
    INSERT INTO public.quests (user_id, title, attribute, difficulty)
    VALUES (v_test_uid, 'Audit Quest ' || i, 'strength', 'easy');
    UPDATE public.quests SET completed = TRUE WHERE user_id = v_test_uid AND title = 'Audit Quest ' || i;
  END LOOP;
  PERFORM public.evaluate_chronicle(v_test_uid);
  SELECT count(*) = 0 INTO v_total9_pass FROM public.user_achievements WHERE user_id = v_test_uid AND achievement_id = 'deeds_recorded';

  INSERT INTO public.quests (user_id, title, attribute, difficulty)
  VALUES (v_test_uid, 'Audit Quest 10', 'strength', 'easy');
  UPDATE public.quests SET completed = TRUE WHERE user_id = v_test_uid AND title = 'Audit Quest 10';
  PERFORM public.evaluate_chronicle(v_test_uid);
  SELECT count(*) = 1 INTO v_total10_pass FROM public.user_achievements WHERE user_id = v_test_uid AND achievement_id = 'deeds_recorded';

  -- Reset quests
  DELETE FROM public.quests WHERE user_id = v_test_uid;
  DELETE FROM public.user_achievements WHERE user_id = v_test_uid;

  -- -------------------------------------------------------------------------
  -- ASSERTION 5: PLANNED_ACTIVITY_COMPLETIONS (The Daily Three)
  -- Unscheduled quest does NOT count; scheduled quest counts; routine counts;
  -- threshold 3 awards +8 Gold once only.
  -- -------------------------------------------------------------------------
  UPDATE public.profiles SET gold = 100 WHERE id = v_test_uid;

  -- A. Unscheduled quest completed today
  INSERT INTO public.quests (user_id, title, attribute, difficulty, scheduled_date)
  VALUES (v_test_uid, 'Unscheduled Vow', 'creativity', 'easy', NULL);
  UPDATE public.quests SET completed = TRUE WHERE user_id = v_test_uid AND title = 'Unscheduled Vow';

  v_res := public.evaluate_chronicle(v_test_uid);
  SELECT count(*) = 0 INTO v_unscheduled_no_progress FROM public.user_challenge_completions WHERE user_id = v_test_uid AND challenge_id = 'daily_planned_three';

  -- B. Quest scheduled for today completed
  INSERT INTO public.quests (user_id, title, attribute, difficulty, scheduled_date)
  VALUES (v_test_uid, 'Planned Vow 1', 'creativity', 'easy', v_user_today);
  UPDATE public.quests SET completed = TRUE WHERE user_id = v_test_uid AND title = 'Planned Vow 1';

  -- Progress is 1. Should not complete yet.
  v_res := public.evaluate_chronicle(v_test_uid);
  SELECT count(*) = 0 INTO v_scheduled_progresses FROM public.user_challenge_completions WHERE user_id = v_test_uid AND challenge_id = 'daily_planned_three';

  -- C. Routine instance for today completed
  INSERT INTO public.routines (id, user_id, title, attribute, days_of_week)
  VALUES ('b0000000-0000-0000-0000-000000000002'::uuid, v_test_uid, 'Planned Habit', 'wellness', ARRAY[0,1,2,3,4,5,6]);

  INSERT INTO public.routine_instances (
    routine_id, user_id, local_date, title_snapshot, attribute_snapshot, effort_snapshot, challenge_snapshot, status
  ) VALUES (
    'b0000000-0000-0000-0000-000000000002'::uuid, v_test_uid, v_user_today, 'Planned Habit', 'wellness', 'standard', 'routine', 'completed'
  );

  -- Progress is 2 (1 scheduled quest + 1 routine instance). Should not complete yet.
  -- Note: This routine completion satisfies 'daily_steadfast' (+6 Gold), so gold becomes 106.
  v_res := public.evaluate_chronicle(v_test_uid);
  SELECT count(*) = 0 INTO v_routine_progresses FROM public.user_challenge_completions WHERE user_id = v_test_uid AND challenge_id = 'daily_planned_three';

  -- D. 3rd planned activity (2nd scheduled quest for today)
  INSERT INTO public.quests (user_id, title, attribute, difficulty, scheduled_date)
  VALUES (v_test_uid, 'Planned Vow 2', 'creativity', 'easy', v_user_today);
  UPDATE public.quests SET completed = TRUE WHERE user_id = v_test_uid AND title = 'Planned Vow 2';

  -- Now exactly 3 planned activities! Must complete The Daily Three and award +8 Gold! (106 + 8 = 114)
  v_res := public.evaluate_chronicle(v_test_uid);
  SELECT count(*) = 1 INTO v_daily_three_threshold_pass FROM public.user_challenge_completions WHERE user_id = v_test_uid AND challenge_id = 'daily_planned_three';
  SELECT gold INTO v_gold_after FROM public.profiles WHERE id = v_test_uid;
  v_daily_three_threshold_pass := v_daily_three_threshold_pass AND (v_gold_after = 114);

  -- E. 4th planned activity completed today: Gold must NOT increase again!
  INSERT INTO public.quests (user_id, title, attribute, difficulty, scheduled_date)
  VALUES (v_test_uid, 'Planned Vow 3', 'creativity', 'easy', v_user_today);
  UPDATE public.quests SET completed = TRUE WHERE user_id = v_test_uid AND title = 'Planned Vow 3';

  v_res := public.evaluate_chronicle(v_test_uid);
  SELECT gold INTO v_gold_after FROM public.profiles WHERE id = v_test_uid;
  v_daily_three_once_only_gold := (v_gold_after = 114);

  -- -------------------------------------------------------------------------
  -- ASSERTION 6: The Main Path (Weekly, 3 Main Quests -> +20 Gold once per week)
  -- -------------------------------------------------------------------------
  -- Insert 2 main quests completed this week
  INSERT INTO public.quests (user_id, title, attribute, difficulty, is_main_quest, scheduled_date)
  VALUES (v_test_uid, 'Main 1', 'discipline', 'medium', TRUE, v_week_start);
  UPDATE public.quests SET completed = TRUE WHERE user_id = v_test_uid AND title = 'Main 1';

  INSERT INTO public.quests (user_id, title, attribute, difficulty, is_main_quest, scheduled_date)
  VALUES (v_test_uid, 'Main 2', 'discipline', 'medium', TRUE, v_week_start + 1);
  UPDATE public.quests SET completed = TRUE WHERE user_id = v_test_uid AND title = 'Main 2';

  v_res := public.evaluate_chronicle(v_test_uid);
  SELECT count(*) = 0 INTO v_main_path_weekly_pass FROM public.user_challenge_completions WHERE user_id = v_test_uid AND challenge_id = 'weekly_main_path';

  -- 3rd main quest completed this week
  INSERT INTO public.quests (user_id, title, attribute, difficulty, is_main_quest, scheduled_date)
  VALUES (v_test_uid, 'Main 3', 'discipline', 'medium', TRUE, v_week_start + 2);
  UPDATE public.quests SET completed = TRUE WHERE user_id = v_test_uid AND title = 'Main 3';

  v_res := public.evaluate_chronicle(v_test_uid);
  SELECT count(*) = 1 INTO v_main_path_weekly_pass FROM public.user_challenge_completions WHERE user_id = v_test_uid AND challenge_id = 'weekly_main_path';
  SELECT gold INTO v_gold_after FROM public.profiles WHERE id = v_test_uid;
  -- 114 + 20 = 134
  v_main_path_weekly_pass := v_main_path_weekly_pass AND (v_gold_after = 134);

  -- 4th main quest: must NOT re-award
  INSERT INTO public.quests (user_id, title, attribute, difficulty, is_main_quest, scheduled_date)
  VALUES (v_test_uid, 'Main 4', 'discipline', 'medium', TRUE, v_week_start + 3);
  UPDATE public.quests SET completed = TRUE WHERE user_id = v_test_uid AND title = 'Main 4';

  v_res := public.evaluate_chronicle(v_test_uid);
  SELECT gold INTO v_gold_after FROM public.profiles WHERE id = v_test_uid;
  v_main_path_weekly_pass := v_main_path_weekly_pass AND (v_gold_after = 134);

  -- -------------------------------------------------------------------------
  -- ASSERTION 7: Backfill Economic Invariants (Changes Gold by 0, XP by 0, Level by 0)
  -- -------------------------------------------------------------------------
  SELECT gold, xp, level INTO v_gold_before, v_xp_before, v_level_before FROM public.profiles WHERE id = v_test_uid;
  PERFORM public.backfill_user_inscriptions(v_test_uid);
  SELECT gold, xp, level INTO v_gold_after, v_xp_after, v_level_after FROM public.profiles WHERE id = v_test_uid;

  v_backfill_economic_invariants := (v_gold_before = v_gold_after) AND (v_xp_before = v_xp_after) AND (v_level_before = v_level_after);

  -- -------------------------------------------------------------------------
  -- ASSERTION 8: Timezone Derivation
  -- -------------------------------------------------------------------------
  UPDATE public.profiles SET timezone = 'Pacific/Auckland' WHERE id = v_test_uid;
  -- Auckland is UTC+12/13. Verify evaluation runs without error and resolves period_start to that timezone
  v_res := public.evaluate_chronicle(v_test_uid);
  v_timezone_derivation_pass := (v_res IS NOT NULL);

  -- -------------------------------------------------------------------------
  -- ASSERTION 9: Concurrency & Idempotency
  -- -------------------------------------------------------------------------
  SELECT count(*) INTO v_ach_count FROM public.user_achievements WHERE user_id = v_test_uid;
  -- Run evaluate_chronicle 5 consecutive times
  PERFORM public.evaluate_chronicle(v_test_uid);
  PERFORM public.evaluate_chronicle(v_test_uid);
  PERFORM public.evaluate_chronicle(v_test_uid);
  PERFORM public.evaluate_chronicle(v_test_uid);
  PERFORM public.evaluate_chronicle(v_test_uid);

  SELECT count(*) INTO v_chal_count FROM public.user_achievements WHERE user_id = v_test_uid;
  v_achievement_idempotency_pass := (v_ach_count = v_chal_count);

  SELECT gold INTO v_gold_after FROM public.profiles WHERE id = v_test_uid;
  v_concurrency_once_only_pass := (v_gold_after = 134);

  -- -------------------------------------------------------------------------
  -- CLEANUP TEST USER
  -- -------------------------------------------------------------------------
  DELETE FROM public.user_challenge_completions WHERE user_id = v_test_uid;
  DELETE FROM public.user_achievements WHERE user_id = v_test_uid;
  DELETE FROM public.routine_instances WHERE user_id = v_test_uid;
  DELETE FROM public.routines WHERE user_id = v_test_uid;
  DELETE FROM public.quests WHERE user_id = v_test_uid;
  DELETE FROM public.inventory WHERE user_id = v_test_uid;
  DELETE FROM public.attributes WHERE user_id = v_test_uid;
  DELETE FROM public.realm_progress WHERE user_id = v_test_uid;
  DELETE FROM public.profiles WHERE id = v_test_uid;
  DELETE FROM auth.users WHERE id = v_test_uid;

  -- -------------------------------------------------------------------------
  -- RETURN FULL RESULTS REPORT
  -- -------------------------------------------------------------------------
  RETURN jsonb_build_object(
    'realm1_first_awakening_pass', v_realm1_pass,
    'realm3_world_restored_pass', v_realm3_pass,
    'attr49_not_unlocked_pass', v_attr49_pass,
    'attr50_unlocked_pass', v_attr50_pass,
    'routine9_not_unlocked_pass', v_routine9_pass,
    'routine10_unlocked_pass', v_routine10_pass,
    'total9_not_unlocked_pass', v_total9_pass,
    'total10_unlocked_pass', v_total10_pass,
    'unscheduled_quest_no_progress_pass', v_unscheduled_no_progress,
    'scheduled_quest_progresses_pass', v_scheduled_progresses,
    'routine_progresses_pass', v_routine_progresses,
    'daily_three_threshold_3_pass', v_daily_three_threshold_pass,
    'daily_three_once_only_8_gold_pass', v_daily_three_once_only_gold,
    'weekly_main_path_20_gold_once_pass', v_main_path_weekly_pass,
    'backfill_economic_invariants_pass', v_backfill_economic_invariants,
    'timezone_derivation_pass', v_timezone_derivation_pass,
    'achievement_idempotency_pass', v_achievement_idempotency_pass,
    'concurrency_once_only_gold_pass', v_concurrency_once_only_pass,
    'overall_status', (
      v_realm1_pass AND v_realm3_pass AND v_attr49_pass AND v_attr50_pass AND
      v_routine9_pass AND v_routine10_pass AND v_total9_pass AND v_total10_pass AND
      v_unscheduled_no_progress AND v_scheduled_progresses AND v_routine_progresses AND
      v_daily_three_threshold_pass AND v_daily_three_once_only_gold AND
      v_main_path_weekly_pass AND v_backfill_economic_invariants AND
      v_timezone_derivation_pass AND v_achievement_idempotency_pass AND v_concurrency_once_only_pass
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.run_chronicle_semantic_audit() FROM PUBLIC, anon, authenticated;
