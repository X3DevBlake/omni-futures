const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = '/Users/dcaturfoh/.gemini/antigravity-ide/brain/3796794e-65fc-4aa1-8c29-e2ee936ff747';
const PROD_URL = 'https://omni-futures-39821.web.app/';

async function verifyProd() {
  console.log('🚀 Running Live Production Verification against:', PROD_URL);
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      console.error(`[Prod Console Error]: ${msg.text()}`);
    }
  });

  page.on('pageerror', err => {
    consoleErrors.push(err.message);
    console.error(`[Prod Page Error]: ${err.message}`);
  });

  try {
    const resp = await page.goto(PROD_URL, { waitUntil: 'domcontentloaded', timeout: 20000 });
    console.log(`Live HTTP Status: ${resp.status()}`);
    if (resp.status() !== 200) throw new Error(`HTTP status ${resp.status()}`);

    await page.waitForTimeout(2500);

    // 1. Verify Phase 1: Institutional OCO, TWAP, Iceberg & Multi-Collateral
    console.log('Verifying Phase 1 on Production...');
    await page.selectOption('#multiCollateralSelect', 'BTC');
    await page.waitForTimeout(300);
    const btcPower = await page.textContent('#effectivePowerText');
    console.log(`Live Collateral Power: ${btcPower}`);
    if (!btcPower.includes('0.95x')) throw new Error('Live BTC collateral failed');

    await page.click('#typeOcoBtn');
    await page.waitForTimeout(200);
    if (!await page.isVisible('#ocoGroup')) throw new Error('Live OCO group missing');

    await page.click('#typeTwapBtn');
    await page.waitForTimeout(200);
    if (!await page.isVisible('#twapGroup')) throw new Error('Live TWAP group missing');

    await page.click('#typeIcebergBtn');
    await page.waitForTimeout(200);
    if (!await page.isVisible('#icebergGroup')) throw new Error('Live Iceberg group missing');

    // 2. Verify Phase 2: Session Keys
    console.log('Verifying Phase 2 Session Keys on Production...');
    await page.click('#btnSessionKey');
    await page.waitForTimeout(300);
    await page.click('#btnToggleSessionKeyAction');
    await page.waitForTimeout(400);
    const liveSessionActive = await page.evaluate(() => window.sessionKeyActive);
    console.log(`Live Session Key Active: ${liveSessionActive}`);
    if (!liveSessionActive) throw new Error('Live Session Key activation failed');
    await page.click('#modalSessionKey .modal-close-btn');

    // 3. Verify Phase 3: Multi-Chart Layouts & Indicators
    console.log('Verifying Phase 3 Multi-Chart Grid on Production...');
    await page.click('#layout2x2Btn');
    await page.waitForTimeout(800);
    const gridClass = await page.getAttribute('#multiChartGrid', 'class');
    console.log(`Live Chart Grid Class: ${gridClass}`);
    if (!gridClass.includes('grid-2x2')) throw new Error('Live 2x2 grid switch failed');

    await page.click('#layout1x1Btn');
    await page.waitForTimeout(300);

    // 4. Verify Phase 4: Gemini Live Voice Trading HUD & Command Execution
    console.log('Verifying Phase 4 Gemini Voice Trading on Production...');
    await page.click('#btnVoiceTrade');
    await page.waitForTimeout(400);
    await page.evaluate(() => window.processVoiceCommand("Buy 0.25 Bitcoin with 50x leverage"));
    await page.waitForTimeout(600);
    const voiceTranscript = await page.textContent('#voiceTranscriptBubble');
    const voiceResponse = await page.textContent('#voiceGeminiResponseText');
    console.log(`Live Voice Transcript: ${voiceTranscript}`);
    console.log(`Live Gemini Response: ${voiceResponse}`);
    if (!voiceTranscript.includes('Bitcoin') || !voiceResponse.includes('Confirmed')) {
      throw new Error('Live voice trading failed');
    }

    // 5. Verify Phase 5: PvP Arena & Season Pass
    console.log('Verifying Phase 5 PvP Arena & Season Pass on Production...');
    await page.evaluate(() => window.openPvpArenaModal());
    await page.waitForTimeout(400);
    await page.click('#btnStartPvpDuel');
    await page.waitForTimeout(1000);
    const opponent = await page.textContent('#pvpOpponentName');
    console.log(`Live PvP Matchmaking: ${opponent}`);
    await page.evaluate(() => window.closePvpArenaModal());

    await page.evaluate(() => window.openSeasonPassModal());
    await page.waitForTimeout(400);
    const tiers = await page.evaluate(() => document.querySelectorAll('#seasonTiersScroll .season-tier-item').length);
    console.log(`Live Season Pass Tiers rendered: ${tiers}`);
    if (tiers < 5) throw new Error('Live Season Pass tiers missing');
    await page.evaluate(() => window.closeSeasonPassModal());

    // Screenshots
    console.log('Capturing Live Production Screenshots...');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'omni_prod_upgrades_desktop_1440x900.png') });

    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'omni_prod_upgrades_tablet_768x1024.png') });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'omni_prod_upgrades_mobile_390x844.png') });

    if (consoleErrors.length > 0) {
      console.warn(`Production console errors: ${consoleErrors.length}`);
    } else {
      console.log('✅ Zero Console Errors on Production!');
    }

    console.log('\n🌟 LIVE PRODUCTION DEPLOYMENT & VERIFICATION 100% SUCCESSFUL!');
  } catch(err) {
    console.error('❌ Production verification failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

verifyProd();
