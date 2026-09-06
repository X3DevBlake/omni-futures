const fs = require('fs');
const assert = require('assert');

console.log('====================================================');
console.log('AUDIT & VERIFICATION SUITE FOR PHASES 3, 4, 5 & 6');
console.log('====================================================\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`FAIL: ${name}`);
    console.error(err.message || err);
    failed++;
  }
}

const html = fs.readFileSync('/Users/dcaturfoh/.gemini/antigravity-ide/scratch/omni-futures/index.html', 'utf8');
const js = fs.readFileSync('/Users/dcaturfoh/.gemini/antigravity-ide/scratch/omni-futures/app.js', 'utf8');
const catalog = JSON.parse(fs.readFileSync('/Users/dcaturfoh/.gemini/antigravity-ide/scratch/omni-futures/markets_catalog.json', 'utf8'));

// 1. Breadcrumb Bar & Back to Trading Terminal on all 7 subpages
test('Phase 5/6: Every subpage contains .omni-page-breadcrumb-bar and .btn-back-to-trade', () => {
  const subpages = [
    'weexViewMarkets',
    'weexViewBuyCrypto',
    'weexViewDeposit',
    'weexViewWithdraw',
    'weexViewAssets',
    'weexViewCopyTrading',
    'weexViewEarn'
  ];

  for (const pageId of subpages) {
    const pageIndex = html.indexOf(`id="${pageId}"`);
    assert.ok(pageIndex !== -1, `Missing subpage container id="${pageId}"`);
    const nextViewIndex = html.indexOf('class="weex-page-view"', pageIndex + 30);
    const pageSlice = html.substring(pageIndex, nextViewIndex !== -1 ? nextViewIndex : pageIndex + 3000);

    assert.ok(pageSlice.includes('class="omni-page-breadcrumb-bar"'), `Subpage ${pageId} missing .omni-page-breadcrumb-bar`);
    assert.ok(pageSlice.includes('class="btn-back-to-trade"'), `Subpage ${pageId} missing .btn-back-to-trade`);
    assert.ok(pageSlice.includes("switchWeexView('trade')"), `Subpage ${pageId} missing switchWeexView('trade')`);
  }
});

// 2. Zero visible "WEEX" text in index.html (labels, headers, placeholders, titles)
test('Phase 3: Zero visible user-facing "WEEX" references in index.html', () => {
  // Strip code comments
  const strippedHtml = html.replace(/<!--[\s\S]*?-->/g, '');
  
  // Check text content inside tags and user-facing attributes
  const visibleTextMatches = strippedHtml.match(/>([^<]*\bWEEX\b[^<]*)</gi) || [];
  const placeholderMatches = strippedHtml.match(/placeholder="[^"]*\bWEEX\b[^"]*"/gi) || [];
  const titleMatches = strippedHtml.match(/title="[^"]*\bWEEX\b[^"]*"/gi) || [];

  const allVisible = [...visibleTextMatches, ...placeholderMatches, ...titleMatches];
  assert.strictEqual(allVisible.length, 0, `Found visible user-facing WEEX text: ${allVisible.join(', ')}`);
});

// 3. Authentic Token SVG vectors in index.html defs
test('Phase 3: Authentic SVG vector definitions present for major tokens and exchanges', () => {
  const vectors = [
    'token-vector-btc',
    'token-vector-eth',
    'token-vector-sol',
    'token-vector-usdt',
    'token-vector-usdc',
    'token-vector-bnb',
    'token-vector-doge',
    'token-vector-pepe',
    'token-vector-shib',
    'token-vector-nvda',
    'token-vector-tsla',
    'token-vector-aapl',
    'token-vector-coinbase',
    'token-vector-cryptocom',
    'token-vector-dexscreener',
    'token-vector-coingecko',
    'token-vector-cmc'
  ];

  for (const vec of vectors) {
    assert.ok(html.includes(`id="${vec}"`), `Missing authentic SVG vector: #${vec}`);
  }
});

// 4. Token catalog contains multi-exchange coverage (>= 2,320 tokens)
test('Phase 3: Markets catalog contains comprehensive multi-exchange coverage', () => {
  const total = Object.keys(catalog).length;
  assert.ok(total >= 2320, `Catalog market count (${total}) should be >= 2,320`);

  // Check presence of specific requested exchange sources
  const sampleTokens = ['BTC-USDT', 'ETH-USDT', 'SOL-USDT', 'VVS-USDT', 'CORGIAI-USDT', 'FARTCOIN-USDT', 'AI16Z-USDT', 'CHILLGUY-USDT', 'PNUT-USDT', 'NVDA-USD'];
  for (const sym of sampleTokens) {
    assert.ok(catalog[sym], `Sample multi-exchange token ${sym} missing from catalog`);
  }
});

// 5. OmniDAO Staking integration in Earn view and Assets hub
test('Phase 4: Direct OmniDAO Staking linkage at omni-dao-39821.web.app', () => {
  assert.ok(html.includes('goToOmniDaoStaking()'), 'goToOmniDaoStaking() button binding present in index.html');
  assert.ok(html.includes('https://omni-dao-39821.web.app'), 'OmniDAO live URL present in index.html');
  assert.ok(js.includes('https://omni-dao-39821.web.app'), 'OmniDAO redirect URL present in app.js');
  assert.ok(js.includes('function goToOmniDaoStaking'), 'function goToOmniDaoStaking defined in app.js');
});

// 6. Viewport fitting and browser history / escape navigation in app.js
test('Phase 5/6: Viewport layout reset, browser popstate history & Escape key support', () => {
  assert.ok(js.includes("window.history.pushState"), 'Browser pushState history present');
  assert.ok(js.includes("window.addEventListener('popstate'"), 'Browser popstate listener present');
  assert.ok(js.includes("targetViewEl.scrollTop = 0"), 'scrollTop = 0 reset present in switchWeexView');
  assert.ok(js.includes("event.key === 'Escape'"), 'Global Escape key navigation present');
  assert.ok(js.includes("function getTokenVectorSvg"), 'function getTokenVectorSvg defined in app.js');
});

console.log('\n----------------------------------------------------');
console.log(`TOTAL: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log('----------------------------------------------------');

if (failed > 0) process.exit(1);
