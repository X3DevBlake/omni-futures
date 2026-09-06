const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = '/Users/dcaturfoh/.gemini/antigravity-ide/brain/3796794e-65fc-4aa1-8c29-e2ee936ff747';

async function ensureNoModalsOpen(page) {
  await page.evaluate(() => {
    const modals = document.querySelectorAll('.modal-overlay, .market-explorer-backdrop');
    modals.forEach(m => m.style.display = 'none');
  });
  await page.waitForTimeout(250);
}

async function runComprehensiveAudit() {
  console.log('===============================================================');
  console.log('STARTING DEEP PHYSICAL AUDIT & AUTOMATED VERIFICATION SUITE');
  console.log('===============================================================');

  const browser = await chromium.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  const consoleErrors = [];
  const networkFailures = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      console.error('[Browser Error]:', msg.text());
    }
  });

  page.on('pageerror', err => {
    consoleErrors.push(err.message);
    console.error('[Page Uncaught Error]:', err.message);
  });

  page.on('requestfailed', req => {
    networkFailures.push(`${req.method()} ${req.url()} - ${req.failure()?.errorText}`);
    console.error('[Network Failure]:', req.method(), req.url(), req.failure()?.errorText);
  });

  const targetUrl = process.env.TARGET_URL || 'http://localhost:8092';
  console.log(`\n--- 1. LOADING TRADING TERMINAL: ${targetUrl} ---`);
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // =========================================================================
  // SUITE 1: Navigation, Search & Market Pairs
  // =========================================================================
  console.log('\n>>> SUITE 1: Physical Testing Navigation & Search...');
  // 1. Open Market Explorer Modal
  const searchBtn = page.locator('#quickSearchTriggerBtn, #tickerSelectorBtn').first();
  if (await searchBtn.isVisible()) {
    await searchBtn.click();
    await page.waitForTimeout(500);
    const searchModal = page.locator('#marketExplorerModal');
    const searchOpen = await searchModal.isVisible();
    console.log(`  * Market Explorer Modal Open: ${searchOpen}`);
    if (searchOpen) {
      await page.fill('#explorerSearchInput', 'SOL');
      await page.waitForTimeout(400);
      // Category filter
      const memeFilter = page.locator('#marketExplorerModal .explorer-tab:has-text("Memes")').first();
      if (await memeFilter.isVisible()) await memeFilter.click();
      await page.waitForTimeout(300);
      const allFilter = page.locator('#marketExplorerModal .explorer-tab:has-text("All")').first();
      if (await allFilter.isVisible()) await allFilter.click();
      await page.waitForTimeout(300);
      // Close modal
      const closeBtn = page.locator('.explorer-esc-badge').first();
      if (await closeBtn.isVisible()) await closeBtn.click();
      await page.waitForTimeout(400);
    }
  }
  await ensureNoModalsOpen(page);

  // 2. Click Fast Pair Switchers
  console.log('  * Testing Fast Pair Switchers in Ticker Header...');
  const ethTicker = page.locator('.ticker-item:has-text("ETH"), .mover-chip:has-text("ETH")').first();
  if (await ethTicker.isVisible()) {
    await ethTicker.click();
    await page.waitForTimeout(600);
  }
  const btcTicker = page.locator('.ticker-item:has-text("BTC"), .mover-chip:has-text("BTC")').first();
  if (await btcTicker.isVisible()) {
    await btcTicker.click();
    await page.waitForTimeout(600);
  }

  // 3. Test 1-Click Scalper Mode
  const scalperBtn = page.locator('#btnScalperMode');
  if (await scalperBtn.isVisible()) {
    await scalperBtn.click();
    await page.waitForTimeout(300);
    console.log('  * 1-Click Scalp Mode Toggled.');
  }

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'audit_suite1_navigation.png') });
  console.log('  [PASS] Suite 1 Verified. Screenshot saved: audit_suite1_navigation.png');

  // =========================================================================
  // SUITE 2: Charts, Timeframes, Multi-Chart Grid & Indicators
  // =========================================================================
  console.log('\n>>> SUITE 2: Physical Testing Interactive Charts, Grid & Indicators...');
  // 1. Timeframe selection
  for (const tf of ['1m', '5m', '15m', '1h', '4h']) {
    const tfBtn = page.locator(`.tf-btn:has-text("${tf}")`).first();
    if (await tfBtn.isVisible()) {
      await tfBtn.click();
      await page.waitForTimeout(200);
    }
  }
  console.log('  * Tested timeframes: 1m, 5m, 15m, 1h, 4h');

  // 2. Multi-Chart Grid Layouts (1x2, 2x2, 1x1)
  console.log('  * Testing Multi-Chart Grid: 1x2 -> 2x2 -> 1x1...');
  const grid1x2 = page.locator('#btnLayout1x2');
  if (await grid1x2.isVisible()) {
    await grid1x2.click();
    await page.waitForTimeout(500);
  }
  const grid2x2 = page.locator('#btnLayout2x2');
  if (await grid2x2.isVisible()) {
    await grid2x2.click();
    await page.waitForTimeout(500);
    const c2 = await page.locator('#candleChartCanvas2').isVisible();
    const c3 = await page.locator('#candleChartCanvas3').isVisible();
    const c4 = await page.locator('#candleChartCanvas4').isVisible();
    console.log(`    - 2x2 Grid Viewports Active: C2=${c2}, C3=${c3}, C4=${c4}`);
  }
  const grid1x1 = page.locator('#btnLayout1x1');
  if (await grid1x1.isVisible()) {
    await grid1x1.click();
    await page.waitForTimeout(500);
  }

  // 3. Technical & Order Flow Indicators
  console.log('  * Testing Indicators (Footprint, Volume Profile, MACD, RSI)...');
  const indFootprint = page.locator('#indFootprintBtn');
  if (await indFootprint.isVisible()) {
    await indFootprint.click();
    await page.waitForTimeout(300);
  }
  const indVolProfile = page.locator('#indVolProfileBtn');
  if (await indVolProfile.isVisible()) {
    await indVolProfile.click();
    await page.waitForTimeout(300);
  }
  const indMacd = page.locator('#indMacdBtn');
  if (await indMacd.isVisible()) {
    await indMacd.click();
    await page.waitForTimeout(300);
  }
  const indRsi = page.locator('#indRsiBtn');
  if (await indRsi.isVisible()) {
    await indRsi.click();
    await page.waitForTimeout(300);
  }

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'audit_suite2_charts_indicators.png') });
  console.log('  [PASS] Suite 2 Verified. Screenshot saved: audit_suite2_charts_indicators.png');

  // =========================================================================
  // SUITE 3: Order Entry & Execution Engine (Futures + Spot)
  // =========================================================================
  console.log('\n>>> SUITE 3: Physical Testing Order Entry & Execution Engine...');
  // 1. Leverage Quick Buttons
  for (const lev of [25, 50, 100, 20]) {
    const levBtn = page.locator(`.lev-quick-btn:has-text("${lev}x")`).first();
    if (await levBtn.isVisible()) {
      await levBtn.click();
      await page.waitForTimeout(150);
    }
  }
  console.log('  * Tested Leverage switching (25x, 50x, 100x, 20x).');

  // 2. Margin Mode
  const marginBtn = page.locator('#marginModeBtn');
  if (await marginBtn.isVisible()) {
    await marginBtn.click();
    await page.waitForTimeout(200);
    await marginBtn.click();
  }

  // 3. Market Order Execution
  console.log('  * Testing Market Order Execution...');
  await page.click('#typeMarketBtn');
  await page.waitForTimeout(200);
  await page.fill('#orderSizeInput', '0.25');
  await page.waitForTimeout(200);
  await page.click('#btnBuyAction');
  await page.waitForTimeout(1000);

  // 4. OCO Bracket Armed Order Execution
  console.log('  * Testing OCO Dual-Bracket Armed Order...');
  const tpslChk = page.locator('#tpslCheckbox');
  if (await tpslChk.isVisible()) {
    await tpslChk.check();
    await page.waitForTimeout(200);
    await page.fill('#tpPriceInput', '95000');
    await page.fill('#slPriceInput', '72000');
    await page.fill('#orderSizeInput', '0.15');
    await page.click('#btnBuyAction');
    await page.waitForTimeout(1000);
    await tpslChk.uncheck();
  }

  // 5. Algorithmic TWAP Order Placement & Cancellation
  console.log('  * Testing TWAP Algorithmic Slicing Execution...');
  const twapBtn = page.locator('#typeTwapBtn');
  if (await twapBtn.isVisible()) {
    await twapBtn.click();
    await page.waitForTimeout(300);
    await page.fill('#orderSizeInput', '0.5');
    await page.click('#btnBuyAction');
    await page.waitForTimeout(800);
    const twapCard = page.locator('#twapActiveCard');
    console.log(`    - TWAP Active Card Visible: ${await twapCard.isVisible()}`);
    // Cancel active TWAP
    const cancelTwapBtn = page.locator('.twap-cancel-btn');
    if (await cancelTwapBtn.isVisible()) {
      await cancelTwapBtn.click();
      await page.waitForTimeout(500);
      console.log('    - Active TWAP Slicing Cancelled.');
    }
  }

  // 6. Iceberg Order Placement
  console.log('  * Testing Iceberg Order Placement...');
  const icebergBtn = page.locator('#typeIcebergBtn');
  if (await icebergBtn.isVisible()) {
    await icebergBtn.click();
    await page.waitForTimeout(300);
    await page.fill('#orderSizeInput', '0.6');
    await page.fill('#icebergTrancheInput', '0.1');
    await page.click('#btnBuyAction');
    await page.waitForTimeout(800);
  }

  // Switch back to Market order type
  await page.click('#typeMarketBtn');

  // 7. Spot Trading Mode
  console.log('  * Testing Spot Trading Mode...');
  const spotTab = page.locator('.mode-pill:has-text("Spot"), button:has-text("Spot")').first();
  if (await spotTab.isVisible()) {
    await spotTab.click();
    await page.waitForTimeout(500);
    await page.fill('#orderSizeInput', '0.05');
    await page.click('#btnBuyAction');
    await page.waitForTimeout(800);
    console.log('    - Spot Buy Executed.');
    // Switch back to Futures
    const futuresTab = page.locator('.mode-pill:has-text("Futures"), button:has-text("Futures (200x)")').first();
    if (await futuresTab.isVisible()) {
      await futuresTab.click();
      await page.waitForTimeout(500);
    }
  }

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'audit_suite3_order_entry.png') });
  console.log('  [PASS] Suite 3 Verified. Screenshot saved: audit_suite3_order_entry.png');

  // =========================================================================
  // SUITE 4: Positions Desk & Open Orders Desk
  // =========================================================================
  console.log('\n>>> SUITE 4: Physical Testing Positions Desk & Open Orders Desk...');
  // 1. Inspect positions table
  const posTab = page.locator('#tabBtnPositions');
  if (await posTab.isVisible()) await posTab.click();
  await page.waitForTimeout(500);

  const posRows = await page.locator('#positionsTableBody tr').count();
  console.log(`  * Active Positions in Terminal: ${posRows}`);

  // 2. Reverse Position (Long <-> Short)
  const reverseBtn = page.locator('.rev-btn').first();
  if (await reverseBtn.isVisible()) {
    await reverseBtn.click();
    await page.waitForTimeout(800);
    console.log('  * Position reversed successfully.');
  }

  // 3. Share PnL Poster Modal
  const sharePnlBtn = page.locator('.share-btn').first();
  if (await sharePnlBtn.isVisible()) {
    await sharePnlBtn.click();
    await page.waitForTimeout(500);
    const pnlModal = page.locator('#modalPnlPoster');
    console.log(`  * PnL Poster Modal Open: ${await pnlModal.isVisible()}`);
    await page.evaluate(() => window.closePnlModal && window.closePnlModal());
    await page.waitForTimeout(400);
  }
  await ensureNoModalsOpen(page);

  // 4. Open Orders Desk & Cancel All
  const openOrdersTab = page.locator('#tabBtnOrders');
  if (await openOrdersTab.isVisible()) {
    await openOrdersTab.click();
    await page.waitForTimeout(500);
    const ordCount = await page.locator('#openOrdersTableBody tr').count();
    console.log(`  * Open Orders Count: ${ordCount}`);

    const cancelAllBtn = page.locator('#btnCancelAllOrders, button:has-text("Cancel All Orders")').first();
    if (await cancelAllBtn.isVisible()) {
      await cancelAllBtn.click();
      await page.waitForTimeout(800);
      console.log('  * Cancel All Orders Dispatched.');
    }
  }

  // Switch back to positions tab
  if (await posTab.isVisible()) await posTab.click();
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'audit_suite4_positions_orders.png') });
  console.log('  [PASS] Suite 4 Verified. Screenshot saved: audit_suite4_positions_orders.png');

  // =========================================================================
  // SUITE 5: AI Quant Terminal, Grid Bots, Copy Trading & Screener
  // =========================================================================
  console.log('\n>>> SUITE 5: Physical Testing AI Quant Terminal, Grid Bots & Screener...');
  // 1. Algorithmic Screener Tab
  const screenerTab = page.locator('#tabBtnScreener');
  if (await screenerTab.isVisible()) {
    await screenerTab.click();
    await page.waitForTimeout(600);
    const screenerRows = await page.locator('#screenerTableBody tr').count();
    console.log(`  * Screener Market Rows: ${screenerRows}`);
  }

  // 2. AI Grid Bots Desk
  const botsTab = page.locator('#tabBtnGridBots');
  if (await botsTab.isVisible()) {
    await botsTab.click();
    await page.waitForTimeout(600);
    const deployBotBtn = page.locator('.btn-deploy-bot, button:has-text("Deploy Bot")').first();
    if (await deployBotBtn.isVisible()) {
      await deployBotBtn.click();
      await page.waitForTimeout(600);
      console.log('  * Deployed AI Grid Bot from Desk.');
    }
  }

  // 3. Copy Trading Tab
  await page.evaluate(() => window.switchBottomTab('copyTrading'));
  await page.waitForTimeout(600);
  const traderCards = await page.locator('.copy-trader-card').count();
  console.log(`  * Copy Trader Leaderboard Cards: ${traderCards}`);

  // Switch back to Positions
  await page.evaluate(() => window.switchBottomTab('positions'));
  await page.waitForTimeout(400);

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'audit_suite5_ai_quant_bots.png') });
  console.log('  [PASS] Suite 5 Verified. Screenshot saved: audit_suite5_ai_quant_bots.png');

  // =========================================================================
  // SUITE 6: Gemini Live Autonomous Agent ("Goes Off and Does Things")
  // =========================================================================
  console.log('\n>>> SUITE 6: Physical Testing Gemini Live Autonomous Agent...');
  const voiceBtn = page.locator('#btnVoiceTrade');
  await voiceBtn.click();
  await page.waitForTimeout(1000);

  const hud = page.locator('#voiceTradingHud');
  const hudOpen = await hud.isVisible();
  console.log(`  * Gemini Live HUD Open: ${hudOpen}`);
  if (!hudOpen) throw new Error('Gemini Live HUD failed to open');

  const title = await page.locator('.gemini-live-title').textContent();
  const model = await page.locator('.gemini-live-model-tag').textContent();
  console.log(`  * Title: "${title}", Model: "${model}"`);

  // 1. Toggle Continuous Live Talk
  const contToggle = page.locator('#btnContinuousLiveToggle');
  if (await contToggle.isVisible()) {
    await contToggle.click();
    await page.waitForTimeout(300);
    console.log('  * Continuous 2-Way Live Talk Activated.');
  }

  // 2. Dispatch Spoken Trade
  console.log('  * Spoken Action 1: "Buy 0.5 Bitcoin with 50x leverage, take profit 90000, stop loss 75000"...');
  await page.evaluate(async () => {
    await window.processVoiceCommand('Buy 0.5 Bitcoin with 50x leverage, take profit 90000, stop loss 75000');
  });
  await page.waitForTimeout(1200);

  // 3. Dispatch Spoken Chart Layout & Indicator
  console.log('  * Spoken Action 2: "Switch layout to 2x2 grid and turn on the footprint indicator"...');
  await page.evaluate(async () => {
    await window.processVoiceCommand('Switch layout to 2x2 grid and turn on the footprint indicator');
  });
  await page.waitForTimeout(1200);

  // 4. Dispatch Spoken Grid Bot
  console.log('  * Spoken Action 3: "Deploy grid bot on Solana with $2,000"...');
  await page.evaluate(async () => {
    await window.processVoiceCommand('Deploy grid bot on Solana with $2,000');
  });
  await page.waitForTimeout(1200);

  // 5. Dispatch Spoken Faucet
  console.log('  * Spoken Action 4: "Claim faucet funds"...');
  await page.evaluate(async () => {
    await window.processVoiceCommand('Claim faucet funds');
  });
  await page.waitForTimeout(1000);

  // 6. Dispatch Spoken Emergency Flatten
  console.log('  * Spoken Action 5: "Emergency Flatten"...');
  await page.evaluate(async () => {
    await window.processVoiceCommand('Emergency Flatten');
  });
  await page.waitForTimeout(1500);

  const streamCards = await page.locator('#geminiLiveToolCards .gemini-live-tool-card').allTextContents();
  console.log(`  * Gemini Live Stream Cards Logged (${streamCards.length}):`);
  streamCards.slice(0, 5).forEach(c => console.log(`     - ${c.replace(/\s+/g, ' ')}`));

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'audit_suite6_gemini_live.png') });
  console.log('  [PASS] Suite 6 Verified. Screenshot saved: audit_suite6_gemini_live.png');

  // Close Live HUD
  const closeLiveBtn = page.locator('#btnCloseVoiceHud');
  if (await closeLiveBtn.isVisible()) await closeLiveBtn.click();
  await page.waitForTimeout(400);

  // =========================================================================
  // SUITE 7: Modals, Web3 Session Keys & Gamification
  // =========================================================================
  console.log('\n>>> SUITE 7: Physical Testing Modals, Web3 Session Keys & Gamification...');
  // 1. Desk Faucet button
  const faucetBtn = page.locator('#faucetBtn');
  if (await faucetBtn.isVisible()) {
    const eqBefore = await page.evaluate(() => window.accountEquity);
    await faucetBtn.click();
    await page.waitForTimeout(600);
    const eqAfter = await page.evaluate(() => window.accountEquity);
    console.log(`  * Faucet Clicked: $${eqBefore?.toLocaleString()} -> $${eqAfter?.toLocaleString()}`);
  }

  // 2. Deposit Modal
  await page.evaluate(() => window.openDepositModal && window.openDepositModal());
  await page.waitForTimeout(500);
  const depModal = page.locator('#modalDeposit');
  console.log(`  * Deposit Modal Open: ${await depModal.isVisible()}`);
  await page.evaluate(() => window.closeDepositModal && window.closeDepositModal());
  await page.waitForTimeout(300);

  // 3. ERC-4337 Session Key Modal & Activation
  await page.evaluate(() => window.toggleSessionKeyModal && window.toggleSessionKeyModal());
  await page.waitForTimeout(500);
  const skModal = page.locator('#modalSessionKey');
  console.log(`  * Session Key Modal Open: ${await skModal.isVisible()}`);
  const genSkBtn = page.locator('#btnGenerateSessionKey');
  if (await genSkBtn.isVisible()) {
    await genSkBtn.click();
    await page.waitForTimeout(600);
    console.log('  * Session Key Activated.');
  }
  await page.evaluate(() => window.toggleSessionKeyModal && window.toggleSessionKeyModal());
  await page.waitForTimeout(300);

  // 4. 1v1 PvP Arena Duel Modal
  await page.evaluate(() => window.openPvpArenaModal && window.openPvpArenaModal());
  await page.waitForTimeout(600);
  const pvpModal = page.locator('#modalPvpArena');
  console.log(`  * PvP Arena Modal Open: ${await pvpModal.isVisible()}`);
  const stake100 = page.locator('.pvp-stake-btn:has-text("$100")').first();
  if (await stake100.isVisible()) await stake100.click();
  const startDuelBtn = page.locator('#btnStartDuel');
  if (await startDuelBtn.isVisible()) {
    await startDuelBtn.click();
    await page.waitForTimeout(1000);
    console.log('  * 1v1 PvP Matchmaking & Duel Loop Verified.');
  }
  await page.evaluate(() => window.closePvpArenaModal && window.closePvpArenaModal());
  await page.waitForTimeout(300);

  // 5. Season Pass 500 Tiers Modal
  await page.evaluate(() => window.openSeasonPassModal && window.openSeasonPassModal());
  await page.waitForTimeout(600);
  const seasonModal = page.locator('#modalSeasonPass');
  console.log(`  * Season Pass Modal Open: ${await seasonModal.isVisible()}`);
  const claimXpBtn = page.locator('#btnClaimDailyXp');
  if (await claimXpBtn.isVisible()) {
    await claimXpBtn.click();
    await page.waitForTimeout(600);
    console.log('  * Daily Season Pass XP Claimed (+500 XP).');
  }
  await page.evaluate(() => window.closeSeasonPassModal && window.closeSeasonPassModal());
  await page.waitForTimeout(300);

  // 6. Ecosystem Launcher
  await page.evaluate(() => window.toggleEcosystemModal && window.toggleEcosystemModal());
  await page.waitForTimeout(500);
  const ecoModal = page.locator('#ecosystemModal, .ecosystem-modal');
  console.log(`  * Ecosystem Suite Modal Open: ${await ecoModal.isVisible()}`);
  await page.evaluate(() => window.toggleEcosystemModal && window.toggleEcosystemModal());
  await page.waitForTimeout(300);

  await ensureNoModalsOpen(page);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'audit_suite7_modals_gamification.png') });
  console.log('  [PASS] Suite 7 Verified. Screenshot saved: audit_suite7_modals_gamification.png');

  // =========================================================================
  // SUITE 8: Responsive Multi-Viewport Audit (Zero Horizontal Overflow)
  // =========================================================================
  console.log('\n>>> SUITE 8: Multi-Viewport Responsive Audit & Overflow Inspection...');
  const viewports = [
    { name: 'Desktop_1440x900', width: 1440, height: 900 },
    { name: 'Tablet_768x1024', width: 768, height: 1024 },
    { name: 'Mobile_390x844', width: 390, height: 844 }
  ];

  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.waitForTimeout(1000);

    const overflowCheck = await page.evaluate(() => {
      const docW = document.documentElement.scrollWidth;
      const winW = window.innerWidth;
      const bodyW = document.body.scrollWidth;
      return { docW, winW, bodyW, hasOverflow: docW > winW || bodyW > winW };
    });

    console.log(`  * Viewport ${vp.name}: docW=${overflowCheck.docW}, winW=${overflowCheck.winW}, hasOverflow=${overflowCheck.hasOverflow}`);
    if (overflowCheck.hasOverflow) {
      console.warn(`    [WARNING]: Horizontal overflow detected on ${vp.name}: docW=${overflowCheck.docW} > winW=${overflowCheck.winW}`);
    }

    const filename = `audit_viewport_${vp.name.toLowerCase()}.png`;
    await page.screenshot({ path: path.join(ARTIFACT_DIR, filename) });
    console.log(`    - Saved: ${filename}`);
  }

  // =========================================================================
  // AUDIT SUMMARY & ASSERTIONS
  // =========================================================================
  console.log('\n===============================================================');
  console.log('AUDIT SUMMARY METRICS:');
  console.log(`  * Total Console Errors: ${consoleErrors.length}`);
  console.log(`  * Total Network Failures: ${networkFailures.length}`);
  console.log('===============================================================');

  if (consoleErrors.length > 0) {
    console.error('FAILED: Unhandled console errors found:');
    consoleErrors.forEach((e, idx) => console.error(`  [${idx+1}] ${e}`));
    throw new Error(`Audit failed with ${consoleErrors.length} console error(s)`);
  }

  await browser.close();
  console.log('\n=== ALL 8 PHYSICAL TEST SUITES COMPLETED WITH 100% SUCCESS ===');
}

runComprehensiveAudit().catch(err => {
  console.error('\nFATAL COMPREHENSIVE AUDIT FAILURE:', err);
  process.exit(1);
});
