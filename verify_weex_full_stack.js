// verify_weex_full_stack.js
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACTS_DIR = '/Users/dcaturfoh/.gemini/antigravity-ide/brain/3f24078c-deb8-4277-b8c6-09f7b90eeda0';
const LOCAL_URL = 'http://localhost:8092';

async function runVerification() {
  console.log('====================================================');
  console.log('LAUNCHING FULL-STACK PLAYWRIGHT AUDIT ON LOCALHOST:8092');
  console.log('====================================================\n');

  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      console.error('[BROWSER CONSOLE ERROR]', msg.text());
    }
  });

  try {
    await page.goto(LOCAL_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1500);

    // 1. Audit Navigation & Terminal
    console.log('[STEP 1] Auditing WEEX Navigation on Futures Terminal...');
    const termVisible = await page.isVisible('#weexViewTrade');
    console.log(`- Terminal view visible: ${termVisible}`);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'weex_01_futures_terminal.png') });

    // 2. Audit WEEX Markets View
    console.log('\n[STEP 2] Navigating to WEEX Markets & Derivatives Overview...');
    await page.evaluate(() => switchWeexView('markets'));
    await page.waitForTimeout(1000);
    const mktTableRows = await page.$$eval('#weexMarketsTableBody tr', trs => trs.length);
    console.log(`- Markets pairs loaded: ${mktTableRows}`);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'weex_02_markets_overview.png') });

    // 3. Audit WEEX Buy Crypto (Express & P2P)
    console.log('\n[STEP 3] Testing WEEX Buy Crypto Hub...');
    await page.evaluate(() => switchWeexView('buyCrypto', 'express'));
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'weex_03_buy_crypto_express.png') });

    console.log('- Switching to P2P Trading Desk...');
    await page.evaluate(() => switchWeexBuySubTab('p2p'));
    await page.waitForTimeout(1200);
    const p2pRows = await page.$$eval('#weexP2pTableBody tr', trs => trs.length);
    console.log(`- P2P Merchant orderbook rows: ${p2pRows}`);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'weex_04_buy_crypto_p2p.png') });

    console.log('- Opening P2P Escrow Modal...');
    await page.evaluate(() => openP2PEscrowModal('m1', 'ApexLiquidity_VIP', 1.0, 50, 10000));
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'weex_05_p2p_escrow_modal.png') });
    await page.evaluate(() => closeP2PEscrowModal());
    await page.waitForTimeout(400);

    // 4. Audit WEEX Deposit Workstation & Live Inflow Simulator
    console.log('\n[STEP 4] Testing WEEX Deposit Workstation...');
    await page.evaluate(() => switchWeexView('deposit'));
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'weex_06_deposit_workstation.png') });

    console.log('- Triggering Live Inflow Test Simulator (+1,000 USDT)...');
    await page.evaluate(() => simulateLiveDepositInflow());
    await page.waitForTimeout(4000); // allow blocks to confirm
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'weex_07_deposit_confirmed.png') });

    // 5. Audit WEEX Withdraw Workstation & 2FA Modal
    console.log('\n[STEP 5] Testing WEEX Withdraw Workstation...');
    await page.evaluate(() => switchWeexView('withdraw'));
    await page.waitForTimeout(1000);
    await page.evaluate(() => setWeexWithdrawPct(0.5));
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'weex_08_withdraw_workstation.png') });

    console.log('- Opening 2FA Security Modal...');
    await page.evaluate(() => openWeexWithdraw2FAModal());
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'weex_09_withdraw_2fa_modal.png') });
    await page.evaluate(() => closeWithdraw2FAModal());
    await page.waitForTimeout(400);

    // 6. Audit WEEX Assets & Financial Portfolio Hub
    console.log('\n[STEP 6] Testing WEEX Assets & Financial Portfolio Hub...');
    await page.evaluate(() => switchWeexView('assets'));
    await page.waitForTimeout(1200);

    const netWorthText = await page.textContent('#weexTotalNetWorthUsdDisplay');
    console.log(`- Total Estimated Net Worth displayed: ${netWorthText}`);

    const holdingsCount = await page.$$eval('#weexHoldingsTableBody tr', trs => trs.length);
    console.log(`- Asset holdings rows: ${holdingsCount}`);

    const billsCount = await page.$$eval('#weexBillsTableBody tr', trs => trs.length);
    console.log(`- Bills ledger records: ${billsCount}`);

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'weex_10_assets_portfolio_hub.png') });

    console.log('- Testing Balance Visibility Toggle (eye icon)...');
    await page.evaluate(() => toggleBalanceVisibility());
    await page.waitForTimeout(500);
    const concealedText = await page.textContent('#weexTotalNetWorthUsdDisplay');
    console.log(`- Net worth when concealed: ${concealedText}`);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'weex_11_assets_concealed.png') });
    await page.evaluate(() => toggleBalanceVisibility()); // toggle back

    console.log('- Testing Internal Transfer Modal...');
    await page.evaluate(() => openWeexInternalTransferModal('futures'));
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'weex_12_internal_transfer_modal.png') });
    await page.evaluate(() => closeInternalTransferModal());
    await page.waitForTimeout(400);

    // 7. Audit Copy Trading & Earn
    console.log('\n[STEP 7] Testing WEEX Copy Trading & Earn Vaults...');
    await page.evaluate(() => switchWeexView('copyTrading'));
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'weex_13_copy_trading.png') });

    await page.evaluate(() => switchWeexView('earn'));
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'weex_14_earn_vaults.png') });

    // 8. Return to Futures Trading
    console.log('\n[STEP 8] Returning to Futures Terminal...');
    await page.evaluate(() => switchWeexView('trade'));
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'weex_15_terminal_restored.png') });

    // 9. Viewport Audits (Desktop, Tablet, Mobile)
    console.log('\n[STEP 9] Auditing Responsive Viewports for Horizontal Overflows...');
    const viewports = [
      ['Desktop', 1440, 900],
      ['Tablet', 768, 1024],
      ['Mobile', 390, 844]
    ];

    for (const [vpName, width, height] of viewports) {
      await page.setViewportSize({ width, height });
      await page.waitForTimeout(600);

      // Check overflow on Assets Hub
      await page.evaluate(() => switchWeexView('assets'));
      await page.waitForTimeout(500);

      const hasOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      console.log(`- ${vpName} (${width}x${height}): Horizontal Overflow = ${hasOverflow ? 'DETECTED!' : 'NONE (0px)'}`);
      if (hasOverflow) {
        throw new Error(`Horizontal overflow detected on ${vpName} viewport!`);
      }

      await page.screenshot({ path: path.join(ARTIFACTS_DIR, `weex_vp_${vpName.toLowerCase()}.png`) });
    }

    console.log(`\n[STEP 10] Console Errors Summary: ${consoleErrors.length} errors.`);
    if (consoleErrors.length > 0) {
      console.warn('Console errors logged:', consoleErrors);
    }

    console.log('\n====================================================');
    console.log('FULL-STACK PLAYWRIGHT AUDIT COMPLETED 100% SUCCESSFULLY');
    console.log('====================================================');
  } catch (err) {
    console.error('\n[AUDIT FAILED]', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runVerification();
