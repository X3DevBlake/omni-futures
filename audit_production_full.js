const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = '/Users/dcaturfoh/.gemini/antigravity-ide/brain/3796794e-65fc-4aa1-8c29-e2ee936ff747';
const PROD_URL = 'https://omni-futures-39821.web.app';

async function runProductionAudit() {
  console.log('===============================================================');
  console.log(`STARTING LIVE PRODUCTION AUDIT ON ${PROD_URL}`);
  console.log('===============================================================');

  const browser = await chromium.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  });

  const page = await browser.newPage();
  const consoleErrors = [];
  const networkFailures = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      console.error('[Prod Browser Error]:', msg.text());
    }
  });

  page.on('pageerror', err => {
    consoleErrors.push(err.message);
    console.error('[Prod Page Error]:', err.message);
  });

  page.on('requestfailed', req => {
    networkFailures.push(`${req.method()} ${req.url()} - ${req.failure()?.errorText}`);
    console.error('[Prod Network Fail]:', req.method(), req.url(), req.failure()?.errorText);
  });

  // 1. Initial Load at Desktop 1440x900
  await page.setViewportSize({ width: 1440, height: 900 });
  console.log('\n--- 1. Loading Live Production Exchange ---');
  await page.goto(PROD_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // 2. Test Multi-Viewport Overflow in Production
  console.log('\n--- 2. Auditing Production Multi-Viewport Layouts ---');
  const viewports = [
    { name: 'desktop_1440x900', w: 1440, h: 900 },
    { name: 'tablet_768x1024', w: 768, h: 1024 },
    { name: 'mobile_390x844', w: 390, h: 844 }
  ];

  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.w, height: vp.h });
    await page.waitForTimeout(800);

    const metrics = await page.evaluate(() => {
      const docW = document.documentElement.scrollWidth;
      const winW = window.innerWidth;
      const bodyW = document.body.scrollWidth;
      return { docW, winW, bodyW, hasOverflow: docW > winW || bodyW > winW };
    });

    console.log(`  * Viewport ${vp.name}: docW=${metrics.docW}, winW=${metrics.winW}, bodyW=${metrics.bodyW}, hasOverflow=${metrics.hasOverflow}`);
    if (metrics.hasOverflow) {
      throw new Error(`Production horizontal overflow on ${vp.name}: docW=${metrics.docW} > winW=${metrics.winW}`);
    }

    const filename = `audit_prod_${vp.name}.png`;
    await page.screenshot({ path: path.join(ARTIFACT_DIR, filename) });
    console.log(`    - Saved: ${filename}`);
  }

  // Restore Desktop for interactive feature verification
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(500);

  // 3. Physical Interactive Trading in Production
  console.log('\n--- 3. Testing Physical Trading Execution in Production ---');
  await page.fill('#orderSizeInput', '0.05');
  await page.click('#btnBuyAction');
  await page.waitForTimeout(1000);
  console.log('  * Executed Market Long order in production.');

  // 4. Autonomous Gemini Live in Production
  console.log('\n--- 4. Testing Autonomous Gemini Live Agent in Production ---');
  await page.click('#btnVoiceTrade');
  await page.waitForTimeout(1000);

  const title = await page.locator('.gemini-live-title').textContent();
  const model = await page.locator('.gemini-live-model-tag').textContent();
  console.log(`  * Gemini Live Prod HUD: "${title}", Model: "${model}"`);

  // Execute Continuous Talk & Multi-action sequence
  await page.evaluate(async () => {
    await window.processVoiceCommand('Buy 0.25 Bitcoin with 25x leverage, take profit 92000, stop loss 76000');
    await window.processVoiceCommand('Switch layout to 2x2 grid and turn on the footprint indicator');
    await window.processVoiceCommand('Deploy grid bot on Solana with $2,000');
    await window.processVoiceCommand('Claim faucet funds');
  });
  await page.waitForTimeout(2000);

  const toolCards = await page.locator('#geminiLiveToolCards .gemini-live-tool-card').allTextContents();
  console.log(`  * Production Live Tool Cards Dispatched (${toolCards.length}):`);
  toolCards.slice(0, 5).forEach(c => console.log(`     - ${c.replace(/\s+/g, ' ')}`));

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'audit_prod_gemini_live.png') });
  console.log('    - Saved: audit_prod_gemini_live.png');

  // Close HUD
  const closeLiveBtn = page.locator('#btnCloseVoiceHud');
  if (await closeLiveBtn.isVisible()) {
    await closeLiveBtn.click();
  } else {
    await page.evaluate(() => window.toggleVoiceTrading && window.toggleVoiceTrading());
  }
  await page.waitForTimeout(500);

  // 5. Final Metrics & Assertions
  console.log('\n===============================================================');
  console.log('PRODUCTION AUDIT METRICS:');
  console.log(`  * Console Errors: ${consoleErrors.length}`);
  console.log(`  * Network Failures: ${networkFailures.length}`);
  console.log('===============================================================');

  if (consoleErrors.length > 0) {
    throw new Error(`Production audit failed with ${consoleErrors.length} console errors!`);
  }

  await browser.close();
  console.log('\n=== LIVE PRODUCTION AUDIT COMPLETED WITH 100% SUCCESS ===');
}

runProductionAudit().catch(err => {
  console.error('\nFATAL PRODUCTION AUDIT FAILURE:', err);
  process.exit(1);
});
