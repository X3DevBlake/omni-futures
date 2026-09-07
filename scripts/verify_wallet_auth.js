const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function run() {
  console.log('🚀 Starting Web3 Wallet Withdrawal Verification...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1000 }
  });
  const page = await context.newPage();

  // Mock window.ethereum before page load
  await page.addInitScript(() => {
    window.__mockEthereumState = {
      behavior: 'awaiting', // 'awaiting', 'reject', 'sign'
      calls: []
    };

    window.ethereum = {
      isMetaMask: true,
      selectedAddress: '0x7a250d5630b4cf539739df2c5dacb4c659f2488d',
      request: async ({ method, params }) => {
        window.__mockEthereumState.calls.push({ method, params });
        if (method === 'personal_sign') {
          if (window.__mockEthereumState.behavior === 'reject') {
            const err = new Error('User rejected the request.');
            err.code = 4001;
            throw err;
          }
          // Default or 'sign'
          return '0x99a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef1b';
        }
        if (method === 'eth_accounts') {
          return ['0x7a250d5630b4cf539739df2c5dacb4c659f2488d'];
        }
        return null;
      }
    };
  });

  await page.goto('http://localhost:8092/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // 1. Switch to Assets / Withdraw view
  console.log('1. Navigating to Withdrawal Workstation...');
  await page.evaluate(() => {
    switchWeexView('withdraw');
  });
  await page.waitForTimeout(600);

  // Check that chkWeexFastWithdraw is gone
  const fastChk = await page.$('#chkWeexFastWithdraw');
  if (fastChk) {
    console.error('❌ FAILURE: chkWeexFastWithdraw still exists in DOM!');
    process.exit(1);
  } else {
    console.log('✅ PASSED: chkWeexFastWithdraw auto-bypass checkbox completely removed.');
  }

  // Check Web3 provider label and submit button
  const submitBtnText = await page.$eval('#btnWeexSubmitWithdraw', el => el.textContent.trim());
  console.log(`✅ Submit button text: "${submitBtnText}"`);

  // 2. Test Rejection Safeguard
  console.log('\n2. Testing Web3 Wallet Rejection Safeguard...');
  // Configure mock to REJECT
  await page.evaluate(() => {
    window.__mockEthereumState.behavior = 'reject';
  });

  const balanceBeforeReject = await page.evaluate(() => accountAvailable);
  console.log(`   Collateral available before rejection: $${balanceBeforeReject.toFixed(2)}`);

  // Trigger withdrawal modal
  await page.click('#btnWeexSubmitWithdraw');
  await page.waitForTimeout(600);

  // Check modal is visible
  const modalDisplay = await page.$eval('#modalWithdraw2FA', el => el.style.display);
  console.log(`   Modal display: ${modalDisplay}`);

  // Check status container
  const statusDeclinedText = await page.$eval('#didSignatureStatusText', el => el.textContent.trim());
  console.log(`   Status text on rejection: "${statusDeclinedText}"`);

  const balanceAfterReject = await page.evaluate(() => accountAvailable);
  console.log(`   Collateral available after rejection: $${balanceAfterReject.toFixed(2)}`);

  if (balanceBeforeReject !== balanceAfterReject) {
    console.error('❌ FAILURE: Collateral was deducted on rejection!');
    process.exit(1);
  } else {
    console.log('✅ PASSED: Zero collateral was deducted upon user wallet rejection.');
  }

  const screenshotsDir = path.join(__dirname, '../screenshots');
  if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });
  await page.screenshot({ path: path.join(screenshotsDir, '01_withdrawal_rejection_safeguard.png') });

  // 3. Test Signature Approval & Real Cryptographic Dispatch
  console.log('\n3. Testing Web3 Wallet Signature Approval & Execution...');
  await page.evaluate(() => {
    window.__mockEthereumState.behavior = 'sign';
  });

  // Click retry signature
  await page.click('#btnSignWithWeb3Wallet');
  await page.waitForTimeout(900);

  const balanceAfterSign = await page.evaluate(() => accountAvailable);
  console.log(`   Collateral available after approved signature: $${balanceAfterSign.toFixed(2)}`);

  if (balanceAfterSign >= balanceBeforeReject) {
    console.error('❌ FAILURE: Balance was not deducted after approved signature!');
    process.exit(1);
  } else {
    console.log(`✅ PASSED: Collateral safely disbursed: -$${(balanceBeforeReject - balanceAfterSign).toFixed(2)}.`);
  }

  // Verify recent withdrawal records
  await page.waitForTimeout(500);
  const recordsCount = await page.evaluate(() => {
    const records = JSON.parse(localStorage.getItem('omni_withdraw_records') || '[]');
    return records.length;
  });
  console.log(`✅ Total recorded withdrawals: ${recordsCount}`);

  await page.screenshot({ path: path.join(screenshotsDir, '02_withdrawal_approved_confirmed.png') });

  // 4. Test Trading Terminal Modal Rejection Safeguard
  console.log('\n4. Testing Trading Terminal Modal Web3 Rejection Safeguard...');
  await page.evaluate(() => {
    switchWeexView('terminal');
    openWithdrawModal();
    // Fill amount
    const amtInput = document.getElementById('withdrawAmountInput');
    if (amtInput) {
      amtInput.value = '100';
      updateWithdrawPreview();
    }
    submitWithdraw();
  });
  await page.waitForTimeout(400);

  // Set mock to reject
  await page.evaluate(() => {
    window.__mockEthereumState.behavior = 'reject';
  });

  const termBalanceBefore = await page.evaluate(() => accountAvailable);
  await page.click('#btnSignAuthorizeWithdraw');
  await page.waitForTimeout(400);

  const termStatusMsg = await page.$eval('#withdrawStatusMsg', el => el.textContent.trim());
  console.log(`   Terminal status message on rejection: "${termStatusMsg}"`);

  const termBalanceAfter = await page.evaluate(() => accountAvailable);
  if (termBalanceBefore !== termBalanceAfter) {
    console.error('❌ FAILURE: Terminal balance was deducted on rejection!');
    process.exit(1);
  } else {
    console.log('✅ PASSED: Trading Terminal collateral strictly preserved on wallet rejection.');
  }

  await page.screenshot({ path: path.join(screenshotsDir, '03_terminal_rejection_safeguard.png') });

  await browser.close();
  console.log('\n🎉 ALL WEB3 WALLET WITHDRAWAL VERIFICATION TESTS PASSED!');
}

run().catch(err => {
  console.error('Error running test:', err);
  process.exit(1);
});
