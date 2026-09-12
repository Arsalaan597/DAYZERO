import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:3000';

async function runPhase6Qa() {
  console.log('=== STARTING LIVE DAYZERO PHASE 6 QA SUITE ===');
  const results = {};
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true,
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  const timestamp = Date.now();
  const qaUser = {
    displayName: 'Vault Seeker QA',
    email: `vault_seeker_${timestamp}@dayzero.test`,
    password: 'Password123!',
  };

  try {
    // ----------------------------------------------------
    // STAGE 1: Signup Fresh User
    // ----------------------------------------------------
    console.log('\n--- STAGE 1: Signup Fresh User ---');
    await page.goto(`${BASE_URL}/signup`);
    await page.fill('input[name="display-name"]', qaUser.displayName);
    await page.fill('input[name="email"]', qaUser.email);
    await page.fill('input[name="password"]', qaUser.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/game/today', { timeout: 10000 });
    console.log('User signed up successfully. At /game/today');

    // ----------------------------------------------------
    // STAGE 2: Wayfarer Default Appearance Inspection
    // ----------------------------------------------------
    console.log('\n--- STAGE 2: Inspect Default Wayfarer ---');
    await page.goto(`${BASE_URL}/game/wayfarer`);
    await page.waitForSelector('article[aria-label="Wayfarer Character Codex"]');

    const defaultContent = await page.locator('article[aria-label="Wayfarer Character Codex"]').textContent();
    const hasDefaultTitle = defaultContent.includes('Initiate of the First Spark');
    const hasEnterVaultCta = defaultContent.includes('ENTER THE VAULT');
    const hasInitialGold0 = defaultContent.includes('0 G');
    const hasDefaultMantle = defaultContent.includes('Mantle: Wanderer');
    const hasDefaultCrest = defaultContent.includes('Crest: Spark');

    results['STAGE_02_DEFAULT_WAYFARER'] = {
      hasDefaultTitle,
      hasEnterVaultCta,
      hasInitialGold0,
      hasDefaultMantle,
      hasDefaultCrest,
      status: hasDefaultTitle && hasEnterVaultCta && hasInitialGold0 && hasDefaultMantle && hasDefaultCrest ? 'PASS' : 'FAIL',
    };
    console.log('STAGE_02_DEFAULT_WAYFARER:', results['STAGE_02_DEFAULT_WAYFARER']);

    // ----------------------------------------------------
    // STAGE 3: Enter The Vault via CTA
    // ----------------------------------------------------
    console.log('\n--- STAGE 3: Enter The Vault via CTA ---');
    await page.click('a:has-text("ENTER THE VAULT")');
    await page.waitForURL('**/game/vault', { timeout: 8000 });

    const vaultHeader = await page.textContent('h1');
    const hasVaultTitle = vaultHeader.includes('The Vault');
    const hasTabs = (await page.locator('[role="tab"]').count()) === 3;
    const initialCardsCount = await page.locator('article').count();

    // Check tabs
    await page.click('button[role="tab"]:has-text("Insignia Crests")');
    await page.waitForTimeout(300);
    const crestsCardsCount = await page.locator('article').count();

    await page.click('button[role="tab"]:has-text("Wayfarer Titles")');
    await page.waitForTimeout(300);
    const titlesCardsCount = await page.locator('article').count();

    await page.click('button[role="tab"]:has-text("Mantles & Cloaks")');
    await page.waitForTimeout(300);

    // Initial item states when Gold is 0
    const cardButtons = await page.locator('article button').allTextContents();
    const allInsufficientOrLocked = cardButtons.every(
      (btn) => btn.includes('NEED MORE GOLD') || btn.includes('LOCKED')
    );

    results['STAGE_03_VAULT_NAVIGATION_AND_CATALOG'] = {
      hasVaultTitle,
      hasTabs,
      mantlesCount: initialCardsCount,
      crestsCount: crestsCardsCount,
      titlesCount: titlesCardsCount,
      allInsufficientOrLocked,
      status: hasVaultTitle && hasTabs && initialCardsCount === 4 && crestsCardsCount === 4 && titlesCardsCount === 4 && allInsufficientOrLocked ? 'PASS' : 'FAIL',
    };
    console.log('STAGE_03_VAULT_NAVIGATION_AND_CATALOG:', results['STAGE_03_VAULT_NAVIGATION_AND_CATALOG']);

    // ----------------------------------------------------
    // STAGE 4: Earn Gold through Real Quests
    // ----------------------------------------------------
    console.log('\n--- STAGE 4: Earn Gold (Hard Quest 40G + Hard Quest 40G = 80G) ---');
    await page.goto(`${BASE_URL}/game/quests`);
    await page.waitForTimeout(1000);

    // Create Quest 1 (Hard, Intellect) -> 40 Gold
    await page.click('button:has-text("Inscribe Quest")');
    await page.waitForSelector('[role="dialog"]');
    const questDialog1 = page.locator('[role="dialog"]');
    await questDialog1.locator('input[name="title"]').fill('Study Ancient Arcana');
    await questDialog1.locator('button:has-text("intellect")').click();
    await questDialog1.locator('button:has-text("Hard")').click();
    await questDialog1.locator('button[type="submit"]').click();
    await page.waitForTimeout(2000);

    // Create Quest 2 (Hard, Strength) -> 40 Gold
    await page.click('button:has-text("Inscribe Quest")');
    await page.waitForSelector('[role="dialog"]');
    const questDialog2 = page.locator('[role="dialog"]');
    await questDialog2.locator('input[name="title"]').fill('Wilderness Trial');
    await questDialog2.locator('button:has-text("strength")').click();
    await questDialog2.locator('button:has-text("Hard")').click();
    await questDialog2.locator('button[type="submit"]').click();
    await page.waitForTimeout(2000);

    // Fulfill Quest 1
    const fulfillBtn1 = page.locator('button:has-text("Complete Quest")').first();
    await fulfillBtn1.click();
    await page.waitForSelector('[role="dialog"]:has-text("Quest Complete")', { timeout: 8000 });
    await page.click('button:has-text("Accept & Continue")');
    await page.waitForTimeout(1000);

    // Fulfill Quest 2
    const fulfillBtn2 = page.locator('button:has-text("Complete Quest")').first();
    await fulfillBtn2.click();
    await page.waitForSelector('[role="dialog"]:has-text("Quest Complete")', { timeout: 8000 });
    await page.click('button:has-text("Accept & Continue")');
    await page.waitForTimeout(1000);

    // Check Wayfarer Gold
    await page.goto(`${BASE_URL}/game/wayfarer`);
    const wayfarerGoldText = await page.locator('article[aria-label="Wayfarer Character Codex"]').textContent();
    const hasGold80 = wayfarerGoldText.includes('80 G');

    results['STAGE_04_EARN_GOLD'] = {
      hasGold80,
      status: hasGold80 ? 'PASS' : 'FAIL',
    };
    console.log('STAGE_04_EARN_GOLD:', results['STAGE_04_EARN_GOLD']);

    // ----------------------------------------------------
    // STAGE 5: Purchase Ashen Mantle (30G) with Acquisition Reveal
    // ----------------------------------------------------
    console.log('\n--- STAGE 5: Purchase Ashen Mantle (30 G) ---');
    await page.goto(`${BASE_URL}/game/vault`);
    await page.waitForSelector('article:has-text("Ashen Mantle")');

    const ashenCard = page.locator('article:has-text("Ashen Mantle")');
    const claimBtn = ashenCard.locator('button:has-text("CLAIM FOR 30 G")');
    await claimBtn.click();

    // Verify Acquisition Toast
    await page.waitForSelector('[role="status"]:has-text("Artifact Claimed & Sealed")', { timeout: 8000 });
    const toastText = await page.locator('[role="status"]').textContent();
    const hasAshenInToast = toastText.includes('Ashen Mantle');

    // Verify Gold decremented to 50 G (80 - 30 = 50)
    const vaultGoldText = await page.locator('div:has-text("Available Tribute")').last().textContent();
    const hasGold50 = vaultGoldText.includes('50 G');

    // Card now displays EQUIP COSMETIC button
    const equipMantleBtn = ashenCard.locator('button:has-text("EQUIP COSMETIC")');
    const hasEquipButton = (await equipMantleBtn.count()) > 0;

    results['STAGE_05_PURCHASE_MANTLE'] = {
      hasAshenInToast,
      hasGold50,
      hasEquipButton,
      status: hasAshenInToast && hasGold50 && hasEquipButton ? 'PASS' : 'FAIL',
    };
    console.log('STAGE_05_PURCHASE_MANTLE:', results['STAGE_05_PURCHASE_MANTLE']);

    // ----------------------------------------------------
    // STAGE 6: Equip Mantle & Verify Instant Wayfarer Reflection
    // ----------------------------------------------------
    console.log('\n--- STAGE 6: Equip Mantle ---');
    await equipMantleBtn.click();
    await page.waitForSelector('button:has-text("CURRENTLY EQUIPPED")');

    // Navigate to Wayfarer
    await page.goto(`${BASE_URL}/game/wayfarer`);
    const wayfarerTextAfterEquip = await page.locator('article[aria-label="Wayfarer Character Codex"]').textContent();
    const hasMantleAshen = wayfarerTextAfterEquip.includes('Mantle: Ashen Mantle');
    const hasLayerClass = (await page.locator('g.mantle-ash-cloak').count()) > 0;

    results['STAGE_06_EQUIP_MANTLE_AND_WAYFARER_LAYER'] = {
      hasMantleAshen,
      hasLayerClass,
      status: hasMantleAshen && hasLayerClass ? 'PASS' : 'FAIL',
    };
    console.log('STAGE_06_EQUIP_MANTLE_AND_WAYFARER_LAYER:', results['STAGE_06_EQUIP_MANTLE_AND_WAYFARER_LAYER']);

    // ----------------------------------------------------
    // STAGE 7: Purchase Crest of the Spark (25 G) & Equip
    // ----------------------------------------------------
    console.log('\n--- STAGE 7: Purchase & Equip Crest of the Spark (25 G) ---');
    await page.goto(`${BASE_URL}/game/vault`);
    await page.click('button[role="tab"]:has-text("Insignia Crests")');
    await page.waitForTimeout(400);

    const sparkCard = page.locator('article:has-text("Crest of the Spark")');
    await sparkCard.locator('button:has-text("CLAIM FOR 25 G")').click();
    await page.waitForSelector('[role="status"]:has-text("Artifact Claimed & Sealed")');

    // Equip Crest
    await sparkCard.locator('button:has-text("EQUIP COSMETIC")').click();
    await page.waitForSelector('button:has-text("CURRENTLY EQUIPPED")');

    // Verify Gold is now 25 G (50 - 25 = 25)
    const goldAfterCrest = (await page.locator('div:has-text("Available Tribute")').last().textContent()).includes('25 G');

    results['STAGE_07_PURCHASE_AND_EQUIP_CREST'] = {
      goldAfterCrest,
      status: goldAfterCrest ? 'PASS' : 'FAIL',
    };
    console.log('STAGE_07_PURCHASE_AND_EQUIP_CREST:', results['STAGE_07_PURCHASE_AND_EQUIP_CREST']);

    // ----------------------------------------------------
    // STAGE 8: Purchase Title "The Seeker" (25 G) & Equip
    // ----------------------------------------------------
    console.log('\n--- STAGE 8: Purchase & Equip Title The Seeker (25 G) ---');
    await page.click('button[role="tab"]:has-text("Wayfarer Titles")');
    await page.waitForTimeout(400);

    const titleCard = page.locator('article:has-text("The Seeker")');
    await titleCard.locator('button:has-text("CLAIM FOR 25 G")').click();
    await page.waitForSelector('[role="status"]:has-text("Artifact Claimed & Sealed")');

    await titleCard.locator('button:has-text("EQUIP COSMETIC")').click();
    await page.waitForSelector('button:has-text("CURRENTLY EQUIPPED")');

    // Verify Gold is now 0 G (25 - 25 = 0)
    const goldAfterTitle = (await page.locator('div:has-text("Available Tribute")').last().textContent()).includes('0 G');

    results['STAGE_08_PURCHASE_AND_EQUIP_TITLE'] = {
      goldAfterTitle,
      status: goldAfterTitle ? 'PASS' : 'FAIL',
    };
    console.log('STAGE_08_PURCHASE_AND_EQUIP_TITLE:', results['STAGE_08_PURCHASE_AND_EQUIP_TITLE']);

    // ----------------------------------------------------
    // STAGE 9: Full Identity Verification on Wayfarer Page
    // ----------------------------------------------------
    console.log('\n--- STAGE 9: Full Identity Verification on Wayfarer ---');
    await page.goto(`${BASE_URL}/game/wayfarer`);
    const fullWayfarerText = await page.locator('article[aria-label="Wayfarer Character Codex"]').textContent();

    const showsSeekerTitle = fullWayfarerText.includes('The Seeker');
    const showsAshenMantle = fullWayfarerText.includes('Mantle: Ashen Mantle');
    const showsSparkCrest = fullWayfarerText.includes('Crest: Crest of the Spark');
    const showsGold0 = fullWayfarerText.includes('0 G');
    const hasCrestLayerClass = (await page.locator('g.crest-ember-spark').count()) > 0;
    const hasMantleLayerClass = (await page.locator('g.mantle-ash-cloak').count()) > 0;

    results['STAGE_09_WAYFARER_FULL_IDENTITY'] = {
      showsSeekerTitle,
      showsAshenMantle,
      showsSparkCrest,
      showsGold0,
      hasCrestLayerClass,
      hasMantleLayerClass,
      status: showsSeekerTitle && showsAshenMantle && showsSparkCrest && showsGold0 && hasCrestLayerClass && hasMantleLayerClass ? 'PASS' : 'FAIL',
    };
    console.log('STAGE_09_WAYFARER_FULL_IDENTITY:', results['STAGE_09_WAYFARER_FULL_IDENTITY']);

    // ----------------------------------------------------
    // STAGE 10: Hard Refresh Persistence Test
    // ----------------------------------------------------
    console.log('\n--- STAGE 10: Hard Refresh Persistence Test ---');
    await page.reload({ waitUntil: 'networkidle' });
    const refreshedText = await page.locator('article[aria-label="Wayfarer Character Codex"]').textContent();

    const persistTitle = refreshedText.includes('The Seeker');
    const persistMantle = refreshedText.includes('Mantle: Ashen Mantle');
    const persistCrest = refreshedText.includes('Crest: Crest of the Spark');
    const persistCrestSvg = (await page.locator('g.crest-ember-spark').count()) > 0;
    const persistMantleSvg = (await page.locator('g.mantle-ash-cloak').count()) > 0;

    results['STAGE_10_REFRESH_PERSISTENCE'] = {
      persistTitle,
      persistMantle,
      persistCrest,
      persistCrestSvg,
      persistMantleSvg,
      status: persistTitle && persistMantle && persistCrest && persistCrestSvg && persistMantleSvg ? 'PASS' : 'FAIL',
    };
    console.log('STAGE_10_REFRESH_PERSISTENCE:', results['STAGE_10_REFRESH_PERSISTENCE']);

    // ----------------------------------------------------
    // STAGE 11: Multi-Viewport Responsive & Mobile Codex Test
    // ----------------------------------------------------
    console.log('\n--- STAGE 11: Multi-Viewport & Mobile Codex Test ---');
    const viewports = [
      { w: 390, h: 844, name: 'iPhone 12/13/14' },
      { w: 430, h: 932, name: 'iPhone 14 Pro Max' },
      { w: 768, h: 1024, name: 'iPad Portrait' },
      { w: 1440, h: 900, name: 'MacBook Desktop' },
    ];

    const viewportResults = {};
    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.w, height: vp.h });
      await page.goto(`${BASE_URL}/game/vault`);
      await page.waitForTimeout(500);

      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const innerWidth = await page.evaluate(() => window.innerWidth);
      const noOverflow = scrollWidth <= innerWidth;

      viewportResults[vp.name] = {
        viewport: `${vp.w}x${vp.h}`,
        scrollWidth,
        innerWidth,
        noOverflow,
      };
    }

    // Verify Mobile Codex Drawer includes Vault on 390px
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE_URL}/game/today`);
    await page.click('button:has-text("Codex")');
    await page.waitForSelector('#mobile-nav-drawer');

    const drawerText = await page.locator('#mobile-nav-drawer').textContent();
    const drawerHasVault = drawerText.includes('Vault');

    results['STAGE_11_RESPONSIVE_AND_DRAWER'] = {
      viewportResults,
      drawerHasVault,
      status: Object.values(viewportResults).every((v) => v.noOverflow) && drawerHasVault ? 'PASS' : 'FAIL',
    };
    console.log('STAGE_11_RESPONSIVE_AND_DRAWER:', results['STAGE_11_RESPONSIVE_AND_DRAWER']);

  } catch (err) {
    console.error('Phase 6 QA Suite error:', err);
    results['CRITICAL_ERROR'] = err.message;
  } finally {
    await browser.close();
  }

  console.log('\n=== FINAL PHASE 6 LIVE QA RESULTS ===');
  console.log(JSON.stringify(results, null, 2));
}

runPhase6Qa();
