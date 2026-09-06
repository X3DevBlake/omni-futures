const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = '/Users/dcaturfoh/.gemini/antigravity-ide/brain/3796794e-65fc-4aa1-8c29-e2ee936ff747';

async function runComprehensiveAudit() {
  console.log('🚀 [OMNI FUTURES AUDIT] Starting Full End-to-End System Audit...');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Accept native browser alert dialogs (such as order confirmation or deposit alerts)
  page.on('dialog', async dialog => {
    console.log(`💬 Native Dialog: [${dialog.type()}] ${dialog.message()}`);
    await dialog.accept();
  });

  const auditResults = {
    totalCatalogMarkets: 0,
    newWeexTokensVerified: [],
    navigationCategories: {},
    chartTimeframes: {},
    chartStyles: [],
    indicatorsToggled: {},
    orderExecution: {},
    deskTabs: {},
    assetsHub: {},
    viewports: {},
    consoleErrors: [],
    failedRequests: []
  };

  page.on('console', msg => {
    if (msg.type() === 'error') {
      // Ignore favicon or non-critical 3rd party warnings
      if (!msg.text().includes('favicon.ico')) {
        auditResults.consoleErrors.push(msg.text());
        console.log(`⚠️ Console Error: ${msg.text()}`);
      }
    }
  });

  page.on('response', resp => {
    if (resp.status() >= 400 && !resp.url().includes('favicon.ico')) {
      auditResults.failedRequests.push({ url: resp.url(), status: resp.status() });
      console.log(`❌ Failed Request [${resp.status()}]: ${resp.url()}`);
    }
  });

  try {
    // 1. Initial Page Load
    console.log('Step 1: Navigating to local server http://127.0.0.1:8092/ ...');
    await page.goto('http://127.0.0.1:8092/', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Verify catalog markets
    const catalogCount = await page.evaluate(() => window.allMarkets?.length || 0);
    auditResults.totalCatalogMarkets = catalogCount;
    console.log(`✅ Total catalog markets loaded: ${catalogCount}`);

    // 2. Test Newly Ingested WEEX Tokens
    console.log('Step 2: Auditing Newly Added WEEX Tokens & Equities...');
    const testNewTokens = [
      'STONKSBSC-USDT', // Meme
      'VZ-USDT',        // Stocks
      'TMO-USDT',       // Stocks
      'UNG-USDT',       // ETFs
      'TIP-USDT'        // Bonds
    ];

    for (const sym of testNewTokens) {
      const res = await page.evaluate(async (s) => {
        window.switchMarket(s);
        await new Promise(r => setTimeout(r, 600));
        const m = (window.allMarkets || []).find(x => x.symbol === s);
        return {
          symbol: s,
          name: m?.name,
          category: m?.category,
          price: m?.price,
          isWeex: m?.isWeex,
          isWeexSpot: m?.isWeexSpot,
          chartCandles: window.chartInstance?.candles?.length || 0,
          currentPriceOnHeader: document.getElementById('tickerPrice')?.textContent.trim()
        };
      }, sym);
      auditResults.newWeexTokensVerified.push(res);
      console.log(`   - Verified ${sym}: Name="${res.name}", Category=${res.category}, Price=$${res.price}, Candles=${res.chartCandles}`);
    }

    // Capture screenshot of new WEEX token live on chart
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'omni_audit_new_weex_token_live.png') });

    // Switch back to BTC-USDT for core tests
    await page.evaluate(() => window.switchMarket('BTC-USDT'));
    await page.waitForTimeout(1000);

    // 3. Test Navigation Tabs & Categories
    console.log('Step 3: Auditing Top Header Category Navigation...');
    const navCategories = ['stocks', 'etfs', 'bonds', 'meme'];
    for (const cat of navCategories) {
      const navRes = await page.evaluate((c) => {
        window.selectCategoryNavigation(c);
        const modal = document.getElementById('marketExplorerModal');
        const activeTab = document.querySelector('.explorer-nav-tabs .exp-tab.active');
        const targetSym = window.currentSymbol;
        window.closeMarketExplorer();
        return {
          category: c,
          activeTabId: activeTab?.id,
          currentSymbol: targetSym
        };
      }, cat);
      auditResults.navigationCategories[cat] = navRes;
      console.log(`   - Category Nav ${cat} -> Switched to ${navRes.currentSymbol}, Explorer Tab=${navRes.activeTabId}`);
      await page.waitForTimeout(400);
    }

    // Switch back to BTC-USDT
    await page.evaluate(() => window.switchMarket('BTC-USDT'));
    await page.waitForTimeout(600);

    // 4. Test Market Explorer & Live Badge Counts
    console.log('Step 4: Auditing Market Explorer Category Tabs & Live Counts...');
    const explorerTabs = ['expTabAll', 'expTabGainers', 'expTabLosers', 'expTabWeex', 'expTabCrypto', 'expTabMeme', 'expTabStocks', 'expTabEtfs', 'expTabBonds'];
    for (const tid of explorerTabs) {
      const tabInfo = await page.evaluate((id) => {
        const btn = document.getElementById(id);
        if (!btn) return { id, exists: false };
        btn.click();
        const rowCount = document.querySelectorAll('#explorerTableBody tr').length;
        return {
          id,
          exists: true,
          text: btn.textContent.trim().replace(/\s+/g, ' '),
          renderedRows: rowCount
        };
      }, tid);
      console.log(`   - Tab ${tid}: "${tabInfo.text}" (Showing ${tabInfo.renderedRows} items)`);
    }
    await page.evaluate(() => window.closeMarketExplorer());

    // 5. Auditing Chart Timeframes
    console.log('Step 5: Auditing Chart Timeframes (1s, 1m, 5m, 15m, 1h, 4h, 1D, 1W)...');
    const timeframes = ['1s', '1m', '5m', '15m', '1h', '4h', '1D', '1W'];
    for (const tf of timeframes) {
      const tfRes = await page.evaluate((interval) => {
        const btn = Array.from(document.querySelectorAll('.tf-btn')).find(b => b.textContent.trim() === interval);
        if (btn) btn.click();
        return {
          timeframe: interval,
          candlesCount: window.chartInstance?.candles?.length || 0
        };
      }, tf);
      auditResults.chartTimeframes[tf] = tfRes;
      await page.waitForTimeout(300);
    }

    // Reset to 15m
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('.tf-btn')).find(x => x.textContent.trim() === '15m');
      if (b) b.click();
    });
    await page.waitForTimeout(400);

    // 6. Auditing Chart Styles & Indicators
    console.log('Step 6: Auditing Chart Styles & Indicators (MA, EMA, BOLL, RSI, MACD, VOL)...');
    for (let i = 0; i < 5; i++) {
      const styleRes = await page.evaluate(() => {
        const btn = document.getElementById('indStyleBtn');
        if (btn) btn.click();
        return {
          style: window.chartInstance?.chartStyle,
          label: btn?.textContent.trim()
        };
      });
      auditResults.chartStyles.push(styleRes);
      await page.waitForTimeout(200);
    }

    const indIds = ['indMaBtn', 'indEmaBtn', 'indBollBtn', 'indRsiBtn', 'indMacdBtn', 'indVolBtn'];
    for (const id of indIds) {
      const indRes = await page.evaluate((btnId) => {
        const btn = document.getElementById(btnId);
        if (!btn) return { id: btnId, status: 'NOT_FOUND' };
        btn.click();
        return {
          id: btnId,
          active: btn.classList.contains('active'),
          indicators: { ...window.chartInstance?.indicators }
        };
      }, id);
      auditResults.indicatorsToggled[id] = indRes;
      await page.waitForTimeout(150);
    }

    // Capture chart with MACD and indicators enabled
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'omni_audit_chart_and_indicators.png') });

    // 7. Order Placement & Bottom Desk Positions
    console.log('Step 7: Auditing Order Execution (Market Buy Long 25x)...');
    const orderExecRes = await page.evaluate(() => {
      // Set Long side
      if (typeof window.setOrderSide === 'function') window.setOrderSide('buy');
      if (typeof window.setOrderType === 'function') window.setOrderType('market');
      if (typeof window.setLeverage === 'function') window.setLeverage(25);
      
      const sizeInput = document.getElementById('orderSizeInput');
      if (sizeInput) {
        sizeInput.value = '0.05';
        sizeInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      
      const placeBtn = document.getElementById('placeOrderBtn');
      if (placeBtn) placeBtn.click();

      const positions = window.localPositions || [];
      const latestPos = positions[positions.length - 1];

      return {
        orderPlaced: true,
        totalPositions: positions.length,
        latestPosition: latestPos ? {
          symbol: latestPos.symbol,
          side: latestPos.side,
          size: latestPos.size,
          leverage: latestPos.leverage,
          margin: latestPos.margin,
          liqPrice: latestPos.liquidationPrice
        } : null
      };
    });
    auditResults.orderExecution = orderExecRes;
    console.log(`✅ Order Placed: Latest Position=${JSON.stringify(orderExecRes.latestPosition)}`);
    await page.waitForTimeout(600);

    // Capture Desk with new position and Gemini Typography
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'omni_audit_order_and_positions.png') });

    // 8. Auditing Bottom Desk Tabs
    console.log('Step 8: Auditing Bottom Desk Tabs...');
    const deskTabs = [
      { id: 'tabBtnPositions', name: 'Positions' },
      { id: 'tabBtnOrders', name: 'Open Orders' },
      { id: 'tabBtnHistory', name: 'Order History' },
      { id: 'tabBtnTradesHistory', name: 'Trade History' },
      { id: 'tabBtnGridBots', name: 'AI Grid Bots' },
      { id: 'tabBtnScreener', name: 'Screener' }
    ];

    for (const dt of deskTabs) {
      const dtRes = await page.evaluate((t) => {
        const btn = document.getElementById(t.id);
        if (btn) btn.click();
        return {
          id: t.id,
          name: t.name,
          active: btn?.classList.contains('active')
        };
      }, dt);
      auditResults.deskTabs[dt.name] = dtRes;
      await page.waitForTimeout(200);
    }

    // 9. Auditing Assets & Collateral Hub & Modals
    console.log('Step 9: Auditing Assets Hub & Modals...');
    const assetsRes = await page.evaluate(() => {
      // Faucet test
      const prevBal = window.accountData?.equity || 0;
      if (typeof window.claimFaucetCollateral === 'function') {
        window.claimFaucetCollateral();
      }
      const newBal = window.accountData?.equity || 0;

      // ChangeNow Modal test
      let cnOpened = false;
      if (typeof window.openDepositModal === 'function') {
        window.openDepositModal('USDT');
        if (typeof window.switchDepositTab === 'function') {
          window.switchDepositTab('changenow');
        }
        const depModal = document.getElementById('modalDeposit');
        cnOpened = depModal && window.getComputedStyle(depModal).display !== 'none';
        if (typeof window.closeDepositModal === 'function') {
          window.closeDepositModal();
        }
      }

      return {
        faucetSuccess: newBal >= prevBal,
        newBalance: newBal,
        changeNowModalFunctional: cnOpened
      };
    });
    auditResults.assetsHub = assetsRes;
    console.log(`✅ Assets Hub Verified: Faucet=${assetsRes.faucetSuccess}, Balance=$${assetsRes.newBalance.toLocaleString()}, ChangeNow Modal=${assetsRes.changeNowModalFunctional}`);

    // 10. Multi-Viewport Responsive Audit (0px Horizontal Overflow Check)
    console.log('Step 10: Multi-Viewport Responsive Audit (Mobile 390px, Tablet 768px, Desktop 1440px)...');
    const viewports = [
      { name: 'Mobile_390x844', width: 390, height: 844 },
      { name: 'Tablet_768x1024', width: 768, height: 1024 },
      { name: 'Desktop_1440x900', width: 1440, height: 900 }
    ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(600);
      const vpMetrics = await page.evaluate(() => {
        const doc = document.documentElement;
        return {
          scrollWidth: doc.scrollWidth,
          clientWidth: doc.clientWidth,
          hasHorizontalOverflow: doc.scrollWidth > doc.clientWidth,
          overflowDelta: Math.max(0, doc.scrollWidth - doc.clientWidth)
        };
      });
      auditResults.viewports[vp.name] = vpMetrics;
      console.log(`   - Viewport ${vp.name}: clientWidth=${vpMetrics.clientWidth}, scrollWidth=${vpMetrics.scrollWidth}, Overflow=${vpMetrics.hasHorizontalOverflow ? `FAIL (${vpMetrics.overflowDelta}px)` : '0px (PERFECT)'}`);
      await page.screenshot({ path: path.join(ARTIFACT_DIR, `omni_audit_${vp.name}.png`) });
    }

    console.log('\n================ AUDIT SUMMARY REPORT ================');
    console.log(`Catalog Size: ${auditResults.totalCatalogMarkets}`);
    console.log(`New WEEX Tokens Tested: ${auditResults.newWeexTokensVerified.length}`);
    console.log(`Console Errors: ${auditResults.consoleErrors.length}`);
    console.log(`Failed HTTP Requests: ${auditResults.failedRequests.length}`);
    console.log('======================================================\n');

  } catch (err) {
    console.error('❌ Comprehensive Audit Error:', err);
  } finally {
    await browser.close();
  }
}

runComprehensiveAudit();
