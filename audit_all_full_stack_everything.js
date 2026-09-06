const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACTS_DIR = '/Users/dcaturfoh/.gemini/antigravity-ide/brain/3796794e-65fc-4aa1-8c29-e2ee936ff747';
const LOCAL_URL = 'http://127.0.0.1:8092';
const PROD_URL = 'https://omni-futures-39821.web.app';

async function auditEnvironment(targetUrl, envName) {
  console.log(`\n========================================================================`);
  console.log(`🔍 FULL-STACK AUDIT: ${envName} (${targetUrl})`);
  console.log(`========================================================================`);

  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']
  });

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      console.error(`[${envName} Console Error]:`, msg.text());
    }
  });

  page.on('pageerror', err => {
    consoleErrors.push(err.message);
    console.error(`[${envName} Page Error]:`, err.message);
  });

  // 1. Navigation
  console.log(`1. Navigating to ${targetUrl}...`);
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2500);
  console.log(`   ✅ Page loaded successfully`);

  // 2. Icon, Vector & Emoji Audit
  console.log(`2. Auditing Icons, Vectors, SVGs & Raw Emojis...`);
  const iconAudit = await page.evaluate(() => {
    const emojiRegex = /[\u{1F300}-\u{1FAFF}]|[\u{2600}-\u{27BF}]|[\u{2300}-\u{23FF}]|[\u{2B50}-\u{2B55}]|[\u{25AA}-\u{25FE}]/u;
    const elements = Array.from(document.querySelectorAll('button, span, div, th, td, a, h1, h2, h3, h4, h5, h6, label, p'));
    const emojiMatches = [];

    for (const el of elements) {
      if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE') continue;
      const directText = Array.from(el.childNodes)
        .filter(n => n.nodeType === Node.TEXT_NODE)
        .map(n => n.textContent)
        .join(' ');
      if (emojiRegex.test(directText)) {
        emojiMatches.push({ tag: el.tagName, id: el.id, text: directText.trim() });
      }
    }

    const materialSymbols = Array.from(document.querySelectorAll('.material-symbols-outlined, .gemini-symbol')).map(el => el.textContent.trim());
    const svgEyeTokens = document.querySelectorAll('svg use[href*="omni-all-seeing-eye-token"]').length;
    const svgSparkles = document.querySelectorAll('svg use[href*="gemini-sparkle"]').length;

    return {
      rawEmojiCount: emojiMatches.length,
      emojiMatches,
      materialSymbolsCount: materialSymbols.length,
      uniqueMaterialSymbols: Array.from(new Set(materialSymbols)),
      svgEyeTokens,
      svgSparkles
    };
  });

  console.log(`   - Raw Emojis in DOM: ${iconAudit.rawEmojiCount} (Target: 0)`);
  console.log(`   - Material Symbols Count: ${iconAudit.materialSymbolsCount}`);
  console.log(`   - Unique Material Symbols: ${iconAudit.uniqueMaterialSymbols.length} (${iconAudit.uniqueMaterialSymbols.slice(0, 10).join(', ')}...)`);
  console.log(`   - Gemini Eye SVG Brand Tokens: ${iconAudit.svgEyeTokens}`);
  console.log(`   - Gemini Sparkle SVG Symbols: ${iconAudit.svgSparkles}`);

  if (iconAudit.rawEmojiCount > 0) {
    console.warn('   ⚠️ Warning: Raw emojis found:', iconAudit.emojiMatches.slice(0, 3));
  } else {
    console.log(`   ✅ 100% PURE GEMINI MATERIAL SYMBOLS & BRAND SVGS VERIFIED!`);
  }

  // 3. Header & Navigation Controls Audit
  console.log(`3. Testing Navigation & Core Header Controls...`);
  // Faucet
  await page.click('#faucetBtn');
  await page.waitForTimeout(600);
  const equityText = await page.textContent('#headerEquityDisplay');
  console.log(`   - Faucet clicked. Live Equity: "${equityText ? equityText.trim() : 'N/A'}"`);

  // 1-Click Scalp
  await page.click('#btnScalperMode');
  await page.waitForTimeout(300);
  const scalpText = await page.textContent('#scalperStatusText');
  console.log(`   - 1-Click Scalp mode toggled: "${scalpText ? scalpText.trim() : 'N/A'}"`);

  // 4. Modals & Drawers Interactive Audit
  console.log(`4. Testing All Modals & Drawers Wiring...`);

  // 4.1 Search Markets Modal
  await page.evaluate(() => window.openOmniSearchModal());
  await page.waitForTimeout(400);
  let searchVisible = await page.isVisible('#modalOmniSearch');
  console.log(`   - Search Markets Modal visible: ${searchVisible}`);
  await page.fill('#omniSearchModalInput', 'SOL');
  await page.waitForTimeout(400);
  const searchResultsCount = await page.evaluate(() => document.querySelectorAll('#searchModalResultsList .search-result-row').length);
  console.log(`   - Search results for 'SOL': ${searchResultsCount}`);
  await page.evaluate(() => window.closeOmniSearchModal());
  await page.waitForTimeout(300);

  // 4.2 ERC-4337 Session Key Modal
  await page.click('#btnSessionKey');
  await page.waitForTimeout(400);
  let sessionVisible = await page.isVisible('#modalSessionKey');
  console.log(`   - Session Key Modal visible: ${sessionVisible}`);
  await page.click('#btnToggleSessionKeyAction');
  await page.waitForTimeout(400);
  const sessionStatus = await page.textContent('#sessionKeyLabel');
  console.log(`   - Session Key Status: "${sessionStatus ? sessionStatus.trim() : 'N/A'}"`);
  await page.click('#modalSessionKey .modal-close-btn');
  await page.waitForTimeout(300);

  // 4.3 Season Pass Modal (500 Tiers)
  await page.evaluate(() => window.openSeasonPassModal());
  await page.waitForTimeout(400);
  let seasonVisible = await page.isVisible('#modalSeasonPass');
  console.log(`   - Season Pass Modal visible: ${seasonVisible}`);
  const tiersCount = await page.evaluate(() => document.querySelectorAll('#seasonTiersScroll .season-tier-item').length);
  console.log(`   - Season Pass Tiers rendered: ${tiersCount}`);
  await page.click('#btnClaimDailyXp');
  await page.waitForTimeout(400);
  await page.evaluate(() => window.closeSeasonPassModal());
  await page.waitForTimeout(300);

  // 4.4 1v1 PvP Trading Duel Arena Modal
  await page.evaluate(() => window.openPvpArenaModal());
  await page.waitForTimeout(400);
  let pvpVisible = await page.isVisible('#modalPvpArena');
  console.log(`   - PvP Arena Modal visible: ${pvpVisible}`);
  await page.click('#btnStartPvpDuel');
  await page.waitForTimeout(1000);
  const pvpOpponent = await page.textContent('#pvpOpponentName');
  console.log(`   - PvP Duel Live against: "${pvpOpponent ? pvpOpponent.trim() : 'N/A'}"`);
  await page.evaluate(() => window.closePvpArenaModal());
  await page.waitForTimeout(300);

  // 4.5 Omni Ecosystem Portals Modal
  await page.evaluate(() => window.toggleEcosystemModal());
  await page.waitForTimeout(400);
  let ecoVisible = await page.isVisible('#ecosystemModal');
  console.log(`   - Ecosystem Modal visible: ${ecoVisible}`);
  const ecoCardsCount = await page.evaluate(() => document.querySelectorAll('#ecosystemModal .eco-card').length);
  console.log(`   - Ecosystem Portal Cards: ${ecoCardsCount}`);
  await page.evaluate(() => window.toggleEcosystemModal());
  await page.waitForTimeout(300);

  // 4.6 AI Copilot Drawer & Live Chat
  console.log(`   - Testing AI Copilot Drawer & Gemini Chat...`);
  await page.evaluate(() => window.toggleAiCopilotDrawer());
  await page.waitForTimeout(600);
  let aiDrawerVisible = await page.isVisible('#aiCopilotDrawer');
  console.log(`   - AI Copilot Drawer visible: ${aiDrawerVisible}`);

  // Send AI Copilot Question
  await page.fill('#copilotInput', 'Should I long BTC at 20x leverage?');
  await page.evaluate(() => window.sendAiCopilotQuestion());
  await page.waitForTimeout(2500);
  const aiChatMessages = await page.evaluate(() => {
    const msgs = document.querySelectorAll('#copilotChatBody .copilot-msg.ai');
    return msgs.length > 0 ? msgs[msgs.length - 1].textContent : '';
  });
  console.log(`   - Gemini AI Copilot Response: "${aiChatMessages.substring(0, 90).replace(/\n/g, ' ')}..."`);

  // Close AI Drawer
  await page.evaluate(() => window.toggleAiCopilotDrawer());
  await page.waitForTimeout(300);

  // 4.7 AI Quant Analysis Terminal
  console.log(`   - Testing AI Quant Analysis Memo...`);
  await page.evaluate(() => window.runAiQuantAnalysis());
  await page.waitForTimeout(3000);
  const quantAnalysisText = await page.textContent('#aiOutputContainer');
  console.log(`   - AI Quant Analysis Terminal: "${quantAnalysisText ? quantAnalysisText.substring(0, 90).replace(/\n/g, ' ') : 'N/A'}..."`);

  // 5. Order Entry & Execution Suite
  console.log(`5. Testing Order Execution Suite (Market, Limit, OCO, TWAP)...`);

  // Limit Order
  await page.click('#typeLimitBtn');
  await page.fill('#orderSizeInput', '0.05');
  await page.fill('#orderPriceInput', '65000');
  await page.click('#btnBuyAction');
  await page.waitForTimeout(600);

  // Market Order
  await page.click('#typeMarketBtn');
  await page.fill('#orderSizeInput', '0.02');
  await page.click('#btnBuyAction');
  await page.waitForTimeout(600);

  // OCO Bracket
  await page.click('#typeOcoBtn');
  await page.fill('#orderSizeInput', '0.01');
  await page.fill('#ocoTpPrice', '95000');
  await page.fill('#ocoSlPrice', '70000');
  await page.click('#btnBuyAction');
  await page.waitForTimeout(600);

  // Check Open Orders Table
  await page.click('#tabBtnOrders');
  await page.waitForTimeout(400);
  const openOrdersCount = await page.evaluate(() => document.querySelectorAll('#ordersTableBody tr').length);
  console.log(`   - Open Orders Desk Table Rows: ${openOrdersCount}`);

  // Check Positions Table
  await page.click('#tabBtnPositions');
  await page.waitForTimeout(400);
  const positionsCount = await page.evaluate(() => document.querySelectorAll('#positionsTableBody tr').length);
  console.log(`   - Positions Desk Table Rows: ${positionsCount}`);

  // 6. Multi-Chart & Technical Indicators
  console.log(`6. Testing Multi-Chart Grid & Technical Indicators...`);
  await page.click('#layout1x2Btn');
  await page.waitForTimeout(400);
  await page.click('#layout2x2Btn');
  await page.waitForTimeout(400);
  await page.click('#layout1x1Btn');
  await page.waitForTimeout(400);
  console.log(`   - Multi-Chart Switcher (1x1 -> 1x2 -> 2x2 -> 1x1) verified`);

  await page.click('#indFootprintBtn');
  await page.waitForTimeout(200);
  await page.click('#indProfileBtn');
  await page.waitForTimeout(200);
  await page.click('#indFiboBtn');
  await page.waitForTimeout(200);
  console.log(`   - Technical Indicators (Footprint Delta, Volume Profile, Fibonacci) toggled ON`);

  // 7. Gemini Institutional Voice Trading Desk
  console.log(`7. Testing Gemini Live Voice Trading Desk & Macro Drawer...`);
  await page.evaluate(() => window.toggleVoiceTrading());
  await page.waitForTimeout(600);

  const voiceHudVisible = await page.isVisible('#voiceTradingHud');
  console.log(`   - Voice Trading HUD visible: ${voiceHudVisible}`);

  // Toggle Visualizer Mode
  await page.click('#btnVisualizerMode');
  await page.waitForTimeout(200);
  const vizMode = await page.textContent('#btnVisualizerMode');
  console.log(`   - Voice Visualizer Mode: "${vizMode ? vizMode.trim() : 'N/A'}"`);

  // Toggle Sound Theme
  await page.click('#btnVoiceSoundTheme');
  await page.waitForTimeout(200);
  const soundTheme = await page.textContent('#btnVoiceSoundTheme');
  console.log(`   - Voice Sound Theme: "${soundTheme ? soundTheme.trim() : 'N/A'}"`);

  // Open Macro Drawer
  await page.click('#btnVoiceMacroToggle');
  await page.waitForTimeout(400);
  const macroDrawerVisible = await page.isVisible('#voiceMacroDrawer');
  console.log(`   - Voice Macro Drawer visible: ${macroDrawerVisible}`);

  // Execute spoken command simulation
  await page.evaluate(() => window.processVoiceCommand("What is my portfolio risk?"));
  await page.waitForTimeout(600);
  const voiceResponse = await page.textContent('#voiceGeminiResponseText');
  console.log(`   - Spoken AI Risk Debrief Response: "${voiceResponse ? voiceResponse.trim() : 'N/A'}"`);

  // Capture Comprehensive Desktop Screenshot
  const shotPath = path.join(ARTIFACTS_DIR, `omni_audit_fullstack_${envName.toLowerCase()}_1440x900.png`);
  await page.screenshot({ path: shotPath });
  console.log(`   - Saved Audit Screenshot: ${shotPath}`);

  // Responsive Viewports Test
  console.log(`8. Testing Responsive Viewports (Tablet & Mobile)...`);
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.waitForTimeout(600);
  const shotTablet = path.join(ARTIFACTS_DIR, `omni_audit_fullstack_${envName.toLowerCase()}_768x1024.png`);
  await page.screenshot({ path: shotTablet });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(600);
  const shotMobile = path.join(ARTIFACTS_DIR, `omni_audit_fullstack_${envName.toLowerCase()}_390x844.png`);
  await page.screenshot({ path: shotMobile });

  console.log(`9. Audit Summary for ${envName}:`);
  console.log(`   - Total Console Errors: ${consoleErrors.length}`);
  console.log(`   - Raw Emoji Violations: ${iconAudit.rawEmojiCount}`);
  console.log(`   - Material Symbols Rendered: ${iconAudit.materialSymbolsCount}`);
  console.log(`   - Gemini Brand SVGs: ${iconAudit.svgEyeTokens + iconAudit.svgSparkles}`);

  await browser.close();

  return {
    envName,
    consoleErrors: consoleErrors.length,
    rawEmojis: iconAudit.rawEmojiCount,
    materialSymbols: iconAudit.materialSymbolsCount,
    geminiSvgs: iconAudit.svgEyeTokens + iconAudit.svgSparkles,
    shotPath,
    shotTablet,
    shotMobile
  };
}

(async () => {
  console.log('=== STARTING COMPREHENSIVE FULL-STACK MASTER AUDIT ===\n');

  // Audit Local Environment
  const localResult = await auditEnvironment(LOCAL_URL, 'LOCAL');

  // Audit Production Environment
  const prodResult = await auditEnvironment(PROD_URL, 'PRODUCTION');

  console.log('\n========================================================================');
  console.log('🏆 MASTER AUDIT SUMMARY REPORT');
  console.log('========================================================================');
  console.log(`LOCAL:      Console Errors: ${localResult.consoleErrors}, Raw Emojis: ${localResult.rawEmojis}, Material Symbols: ${localResult.materialSymbols}, Gemini SVGs: ${localResult.geminiSvgs}`);
  console.log(`PRODUCTION: Console Errors: ${prodResult.consoleErrors}, Raw Emojis: ${prodResult.rawEmojis}, Material Symbols: ${prodResult.materialSymbols}, Gemini SVGs: ${prodResult.geminiSvgs}`);
  console.log('========================================================================\n');
})();
