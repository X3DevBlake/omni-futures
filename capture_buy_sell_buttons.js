const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://127.0.0.1:8092/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  // Scroll order entry section down
  await page.evaluate(() => {
    const el = document.querySelector('.order-entry-section');
    if (el) el.scrollTop = el.scrollHeight;
  });
  await page.waitForTimeout(400);

  const artifactDir = '/Users/dcaturfoh/.gemini/antigravity-ide/brain/3796794e-65fc-4aa1-8c29-e2ee936ff747';
  const orderSection = await page.$('.order-entry-section');
  if (orderSection) {
    await orderSection.screenshot({ path: path.join(artifactDir, 'omni_gemini_fonts_buy_sell_buttons.png') });
    console.log('Saved: omni_gemini_fonts_buy_sell_buttons.png');
  }

  // Also open Open Orders tab and screenshot
  await page.click('#tabBtnOrders');
  await page.waitForTimeout(500);
  const bottomDesk = await page.$('.trading-desk');
  if (bottomDesk) {
    await bottomDesk.screenshot({ path: path.join(artifactDir, 'omni_gemini_fonts_open_orders_pill.png') });
    console.log('Saved: omni_gemini_fonts_open_orders_pill.png');
  }

  await browser.close();
})();
