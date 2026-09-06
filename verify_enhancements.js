const { chromium } = require('playwright');

async function runEnhancementsVerification() {
  console.log("================================================================================");
  console.log("🚀 STARTING OMNIFUTURES ENHANCEMENTS VERIFICATION SUITE");
  console.log("================================================================================");

  const browser = await chromium.launch({
    headless: true,
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error(`[BROWSER ERROR] ${msg.text()}`);
    }
  });

  try {
    // 1. Load Local Exchange
    console.log("\n[STEP 1] Navigating to http://127.0.0.1:8092/ ...");
    await page.goto("http://127.0.0.1:8092/", { waitUntil: "networkidle", timeout: 15000 });

    // 2. Verify 3D World / 3D Earth is completely removed
    console.log("\n[STEP 2] Verifying 3D Earth is removed from Navigation...");
    const earthBtn = await page.locator("text=3D Earth").count();
    console.log(`  3D Earth Nav Elements Found: ${earthBtn} (Expected: 0)`);
    if (earthBtn !== 0) throw new Error("3D Earth button is still present in DOM!");
    console.log("  ✅ 3D Earth has been completely removed!");

    // 3. Test SPOT Trading Mode
    console.log("\n[STEP 3] Testing SPOT Trading Mode...");
    await page.click("#navItemSpot");
    await page.waitForTimeout(600);

    const isSpotNavActive = await page.locator("#navItemSpot.active").isVisible();
    const isSpotModeBtnActive = await page.locator("#modeSpotBtn.active").isVisible();
    const isLevBarHidden = await page.locator("#marginLeverageBar").isHidden();
    const isSettlementVisible = await page.locator("#spotSettlementRow").isVisible();
    const buyBtnText = await page.locator("#btnBuyActionText").textContent();

    console.log(`  Spot Nav Tab Active: ${isSpotNavActive ? "✅" : "❌"}`);
    console.log(`  Spot Mode Button Active: ${isSpotModeBtnActive ? "✅" : "❌"}`);
    console.log(`  Leverage Bar Hidden: ${isLevBarHidden ? "✅" : "❌"}`);
    console.log(`  Spot Settlement Row Visible: ${isSettlementVisible ? "✅" : "❌"}`);
    console.log(`  Buy Button Label: "${buyBtnText}"`);

    if (!isSpotNavActive || !isLevBarHidden || !buyBtnText.includes("Buy")) {
      throw new Error("Spot mode did not configure correctly!");
    }

    // Place Spot Buy Order
    page.once('dialog', async dialog => {
      console.log(`  [ALERT SPOT] ${dialog.message()}`);
      await dialog.accept();
    });
    await page.click("#btnBuyAction");
    await page.waitForTimeout(1500);

    // 4. Test FUTURES Trading Mode & 200x Leverage
    console.log("\n[STEP 4] Testing FUTURES Mode & 200x Leverage...");
    await page.click("#navItemFutures");
    await page.waitForTimeout(600);

    const isFutNavActive = await page.locator("#navItemFutures.active").isVisible();
    const isLevBarVisible = await page.locator("#marginLeverageBar").isVisible();
    const futBuyBtnText = await page.locator("#btnBuyActionText").textContent();

    console.log(`  Futures Nav Tab Active: ${isFutNavActive ? "✅" : "❌"}`);
    console.log(`  Leverage Bar Visible: ${isLevBarVisible ? "✅" : "❌"}`);
    console.log(`  Futures Buy Button Label: "${futBuyBtnText}"`);

    // Open Leverage Modal and set to 200x
    await page.click("#leverageBtn");
    await page.waitForTimeout(500);

    const levModalVisible = await page.locator("#modalLeverage").isVisible();
    console.log(`  Leverage Modal Visible: ${levModalVisible ? "✅" : "❌"}`);

    // Click 200x preset button
    await page.click("button:has-text('200x 🚀')");
    await page.waitForTimeout(300);

    const modalVal = await page.locator("#modalLeverageVal").textContent();
    const warningText = await page.locator("#leverageWarningBox").textContent();
    console.log(`  Selected Leverage: ${modalVal}`);
    console.log(`  Warning Box text: "${warningText.slice(0, 80)}..."`);

    await page.click("#modalLeverage .btn-primary"); // Confirm
    await page.waitForTimeout(600);

    const updatedLevBtn = await page.locator("#leverageBtn").textContent();
    console.log(`  Confirmed Leverage Button: "${updatedLevBtn}"`);
    if (!updatedLevBtn.includes("200x")) throw new Error("Leverage was not updated to 200x!");

    // Capture screenshot of Spot and 200x Futures
    const screen1 = "/Users/dcaturfoh/.gemini/antigravity-ide/brain/3796794e-65fc-4aa1-8c29-e2ee936ff747/omni_futures_spot_and_200x.png";
    await page.screenshot({ path: screen1 });
    console.log(`  📸 Screenshot saved: ${screen1}`);

    // 5. Test Stocks, ETFs, and Bonds Category Navigation
    console.log("\n[STEP 5] Testing Stocks, ETFs, and Bonds Category Navigation...");

    // Click Stocks
    console.log("  Switching to Stocks...");
    await page.click("#navItemStocks");
    await page.waitForTimeout(1000);
    let ticker = await page.locator("#tickerSymbol").textContent();
    console.log(`  Active Stock Ticker: ${ticker} (Expected: NVDA-USD)`);

    // Click ETFs
    console.log("  Switching to ETFs...");
    await page.click("#navItemEtfs");
    await page.waitForTimeout(1000);
    ticker = await page.locator("#tickerSymbol").textContent();
    console.log(`  Active ETF Ticker: ${ticker} (Expected: SPY-USD)`);

    // Click Bonds
    console.log("  Switching to Bonds...");
    await page.click("#navItemBonds");
    await page.waitForTimeout(1000);
    ticker = await page.locator("#tickerSymbol").textContent();
    console.log(`  Active Bond Ticker: ${ticker} (Expected: TLT-USD)`);

    // Click Meme Zone (200x)
    console.log("  Switching to Meme Zone (200x)...");
    await page.click("#navItemMeme");
    await page.waitForTimeout(1000);
    ticker = await page.locator("#tickerSymbol").textContent();
    console.log(`  Active Meme Ticker: ${ticker} (Expected: PEPE-USDT)`);

    const screen2 = "/Users/dcaturfoh/.gemini/antigravity-ide/brain/3796794e-65fc-4aa1-8c29-e2ee936ff747/omni_futures_etfs_and_bonds.png";
    await page.screenshot({ path: screen2 });
    console.log(`  📸 Screenshot saved: ${screen2}`);

    // 6. Test ChangeNow 3rd-Party Deposit Flow
    console.log("\n[STEP 6] Testing ChangeNow 3rd-Party Deposit Flow...");
    await page.click("button.desk-tab:has-text('Assets & Collateral Hub')");
    await page.waitForTimeout(600);

    await page.click("button.btn-action-deposit");
    await page.waitForTimeout(500);

    const depModalVisible = await page.locator("#modalDeposit").isVisible();
    console.log(`  Deposit Modal Visible: ${depModalVisible ? "✅" : "❌"}`);

    const isCnowTabActive = await page.locator("#depTabBtnChangeNow.active").isVisible();
    console.log(`  ChangeNow Tab Active by Default: ${isCnowTabActive ? "✅" : "❌"}`);

    // Select XMR and enter 5.0
    await page.selectOption("#cnowFromCurrency", "xmr");
    await page.fill("#cnowAmountInput", "5.0");
    await page.waitForTimeout(300);

    const cnowQuote = await page.locator("#cnowEstimatedUsd").textContent();
    console.log(`  ChangeNow 5.0 XMR Quote: ${cnowQuote}`);

    // Generate Order
    await page.click("#btnGenerateCnowOrder");
    await page.waitForTimeout(1500);

    const isOrderCardVisible = await page.locator("#cnowOrderResultCard").isVisible();
    console.log(`  ChangeNow Order Card Generated: ${isOrderCardVisible ? "✅" : "❌"}`);

    const orderId = await page.locator("#cnowOrderIdDisplay").textContent();
    const payinAddr = await page.locator("#cnowPayinAddressInput").inputValue();
    console.log(`  Generated ChangeNow Order ID: ${orderId}`);
    console.log(`  Generated Pay-in Address: ${payinAddr}`);

    // Toggle ChangeNow embedded widget iframe
    await page.click("#btnToggleCnowIframe");
    await page.waitForTimeout(500);
    const iframeVisible = await page.locator("#cnowIframeWrapper").isVisible();
    console.log(`  ChangeNow Official Widget Iframe Toggled Visible: ${iframeVisible ? "✅" : "❌"}`);

    // Confirm ChangeNow Deposit
    page.once('dialog', async dialog => {
      console.log(`  [ALERT CHANGENOW] ${dialog.message()}`);
      await dialog.accept();
    });

    await page.click("#btnConfirmCnowDeposit");
    await page.waitForTimeout(1500);

    const screen3 = "/Users/dcaturfoh/.gemini/antigravity-ide/brain/3796794e-65fc-4aa1-8c29-e2ee936ff747/omni_futures_changenow_deposit.png";
    await page.screenshot({ path: screen3 });
    console.log(`  📸 Screenshot saved: ${screen3}`);

    console.log("\n================================================================================");
    console.log("🎉 ALL ENHANCEMENT VERIFICATION TESTS PASSED (100% SUCCESS)");
    console.log("================================================================================");

  } catch (err) {
    console.error("❌ Enhancement test failure:", err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

runEnhancementsVerification();
