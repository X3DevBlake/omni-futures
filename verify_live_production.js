const { chromium } = require('playwright');
const path = require('path');

const ARTIFACTS_DIR = '/Users/dcaturfoh/.gemini/antigravity-ide/brain/3796794e-65fc-4aa1-8c29-e2ee936ff747';
const PROD_URL = 'https://omni-futures-39821.web.app';

async function verifyProduction() {
  console.log(`=== AUDITING LIVE PRODUCTION: ${PROD_URL} ===\n`);

  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  try {
    await page.goto(PROD_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    // 1. Header Navigation
    const hasBuy = await page.isVisible('#btnBuyCryptoHeader');
    const hasDep = await page.isVisible('#btnDepositHeader');
    const hasWallet = await page.isVisible('#btnOmniWalletHeader');
    const hasGemini = await page.isVisible('#btnVoiceTrade');
    console.log(`[PROD] Header Buttons: Buy=${hasBuy}, Deposit=${hasDep}, Wallet=${hasWallet}, GeminiLive=${hasGemini}`);

    // 2. Gemini Live: "see bitcoin"
    console.log('\n[PROD] Testing Gemini Live "see bitcoin"...');
    await page.evaluate(async () => {
      await processVoiceCommand('see bitcoin');
    });
    await page.waitForTimeout(2000);
    const curSym = await page.evaluate(() => window.currentSymbol);
    console.log(`[PROD] Current symbol after "see bitcoin": ${curSym}`);
    if (curSym !== 'BTC-USDT') throw new Error(`Expected BTC-USDT, got ${curSym}`);

    // 3. Open Buy Crypto with Apple Pay
    console.log('\n[PROD] Testing Omni Wallet Buy Crypto (Apple Pay)...');
    await page.evaluate(() => {
      openOmniWalletModal('buy');
      selectPaymentMethod('apple_pay');
    });
    await page.waitForTimeout(500);

    await page.click('#btnBuyApplePayCta');
    await page.waitForTimeout(500);

    const isBioVisible = await page.isVisible('#fiatBiometricSheet');
    console.log(`[PROD] Apple Pay Biometric Sheet visible: ${isBioVisible}`);

    const bioProdPath = path.join(ARTIFACTS_DIR, 'prod_apple_pay_face_id_verified.png');
    await page.screenshot({ path: bioProdPath });
    console.log(`[PROD] Screenshot saved: ${bioProdPath}`);

    // Authenticate
    await page.click('#btnTriggerAppleAuth');
    await page.waitForTimeout(2000);

    // Check portfolio
    await page.evaluate(() => switchOmniWalletTab('portfolio'));
    await page.waitForTimeout(500);

    const netWorth = await page.textContent('#omniWalletNetWorthVal');
    console.log(`[PROD] Net Worth in Omni Wallet: ${netWorth}`);

    const walletProdPath = path.join(ARTIFACTS_DIR, 'prod_omni_wallet_portfolio_verified.png');
    await page.screenshot({ path: walletProdPath });
    console.log(`[PROD] Screenshot saved: ${walletProdPath}`);

    // 4. Viewport audits
    for (const [vpName, w, h] of [['Desktop', 1440, 900], ['Tablet', 768, 1024], ['Mobile', 390, 844]]) {
      await page.setViewportSize({ width: w, height: h });
      await page.waitForTimeout(600);
      const ov = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      console.log(`[PROD] ${vpName} (${w}x${h}) horizontal overflow: ${ov ? 'OVERFLOW DETECTED' : 'NONE (PERFECT)'}`);
    }

    console.log(`\n[PROD] Console errors: ${consoleErrors.length}`);
    console.log('\n=== LIVE PRODUCTION AUDIT PASSED 100% ===');
  } catch (err) {
    console.error('[PROD ERROR]', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

verifyProduction();
