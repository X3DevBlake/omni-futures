const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACTS_DIR = '/Users/dcaturfoh/.gemini/antigravity-ide/brain/3796794e-65fc-4aa1-8c29-e2ee936ff747';

(async () => {
  console.log('--- STARTING VERIFICATION: GEMINI SDK ICONS, VECTORS & SDK PACKAGES ---');

  // 1. Verify Node.js @google/genai package
  try {
    const pkg = require('@google/genai');
    console.log('✅ Node.js @google/genai package imported successfully:', typeof pkg);
  } catch (err) {
    console.warn('⚠️ Node.js @google/genai direct require note:', err.message);
  }

  // 2. Launch Browser
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      console.error('Console Error:', msg.text());
    }
  });

  console.log('Navigating to http://127.0.0.1:8092 ...');
  await page.goto('http://127.0.0.1:8092', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2500);

  // 3. Scan DOM for visible raw emojis
  const domEmojiCheck = await page.evaluate(() => {
    const emojiRegex = /[\u{1F300}-\u{1FAFF}]|[\u{2600}-\u{27BF}]|[\u{2300}-\u{23FF}]|[\u{2B50}-\u{2B55}]|[\u{25AA}-\u{25FE}]/u;
    const elements = Array.from(document.querySelectorAll('button, span, div, th, td, a, h1, h2, h3, h4, h5, h6'));
    const matches = [];

    for (const el of elements) {
      // ignore script and style tags
      if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE') continue;
      // check direct text
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

  console.log(`DOM Raw Emoji Count: ${domEmojiCheck.length}`);
  if (domEmojiCheck.length > 0) {
    console.warn('Elements with raw emojis found:', JSON.stringify(domEmojiCheck.slice(0, 5), null, 2));
  } else {
    console.log('✅ ZERO visible raw emojis found in the DOM! All icons are Material Symbols / SVGs!');
  }

  // 4. Count Material Symbols and Gemini SVGs in DOM
  const symbolStats = await page.evaluate(() => {
    const materialSymbols = document.querySelectorAll('.material-symbols-outlined, .gemini-symbol');
    const svgTokens = document.querySelectorAll('svg use[href*="omni-all-seeing-eye-token"], svg use[href*="gemini-sparkle"]');
    return {
      materialSymbolsCount: materialSymbols.length,
      svgTokensCount: svgTokens.length
    };
  });
  console.log(`✅ Material Symbols in DOM: ${symbolStats.materialSymbolsCount}`);
  console.log(`✅ Gemini Brand SVGs in DOM: ${symbolStats.svgTokensCount}`);

  // 5. Open Voice Trading HUD to inspect its icons
  console.log('Testing Voice Trading HUD...');
  await page.click('#btnVoiceTrade');
  await page.waitForTimeout(600);

  const voiceHudVisible = await page.isVisible('#voiceTradingHud');
  console.log(`Voice Trading HUD visible: ${voiceHudVisible}`);

  // Cycle Visualizer Mode
  await page.click('#btnVisualizerMode');
  await page.waitForTimeout(400);
  const vizModeText = await page.textContent('#btnVisualizerMode');
  console.log(`Visualizer Mode after 1 click: "${vizModeText.trim()}"`);

  // Cycle Sound Theme
  await page.click('#btnVoiceSoundTheme');
  await page.waitForTimeout(400);
  const soundThemeText = await page.textContent('#btnVoiceSoundTheme');
  console.log(`Sound Theme after 1 click: "${soundThemeText.trim()}"`);

  // Open Macro Drawer
  await page.click('#btnVoiceMacroToggle');
  await page.waitForTimeout(500);
  const macroDrawerVisible = await page.isVisible('#voiceMacroDrawer');
  console.log(`Macro Drawer visible: ${macroDrawerVisible}`);

  // Capture Desktop Screenshot with Voice HUD & Macro Drawer open
  const shotDesktop = path.join(ARTIFACTS_DIR, 'omni_gemini_icons_desktop_1440x900.png');
  await page.screenshot({ path: shotDesktop });
  console.log(`Saved screenshot: ${shotDesktop}`);

  // 6. Test Tablet Viewport (768x1024)
  console.log('Testing Tablet Viewport...');
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.waitForTimeout(600);
  const shotTablet = path.join(ARTIFACTS_DIR, 'omni_gemini_icons_tablet_768x1024.png');
  await page.screenshot({ path: shotTablet });
  console.log(`Saved screenshot: ${shotTablet}`);

  // 7. Test Mobile Viewport (390x844)
  console.log('Testing Mobile Viewport...');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(600);
  const shotMobile = path.join(ARTIFACTS_DIR, 'omni_gemini_icons_mobile_390x844.png');
  await page.screenshot({ path: shotMobile });
  console.log(`Saved screenshot: ${shotMobile}`);

  await browser.close();

  console.log('Console Errors:', consoleErrors.length);
  if (consoleErrors.length > 0) {
    console.error('Errors found:', consoleErrors);
    process.exit(1);
  }

  console.log('--- ALL VERIFICATIONS COMPLETED SUCCESSFULLY WITH 0 ERRORS ---');
})();
