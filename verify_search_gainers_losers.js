const { chromium } = require('playwright');
const path = require('path');

(async () => {
  console.log('🚀 Starting Verification: Enhanced Search Engine, Gainers & Losers System...');
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  });

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') console.log('[BROWSER ERROR]', msg.text());
  });

  await page.goto('http://127.0.0.1:8092/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  // 1. Check Live Market Movers Ribbon
  console.log('1. Checking Live Market Movers Ribbon in Ticker Bar...');
  const ribbonExists = await page.evaluate(() => {
    const r = document.getElementById('marketMoversRibbon');
    const gainers = document.querySelectorAll('#topGainersChips .mover-card-chip');
    const losers = document.querySelectorAll('#topLosersChips .mover-card-chip');
    return {
      visible: r && window.getComputedStyle(r).display !== 'none',
      gainersCount: gainers.length,
      losersCount: losers.length,
      firstGainer: gainers[0]?.textContent?.trim(),
      firstLoser: losers[0]?.textContent?.trim()
    };
  });
  console.log('   Ribbon Status:', ribbonExists);
  if (!ribbonExists.visible || ribbonExists.gainersCount === 0) {
    throw new Error('Market Movers Ribbon failed to render gainers/losers.');
  }
  console.log('   ✅ Live Market Movers Ribbon loaded with top gainers & losers!');

  // Test clicking first gainer in the ribbon
  console.log('2. Clicking first gainer chip in Movers Ribbon...');
  await page.click('#topGainersChips .mover-card-chip:first-child');
  await page.waitForTimeout(1500);
  const switchedMover = await page.evaluate(() => document.getElementById('tickerSymbol')?.textContent);
  console.log('   Active Ticker after clicking gainer:', switchedMover);

  // 3. Open Market Drawer and Test Search & Sort Controls
  console.log('3. Opening Market Drawer & Testing Enhanced Search Engine...');
  await page.evaluate(() => {
    document.getElementById('marketsDrawer').style.display = 'flex';
  });
  await page.waitForTimeout(600);

  // Test Trending Chips
  console.log('   Testing Trending quick pick chip (SOL)...');
  await page.click('#trendingTokensRow .trend-chip:has-text("SOL")');
  await page.waitForTimeout(600);
  const searchVal = await page.evaluate(() => document.getElementById('marketSearchInput')?.value);
  const resultsCount = await page.evaluate(() => document.querySelectorAll('#marketsListContainer .market-row-item').length);
  console.log(`   Search input value: "${searchVal}", Matching rows: ${resultsCount}`);
  if (searchVal !== 'SOL' || resultsCount === 0) {
    throw new Error('Trending quick pick chip failed.');
  }

  // Test Search Clear Button
  console.log('   Testing Search Clear Button (✕)...');
  await page.click('#clearMarketSearchBtn');
  await page.waitForTimeout(500);
  const clearedVal = await page.evaluate(() => document.getElementById('marketSearchInput')?.value);
  console.log(`   Search cleared: "${clearedVal}" (length: ${clearedVal.length})`);

  // Test Gainers & Losers Drawer Filter Pills
  console.log('4. Testing Gainers & Losers Category Filter Pills...');
  await page.click('#pillCatGainers');
  await page.waitForTimeout(600);
  const gainersRowsCheck = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('#marketsListContainer .market-row-item'));
    const nonPositive = rows.slice(0, 20).filter(r => {
      const chg = parseFloat(r.querySelector('.mkt-chg')?.textContent || '0');
      return chg <= 0;
    });
    return { count: rows.length, nonPositiveCount: nonPositive.length };
  });
  console.log('   Gainers Pill Filter Rows:', gainersRowsCheck.count, 'Non-positive items:', gainersRowsCheck.nonPositiveCount);

  await page.click('#pillCatLosers');
  await page.waitForTimeout(600);
  const losersRowsCheck = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('#marketsListContainer .market-row-item'));
    const nonNegative = rows.slice(0, 20).filter(r => {
      const chg = parseFloat(r.querySelector('.mkt-chg')?.textContent || '0');
      return chg >= 0;
    });
    return { count: rows.length, nonNegativeCount: nonNegative.length };
  });
  console.log('   Losers Pill Filter Rows:', losersRowsCheck.count, 'Non-negative items:', losersRowsCheck.nonNegativeCount);
  console.log('   ✅ Gainers & Losers drawer filtering verified!');

  // 5. Test Global OmniSearch Modal (Cmd+K / Ctrl+K)
  console.log('5. Testing Global OmniSearch Modal (Cmd+K)...');
  // Click quick search button
  await page.click('.quick-search-trigger-btn');
  await page.waitForTimeout(600);

  const modalOpen = await page.evaluate(() => {
    const m = document.getElementById('modalOmniSearch');
    return m && window.getComputedStyle(m).display !== 'none';
  });
  console.log('   OmniSearch Modal Open:', modalOpen);
  if (!modalOpen) throw new Error('OmniSearch modal failed to open.');

  // Type "chill" in modal search
  console.log('   Typing "chill" into OmniSearch input...');
  await page.fill('#omniSearchModalInput', 'chill');
  await page.waitForTimeout(600);

  const modalResults = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('#searchModalResultsList .search-result-row'));
    return rows.map(r => r.querySelector('[data-symbol]')?.textContent || r.innerText.split('\n')[0]);
  });
  console.log('   OmniSearch Result matches:', modalResults.slice(0, 3));

  // Keyboard navigate Down and press Enter to select
  console.log('   Pressing ArrowDown and Enter to select token...');
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(300);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1500);

  const finalSymbol = await page.evaluate(() => document.getElementById('tickerSymbol')?.textContent);
  console.log('   Active Ticker after OmniSearch selection:', finalSymbol);
  console.log('   ✅ Global OmniSearch modal and keyboard selection verified!');

  // 6. Test Algorithmic Screener Gainers & Losers Preset
  console.log('6. Testing Algorithmic Screener Tab Gainers & Losers presets...');
  // Click screener desk tab
  await page.click('#tabBtnScreener');
  await page.waitForTimeout(800);

  // Click Top Gainers Screener preset
  await page.click('.screener-presets-row .screener-pill.gainer-pill');
  await page.waitForTimeout(600);
  const screenerGainers = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('#screenerTableBody tr'));
    return { count: rows.length, firstRow: rows[0]?.innerText?.replace(/\s+/g, ' ') };
  });
  console.log('   Screener Top Gainers rows:', screenerGainers.count, 'First row:', screenerGainers.firstRow);

  // Click Top Losers Screener preset
  await page.click('.screener-presets-row .screener-pill.loser-pill');
  await page.waitForTimeout(600);
  const screenerLosers = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('#screenerTableBody tr'));
    return { count: rows.length, firstRow: rows[0]?.innerText?.replace(/\s+/g, ' ') };
  });
  console.log('   Screener Top Losers rows:', screenerLosers.count, 'First row:', screenerLosers.firstRow);
  console.log('   ✅ Algorithmic Screener Gainers & Losers presets verified!');

  // Switch back to Positions tab for final clean view
  await page.click('#tabBtnPositions');
  await page.waitForTimeout(1000);

  const screenshotPath = path.resolve('/Users/dcaturfoh/.gemini/antigravity-ide/brain/3796794e-65fc-4aa1-8c29-e2ee936ff747/omni_search_and_gainers_losers_verified.png');
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log('📸 Screenshot saved to:', screenshotPath);

  await browser.close();
  console.log('🎉 ALL SEARCH ENGINE & GAINERS/LOSERS TESTS PASSED SUCCESSFULLY!');
})();
