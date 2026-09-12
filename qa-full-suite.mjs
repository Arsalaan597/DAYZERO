import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:3000';

async function runQa() {
  const results = {};
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true,
  });

  const consoleLogs = [];
  const pageErrors = [];

  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', (msg) => {
    const text = msg.text();
    consoleLogs.push({ type: msg.type(), text });
    if (msg.type() === 'error') {
      console.log(`[PAGE CONSOLE ERROR] ${text}`);
    }
  });

  page.on('pageerror', (err) => {
    pageErrors.push(err.message);
    console.error(`[UNCAUGHT PAGE ERROR] ${err.message}`);
  });

  console.log('=== STARTING LIVE DAYZERO QA SUITE ===');

  const timestamp = Date.now();
  const qaUserA = {
    displayName: 'QA Wayfarer Prime',
    email: `qa_prime_${timestamp}@dayzero.test`,
    password: 'Password123!',
  };
  const qaUserB = {
    displayName: 'QA Wayfarer Ghost',
    email: `qa_ghost_${timestamp}@dayzero.test`,
    password: 'Password123!',
  };

  // ----------------------------------------------------
  // TEST 01 & 02: Auth, Route Protection, Signup, Persistence
  // ----------------------------------------------------
  console.log('\n--- Running TEST 01 & 02: Auth & Routes ---');
  const routeStatuses = {};

  try {
    for (const route of ['/game/today', '/game/week', '/game', '/game/wayfarer', '/game/quests']) {
      await page.goto(`${BASE_URL}${route}`);
      const url = page.url();
      routeStatuses[route] = url.includes('/login') ? 'PROTECTED (PASS)' : 'EXPOSED (FAIL)';
    }

    // Attempt invalid login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', 'invalid_user@dayzero.test');
    await page.fill('input[name="password"]', 'wrongpass');
    await page.click('button[type="submit"]');
    await page.waitForSelector('p[role="alert"]', { timeout: 8000 }).catch(() => {});
    const invalidLoginAlert = await page.locator('p[role="alert"]').first().textContent().catch(() => null);
    const invalidLoginPass = Boolean(invalidLoginAlert && invalidLoginAlert.toLowerCase().includes('invalid'));

    // Signup User A
    await page.goto(`${BASE_URL}/signup`);
    await page.fill('input[name="display-name"]', qaUserA.displayName);
    await page.fill('input[name="email"]', qaUserA.email);
    await page.fill('input[name="password"]', qaUserA.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/game/today', { timeout: 15000 });

    const landedOnToday = page.url().includes('/game/today');

    // Refresh persistence check
    await page.reload();
    const reloadPersisted = page.url().includes('/game/today');

    results['TEST_01_ROUTES'] = { routeStatuses, status: landedOnToday ? 'PASS' : 'FAIL' };
    results['TEST_02_AUTH'] = {
      invalidLoginDetected: invalidLoginPass,
      signupSuccess: landedOnToday,
      sessionPersistenceOnRefresh: reloadPersisted,
      status: invalidLoginPass && landedOnToday && reloadPersisted ? 'PASS' : 'FAIL',
    };
  } catch (err) {
    console.error('Test 01/02 error:', err.message);
    results['TEST_01_ROUTES'] = { error: err.message, status: 'FAIL' };
    results['TEST_02_AUTH'] = { error: err.message, status: 'FAIL' };
  }

  // ----------------------------------------------------
  // TEST 03: Today Screen Inspection
  // ----------------------------------------------------
  console.log('\n--- Running TEST 03: Today Screen ---');
  try {
    const todayHeader = await page.textContent('h1');
    const flameCount = await page.locator('text=Zeroflame').count();
    const emptyStateVisible = (await page.locator('text=Seven Days. Nothing Written Yet.').count()) > 0;
    const streakDisplayed = (await page.locator('text=0-Day Streak').count()) > 0 || (await page.locator('text=Streak').count()) > 0;

    results['TEST_03_TODAY'] = {
      todayHeader,
      emptyStateVisible,
      streakDisplayed,
      flameCount,
      status: emptyStateVisible && flameCount > 0 ? 'PASS' : 'FAIL',
    };
  } catch (err) {
    console.error('Test 03 error:', err.message);
    results['TEST_03_TODAY'] = { error: err.message, status: 'FAIL' };
  }

  // ----------------------------------------------------
  // TEST 04: Week Screen & Routine Creation
  // ----------------------------------------------------
  console.log('\n--- Running TEST 04: Week Screen & Routine Creation ---');
  try {
    await page.goto(`${BASE_URL}/game/week`);
    await page.waitForTimeout(1000);

    // Open Routine Dialog
    await page.click('button:has-text("+ Routine")');
    await page.waitForTimeout(500);

    const titleInput = page.locator('input[name="title"]');
    const isTitleVisible = await titleInput.isVisible();
    const titleBoundingBox = await titleInput.boundingBox();

    // Create Routine A: Morning Reading (Intellect, Light, Routine, today [Saturday] + weekdays)
    const formA = page.locator('form:has(input[name="title"])');
    await formA.locator('input[name="title"]').fill('Morning Reading');
    await formA.locator('textarea[name="description"]').fill('Ancient lore analysis and documentation study.');
    await formA.locator('button:has-text("INTELLECT")').first().click();
    await formA.locator('button:has-text("Light")').first().click();
    await formA.locator('button:has-text("Routine")').first().click();
    await formA.locator('button:has-text("Sat")').first().click(); // Ensure Saturday (Today) is included
    await formA.locator('input[type="time"]').fill('08:00');
    await formA.locator('input[type="number"]').fill('20');

    // Submit Routine A
    await formA.locator('button[type="submit"]').click();
    await page.waitForTimeout(2500);

    // Create Routine B: Gym (Strength, Standard, Challenging, today [Saturday])
    await page.click('button:has-text("+ Routine")');
    await page.waitForTimeout(500);
    const formB = page.locator('form:has(input[name="title"])');
    await formB.locator('input[name="title"]').fill('Gym');
    await formB.locator('textarea[name="description"]').fill('Physical trial and endurance building.');
    await formB.locator('button:has-text("STRENGTH")').first().click();
    await formB.locator('button:has-text("Standard")').first().click();
    await formB.locator('button:has-text("Challenging")').first().click();
    await formB.locator('button:has-text("Sat")').first().click(); // Ensure Saturday (Today) is included
    await formB.locator('input[type="time"]').fill('18:00');
    await formB.locator('input[type="number"]').fill('60');
    await formB.locator('button[type="submit"]').click();
    await page.waitForTimeout(2500);

    // Verify routines appear in week list / routines manager
    await page.locator('button:has-text("Routines (")').first().click();
    await page.waitForTimeout(500);
    const routinesListText = await page.content();
    const routineACreated = routinesListText.includes('Morning Reading');
    const routineBCreated = routinesListText.includes('Gym');

    results['TEST_04_WEEK_ROUTINES'] = {
      isTitleVisible,
      titleBoundingBox,
      routineACreated,
      routineBCreated,
      status: isTitleVisible && routineACreated && routineBCreated ? 'PASS' : 'FAIL',
    };
  } catch (err) {
    console.error('Test 04 error:', err.message);
    results['TEST_04_WEEK_ROUTINES'] = { error: err.message, status: 'FAIL' };
  }

  // ----------------------------------------------------
  // TEST 05 & 06: Today Run Generation, Completion & Exact Rewards
  // ----------------------------------------------------
  console.log('\n--- Running TEST 05 & 06: Routine Generation & Exact Reward Model ---');
  try {
    await page.goto(`${BASE_URL}/game/today`);
    await page.waitForTimeout(2000);

    const todayPageContent = await page.content();
    const morningOnToday = todayPageContent.includes('Morning Reading');
    const gymOnToday = todayPageContent.includes('Gym');

    // Complete Morning Reading
    const morningCard = page.locator('div:has-text("Morning Reading")').filter({ hasText: 'Fulfill Vow' }).last();
    await morningCard.locator('button:has-text("Fulfill Vow")').click();

    await page.waitForSelector('[role="dialog"]:has-text("Quest Complete")', { timeout: 8000 });
    const revealContent = await page.locator('[role="dialog"]').textContent();

    const has15Xp = revealContent.includes('+15 XP');
    const has6Gold = revealContent.includes('+6 G');
    const has4Intellect = revealContent.includes('+4 intellect');

    await page.click('button:has-text("Accept & Continue")');
    await page.waitForTimeout(1000);

    // Complete Gym
    const gymCard = page.locator('div:has-text("Gym")').filter({ hasText: 'Fulfill Vow' }).last();
    await gymCard.locator('button:has-text("Fulfill Vow")').click();
    await page.waitForSelector('[role="dialog"]:has-text("Quest Complete")', { timeout: 8000 });
    const gymRevealContent = await page.locator('[role="dialog"]').textContent();

    const has38Xp = gymRevealContent.includes('+38 XP');
    const has15Gold = gymRevealContent.includes('+15 G');
    const has8Strength = gymRevealContent.includes('+8 strength');

    await page.click('button:has-text("Accept & Continue")');
    await page.waitForTimeout(1000);

    // Check Wayfarer stats after both completions
    await page.goto(`${BASE_URL}/game/wayfarer`);
    await page.waitForTimeout(1000);
    const wayfarerPostText = await page.content();
    const xpPersisted = wayfarerPostText.includes('53');
    const goldPersisted = wayfarerPostText.includes('21');
    const intellectPersisted = wayfarerPostText.includes('4');
    const strengthPersisted = wayfarerPostText.includes('8');
    const streakPersisted = wayfarerPostText.includes('1 Day');

    results['TEST_05_GENERATION'] = {
      morningOnToday,
      gymOnToday,
      status: morningOnToday && gymOnToday ? 'PASS' : 'FAIL',
    };

    results['TEST_06_REWARDS'] = {
      morningReadingExpected: { xp: 15, gold: 6, attr: 4 },
      morningReadingActual: { has15Xp, has6Gold, has4Intellect },
      gymExpected: { xp: 38, gold: 15, attr: 8 },
      gymActual: { has38Xp, has15Gold, has8Strength },
      wayfarerPersistence: { xpPersisted, goldPersisted, intellectPersisted, strengthPersisted, streakPersisted },
      status: has15Xp && has6Gold && has4Intellect && has38Xp && has15Gold && has8Strength && xpPersisted && goldPersisted ? 'PASS' : 'FAIL',
    };
  } catch (err) {
    console.error('Test 05/06 error:', err.message);
    results['TEST_05_GENERATION'] = { error: err.message, status: 'FAIL' };
    results['TEST_06_REWARDS'] = { error: err.message, status: 'FAIL' };
  }

  // ----------------------------------------------------
  // TEST 07: Double Completion
  // ----------------------------------------------------
  console.log('\n--- Running TEST 07: Double Completion / Farming ---');
  try {
    await page.goto(`${BASE_URL}/game/today`);
    await page.waitForTimeout(1000);
    const activeButtons = await page.locator('button:has-text("Fulfill Vow")').count();

    results['TEST_07_DOUBLE_COMPLETION'] = {
      activeButtonsForCompleted: activeButtons,
      status: activeButtons === 0 ? 'PASS' : 'FAIL',
    };
  } catch (err) {
    console.error('Test 07 error:', err.message);
    results['TEST_07_DOUBLE_COMPLETION'] = { error: err.message, status: 'FAIL' };
  }

  // ----------------------------------------------------
  // TEST 09, 10, 11: Quest CRUD, Scheduling, Main Quest
  // ----------------------------------------------------
  console.log('\n--- Running TEST 09, 10, 11: Quest CRUD, Scheduling, Main Quest ---');
  try {
    await page.goto(`${BASE_URL}/game/quests`);
    await page.waitForTimeout(1000);

    // Click header "+ Inscribe Quest" button
    await page.click('header ~ * button:has-text("Inscribe Quest"), button:has-text("+ Inscribe Quest")');
    await page.waitForTimeout(500);

    // Fill form inside modal
    const questDialog = page.locator('[role="dialog"]');
    await questDialog.locator('input[name="title"]').fill('Finish DAYZERO README');
    await questDialog.locator('textarea[name="description"]').fill('Comprehensive documentation of the life scheduler architecture.');
    await questDialog.locator('button:has-text("intellect")').click();
    await questDialog.locator('button:has-text("Hard")').click();
    await questDialog.locator('button[type="submit"]').click();
    await page.waitForTimeout(2500);

    const questListText = await page.content();
    const questCreated = questListText.includes('Finish DAYZERO README');

    // Go to Week view and schedule it
    await page.goto(`${BASE_URL}/game/week`);
    await page.waitForTimeout(1000);

    // In unscheduled quests section, click "Schedule"
    const scheduleBtn = page.locator('div:has-text("Finish DAYZERO README") button:has-text("Schedule")').first();
    const hasUnscheduled = (await scheduleBtn.count()) > 0;
    if (hasUnscheduled) {
      await scheduleBtn.click();
      await page.waitForTimeout(500);

      // Toggle Main Quest
      await page.click('input#main-quest-toggle');
      await page.click('button:has-text("Confirm Schedule")');
      await page.waitForTimeout(2500);
    }

    // Verify it appears on Today as Primary Directive / Main Quest
    await page.goto(`${BASE_URL}/game/today`);
    await page.waitForTimeout(1000);
    const todayWithMain = await page.content();
    const mainQuestDisplayed = todayWithMain.includes('Primary Directive') && todayWithMain.includes('Finish DAYZERO README');

    // Complete Main Quest and verify Additive Bonus:
    // Hard (100 XP, 40 Gold) + Main Quest (+20 XP, +10 Gold) = 120 XP, 50 Gold, +20 Intellect.
    const mainQuestCard = page.locator('div:has-text("Finish DAYZERO README")').filter({ hasText: 'Fulfill Vow' }).last();
    let mainQuestRewardsVerified = false;

    if ((await mainQuestCard.count()) > 0) {
      await mainQuestCard.locator('button:has-text("Fulfill Vow")').click();
      await page.waitForSelector('[role="dialog"]:has-text("Quest Complete")', { timeout: 8000 });
      const mqReveal = await page.locator('[role="dialog"]').textContent();

      const has120Xp = mqReveal.includes('+120 XP');
      const has50Gold = mqReveal.includes('+50 G');
      const has20Intellect = mqReveal.includes('+20 intellect');
      const hasLevelUp = mqReveal.includes('Level Ascended');

      mainQuestRewardsVerified = has120Xp && has50Gold && has20Intellect && hasLevelUp;
      await page.click('button:has-text("Accept & Continue")');
    }

    results['TEST_09_QUEST_CRUD'] = { questCreated, status: questCreated ? 'PASS' : 'FAIL' };
    results['TEST_10_SCHEDULING'] = { hasUnscheduled, status: hasUnscheduled ? 'PASS' : 'FAIL' };
    results['TEST_11_MAIN_QUEST'] = {
      mainQuestDisplayed,
      mainQuestRewardsVerified,
      status: mainQuestDisplayed && mainQuestRewardsVerified ? 'PASS' : 'FAIL',
    };
  } catch (err) {
    console.error('Test 09/10/11 error:', err.message);
    results['TEST_09_QUEST_CRUD'] = { error: err.message, status: 'FAIL' };
    results['TEST_10_SCHEDULING'] = { error: err.message, status: 'FAIL' };
    results['TEST_11_MAIN_QUEST'] = { error: err.message, status: 'FAIL' };
  }

  // ----------------------------------------------------
  // TEST 14, 15, 17: Level, Attributes & Wayfarer
  // ----------------------------------------------------
  console.log('\n--- Running TEST 14, 15, 17: Level & Wayfarer Inspection ---');
  try {
    await page.goto(`${BASE_URL}/game/wayfarer`);
    await page.waitForTimeout(1000);
    const wayfarerCodex = await page.locator('article[aria-label="Wayfarer Character Codex"]').textContent();

    // Prior XP: 53. Main Quest gave +120 XP -> Total XP: 173 XP.
    // calculate_level(173) -> Level 2 with (73 / 282 XP to Level 3)
    const levelIs2 = wayfarerCodex.includes('Level 2');
    const xpBreakdown = wayfarerCodex.includes('73 / 282');
    const goldIs71 = wayfarerCodex.includes('71'); // 21 + 50 = 71
    const intellectIs24 = wayfarerCodex.includes('24'); // 4 + 20 = 24
    const tzDisplayed = wayfarerCodex.includes('Temporal Anchor');

    results['TEST_14_LEVEL'] = { levelIs2, xpBreakdown, status: levelIs2 && xpBreakdown ? 'PASS' : 'FAIL' };
    results['TEST_15_ATTRIBUTES'] = { intellectIs24, goldIs71, status: intellectIs24 && goldIs71 ? 'PASS' : 'FAIL' };
    results['TEST_17_WAYFARER'] = { tzDisplayed, levelIs2, status: tzDisplayed && levelIs2 ? 'PASS' : 'FAIL' };
  } catch (err) {
    console.error('Test 14/15/17 error:', err.message);
    results['TEST_14_LEVEL'] = { error: err.message, status: 'FAIL' };
    results['TEST_15_ATTRIBUTES'] = { error: err.message, status: 'FAIL' };
    results['TEST_17_WAYFARER'] = { error: err.message, status: 'FAIL' };
  }

  // ----------------------------------------------------
  // TEST 18: Realm Map
  // ----------------------------------------------------
  console.log('\n--- Running TEST 18: Realm Map ---');
  try {
    await page.goto(`${BASE_URL}/game`);
    await page.waitForTimeout(1000);
    const realmContent = await page.content();
    const hasAcademy = realmContent.includes('The Academy');
    const hasWilds = realmContent.includes('The Wilds');
    const hasForge = realmContent.includes('The Forge');
    const hasSanctuary = realmContent.includes('The Sanctuary');
    const hasAtelier = realmContent.includes('The Atelier');
    const hasZeroflame = realmContent.includes('Zeroflame');
    const noDeadAcademyLink = !realmContent.includes('href="/game/academy"');

    results['TEST_18_REALM_MAP'] = {
      hasAcademy,
      hasWilds,
      hasForge,
      hasSanctuary,
      hasAtelier,
      hasZeroflame,
      noDeadAcademyLink,
      status: hasAcademy && hasWilds && hasForge && hasSanctuary && hasAtelier && noDeadAcademyLink ? 'PASS' : 'FAIL',
    };
  } catch (err) {
    console.error('Test 18 error:', err.message);
    results['TEST_18_REALM_MAP'] = { error: err.message, status: 'FAIL' };
  }

  // ----------------------------------------------------
  // TEST 21: Responsive Viewports
  // ----------------------------------------------------
  console.log('\n--- Running TEST 21: Responsive / Viewports ---');
  try {
    // Mobile viewport test (390x844)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE_URL}/game/today`);
    await page.waitForTimeout(1000);
    const mobileHorizontalScroll = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);

    await page.goto(`${BASE_URL}/game/week`);
    await page.waitForTimeout(1000);
    const mobileWeekHorizontalScroll = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    const mobileDayTabsVisible = (await page.locator('button:has-text("Today")').count()) > 0 || (await page.locator('text=Sun').count()) > 0;

    // Test Routine Dialog on Mobile
    await page.click('button:has-text("+ Routine")');
    await page.waitForTimeout(500);
    const dialogVisibleOnMobile = await page.locator('#routine-dialog-title').isVisible();
    const titleVisibleOnMobile = await page.locator('input[name="title"]').isVisible();
    const cancelVisibleOnMobile = await page.locator('button:has-text("Cancel")').isVisible();
    await page.click('button:has-text("Cancel")');

    // Reset to desktop
    await page.setViewportSize({ width: 1440, height: 900 });

    results['TEST_21_RESPONSIVE'] = {
      mobileHorizontalScrollToday: mobileHorizontalScroll,
      mobileHorizontalScrollWeek: mobileWeekHorizontalScroll,
      mobileDayTabsVisible,
      dialogVisibleOnMobile,
      titleVisibleOnMobile,
      cancelVisibleOnMobile,
      // Note: flag mobile horizontal scroll defect
      status: !mobileHorizontalScroll ? 'PASS' : 'FAIL (Defect: Mobile Horizontal Overflow)',
    };
  } catch (err) {
    console.error('Test 21 error:', err.message);
    results['TEST_21_RESPONSIVE'] = { error: err.message, status: 'FAIL' };
  }

  // ----------------------------------------------------
  // TEST 20: Multi-User Isolation
  // ----------------------------------------------------
  console.log('\n--- Running TEST 20: Multi-User Isolation ---');
  try {
    // Sign out User A
    await page.click('button:has-text("Sign Out")');
    await page.waitForURL('**/login', { timeout: 8000 });

    // Sign up User B
    await page.goto(`${BASE_URL}/signup`);
    await page.fill('input[name="display-name"]', qaUserB.displayName);
    await page.fill('input[name="email"]', qaUserB.email);
    await page.fill('input[name="password"]', qaUserB.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/game/today', { timeout: 15000 });

    // User B's Today should be clean empty state, NOT containing User A's Morning Reading or Gym or README
    const userBTodayContent = await page.content();
    const leakedMorningReading = userBTodayContent.includes('Morning Reading');
    const leakedGym = userBTodayContent.includes('Gym');
    const leakedReadme = userBTodayContent.includes('Finish DAYZERO README');
    const userBEmptyState = userBTodayContent.includes('Seven Days. Nothing Written Yet.');

    results['TEST_20_ISOLATION'] = {
      leakedMorningReading,
      leakedGym,
      leakedReadme,
      userBEmptyState,
      status: !leakedMorningReading && !leakedGym && !leakedReadme && userBEmptyState ? 'PASS' : 'FAIL',
    };
  } catch (err) {
    console.error('Test 20 error:', err.message);
    results['TEST_20_ISOLATION'] = { error: err.message, status: 'FAIL' };
  }

  results['CONSOLE_ERRORS'] = consoleLogs.filter((l) => l.type === 'error');
  results['PAGE_ERRORS'] = pageErrors;

  await browser.close();

  console.log('\n=== LIVE QA COMPLETE ===');
  console.log(JSON.stringify(results, null, 2));

  return results;
}

runQa().catch((err) => {
  console.error('QA Runner encountered fatal error:', err);
  process.exit(1);
});
