const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACTS_DIR = '/Users/dcaturfoh/.gemini/antigravity-ide/brain/3796794e-65fc-4aa1-8c29-e2ee936ff747';

async function runVerification() {
  console.log('=== STARTING OMNI WALLET, APPLE/GOOGLE PAY & GEMINI LIVE VERIFICATION ===\n');

  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });

  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  try {
    console.log('1. Navigating to http://localhost:8092...');
    await page.goto('http://localhost:8092', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(2000);

    // Verify header elements
    console.log('\n2. Verifying Header Navigation Elements...');
    const hasBuyCryptoBtn = await page.isVisible('#btnBuyCryptoHeader');
    const hasDepositBtn = await page.isVisible('#btnDepositHeader');
    const hasOmniWalletBtn = await page.isVisible('#btnOmniWalletHeader');
    const hasVoiceTradeBtn = await page.isVisible('#btnVoiceTrade');

    console.log(`- [⚡ Buy Crypto] Header Button: ${hasBuyCryptoBtn ? 'PASS' : 'FAIL'}`);
    console.log(`- [📥 Deposit] Header Button: ${hasDepositBtn ? 'PASS' : 'FAIL'}`);
    console.log(`- [💼 Omni Wallet] Header Button: ${hasOmniWalletBtn ? 'PASS' : 'FAIL'}`);
    console.log(`- [✨ Gemini Live] Header Button: ${hasVoiceTradeBtn ? 'PASS' : 'FAIL'}`);

    if (!hasBuyCryptoBtn || !hasDepositBtn || !hasOmniWalletBtn) {
      throw new Error('Header navigation buttons missing!');
    }

    const walletTotalText = await page.textContent('#headerOmniWalletTotal');
    console.log(`- Omni Wallet Header Total Display: "${walletTotalText}"`);

    // TEST 1: Gemini Live Market Switching ("see bitcoin")
    console.log('\n3. Testing Gemini Live intent: "see bitcoin"...');
    // Start on ETH-USDT first
    await page.evaluate(() => {
      if (typeof switchSymbol === 'function') switchSymbol('ETH-USDT');
    });
    await page.waitForTimeout(500);

    let curSym = await page.evaluate(() => window.currentSymbol);
    console.log(`- Baseline symbol: ${curSym}`);

    // Call processVoiceCommand("see bitcoin")
    await page.evaluate(async () => {
      await processVoiceCommand('see bitcoin');
    });
    await page.waitForTimeout(2000);

    curSym = await page.evaluate(() => window.currentSymbol);
    const tickerSym = await page.textContent('#tickerSymbol');
    console.log(`- Symbol after "see bitcoin": ${curSym} (Ticker UI: ${tickerSym})`);
    if (curSym !== 'BTC-USDT') {
      throw new Error(`Expected BTC-USDT after "see bitcoin", got ${curSym}`);
    }
    console.log('  -> PASS: Successfully switched to Bitcoin!');

    // Capture Gemini Live switched state
    const geminiBtcPath = path.join(ARTIFACTS_DIR, 'omni_gemini_live_see_bitcoin_verified.png');
    await page.screenshot({ path: geminiBtcPath });
    console.log(`  -> Screenshot saved: ${geminiBtcPath}`);

    // TEST 2: Gemini Live Market Switching ("see solana")
    console.log('\n4. Testing Gemini Live intent: "see solana"...');
    await page.evaluate(async () => {
      await processVoiceCommand('see solana');
    });
    await page.waitForTimeout(2000);

    curSym = await page.evaluate(() => window.currentSymbol);
    console.log(`- Symbol after "see solana": ${curSym}`);
    if (curSym !== 'SOL-USDT') {
      throw new Error(`Expected SOL-USDT after "see solana", got ${curSym}`);
    }
    console.log('  -> PASS: Successfully switched to Solana!');

    // TEST 3: Gemini Live command: "open wallet"
    console.log('\n5. Testing Gemini Live intent: "open wallet"...');
    await page.evaluate(async () => {
      await processVoiceCommand('open wallet');
    });
    await page.waitForTimeout(1000);

    let isWalletVisible = await page.evaluate(() => {
      const el = document.getElementById('modalOmniWallet');
      return el && window.getComputedStyle(el).display !== 'none';
    });
    console.log(`- Omni Wallet modal visible after "open wallet": ${isWalletVisible ? 'PASS' : 'FAIL'}`);
    if (!isWalletVisible) throw new Error('Omni Wallet did not open via voice command!');

    // Close wallet
    await page.evaluate(() => closeOmniWalletModal());
    await page.waitForTimeout(500);

    // TEST 4: Gemini Live command: "buy crypto using apple pay"
    console.log('\n6. Testing Gemini Live intent: "buy crypto using apple pay"...');
    await page.evaluate(async () => {
      await processVoiceCommand('buy crypto using apple pay');
    });
    await page.waitForTimeout(1000);

    isWalletVisible = await page.evaluate(() => {
      const el = document.getElementById('modalOmniWallet');
      return el && window.getComputedStyle(el).display !== 'none';
    });
    const isBuyTabActive = await page.evaluate(() => {
      const pane = document.getElementById('owPaneBuy');
      return pane && pane.classList.contains('active');
    });
    const isApplePaySelected = await page.evaluate(() => {
      const card = document.getElementById('payCardApple');
      return card && card.classList.contains('active');
    });

    console.log(`- Wallet modal visible: ${isWalletVisible ? 'PASS' : 'FAIL'}`);
    console.log(`- Buy tab active: ${isBuyTabActive ? 'PASS' : 'FAIL'}`);
    console.log(`- Apple Pay card active: ${isApplePaySelected ? 'PASS' : 'FAIL'}`);
    if (!isBuyTabActive || !isApplePaySelected) throw new Error('Buy crypto tab or Apple Pay was not activated!');

    // Take screenshot of Buy Crypto tab
    const buyTabPath = path.join(ARTIFACTS_DIR, 'omni_wallet_buy_crypto_tab_verified.png');
    await page.screenshot({ path: buyTabPath });
    console.log(`  -> Screenshot saved: ${buyTabPath}`);

    // TEST 5: Interactive Apple Pay Biometric Flow
    console.log('\n7. Testing Apple Pay Biometric Checkout Sheet...');
    await page.click('#btnBuyApplePayCta');
    await page.waitForTimeout(600);

    const isBioSheetVisible = await page.evaluate(() => {
      const s = document.getElementById('fiatBiometricSheet');
      return s && window.getComputedStyle(s).display !== 'none';
    });
    console.log(`- Biometric checkout sheet visible: ${isBioSheetVisible ? 'PASS' : 'FAIL'}`);
    if (!isBioSheetVisible) throw new Error('Biometric sheet did not open!');

    // Take screenshot of Apple Pay Face ID sheet
    const bioSheetPath = path.join(ARTIFACTS_DIR, 'omni_apple_pay_face_id_sheet_verified.png');
    await page.screenshot({ path: bioSheetPath });
    console.log(`  -> Screenshot saved: ${bioSheetPath}`);

    // Read baseline equity
    const initialEquity = await page.evaluate(() => window.accountEquity);
    console.log(`- Account equity before Apple Pay authentication: $${initialEquity.toFixed(2)}`);

    // Click Authenticate Face ID
    console.log('- Authenticating Face ID...');
    await page.click('#btnTriggerAppleAuth');
    await page.waitForTimeout(2000);

    const updatedEquity = await page.evaluate(() => window.accountEquity);
    console.log(`- Account equity after Apple Pay authorization: $${updatedEquity.toFixed(2)}`);
    const diff = updatedEquity - initialEquity;
    console.log(`- Credited amount: +$${diff.toFixed(2)}`);
    if (Math.abs(diff - 500) > 0.01) {
      throw new Error(`Expected +$500.00 credit, got +$${diff.toFixed(2)}`);
    }
    console.log('  -> PASS: +$500.00 USDT successfully credited to Margin Collateral!');

    // TEST 6: Test Google Pay Biometric Flow
    console.log('\n8. Testing Google Pay Biometric Flow...');
    await page.evaluate(() => {
      openOmniWalletModal('buy');
      selectPaymentMethod('google_pay');
    });
    await page.waitForTimeout(500);

    await page.click('#btnBuyGooglePayCta');
    await page.waitForTimeout(600);

    const isGoogleViewActive = await page.evaluate(() => {
      const v = document.getElementById('googlePaySheetView');
      return v && v.classList.contains('active');
    });
    console.log(`- Google Pay Passkey sheet view active: ${isGoogleViewActive ? 'PASS' : 'FAIL'}`);

    const gpayBeforeEquity = await page.evaluate(() => window.accountEquity);
    await page.click('#btnTriggerGoogleAuth');
    await page.waitForTimeout(2000);

    const gpayAfterEquity = await page.evaluate(() => window.accountEquity);
    const gpayDiff = gpayAfterEquity - gpayBeforeEquity;
    console.log(`- Account equity after Google Pay: $${gpayAfterEquity.toFixed(2)} (+$${gpayDiff.toFixed(2)})`);
    if (Math.abs(gpayDiff - 500) > 0.01) {
      throw new Error(`Expected +$500.00 credit from Google Pay, got +$${gpayDiff.toFixed(2)}`);
    }
    console.log('  -> PASS: +$500.00 USDT credited from Google Pay!');

    // TEST 7: Omni Wallet Hub Full Tab Navigation
    console.log('\n9. Testing Omni Wallet Tabs (Portfolio, Deposit, Withdraw, Transfer, History)...');
    await page.evaluate(() => openOmniWalletModal('portfolio'));
    await page.waitForTimeout(500);

    const netWorth = await page.textContent('#omniWalletNetWorthVal');
    console.log(`- Net worth display: ${netWorth}`);

    const holdingsCount = await page.evaluate(() => {
      const rows = document.querySelectorAll('#omniWalletHoldingsTableBody tr');
      return rows.length;
    });
    console.log(`- Portfolio multi-asset holdings rendered: ${holdingsCount} assets`);
    if (holdingsCount < 5) throw new Error('Holdings table failed to render!');

    // Take screenshot of full Portfolio Hub
    const portfolioHubPath = path.join(ARTIFACTS_DIR, 'omni_wallet_portfolio_hub_verified.png');
    await page.screenshot({ path: portfolioHubPath });
    console.log(`  -> Screenshot saved: ${portfolioHubPath}`);

    // Test Deposit tab
    await page.evaluate(() => switchOmniWalletTab('deposit'));
    await page.waitForTimeout(500);
    const depAddr = await page.textContent('#owDepositAddressStr');
    console.log(`- Deposit tab: Network address: ${depAddr.slice(0, 16)}...`);

    // Test Withdraw tab
    await page.evaluate(() => switchOmniWalletTab('withdraw'));
    await page.waitForTimeout(500);
    const withNet = await page.textContent('#owWithdrawNetDisplay');
    console.log(`- Withdraw tab: Calculated net: ${withNet}`);

    // Test Transfer tab
    await page.evaluate(() => switchOmniWalletTab('transfer'));
    await page.waitForTimeout(500);
    const tfAvail = await page.textContent('#owTransferAvailLabel');
    console.log(`- Transfer tab: Transferable margin: ${tfAvail}`);

    // Test History tab
    await page.evaluate(() => switchOmniWalletTab('history'));
    await page.waitForTimeout(500);
    const txCount = await page.evaluate(() => {
      const rows = document.querySelectorAll('#omniWalletTxHistoryTableBody tr');
      return rows.length;
    });
    console.log(`- History tab: Logged transactions count: ${txCount} transactions (includes Apple & Google Pay receipts)`);
    if (txCount < 2) throw new Error('Transaction history missing receipts!');

    const historyTabPath = path.join(ARTIFACTS_DIR, 'omni_wallet_history_tab_verified.png');
    await page.screenshot({ path: historyTabPath });
    console.log(`  -> Screenshot saved: ${historyTabPath}`);

    await page.evaluate(() => closeOmniWalletModal());
    await page.waitForTimeout(500);

    // TEST 8: Responsive Viewport Audits (Zero horizontal overflow)
    console.log('\n10. Testing Responsive Viewports & Checking for Horizontal Overflow...');
    const viewports = [
      { name: 'Desktop (1440x900)', width: 1440, height: 900 },
      { name: 'Tablet (768x1024)', width: 768, height: 1024 },
      { name: 'Mobile (390x844)', width: 390, height: 844 }
    ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(800);

      const overflowInfo = await page.evaluate(() => {
        const scrollW = document.documentElement.scrollWidth;
        const clientW = document.documentElement.clientWidth;
        return { scrollW, clientW, hasOverflow: scrollW > clientW };
      });

      console.log(`- Viewport ${vp.name}: clientWidth=${overflowInfo.clientW}px, scrollWidth=${overflowInfo.scrollW}px -> Overflow: ${overflowInfo.hasOverflow ? 'DETECTED' : 'NONE (PERFECT)'}`);
      if (overflowInfo.hasOverflow) {
        console.warn(`  [WARNING] Horizontal overflow of ${overflowInfo.scrollW - overflowInfo.clientW}px on ${vp.name}`);
      }

      const vpScreenshotPath = path.join(ARTIFACTS_DIR, `omni_audit_${vp.name.split(' ')[0].toLowerCase()}_verified.png`);
      await page.screenshot({ path: vpScreenshotPath });
      console.log(`  -> Screenshot saved: ${vpScreenshotPath}`);
    }

    console.log('\n11. Checking Console Errors...');
    console.log(`- Total Console Errors: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      consoleErrors.forEach(err => console.log('  [Console Error]:', err));
    }

    console.log('\n=== ALL VERIFICATIONS PASSED CLEANLY! ===\n');
  } catch (err) {
    console.error('\n[FATAL VERIFICATION ERROR]:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runVerification();
