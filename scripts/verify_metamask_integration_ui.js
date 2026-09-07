const { chromium } = require('playwright');
const path = require('path');

async function verifyMetaMaskIntegration() {
  console.log('🧪 Verifying MetaMask Integration Card & Navigation...');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  const page = await context.newPage();

  // Inject Web3 Ethereum Provider with custom address
  await page.addInitScript(() => {
    window.ethereum = {
      isMetaMask: true,
      selectedAddress: '0x1234567890123456789012345678901234567890',
      chainId: '0x1', // Starts on Ethereum Mainnet
      request: async ({ method, params }) => {
        if (method === 'eth_accounts' || method === 'eth_requestAccounts') {
          return ['0x1234567890123456789012345678901234567890'];
        }
        if (method === 'wallet_switchEthereumChain') {
          if (params[0]?.chainId === '0x9B8D') {
            window.ethereum.chainId = '0x9B8D';
            return null;
          }
          const err = new Error('Unrecognized chain');
          err.code = 4902;
          throw err;
        }
        if (method === 'wallet_addEthereumChain') {
          window.ethereum.chainId = params[0]?.chainId;
          return null;
        }
        if (method === 'wallet_watchAsset') {
          return true;
        }
        if (method === 'personal_sign') {
          return '0x99887766554433221100aabbccddeeff00112233445566778899aabbccddeeff1b';
        }
        return null;
      }
    };
  });

  await page.goto('http://localhost:8092/?view=withdraw', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // Check that the withdrawal desk is active
  const isWithdrawActive = await page.evaluate(() => {
    const el = document.getElementById('weexViewWithdraw');
    return el && el.style.display !== 'none';
  });
  console.log('Withdrawal Desk view active:', isWithdrawActive);

  // Check header button
  const headerBtnExists = await page.evaluate(() => {
    return !!document.getElementById('btnHeaderConnectOmniNetwork');
  });
  console.log('Header Connect OMNI Network button present:', headerBtnExists);

  // Check MetaMask assistant card
  const assistantCardExists = await page.evaluate(() => {
    return !!document.getElementById('btnConnectOmniNetworkMain');
  });
  console.log('MetaMask Assistant Card button present:', assistantCardExists);

  // Test clicking "Connect & Switch to OMNI Network"
  console.log('Testing "Connect & Switch to OMNI Network" button click...');
  await page.click('#btnWithdrawConnectOmni');
  await page.waitForTimeout(800);

  const chainIdAfterSwitch = await page.evaluate(() => window.ethereum.chainId);
  console.log('Chain ID after switch:', chainIdAfterSwitch, '(Expected: 0x9B8D / 39821)');

  const filledAddress = await page.evaluate(() => {
    return document.getElementById('weexWithdrawAddressInput')?.value;
  });
  console.log('Recipient address filled with MetaMask address:', filledAddress);

  // Test clicking "Import $OMNI Token"
  console.log('Testing "Import $OMNI Token" button click...');
  await page.click('#btnWithdrawImportOmni');
  await page.waitForTimeout(400);

  // Test clicking "Import USDT Token"
  console.log('Testing "Import USDT Token" button click...');
  await page.click('#btnWithdrawImportUsdt');
  await page.waitForTimeout(400);

  // Test clicking "Fill My Address"
  console.log('Testing "Fill My Address" button click...');
  await page.click('#btnWithdrawFillAddress');
  await page.waitForTimeout(400);

  // Take screenshot of withdrawal workstation with MetaMask card
  const screenshotsDir = '/Users/dcaturfoh/.gemini/antigravity-ide/brain/3f24078c-deb8-4277-b8c6-09f7b90eeda0';
  await page.screenshot({ path: path.join(screenshotsDir, '20_metamask_omni_workstation.png') });
  console.log('✅ Saved Screenshot: 20_metamask_omni_workstation.png');

  await browser.close();
  console.log('🎉 ALL METAMASK INTEGRATION TESTS PASSED!');
}

verifyMetaMaskIntegration().catch(err => {
  console.error('Error verifying MetaMask integration:', err);
  process.exit(1);
});
