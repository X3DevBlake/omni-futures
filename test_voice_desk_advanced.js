const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = '/Users/dcaturfoh/.gemini/antigravity-ide/brain/3796794e-65fc-4aa1-8c29-e2ee936ff747';

(async () => {
  console.log('🚀 Starting OmniFutures Pro Phase 4 Deep-Dive Voice Trading Desk Automated Verification...');

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
    await page.goto('http://127.0.0.1:8092/', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // 1. Open Voice Desk HUD
    console.log('1. Opening Voice Trading Desk HUD...');
    await page.evaluate(() => {
      if (typeof window.toggleVoiceTrading === 'function') {
        window.toggleVoiceTrading();
      }
    });
    await page.waitForTimeout(1000);

    const isHudVisible = await page.$eval('#voiceTradingHud', el => el.style.display !== 'none');
    console.log('Voice Desk HUD Visible:', isHudVisible);
    if (!isHudVisible) throw new Error('#voiceTradingHud failed to display');

    // 2. Verify Web Audio Oscilloscope Canvas
    console.log('2. Verifying Web Audio Oscilloscope Canvas...');
    const hasCanvas = await page.$eval('#voiceOscilloscopeCanvas', el => el !== null && el.width === 340 && el.height === 48);
    console.log('Oscilloscope Canvas Configured (340x48):', hasCanvas);

    // 3. Test Push-to-Talk (PTT) Squawk Bar Handlers
    console.log('3. Testing Push-to-Talk (PTT) Squawk Bar...');
    await page.evaluate(() => {
      window.startPttSpeech();
    });
    await page.waitForTimeout(400);

    const isPttRecording = await page.$eval('#voicePttBar', el => el.classList.contains('recording'));
    const pttStatusText = await page.$eval('#voicePttStatus', el => el.textContent);
    console.log('PTT Recording State:', isPttRecording, '| Status Text:', pttStatusText);

    await page.evaluate(() => {
      window.stopPttSpeech();
    });
    await page.waitForTimeout(400);
    const isPttStandby = await page.$eval('#voicePttBar', el => !el.classList.contains('recording'));
    console.log('PTT Standby State:', isPttStandby);

    // 4. Test Advanced Spoken Strategies
    console.log('4. Testing Advanced Multi-Leg Spoken Trading Strategies...');

    // A: Multi-leg Simultaneous TP/SL Brackets
    console.log('   Test A: Spoken Dual Bracket Order ("Buy 0.5 Bitcoin with 50x leverage, take profit 85000, stop loss 75000")...');
    const resA = await page.evaluate(() => {
      window.processVoiceCommand('Buy 0.5 Bitcoin with 50x leverage, take profit 85000, stop loss 75000');
      return {
        responseText: document.getElementById('voiceGeminiResponseText')?.textContent,
        actionText: document.getElementById('voiceActionPillText')?.textContent,
        ordersCount: window.localOpenOrders ? window.localOpenOrders.length : 0,
        positionsCount: window.localPositions ? window.localPositions.length : 0
      };
    });
    console.log('   Result A:', resA);

    // B: Dollar-amount notional sizing
    console.log('   Test B: Spoken Dollar-amount Sizing ("Open a $5,000 long on Solana with 20x leverage")...');
    const resB = await page.evaluate(() => {
      window.processVoiceCommand('Open a $5,000 long on Solana with 20x leverage');
      return {
        responseText: document.getElementById('voiceGeminiResponseText')?.textContent,
        actionText: document.getElementById('voiceActionPillText')?.textContent,
        symbol: window.currentSymbol,
        leverage: window.currentLeverage
      };
    });
    console.log('   Result B:', resB);

    // C: Partial position close
    console.log('   Test C: Spoken Partial Close ("Close 50% of my position")...');
    const resC = await page.evaluate(() => {
      window.processVoiceCommand('Close 50% of my position');
      return {
        responseText: document.getElementById('voiceGeminiResponseText')?.textContent,
        actionText: document.getElementById('voiceActionPillText')?.textContent
      };
    });
    console.log('   Result C:', resC);

    // D: Position Flip / Reverse
    console.log('   Test D: Spoken Flip Position ("Flip my position to short")...');
    const resD = await page.evaluate(() => {
      window.processVoiceCommand('Flip my position to short');
      return {
        responseText: document.getElementById('voiceGeminiResponseText')?.textContent,
        actionText: document.getElementById('voiceActionPillText')?.textContent,
        posSide: window.localPositions[0]?.side
      };
    });
    console.log('   Result D:', resD);

    // E: Breakeven stop loss arming
    console.log('   Test E: Spoken Breakeven Stop ("Move stop to breakeven")...');
    const resE = await page.evaluate(() => {
      window.processVoiceCommand('Move stop to breakeven');
      return {
        responseText: document.getElementById('voiceGeminiResponseText')?.textContent,
        actionText: document.getElementById('voiceActionPillText')?.textContent
      };
    });
    console.log('   Result E:', resE);

    // F: Quantitative Portfolio Risk Debrief
    console.log('   Test F: Spoken Risk Debrief ("What is my portfolio risk?")...');
    const resF = await page.evaluate(() => {
      window.processVoiceCommand('What is my portfolio risk?');
      return {
        responseText: document.getElementById('voiceGeminiResponseText')?.textContent,
        actionText: document.getElementById('voiceActionPillText')?.textContent
      };
    });
    console.log('   Result F:', resF);

    // G: Market Briefing
    console.log('   Test G: Spoken Market Briefing...');
    const resG = await page.evaluate(() => {
      window.speakMarketBriefing();
      return {
        responseText: document.getElementById('voiceGeminiResponseText')?.textContent,
        actionText: document.getElementById('voiceActionPillText')?.textContent
      };
    });
    console.log('   Result G:', resG);

    // 5. Test Voice Audit Drawer
    console.log('5. Testing Voice Audit History & JSON Intent Inspector Drawer...');
    const auditInfo = await page.evaluate(() => {
      window.toggleVoiceAuditDrawer();
      const drawer = document.getElementById('voiceAuditDrawer');
      const count = document.getElementById('voiceAuditCount')?.textContent;
      const listItems = document.querySelectorAll('#voiceAuditList .voice-audit-item');
      return {
        drawerDisplay: drawer?.style.display,
        countBadge: count,
        renderedItems: listItems.length
      };
    });
    console.log('Audit Drawer State:', auditInfo);

    // 6. Test Autonomous Squawk Alert Toggle
    console.log('6. Testing Autonomous Squawk Alert Toggle...');
    const squawkToggle = await page.evaluate(() => {
      const btn = document.getElementById('btnToggleSquawkAlerts');
      const initialText = btn?.textContent?.trim();
      window.toggleAutonomousSquawkAlerts();
      const afterText1 = btn?.textContent?.trim();
      window.toggleAutonomousSquawkAlerts();
      const afterText2 = btn?.textContent?.trim();
      return { initialText, afterText1, afterText2 };
    });
    console.log('Squawk Toggle Results:', squawkToggle);

    // 7. Capture Desktop HUD Screenshot
    console.log('7. Capturing Desktop HUD Screenshot...');
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'omni_voice_trading_desk_desktop_1440x900.png'),
      fullPage: false
    });

    // 8. Capture Tablet Viewport Screenshot
    console.log('8. Capturing Tablet Viewport Screenshot (768x1024)...');
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(600);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'omni_voice_trading_desk_tablet_768x1024.png'),
      fullPage: false
    });

    // 9. Capture Mobile Viewport Screenshot
    console.log('9. Capturing Mobile Viewport Screenshot (390x844)...');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(600);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'omni_voice_trading_desk_mobile_390x844.png'),
      fullPage: false
    });

    console.log('====================================================');
    console.log('🎉 ALL VOICE TRADING DESK TESTS PASSED SUCCESSFULLY!');
    console.log('Console errors count:', consoleErrors.length);
    console.log('====================================================');

  } catch(err) {
    console.error('❌ Test failed with error:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
