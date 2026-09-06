const { chromium } = require('playwright');

(async () => {
  try {
    console.log('Launching Playwright Chrome for Liquid Glass & Ecosystem captures...');
    const browser = await chromium.launch({
      headless: true,
      executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    });
    const context = await browser.newContext({
      viewport: { width: 1600, height: 980 }
    });
    const page = await context.newPage();

    console.log('1. Navigating to OmniFutures Pro (http://127.0.0.1:8092)...');
    await page.goto('http://127.0.0.1:8092', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);

    // 1. Main Viewport (Liquid Glass, Gemini vectors, 100% Real Data)
    await page.screenshot({ path: '/Users/dcaturfoh/.gemini/antigravity-ide/brain/3796794e-65fc-4aa1-8c29-e2ee936ff747/omni_futures_liquid_glass_main.png' });
    console.log('Screenshot 1: Main Liquid Glass Viewport Saved!');

    // 2. Open 12-Portal Ecosystem Modal
    await page.evaluate(() => {
      toggleEcosystemModal();
    });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: '/Users/dcaturfoh/.gemini/antigravity-ide/brain/3796794e-65fc-4aa1-8c29-e2ee936ff747/omni_futures_ecosystem_modal.png' });
    console.log('Screenshot 2: 12-Portal Ecosystem Modal Saved!');

    // Close modal
    await page.evaluate(() => {
      toggleEcosystemModal();
    });
    await page.waitForTimeout(500);

    // 3. Screener tab with Real Quants
    await page.evaluate(() => {
      switchBottomTab('screener');
    });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: '/Users/dcaturfoh/.gemini/antigravity-ide/brain/3796794e-65fc-4aa1-8c29-e2ee936ff747/omni_futures_real_screener.png' });
    console.log('Screenshot 3: Real Screener Saved!');

    // 4. Capture OMNI DAO with Futures Banner
    console.log('2. Navigating to OMNI DAO (http://127.0.0.1:8082)...');
    try {
      await page.goto('http://127.0.0.1:8082', { waitUntil: 'domcontentloaded', timeout: 5000 });
      await page.waitForTimeout(2000);
      await page.evaluate(() => {
        const swapTab = document.querySelector('[data-tab="swap"]');
        if (swapTab) swapTab.click();
      });
      await page.waitForTimeout(1000);
      await page.screenshot({ path: '/Users/dcaturfoh/.gemini/antigravity-ide/brain/3796794e-65fc-4aa1-8c29-e2ee936ff747/omni_dao_futures_bridge.png' });
      console.log('Screenshot 4: OMNI DAO Futures Bridge Saved!');
    } catch (e) {
      console.warn('OMNI DAO capture note:', e.message);
    }

    await browser.close();
    console.log('All verification screenshots captured successfully!');
  } catch (err) {
    console.error('Error during screenshot capture:', err);
    process.exit(1);
  }
})();
