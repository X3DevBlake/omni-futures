const { chromium } = require('playwright');
const path = require('path');

(async () => {
  console.log("🚀 Starting Verification: Sophisticated Layout & Floating Market Explorer...");
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  });

  const page = await browser.newPage({
    viewport: { width: 1560, height: 960 }
  });

  // 1. Load Local Terminal
  await page.goto('http://127.0.0.1:8092/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await page.evaluate(() => document.fonts?.ready).catch(() => {});

  // 2. Verify Left Drawer Box is Removed & Chart Expands
  console.log("1. Checking that left drawer box is removed from main layout...");
  const drawerExistsInLayout = await page.evaluate(() => {
    const layout = document.querySelector('.trading-layout');
    const drawerInLayout = layout ? layout.querySelector('#marketsDrawer') : null;
    const chartSection = document.querySelector('.chart-section');
    const chartWidth = chartSection ? chartSection.getBoundingClientRect().width : 0;
    return {
      hasDrawerInLayout: !!drawerInLayout,
      chartWidth: Math.round(chartWidth)
    };
  });
  console.log("   Layout status:", drawerExistsInLayout);
  if (drawerExistsInLayout.hasDrawerInLayout) {
    throw new Error("Clunky left drawer still exists in .trading-layout!");
  }
  console.log(`   ✅ Left drawer box removed! Chart section expanded to ${drawerExistsInLayout.chartWidth}px width!`);

  // 3. Open Floating Market Explorer via Ticker Selector Button
  console.log("2. Opening Floating Market Explorer popover via Ticker Selector Button...");
  await page.click('#tickerSelectorBtn');
  await page.waitForTimeout(600);

  const explorerStatus = await page.evaluate(() => {
    const modal = document.getElementById('marketExplorerModal');
    const isVisible = modal && window.getComputedStyle(modal).display !== 'none';
    const rows = document.querySelectorAll('#explorerTableBody .explorer-row');
    const allCount = document.getElementById('expAllCount')?.textContent;
    return {
      isVisible,
      rowCount: rows.length,
      allCount
    };
  });
  console.log("   Explorer status:", explorerStatus);
  if (!explorerStatus.isVisible || explorerStatus.rowCount === 0) {
    throw new Error("Floating Market Explorer failed to open or render table rows!");
  }
  console.log(`   ✅ Floating Market Explorer opened with ${explorerStatus.rowCount} table rows! (All: ${explorerStatus.allCount})`);

  // 4. Capture screenshot of Floating Market Explorer Open
  const popoverScreenshotPath = '/Users/dcaturfoh/.gemini/antigravity-ide/brain/3796794e-65fc-4aa1-8c29-e2ee936ff747/omni_market_explorer_popover_open.png';
  try {
    await page.screenshot({ path: popoverScreenshotPath, timeout: 5000 });
    console.log(`📸 Screenshot saved: ${popoverScreenshotPath}`);
  } catch (err) {
    console.log("Screenshot notice:", err.message);
  }

  // 5. Test Search with Character Highlighting
  console.log("3. Testing Search Query ('chill')...");
  await page.fill('#explorerSearchInput', 'chill');
  await page.waitForTimeout(400);

  const searchResults = await page.evaluate(() => {
    const rows = document.querySelectorAll('#explorerTableBody .explorer-row');
    const matches = Array.from(rows).map(r => r.querySelector('td:nth-child(2)')?.textContent.trim());
    const highlights = document.querySelectorAll('#explorerTableBody .search-highlight');
    return {
      rowCount: rows.length,
      matches,
      highlightCount: highlights.length
    };
  });
  console.log("   Search results:", searchResults);
  if (searchResults.rowCount === 0 || searchResults.highlightCount === 0) {
    throw new Error("Search failed to filter or highlight characters!");
  }
  console.log("   ✅ Search and character highlighting verified!");

  // 6. Test Keyboard Navigation & Market Selection
  console.log("4. Testing Keyboard Navigation (ArrowDown + Enter to select token)...");
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(200);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(800);

  const activeAfterSelect = await page.evaluate(() => {
    const modal = document.getElementById('marketExplorerModal');
    const isClosed = !modal || window.getComputedStyle(modal).display === 'none';
    const ticker = document.getElementById('tickerSymbol')?.textContent;
    return {
      isClosed,
      ticker
    };
  });
  console.log("   Active ticker after keyboard selection:", activeAfterSelect);
  if (!activeAfterSelect.isClosed || !activeAfterSelect.ticker.includes('CHILLGUY')) {
    throw new Error(`Failed to switch market to CHILLGUY or close popover! Status: ${JSON.stringify(activeAfterSelect)}`);
  }
  console.log("   ✅ Keyboard selection switched market to CHILLGUY-USDT and closed popover!");

  // 7. Test Watchlist / Favorites Toggle
  console.log("5. Testing Watchlist / Favorites system...");
  await page.click('#quickSearchTriggerBtn');
  await page.waitForTimeout(400);

  // Toggle favorite on first row
  const favResult = await page.evaluate(() => {
    const firstStar = document.querySelector('#explorerTableBody .explorer-row:first-child .fav-star-btn');
    if (firstStar) firstStar.click();
    const watchlistCount = document.getElementById('expWatchlistCount')?.textContent;
    return {
      watchlistCount
    };
  });
  console.log("   Watchlist count after toggle:", favResult.watchlistCount);

  // Click Watchlist Tab
  await page.click('#expTabWatchlist');
  await page.waitForTimeout(300);

  const watchlistTabRows = await page.evaluate(() => {
    const rows = document.querySelectorAll('#explorerTableBody .explorer-row');
    return rows.length;
  });
  console.log("   Watchlist tab rows count:", watchlistTabRows);
  if (watchlistTabRows === 0) {
    throw new Error("Watchlist tab has 0 rows!");
  }
  console.log("   ✅ Watchlist favorites system verified!");

  // Close Explorer
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);

  // 8. Capture Full Terminal Screenshot in Spacious Modern State
  const terminalScreenshotPath = '/Users/dcaturfoh/.gemini/antigravity-ide/brain/3796794e-65fc-4aa1-8c29-e2ee936ff747/omni_sophisticated_terminal_verified.png';
  try {
    await page.screenshot({ path: terminalScreenshotPath, timeout: 5000 });
    console.log(`📸 Screenshot saved: ${terminalScreenshotPath}`);
  } catch (err) {
    console.log("Screenshot notice:", err.message);
  }

  console.log("🎉 ALL SOPHISTICATED MARKET EXPLORER & TERMINAL TESTS PASSED!");
  await browser.close();
})();
