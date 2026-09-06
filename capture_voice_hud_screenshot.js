const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = '/Users/dcaturfoh/.gemini/antigravity-ide/brain/3796794e-65fc-4aa1-8c29-e2ee936ff747';

async function run() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await page.goto('http://127.0.0.1:8092/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  // Open Voice HUD and send command
  await page.click('#btnVoiceTrade');
  await page.waitForTimeout(300);
  await page.evaluate(() => window.processVoiceCommand("Buy 0.5 Bitcoin with 50x leverage"));
  await page.waitForTimeout(600);

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'omni_upgrade_voice_trading_hud.png') });
  console.log('✅ Voice HUD screenshot captured');

  // Also capture 2x2 multi-chart grid screenshot
  await page.click('#layout2x2Btn');
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'omni_upgrade_multi_chart_2x2.png') });
  console.log('✅ Multi-chart 2x2 screenshot captured');

  await browser.close();
}

run();
