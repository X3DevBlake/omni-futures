const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = '/Users/dcaturfoh/.gemini/antigravity-ide/brain/3796794e-65fc-4aa1-8c29-e2ee936ff747';
const PROD_URL = 'https://omni-futures-39821.web.app/';

(async () => {
  console.log(`🚀 Verifying Live Production Deployment at ${PROD_URL}...`);
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']
  });

  const page = await browser.newPage();
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      console.error('PROD CONSOLE ERROR:', msg.text());
    }
  });

  page.on('pageerror', err => {
    consoleErrors.push(err.message);
    console.error('PROD PAGE ERROR:', err.message);
  });

  // 1. Desktop Viewport
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(PROD_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);
  console.log('✅ Live production page loaded successfully');

  // Open Voice Trading Desk
  await page.evaluate(() => {
    if (typeof window.toggleVoiceTrading === 'function') {
      window.toggleVoiceTrading();
    }
  });
  await page.waitForTimeout(600);

  // Switch visualizer to Spectrum
  await page.click('#btnVisualizerMode');
  await page.waitForTimeout(300);

  // Switch sound theme to Cyberpunk
  await page.click('#btnVoiceSoundTheme');
  await page.waitForTimeout(300);

  // Open macro drawer
  await page.evaluate(() => {
    if (typeof window.toggleVoiceMacroDrawer === 'function') {
      window.toggleVoiceMacroDrawer();
    }
  });
  await page.waitForTimeout(300);

  // Run Macro Alpha
  await page.evaluate(() => {
    window.processVoiceCommand('Run Macro Alpha');
  });
  await page.waitForTimeout(600);

  // Run Quant Backtest
  await page.evaluate(() => {
    window.processVoiceCommand('Backtest SMA Crossover on Bitcoin');
  });
  await page.waitForTimeout(600);

  // Run Volatility Straddle
  await page.evaluate(() => {
    window.processVoiceCommand('Deploy Volatility Straddle on Bitcoin');
  });
  await page.waitForTimeout(600);

  // Capture Live Production Desktop Screenshot
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'omni_voice_prod_sophisticated_desktop_1440x900.png'),
    fullPage: false
  });
  console.log('📸 Live production desktop screenshot captured');

  // 2. Tablet Viewport
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.waitForTimeout(500);
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'omni_voice_prod_sophisticated_tablet_768x1024.png'),
    fullPage: false
  });
  console.log('📸 Live production tablet screenshot captured');

  // 3. Mobile Viewport
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'omni_voice_prod_sophisticated_mobile_390x844.png'),
    fullPage: false
  });
  console.log('📸 Live production mobile screenshot captured');

  if (consoleErrors.length > 0) {
    console.warn(`⚠️ Warning: ${consoleErrors.length} console errors logged on production.`);
  } else {
    console.log('🌟 ZERO console errors encountered on LIVE PRODUCTION!');
  }

  await browser.close();
  console.log('🎉 Production verification complete!');
})();
