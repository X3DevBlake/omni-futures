const { chromium } = require('playwright');
const path = require('path');

async function verifyLiveProduction() {
  console.log('Testing Production Gemini Live on https://omni-futures-39821.web.app...');
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      console.error('Prod Console Error:', msg.text());
    }
  });
  page.on('pageerror', err => {
    consoleErrors.push(err.message);
    console.error('Prod Page Error:', err.message);
  });

  await page.goto('https://omni-futures-39821.web.app', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // 1. Open Gemini Live HUD
  console.log('1. Opening Gemini Live HUD in Production...');
  await page.click('#btnVoiceTrade');
  await page.waitForTimeout(1000);

  const titleText = await page.locator('.gemini-live-title').textContent();
  const modelTag = await page.locator('.gemini-live-model-tag').textContent();
  console.log(`- Prod Title: "${titleText}", Model: "${modelTag}"`);
  if (!titleText.includes('GEMINI LIVE')) throw new Error('GEMINI LIVE title missing in production');

  // 2. Dispatch Spoken Trade Command
  console.log('2. Dispatching Spoken Trade Command in Production...');
  await page.evaluate(async () => {
    await window.processVoiceCommand('Buy 0.5 Bitcoin with 50x leverage, take profit 90000, stop loss 75000');
  });
  await page.waitForTimeout(1500);

  // 3. Dispatch Layout & Footprint Command
  console.log('3. Dispatching Spoken Layout Command in Production...');
  await page.evaluate(async () => {
    await window.processVoiceCommand('Switch layout to 2x2 grid and turn on the footprint indicator');
  });
  await page.waitForTimeout(1500);

  // 4. Dispatch Grid Bot Command
  console.log('4. Dispatching Spoken Grid Bot Command in Production...');
  await page.evaluate(async () => {
    await window.processVoiceCommand('Deploy grid bot on Solana with $2,000');
  });
  await page.waitForTimeout(1500);

  const artifactDir = '/Users/dcaturfoh/.gemini/antigravity-ide/brain/3796794e-65fc-4aa1-8c29-e2ee936ff747';
  await page.screenshot({ path: path.join(artifactDir, 'omni_gemini_live_production_verified.png') });
  console.log('Saved omni_gemini_live_production_verified.png');

  const toolCards = await page.locator('#geminiLiveToolCards .gemini-live-tool-card').allTextContents();
  console.log(`- Production Tool Stream Cards (${toolCards.length}):`);
  toolCards.forEach(c => console.log(`   * ${c.replace(/\s+/g, ' ')}`));

  console.log(`- Production Console Error Count: ${consoleErrors.length}`);
  if (consoleErrors.length > 0) {
    throw new Error(`Production has ${consoleErrors.length} console errors: ${consoleErrors.join('; ')}`);
  }

  await browser.close();
  console.log('=== PRODUCTION GEMINI LIVE VERIFIED SUCCESSFULLY ===');
}

verifyLiveProduction().catch(err => {
  console.error('FATAL PRODUCTION TEST FAILURE:', err);
  process.exit(1);
});
