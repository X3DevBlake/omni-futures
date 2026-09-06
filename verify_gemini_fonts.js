const { chromium } = require('playwright');
const path = require('path');

(async () => {
  console.log('🚀 Starting Playwright Gemini Fonts & Trading Words Audit...');
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', err => {
    consoleErrors.push(err.message);
  });

  console.log('📡 Navigating to http://127.0.0.1:8092/ ...');
  await page.goto('http://127.0.0.1:8092/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1800);

  // 1. Audit Buy and Sell Button Typography & Styling
  console.log('\n--- 1. AUDITING BUY & SELL ACTION BUTTONS ---');
  const buyBtnStyles = await page.evaluate(() => {
    const buyBtn = document.getElementById('btnBuyAction');
    const buyLabel = document.getElementById('btnBuyActionText');
    const buyCost = document.getElementById('btnBuyCost');
    const csBtn = window.getComputedStyle(buyBtn);
    const csLabel = window.getComputedStyle(buyLabel);
    const csCost = window.getComputedStyle(buyCost);
    return {
      btnFont: csBtn.fontFamily,
      btnBg: csBtn.background,
      btnShadow: csBtn.boxShadow,
      labelFont: csLabel.fontFamily,
      labelText: buyLabel.textContent,
      labelWeight: csLabel.fontWeight,
      labelLetterSpacing: csLabel.letterSpacing,
      labelTextTransform: csLabel.textTransform,
      costFont: csCost.fontFamily,
      costText: buyCost.textContent
    };
  });
  console.log('Buy Button Details:', buyBtnStyles);

  const sellBtnStyles = await page.evaluate(() => {
    const sellBtn = document.getElementById('btnSellAction');
    const sellLabel = document.getElementById('btnSellActionText');
    const sellCost = document.getElementById('btnSellCost');
    const csBtn = window.getComputedStyle(sellBtn);
    const csLabel = window.getComputedStyle(sellLabel);
    return {
      btnFont: csBtn.fontFamily,
      btnBg: csBtn.background,
      btnShadow: csBtn.boxShadow,
      labelFont: csLabel.fontFamily,
      labelText: sellLabel.textContent,
      labelWeight: csLabel.fontWeight,
      costText: sellCost.textContent
    };
  });
  console.log('Sell Button Details:', sellBtnStyles);

  // 2. Audit Liquidation Metrics Typography & Styling
  console.log('\n--- 2. AUDITING LIQUIDATION METRICS & LABELS ---');
  const liqMetricsStyles = await page.evaluate(() => {
    const liqLongLabel = document.querySelector('#futuresLiqRows .liq-metric-label');
    const liqLongVal = document.getElementById('metricLiqLong');
    const liqShortVal = document.getElementById('metricLiqShort');
    const csLabel = window.getComputedStyle(liqLongLabel);
    const csVal = window.getComputedStyle(liqLongVal);
    return {
      labelFont: csLabel.fontFamily,
      labelColor: csLabel.color,
      labelText: liqLongLabel.textContent.trim(),
      valFont: csVal.fontFamily,
      valColor: csVal.color,
      valText: liqLongVal.textContent,
      valShortText: liqShortVal.textContent,
      valShadow: csVal.textShadow
    };
  });
  console.log('Liquidation Metrics Details:', liqMetricsStyles);

  // 3. Audit Positions Desk Badges & Liquidation Proximity
  console.log('\n--- 3. AUDITING POSITIONS DESK (BUYS, SELLS, LIQUIDATIONS) ---');
  const posBadgeStyles = await page.evaluate(() => {
    const posBadge = document.querySelector('.pos-side-badge');
    const liqBadge = document.querySelector('.liq-safety-badge');
    if (!posBadge) return { error: 'No position badge found' };
    const csPos = window.getComputedStyle(posBadge);
    const csLiq = liqBadge ? window.getComputedStyle(liqBadge) : null;
    return {
      posText: posBadge.textContent.trim(),
      posFont: csPos.fontFamily,
      posWeight: csPos.fontWeight,
      posBg: csPos.background,
      posShadow: csPos.boxShadow,
      liqText: liqBadge ? liqBadge.textContent.trim() : 'N/A',
      liqFont: csLiq ? csLiq.fontFamily : 'N/A',
      liqBg: csLiq ? csLiq.background : 'N/A'
    };
  });
  console.log('Position Badges Details:', posBadgeStyles);

  // 4. Audit Market Depth & Orderbook Pressure Typography
  console.log('\n--- 4. AUDITING ORDERBOOK BUY/SELL PRESSURE TYPOGRAPHY ---');
  const depthStyles = await page.evaluate(() => {
    const depthRatio = document.getElementById('depthRatioText');
    const depthBid = document.getElementById('depthBarBid');
    const depthAsk = document.getElementById('depthBarAsk');
    const csRatio = window.getComputedStyle(depthRatio);
    const csBid = window.getComputedStyle(depthBid);
    const csAsk = window.getComputedStyle(depthAsk);
    return {
      ratioFont: csRatio.fontFamily,
      ratioText: depthRatio.textContent,
      bidFont: csBid.fontFamily,
      bidBg: csBid.background,
      bidText: depthBid.textContent,
      askFont: csAsk.fontFamily,
      askBg: csAsk.background,
      askText: depthAsk.textContent
    };
  });
  console.log('Depth Typography Details:', depthStyles);

  // 5. Audit Open Orders Tab & Side Pills
  console.log('\n--- 5. AUDITING OPEN ORDERS DESK SIDE PILLS ---');
  await page.click('#tabBtnOrders');
  await page.waitForTimeout(400);

  const openOrdersPillStyles = await page.evaluate(() => {
    const pill = document.querySelector('#ordersTableBody .gemini-side-pill');
    if (!pill) return { count: 0, msg: 'No open orders pill currently in table' };
    const csPill = window.getComputedStyle(pill);
    return {
      pillText: pill.textContent.trim(),
      pillFont: csPill.fontFamily,
      pillWeight: csPill.fontWeight,
      pillBg: csPill.background
    };
  });
  console.log('Open Orders Pill Details:', openOrdersPillStyles);

  // 6. Test SPOT Mode Switch Text & Font
  console.log('\n--- 6. TESTING SPOT MODE SWITCH (BUY/SELL TYPOGRAPHY) ---');
  await page.click('#modeSpotBtn');
  await page.waitForTimeout(400);
  const spotBuyLabel = await page.locator('#btnBuyActionText').textContent();
  const spotSellLabel = await page.locator('#btnSellActionText').textContent();
  const spotSettlement = await page.locator('#spotSettlementRow').isVisible();
  console.log(`Spot Mode Buy Label: "${spotBuyLabel}"`);
  console.log(`Spot Mode Sell Label: "${spotSellLabel}"`);
  console.log(`Spot Settlement Visible: ${spotSettlement}`);

  // Switch back to FUTURES
  await page.click('#modeFuturesBtn');
  await page.waitForTimeout(400);

  // Switch back to Positions tab
  await page.click('#tabBtnPositions');
  await page.waitForTimeout(400);

  // 7. Capture High-Resolution Screenshots
  console.log('\n--- 7. CAPTURING EVIDENCE SCREENSHOTS ---');
  const artifactDir = '/Users/dcaturfoh/.gemini/antigravity-ide/brain/3796794e-65fc-4aa1-8c29-e2ee936ff747';
  
  // A. Order Entry Box (Buy & Sell buttons + Liquidation rows)
  const orderSection = await page.$('.order-entry-section');
  if (orderSection) {
    await orderSection.screenshot({ path: path.join(artifactDir, 'omni_gemini_fonts_order_entry.png') });
    console.log('Saved order entry screenshot: omni_gemini_fonts_order_entry.png');
  }

  // B. Positions Desk (Bottom Bar with Badges)
  const bottomDesk = await page.$('.trading-desk');
  if (bottomDesk) {
    await bottomDesk.screenshot({ path: path.join(artifactDir, 'omni_gemini_fonts_positions_desk.png') });
    console.log('Saved bottom desk screenshot: omni_gemini_fonts_positions_desk.png');
  }

  // C. Full High-Res Terminal View
  await page.screenshot({ path: path.join(artifactDir, 'omni_gemini_fonts_full_terminal.png'), fullPage: false });
  console.log('Saved full terminal screenshot: omni_gemini_fonts_full_terminal.png');

  console.log('\n--- AUDIT SUMMARY ---');
  console.log(`Total Console Errors: ${consoleErrors.length}`);
  if (consoleErrors.length > 0) {
    console.error('Console errors encountered:', consoleErrors);
  } else {
    console.log('✅ ZERO console errors detected!');
  }

  await browser.close();
  console.log('✨ Gemini Fonts Audit Completed Successfully!');
})();
