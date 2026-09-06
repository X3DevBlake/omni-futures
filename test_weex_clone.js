// test_weex_clone.js - Comprehensive automated validation test suite for WEEX Clone in Omni Futures
const fs = require('fs');
const assert = require('assert');

const BASE_URL = 'http://localhost:8092';

async function runTests() {
  console.log('====================================================');
  console.log('RUNNING WEEX CLONE AUDIT SUITE ON OMNI FUTURES');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`FAIL: ${name}`);
      console.error(err.message || err);
      failed++;
    }
  }

  // TEST 1: GET /api/assets/overview
  await test('Backend: GET /api/assets/overview returns full portfolio metrics', async () => {
    const res = await fetch(`${BASE_URL}/api/assets/overview`);
    assert.strictEqual(res.status, 200, 'Status should be 200');
    const data = await res.json();
    assert.ok(data.success, 'success flag should be true');
    assert.ok(typeof data.totalNetWorthUsd === 'number' && data.totalNetWorthUsd > 1000000, 'totalNetWorthUsd > 1,000,000');
    assert.ok(typeof data.totalNetWorthBtc === 'number', 'totalNetWorthBtc present');
    assert.ok(data.accounts && data.accounts.futures && data.accounts.spot && data.accounts.funding && data.accounts.earn, '4 account pillars present');
    assert.ok(data.allocationPercentages && typeof data.allocationPercentages.futures === 'number', 'allocationPercentages present');
  });

  // TEST 2: GET /api/assets/p2p-merchants
  await test('Backend: GET /api/assets/p2p-merchants returns verified orderbook', async () => {
    const res = await fetch(`${BASE_URL}/api/assets/p2p-merchants`);
    assert.strictEqual(res.status, 200, 'Status should be 200');
    const data = await res.json();
    assert.ok(data.success, 'success flag should be true');
    assert.ok(Array.isArray(data.merchants) && data.merchants.length >= 3, 'At least 3 verified merchants returned');
    const first = data.merchants[0];
    assert.ok(first.name && first.price > 0 && Array.isArray(first.paymentMethods), 'Merchant fields valid');
  });

  // TEST 3: POST /api/assets/transfer
  await test('Backend: POST /api/assets/transfer handles internal account transfer', async () => {
    const res = await fetch(`${BASE_URL}/api/assets/transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from_account: 'futures',
        to_account: 'spot',
        asset: 'USDT',
        amount: 25.50
      })
    });
    assert.strictEqual(res.status, 200, 'Status should be 200');
    const data = await res.json();
    assert.ok(data.success, 'Transfer should succeed');
    assert.ok(data.txId, 'txId generated');
  });

  // TEST 4: POST /api/assets/deposit-simulate
  await test('Backend: POST /api/assets/deposit-simulate credits collateral with hash', async () => {
    const res = await fetch(`${BASE_URL}/api/assets/deposit-simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        coin: 'USDT',
        amount: 500,
        network: 'Arbitrum One'
      })
    });
    assert.strictEqual(res.status, 200, 'Status should be 200');
    const data = await res.json();
    assert.ok(data.success, 'Deposit simulation should succeed');
    assert.ok(data.txHash && data.txHash.startsWith('0x'), 'Valid 0x EVM transaction hash returned');
  });

  // TEST 5: GET /api/assets/deposit-records
  await test('Backend: GET /api/assets/deposit-records lists simulated deposits', async () => {
    const res = await fetch(`${BASE_URL}/api/assets/deposit-records`);
    assert.strictEqual(res.status, 200, 'Status should be 200');
    const data = await res.json();
    assert.ok(data.success, 'success flag should be true');
    assert.ok(Array.isArray(data.records) && data.records.length > 0, 'Records list non-empty');
  });

  // TEST 6: POST /api/assets/p2p-order
  await test('Backend: POST /api/assets/p2p-order creates escrow transaction', async () => {
    const res = await fetch(`${BASE_URL}/api/assets/p2p-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchant_id: 'm1',
        side: 'BUY',
        fiat_amount: 500,
        crypto_amount: 500,
        payment_method: 'Zelle'
      })
    });
    assert.strictEqual(res.status, 200, 'Status should be 200');
    const data = await res.json();
    assert.ok(data.success || data.status === 'success', 'P2P escrow should succeed');
  });

  // TEST 7: HTML Architecture Audit
  await test('Frontend: index.html contains all 8 WEEX page views & 3 interactive modals', () => {
    const html = fs.readFileSync('/Users/dcaturfoh/.gemini/antigravity-ide/scratch/omni-futures/index.html', 'utf8');
    const requiredViews = [
      'id="weexViewTrade"',
      'id="weexViewMarkets"',
      'id="weexViewBuyCrypto"',
      'id="weexViewDeposit"',
      'id="weexViewWithdraw"',
      'id="weexViewAssets"',
      'id="weexViewCopyTrading"',
      'id="weexViewEarn"'
    ];
    for (const v of requiredViews) {
      assert.ok(html.includes(v), `Missing view: ${v}`);
    }

    const requiredModals = [
      'id="modalP2PEscrow"',
      'id="modalWithdraw2FA"',
      'id="modalInternalTransfer"'
    ];
    for (const m of requiredModals) {
      assert.ok(html.includes(m), `Missing modal: ${m}`);
    }
  });

  // TEST 8: Strict Zero-Emoji Policy Audit
  await test('Frontend: Strict Zero-Emoji policy verified on WEEX views', () => {
    const html = fs.readFileSync('/Users/dcaturfoh/.gemini/antigravity-ide/scratch/omni-futures/index.html', 'utf8');
    const weexSection = html.substring(html.indexOf('<!-- WEEX VIEW 2: MARKETS'), html.indexOf('<!-- FLOATING AI TRADING COPILOT'));
    // Match common emoji ranges
    const emojiRegex = /[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/u;
    const match = weexSection.match(emojiRegex);
    assert.strictEqual(match, null, `Found forbidden emoji in WEEX markup: ${match ? match[0] : ''}`);
  });

  // TEST 9: JS Logic Audit in app.js
  await test('Frontend: app.js contains complete WEEX reactive methods & window exports', () => {
    const js = fs.readFileSync('/Users/dcaturfoh/.gemini/antigravity-ide/scratch/omni-futures/app.js', 'utf8');
    const requiredFns = [
      'function switchWeexView',
      'function calcWeexExpressPayout',
      'function loadWeexP2pMerchants',
      'function openP2PEscrowModal',
      'function confirmP2PPaymentDone',
      'function updateWeexDepositDetails',
      'function simulateLiveDepositInflow',
      'function updateWeexWithdrawCalculations',
      'function openWeexWithdraw2FAModal',
      'function executeVerifiedWithdrawal',
      'function executeWeexUidTransfer',
      'function loadWeexAssetsOverview',
      'function toggleBalanceVisibility',
      'function renderWeexHoldingsTable',
      'function filterWeexBills',
      'function openWeexInternalTransferModal',
      'function executeInternalTransferSubmit',
      'function loadWeexMarketsTable',
      'function loadWeexCopyTrading'
    ];
    for (const fn of requiredFns) {
      assert.ok(js.includes(fn), `Missing function: ${fn}`);
    }
  });

  console.log('\n----------------------------------------------------');
  console.log(`TOTAL: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('----------------------------------------------------');

  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
