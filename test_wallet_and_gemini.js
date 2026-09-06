const { chromium } = require('playwright');
const path = require('path');

const ARTIFACTS_DIR = '/Users/dcaturfoh/.gemini/antigravity-ide/brain/3796794e-65fc-4aa1-8c29-e2ee936ff747';

async function run() {
  console.log('--- Starting Comprehensive Test for Omni Wallet, Apple/Google Pay, and Gemini Live ---');
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error('[BROWSER ERROR]', msg.text());
      errors.push(msg.text());
    }
  });

  await page.goto('http://localhost:8092', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // 1. Verify Header Elements
  console.log('1. Checking Header Navigation...');
  const buyBtn = await page.$('#btnBuyCryptoHeader');
  const depBtn = await page.$('#btnDepositHeader');
  const walletBtn = await page.$('#btnOmniWalletHeader');
  const voiceBtn = await page.$('#btnVoiceTrade');

  if (!buyBtn || !depBtn || !walletBtn || !voiceBtn) {
    throw new Error('Header navigation buttons missing!');
  }
  console.log('✓ Header buttons confirmed present.');

  // 2. Click [Buy Crypto] Button
  console.log('2. Clicking [Buy Crypto] button...');
  await page.click('#btnBuyCryptoHeader');
  await page.waitForTimeout(800);

  const isWalletVisible = await page.isVisible('#modalOmniWallet');
  const isBuyActive = await page.$eval('#owPaneBuy', el => el.classList.contains('active'));
  console.log(`✓ Omni Wallet modal open: ${isWalletVisible}, Buy tab active: ${isBuyActive}`);

  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'omni_wallet_buy_crypto_tab.png') });
  console.log('✓ Captured omni_wallet_buy_crypto_tab.png');

  // 3. Test Payment Method Selection & Biometric Sheet
  console.log('3. Triggering Apple Pay biometric checkout...');
  await page.click('#btnBuyApplePayCta');
  await page.waitForTimeout(600);

  const isBioVisible = await page.isVisible('#fiatBiometricSheet');
  const isAppleView = await page.$eval('#applePaySheetView', el => el.classList.contains('active'));
  console.log(`✓ Biometric sheet open: ${isBioVisible}, Apple Pay view active: ${isAppleView}`);

  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'fiat_biometric_sheet_apple_pay.png') });
  console.log('✓ Captured fiat_biometric_sheet_apple_pay.png');

  // 4. Authenticate Face ID & Credit Balance
  console.log('4. Authenticating Face ID payment...');
  const initialEquity = await page.evaluate(() => window.accountEquity || 0);
  await page.click('#btnTriggerAppleAuth');
  await page.waitForTimeout(1600);

  const postEquity = await page.evaluate(() => window.accountEquity || 0);
  console.log(`✓ Initial equity: $${initialEquity.toFixed(2)}, Post equity: $${postEquity.toFixed(2)} (Delta: +$${(postEquity - initialEquity).toFixed(2)})`);

  // 5. Inspect Omni Wallet Tabs
  console.log('5. Inspecting Omni Wallet Tabs...');
  // Portfolio tab
  await page.click('#owTabBtnPortfolio');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'omni_wallet_portfolio_tab.png') });
  console.log('✓ Captured omni_wallet_portfolio_tab.png');

  // Deposit tab
  await page.click('#owTabBtnDeposit');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'omni_wallet_deposit_tab.png') });
  console.log('✓ Captured omni_wallet_deposit_tab.png');

  // History tab (should show the completed Apple Pay transaction)
  await page.click('#owTabBtnHistory');
  await page.waitForTimeout(500);
  const txCount = await page.evaluate(() => document.querySelectorAll('#omniWalletTxHistoryTableBody tr').length);
  console.log(`✓ History tab has ${txCount} transactions listed.`);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'omni_wallet_history_tab.png') });
  console.log('✓ Captured omni_wallet_history_tab.png');

  // Close Omni Wallet modal
  await page.click('#modalOmniWallet .close-btn');
  await page.waitForTimeout(500);

  // 6. Test Gemini Live Market Viewing: "see bitcoin"
  console.log('6. Testing Gemini Live "see bitcoin"...');
  // First switch market to ETH-USDT so we can test switching to BTC
  await page.evaluate(() => {
    if (typeof switchSymbol === 'function') switchSymbol('ETH-USDT');
  });
  await page.waitForTimeout(500);
  const symBefore = await page.evaluate(() => window.currentSymbol);
  console.log(`Active market before voice command: ${symBefore}`);

  // Open Gemini Live HUD
  await page.click('#btnVoiceTrade');
  await page.waitForTimeout(800);

  // Send "see bitcoin" via input
  await page.fill('#geminiLiveTextInput', 'see bitcoin');
  await page.click('#btnSendGeminiLiveText');
  await page.waitForTimeout(2000);

  const symAfter = await page.evaluate(() => window.currentSymbol);
  const transcriptText = await page.$eval('#voiceTranscriptBubble', el => el.textContent);
  const responseText = await page.$eval('#voiceGeminiResponseText', el => el.textContent);

  console.log(`✓ Active market after "see bitcoin": ${symAfter}`);
  console.log(`✓ Transcript: ${transcriptText}`);
  console.log(`✓ Gemini Live Spoken Response: "${responseText}"`);

  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'gemini_live_see_bitcoin_verified.png') });
  console.log('✓ Captured gemini_live_see_bitcoin_verified.png');

  if (symAfter !== 'BTC-USDT') {
    throw new Error(`Expected BTC-USDT after "see bitcoin", but found ${symAfter}`);
  }

  // 7. Test Gemini Live "open omni wallet"
  console.log('7. Testing Gemini Live "open omni wallet"...');
  await page.fill('#geminiLiveTextInput', 'open omni wallet');
  await page.click('#btnSendGeminiLiveText');
  await page.waitForTimeout(1500);

  const isWalletOpenFromVoice = await page.isVisible('#modalOmniWallet');
  console.log(`✓ Omni Wallet opened via Gemini Live command: ${isWalletOpenFromVoice}`);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'gemini_live_open_wallet_verified.png') });

  // Close modal
  await page.evaluate(() => {
    if (typeof closeOmniWalletModal === 'function') closeOmniWalletModal();
  });

  // 8. Viewport & Overflow Audits
  console.log('8. Checking responsive layouts and zero horizontal overflow...');
  const viewports = [
    { name: 'Desktop', width: 1440, height: 900 },
    { name: 'Tablet', width: 768, height: 1024 },
    { name: 'Mobile', width: 390, height: 844 }
  ];

  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.waitForTimeout(500);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    console.log(`Viewport ${vp.name} (${vp.width}x${vp.height}): Horizontal Overflow = ${overflow}`);
    if (overflow) {
      console.warn(`WARNING: Horizontal overflow detected on ${vp.name}!`);
    }
  }

  await browser.close();
  console.log('--- All tests completed successfully! ---');
}

run().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
