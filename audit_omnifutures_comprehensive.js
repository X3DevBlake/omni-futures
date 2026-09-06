const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = '/Users/dcaturfoh/.gemini/antigravity-ide/brain/3796794e-65fc-4aa1-8c29-e2ee936ff747';

async function audit() {
  console.log('🚀 Running Post-Upgrade Full Verification & Audit...');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const auditReport = {
    failedRequests: [],
    consoleErrors: [],
    timeframes: {},
    chartStyles: [],
    indicators: {},
    newWeexTokensTest: {},
    orders: {},
    scalperMode: {},
    drawerTabs: {},
    modals: {},
    viewports: {}
  };

  page.on('response', resp => {
    if (resp.status() >= 400) {
      auditReport.failedRequests.push({
        url: resp.url(),
        status: resp.status()
      });
      console.log(`❌ FAILED REQUEST [${resp.status()}]: ${resp.url()}`);
    }
  });

  page.on('console', msg => {
    if (msg.type() === 'error') {
      auditReport.consoleErrors.push(msg.text());
      console.log(`❌ CONSOLE ERROR: ${msg.text()}`);
    }
  });

  try {
    console.log('1. Loading http://127.0.0.1:8092/ ...');
    await page.goto('http://127.0.0.1:8092/', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // --- Timeframes Audit ---
    console.log('2. Auditing Timeframes (1s, 1m, 5m, 15m, 1h, 4h, 1D, 1W)...');
    const timeframes = ['1s', '1m', '5m', '15m', '1h', '4h', '1D', '1W'];
    for (const tf of timeframes) {
      const res = await page.evaluate((interval) => {
        const btn = Array.from(document.querySelectorAll('.tf-btn')).find(b => b.textContent.trim() === interval);
        if (!btn) return { status: 'BUTTON_NOT_FOUND' };
        btn.click();
        return {
          status: 'OK',
          candles: window.chartInstance?.candles?.length || 0
        };
      }, tf);
      auditReport.timeframes[tf] = res;
      await page.waitForTimeout(300);
    }

    // Reset back to 15m
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('.tf-btn')).find(x => x.textContent.trim() === '15m');
      if (b) b.click();
    });
    await page.waitForTimeout(400);

    // --- Chart Styles Audit ---
    console.log('3. Auditing Chart Styles (Candles, Hollow, Heikin, Line, Area)...');
    for (let i = 0; i < 5; i++) {
      const styleRes = await page.evaluate(() => {
        const btn = document.getElementById('indStyleBtn');
        if (!btn) return { status: 'NOT_FOUND' };
        btn.click();
        return {
          btnText: btn.textContent.trim(),
          chartStyle: window.chartInstance?.chartStyle
        };
      });
      auditReport.chartStyles.push(styleRes);
      await page.waitForTimeout(250);
    }

    // --- Chart Indicators Audit (including NEW MACD indicator) ---
    console.log('4. Auditing Indicators (MA, EMA, BOLL, RSI, MACD, VOL)...');
    const indicatorButtons = ['indMaBtn', 'indEmaBtn', 'indBollBtn', 'indRsiBtn', 'indMacdBtn', 'indVolBtn'];
    for (const id of indicatorButtons) {
      const indRes = await page.evaluate((btnId) => {
        const btn = document.getElementById(btnId);
        if (!btn) return { status: 'NOT_FOUND' };
        btn.click();
        return {
          status: 'OK',
          isActive: btn.classList.contains('active'),
          indicators: { ...window.chartInstance?.indicators }
        };
      }, id);
      auditReport.indicators[id] = indRes;
      await page.waitForTimeout(200);
    }

    // Enable MACD and capture screenshot
    await page.evaluate(() => {
      if (!window.chartInstance.indicators.macd) {
        document.getElementById('indMacdBtn')?.click();
      }
    });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'omni_audit_macd_indicator_live.png') });

    // --- Test Newly Ingested WEEX Spot Tokens ---
    console.log('5. Testing Newly Added WEEX Spot Tokens (BIBI-USDT, FONESOL-USDT, ORE-USDT)...');
    const testTokens = ['BIBI-USDT', 'FONESOL-USDT', 'ORE-USDT'];
    for (const tok of testTokens) {
      const tokRes = await page.evaluate((sym) => {
        window.switchMarket(sym);
        const m = window.allMarkets?.find(x => x.symbol === sym);
        return {
          symbol: sym,
          existsInCatalog: !!m,
          name: m?.name,
          price: m?.price,
          isWeexSpot: m?.isWeexSpot,
          chartCandles: window.chartInstance?.candles?.length || 0
        };
      }, tok);
      await page.waitForTimeout(1000);
      auditReport.newWeexTokensTest[tok] = tokRes;
    }
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'omni_audit_weex_spot_token_chart.png') });

    // Switch back to BTC-USDT
    await page.evaluate(() => window.switchMarket('BTC-USDT'));
    await page.waitForTimeout(1000);

    // --- Scalper Mode Audit ---
    console.log('6. Auditing Scalper Mode...');
    const scalperRes = await page.evaluate(() => {
      const btn = document.getElementById('btnScalperMode');
      if (!btn) return { status: 'BUTTON_NOT_FOUND' };
      btn.click();
      const text = document.getElementById('scalperStatusText')?.textContent.trim();
      return { status: 'OK', statusText: text };
    });
    auditReport.scalperMode = scalperRes;

    // --- Order Placement Audit ---
    console.log('7. Auditing Order Placement...');
    const orderRes = await page.evaluate(() => {
      try {
        if (typeof window.setOrderSide === 'function') window.setOrderSide('buy');
        if (typeof window.setOrderType === 'function') window.setOrderType('market');
        const sizeInput = document.getElementById('orderSizeInput');
        if (sizeInput) {
          sizeInput.value = '0.05';
          sizeInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        const placeBtn = document.getElementById('placeOrderBtn');
        if (placeBtn) placeBtn.click();
        return {
          placed: true,
          positionsCount: window.activePositions?.length || 0
        };
      } catch (e) {
        return { error: e.message };
      }
    });
    auditReport.orders = orderRes;
    await page.waitForTimeout(600);

    // --- Drawer Tabs Audit ---
    console.log('8. Auditing Bottom Desk Tabs...');
    const deskTabs = [
      { id: 'tabBtnPositions', label: 'Positions' },
      { id: 'tabBtnOrders', label: 'Open Orders' },
      { id: 'tabBtnHistory', label: 'Order History' },
      { id: 'tabBtnTradesHistory', label: 'Trade History' },
      { id: 'tabBtnGridBots', label: 'AI Grid Bots' },
      { id: 'tabBtnScreener', label: 'Screener' }
    ];
    for (const t of deskTabs) {
      const tabRes = await page.evaluate((tab) => {
        const btn = document.getElementById(tab.id);
        if (!btn) return { status: 'NOT_FOUND' };
        btn.click();
        return {
          status: 'OK',
          isActive: btn.classList.contains('active')
        };
      }, t);
      auditReport.drawerTabs[t.label] = tabRes;
      await page.waitForTimeout(200);
    }

    // --- Modals Audit ---
    console.log('9. Auditing Modals...');
    const modalRes = await page.evaluate(() => {
      const res = {};
      // Search Modal
      if (typeof window.openOmniSearchModal === 'function') {
        window.openOmniSearchModal();
        const m = document.getElementById('omniSearchModal');
        res.searchModal = {
          opened: m && window.getComputedStyle(m).display !== 'none',
          catalogTotal: window.allMarkets?.length || 0
        };
        window.closeOmniSearchModal();
      }
      // Ecosystem Modal
      if (typeof window.toggleEcosystemModal === 'function') {
        window.toggleEcosystemModal();
        const eco = document.getElementById('ecosystemModal');
        res.ecosystemModal = {
          opened: eco && window.getComputedStyle(eco).display !== 'none'
        };
        window.toggleEcosystemModal();
      }
      // Deposit Modal
      if (typeof window.openDepositModal === 'function') {
        window.openDepositModal('USDT');
        const dep = document.getElementById('depositModal');
        res.depositModal = {
          opened: dep && window.getComputedStyle(dep).display !== 'none'
        };
        if (typeof window.closeDepositModal === 'function') window.closeDepositModal();
      }
      return res;
    });
    auditReport.modals = modalRes;

    // --- Viewports & Anti-Overflow Responsive Audit ---
    console.log('10. Auditing Mobile, Tablet, and Desktop Viewports (Verifying 0px Overflow)...');
    const viewports = [
      { name: 'Mobile_390x844', width: 390, height: 844 },
      { name: 'Tablet_768x1024', width: 768, height: 1024 },
      { name: 'Desktop_1440x900', width: 1440, height: 900 }
    ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(600);
      const metrics = await page.evaluate(() => {
        const doc = document.documentElement;
        return {
          scrollWidth: doc.scrollWidth,
          clientWidth: doc.clientWidth,
          hasHorizontalOverflow: doc.scrollWidth > doc.clientWidth,
          overflowDelta: Math.max(0, doc.scrollWidth - doc.clientWidth)
        };
      });
      auditReport.viewports[vp.name] = metrics;
      await page.screenshot({ path: path.join(ARTIFACT_DIR, `omni_verified_${vp.name}.png`) });
    }

    console.log('\n================ AUDIT SUMMARY ================');
    console.log(JSON.stringify(auditReport, null, 2));

  } catch (err) {
    console.error('Audit crashed:', err);
  } finally {
    await browser.close();
  }
}

audit();
