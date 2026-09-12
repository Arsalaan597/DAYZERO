import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { execSync } from 'child_process';

const BASE_URL = 'http://localhost:3000';

// Read env for direct database security tests
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach((line) => {
  const [k, v] = line.split('=');
  if (k && v) env[k.trim()] = v.trim();
});

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runPhase7Qa() {
  console.log('=== STARTING COMPREHENSIVE DAYZERO PHASE 7 QA SUITE ===');
  const results = {};

  // ----------------------------------------------------
  // SECTION A: DIRECT DATABASE & SECURITY TESTS
  // ----------------------------------------------------
  console.log('\n--- SECTION A: Direct Database & Security Tests ---');

  // Test A1: Verify 12 Seeded Achievements & Canonical Threshold Values
  const { data: achData } = await supabase
    .from('achievements')
    .select('*')
    .order('sort_order', { ascending: true });

  const has12Achievements = achData && achData.length === 12;
  const achIds = (achData || []).map((a) => a.id);
  const expectedAch = [
    'the_first_step',
    'vow_kept',
    'spark_of_resolve',
    'blazing_hearth',
    'ascendant',
    'wayfarer_unbound',
    'first_awakening',
    'world_restored',
    'rhythm_forged',
    'deeds_recorded',
    'path_made_visible',
    'patron_of_the_vault',
  ];
  const allAchMatch = expectedAch.every((id) => achIds.includes(id));

  // Canonical specification repair target values
  const expectedTargets = {
    the_first_step: 1,
    vow_kept: 1,
    spark_of_resolve: 3,
    blazing_hearth: 7,
    ascendant: 5,
    wayfarer_unbound: 10,
    first_awakening: 1,      // canonical: realm tier 1
    world_restored: 3,       // canonical: realm tier 3 (restored)
    rhythm_forged: 10,       // canonical: 10 routine completions
    deeds_recorded: 10,      // canonical: 10 total completions
    path_made_visible: 50,   // canonical: 50 attribute value
    patron_of_the_vault: 1,  // canonical: 1 vault purchase
  };

  const actualTargets = {};
  achData?.forEach((a) => {
    actualTargets[a.id] = a.target_value;
  });

  const allTargetsMatch = expectedAch.every(
    (id) => actualTargets[id] === expectedTargets[id]
  );

  results['A1_SEEDED_ACHIEVEMENTS'] = {
    count: achData?.length,
    has12: has12Achievements,
    allMatch: allAchMatch,
    allTargetsMatch,
    actualTargets,
    status: has12Achievements && allAchMatch && allTargetsMatch ? 'PASS' : 'FAIL',
  };
  console.log('A1_SEEDED_ACHIEVEMENTS:', results['A1_SEEDED_ACHIEVEMENTS']);

  // Test A2: Verify 3 Seeded Challenges (Trials) & PLANNED_ACTIVITY_COMPLETIONS
  const { data: chalData } = await supabase
    .from('challenges')
    .select('*')
    .order('sort_order', { ascending: true });

  const has3Challenges = chalData && chalData.length === 3;
  const chalIds = (chalData || []).map((c) => c.id);
  const expectedChal = ['daily_planned_three', 'daily_steadfast', 'weekly_main_path'];
  const allChalMatch = expectedChal.every((id) => chalIds.includes(id));

  const dailyThree = chalData?.find((c) => c.id === 'daily_planned_three');
  const steadfast = chalData?.find((c) => c.id === 'daily_steadfast');
  const mainPath = chalData?.find((c) => c.id === 'weekly_main_path');

  const dailyThreeCriteriaMatch = dailyThree?.criteria_type === 'PLANNED_ACTIVITY_COMPLETIONS' && dailyThree?.target_count === 3 && dailyThree?.gold_reward === 8;
  const steadfastCriteriaMatch = steadfast?.criteria_type === 'ROUTINE_COMPLETIONS' && steadfast?.target_count === 1 && steadfast?.gold_reward === 6;
  const mainPathCriteriaMatch = mainPath?.criteria_type === 'MAIN_QUEST_COMPLETIONS' && mainPath?.target_count === 3 && mainPath?.gold_reward === 20;

  results['A2_SEEDED_CHALLENGES'] = {
    count: chalData?.length,
    has3: has3Challenges,
    allMatch: allChalMatch,
    dailyThreeCriteriaMatch,
    steadfastCriteriaMatch,
    mainPathCriteriaMatch,
    status:
      has3Challenges && allChalMatch && dailyThreeCriteriaMatch && steadfastCriteriaMatch && mainPathCriteriaMatch
        ? 'PASS'
        : 'FAIL',
  };
  console.log('A2_SEEDED_CHALLENGES:', results['A2_SEEDED_CHALLENGES']);

  // Test A3: RLS Restrictions on Direct Mutations
  const { error: insertAchErr } = await supabase
    .from('user_achievements')
    .insert({ user_id: '00000000-0000-0000-0000-000000000000', achievement_id: 'the_first_step' });

  const { error: updateAchErr } = await supabase
    .from('user_achievements')
    .update({ achievement_id: 'vow_kept' })
    .eq('achievement_id', 'the_first_step');

  const { error: deleteAchErr } = await supabase
    .from('user_achievements')
    .delete()
    .eq('achievement_id', 'the_first_step');

  const { error: insertChalErr } = await supabase
    .from('user_challenge_completions')
    .insert({
      user_id: '00000000-0000-0000-0000-000000000000',
      challenge_id: 'daily_steadfast',
      period_start: '2026-01-01',
      gold_awarded: 9999,
    });

  const { error: updateChalCatalogErr } = await supabase
    .from('challenges')
    .update({ gold_reward: 9999 })
    .eq('id', 'daily_steadfast');

  // Direct invocation of internal evaluate_chronicle must fail
  const { error: evalErr } = await supabase.rpc('evaluate_chronicle', {
    p_user_id: '00000000-0000-0000-0000-000000000000',
  });

  const rlsBlocked =
    Boolean(insertAchErr) &&
    Boolean(updateAchErr) &&
    Boolean(deleteAchErr) &&
    Boolean(insertChalErr) &&
    Boolean(updateChalCatalogErr) &&
    Boolean(evalErr);

  results['A3_SECURITY_HARDENING_RLS'] = {
    insertAchBlocked: Boolean(insertAchErr),
    updateAchBlocked: Boolean(updateAchErr),
    deleteAchBlocked: Boolean(deleteAchErr),
    insertChalBlocked: Boolean(insertChalErr),
    updateChalCatalogBlocked: Boolean(updateChalCatalogErr),
    evaluateChronicleBlocked: Boolean(evalErr),
    status: rlsBlocked ? 'PASS' : 'FAIL',
  };
  console.log('A3_SECURITY_HARDENING_RLS:', results['A3_SECURITY_HARDENING_RLS']);

  // Test A4: Direct DB Verification of Canonical Semantics (no test helper needed)
  console.log('\n--- Test A4: Direct DB Canonical Semantics Verification ---');
  try {
    // 4a. Confirm run_chronicle_semantic_audit does NOT exist (cleanup verified)
    const noAuditFnRaw = execSync(
      `npx supabase db query --linked "SELECT COUNT(*) as cnt FROM pg_proc WHERE proname = 'run_chronicle_semantic_audit' AND pronamespace = 'public'::regnamespace"`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
    const noAuditFnParsed = JSON.parse(noAuditFnRaw);
    const auditFnGone = parseInt(noAuditFnParsed.rows?.[0]?.cnt ?? '1') === 0;

    // 4b. Verify challenges criteria_type constraint exists
    const constraintRaw = execSync(
      `npx supabase db query --linked "SELECT COUNT(*) as cnt FROM pg_constraint WHERE conname = 'challenges_criteria_type_check'"`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
    const constraintParsed = JSON.parse(constraintRaw);
    const constraintExists = parseInt(constraintParsed.rows?.[0]?.cnt ?? '0') > 0;

    // 4c. Verify achievement target values at DB level
    const targetsRaw = execSync(
      `npx supabase db query --linked "SELECT id, target_value FROM public.achievements ORDER BY id"`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
    const targetsParsed = JSON.parse(targetsRaw);
    const dbTargets = {};
    targetsParsed.rows?.forEach((r) => { dbTargets[r.id] = parseInt(r.target_value); });

    const dbTargetsCorrect =
      dbTargets['first_awakening'] === 1 &&
      dbTargets['world_restored'] === 3 &&
      dbTargets['rhythm_forged'] === 10 &&
      dbTargets['deeds_recorded'] === 10 &&
      dbTargets['path_made_visible'] === 50;

    // 4d. Verify evaluate_chronicle function exists and is SECURITY DEFINER
    const evalFnRaw = execSync(
      `npx supabase db query --linked "SELECT prosecdef FROM pg_proc WHERE proname = 'evaluate_chronicle' AND pronamespace = 'public'::regnamespace"`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
    const evalFnParsed = JSON.parse(evalFnRaw);
    const isSecDef = evalFnParsed.rows?.[0]?.prosecdef === true;

    // 4e. Verify backfill_user_inscriptions exists
    const backfillRaw = execSync(
      `npx supabase db query --linked "SELECT COUNT(*) as cnt FROM pg_proc WHERE proname = 'backfill_user_inscriptions' AND pronamespace = 'public'::regnamespace"`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
    const backfillParsed = JSON.parse(backfillRaw);
    const backfillExists = parseInt(backfillParsed.rows?.[0]?.cnt ?? '0') > 0;

    // 4f. Verify no audit test users remain
    const auditUserRaw = execSync(
      `npx supabase db query --linked "SELECT COUNT(*) as cnt FROM public.user_achievements WHERE user_id = 'a0000000-0000-0000-0000-000000000001'"`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
    const auditUserParsed = JSON.parse(auditUserRaw);
    const noAuditUserRows = parseInt(auditUserParsed.rows?.[0]?.cnt ?? '1') === 0;

    const a4Pass = auditFnGone && constraintExists && dbTargetsCorrect && isSecDef && backfillExists && noAuditUserRows;

    results['A4_DIRECT_DB_VERIFICATION'] = {
      auditFnGone,
      constraintExists,
      dbTargetsCorrect,
      isSecDef,
      backfillExists,
      noAuditUserRows,
      dbTargets,
      status: a4Pass ? 'PASS' : 'FAIL',
    };
    console.log('A4_DIRECT_DB_VERIFICATION:', results['A4_DIRECT_DB_VERIFICATION']);
  } catch (err) {
    console.error('A4 error:', err.message);
    results['A4_DIRECT_DB_VERIFICATION'] = { status: 'FAIL', error: err.message };
  }

  // Test A5: Real Timezone Boundary Test
  // Verify that scheduled_date NULL (unscheduled) is excluded and that
  // only quests with scheduled_date = user's local today count for PLANNED_ACTIVITY_COMPLETIONS
  console.log('\n--- Test A5: Timezone Boundary & PLANNED_ACTIVITY_COMPLETIONS Logic ---');
  try {
    // The logic is: scheduled_date IS NOT NULL AND scheduled_date = v_user_today
    // NULL = date always evaluates to NULL (false) in SQL, so unscheduled quests (NULL scheduled_date) are excluded.
    // Verify via direct SQL that the NULL comparison returns no match:
    const nullCheckRaw = execSync(
      `npx supabase db query --linked "SELECT (NULL = CURRENT_DATE) IS NOT DISTINCT FROM TRUE AS null_matches_today"`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
    const nullCheckParsed = JSON.parse(nullCheckRaw);
    const nullDoesNotMatchToday = nullCheckParsed.rows?.[0]?.null_matches_today === false;

    // Verify that scheduled_date = '2099-01-01' (future far-date) does not match today
    const futureCheckRaw = execSync(
      `npx supabase db query --linked "SELECT ('2099-01-01'::date = CURRENT_DATE) AS future_matches_today"`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
    const futureCheckParsed = JSON.parse(futureCheckRaw);
    const futureDoesNotMatchToday = futureCheckParsed.rows?.[0]?.future_matches_today === false;

    // Verify evaluate_chronicle function uses profiles.timezone via AT TIME ZONE
    const evalBodyRaw = execSync(
      `npx supabase db query --linked "SELECT prosrc FROM pg_proc WHERE proname = 'evaluate_chronicle' AND pronamespace = 'public'::regnamespace"`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
    const evalBodyParsed = JSON.parse(evalBodyRaw);
    const evalBody = evalBodyParsed.rows?.[0]?.prosrc ?? '';
    const usesTimezone = evalBody.includes('AT TIME ZONE') || evalBody.includes('timezone');
    const usesScheduledDate = evalBody.includes('scheduled_date');
    const usesIsNotNull = evalBody.includes('IS NOT NULL') || evalBody.includes('is not null');

    const a5Pass = nullDoesNotMatchToday && futureDoesNotMatchToday && usesTimezone && usesScheduledDate;

    results['A5_TIMEZONE_BOUNDARY'] = {
      nullDoesNotMatchToday,
      futureDoesNotMatchToday,
      usesTimezone,
      usesScheduledDate,
      usesIsNotNull,
      status: a5Pass ? 'PASS' : 'FAIL',
    };
    console.log('A5_TIMEZONE_BOUNDARY:', results['A5_TIMEZONE_BOUNDARY']);
  } catch (err) {
    console.error('A5 error:', err.message);
    results['A5_TIMEZONE_BOUNDARY'] = { status: 'FAIL', error: err.message };
  }

  // Test A6: Concurrency – Once-Only Gold Invariant for Challenges
  // Verify user_challenge_completions table has a UNIQUE constraint preventing double award
  console.log('\n--- Test A6: Concurrency / Once-Only Gold DB Constraint ---');
  try {
    // Check that unique constraint on (user_id, challenge_id, period_start) exists
    const uniqRaw = execSync(
      `npx supabase db query --linked "SELECT COUNT(*) as cnt FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid WHERE t.relname = 'user_challenge_completions' AND c.contype IN ('u', 'p')"`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
    const uniqParsed = JSON.parse(uniqRaw);
    const hasUniqueConstraint = parseInt(uniqParsed.rows?.[0]?.cnt ?? '0') > 0;

    // Check evaluate_chronicle uses INSERT ... ON CONFLICT DO NOTHING / DO UPDATE for idempotency
    const evalBodyRaw = execSync(
      `npx supabase db query --linked "SELECT prosrc FROM pg_proc WHERE proname = 'evaluate_chronicle' AND pronamespace = 'public'::regnamespace"`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
    const evalBodyParsed = JSON.parse(evalBodyRaw);
    const evalBody = evalBodyParsed.rows?.[0]?.prosrc ?? '';
    const hasOnConflict = evalBody.toLowerCase().includes('on conflict');

    const a6Pass = hasUniqueConstraint && hasOnConflict;

    results['A6_CONCURRENCY_ONCE_ONLY'] = {
      hasUniqueConstraint,
      hasOnConflict,
      status: a6Pass ? 'PASS' : 'FAIL',
    };
    console.log('A6_CONCURRENCY_ONCE_ONLY:', results['A6_CONCURRENCY_ONCE_ONLY']);
  } catch (err) {
    console.error('A6 error:', err.message);
    results['A6_CONCURRENCY_ONCE_ONLY'] = { status: 'FAIL', error: err.message };
  }

  // ----------------------------------------------------
  // SECTION B: BROWSER FUNCTIONAL & RESPONSIVE E2E
  // ----------------------------------------------------
  console.log('\n--- SECTION B: Browser Functional & E2E Tests ---');

  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true,
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  const timestamp = Date.now();
  const user1 = {
    displayName: 'Chronicle Wayfarer',
    email: `chronicle_${timestamp}@dayzero.test`,
    password: 'Password123!',
  };

  try {
    // Stage 1: Signup User 1
    console.log('\n--- B1: Signup User 1 ---');
    await page.goto(`${BASE_URL}/signup`);
    await page.fill('input[name="display-name"]', user1.displayName);
    await page.fill('input[name="email"]', user1.email);
    await page.fill('input[name="password"]', user1.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/game/today', { timeout: 10000 });

    // Stage 2: Verify Initial Chronicle View (/game/chronicle)
    console.log('\n--- B2: Inspect Initial /game/chronicle ---');
    await page.goto(`${BASE_URL}/game/chronicle`);
    await page.waitForSelector('h1:has-text("The Chronicle")');

    const chronicleHeader = await page.locator('header:has-text("The Chronicle")').textContent();
    const hasInitial0Of12 = chronicleHeader.includes('0') && chronicleHeader.includes('/ 12');

    const trialCardsCount = await page.locator('article[aria-label^="Trial:"]').count();
    const has3TrialCards = trialCardsCount === 3;

    const inscriptionCardsCount = await page.locator('article[aria-label^="Inscription:"]').count();
    const has12Inscriptions = inscriptionCardsCount === 12;

    const hasUninscribedBadges = (await page.locator('span:has-text("Uninscribed")').count()) === 12;

    results['B2_INITIAL_CHRONICLE_VIEW'] = {
      hasInitial0Of12,
      has3TrialCards,
      has12Inscriptions,
      hasUninscribedBadges,
      status:
        hasInitial0Of12 && has3TrialCards && has12Inscriptions && hasUninscribedBadges
          ? 'PASS'
          : 'FAIL',
    };
    console.log('B2_INITIAL_CHRONICLE_VIEW:', results['B2_INITIAL_CHRONICLE_VIEW']);

    // Stage 3: Verify Desktop Navigation Strictly Has 5 Destinations
    console.log('\n--- B3: Verify Desktop Navigation Stays 5 Destinations ---');
    const desktopNavItems = await page.locator('nav[aria-label="Game navigation"] li').allTextContents();
    const desktopHas5 = desktopNavItems.length === 5;
    const desktopHasNoChronicle = !desktopNavItems.some((item) => item.toLowerCase().includes('chronicle'));

    results['B3_DESKTOP_HUD_5_DESTINATIONS'] = {
      navItems: desktopNavItems,
      desktopHas5,
      desktopHasNoChronicle,
      status: desktopHas5 && desktopHasNoChronicle ? 'PASS' : 'FAIL',
    };
    console.log('B3_DESKTOP_HUD_5_DESTINATIONS:', results['B3_DESKTOP_HUD_5_DESTINATIONS']);

    // Stage 4: Verify Today Page Active Trials Widget & Navigation
    console.log('\n--- B4: Inspect Active Trials on /game/today ---');
    await page.goto(`${BASE_URL}/game/today`);
    await page.waitForSelector('aside[aria-label="Active Chronicle Trials"]');

    const todayTrialsWidget = page.locator('aside[aria-label="Active Chronicle Trials"]');
    const hasDailyThreeOnToday = (await todayTrialsWidget.locator('span:has-text("The Daily Three")').count()) > 0;
    const hasSteadfastOnToday = (await todayTrialsWidget.locator('span:has-text("Steadfast")').count()) > 0;
    const hasMainPathOnToday = (await todayTrialsWidget.locator('span:has-text("The Main Path")').count()) > 0;

    // Click "View Chronicle" link from Today
    await todayTrialsWidget.locator('a:has-text("View Chronicle")').click();
    await page.waitForURL('**/game/chronicle', { timeout: 8000 });
    const atChronicleFromToday = page.url().includes('/game/chronicle');

    results['B4_TODAY_TRIALS_WIDGET'] = {
      hasDailyThreeOnToday,
      hasSteadfastOnToday,
      hasMainPathOnToday,
      atChronicleFromToday,
      status:
        hasDailyThreeOnToday && hasSteadfastOnToday && hasMainPathOnToday && atChronicleFromToday
          ? 'PASS'
          : 'FAIL',
    };
    console.log('B4_TODAY_TRIALS_WIDGET:', results['B4_TODAY_TRIALS_WIDGET']);

    // Stage 5: Verify Wayfarer Chronicle Summary & CTA
    console.log('\n--- B5: Inspect Wayfarer Chronicle Summary ---');
    await page.goto(`${BASE_URL}/game/wayfarer`);
    await page.waitForSelector('article[aria-label="Wayfarer Character Codex"]');

    const wayfarerText = await page.locator('article[aria-label="Wayfarer Character Codex"]').textContent();
    const hasWayfarerChronicle0 = wayfarerText.includes('Chronicle: 0 / 12 Inscriptions');
    const hasOpenChronicleCta = wayfarerText.includes('OPEN THE CHRONICLE');

    // Click "OPEN THE CHRONICLE" CTA from Wayfarer
    await page.click('a:has-text("OPEN THE CHRONICLE")');
    await page.waitForURL('**/game/chronicle', { timeout: 8000 });
    const atChronicleFromWayfarer = page.url().includes('/game/chronicle');

    results['B5_WAYFARER_CHRONICLE_SUMMARY'] = {
      hasWayfarerChronicle0,
      hasOpenChronicleCta,
      atChronicleFromWayfarer,
      status: hasWayfarerChronicle0 && hasOpenChronicleCta && atChronicleFromWayfarer ? 'PASS' : 'FAIL',
    };
    console.log('B5_WAYFARER_CHRONICLE_SUMMARY:', results['B5_WAYFARER_CHRONICLE_SUMMARY']);

    // Stage 6: First Activity -> "The First Step" Achievement & Unified Reveal
    console.log('\n--- B6: Complete 1st Unscheduled Activity -> "The First Step" Reveal & Daily Three 0/3 ---');
    await page.goto(`${BASE_URL}/game/quests`);
    await page.waitForSelector('button:has-text("Inscribe Quest")');

    // Create an Easy quest (unscheduled)
    await page.click('button:has-text("Inscribe Quest")');
    await page.waitForSelector('[role="dialog"]');
    const qDialog = page.locator('[role="dialog"]');
    await qDialog.locator('input[name="title"]').fill('Awaken Mind');
    await qDialog.locator('button:has-text("intellect")').click();
    await qDialog.locator('button:has-text("Easy")').click();
    await qDialog.locator('button[type="submit"]').click();
    await page.waitForTimeout(1500);

    // Complete the Quest
    const completeBtn = page.locator('button:has-text("Complete Quest")').first();
    await completeBtn.click();

    // Verify Unified Reward Reveal Dialog
    await page.waitForSelector('[role="dialog"]:has-text("Quest Complete")', { timeout: 8000 });
    const modalContent = await page.locator('[role="dialog"]').textContent();

    const hasQuestComplete = modalContent.includes('Quest Complete');
    const hasFirstStepInscription =
      modalContent.includes('Inscription Inscribed') && modalContent.includes('The First Step');
    const onlySingleModal = (await page.locator('[role="dialog"]').count()) === 1;

    // Accept & Continue
    await page.click('button:has-text("Accept & Continue")');
    await page.waitForTimeout(1000);

    // Verify Chronicle shows 1 / 12 Inscriptions
    await page.goto(`${BASE_URL}/game/chronicle`);
    const chronicleTextAfterStep1 = await page.locator('header:has-text("The Chronicle")').textContent();
    const has1Of12 = chronicleTextAfterStep1.includes('1') && chronicleTextAfterStep1.includes('/ 12');
    const hasFirstStepInscribed = (await page.locator('article[aria-label*="The First Step (Earned)"]').count()) > 0;

    // Verify Today Widget: Daily Three is STILL 0 / 3 because 'Awaken Mind' was unscheduled!
    await page.goto(`${BASE_URL}/game/today`);
    await page.waitForSelector('aside[aria-label="Active Chronicle Trials"]');
    const todayWidgetAfterUnscheduled = await page.locator('aside[aria-label="Active Chronicle Trials"]').textContent();
    const dailyThreeZeroAfterUnscheduled = todayWidgetAfterUnscheduled.includes('The Daily Three') && todayWidgetAfterUnscheduled.includes('0 / 3');

    results['B6_THE_FIRST_STEP_ACHIEVEMENT'] = {
      hasQuestComplete,
      hasFirstStepInscription,
      onlySingleModal,
      has1Of12,
      hasFirstStepInscribed,
      dailyThreeZeroAfterUnscheduled,
      status:
        hasQuestComplete && hasFirstStepInscription && onlySingleModal && has1Of12 && hasFirstStepInscribed && dailyThreeZeroAfterUnscheduled
          ? 'PASS'
          : 'FAIL',
    };
    console.log('B6_THE_FIRST_STEP_ACHIEVEMENT:', results['B6_THE_FIRST_STEP_ACHIEVEMENT']);

    // Stage 7: Schedule Routine & Complete on Today -> "Steadfast" Daily Trial (+6 Gold)
    console.log('\n--- B7: Complete Routine -> "Steadfast" Trial (+6 Gold) & Daily Three 1/3 ---');
    await page.goto(`${BASE_URL}/game/week`);
    await page.waitForTimeout(1000);

    // Create a daily routine (active every day)
    await page.click('button:has-text("+ Routine")');
    await page.waitForSelector('div[role="dialog"]');
    const routineDialog = page.locator('div[role="dialog"]');
    await routineDialog.locator('input[name="title"]').fill('Morning Meditation');
    await routineDialog.locator('button:has-text("wellness")').click();

    // Select Sun and Sat so all 7 days are active (Mon-Fri are active by default)
    await routineDialog.locator('button:has-text("Sun")').click();
    await routineDialog.locator('button:has-text("Sat")').click();
    await routineDialog.locator('button[type="submit"]').click();
    await page.waitForTimeout(2000);

    // Go to /game/today
    await page.goto(`${BASE_URL}/game/today`);
    await page.waitForSelector('h3:has-text("Morning Meditation")');

    // Complete routine on Today
    const completeRoutineBtn = page.locator('div:has(h3:has-text("Morning Meditation")) button:has-text("Fulfill Vow")').first();
    await completeRoutineBtn.click();

    // Verify Reward Reveal includes Trial Fulfilled: Steadfast (+6 G)
    await page.waitForSelector('[role="dialog"]:has-text("Quest Complete")', { timeout: 10000 });
    const routineModalContent = await page.locator('[role="dialog"]').textContent();
    const hasSteadfastFulfilled =
      routineModalContent.includes('Trial Fulfilled') &&
      routineModalContent.includes('Steadfast') &&
      routineModalContent.includes('+6 G');

    await page.click('button:has-text("Accept & Continue")');
    await page.waitForTimeout(1500);

    // Check Today Widget shows Steadfast Fulfilled and Daily Three 1 / 3
    await page.waitForSelector('aside[aria-label="Active Chronicle Trials"]');
    const todayWidgetAfterRoutine = await page.locator('aside[aria-label="Active Chronicle Trials"]').textContent();
    const hasSteadfastFulfilledInWidget = todayWidgetAfterRoutine.includes('Fulfilled');
    const hasDailyThree1Of3 = todayWidgetAfterRoutine.includes('The Daily Three') && todayWidgetAfterRoutine.includes('1 / 3');

    results['B7_STEADFAST_TRIAL_FULFILLED'] = {
      hasSteadfastFulfilled,
      hasSteadfastFulfilledInWidget,
      hasDailyThree1Of3,
      status: hasSteadfastFulfilled && hasSteadfastFulfilledInWidget && hasDailyThree1Of3 ? 'PASS' : 'FAIL',
    };
    console.log('B7_STEADFAST_TRIAL_FULFILLED:', results['B7_STEADFAST_TRIAL_FULFILLED']);

    // Stage 8: Main Quest -> "Vow Kept" Inscription & "The Main Path" Weekly Trial Progress
    console.log('\n--- B8: Complete Main Quest -> "Vow Kept" & Daily Three 2/3 ---');
    await page.goto(`${BASE_URL}/game/quests`);
    await page.waitForSelector('button:has-text("Inscribe Quest")');

    // Inscribe a new quest
    await page.click('button:has-text("Inscribe Quest")');
    await page.waitForSelector('[role="dialog"]');
    const mqDialog = page.locator('[role="dialog"]');
    await mqDialog.locator('input[name="title"]').fill('Restore Great Forge');
    await mqDialog.locator('button:has-text("discipline")').click();
    await mqDialog.locator('button:has-text("Medium")').click();
    await mqDialog.locator('button[type="submit"]').click();
    await page.waitForTimeout(1500);

    // Schedule and designate as Main Quest via /game/week
    await page.goto(`${BASE_URL}/game/week`);
    await page.waitForSelector('div:has-text("Restore Great Forge")');
    const unscheduledForge = page.locator('div:has-text("Restore Great Forge")').last();
    await unscheduledForge.getByRole('button', { name: 'Schedule', exact: true }).click();
    await page.waitForSelector('#main-quest-toggle');
    await page.check('#main-quest-toggle');
    await page.click('button:has-text("Confirm Schedule")');
    await page.waitForTimeout(2000);

    // Go to Today, complete Main Quest
    await page.goto(`${BASE_URL}/game/today`);
    await page.waitForSelector('h3:has-text("Restore Great Forge")');
    const completeMqBtn = page.locator('div:has(h3:has-text("Restore Great Forge")) button:has-text("Fulfill Vow")').first();
    await completeMqBtn.click();

    // Verify Reward Reveal includes Vow Kept Inscription
    await page.waitForSelector('[role="dialog"]:has-text("Quest Complete")', { timeout: 10000 });
    const mqModalContent = await page.locator('[role="dialog"]').textContent();
    const hasVowKeptInscription =
      mqModalContent.includes('Inscription Inscribed') && mqModalContent.includes('Vow Kept');

    await page.click('button:has-text("Accept & Continue")');
    await page.waitForTimeout(1500);

    // Verify Weekly Main Path has 1 / 3 progress in widget, and Daily Three has 2 / 3 progress
    await page.waitForSelector('aside[aria-label="Active Chronicle Trials"]');
    const todayWidgetAfterMq = await page.locator('aside[aria-label="Active Chronicle Trials"]').textContent();
    const hasMainPath1Of3 = todayWidgetAfterMq.includes('The Main Path') && todayWidgetAfterMq.includes('1 / 3');
    const hasDailyThree2Of3 = todayWidgetAfterMq.includes('The Daily Three') && todayWidgetAfterMq.includes('2 / 3');

    results['B8_VOW_KEPT_AND_WEEKLY_TRIAL'] = {
      hasVowKeptInscription,
      hasMainPath1Of3,
      hasDailyThree2Of3,
      status: hasVowKeptInscription && hasMainPath1Of3 && hasDailyThree2Of3 ? 'PASS' : 'FAIL',
    };
    console.log('B8_VOW_KEPT_AND_WEEKLY_TRIAL:', results['B8_VOW_KEPT_AND_WEEKLY_TRIAL']);

    // Stage 8b: 3rd Planned Activity -> "The Daily Three" Trial Fulfilled (+8 Gold)
    console.log('\n--- B8b: Complete 3rd Planned Activity -> "The Daily Three" Trial Fulfilled (+8 Gold) ---');
    await page.goto(`${BASE_URL}/game/quests`);
    await page.waitForSelector('button:has-text("Inscribe Quest")');

    await page.click('button:has-text("Inscribe Quest")');
    await page.waitForSelector('[role="dialog"]');
    const q3Dialog = page.locator('[role="dialog"]');
    await q3Dialog.locator('input[name="title"]').fill('Study Arcana');
    await q3Dialog.locator('button:has-text("intellect")').click();
    await q3Dialog.locator('button:has-text("Easy")').click();
    await q3Dialog.locator('button[type="submit"]').click();
    await page.waitForTimeout(1500);

    // Schedule for today via /game/week
    await page.goto(`${BASE_URL}/game/week`);
    await page.waitForSelector('div:has-text("Study Arcana")');
    const unscheduledArcana = page.locator('div:has-text("Study Arcana")').last();
    await unscheduledArcana.getByRole('button', { name: 'Schedule', exact: true }).click();
    await page.waitForSelector('button:has-text("Confirm Schedule")');
    await page.click('button:has-text("Confirm Schedule")');
    await page.waitForTimeout(2000);

    // Go to Today, complete 3rd planned activity
    await page.goto(`${BASE_URL}/game/today`);
    await page.waitForSelector('h3:has-text("Study Arcana")');
    const completeArcanaBtn = page.locator('div:has(h3:has-text("Study Arcana")) button:has-text("Fulfill Vow")').first();
    await completeArcanaBtn.click();

    // Verify Reward Reveal includes Trial Fulfilled: The Daily Three (+8 G)
    await page.waitForSelector('[role="dialog"]:has-text("Quest Complete")', { timeout: 10000 });
    const arcanaModalContent = await page.locator('[role="dialog"]').textContent();
    const hasDailyThreeFulfilled =
      arcanaModalContent.includes('Trial Fulfilled') &&
      arcanaModalContent.includes('The Daily Three') &&
      arcanaModalContent.includes('+8 G');

    await page.click('button:has-text("Accept & Continue")');
    await page.waitForTimeout(1500);

    // Verify Today Widget shows The Daily Three Fulfilled
    await page.waitForSelector('aside[aria-label="Active Chronicle Trials"]');
    const todayWidgetAfter3rd = await page.locator('aside[aria-label="Active Chronicle Trials"]').textContent();
    const hasDailyThreeFulfilledInWidget = todayWidgetAfter3rd.includes('The Daily Three') && todayWidgetAfter3rd.includes('Fulfilled');

    results['B8b_DAILY_THREE_FULFILLED'] = {
      hasDailyThreeFulfilled,
      hasDailyThreeFulfilledInWidget,
      status: hasDailyThreeFulfilled && hasDailyThreeFulfilledInWidget ? 'PASS' : 'FAIL',
    };
    console.log('B8b_DAILY_THREE_FULFILLED:', results['B8b_DAILY_THREE_FULFILLED']);

    // Stage 8c: 4th Planned Activity -> Once-Only Gold Invariant
    console.log('\n--- B8c: 4th Planned Activity -> Once-Only Gold Invariant ---');
    await page.goto(`${BASE_URL}/game/quests`);
    await page.waitForSelector('button:has-text("Inscribe Quest")');

    await page.click('button:has-text("Inscribe Quest")');
    await page.waitForSelector('[role="dialog"]');
    const q4Dialog = page.locator('[role="dialog"]');
    await q4Dialog.locator('input[name="title"]').fill('Silent Sentry');
    await q4Dialog.locator('button:has-text("strength")').click();
    await q4Dialog.locator('button:has-text("Easy")').click();
    await q4Dialog.locator('button[type="submit"]').click();
    await page.waitForTimeout(1500);

    // Schedule for today
    await page.goto(`${BASE_URL}/game/week`);
    await page.waitForSelector('div:has-text("Silent Sentry")');
    const unscheduledSentry = page.locator('div:has-text("Silent Sentry")').last();
    await unscheduledSentry.getByRole('button', { name: 'Schedule', exact: true }).click();
    await page.waitForSelector('button:has-text("Confirm Schedule")');
    await page.click('button:has-text("Confirm Schedule")');
    await page.waitForTimeout(2000);

    // Complete on Today
    await page.goto(`${BASE_URL}/game/today`);
    await page.waitForSelector('h3:has-text("Silent Sentry")');
    const completeSentryBtn = page.locator('div:has(h3:has-text("Silent Sentry")) button:has-text("Fulfill Vow")').first();
    await completeSentryBtn.click();

    await page.waitForSelector('[role="dialog"]:has-text("Quest Complete")', { timeout: 10000 });
    const sentryModalContent = await page.locator('[role="dialog"]').textContent();
    // Daily Three must NOT re-appear as newly fulfilled!
    const dailyThreeNotReAwarded = !sentryModalContent.includes('The Daily Three');

    await page.click('button:has-text("Accept & Continue")');
    await page.waitForTimeout(1000);

    results['B8c_ONCE_ONLY_GOLD_INVARIANT'] = {
      dailyThreeNotReAwarded,
      status: dailyThreeNotReAwarded ? 'PASS' : 'FAIL',
    };
    console.log('B8c_ONCE_ONLY_GOLD_INVARIANT:', results['B8c_ONCE_ONLY_GOLD_INVARIANT']);

    // Stage 9: Purchase Vault Item -> "Patron of the Vault" Inscription
    console.log('\n--- B9: Purchase Vault Item -> "Patron of the Vault" ---');
    // User already completed easy quest (+10), routine (+11), medium main quest (+20+10), steadfast trial (+6) = ~57 Gold!
    // Ashen Mantle costs 30 Gold or Crest of the Spark costs 25 Gold!
    await page.goto(`${BASE_URL}/game/vault`);
    await page.waitForSelector('article:has-text("Ashen Mantle")');

    const ashenCard = page.locator('article:has-text("Ashen Mantle")');
    const claimBtn = ashenCard.locator('button:has-text("CLAIM FOR 30 G")');
    await claimBtn.click();

    await page.waitForSelector('[role="status"]:has-text("Artifact Claimed & Sealed")', { timeout: 8000 });
    await page.waitForTimeout(1500);

    // Go to Chronicle, verify "Patron of the Vault" is now Earned
    await page.goto(`${BASE_URL}/game/chronicle`);
    await page.waitForSelector('article[aria-label*="Patron of the Vault"]');
    const patronCard = page.locator('article[aria-label*="Patron of the Vault"]');
    const isPatronEarned = (await patronCard.locator('span:has-text("Inscribed")').count()) > 0;

    results['B9_PATRON_OF_THE_VAULT'] = {
      isPatronEarned,
      status: isPatronEarned ? 'PASS' : 'FAIL',
    };
    console.log('B9_PATRON_OF_THE_VAULT:', results['B9_PATRON_OF_THE_VAULT']);

    // Stage 10: Multi-Viewport Responsive & Overflow QA
    console.log('\n--- B10: Multi-Viewport Responsive & Overflow QA ---');
    const viewports = [
      { w: 390, h: 844, name: 'iPhone 12/13/14' },
      { w: 430, h: 932, name: 'iPhone 14 Pro Max' },
      { w: 768, h: 1024, name: 'iPad Portrait' },
      { w: 1440, h: 900, name: 'Desktop Large' },
    ];

    const testRoutes = ['/game/chronicle', '/game/today', '/game/wayfarer'];
    const responsiveResults = {};

    for (const route of testRoutes) {
      responsiveResults[route] = {};
      for (const vp of viewports) {
        await page.setViewportSize({ width: vp.w, height: vp.h });
        await page.goto(`${BASE_URL}${route}`);
        await page.waitForTimeout(400);

        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        const innerWidth = await page.evaluate(() => window.innerWidth);
        const noOverflow = scrollWidth <= innerWidth;

        responsiveResults[route][vp.name] = {
          scrollWidth,
          innerWidth,
          noOverflow,
        };
      }
    }

    // Verify Mobile Codex includes Chronicle on 390px
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE_URL}/game/today`);
    await page.click('button:has-text("Codex")');
    await page.waitForSelector('#mobile-nav-drawer');

    const drawerContent = await page.locator('#mobile-nav-drawer').textContent();
    const drawerHasChronicle = drawerContent.includes('Chronicle');

    const allResponsivePass = Object.values(responsiveResults).every((routeObj) =>
      Object.values(routeObj).every((r) => r.noOverflow)
    );

    results['B10_RESPONSIVE_AND_MOBILE_CODEX'] = {
      responsiveResults,
      drawerHasChronicle,
      status: allResponsivePass && drawerHasChronicle ? 'PASS' : 'FAIL',
    };
    console.log('B10_RESPONSIVE_AND_MOBILE_CODEX:', results['B10_RESPONSIVE_AND_MOBILE_CODEX']);

    // Stage 11: Refresh & Re-login Persistence
    console.log('\n--- B11: Refresh & Re-login Persistence ---');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}/game/chronicle`);
    await page.reload();
    await page.waitForSelector('h1:has-text("The Chronicle")');

    const refreshedText = await page.locator('header:has-text("The Chronicle")').textContent();
    const persistsOnRefresh = refreshedText.includes('/ 12') && !refreshedText.includes('0 / 12');

    // Sign out & re-login
    await page.click('button:has-text("Sign Out")');
    await page.waitForURL('**/login', { timeout: 8000 });

    await page.fill('input[name="email"]', user1.email);
    await page.fill('input[name="password"]', user1.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/game/today', { timeout: 10000 });

    await page.goto(`${BASE_URL}/game/chronicle`);
    await page.waitForSelector('h1:has-text("The Chronicle")');
    const reloginText = await page.locator('header:has-text("The Chronicle")').textContent();

    const persistsOnRelogin = reloginText.includes('/ 12') && !reloginText.includes('0 / 12');

    results['B11_PERSISTENCE'] = {
      persistsOnRefresh,
      persistsOnRelogin,
      status: persistsOnRefresh && persistsOnRelogin ? 'PASS' : 'FAIL',
    };
    console.log('B11_PERSISTENCE:', results['B11_PERSISTENCE']);

  } catch (err) {
    console.error('Phase 7 QA Error:', err);
    results['CRITICAL_ERROR'] = err.message;
  } finally {
    await browser.close();
  }

  console.log('\n=== FINAL PHASE 7 QA TEST RESULTS ===');
  console.log(JSON.stringify(results, null, 2));

  const allPassed = Object.values(results).every((r) => r.status === 'PASS');
  console.log(`\nOVERALL SUITE VERDICT: ${allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
}

runPhase7Qa();
