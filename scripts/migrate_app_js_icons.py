import re

def complete_app_js_migration():
    file_path = '/Users/dcaturfoh/.gemini/antigravity-ide/scratch/omni-futures/app.js'
    with open(file_path, 'r', encoding='utf-8') as f:
        code = f.read()

    # 1. Order action buttons
    code = re.sub(
        r'<button class="order-action-btn edit"[^>]*>.*?</button>',
        '<button class="order-action-btn edit" onclick="openEditOrderModal(\'${o.id}\')" title="Modify Price & Amount"><span class="material-symbols-outlined gemini-symbol" style="font-size:14px;">edit</span></button>',
        code
    )
    code = re.sub(
        r'<button class="order-action-btn cancel"[^>]*>.*?</button>',
        '<button class="order-action-btn cancel" onclick="cancelOrder(\'${o.id}\')" title="Cancel Resting Order"><span class="material-symbols-outlined gemini-symbol" style="font-size:14px;">close</span></button>',
        code
    )

    # 2. Confirm close all
    code = code.replace(
        'if (!confirm(`⚠️ Are you sure you want to close ALL ${count} open positions at current market prices?`)) return;',
        'if (!confirm(`Are you sure you want to close ALL ${count} open positions at current market prices?`)) return;'
    )

    # 3. Position action buttons
    code = re.sub(
        r'\? `<span class="tpsl-status-chip"[^>]*>.*?</span>`',
        r'? `<span class="tpsl-status-chip" onclick="openEditTpSlModal(${p.id})"><span class="material-symbols-outlined gemini-symbol gemini-grad-cyan" style="font-size:13px;">track_changes</span> ${p.tpPrice ? formatNumber(p.tpPrice, 2) : "Set"} / ${p.slPrice ? formatNumber(p.slPrice, 2) : "Set"}</span>`',
        code
    )
    code = re.sub(
        r'<button class="btn-act rev-btn"[^>]*>.*?</button>',
        '<button class="btn-act rev-btn" onclick="reversePosition(${p.id})" title="Instant 1-Click Reverse Position"><span class="material-symbols-outlined gemini-symbol" style="font-size:14px;">published_with_changes</span></button>',
        code
    )
    code = re.sub(
        r'<button class="btn-act tpsl-btn"[^>]*>.*?</button>',
        '<button class="btn-act tpsl-btn" onclick="openEditTpSlModal(${p.id})" title="Edit Take Profit / Stop Loss"><span class="material-symbols-outlined gemini-symbol" style="font-size:14px;">track_changes</span></button>',
        code
    )
    code = re.sub(
        r'<button class="btn-act share-btn"[^>]*>.*?</button>',
        '<button class="btn-act share-btn" onclick="openPnlPoster(\'${p.symbol}\', \'${p.side}\', ${p.size}, ${p.pnl})" title="Generate Viral PnL Card"><span class="material-symbols-outlined gemini-symbol" style="font-size:14px;">share</span></button>',
        code
    )

    # 4. Screener trade buttons
    code = code.replace(
        '<button class="btn-act" onclick="switchMarket(\'${s.symbol}\')">Trade ⚡</button>',
        '<button class="btn-act" onclick="switchMarket(\'${s.symbol}\')">Trade <span class="material-symbols-outlined gemini-symbol gemini-grad-gold" style="font-size:13px;">bolt</span></button>'
    )
    code = code.replace('status: "Running 🟢",', 'status: "Running",')
    code = code.replace('alert(`🤖 ${data.message}`);', 'alert(`${data.message}`);')
    code = code.replace(
        '<strong>🤖 ${b.symbol} Grid</strong>',
        '<strong><span class="material-symbols-outlined gemini-symbol gemini-grad-cyan" style="font-size:15px;">smart_toy</span> ${b.symbol} Grid</strong>'
    )

    # 5. Output / Copilot telemetry
    code = code.replace(
        'outputEl.textContent = `⏳ Interfacing with Google Cloud Vertex AI (Omni 3.8 / Gemini 3.8 Flash)...`;',
        'outputEl.innerHTML = `<span class="material-symbols-outlined gemini-symbol gemini-grad-cyan" style="font-size:14px;">hourglass_top</span> Interfacing with Google Cloud Vertex AI (Omni 3.8 / Gemini 3.8 Flash)...`;'
    )
    code = code.replace(
        'outputEl.textContent = `⚡ [Omni 3.8 / Gemini 3.8 Flash Quant Telemetry]',
        'outputEl.innerHTML = `<span class="material-symbols-outlined gemini-symbol gemini-grad-gold" style="font-size:14px;">bolt</span> [Omni 3.8 / Gemini 3.8 Flash Quant Telemetry]'
    )
    code = code.replace(
        'loadingMsg.textContent = `🤖 [Omni 3.8 Quant Copilot]: Regarding "${text}" for ${currentSymbol}...`;',
        'loadingMsg.innerHTML = `<span class="material-symbols-outlined gemini-symbol gemini-grad-cyan" style="font-size:14px;">smart_toy</span> [Omni 3.8 Quant Copilot]: Regarding "${text}" for ${currentSymbol}...`;'
    )

    # 6. Copy trader avatars
    code = code.replace('{ name: "SatoshiQuant", avatar: "🤖",', '{ name: "SatoshiQuant", avatar: "smart_toy",')
    code = code.replace('{ name: "NexusMacro", avatar: "⚡",', '{ name: "NexusMacro", avatar: "bolt",')
    code = code.replace('{ name: "AlphaWhale", avatar: "🐋",', '{ name: "AlphaWhale", avatar: "tsunami",')
    code = code.replace('{ name: "HyperLiquidPro", avatar: "🌊",', '{ name: "HyperLiquidPro", avatar: "water",')
    code = code.replace(
        '<div class="trader-avatar">${t.avatar}</div>',
        '<div class="trader-avatar"><span class="material-symbols-outlined gemini-symbol gemini-grad-cyan" style="font-size:22px;">${t.avatar}</span></div>'
    )
    code = code.replace(
        'Copy Trader ⚡',
        'Copy Trader <span class="material-symbols-outlined gemini-symbol gemini-grad-gold" style="font-size:13px;">bolt</span>'
    )

    # 7. GCP latency and test button
    code = code.replace(
        '<span class="gcp-latency-txt">⚡ ${api.latency} Latency</span>',
        '<span class="gcp-latency-txt"><span class="material-symbols-outlined gemini-symbol gemini-grad-gold" style="font-size:12px;">bolt</span> ${api.latency} Latency</span>'
    )
    code = code.replace(
        '<button class="btn-test-gcp" onclick="testGcpApi(\'${api.id}\', \'${api.name.replace(/\'/g, "\\\\\'")}\')">⚡ Test API</button>',
        '<button class="btn-test-gcp" onclick="testGcpApi(\'${api.id}\', \'${api.name.replace(/\'/g, "\\\\\'")}\')"><span class="material-symbols-outlined gemini-symbol gemini-grad-cyan" style="font-size:13px;">bolt</span> Test API</button>'
    )

    # 8. SOL asset icon
    code = code.replace('{ symbol: "SOL", name: "Solana", icon: "🟣",', '{ symbol: "SOL", name: "Solana", icon: "flash_on",')

    # 9. Asset action micro buttons
    code = code.replace(
        '<button class="btn-micro" onclick="openDepositModal(\'${it.symbol}\')" style="color:#10b981; border-color:rgba(16,185,129,0.3); margin-right:4px;">📥 Deposit</button>',
        '<button class="btn-micro" onclick="openDepositModal(\'${it.symbol}\')" style="color:#10b981; border-color:rgba(16,185,129,0.3); margin-right:4px;"><span class="material-symbols-outlined gemini-symbol gemini-grad-green" style="font-size:12px;">arrow_downward</span> Deposit</button>'
    )
    code = code.replace(
        '<button class="btn-micro" onclick="openWithdrawModal(\'${it.symbol}\')" style="color:#f87171; border-color:rgba(248,113,113,0.3);">📤 Withdraw</button>',
        '<button class="btn-micro" onclick="openWithdrawModal(\'${it.symbol}\')" style="color:#f87171; border-color:rgba(248,113,113,0.3);"><span class="material-symbols-outlined gemini-symbol gemini-grad-pink" style="font-size:12px;">arrow_upward</span> Withdraw</button>'
    )

    # 10. ChangeNow buttons & modals
    code = code.replace(
        'btn.innerHTML = `<span>⏳ Contacting ChangeNow Protocol...</span>`;',
        'btn.innerHTML = `<span><span class="material-symbols-outlined gemini-symbol gemini-grad-cyan" style="font-size:15px;">hourglass_top</span> Contacting ChangeNow Protocol...</span>`;'
    )
    code = code.replace(
        'document.getElementById("btnConfirmCnowDeposit").textContent = `⚡ Verify & Credit $${formatNumber(activeChangeNowOrder.expectedReceive, 2)} Collateral Now`;',
        'document.getElementById("btnConfirmCnowDeposit").innerHTML = `<span class="material-symbols-outlined gemini-symbol gemini-grad-gold" style="font-size:15px;">bolt</span> Verify & Credit $${formatNumber(activeChangeNowOrder.expectedReceive, 2)} Collateral Now`;'
    )
    code = code.replace(
        'btn.innerHTML = `<span>⏳ Verifying On-Chain Finality...</span>`;',
        'btn.innerHTML = `<span><span class="material-symbols-outlined gemini-symbol gemini-grad-gold" style="font-size:15px;">hourglass_top</span> Verifying On-Chain Finality...</span>`;'
    )
    code = code.replace(
        'message: `🎉 ChangeNow Instant Swap Confirmed! Received $${formatNumber(activeChangeNowOrder.expectedReceive, 2)} USDT collateral.`,',
        'message: `ChangeNow Instant Swap Confirmed! Received $${formatNumber(activeChangeNowOrder.expectedReceive, 2)} USDT collateral.`,',
    )
    code = code.replace(
        'btn.innerHTML = `<span>⚡ Verify & Credit Collateral Now</span>`;',
        'btn.innerHTML = `<span><span class="material-symbols-outlined gemini-symbol gemini-grad-gold" style="font-size:15px;">bolt</span> Verify & Credit Collateral Now</span>`;'
    )

    # 11. Wallet approval in deposit modal
    code = code.replace(
        'btnApprove.innerHTML = `<span>⏳ Requesting Wallet Signature...</span>`;',
        'btnApprove.innerHTML = `<span><span class="material-symbols-outlined gemini-symbol gemini-grad-cyan" style="font-size:15px;">hourglass_top</span> Requesting Wallet Signature...</span>`;'
    )
    code = code.replace(
        'statusMsg.innerHTML = `<span>🦊 Please sign the token approval in your wallet extension...</span>`;',
        'statusMsg.innerHTML = `<span><span class="material-symbols-outlined gemini-symbol gemini-grad-gold" style="font-size:16px;">account_balance_wallet</span> Please sign the token approval in your wallet extension...</span>`;'
    )
    code = code.replace(
        'statusMsg.innerHTML = `<span>✅ Approval Confirmed! Crediting Collateral...</span>`;',
        'statusMsg.innerHTML = `<span><span class="material-symbols-outlined gemini-symbol gemini-grad-green" style="font-size:16px;">check_circle</span> Approval Confirmed! Crediting Collateral...</span>`;'
    )
    code = re.sub(r'alert\(`🎉 Deposit Approved & Confirmed from Wallet!\\n\\n', 'alert(`Deposit Approved & Confirmed from Wallet!\\n\\n', code)
    code = re.sub(r'if \(deltaEl\) deltaEl\.textContent = `\$[^\s]+ ➔ \$[^\s]+`;',
                  'if (deltaEl) deltaEl.innerHTML = `$${formatNumber(freeMargin, 2)} <span class="material-symbols-outlined gemini-symbol" style="font-size:12px;">arrow_forward</span> $${formatNumber(remMargin, 2)}`;',
                  code)
    code = code.replace(
        'btnAuth.innerHTML = `<span>⏳ Authorizing in Wallet...</span>`;',
        'btnAuth.innerHTML = `<span><span class="material-symbols-outlined gemini-symbol gemini-grad-gold" style="font-size:15px;">hourglass_top</span> Authorizing in Wallet...</span>`;'
    )
    code = re.sub(r'alert\(`🎉 Withdrawal Confirmed & Authorized!\\n\\n', 'alert(`Withdrawal Confirmed & Authorized!\\n\\n', code)
    code = re.sub(r'alert\(`[🦊🟣]+\s*Connected', 'alert(`Connected', code)

    # 12. Session key status
    code = code.replace(
        'if (headerLabel) headerLabel.textContent = "⚡ 1-Click Off";',
        'if (headerLabel) headerLabel.innerHTML = `<span class="material-symbols-outlined gemini-symbol gemini-grad-gold" style="font-size:15px;">bolt</span> 1-Click Off`;'
    )
    code = code.replace(
        'if (headerLabel) headerLabel.textContent = "⚡ 1-Click ON";',
        'if (headerLabel) headerLabel.innerHTML = `<span class="material-symbols-outlined gemini-symbol gemini-grad-gold" style="font-size:15px;">bolt</span> 1-Click ON`;'
    )
    code = code.replace(
        'txLink.textContent = `${sessionKeyTxHash.slice(0, 6)}...${sessionKeyTxHash.slice(-4)} ↗`;',
        'txLink.innerHTML = `${sessionKeyTxHash.slice(0, 6)}...${sessionKeyTxHash.slice(-4)} <span class="material-symbols-outlined gemini-symbol" style="font-size:12px;">open_in_new</span>`;'
    )
    code = code.replace(
        'badge.textContent = "⚡ SCALPER";',
        'badge.innerHTML = `<span class="material-symbols-outlined gemini-symbol gemini-grad-gold" style="font-size:13px;">bolt</span> SCALPER`;'
    )
    code = code.replace(
        'badge.textContent = "🛡️ RISK CHIEF";',
        'badge.innerHTML = `<span class="material-symbols-outlined gemini-symbol gemini-grad-cyan" style="font-size:13px;">shield</span> RISK CHIEF`;'
    )
    code = code.replace(
        'badge.textContent = "QUANT 3.8";',
        'badge.innerHTML = `<span class="material-symbols-outlined gemini-symbol gemini-grad-cyan" style="font-size:13px;">analytics</span> QUANT 3.8`;'
    )

    # 13. Voice HUD buttons and action pills
    code = re.sub(r'showVoiceActionPill\("[⚡🔀🛡️📊💥🎙️]+\s*([^"\n]+)"', r'showVoiceActionPill("\1"', code)
    code = re.sub(r'showVoiceActionPill\(`[⚡🔀🛡️📊💥🎙️]+\s*([^`\n]+)`', r'showVoiceActionPill(`\1`', code)
    code = code.replace(
        'if (btnText) btnText.textContent = "🎙️ Voice Active";',
        'if (btnText) btnText.innerHTML = `<span class="material-symbols-outlined gemini-symbol gemini-grad-rainbow" style="font-size:16px;">mic</span> Voice Active`;'
    )
    code = code.replace(
        'if (btnText) btnText.textContent = "🎙️ Voice Trade";',
        'if (btnText) btnText.innerHTML = `<span class="material-symbols-outlined gemini-symbol gemini-grad-rainbow" style="font-size:16px;">mic</span> Voice Trade`;'
    )
    code = code.replace(
        'if (status) status.textContent = "🟢 STANDBY · HOLD SPACE / V TO SQUAWK";',
        'if (status) status.innerHTML = `<span class="material-symbols-outlined gemini-symbol gemini-grad-green" style="font-size:13px;">radio_button_checked</span> STANDBY · HOLD SPACE / V TO SQUAWK`;'
    )
    code = re.sub(r'actionSummary\s*=\s*"[⚡🛡️🎭✨🎙️⚠️]+\s*([^"\n]+)"', r'actionSummary = "\1"', code)
    code = re.sub(r'actionSummary\s*=\s*`[⚡🛡️🎭✨🎙️⚠️]+\s*([^`\n]+)`', r'actionSummary = `\1`', code)
    code = code.replace(
        'if (actionPillText) actionPillText.textContent = `🎙️ Quantitative Briefing Delivered`;',
        'if (actionPillText) actionPillText.innerHTML = `<span class="material-symbols-outlined gemini-symbol gemini-grad-rainbow" style="font-size:14px;">mic</span> Quantitative Briefing Delivered`;'
    )
    code = code.replace(
        '<button onclick="replayVoiceLog(${idx})" style="background:none; border:none; color:#10b981; cursor:pointer; font-size:10px; font-weight:700;">▶ REPLAY</button>',
        '<button onclick="replayVoiceLog(${idx})" style="background:none; border:none; color:#10b981; cursor:pointer; font-size:10px; font-weight:700; display:inline-flex; align-items:center; gap:2px;"><span class="material-symbols-outlined gemini-symbol" style="font-size:13px;">play_arrow</span> REPLAY</button>'
    )
    code = re.sub(
        r'if \(resultTitle\) resultTitle\.textContent = `🏆 VICTORY! YOU WON \$[^\s]+ USDT`;',
        'if (resultTitle) resultTitle.innerHTML = `<span class="material-symbols-outlined gemini-symbol gemini-grad-gold" style="font-size:20px;">military_tech</span> VICTORY! YOU WON $${prize.toLocaleString()} USDT`;',
        code
    )

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(code)

    print("complete_app_js_migration executed successfully.")

if __name__ == '__main__':
    complete_app_js_migration()
