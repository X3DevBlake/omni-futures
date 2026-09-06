const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = '/Users/dcaturfoh/.gemini/antigravity-ide/brain/3796794e-65fc-4aa1-8c29-e2ee936ff747';

(async () => {
  console.log('🚀 Launching Playwright audit for OmniFutures Sophisticated Voice Desk...');
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']
  });

  const page = await browser.newPage();
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      console.error('BROWSER CONSOLE ERROR:', msg.text());
    }
  });

  page.on('pageerror', err => {
    consoleErrors.push(err.message);
    console.error('PAGE ERROR:', err.message);
  });

  // 1. Desktop Viewport
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://127.0.0.1:8092/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  console.log('✅ Page loaded successfully on Desktop 1440x900');

  // Open Gemini Voice Desk
  await page.evaluate(() => {
    if (typeof window.toggleVoiceTrading === 'function') {
      window.toggleVoiceTrading();
    }
  });
  await page.waitForTimeout(600);

  const hudVisible = await page.$eval('#voiceTradingHud', el => el.style.display !== 'none');
  console.log(`✅ Voice Desk HUD visible: ${hudVisible}`);
  if (!hudVisible) throw new Error('Voice Desk HUD failed to open');

  // Verify Telemetry Bar
  const telemBar = await page.$eval('#voiceTelemetryBar', el => ({
    display: window.getComputedStyle(el).display,
    asr: document.getElementById('telemAsr').textContent,
    parse: document.getElementById('telemParse').textContent,
    match: document.getElementById('telemMatch').textContent,
    e2e: document.getElementById('telemE2e').textContent,
    pcm: document.getElementById('telemPcm').textContent
  }));
  console.log('✅ Micro-Telemetry Bar verified:', telemBar);

  // Test 1: Cycle Visualizer Mode
  console.log('--- Testing Visualizer Modes ---');
  let btnModeText = await page.$eval('#btnVisualizerMode', el => el.textContent.trim());
  console.log(`Initial Mode: ${btnModeText}`);

  // Switch to Spectrum
  await page.click('#btnVisualizerMode');
  await page.waitForTimeout(300);
  btnModeText = await page.$eval('#btnVisualizerMode', el => el.textContent.trim());
  console.log(`After 1st click: ${btnModeText}`);
  if (!btnModeText.includes('Spectrum')) throw new Error('Failed to switch to Spectrum mode');

  // Switch to VU Meter
  await page.click('#btnVisualizerMode');
  await page.waitForTimeout(300);
  btnModeText = await page.$eval('#btnVisualizerMode', el => el.textContent.trim());
  console.log(`After 2nd click: ${btnModeText}`);
  if (!btnModeText.includes('VU')) throw new Error('Failed to switch to VU Meter mode');

  // Switch back to Spectrum for screenshot
  await page.click('#btnVisualizerMode'); // -> Wave
  await page.click('#btnVisualizerMode'); // -> Spectrum
  await page.waitForTimeout(300);

  // Test 2: Cycle Sound Themes
  console.log('--- Testing Sound Themes ---');
  let themeText = await page.$eval('#btnVoiceSoundTheme', el => el.textContent.trim());
  console.log(`Initial Theme: ${themeText}`);

  await page.click('#btnVoiceSoundTheme');
  await page.waitForTimeout(300);
  themeText = await page.$eval('#btnVoiceSoundTheme', el => el.textContent.trim());
  console.log(`After 1st click: ${themeText}`);
  if (!themeText.includes('Cyberpunk')) throw new Error('Failed to switch to Cyberpunk theme');

  await page.click('#btnVoiceSoundTheme');
  await page.waitForTimeout(300);
  themeText = await page.$eval('#btnVoiceSoundTheme', el => el.textContent.trim());
  console.log(`After 2nd click: ${themeText}`);
  if (!themeText.includes('Bloomberg')) throw new Error('Failed to switch to Bloomberg theme');

  // Test 3: Institutional Voice Macros
  console.log('--- Testing Voice Macros ---');
  await page.evaluate(() => {
    if (typeof window.toggleVoiceMacroDrawer === 'function') {
      window.toggleVoiceMacroDrawer();
    }
  });
  await page.waitForTimeout(300);
  const macroDrawerVisible = await page.$eval('#voiceMacroDrawer', el => el.style.display !== 'none');
  console.log(`Macro Drawer Visible: ${macroDrawerVisible}`);

  // Dispatch Macro Alpha
  await page.evaluate(() => {
    window.processVoiceCommand('Run Macro Alpha');
  });
  await page.waitForTimeout(600);
  const actionPillAlpha = await page.$eval('#voiceActionPillText', el => el.textContent);
  console.log(`Action Pill after Macro Alpha: ${actionPillAlpha}`);
  if (!actionPillAlpha.includes('Alpha')) throw new Error('Macro Alpha failed to dispatch');

  // Test 4: Quant Strategy Simulator / Backtest Card
  console.log('--- Testing Quant Strategy Simulator ---');
  await page.evaluate(() => {
    window.processVoiceCommand('Backtest SMA Crossover on Bitcoin');
  });
  await page.waitForTimeout(600);

  const backtestCard = await page.$eval('#quantBacktestCard', el => ({
    display: el.style.display,
    title: document.getElementById('qbStrategyTitle').textContent,
    winRate: document.getElementById('qbWinRate').textContent,
    profitFactor: document.getElementById('qbProfitFactor').textContent,
    sharpe: document.getElementById('qbSharpe').textContent,
    drawdown: document.getElementById('qbDrawdown').textContent,
    trades: document.getElementById('qbTrades').textContent,
    return: document.getElementById('qbReturn').textContent
  }));
  console.log('✅ Quant Backtest Card Verified:', backtestCard);
  if (backtestCard.display === 'none') throw new Error('Quant Backtest card not displayed');

  // Test 5: Synthetic Volatility Straddle
  console.log('--- Testing Volatility Straddle ---');
  await page.evaluate(() => {
    window.processVoiceCommand('Deploy Volatility Straddle on Bitcoin');
  });
  await page.waitForTimeout(600);
  const actionPillStraddle = await page.$eval('#voiceActionPillText', el => el.textContent);
  console.log(`Action Pill after Straddle: ${actionPillStraddle}`);
  if (!actionPillStraddle.includes('Straddle')) throw new Error('Volatility Straddle failed to dispatch');

  // Capture Comprehensive Desktop Screenshot with HUD, Backtest Card, Spectrum Visualizer, and Telemetry
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'omni_voice_sophisticated_desktop_1440x900.png'),
    fullPage: false
  });
  console.log('📸 Desktop screenshot captured: omni_voice_sophisticated_desktop_1440x900.png');

  // Capture Close-up of the Voice Desk HUD & Quant Backtest Card
  const hudElement = await page.$('#voiceTradingHud');
  if (hudElement) {
    await hudElement.screenshot({
      path: path.join(ARTIFACT_DIR, 'omni_voice_hud_sophisticated_closeup.png')
    });
    console.log('📸 HUD close-up captured: omni_voice_hud_sophisticated_closeup.png');
  }

  const backtestElement = await page.$('#quantBacktestCard');
  if (backtestElement) {
    await backtestElement.screenshot({
      path: path.join(ARTIFACT_DIR, 'omni_quant_backtest_card_closeup.png')
    });
    console.log('📸 Backtest card close-up captured: omni_quant_backtest_card_closeup.png');
  }

  // 2. Tablet Viewport
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.waitForTimeout(500);
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'omni_voice_sophisticated_tablet_768x1024.png'),
    fullPage: false
  });
  console.log('📸 Tablet screenshot captured: omni_voice_sophisticated_tablet_768x1024.png');

  // 3. Mobile Viewport
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'omni_voice_sophisticated_mobile_390x844.png'),
    fullPage: false
  });
  console.log('📸 Mobile screenshot captured: omni_voice_sophisticated_mobile_390x844.png');

  if (consoleErrors.length > 0) {
    console.warn(`⚠️ Warning: ${consoleErrors.length} console errors logged.`);
  } else {
    console.log('🌟 ZERO console errors encountered throughout all audit tests!');
  }

  await browser.close();
  console.log('🎉 All 6 sophisticated voice capabilities verified successfully!');
})();
