import re

def clean_server_and_app():
    # 1. Update server.py
    server_path = '/Users/dcaturfoh/.gemini/antigravity-ide/scratch/omni-futures/server.py'
    with open(server_path, 'r', encoding='utf-8') as f:
        s = f.read()

    # Tokens
    s = s.replace('"icon": "💵"', '"icon": "payments"')
    s = s.replace('"icon": "🔵"', '"icon": "monetization_on"')
    s = s.replace('"icon": "🔷"', '"icon": "token"')
    s = s.replace('"icon": "🟣"', '"icon": "flash_on"')
    s = s.replace('"icon": "₿"', '"icon": "currency_bitcoin"')
    s = s.replace('"icon": "🐸"', '"icon": "mood"')
    s = s.replace('"icon": "🌌"', '"icon": "all_inclusive"')

    # Leaderboard avatars
    s = s.replace('"avatar": "🤖"', '"avatar": "smart_toy"')
    s = s.replace('"avatar": "🐋"', '"avatar": "tsunami"')
    s = s.replace('"avatar": "🐸"', '"avatar": "mood"')
    s = s.replace('"avatar": "⚡"', '"avatar": "bolt"')

    # Messages & comments
    s = s.replace('# ⚡ 100% REAL LIVE', '# 100% REAL LIVE')
    s = s.replace('"message": f"⚡ ', '"message": f"')
    s = s.replace('# 💎 SPOT TRADING', '# SPOT TRADING')
    s = s.replace('"message": f"💎 ', '"message": f"')
    s = s.replace('# ⚡ PERPETUAL FUTURES', '# PERPETUAL FUTURES')
    s = s.replace('"message": "💧 Dropped', '"message": "Dropped')
    s = s.replace('"message": f"🤖 ', '"message": f"')
    s = s.replace('"message": f"🎉 ', '"message": f"')
    s = s.replace('print(f"🚀 Starting', 'print(f"Starting')

    with open(server_path, 'w', encoding='utf-8') as f:
        f.write(s)
    print("server.py cleaned.")

    # 2. Update app.js ext-token-icon
    app_path = '/Users/dcaturfoh/.gemini/antigravity-ide/scratch/omni-futures/app.js'
    with open(app_path, 'r', encoding='utf-8') as f:
        a = f.read()

    a = a.replace(
        '<span class="ext-token-icon">${t.icon}</span>',
        '<span class="ext-token-icon"><span class="material-symbols-outlined gemini-symbol gemini-grad-gold" style="font-size:20px;">${t.icon}</span></span>'
    )

    with open(app_path, 'w', encoding='utf-8') as f:
        f.write(a)
    print("app.js ext-token-icon cleaned.")

if __name__ == '__main__':
    clean_server_and_app()
