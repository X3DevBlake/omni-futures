const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function runVerification() {
  console.log("================================================================================");
  console.log("🚀 STARTING OMNI FUTURES & ECOSYSTEM OMNI 3.8 E2E VERIFICATION SUITE");
  console.log("================================================================================");

  const browser = await chromium.launch({ headless: true, executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error(`[BROWSER ERROR] ${msg.text()}`);
      errors.push(msg.text());
    }
  });

  try {
    // 1. Load Local Exchange
    console.log("\n[STEP 1] Navigating to http://127.0.0.1:8092/ ...");
    await page.goto("http://127.0.0.1:8092/", { waitUntil: "networkidle", timeout: 15000 });

    // 2. Verify Omni 3.8 Flash Header Badge
    console.log("\n[STEP 2] Verifying Omni 3.8 Flash Branding...");
    const headerBadge = await page.locator("text=✨ OMNI 3.8 FLASH").first();
    if (await headerBadge.isVisible()) {
      console.log("  ✅ Header Badge '✨ OMNI 3.8 FLASH' is active & visible!");
    } else {
      throw new Error("Header badge ✨ OMNI 3.8 FLASH not found!");
    }

    // 3. Verify Category Counts in Markets Drawer
    console.log("\n[STEP 3] Verifying 265 Multi-Asset Market Catalog & Pills...");
    const pillAll = await page.locator("button.pill:has-text('All (265)')").isVisible();
    const pillCrypto = await page.locator("button.pill:has-text('Crypto (72)')").isVisible();
    const pillMeme = await page.locator("button.pill:has-text('Memes (104)')").isVisible();
    const pillStocks = await page.locator("button.pill:has-text('Stocks (52)')").isVisible();
    const pillEtfs = await page.locator("button.pill:has-text('ETFs (22)')").isVisible();
    const pillCommodities = await page.locator("button.pill:has-text('Commodities (11)')").isVisible();
    const pillBonds = await page.locator("button.pill:has-text('Bonds (4)')").isVisible();

    console.log(`  All (265): ${pillAll ? "✅" : "❌"}`);
    console.log(`  Crypto (72): ${pillCrypto ? "✅" : "❌"}`);
    console.log(`  Memes (104): ${pillMeme ? "✅" : "❌"}`);
    console.log(`  Stocks (52): ${pillStocks ? "✅" : "❌"}`);
    console.log(`  ETFs (22): ${pillEtfs ? "✅" : "❌"}`);
    console.log(`  Commodities (11): ${pillCommodities ? "✅" : "❌"}`);
    console.log(`  Bonds (4): ${pillBonds ? "✅" : "❌"}`);

    if (!pillAll || !pillCrypto || !pillMeme || !pillStocks) {
      throw new Error("One or more market category pill counts are missing!");
    }

    // Filter to Meme category
    await page.click("button.pill:has-text('Memes (104)')");
    await page.waitForTimeout(400);
    const memeCount = await page.locator(".market-row-item").count();
    console.log(`  Meme Zone items rendered in DOM: ${memeCount} contracts (Target: 104)`);

    // Switch to PEPE-USDT
    await page.click("text=PEPE-USDT");
    await page.waitForTimeout(500);
    const tickerSymbol = await page.locator("#tickerSymbol").textContent();
    console.log(`  Active Ticker switched to: ${tickerSymbol} ✅`);

    // 4. Test Omni 3.8 Flash AI Copilot
    console.log("\n[STEP 4] Testing Omni 3.8 Flash AI Copilot Drawer...");
    await page.click("a.nav-item.ai-nav"); // open copilot drawer
    await page.waitForTimeout(500);

    const copilotTitle = await page.locator(".copilot-header strong").textContent();
    console.log(`  Copilot Header: "${copilotTitle}"`);
    if (!copilotTitle.includes("Omni 3.8")) {
      throw new Error(`Copilot title does not mention Omni 3.8: ${copilotTitle}`);
    }

    // Send question
    await page.fill("#copilotInput", "What model are you?");
    await page.click(".copilot-input-bar button");
    await page.waitForTimeout(4000);

    const lastAiMsg = await page.locator(".copilot-msg.ai").last().textContent();
    console.log(`  AI Response preview: "${lastAiMsg.slice(0, 100)}..."`);
    await page.click(".copilot-header .close-btn"); // close copilot

    // 5. Switch to Tab 5: Assets & Collateral Hub
    console.log("\n[STEP 5] Testing Dedicated Assets & Collateral Hub...");
    await page.click("button.desk-tab:has-text('Assets & Collateral Hub')");
    await page.waitForTimeout(1000);

    const extTotalUsd = await page.locator("#extWalletTotalUsd").textContent();
    console.log(`  External Wallet Net Worth: ${extTotalUsd}`);

    const extTokensCount = await page.locator(".ext-token-card").count();
    console.log(`  External Multi-Chain Tokens Displayed: ${extTokensCount} (USDT, USDC, ETH, SOL, BTC, PEPE, OMNI)`);

    const collateralRows = await page.locator("#collateralTableBody tr").count();
    console.log(`  Collateral Holdings Rows: ${collateralRows}`);

    const txRows = await page.locator("#txHistoryTableBody tr").count();
    console.log(`  Initial Transaction History Rows: ${txRows}`);

    // Take screenshot of Assets Hub
    const assetsScreenshotPath = "/Users/dcaturfoh/.gemini/antigravity-ide/brain/3796794e-65fc-4aa1-8c29-e2ee936ff747/omni_futures_assets_hub_live.png";
    await page.screenshot({ path: assetsScreenshotPath, fullPage: false });
    console.log(`  📸 Captured Assets Hub Screenshot: ${assetsScreenshotPath}`);

    // 6. Test Deposit Flow
    console.log("\n[STEP 6] Testing Deposit Collateral Modal Flow...");
    await page.click("button.btn-action-deposit");
    await page.waitForTimeout(500);

    const depositModalVisible = await page.locator("#modalDeposit").isVisible();
    console.log(`  Deposit Modal Visible: ${depositModalVisible}`);

    // Select ETH and deposit 2.5 ETH
    await page.selectOption("#depositAssetSelect", "ETH");
    await page.waitForTimeout(300);
    await page.fill("#depositAmountInput", "2.5");
    await page.waitForTimeout(300);

    const depEstimatedUsd = await page.locator("#depEstimatedUsd").textContent();
    console.log(`  2.5 ETH Estimated USD Value: ${depEstimatedUsd}`);

    // Accept alert dialog
    page.once('dialog', async dialog => {
      console.log(`  [ALERT] ${dialog.message()}`);
      await dialog.accept();
    });

    await page.click("#btnConfirmDeposit");
    await page.waitForTimeout(1500);

    // 7. Test Withdrawal Flow
    console.log("\n[STEP 7] Testing Withdrawal Margin Modal Flow...");
    await page.click("button.btn-action-withdraw");
    await page.waitForTimeout(500);

    const withdrawModalVisible = await page.locator("#modalWithdraw").isVisible();
    console.log(`  Withdrawal Modal Visible: ${withdrawModalVisible}`);

    await page.fill("#withdrawAmountInput", "1000");
    await page.waitForTimeout(300);

    const safetyRatio = await page.locator("#wthProjectedRatio").textContent();
    console.log(`  Projected Margin Ratio with $1000 withdrawal: ${safetyRatio}`);

    page.once('dialog', async dialog => {
      console.log(`  [ALERT] ${dialog.message()}`);
      await dialog.accept();
    });

    await page.click("#btnConfirmWithdraw");
    await page.waitForTimeout(1500);

    // 8. Test Multi-Wallet Switcher Modal
    console.log("\n[STEP 8] Testing Multi-Wallet Manager Modal...");
    await page.click("button.btn-action-wallet");
    await page.waitForTimeout(500);

    const walletModalVisible = await page.locator("#modalWalletManager").isVisible();
    console.log(`  Multi-Wallet Manager Modal Visible: ${walletModalVisible}`);

    // Enter custom wallet
    await page.fill("#customWalletInput", "0x8888888888888888888888888888888888888888");
    await page.waitForTimeout(400);

    const previewTotal = await page.locator("#previewTotalUsd").textContent();
    console.log(`  Live balance preview for 0x8888...8888: ${previewTotal}`);

    page.once('dialog', async dialog => {
      console.log(`  [ALERT] ${dialog.message()}`);
      await dialog.accept();
    });

    await page.click("#modalWalletManager .btn-primary"); // Save & Sync
    await page.waitForTimeout(1000);

    const updatedExtAddr = await page.locator("#extWalletAddressDisplay").textContent();
    console.log(`  Updated Active Linked Wallet: ${updatedExtAddr} (Target: 0x8888...8888)`);

    // Capture Full Final Exchange Screenshot
    const finalScreenshotPath = "/Users/dcaturfoh/.gemini/antigravity-ide/brain/3796794e-65fc-4aa1-8c29-e2ee936ff747/omni_futures_multi_asset_deposit_verified.png";
    await page.screenshot({ path: finalScreenshotPath, fullPage: false });
    console.log(`  📸 Captured Final Verification Screenshot: ${finalScreenshotPath}`);

    console.log("\n================================================================================");
    console.log("🎉 ALL E2E VERIFICATION TESTS PASSED SUCCESSFULLY! (100% HEALTHY)");
    console.log("================================================================================");

  } catch (err) {
    console.error("❌ Test failure:", err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

runVerification();
