import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

with open('markets_catalog.json', 'r') as f:
    catalog = json.load(f)

existing_symbols = set(catalog.keys())
print(f'Current catalog has {len(existing_symbols)} symbols')

# Check WEEX Contract Tickers
req_contract = urllib.request.Request('https://api-contract.weex.com/capi/v3/market/ticker/24hr', headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req_contract, context=ctx, timeout=10) as resp:
    contracts = json.loads(resp.read().decode())

print(f'WEEX Futures contracts count: {len(contracts)}')

missing_contracts = []
for c in contracts:
    sym = c.get('symbol')
    # Standard formats: BTC-USDT or BTCUSDT
    if sym.endswith('USDT'):
        base = sym[:-4]
        std = f'{base}-USDT'
    else:
        std = sym
    
    if std not in existing_symbols and sym not in existing_symbols:
        missing_contracts.append(c)

print(f'Missing WEEX Futures contracts: {len(missing_contracts)}')

# Check WEEX Spot Tickers
req_spot = urllib.request.Request('https://api-spot.weex.com/api/v2/market/tickers', headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req_spot, context=ctx, timeout=10) as resp:
    spot_data = json.loads(resp.read().decode())
    spot_tickers = spot_data.get('data', [])

print(f'WEEX Spot tickers count: {len(spot_tickers)}')

spot_usdt = []
for t in spot_tickers:
    sym = t.get('symbol', '')
    if sym.endswith('USDT_SPBL'):
        base = sym[:-9]
        try:
            price = float(t.get('lastPrice') or 0)
            vol = float(t.get('value') or 0)
            change = float(t.get('priceChangePercent') or 0) * 100
        except Exception:
            price = 0.0
            vol = 0.0
            change = 0.0
        spot_usdt.append({
            'raw_symbol': sym,
            'base': base,
            'standard_symbol': f'{base}-USDT',
            'price': price,
            'vol24h': vol,
            'change24h': change
        })

print(f'Total USDT spot pairs on WEEX: {len(spot_usdt)}')

missing_spot = []
for s in spot_usdt:
    std = s['standard_symbol']
    raw = s['raw_symbol']
    base = s['base']
    if std not in existing_symbols and f'{base}USDT' not in existing_symbols and f'1000{base}-USDT' not in existing_symbols:
        missing_spot.append(s)

print(f'Missing tokens from WEEX Spot (not in catalog yet): {len(missing_spot)}')
missing_spot.sort(key=lambda x: x['vol24h'], reverse=True)

print('\n--- Top 30 Missing WEEX Tokens by 24h Volume ---')
for m in missing_spot[:30]:
    print(f"{m['standard_symbol']} (raw: {m['raw_symbol']}) | Price: ${m['price']:.6f} | Vol24h: ${m['vol24h']:,.0f} | 24h: {m['change24h']:+.2f}%")
