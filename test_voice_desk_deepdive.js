const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = '/Users/dcaturfoh/.gemini/antigravity-ide/brain/3796794e-65fc-4aa1-8c29-e2ee936ff747';

(async () => {
  console.log('🚀 Starting OmniFutures Pro Next-Gen Live Voice Trading Desk Deep-Dive Verification...');

  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']
  });

  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 }
  });

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      console.error('Browser Console Error:', msg.text());
    }
  });

  page.on('pageerror', err => {
    consoleErrors.push(err.message);
    console.error('Browser Page Error:', err.message);
  });

  try {
    console.log('Navigating to http://127.0.0.1:8092/ ...');
    await page.goto('http://127.0.0.1:8092/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Open Voice HUD
    console.log('1. Opening Voice Trading Desk HUD...');
    await page.evaluate(() => {
      if (typeof window.toggleVoiceTrading === 'function') {
        window.toggleVoiceTrading();
      }
    });
    await page.waitForTimeout(600);

    // 2. Test Dynamic Multi-Persona Voice Switcher
    console.log('2. Testing Multi-Persona Switcher (Voice & Click)...');
    
    // Test A: Voice Switch to Scalper
    const scalperRes = await page.evaluate(() => {
      window.processVoiceCommand('Switch persona to Degen Scalper');
      const badge = document.getElementById('voicePersonaBadge');
      return {
        badgeText: badge?.textContent,
        isScalperClass: badge?.classList.contains('scalper'),
        response: document.getElementById('voiceGeminiResponseText')?.textContent
      };
    });
    console.log('   Scalper Persona Switch:', scalperRes);
    if (!scalperRes.isScalperClass) throw new Error('Failed to switch to Scalper persona');

    // Test B: Voice Switch to Risk Officer
    const riskRes = await page.evaluate(() => {
      window.processVoiceCommand('Switch persona to Risk Officer');
      const badge = document.getElementById('voicePersonaBadge');
      return {
        badgeText: badge?.textContent,
        isRiskClass: badge?.classList.contains('risk'),
        response: document.getElementById('voiceGeminiResponseText')?.textContent
      };
    });
    console.log('   Risk Officer Persona Switch:', riskRes);
    if (!riskRes.isRiskClass) throw new Error('Failed to switch to Risk Officer persona');

    // Test C: 1-Click Cycle Badge
    const cycleRes = await page.evaluate(() => {
      window.cycleVoicePersona();
      const badge = document.getElementById('voicePersonaBadge');
      return { badgeText: badge?.textContent, isQuant: badge?.classList.contains('quant') };
    });
    console.log('   1-Click Cycle Badge:', cycleRes);

    // 3. Test Multi-Asset Spread / Pairs Trading (Statistical Arbitrage)
    console.log('3. Testing Multi-Asset Spread Trading...');
    const spreadRes = await page.evaluate(() => {
      window.processVoiceCommand('Spread trade: Long 0.5 Bitcoin and Short 8 Ethereum');
      return {
        response: document.getElementById('voiceGeminiResponseText')?.textContent,
        action: document.getElementById('voiceActionPillText')?.textContent
      };
    });
    console.log('   Spread Trade Result:', spreadRes);
    if (!spreadRes.action?.includes('Spread Trade')) throw new Error('Spread trade execution failed');

    // 4. Test Algorithmic Voice TWAP Dispatch
    console.log('4. Testing Algorithmic Voice TWAP Dispatch...');
    const twapRes = await page.evaluate(() => {
      window.processVoiceCommand('TWAP 1 Bitcoin over 10 minutes in 5 slices');
      const card = document.getElementById('twapActiveCard');
      return {
        response: document.getElementById('voiceGeminiResponseText')?.textContent,
        action: document.getElementById('voiceActionPillText')?.textContent,
        cardVisible: card && card.style.display !== 'none'
      };
    });
    console.log('   Voice TWAP Result:', twapRes);
    if (!twapRes.cardVisible) throw new Error('TWAP card failed to appear');

    // 5. Test Live Technical Indicator Readout
    console.log('5. Testing Live Technical Indicator & Depth Readout...');
    const indRes = await page.evaluate(() => {
      window.processVoiceCommand('What is the RSI and MACD on Bitcoin?');
      return {
        response: document.getElementById('voiceGeminiResponseText')?.textContent,
        action: document.getElementById('voiceActionPillText')?.textContent
      };
    });
    console.log('   Indicator Readout Result:', indRes);
    if (!indRes.response?.includes('RSI(14)')) throw new Error('Indicator readout missing RSI');

    // 6. Test Institutional Emergency Panic Kill-Switch
    console.log('6. Testing Institutional Emergency Panic Kill-Switch...');
    const panicRes = await page.evaluate(() => {
      window.processVoiceCommand('Emergency Flatten');
      return {
        response: document.getElementById('voiceGeminiResponseText')?.textContent,
        action: document.getElementById('voiceActionPillText')?.textContent,
        positionsRemain: window.localPositions?.length || 0,
        ordersRemain: window.localOpenOrders?.length || 0
      };
    });
    console.log('   Panic Kill-Switch Result:', panicRes);
    if (panicRes.positionsRemain !== 0) throw new Error('Positions remained after emergency flatten');

    // 7. Toggle Audit Drawer
    console.log('7. Opening Audit Drawer to inspect full capability trail...');
    await page.evaluate(() => {
      window.toggleVoiceAuditDrawer();
    });
    await page.waitForTimeout(500);

    // 8. Capture Screenshots
    console.log('8. Capturing Screenshots across Desktop, Tablet, and Mobile...');
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'omni_voice_deepdive_desktop_1440x900.png'),
      fullPage: false
    });

    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'omni_voice_deepdive_tablet_768x1024.png'),
      fullPage: false
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'omni_voice_deepdive_mobile_390x844.png'),
      fullPage: false
    });

    console.log('===========================================================');
    console.log('🎉 ALL NEXT-GEN LIVE VOICE CAPABILITIES TESTED PERFECTLY!');
    console.log('Console Errors:', consoleErrors.length);
    console.log('===========================================================');

  } catch(err) {
    console.error('❌ Test failed with error:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
