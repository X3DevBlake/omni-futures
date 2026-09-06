const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('dialog', async d => await d.accept());

  await page.goto('https://omni-futures-39821.web.app/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  // 1. Capture Wallet Modal
  await page.click('#walletConnectBtn');
  await page.waitForTimeout(500);
  await page.screenshot({
    path: '/Users/dcaturfoh/.gemini/antigravity-ide/brain/3796794e-65fc-4aa1-8c29-e2ee936ff747/omni_wallet_modal_live.png'
  });
  console.log('Saved omni_wallet_modal_live.png');

  // Close wallet modal
  await page.click('#modalWalletManager .close-btn');
  await page.waitForTimeout(400);

  // 2. Capture Deposit with Wallet Approval
  await page.evaluate(() => openDepositModal('USDT'));
  await page.waitForTimeout(400);
  await page.click('#depTabBtnWeb3');
  await page.waitForTimeout(300);
  await page.fill('#depositAmountInput', '1000');
  await page.click('#btnConfirmDeposit');
  await page.waitForTimeout(500);
  await page.screenshot({
    path: '/Users/dcaturfoh/.gemini/antigravity-ide/brain/3796794e-65fc-4aa1-8c29-e2ee936ff747/omni_deposit_approval_live.png'
  });
  console.log('Saved omni_deposit_approval_live.png');

  // Close deposit modal
  await page.click('#modalDeposit .close-btn');
  await page.waitForTimeout(400);

  // 3. Capture Withdraw with Security Confirmation
  await page.evaluate(() => openWithdrawModal('USDT'));
  await page.waitForTimeout(400);
  await page.fill('#withdrawAmountInput', '500');
  await page.click('#btnConfirmWithdraw');
  await page.waitForTimeout(500);
  await page.screenshot({
    path: '/Users/dcaturfoh/.gemini/antigravity-ide/brain/3796794e-65fc-4aa1-8c29-e2ee936ff747/omni_withdraw_confirmation_live.png'
  });
  console.log('Saved omni_withdraw_confirmation_live.png');

  await browser.close();
})();
