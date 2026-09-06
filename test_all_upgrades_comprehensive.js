const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = '/Users/dcaturfoh/.gemini/antigravity-ide/brain/3796794e-65fc-4aa1-8c29-e2ee936ff747';
const TARGET_URL = 'http://127.0.0.1:8092/';

async function runTests() {
  console.log('🚀 Launching Playwright browser test suite for OmniFutures 5-Phase Upgrade...');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      console.error(`[Browser Console Error]: ${msg.text()}`);
    }
  });

  page.on('pageerror', err => {
    consoleErrors.push(err.message);
    console.error(`[Browser Page Error]: ${err.message}`);
  });

  try {
    await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);

    console.log('✅ Page loaded successfully');

    // =========================================================================
    // TEST 1: Phase 1 Institutional Suite (Multi-Collateral, OCO, TWAP, Iceberg)
    // =========================================================================
    console.log('\n--- Testing Phase 1: Institutional Execution Suite ---');
    
    // 1.1 Multi-Collateral Basket
    const collateralSelect = page.locator('#multiCollateralSelect');
    await collateralSelect.selectOption('BTC');
    await page.waitForTimeout(300);
    const btcPowerBadge = await page.textContent('#effectivePowerText');
    console.log(`Collateral BTC selected. Haircut badge: "${btcPowerBadge}"`);
    if (!btcPowerBadge.includes('0.95x')) throw new Error('Multi-collateral BTC haircut incorrect');

    await collateralSelect.selectOption('OMNI');
    await page.waitForTimeout(300);
    const omniPowerBadge = await page.textContent('#effectivePowerText');
    console.log(`Collateral OMNI selected. Haircut badge: "${omniPowerBadge}"`);
    if (!omniPowerBadge.includes('0.8x')) throw new Error('Multi-collateral OMNI haircut incorrect');

    // 1.2 OCO Dual-Bracket Orders
    console.log('Testing OCO Order Entry...');
    await page.click('#typeOcoBtn');
    await page.waitForTimeout(300);
    const ocoGroupVisible = await page.isVisible('#ocoGroup');
    if (!ocoGroupVisible) throw new Error('#ocoGroup not visible when OCO selected');

    await page.fill('#orderSizeInput', '0.25');
    await page.fill('#ocoTpPrice', '69500');
    await page.fill('#ocoSlPrice', '64000');
    await page.click('#btnBuyAction');
    await page.waitForTimeout(600);

    const openOrdersCount = await page.evaluate(() => window.localOpenOrders ? window.localOpenOrders.length : 0);
    console.log(`Open orders after OCO armed: ${openOrdersCount}`);
    if (openOrdersCount < 2) throw new Error('Expected at least 2 linked OCO bracket orders');

    // 1.3 TWAP Algorithmic Slicing
    console.log('Testing TWAP Algorithmic Slicing...');
    await page.click('#typeTwapBtn');
    await page.waitForTimeout(300);
    const twapGroupVisible = await page.isVisible('#twapGroup');
    if (!twapGroupVisible) throw new Error('#twapGroup not visible when TWAP selected');

    await page.fill('#orderSizeInput', '0.5');
    await page.selectOption('#twapSlicesSelect', '5');
    await page.click('#btnBuyAction');
    await page.waitForTimeout(1000);

    const twapCardVisible = await page.isVisible('#twapActiveCard');
    console.log(`TWAP Progress Card visible: ${twapCardVisible}`);
    if (!twapCardVisible) throw new Error('TWAP Progress Card did not appear');

    // 1.4 Iceberg Order
    console.log('Testing Iceberg Order...');
    await page.click('#typeIcebergBtn');
    await page.waitForTimeout(300);
    const icebergVisible = await page.isVisible('#icebergGroup');
    if (!icebergVisible) throw new Error('#icebergGroup not visible when ICEBERG selected');

    await page.fill('#orderSizeInput', '1.0');
    await page.fill('#icebergTrancheInput', '0.2');
    await page.click('#btnBuyAction');
    await page.waitForTimeout(600);
    console.log('✅ Phase 1 Institutional Suite verified successfully');

    // =========================================================================
    // TEST 2: Phase 2 Live Web3 Wallet & 1-Click Trading (Session Keys)
    // =========================================================================
    console.log('\n--- Testing Phase 2: Live Web3 Wallet & 1-Click Session Keys ---');
    await page.click('#btnSessionKey');
    await page.waitForTimeout(400);

    const sessionModalVisible = await page.isVisible('#modalSessionKey');
    if (!sessionModalVisible) throw new Error('Session Key Modal did not open');

    // Activate 1-Click Session Key
    await page.click('#btnToggleSessionKeyAction');
    await page.waitForTimeout(500);

    const sessionKeyActive = await page.evaluate(() => window.sessionKeyActive);
    const headerLabel = await page.textContent('#sessionKeyLabel');
    console.log(`Session Key Active: ${sessionKeyActive}, Header Label: "${headerLabel}"`);
    if (!sessionKeyActive || !headerLabel.includes('ON')) throw new Error('Session Key activation failed');

    const txLink = await page.getAttribute('#sessionKeyTxHashLink', 'href');
    console.log(`Arbiscan Tx Link: ${txLink}`);
    if (!txLink || !txLink.includes('arbiscan.io')) throw new Error('Arbiscan link not generated');

    // Close modal
    await page.click('#modalSessionKey .modal-close-btn');
    await page.waitForTimeout(300);
    console.log('✅ Phase 2 Web3 Session Keys verified successfully');

    // =========================================================================
    // TEST 3: Phase 3 Multi-Chart Grid (1x1, 1x2, 2x2) & Indicators
    // =========================================================================
    console.log('\n--- Testing Phase 3: Multi-Chart Grid & Order Flow ---');
    
    // Switch to 1x2 split
    await page.click('#layout1x2Btn');
    await page.waitForTimeout(500);
    let gridClass = await page.getAttribute('#multiChartGrid', 'class');
    let p2Display = await page.evaluate(() => document.getElementById('subChartPane2')?.style.display);
    console.log(`Layout 1x2 class: ${gridClass}, Pane 2 display: ${p2Display}`);
    if (!gridClass.includes('grid-1x2') || p2Display === 'none') throw new Error('1x2 layout switch failed');

    // Switch to 2x2 quad
    await page.click('#layout2x2Btn');
    await page.waitForTimeout(500);
    gridClass = await page.getAttribute('#multiChartGrid', 'class');
    let p4Display = await page.evaluate(() => document.getElementById('subChartPane4')?.style.display);
    console.log(`Layout 2x2 class: ${gridClass}, Pane 4 display: ${p4Display}`);
    if (!gridClass.includes('grid-2x2') || p4Display === 'none') throw new Error('2x2 layout switch failed');

    // Switch back to 1x1
    await page.click('#layout1x1Btn');
    await page.waitForTimeout(300);

    // Test Indicator Toggles (Footprint, Profile, Fibo)
    await page.click('#indFootprintBtn');
    await page.waitForTimeout(300);
    await page.click('#indProfileBtn');
    await page.waitForTimeout(300);
    await page.click('#indFiboBtn');
    await page.waitForTimeout(500);

    const footprintActive = await page.evaluate(() => window.chartInstance?.indicators?.footprint);
    const profileActive = await page.evaluate(() => window.chartInstance?.indicators?.profile);
    const fiboActive = await page.evaluate(() => window.chartInstance?.indicators?.fibo);
    console.log(`Indicators: Footprint=${footprintActive}, Profile=${profileActive}, Fibo=${fiboActive}`);
    if (!footprintActive || !profileActive || !fiboActive) throw new Error('Indicator toggles failed');
    console.log('✅ Phase 3 Multi-Chart Grid and Indicators verified successfully');

    // =========================================================================
    // TEST 4: Phase 4 Gemini AI Quantitative Copilot & Live Voice Trading
    // =========================================================================
    console.log('\n--- Testing Phase 4: Gemini Live Voice Trading & OBI Radar ---');
    await page.click('#btnVoiceTrade');
    await page.waitForTimeout(400);

    const voiceHudVisible = await page.isVisible('#voiceTradingHud');
    if (!voiceHudVisible) throw new Error('Voice Trading HUD did not open');

    // Test voice command: Buy 0.5 Bitcoin with 50x leverage
    console.log('Dispatching voice trading command: "Buy 0.5 Bitcoin with 50x leverage"...');
    await page.evaluate(() => window.processVoiceCommand("Buy 0.5 Bitcoin with 50x leverage"));
    await page.waitForTimeout(600);

    const transcriptText = await page.textContent('#voiceTranscriptBubble');
    const geminiResponseText = await page.textContent('#voiceGeminiResponseText');
    const actionPillText = await page.textContent('#voiceActionPillText');
    console.log(`Voice Transcript: ${transcriptText}`);
    console.log(`Gemini Response: ${geminiResponseText}`);
    console.log(`Action Pill: ${actionPillText}`);

    if (!transcriptText.includes('Bitcoin') || !geminiResponseText.includes('Confirmed')) {
      throw new Error('Voice trading order execution failed');
    }

    // Test voice command: Market briefing
    console.log('Dispatching voice briefing request: "Market briefing"...');
    await page.evaluate(() => window.processVoiceCommand("Market briefing"));
    await page.waitForTimeout(500);
    const briefingResponse = await page.textContent('#voiceGeminiResponseText');
    console.log(`Briefing Response: ${briefingResponse}`);
    if (!briefingResponse.includes('briefing')) throw new Error('Voice market briefing failed');

    // Test voice command: Close position
    console.log('Dispatching voice command: "Close position"...');
    await page.evaluate(() => window.processVoiceCommand("Close position"));
    await page.waitForTimeout(500);
    const closeResponse = await page.textContent('#voiceGeminiResponseText');
    console.log(`Close Response: ${closeResponse}`);
    if (!closeResponse.includes('flattened')) throw new Error('Voice position flattening failed');

    // Verify OBI Radar
    const obiBuyPct = await page.textContent('#obiBuyPct');
    const obiSellPct = await page.textContent('#obiSellPct');
    const obiStatus = await page.textContent('#obiStatus');
    console.log(`OBI Radar: ${obiBuyPct} | ${obiSellPct} | ${obiStatus}`);
    if (!obiBuyPct.includes('%') || !obiStatus.includes('OBI:')) throw new Error('OBI Radar data missing');

    console.log('✅ Phase 4 Gemini Voice Trading and OBI Radar verified successfully');

    // =========================================================================
    // TEST 5: Phase 5 1v1 PvP Trading Battles & Season Pass 500 Tiers
    // =========================================================================
    console.log('\n--- Testing Phase 5: 1v1 PvP Trading Battles & Season Pass ---');
    
    // 5.1 PvP Arena
    await page.evaluate(() => window.openPvpArenaModal());
    await page.waitForTimeout(400);
    const pvpModalVisible = await page.isVisible('#modalPvpArena');
    if (!pvpModalVisible) throw new Error('PvP Arena Modal did not open');

    // Start duel
    await page.click('#btnStartPvpDuel');
    await page.waitForTimeout(1500);

    const opponentName = await page.textContent('#pvpOpponentName');
    const countdown = await page.textContent('#pvpCountdownTimer');
    console.log(`PvP Duel Commenced! Opponent: ${opponentName}, Clock: ${countdown}`);
    if (!opponentName || !countdown) throw new Error('PvP duel did not start');

    await page.evaluate(() => window.closePvpArenaModal());
    await page.waitForTimeout(300);

    // 5.2 Season Pass 500 Tiers
    await page.evaluate(() => window.openSeasonPassModal());
    await page.waitForTimeout(400);
    const seasonPassModalVisible = await page.isVisible('#modalSeasonPass');
    if (!seasonPassModalVisible) throw new Error('Season Pass Modal did not open');

    const tierCount = await page.evaluate(() => document.querySelectorAll('#seasonTiersScroll .season-tier-item').length);
    console.log(`Season Pass Milestone Tiers rendered: ${tierCount}`);
    if (tierCount < 5) throw new Error('Season Pass milestone tiers did not render');

    // Claim daily bonus
    const xpBefore = await page.textContent('#spXpText');
    await page.click('#modalSeasonPass .btn-faucet');
    await page.waitForTimeout(400);
    const xpAfter = await page.textContent('#spXpText');
    console.log(`Season Pass XP: ${xpBefore} -> ${xpAfter}`);
    if (xpBefore === xpAfter) throw new Error('Daily XP bonus was not claimed');

    await page.evaluate(() => window.closeSeasonPassModal());
    await page.waitForTimeout(300);
    console.log('✅ Phase 5 PvP Arena and Season Pass verified successfully');

    // =========================================================================
    // VIEWPORT RESPONSIVENESS & SCREENSHOT CAPTURE
    // =========================================================================
    console.log('\n--- Testing Viewport Responsiveness across Desktop, Tablet, and Mobile ---');
    
    // 1. Desktop 1440x900
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(600);
    const overflowDesktop = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    console.log(`Desktop 1440x900 horizontal overflow: ${overflowDesktop ? 'FAIL' : 'PASS (0px)'}`);
    if (overflowDesktop) throw new Error('Desktop horizontal scrollbar overflow detected');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'omni_upgrade_desktop_1440x900.png') });

    // Capture HUD and Modals in Desktop view
    await page.evaluate(() => window.openPvpArenaModal());
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'omni_upgrade_pvp_arena_modal.png') });
    await page.evaluate(() => window.closePvpArenaModal());

    await page.evaluate(() => window.openSeasonPassModal());
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'omni_upgrade_season_pass_modal.png') });
    await page.evaluate(() => window.closeSeasonPassModal());

    await page.evaluate(() => window.toggleSessionKeyModal());
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'omni_upgrade_session_key_modal.png') });
    await page.evaluate(() => window.toggleSessionKeyModal());

    // 2. Tablet 768x1024
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(600);
    const overflowTablet = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    console.log(`Tablet 768x1024 horizontal overflow: ${overflowTablet ? 'FAIL' : 'PASS (0px)'}`);
    if (overflowTablet) throw new Error('Tablet horizontal scrollbar overflow detected');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'omni_upgrade_tablet_768x1024.png') });

    // 3. Mobile 390x844
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(600);
    const overflowMobile = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    console.log(`Mobile 390x844 horizontal overflow: ${overflowMobile ? 'FAIL' : 'PASS (0px)'}`);
    if (overflowMobile) throw new Error('Mobile horizontal scrollbar overflow detected');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'omni_upgrade_mobile_390x844.png') });

    // Console Error Check
    if (consoleErrors.length > 0) {
      console.warn(`Encountered ${consoleErrors.length} console errors during test:`);
      consoleErrors.forEach(e => console.warn(`  - ${e}`));
    } else {
      console.log('✅ Zero Console Errors encountered!');
    }

    console.log('\n🎉 ALL 5 UPGRADE PHASES AND ALL VIEWPORTS PASSED VERIFICATION WITH FLYING COLORS!');
  } catch(err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runTests();
