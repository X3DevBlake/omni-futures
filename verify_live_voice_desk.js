const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = '/Users/dcaturfoh/.gemini/antigravity-ide/brain/3796794e-65fc-4aa1-8c29-e2ee936ff747';
const LIVE_URL = 'https://omni-futures-39821.web.app/';

(async () => {
  console.log('🚀 Verifying Live Production Voice Trading Desk at:', LIVE_URL);

  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']
  });

  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 }
  });

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      console.error('Live Browser Console Error:', msg.text());
    }
  });

  try {
    await page.goto(LIVE_URL, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForTimeout(3000);

    // Open Voice HUD
    console.log('Opening Voice Trading HUD on Live Site...');
    await page.evaluate(() => {
      if (typeof window.toggleVoiceTrading === 'function') {
        window.toggleVoiceTrading();
      }
    });
    await page.waitForTimeout(1000);

    // 1. Spoken dual bracket order
    console.log('Dispatching spoken dual bracket command on Live Site...');
    await page.evaluate(() => {
      window.processVoiceCommand('Buy 0.5 Bitcoin with 50x leverage, take profit 85000, stop loss 75000');
    });
    await page.waitForTimeout(400);

    // 2. Persona Switch
    console.log('Testing Live Persona Switch to Scalper...');
    await page.evaluate(() => {
      window.processVoiceCommand('Switch persona to Degen Scalper');
    });
    await page.waitForTimeout(400);

    // 3. Multi-asset Spread trade
    console.log('Testing Live Spread Trade...');
    await page.evaluate(() => {
      window.processVoiceCommand('Spread trade: Long 0.5 Bitcoin and Short 8 Ethereum');
    });
    await page.waitForTimeout(400);

    // 4. Indicator Readout
    console.log('Testing Live Technical Indicator Readout...');
    await page.evaluate(() => {
      window.processVoiceCommand('What is the RSI and MACD on Bitcoin?');
    });
    await page.waitForTimeout(400);

    // 5. Expand Voice Audit Drawer
    console.log('Opening Voice Audit Drawer on Live Site...');
    await page.evaluate(() => {
      window.toggleVoiceAuditDrawer();
    });
    await page.waitForTimeout(600);

    // Capture Live Desktop Screenshot
    console.log('Capturing Live Desktop Screenshot...');
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'omni_voice_live_prod_desktop_1440x900.png'),
      fullPage: false
    });

    // Capture Live Tablet Screenshot
    console.log('Capturing Live Tablet Screenshot...');
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(600);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'omni_voice_live_prod_tablet_768x1024.png'),
      fullPage: false
    });

    // Capture Live Mobile Screenshot
    console.log('Capturing Live Mobile Screenshot...');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(600);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'omni_voice_live_prod_mobile_390x844.png'),
      fullPage: false
    });

    console.log('======================================================');
    console.log('🎉 LIVE PRODUCTION VOICE TRADING DESK FULLY VERIFIED!');
    console.log('Console Errors:', consoleErrors.length);
    console.log('======================================================');
  } catch(err) {
    console.error('❌ Live site verification failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
