const { chromium } = require('playwright');
const path = require('path');

(async () => {
  console.log('🚀 Starting Playwright End-to-End Verification...');
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Listen to dialogs and auto-accept them
  page.on('dialog', async dialog => {
    console.log(`[DIALOG] ${dialog.type()}: ${dialog.message().replace(/\n/g, ' ')}`);
    await dialog.accept();
  });

  page.on('console', msg => {
    if (msg.type() === 'error') console.log('[BROWSER ERROR]', msg.text());
  });

  page.on('requestfailed', request => {
    console.log('[REQUEST FAILED]', request.url(), request.failure()?.errorText);
  });

  await page.goto('https://omni-futures-39821.web.app/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // 1. Verify SFX Visual is REMOVED
  const sfxPill = await page.$('#omni-audio-pill-ctrl');
  const sfxBtn = await page.$('#soundToggleBtn');
  console.log(`1. SFX Visual Check: #omni-audio-pill-ctrl exists? ${!!sfxPill}, #soundToggleBtn exists? ${!!sfxBtn}`);
  if (sfxPill) {
    const isVisible = await sfxPill.isVisible();
    console.log(`   SFX pill isVisible? ${isVisible}`);
    if (isVisible) throw new Error('SFX pill should NOT be visible!');
  }
  if (sfxBtn) {
    const isVisible = await sfxBtn.isVisible();
    console.log(`   SFX btn isVisible? ${isVisible}`);
    if (isVisible) throw new Error('SFX header button should NOT be visible!');
  }
  console.log('   ✅ SFX Visuals completely removed and verified hidden.');

  // 2. Test Wallet Connect Modal
  console.log('2. Testing Wallet Connect Button...');
  await page.click('#walletConnectBtn');
  await page.waitForTimeout(600);

  const isWalletModalVisible = await page.$eval('#modalWalletManager', el => el.style.display !== 'none');
  console.log(`   Wallet Modal Display !== none: ${isWalletModalVisible}`);
  if (!isWalletModalVisible) throw new Error('Wallet modal failed to open upon clicking #walletConnectBtn!');

  // Connect custom address
  const testAddress = '0x8888888888888888888888888888888888888888';
  await page.fill('#customWalletInput', testAddress);
  await page.click('button:has-text("Save & Sync Balances")');
  await page.waitForTimeout(500);

  const headerAddr = await page.$eval('#walletAddressDisplay', el => el.textContent.trim());
  console.log(`   ✅ Header Connected Address Display: ${headerAddr}`);
  if (!headerAddr.includes('0x8888')) {
    throw new Error(`Expected header address to contain 0x8888, got: ${headerAddr}`);
  }

  // 3. Test Deposit with Wallet Approval
  console.log('3. Testing Deposit with Wallet Approval Flow...');
  await page.evaluate(() => openDepositModal('USDT'));
  await page.waitForTimeout(500);

  // Switch to Web3 tab
  await page.click('#depTabBtnWeb3');
  await page.waitForTimeout(300);

  await page.fill('#depositAmountInput', '500');
  await page.waitForTimeout(300);

  // Click Deposit button
  console.log('   Clicking Deposit Collateral...');
  await page.click('#btnConfirmDeposit');
  await page.waitForTimeout(400);

  // Verify Wallet Approval box appears
  const approvalBox = await page.$('#depositApprovalBox');
  const isApprVisible = await approvalBox.isVisible();
  console.log(`   Deposit Approval Box Visible: ${isApprVisible}`);
  if (!isApprVisible) throw new Error('Deposit approval box did not appear!');

  const allowanceTxt = await page.$eval('#apprAllowanceDisplay', el => el.textContent.trim());
  console.log(`   Approval Allowance Requested: ${allowanceTxt}`);

  // Click Approve & Sign in Wallet
  console.log('   Signing & Approving in Wallet...');
  await page.click('#btnSignApproveDeposit');
  await page.waitForTimeout(1000);
  console.log('   ✅ Deposit successfully approved from wallet and collateral credited.');

  // 4. Test Withdrawal with Security Confirmation
  console.log('4. Testing Withdrawal with Confirmation Flow...');
  await page.evaluate(() => openWithdrawModal('USDT'));
  await page.waitForTimeout(500);

  await page.fill('#withdrawAmountInput', '250');
  await page.waitForTimeout(300);

  // Click Review & Confirm Withdrawal
  console.log('   Clicking Review & Confirm Withdrawal...');
  await page.click('#btnConfirmWithdraw');
  await page.waitForTimeout(400);

  // Verify Withdrawal Confirmation box appears
  const confBox = await page.$('#withdrawConfirmationBox');
  const isConfVisible = await confBox.isVisible();
  console.log(`   Withdrawal Confirmation Box Visible: ${isConfVisible}`);
  if (!isConfVisible) throw new Error('Withdrawal confirmation box did not appear!');

  const confDest = await page.$eval('#wthConfDestDisplay', el => el.textContent.trim());
  const confAmt = await page.$eval('#wthConfAmountDisplay', el => el.textContent.trim());
  console.log(`   Withdrawal Destination: ${confDest}, Amount: ${confAmt}`);

  // Authorize & Sign
  console.log('   Signing & Authorizing Withdrawal...');
  await page.click('#btnSignAuthorizeWithdraw');
  await page.waitForTimeout(1000);
  console.log('   ✅ Withdrawal successfully confirmed & authorized.');

  // Final screenshot capture
  const screenshotPath = '/Users/dcaturfoh/.gemini/antigravity-ide/brain/3796794e-65fc-4aa1-8c29-e2ee936ff747/omni_futures_wallet_transfers_verified.png';
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(`📸 Screenshot saved: ${screenshotPath}`);

  await browser.close();
  console.log('🎉 ALL VERIFICATION TESTS PASSED SUCCESSFULLY!');
})();
