const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACTS_DIR = '/Users/dcaturfoh/.gemini/antigravity-ide/brain/3796794e-65fc-4aa1-8c29-e2ee936ff747';

async function runAudit() {
  console.log('🚀 Starting Comprehensive Omni Wallet & Gemini Live Audit...');
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      console.error('Browser Error:', msg.text());
    }
  });

  // Load local fullstack app
  await page.goto('http://localhost:8092', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  console.log('1️⃣ Auditing Header Navigation Buttons...');
  // Check Buy Crypto Header Button
  const btnBuy = await page.$('#btnBuyCryptoHeader');
  if (!btnBuy) throw new Error('Missing #btnBuyCryptoHeader');
  await btnBuy.click();
  await page.waitForTimeout(500);

  const walletModal = await page.$('#modalOmniWallet');
  const isWalletVisible = await walletModal.isVisible();
  console.log('  Omni Wallet visible after Buy Crypto click:', isWalletVisible);
  if (!isWalletVisible) throw new Error('Omni Wallet did not open on Buy Crypto click');

  const buyPane = await page.$('#owPaneBuy');
  const isBuyActive = await buyPane.evaluate(el => el.classList.contains('active'));
  console.log('  Buy tab pane active:', isBuyActive);
  if (!isBuyActive) throw new Error('Buy tab pane is not active');

  // Screenshot Buy Crypto Tab
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'omni_wallet_buy_crypto_tab.png') });

  console.log('2️⃣ Testing Apple Pay Biometric Flow...');
  const applePayCta = await page.$('#btnBuyApplePayCta');
  await applePayCta.click();
  await page.waitForTimeout(500);

  const bioSheet = await page.$('#fiatBiometricSheet');
  const isBioVisible = await bioSheet.isVisible();
  console.log('  Biometric sheet visible:', isBioVisible);
  if (!isBioVisible) throw new Error('Biometric sheet did not open');

  const appleView = await page.$('#applePaySheetView');
  const isAppleViewActive = await appleView.evaluate(el => el.classList.contains('active'));
  console.log('  Apple Pay Face ID view active:', isAppleViewActive);

  // Screenshot Apple Pay Biometric Sheet
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'omni_apple_pay_faceid_sheet.png') });

  // Authenticate Face ID
  const authAppleBtn = await page.$('#btnTriggerAppleAuth');
  const preEquity = await page.evaluate(() => window.accountEquity);
  console.log('  Pre-checkout account equity:', preEquity);

  await authAppleBtn.click();
  console.log('  Clicked Authenticate Face ID. Waiting for simulation & auto credit...');
  await page.waitForTimeout(1800);

  const postEquity = await page.evaluate(() => window.accountEquity);
  console.log('  Post-checkout account equity:', postEquity);
  if (postEquity <= preEquity) throw new Error(`Equity did not increase! pre=${preEquity}, post=${postEquity}`);

  // Screenshot Wallet after payment credit
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'omni_wallet_post_apple_pay_credit.png') });

  console.log('3️⃣ Testing Deposit & Portfolio Tabs...');
  const tabDepositBtn = await page.$('#owTabBtnDeposit');
  await tabDepositBtn.click();
  await page.waitForTimeout(400);
  const depPane = await page.$('#owPaneDeposit');
  const isDepActive = await depPane.evaluate(el => el.classList.contains('active'));
  console.log('  Deposit tab active:', isDepActive);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'omni_wallet_deposit_tab.png') });

  const tabPortfolioBtn = await page.$('#owTabBtnPortfolio');
  await tabPortfolioBtn.click();
  await page.waitForTimeout(400);
  const portPane = await page.$('#owPanePortfolio');
  const isPortActive = await portPane.evaluate(el => el.classList.contains('active'));
  console.log('  Portfolio tab active:', isPortActive);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'omni_wallet_portfolio_tab.png') });

  // Close wallet modal
  await page.evaluate(() => window.closeOmniWalletModal());
  await page.waitForTimeout(400);

  console.log('4️⃣ Auditing Gemini Live Voice Command: "see bitcoin"...');
  // First switch away from BTC to test switching to BTC
  await page.evaluate(() => window.switchSymbol('ETH-USDT'));
  await page.waitForTimeout(600);
  let curSym = await page.evaluate(() => window.currentSymbol);
  console.log('  Current symbol before command:', curSym);

  // Open Gemini Live Drawer
  await page.evaluate(() => window.toggleVoiceTrading());
  await page.waitForTimeout(600);

  // Send "see bitcoin"
  const liveInput = await page.$('#geminiLiveTextInput');
  await liveInput.fill('see bitcoin');
  const sendBtn = await page.$('#btnSendGeminiLive');
  if (sendBtn) {
    await sendBtn.click();
  } else {
    await page.evaluate(() => window.sendGeminiLiveInput());
  }

  console.log('  Sent "see bitcoin". Waiting for voice response & autonomous tool execution...');
  await page.waitForTimeout(1600);

  curSym = await page.evaluate(() => window.currentSymbol);
  console.log('  Current symbol after "see bitcoin":', curSym);
  if (curSym !== 'BTC-USDT') {
    throw new Error(`Expected BTC-USDT, but got ${curSym}`);
  }

  // Check speech transcript
  const transcriptText = await page.evaluate(() => {
    const el = document.getElementById('voiceTranscript');
    return el ? el.textContent : '';
  });
  console.log('  Transcript:', transcriptText);

  // Screenshot Gemini Live after switching to Bitcoin
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'gemini_live_see_bitcoin_verified.png') });

  console.log('5️⃣ Auditing Gemini Live Voice Command: "open wallet"...');
  await liveInput.fill('open wallet');
  await page.evaluate(() => window.sendGeminiLiveInput());
  await page.waitForTimeout(1200);

  const walletOpenAfterVoice = await page.$eval('#modalOmniWallet', el => el.style.display !== 'none');
  console.log('  Wallet opened via Gemini Live voice command:', walletOpenAfterVoice);
  if (!walletOpenAfterVoice) throw new Error('Wallet did not open via Gemini Live command');

  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'gemini_live_open_wallet_verified.png') });
  await page.evaluate(() => window.closeOmniWalletModal());
  await page.waitForTimeout(400);

  console.log('6️⃣ Viewport & Overflow Audit (Desktop, Tablet, Mobile)...');
  const viewports = [
    { name: 'Desktop_1440x900', width: 1440, height: 900 },
    { name: 'Tablet_768x1024', width: 768, height: 1024 },
    { name: 'Mobile_390x844', width: 390, height: 844 }
  ];

  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.waitForTimeout(500);

    const overflow = await page.evaluate(() => {
      return {
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        hasOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
      };
    });

    console.log(`  Viewport ${vp.name}: scrollWidth=${overflow.scrollWidth}, clientWidth=${overflow.clientWidth}, hasOverflow=${overflow.hasOverflow}`);
    if (overflow.hasOverflow) {
      console.warn(`  ⚠️ Warning: Horizontal overflow detected on ${vp.name}`);
    }

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, `omni_responsive_${vp.name}.png`) });
  }

  console.log('✅ Audit Completed Successfully with 0 breaking errors!');
  console.log('Filtered console errors:', consoleErrors.filter(e => !e.includes('favicon')));
  await browser.close();
}

runAudit().catch(err => {
  console.error('❌ Audit Failed:', err);
  process.exit(1);
});
