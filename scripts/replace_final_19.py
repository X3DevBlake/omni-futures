import re

def main():
    file_path = '/Users/dcaturfoh/.gemini/antigravity-ide/scratch/omni-futures/app.js'
    with open(file_path, 'r', encoding='utf-8') as f:
        c = f.read()

    repls = [
        ('if (!confirm(`⚠️ Are you sure you want to close ALL ${count} open positions at current market prices?`)) {',
         'if (!confirm(`Are you sure you want to close ALL ${count} open positions at current market prices?`)) {'),
        ('outputEl.textContent = `⏳ Interfacing with Google Cloud Vertex AI (Omni 3.8 / Gemini 3.8 Flash) for ${currentSymbol} real-time quantitative audit...`;',
         'outputEl.innerHTML = `<span class="material-symbols-outlined gemini-symbol gemini-grad-cyan" style="font-size:14px;">hourglass_top</span> Interfacing with Google Cloud Vertex AI (Omni 3.8 / Gemini 3.8 Flash) for ${currentSymbol} real-time quantitative audit...`;'),
        ('loadingMsg.textContent = `🤖 [Omni 3.8 Quant Copilot]: Regarding "${text}" for ${currentSymbol} — Orderbook skew indicates positive bid density. Momentum indicators suggest favorable risk-to-reward ratio on pullbacks. Always practice strict position sizing and maintain margin ratio below 60%.`;',
         'loadingMsg.innerHTML = `<span class="material-symbols-outlined gemini-symbol gemini-grad-cyan" style="font-size:14px;">smart_toy</span> [Omni 3.8 Quant Copilot]: Regarding "${text}" for ${currentSymbol} — Orderbook skew indicates positive bid density. Momentum indicators suggest favorable risk-to-reward ratio on pullbacks. Always practice strict position sizing and maintain margin ratio below 60%.`;'),
        ('Test Service ⚡', 'Test Service <span class="material-symbols-outlined gemini-symbol gemini-grad-cyan" style="font-size:13px;">bolt</span>'),
        ('>📥 Deposit</button>', '><span class="material-symbols-outlined gemini-symbol gemini-grad-green" style="font-size:13px;">arrow_downward</span> Deposit</button>'),
        ('>📤 Withdraw</button>', '><span class="material-symbols-outlined gemini-symbol gemini-grad-pink" style="font-size:13px;">arrow_upward</span> Withdraw</button>'),
        ('document.getElementById("btnConfirmCnowDeposit").textContent = `⚡ Verify & Credit $${formatNumber(data.expectedPayout, 2)} USDT Collateral Now`;',
         'document.getElementById("btnConfirmCnowDeposit").innerHTML = `<span class="material-symbols-outlined gemini-symbol gemini-grad-gold" style="font-size:14px;">bolt</span> Verify & Credit $${formatNumber(data.expectedPayout, 2)} USDT Collateral Now`;'),
        ('message: `🎉 ChangeNow Instant Swap Confirmed! Received $${formatNumber(activeChangeNowOrder.expectedPayout, 2)} USDT from ${activeChangeNowOrder.fromCurrency} into Futures Collateral!`,',
         'message: `ChangeNow Instant Swap Confirmed! Received $${formatNumber(activeChangeNowOrder.expectedPayout, 2)} USDT from ${activeChangeNowOrder.fromCurrency} into Futures Collateral!`, '),
        ('if (deltaEl) deltaEl.textContent = `$${formatNumber(freeMargin, 2)} ➔ $${formatNumber(remainingFree, 2)}`;',
         'if (deltaEl) deltaEl.innerHTML = `$${formatNumber(freeMargin, 2)} <span class="material-symbols-outlined gemini-symbol" style="font-size:12px;">arrow_forward</span> $${formatNumber(remainingFree, 2)}`;'),
        ('showOrderToast("info", `📊 Grid Layout: ${layout}`',
         'showOrderToast("info", `Grid Layout: ${layout}`'),
        ('if (btn) btn.textContent = `${currentLeverage}x Leverage ⚡`;',
         'if (btn) btn.innerHTML = `${currentLeverage}x Leverage <span class="material-symbols-outlined gemini-symbol gemini-grad-gold" style="font-size:15px;">bolt</span>`;'),
        ('const title = voicePersona === "SCALPER" ? "⚡ Degen Scalper Persona Active" : voicePersona === "RISK" ? "🛡️ Risk Chief Persona Active" : "QUANT 3.8 Quantitative Mode Active";',
         'const title = voicePersona === "SCALPER" ? "Degen Scalper Persona Active" : voicePersona === "RISK" ? "Risk Chief Persona Active" : "QUANT 3.8 Quantitative Mode Active";'),
        ('showOrderToast("info", "🎙️ Gemini Live Voice Desk Active"',
         'showOrderToast("info", "Gemini Live Voice Desk Active"'),
        ('actionSummary = "Switched Persona: ⚡ SCALPER";',
         'actionSummary = "Switched Persona: SCALPER";'),
        ('actionSummary = "Switched Persona: 🛡️ RISK CHIEF";',
         'actionSummary = "Switched Persona: RISK CHIEF";'),
        ("actionSummary = `Flipped ${oldSide} ➔ ${newSide} (${size} ${existing.symbol.split('-')[0]})`;",
         "actionSummary = `Flipped ${oldSide} to ${newSide} (${size} ${existing.symbol.split('-')[0]})`;"),
        ('showOrderToast("info", "📊 Order Flow Squawk Alert"',
         'showOrderToast("info", "Order Flow Squawk Alert"'),
        ('>▶️ Replay</button>',
         '><span class="material-symbols-outlined gemini-symbol" style="font-size:12px;">play_arrow</span> Replay</button>'),
        ('showOrderToast("success", "🎁 Daily XP Bonus Claimed!"',
         'showOrderToast("success", "Daily XP Bonus Claimed!"')
    ]

    count = 0
    for target, replacement in repls:
        if target in c:
            c = c.replace(target, replacement)
            count += 1
        else:
            print("Target not found:", target[:40])

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(c)

    print(f"Done replacing {count}/{len(repls)} items.")

if __name__ == '__main__':
    main()
