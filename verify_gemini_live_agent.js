const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function testGeminiLiveAgent() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      console.error('Console Error:', msg.text());
    }
  });
  page.on('pageerror', err => {
    consoleErrors.push(err.message);
    console.error('Page Error:', err.message);
  });

  console.log('1. Navigating to http://localhost:8092...');
  await page.goto('http://localhost:8092', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // 1. Open Gemini Live
  console.log('2. Opening Gemini Live HUD...');
  const voiceBtn = await page.locator('#btnVoiceTrade');
  await voiceBtn.click();
  await page.waitForTimeout(1000);

  const hudVisible = await page.locator('#voiceTradingHud').isVisible();
  console.log(`- Gemini Live HUD visible: ${hudVisible}`);
  if (!hudVisible) throw new Error('Gemini Live HUD did not become visible');

  // Verify Title and Model tag
  const titleText = await page.locator('.gemini-live-title').textContent();
  const modelTag = await page.locator('.gemini-live-model-tag').textContent();
  const stateText = await page.locator('#geminiLiveStateText').textContent();
  console.log(`- Title: "${titleText}", Model: "${modelTag}", State: "${stateText}"`);

  if (!titleText.includes('GEMINI LIVE')) throw new Error(`Expected GEMINI LIVE title, got: ${titleText}`);
  if (!modelTag.includes('gemini-3.1-flash-live')) throw new Error(`Expected gemini-3.1-flash-live tag, got: ${modelTag}`);

  // Verify Gemini Live Orb Canvas
  const orbCanvas = await page.locator('#voiceOscilloscopeCanvas');
  const orbVisible = await orbCanvas.isVisible();
  console.log(`- Gemini Live Orb canvas visible: ${orbVisible}`);
  if (!orbVisible) throw new Error('Orb canvas is not visible');

  // Capture Screenshot of initial Gemini Live HUD
  const artifactDir = '/Users/dcaturfoh/.gemini/antigravity-ide/brain/3796794e-65fc-4aa1-8c29-e2ee936ff747';
  await page.screenshot({ path: path.join(artifactDir, 'omni_gemini_live_hud_initial.png') });
  console.log('Saved omni_gemini_live_hud_initial.png');

  // 2. Dispatch Voice Command 1: Trade with TP/SL brackets
  console.log('3. Dispatching Spoken Trade Command: "Buy 0.5 Bitcoin with 50x leverage, take profit 90000, stop loss 75000"...');
  await page.evaluate(async () => {
    await window.processVoiceCommand('Buy 0.5 Bitcoin with 50x leverage, take profit 90000, stop loss 75000');
  });
  await page.waitForTimeout(1500);

  const toolCards = await page.locator('#geminiLiveToolCards .gemini-live-tool-card').allTextContents();
  console.log(`- Tool Stream Cards (${toolCards.length}):`);
  toolCards.forEach(c => console.log(`   * ${c.replace(/\s+/g, ' ')}`));

  const hasTradeTool = toolCards.some(c => c.includes('executeTrade') && c.includes('Filled Market BUY'));
  console.log(`- Has executeTrade tool completion: ${hasTradeTool}`);
  if (!hasTradeTool) throw new Error('executeTrade tool did not complete successfully');

  // Verify Positions and Open Orders in Terminal
  const posCount = await page.evaluate(() => window.localPositions ? window.localPositions.length : 0);
  const ordCount = await page.evaluate(() => window.localOpenOrders ? window.localOpenOrders.length : 0);
  console.log(`- Local Positions: ${posCount}, Open Orders (OCO brackets): ${ordCount}`);
  if (posCount < 1) throw new Error('Position was not created on the terminal');
  if (ordCount < 2) throw new Error('OCO TP/SL bracket orders were not armed');

  // 3. Dispatch Voice Command 2: Multi-Chart Layout & Footprint
  console.log('4. Dispatching Spoken Layout & Indicator Command: "Switch layout to 2x2 grid and turn on the footprint indicator"...');
  await page.evaluate(async () => {
    await window.processVoiceCommand('Switch layout to 2x2 grid and turn on the footprint indicator');
  });
  await page.waitForTimeout(1500);

  const updatedToolCards = await page.locator('#geminiLiveToolCards .gemini-live-tool-card').allTextContents();
  const hasLayoutTool = updatedToolCards.some(c => c.includes('setChartLayout') && c.includes('2x2'));
  console.log(`- Has setChartLayout 2x2: ${hasLayoutTool}`);
  if (!hasLayoutTool) throw new Error('setChartLayout tool was not executed');

  // 4. Dispatch Voice Command 3: Deploy Grid Bot
  console.log('5. Dispatching Bot Command: "Deploy grid bot on Solana with $2,000"...');
  await page.evaluate(async () => {
    await window.processVoiceCommand('Deploy grid bot on Solana with $2,000');
  });
  await page.waitForTimeout(1500);

  const botToolCards = await page.locator('#geminiLiveToolCards .gemini-live-tool-card').allTextContents();
  const hasBotTool = botToolCards.some(c => c.includes('deployGridBot') && c.includes('SOL'));
  console.log(`- Has deployGridBot: ${hasBotTool}`);
  if (!hasBotTool) throw new Error('deployGridBot tool was not executed');

  // 5. Dispatch Voice Command 4: Claim Faucet
  console.log('6. Dispatching Faucet Command: "Claim faucet funds"...');
  const initialEquity = await page.evaluate(() => window.accountEquity);
  await page.evaluate(async () => {
    await window.processVoiceCommand('Claim faucet funds');
  });
  await page.waitForTimeout(1000);
  const newEquity = await page.evaluate(() => window.accountEquity);
  console.log(`- Equity before faucet: $${initialEquity}, after: $${newEquity}`);
  if (newEquity <= initialEquity) throw new Error('Equity was not incremented by faucet tool');

  // 6. Dispatch Voice Command 5: Emergency Flatten
  console.log('7. Dispatching Emergency Flatten: "Emergency Flatten"...');
  await page.evaluate(async () => {
    await window.processVoiceCommand('Emergency Flatten');
  });
  await page.waitForTimeout(1000);
  const finalPosCount = await page.evaluate(() => window.localPositions.length);
  const finalOrdCount = await page.evaluate(() => window.localOpenOrders.length);
  console.log(`- Post-Flatten Positions: ${finalPosCount}, Orders: ${finalOrdCount}`);
  if (finalPosCount !== 0) throw new Error('Positions were not flattened by emergency protocol');

  // Capture final screenshot of active Gemini Live Action Stream
  await page.screenshot({ path: path.join(artifactDir, 'omni_gemini_live_action_stream.png') });
  console.log('Saved omni_gemini_live_action_stream.png');

  // Check console errors
  console.log(`8. Console error count: ${consoleErrors.length}`);
  if (consoleErrors.length > 0) {
    throw new Error(`Found ${consoleErrors.length} console errors during test: ${consoleErrors.join(', ')}`);
  }

  await browser.close();
  console.log('=== ALL GEMINI LIVE TESTS PASSED WITH 100% SUCCESS ===');
}

testGeminiLiveAgent().catch(err => {
  console.error('FATAL TEST FAILURE:', err);
  process.exit(1);
});
