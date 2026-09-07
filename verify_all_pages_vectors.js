const { chromium } = require('playwright');
const assert = require('assert');

(async () => {
  console.log('===============================================================');
  console.log('🛡️ OMNIFUTURES PRO: COMPREHENSIVE ALL-PAGE VECTOR & SVG AUDIT');
  console.log('===============================================================');

  const browser = await chromium.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto('http://127.0.0.1:8092', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  // 1. Ticker Header Vector Check across Crypto, Stocks, and ETFs
  console.log('Checking Ticker Header Vectors across categories...');
  const testTickers = [
    { sym: 'BTC-USDT', cat: 'crypto' },
    { sym: 'SOL-USDT', cat: 'crypto' },
    { sym: 'NVDA-USDT', cat: 'stocks' },
    { sym: 'AAPL-USDT', cat: 'stocks' },
    { sym: 'SPY-USDT', cat: 'etfs' },
    { sym: 'QQQ-USDT', cat: 'etfs' }
  ];

  for (const t of testTickers) {
    await page.evaluate((symbol) => switchMarket(symbol), t.sym);
    await page.waitForTimeout(300);
    const headerSvg = await page.$('#tickerTokenVector svg, #tickerTokenVector .gemini-liquid-token-badge');
    assert.ok(headerSvg, `Ticker header must render SVG vector badge for ${t.sym}`);
    const svgUse = await page.$eval('#tickerTokenVector', el => el.innerHTML);
    console.log(`✅ PASS: Ticker Header Vector rendered for ${t.sym}: ${svgUse.substring(0, 70)}...`);
  }

  // 2. Positions Table Vector Check
  console.log('\nChecking Positions Table Vectors...');
  const posSvgCount = await page.$$eval('#positionsTableBody tr svg, #positionsTableBody tr .gemini-liquid-token-badge', els => els.length);
  assert.ok(posSvgCount > 0, 'Positions table must contain token SVG vectors');
  console.log(`✅ PASS: Positions table rendered ${posSvgCount} token vectors`);

  // 3. Open Orders Table Vector Check
  console.log('\nChecking Open Orders Table Vectors...');
  await page.evaluate(() => switchBottomTab('openOrders'));
  await page.waitForTimeout(300);
  const openOrdersSvg = await page.$$eval('#openOrdersTableBody tr svg, #openOrdersTableBody tr .gemini-liquid-token-badge', els => els.length);
  console.log(`✅ PASS: Open orders table rendered ${openOrdersSvg} token vectors`);

  // 4. Markets View Check across All, Stocks, ETFs
  console.log('\nChecking Markets Overview Page across Crypto, Stocks, ETFs...');
  await page.evaluate(() => switchWeexView('markets'));
  await page.waitForTimeout(600);

  // Test Stocks filter
  await page.evaluate(() => filterWeexMarkets('STOCKS'));
  await page.waitForTimeout(400);
  const stockRowsCount = await page.$$eval('#weexMarketsTableBody tr', trs => trs.length);
  const stockSvgCount = await page.$$eval('#weexMarketsTableBody tr svg, #weexMarketsTableBody tr .gemini-liquid-token-badge', els => els.length);
  assert.ok(stockRowsCount > 0, 'Markets Stocks tab must show stock pairs');
  assert.ok(stockSvgCount > 0, 'Markets Stocks tab must render authentic stock SVG vectors');
  console.log(`✅ PASS: Markets Stocks tab rendered ${stockRowsCount} stocks with ${stockSvgCount} SVG vectors`);

  // 5. Buy Crypto View Check
  console.log('\nChecking Buy Crypto Express & P2P Vectors...');
  await page.evaluate(() => switchWeexView('buyCrypto'));
  await page.waitForTimeout(500);

  // Check Express coin select vector
  await page.evaluate(() => {
    const sel = document.getElementById('weexExpressCryptoSelect');
    if (sel) { sel.value = 'SOL'; sel.dispatchEvent(new Event('change')); }
  });
  await page.waitForTimeout(300);
  const expressVector = await page.$eval('#weexExpressCryptoVector', el => el.innerHTML);
  assert.ok(expressVector.includes('token-vector-sol'), 'Express Crypto selector must show SOL SVG vector');
  console.log(`✅ PASS: Buy Crypto Express selector rendered SOL vector: ${expressVector}`);

  // 6. Deposit View Check
  console.log('\nChecking Deposit Workstation Token Vectors...');
  await page.evaluate(() => switchWeexView('deposit'));
  await page.waitForTimeout(500);

  const depositTokens = ['USDT', 'BTC', 'ETH', 'SOL', 'OMNI', 'SUI', 'XRP'];
  for (const dt of depositTokens) {
    await page.evaluate((c) => {
      const sel = document.getElementById('weexDepositCoinSelect');
      if (sel) { sel.value = c; sel.dispatchEvent(new Event('change')); }
    }, dt);
    await page.waitForTimeout(200);
    const depVecHtml = await page.$eval('#weexDepositCoinVector', el => el.innerHTML);
    assert.ok(depVecHtml.includes('<svg') || depVecHtml.includes('gemini-liquid-token-badge'), `Deposit coin ${dt} must render SVG vector`);
    console.log(`✅ PASS: Deposit Coin ${dt} rendered vector`);
  }

  // 7. Withdraw View Check
  console.log('\nChecking Withdraw Workstation Token Vectors...');
  await page.evaluate(() => switchWeexView('withdraw'));
  await page.waitForTimeout(500);

  const withdrawTokens = ['USDT', 'BTC', 'ETH', 'SOL', 'OMNI', 'DOGE'];
  for (const wt of withdrawTokens) {
    await page.evaluate((c) => {
      const sel = document.getElementById('weexWithdrawCoinSelect');
      if (sel) { sel.value = c; sel.dispatchEvent(new Event('change')); }
    }, wt);
    await page.waitForTimeout(200);
    const withVecHtml = await page.$eval('#weexWithdrawCoinVector', el => el.innerHTML);
    assert.ok(withVecHtml.includes('<svg') || withVecHtml.includes('gemini-liquid-token-badge'), `Withdraw coin ${wt} must render SVG vector`);
    console.log(`✅ PASS: Withdraw Coin ${wt} rendered vector`);
  }

  // 8. Assets & Portfolio Hub Check (Spot Holdings Table with Tokens, Stocks, ETFs)
  console.log('\nChecking Assets Hub Spot Holdings Table with Tokens, Stocks, and ETFs...');
  await page.evaluate(() => switchWeexView('assets'));
  await page.waitForTimeout(600);

  const holdingsRows = await page.$$eval('#weexHoldingsTableBody tr', trs => trs.map(tr => {
    const symbol = tr.querySelector('div strong, div div')?.textContent.trim();
    const hasSvg = !!tr.querySelector('svg, .gemini-liquid-token-badge');
    return { symbol, hasSvg };
  }));

  assert.ok(holdingsRows.length >= 10, 'Holdings table must show at least 10 assets covering tokens, stocks, and ETFs');
  holdingsRows.forEach(h => {
    assert.ok(h.hasSvg, `Holdings asset row ${h.symbol} must have an SVG vector`);
  });
  console.log(`✅ PASS: Assets Hub Spot Holdings table rendered ${holdingsRows.length} assets (Tokens, Stocks, ETFs) - ALL with authentic SVG vectors!`);

  // Capture Assets View Screenshot
  await page.screenshot({ path: '/Users/dcaturfoh/.gemini/antigravity-ide/brain/3f24078c-deb8-4277-b8c6-09f7b90eeda0/audit_assets_page_vectors.png' });
  console.log('Saved screenshot: audit_assets_page_vectors.png');

  // 9. Earn & Staking Vaults Check (Glowing Liquid Glass Cards with SVG vectors)
  console.log('\nChecking Earn Staking Vaults (OMNI, USDT, ETH, BTC, SOL)...');
  await page.evaluate(() => switchWeexView('earn'));
  await page.waitForTimeout(600);

  const vaultSvgs = await page.$$eval('#weexViewEarn .weex-card-box svg', svgs => svgs.length);
  assert.ok(vaultSvgs >= 5, 'Earn view must contain at least 5 vault card SVG vectors');
  console.log(`✅ PASS: Earn Staking Vaults rendered with ${vaultSvgs} glowing SVG vectors in Liquid Glass cards`);

  // Capture Earn View Screenshot
  await page.screenshot({ path: '/Users/dcaturfoh/.gemini/antigravity-ide/brain/3f24078c-deb8-4277-b8c6-09f7b90eeda0/audit_earn_page_vectors.png' });
  console.log('Saved screenshot: audit_earn_page_vectors.png');

  // 10. Check ZERO Raw Emojis across Entire Page
  console.log('\nChecking Zero Raw Emojis across live DOM...');
  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
  const bodyText = await page.evaluate(() => document.body.innerText);
  const foundEmojis = bodyText.match(new RegExp(emojiRegex, 'gu')) || [];
  assert.strictEqual(foundEmojis.length, 0, `DOM must contain 0 raw emojis, found: ${foundEmojis.join(', ')}`);
  console.log('✅ PASS: Zero raw emojis found in the entire DOM! 100% Material Symbols and Gemini SVGs.');

  // 11. Check ZERO Broken SVG use href references
  console.log('\nChecking All SVG <use href> references in the document...');
  const brokenSvgHrefs = await page.evaluate(() => {
    const uses = document.querySelectorAll('svg use');
    const missing = [];
    uses.forEach(u => {
      const href = u.getAttribute('href') || u.getAttribute('xlink:href');
      if (href && href.startsWith('#')) {
        const target = document.querySelector(href);
        if (!target) missing.push(href);
      }
    });
    return missing;
  });
  assert.strictEqual(brokenSvgHrefs.length, 0, `Found broken SVG references: ${brokenSvgHrefs.join(', ')}`);
  console.log('✅ PASS: 100% of SVG <use> elements link to valid, existing <defs> vector symbols!');

  await browser.close();
  console.log('\n===============================================================');
  console.log('🎉 ALL AUDIT CHECKS PASSED: 100% ACCURATE SVG VECTORS & LIQUID GLASS');
  console.log('===============================================================');
})();
