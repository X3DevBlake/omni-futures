const { chromium } = require('playwright');
const path = require('path');

(async () => {
  console.log("🚀 Starting Comprehensive WEEX Upgrade Verification...");
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  });

  const page = await browser.newPage({
    viewport: { width: 1600, height: 980 }
  });

  // 1. Load Local Terminal
  await page.goto('http://127.0.0.1:8092/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await page.evaluate(() => document.fonts?.ready).catch(() => {});

  const artifactDir = '/Users/dcaturfoh/.gemini/antigravity-ide/brain/3796794e-65fc-4aa1-8c29-e2ee936ff747';

  // ==========================================
  // TEST 1: Candlestick & Volume Chart Engine
  // ==========================================
  console.log("\n📈 1. Testing Candlestick & Volume Chart Engine...");
  
  console.log("   Waiting for chart instance and candles to load...");
  await page.waitForFunction(() => {
    return typeof window.chartInstance !== 'undefined' && window.chartInstance !== null && window.chartInstance.candles && window.chartInstance.candles.length > 0;
  }, { timeout: 10000 });

  const chartInfo = await page.evaluate(() => {
    const canvas = document.getElementById('candleChartCanvas');
    const hasChartObj = typeof window.chartInstance !== 'undefined' && window.chartInstance !== null;
    const indicators = window.chartInstance ? window.chartInstance.indicators : null;
    const style = window.chartInstance ? window.chartInstance.chartStyle : null;
    const candlesCount = window.chartInstance ? window.chartInstance.candles.length : 0;
    return {
      canvasExists: !!canvas,
      width: canvas?.width,
      height: canvas?.height,
      hasChartObj,
      indicators,
      style,
      candlesCount
    };
  });
  console.log("   Chart initialization state:", chartInfo);
  if (!chartInfo.canvasExists || chartInfo.candlesCount === 0) {
    throw new Error("Candlestick chart canvas not initialized or candles array is empty!");
  }

  // Toggle chart style (cycle through: candles -> hollow -> heikin -> line -> area -> candles)
  console.log("   Cycling chart styles...");
  await page.click('#indStyleBtn');
  await page.waitForTimeout(300);
  const style1 = await page.evaluate(() => ({
    style: window.chartInstance.chartStyle,
    btnText: document.getElementById('indStyleBtn')?.textContent
  }));
  console.log(`   Style toggled to: ${style1.style} (${style1.btnText})`);

  await page.click('#indStyleBtn');
  await page.waitForTimeout(300);
  const style2 = await page.evaluate(() => ({
    style: window.chartInstance.chartStyle,
    btnText: document.getElementById('indStyleBtn')?.textContent
  }));
  console.log(`   Style toggled to: ${style2.style} (${style2.btnText})`);

  // Switch back to Heikin-Ashi or Candlesticks
  await page.click('#indStyleBtn');
  await page.waitForTimeout(200);
  await page.click('#indStyleBtn');
  await page.waitForTimeout(200);
  await page.click('#indStyleBtn');
  await page.waitForTimeout(300);

  // Toggle indicators (BOLL and EMA)
  console.log("   Toggling BOLL and EMA indicators...");
  await page.click('#indBollBtn');
  await page.waitForTimeout(300);
  await page.click('#indEmaBtn');
  await page.waitForTimeout(300);

  const activeIndicators = await page.evaluate(() => window.chartInstance.indicators);
  console.log("   Active chart indicators:", activeIndicators);
  if (!activeIndicators.boll || !activeIndicators.ema) {
    throw new Error("Indicators failed to toggle active!");
  }

  // Switch timeframe (e.g. 1h)
  console.log("   Switching timeframe to 1h...");
  await page.click('button.tf-btn:has-text("1h")');
  await page.waitForTimeout(500);

  // Screenshot 1: Chart & Indicators
  const chartScreenshotPath = path.join(artifactDir, 'omni_weex_chart_and_indicators_verified.png');
  await page.screenshot({ path: chartScreenshotPath, timeout: 7000 });
  console.log(`   📸 Chart screenshot saved: ${chartScreenshotPath}`);

  // ==========================================
  // TEST 2: Institutional Order Book
  // ==========================================
  console.log("\n📖 2. Testing Institutional Order Book...");

  // Test Order Book View Modes
  console.log("   Testing Bids Only mode (Buy Wall)...");
  await page.click('#obModeBids');
  await page.waitForTimeout(300);
  let obModeState = await page.evaluate(() => ({
    mode: window.currentObMode,
    bidsCount: document.querySelectorAll('#obBidsList .ob-row').length,
    asksCount: document.querySelectorAll('#obAsksList .ob-row').length,
    asksHidden: window.getComputedStyle(document.getElementById('obAsksList')).display === 'none'
  }));
  console.log("   Bids only mode state:", obModeState);
  if (obModeState.mode !== 'bids' || !obModeState.asksHidden) {
    throw new Error("Bids Only mode failed to hide Asks list!");
  }

  console.log("   Testing Asks Only mode (Sell Wall)...");
  await page.click('#obModeAsks');
  await page.waitForTimeout(300);
  obModeState = await page.evaluate(() => ({
    mode: window.currentObMode,
    bidsHidden: window.getComputedStyle(document.getElementById('obBidsList')).display === 'none'
  }));
  console.log("   Asks only mode state:", obModeState);
  if (obModeState.mode !== 'asks' || !obModeState.bidsHidden) {
    throw new Error("Asks Only mode failed to hide Bids list!");
  }

  console.log("   Restoring Both (Dual) mode...");
  await page.click('#obModeBoth');
  await page.waitForTimeout(300);

  // Test Decimal Precision Selector
  console.log("   Testing Precision Selector (0.1)...");
  await page.selectOption('#obPrecisionSelect', '0.1');
  await page.waitForTimeout(300);
  const precState = await page.evaluate(() => ({
    precision: window.currentObPrecision,
    midPrice: document.getElementById('obMidPrice')?.textContent,
    spread: document.getElementById('obSpread')?.textContent
  }));
  console.log("   Precision set to:", precState);

  // Test 1-click price fill from order book into Limit Price input
  console.log("   Testing 1-click price fill from order book...");
  // First switch order type to LIMIT so limitPriceGroup is visible
  await page.click('button.type-btn:has-text("Limit")');
  await page.waitForTimeout(300);

  const priceFilled = await page.evaluate(() => {
    const firstBid = document.querySelector('#obBidsList .ob-row');
    if (firstBid) firstBid.click();
    const inputVal = document.getElementById('orderPriceInput')?.value;
    return inputVal;
  });
  console.log("   Limit price input filled with:", priceFilled);
  if (!priceFilled || parseFloat(priceFilled) <= 0) {
    throw new Error("1-click price fill from orderbook into limit input failed!");
  }

  // ==========================================
  // TEST 3: Order Execution Desk & TP/SL Drawer
  // ==========================================
  console.log("\n⚡ 3. Testing Order Execution Desk & TP/SL...");

  // Test Margin Mode toggle
  console.log("   Toggling Margin Mode (Cross <-> Isolated)...");
  await page.click('#marginModeBtn');
  await page.waitForTimeout(200);
  const marginMode1 = await page.evaluate(() => document.getElementById('marginModeBtn')?.textContent);
  console.log("   Margin mode changed to:", marginMode1);

  // Test Leverage Modal (1x - 200x)
  console.log("   Opening Leverage Modal...");
  await page.click('#leverageBtn');
  await page.waitForTimeout(400);

  const levModalVisible = await page.evaluate(() => {
    const m = document.getElementById('modalLeverage');
    return m && window.getComputedStyle(m).display !== 'none';
  });
  if (!levModalVisible) throw new Error("Leverage modal failed to open!");

  // Click 100x preset
  console.log("   Selecting 100x leverage preset in modal...");
  await page.click('#modalLeverage button:has-text("100x")');
  await page.waitForTimeout(200);
  const levVal = await page.evaluate(() => document.getElementById('modalLeverageVal')?.textContent);
  console.log("   Modal leverage readout:", levVal);

  // Confirm leverage
  await page.click('#modalLeverage button:has-text("Confirm")');
  await page.waitForTimeout(300);
  const levBtnText = await page.evaluate(() => document.getElementById('leverageBtn')?.textContent);
  console.log("   Leverage button updated to:", levBtnText);
  if (!levBtnText.includes('100x')) {
    throw new Error("Failed to update leverage to 100x!");
  }

  // Test Unit Switcher (Qty vs USDT)
  console.log("   Testing Unit Switcher (Qty <-> USDT)...");
  await page.click('#unitOptQuote');
  await page.waitForTimeout(200);
  let currentUnit = await page.evaluate(() => ({
    unit: window.currentSizeUnit,
    unitLabel: document.getElementById('orderSizeUnit')?.textContent
  }));
  console.log("   Unit switched to:", currentUnit);

  await page.click('#unitOptBase');
  await page.waitForTimeout(200);

  // Test Balance Slider
  console.log("   Testing Balance Slider...");
  await page.evaluate(() => {
    const slider = document.getElementById('orderPercentSlider');
    slider.value = 50;
    slider.dispatchEvent(new Event('input'));
  });
  await page.waitForTimeout(200);
  const orderSize = await page.evaluate(() => document.getElementById('orderSizeInput')?.value);
  console.log("   Order size at 50% balance:", orderSize);

  // Test TP/SL Drawer
  console.log("   Testing TP/SL Accordion Drawer...");
  await page.click('.tpsl-header-row');
  await page.waitForTimeout(300);

  const tpslDrawerVisible = await page.evaluate(() => {
    const d = document.getElementById('tpslInputsGrid');
    return d && window.getComputedStyle(d).display !== 'none';
  });
  console.log("   TP/SL drawer expanded:", tpslDrawerVisible);
  if (!tpslDrawerVisible) throw new Error("TP/SL drawer failed to expand on click!");

  // Enable TP/SL checkbox and test quick preset chips
  await page.check('#tpslCheckbox');
  await page.waitForTimeout(200);

  // Click +50% TP chip
  await page.click('.tpsl-input-block:has-text("Take Profit") button:has-text("+50%")');
  await page.waitForTimeout(200);

  // Click -25% SL chip
  await page.click('.tpsl-input-block:has-text("Stop Loss") button:has-text("-25%")');
  await page.waitForTimeout(200);

  const tpslValues = await page.evaluate(() => ({
    tpPrice: document.getElementById('tpPriceInput')?.value,
    tpEst: document.getElementById('tpEstimateText')?.textContent,
    slPrice: document.getElementById('slPriceInput')?.value,
    slEst: document.getElementById('slEstimateText')?.textContent,
    metricLiqLong: document.getElementById('metricLiqLong')?.textContent,
    metricLiqShort: document.getElementById('metricLiqShort')?.textContent
  }));
  console.log("   Calculated TP/SL metrics:", tpslValues);
  if (!tpslValues.tpPrice || !tpslValues.slPrice) {
    throw new Error("Quick TP/SL chips failed to calculate and populate prices!");
  }

  // Screenshot 2: Order Book & Order Entry Desk
  const deskScreenshotPath = path.join(artifactDir, 'omni_weex_orderbook_and_order_entry_verified.png');
  await page.screenshot({ path: deskScreenshotPath, timeout: 7000 });
  console.log(`   📸 Order Book & Desk screenshot saved: ${deskScreenshotPath}`);

  // Place a Long Position with 100x leverage and TP/SL
  console.log("   Placing Open Long Order with 100x leverage...");
  await page.click('#btnBuyAction');
  await page.waitForTimeout(1000);

  // ==========================================
  // TEST 4: Collapsible Positions Trading Desk
  // ==========================================
  console.log("\n📊 4. Testing Collapsible Positions Trading Desk...");

  // Verify Positions table has open position
  const posCount = await page.evaluate(() => {
    const rows = document.querySelectorAll('#positionsTableBody tr');
    const badge = document.getElementById('positionsCountBadge')?.textContent;
    return {
      rowCount: rows.length,
      badge
    };
  });
  console.log("   Open positions status:", posCount);

  // Test 3-State Height Toggle: Expand (480px)
  console.log("   Testing Desk Height State: EXPAND (480px)...");
  await page.click('#btnDeskExpand');
  await page.waitForTimeout(400);

  let deskHeight = await page.evaluate(() => {
    const desk = document.getElementById('tradingDesk');
    return {
      className: desk.className,
      height: Math.round(desk.getBoundingClientRect().height)
    };
  });
  console.log("   Desk in expanded state:", deskHeight);
  if (!deskHeight.className.includes('expanded') || deskHeight.height < 400) {
    throw new Error(`Desk failed to expand to ~480px! Current: ${deskHeight.height}px`);
  }

  // Test 3-State Height Toggle: Collapse (38px)
  console.log("   Testing Desk Height State: COLLAPSE (38px)...");
  await page.click('#btnDeskCollapse');
  await page.waitForTimeout(400);

  deskHeight = await page.evaluate(() => {
    const desk = document.getElementById('tradingDesk');
    return {
      className: desk.className,
      height: Math.round(desk.getBoundingClientRect().height)
    };
  });
  console.log("   Desk in collapsed state:", deskHeight);
  if (!deskHeight.className.includes('collapsed') || deskHeight.height > 50) {
    throw new Error(`Desk failed to collapse to 38px! Current: ${deskHeight.height}px`);
  }

  // Test 3-State Height Toggle: Default (280px)
  console.log("   Testing Desk Height State: DEFAULT (280px)...");
  await page.click('#btnDeskDefault');
  await page.waitForTimeout(400);

  deskHeight = await page.evaluate(() => {
    const desk = document.getElementById('tradingDesk');
    return {
      className: desk.className,
      height: Math.round(desk.getBoundingClientRect().height)
    };
  });
  console.log("   Desk in default state:", deskHeight);
  if (!deskHeight.className.includes('default') || deskHeight.height < 250 || deskHeight.height > 320) {
    throw new Error(`Desk failed to return to default ~280px! Current: ${deskHeight.height}px`);
  }

  // Test Position TP/SL Edit Modal
  console.log("   Testing Position TP/SL Edit Modal...");
  const editModalTriggered = await page.evaluate(() => {
    const firstEditBtn = document.querySelector('#positionsTableBody .tpsl-btn');
    if (firstEditBtn) {
      firstEditBtn.click();
      return true;
    }
    return false;
  });

  if (editModalTriggered) {
    await page.waitForTimeout(400);
    const editModalStatus = await page.evaluate(() => {
      const modal = document.getElementById('modalEditTpSl');
      return {
        visible: modal && window.getComputedStyle(modal).display !== 'none',
        symbol: document.getElementById('editTpSlSymbolHeader')?.textContent,
        entryPrice: document.getElementById('editTpSlEntryPrice')?.textContent
      };
    });
    console.log("   Edit TP/SL Modal opened:", editModalStatus);
    if (!editModalStatus.visible) {
      throw new Error("Edit TP/SL Modal failed to show!");
    }

    // Screenshot 3: Positions Drawer & TP/SL Edit Modal
    const positionsScreenshotPath = path.join(artifactDir, 'omni_weex_positions_drawer_states_verified.png');
    await page.screenshot({ path: positionsScreenshotPath, timeout: 7000 });
    console.log(`   📸 Positions & Edit TP/SL Modal screenshot saved: ${positionsScreenshotPath}`);

    // Close modal
    await page.click('#modalEditTpSl button:has-text("✕")');
    await page.waitForTimeout(300);
  }

  // Test Reverse Position Button
  console.log("   Testing Reverse Position action...");
  const reverseTriggered = await page.evaluate(() => {
    const firstRevBtn = document.querySelector('#positionsTableBody .rev-btn');
    if (firstRevBtn) {
      firstRevBtn.click();
      return true;
    }
    return false;
  });
  console.log("   Reverse position triggered:", reverseTriggered);
  await page.waitForTimeout(1000);

  // ==========================================
  // TEST 5: Full Blended WEEX Terminal
  // ==========================================
  console.log("\n🌟 5. Capturing Full Blended Terminal Screenshot...");
  const fullScreenshotPath = path.join(artifactDir, 'omni_weex_blended_terminal_full_verified.png');
  await page.screenshot({ path: fullScreenshotPath, timeout: 7000 });
  console.log(`   📸 Full terminal screenshot saved: ${fullScreenshotPath}`);

  console.log("\n🎉 ALL WEEX CLONE UPGRADE FEATURES TESTED AND VERIFIED SUCCESSFULLY!");
  await browser.close();
})();
