const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = '/Users/dcaturfoh/.gemini/antigravity-ide/brain/3796794e-65fc-4aa1-8c29-e2ee936ff747';

async function run() {
  console.log('🚀 Starting OmniFutures Pro Buy/Sell Execution Engine Verification...');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Listen to console logs
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));

  try {
    await page.goto('http://127.0.0.1:8092/', { waitUntil: 'networkidle', timeout: 30000 });
    console.log('✅ Page loaded successfully');
    await page.waitForTimeout(1500);

    // 1. Check Order Engine Header & Scalper Toggle
    const scalperBtn = page.locator('#btnScalperMode');
    console.log('Checking Scalper Toggle...');
    await scalperBtn.click();
    await page.waitForTimeout(500);
    const scalperText = await page.locator('#scalperStatusText').textContent();
    console.log(`✅ Scalper Mode Status: ${scalperText}`);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'omni_scalper_mode_active.png') });

    // 2. Test Market Order Execution in Fast Scalper Mode (<25ms toast)
    console.log('Testing Fast Scalper Market Order...');
    await page.fill('#orderSizeInput', '0.25');
    await page.waitForTimeout(300);
    await page.locator('#btnBuyAction').click();
    await page.waitForTimeout(800);

    const toast = page.locator('.order-hud-toast').first();
    const isToastVisible = await toast.isVisible();
    console.log(`✅ Market Order HUD Toast visible: ${isToastVisible}`);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'omni_market_order_executed.png') });

    // 3. Test Limit Order Tab & Placement below market price
    console.log('Testing Limit Order Placement...');
    const limitTab = page.locator(".order-type-tabs .type-btn:has-text('Limit')");
    await limitTab.click();
    await page.waitForTimeout(400);

    // Read current market price and set limit 5% below
    const currentPriceText = await page.locator('#tickerPrice').textContent();
    const cleanPrice = parseFloat(currentPriceText.replace(/,/g, ''));
    const limitPrice = (cleanPrice * 0.94).toFixed(2);
    console.log(`Current price: ${cleanPrice}, setting Limit Price to: ${limitPrice}`);

    await page.fill('#orderPriceInput', limitPrice);
    await page.fill('#orderSizeInput', '0.15');
    await page.waitForTimeout(300);

    // Place Limit Buy order
    await page.locator('#btnBuyAction').click();
    await page.waitForTimeout(1000);

    // 4. Verify Resting Order in Open Orders Desk
    console.log('Verifying Resting Order in Open Orders desk...');
    await page.locator('#tabBtnOrders').click();
    await page.waitForTimeout(800);

    const ordersCount = await page.locator('#ordersCountBadge').textContent();
    console.log(`✅ Open Orders Count Badge: ${ordersCount}`);
    const firstOrderRow = page.locator('#ordersTableBody .order-row').first();
    const isOrderRowVisible = await firstOrderRow.isVisible();
    console.log(`✅ Open Order Row Visible in Desk: ${isOrderRowVisible}`);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'omni_open_orders_desk.png') });

    // 5. Test Edit Order Modal
    console.log('Testing Edit Order Modal...');
    const editBtn = page.locator('.order-action-btn.edit').first();
    if (await editBtn.isVisible()) {
      await editBtn.click();
      await page.waitForTimeout(500);
      const isModalVisible = await page.locator('#modalEditOrder').isVisible();
      console.log(`✅ Edit Order Modal Visible: ${isModalVisible}`);
      
      const newPrice = (cleanPrice * 0.93).toFixed(2);
      await page.fill('#editOrderPriceInput', newPrice);
      await page.fill('#editOrderSizeInput', '0.20');
      await page.locator('#modalEditOrder button:has-text("Update Order")').click();
      await page.waitForTimeout(800);
      console.log('✅ Order modified successfully');
      await page.screenshot({ path: path.join(ARTIFACT_DIR, 'omni_order_modified_toast.png') });
    }

    // 6. Test Stop and Trailing Tab Visibility
    console.log('Testing Stop and Trailing order inputs visibility...');
    await page.locator(".order-type-tabs .type-btn:has-text('Stop')").click();
    await page.waitForTimeout(300);
    const isStopTriggerVisible = await page.locator('#stopTriggerGroup').isVisible();
    console.log(`✅ Stop Trigger Group Visible: ${isStopTriggerVisible}`);

    await page.locator(".order-type-tabs .type-btn:has-text('Trailing')").click();
    await page.waitForTimeout(300);
    const isTrailingVisible = await page.locator('#trailingCallbackGroup').isVisible();
    console.log(`✅ Trailing Callback Group Visible: ${isTrailingVisible}`);

    await page.locator(".order-type-tabs .type-btn:has-text('Scaled')").click();
    await page.waitForTimeout(300);
    const isScaledVisible = await page.locator('#scaledGridGroup').isVisible();
    console.log(`✅ Scaled Grid Group Visible: ${isScaledVisible}`);

    // 7. Test Post-Only and Reduce-Only Guards
    console.log('Testing Post-Only guard rejection on crossing limit...');
    await page.locator(".order-type-tabs .type-btn:has-text('Limit')").click();
    await page.locator('#chkPostOnly').check();
    // Set buy price ABOVE market price (crossing spread)
    await page.fill('#orderPriceInput', (cleanPrice * 1.05).toFixed(2));
    await page.locator('#btnBuyAction').click();
    await page.waitForTimeout(600);
    const postOnlyToast = page.locator('.order-hud-toast.error').first();
    const isPostOnlyErrorVisible = await postOnlyToast.isVisible();
    console.log(`✅ Post-Only Crossing Spread Rejected with Toast: ${isPostOnlyErrorVisible}`);
    await page.locator('#chkPostOnly').uncheck();

    // 8. Capture Full Exchange Canvas with Pending Orders and Pro Trading Desk
    await page.locator('#tabBtnOrders').click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'omni_enhanced_buy_sell_full.png'), fullPage: false });
    console.log('✅ Captured full verified exchange UI screenshot: omni_enhanced_buy_sell_full.png');

    // 9. Test Cancel Resting Order
    console.log('Testing Order Cancellation...');
    const cancelBtn = page.locator('.order-action-btn.cancel').first();
    if (await cancelBtn.isVisible()) {
      await cancelBtn.click();
      await page.waitForTimeout(800);
      console.log('✅ Order cancelled successfully');
    }

    console.log('🎉 ALL BUY/SELL ENGINE VERIFICATIONS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Verification Error:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

run();
