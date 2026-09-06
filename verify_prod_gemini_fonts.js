const { chromium } = require('playwright');
const path = require('path');

(async () => {
  console.log('🚀 Verifying Live Production Deployment (Gemini Fonts)...');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  const PROD_URL = 'https://omni-futures-39821.web.app';
  console.log(`📡 Navigating to ${PROD_URL} ...`);
  await page.goto(PROD_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  // Check computed font of Buy Button
  const buyBtnFont = await page.evaluate(() => {
    const el = document.getElementById('btnBuyAction');
    return window.getComputedStyle(el).fontFamily;
  });
  console.log(`✅ Production Buy Button Font: ${buyBtnFont}`);

  // Check computed font of Liquidation Label
  const liqLabelFont = await page.evaluate(() => {
    const el = document.querySelector('.liq-metric-label');
    return el ? window.getComputedStyle(el).fontFamily : 'N/A';
  });
  console.log(`✅ Production Liquidation Label Font: ${liqLabelFont}`);

  // Scroll down order entry section to view the Buy/Sell buttons
  await page.evaluate(() => {
    const el = document.querySelector('.order-entry-section');
    if (el) el.scrollTop = el.scrollHeight;
  });
  await page.waitForTimeout(400);

  const artifactDir = '/Users/dcaturfoh/.gemini/antigravity-ide/brain/3796794e-65fc-4aa1-8c29-e2ee936ff747';
  await page.screenshot({ path: path.join(artifactDir, 'omni_prod_verified_gemini_fonts_full.png') });
  console.log('Saved: omni_prod_verified_gemini_fonts_full.png');

  console.log(`Production Console Errors: ${consoleErrors.length}`);
  await browser.close();
  console.log('🎉 Live Production Verification Completed!');
})();
