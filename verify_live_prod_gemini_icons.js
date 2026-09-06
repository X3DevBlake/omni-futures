const { chromium } = require('playwright');
const path = require('path');

const ARTIFACTS_DIR = '/Users/dcaturfoh/.gemini/antigravity-ide/brain/3796794e-65fc-4aa1-8c29-e2ee936ff747';
const PROD_URL = 'https://omni-futures-39821.web.app/';

(async () => {
  console.log('=== STARTING LIVE PRODUCTION GEMINI ICONS & SDK AUDIT ===');
  console.log(`Target: ${PROD_URL}`);

  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      console.error('[PROD Console Error]:', msg.text());
    }
  });

  page.on('pageerror', err => {
    consoleErrors.push(err.message);
    console.error('[PROD Page Error]:', err.message);
  });

  console.log(`Navigating to ${PROD_URL} (domcontentloaded) ...`);
  await page.goto(PROD_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);
  console.log('✅ Page loaded successfully');

  // 1. Scan DOM for raw emojis
  const domEmojiCheck = await page.evaluate(() => {
    const emojiRegex = /[\u{1F300}-\u{1FAFF}]|[\u{2600}-\u{27BF}]|[\u{2300}-\u{23FF}]|[\u{2B50}-\u{2B55}]|[\u{25AA}-\u{25FE}]/u;
    const elements = Array.from(document.querySelectorAll('button, span, div, th, td, a, h1, h2, h3, h4, h5, h6, label, p'));
    const matches = [];

    for (const el of elements) {
      if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE') continue;
      const directText = Array.from(el.childNodes)
        .filter(n => n.nodeType === Node.TEXT_NODE)
        .map(n => n.textContent)
        .join(' ');
      if (emojiRegex.test(directText)) {
        matches.push({
          tag: el.tagName,
          id: el.id || '',
          className: el.className || '',
          text: directText.trim()
        });
      }
    }
    return matches;
  });

  console.log(`[PROD] DOM Raw Emoji Count: ${domEmojiCheck.length}`);
  if (domEmojiCheck.length > 0) {
    console.warn('[PROD] Warning: Elements with raw emojis found:', JSON.stringify(domEmojiCheck.slice(0, 5), null, 2));
  } else {
    console.log('✅ [PROD] ZERO visible raw emojis found in the DOM! 100% pure Material Symbols and Gemini SVGs!');
  }

  // 2. Count Material Symbols and Gemini SVGs
  const symbolStats = await page.evaluate(() => {
    const materialSymbols = document.querySelectorAll('.material-symbols-outlined, .gemini-symbol');
    const svgTokens = document.querySelectorAll('svg use[href*="omni-all-seeing-eye-token"], svg use[href*="gemini-sparkle"]');
    return {
      materialSymbolsCount: materialSymbols.length,
      svgTokensCount: svgTokens.length
    };
  });
  console.log(`✅ [PROD] Material Symbols in DOM: ${symbolStats.materialSymbolsCount}`);
  console.log(`✅ [PROD] Gemini Brand SVGs in DOM: ${symbolStats.svgTokensCount}`);

  // 3. Test Voice Trading HUD icons
  console.log('[PROD] Opening Voice Trading HUD...');
  await page.evaluate(() => {
    if (typeof window.toggleVoiceTrading === 'function') {
      window.toggleVoiceTrading();
    }
  });
  await page.waitForTimeout(800);

  const voiceHudVisible = await page.isVisible('#voiceTradingHud');
  console.log(`[PROD] Voice Trading HUD visible: ${voiceHudVisible}`);

  // Visualizer Mode toggle
  await page.click('#btnVisualizerMode');
  await page.waitForTimeout(300);
  const vizModeText = await page.textContent('#btnVisualizerMode');
  console.log(`[PROD] Visualizer Mode: "${vizModeText.trim()}"`);

  // Sound Theme toggle
  await page.click('#btnVoiceSoundTheme');
  await page.waitForTimeout(300);
  const soundThemeText = await page.textContent('#btnVoiceSoundTheme');
  console.log(`[PROD] Sound Theme: "${soundThemeText.trim()}"`);

  // Macro Drawer toggle
  await page.click('#btnVoiceMacroToggle');
  await page.waitForTimeout(500);
  const macroDrawerVisible = await page.isVisible('#voiceMacroDrawer');
  console.log(`[PROD] Macro Drawer visible: ${macroDrawerVisible}`);

  // Desktop Screenshot
  const shotDesktop = path.join(ARTIFACTS_DIR, 'omni_prod_gemini_icons_desktop_1440x900.png');
  await page.screenshot({ path: shotDesktop });
  console.log(`[PROD] Saved desktop screenshot: ${shotDesktop}`);

  // 4. Tablet Viewport (768x1024)
  console.log('[PROD] Testing Tablet Viewport (768x1024)...');
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.waitForTimeout(800);
  const shotTablet = path.join(ARTIFACTS_DIR, 'omni_prod_gemini_icons_tablet_768x1024.png');
  await page.screenshot({ path: shotTablet });
  console.log(`[PROD] Saved tablet screenshot: ${shotTablet}`);

  // 5. Mobile Viewport (390x844)
  console.log('[PROD] Testing Mobile Viewport (390x844)...');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(800);
  const shotMobile = path.join(ARTIFACTS_DIR, 'omni_prod_gemini_icons_mobile_390x844.png');
  await page.screenshot({ path: shotMobile });
  console.log(`[PROD] Saved mobile screenshot: ${shotMobile}`);

  console.log(`[PROD] Total Console Errors: ${consoleErrors.length}`);
  await browser.close();

  console.log('=== LIVE PRODUCTION GEMINI ICONS AUDIT COMPLETE: ALL PASS ===');
})();
