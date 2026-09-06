import urllib.request
import json
import ssl
import os

CTX = ssl.create_default_context()
CTX.check_hostname = False
CTX.verify_mode = ssl.CERT_NONE

def format_volume(vol_val):
    if vol_val >= 1_000_000_000:
        return f"${vol_val / 1_000_000_000:.2f}B"
    elif vol_val >= 1_000_000:
        return f"${vol_val / 1_000_000:.2f}M"
    elif vol_val >= 1_000:
        return f"${vol_val / 1_000:.2f}K"
    return f"${vol_val:.2f}"

def get_precision(price):
    if price <= 0:
        return 4
    if price < 0.00001:
        return 8
    elif price < 0.001:
        return 6
    elif price < 1.0:
        return 4
    elif price < 100.0:
        return 3
    else:
        return 2

KNOWN_NAMES = {
    "STONKSBSC": ("STONKS (BSC) Token", "meme"),
    "TMO": ("Thermo Fisher Scientific", "stocks"),
    "VZ": ("Verizon Communications", "stocks"),
    "TMUS": ("T-Mobile US", "stocks"),
    "UNP": ("Union Pacific Corp", "stocks"),
    "NOC": ("Northrop Grumman Corp", "stocks"),
    "TTMI": ("TTM Technologies", "stocks"),
    "PWR": ("Quanta Services", "stocks"),
    "TT": ("Trane Technologies", "stocks"),
    "RMBS": ("Rambus Inc", "stocks"),
    "UMC": ("United Microelectronics ADR", "stocks"),
    "PBR": ("Petrobras ADR", "stocks"),
    "SYM": ("Symbotic Inc", "stocks"),
    "SOUN": ("SoundHound AI", "stocks"),
    "UNG": ("United States Natural Gas Fund", "etfs"),
    "PSQ": ("ProShares Short QQQ ETF", "etfs"),
    "PPLT": ("abrdn Physical Platinum Shares", "etfs"),
    "TIP": ("iShares TIPS Bond ETF", "bonds"),
    "USFR": ("WisdomTree Floating Rate Treasury", "bonds"),
    "SGOV": ("iShares 0-3 Month Treasury Bond ETF", "bonds"),
    "NOLAN": ("Nolan Meme Token", "meme")
}

def classify_token(base, price):
    u_base = base.upper()
    if u_base in KNOWN_NAMES:
        return KNOWN_NAMES[u_base][1]
    meme_keywords = ['DOGE', 'SHIB', 'PEPE', 'FLOKI', 'BONK', 'WIF', 'MEOW', 'CAT', 'PUP', 'MEME', 'BABY', 'ELON', 'MOON', 'INU', 'APE', 'TIGER', 'FROG', 'TROLL', 'BIBI', 'MARS', 'BORT', 'MORTY', 'QENIS', 'TESTICLE', 'SHRUB', 'STONKS', 'NOLAN']
    if any(k in u_base for k in meme_keywords) or price < 0.001:
        return "meme"
    if any(k in u_base for k in ['AI', 'GPT', 'TAO', 'RENDER', 'AGIX', 'FET', 'NEAR', 'OCEAN']):
        return "ai"
    if any(k in u_base for k in ['SOL', 'ETH', 'BTC', 'AVAX', 'SUI', 'APT', 'DOT', 'ADA', 'ATOM', 'FTM', 'SEI', 'INJ', 'TON']):
        return "layer1"
    if any(k in u_base for k in ['UNI', 'AAVE', 'MKR', 'CRV', 'SUSHI', 'COMP', 'SNX', 'DYDX', 'GMX', 'PENDLE']):
        return "defi"
    return "crypto"

def ingest_weex_tokens():
    catalog_path = "markets_catalog.json"
    with open(catalog_path, "r") as f:
        catalog = json.load(f)

    print(f"Current catalog initial size: {len(catalog)} instruments")

    req = urllib.request.Request(
        "https://api-spot.weex.com/api/v2/market/tickers",
        headers={"User-Agent": "Mozilla/5.0"}
    )
    with urllib.request.urlopen(req, context=CTX, timeout=12) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        tickers = data.get("data", [])

    print(f"Fetched {len(tickers)} tickers from WEEX Spot API")

    added_count = 0
    updated_count = 0

    for t in tickers:
        raw_sym = t.get("symbol", "")
        if not raw_sym.endswith("USDT_SPBL"):
            continue

        base = raw_sym[:-9] # Remove 'USDT_SPBL'
        std_sym = f"{base}-USDT"

        try:
            price = float(t.get("lastPrice") or 0.0)
            if price <= 0:
                if base.upper() in KNOWN_NAMES and base.upper() == "NOLAN":
                    price = 0.00005
                else:
                    continue
            vol_val = float(t.get("value") or 0.0)
            change = float(t.get("priceChangePercent") or 0.0) * 100
            high = float(t.get("high") or price)
            low = float(t.get("low") or price)
        except Exception:
            continue

        prec = get_precision(price)
        cat = classify_token(base, price)
        name = KNOWN_NAMES.get(base.upper(), (f"{base} Spot (WEEX)", cat))[0]

        # If already exists in catalog, update price & 24h stats if it's already a WEEX spot item or not a contract
        if std_sym in catalog:
            existing = catalog[std_sym]
            if existing.get("isWeexSpot") or not existing.get("isWeex"):
                existing["price"] = price
                existing["change24h"] = round(change, 2)
                existing["high24h"] = high
                existing["low24h"] = low
                existing["vol24h"] = format_volume(vol_val)
                existing["precision"] = prec
                existing["weexSpotSymbol"] = raw_sym
                updated_count += 1
            continue

        # Check if the base exists with 1000 multiplier alias or raw contract
        if f"1000{base}-USDT" in catalog or f"{base}USDT" in catalog:
            # We already have a futures contract for this base!
            continue

        # Add new spot instrument to catalog!
        catalog[std_sym] = {
            "symbol": std_sym,
            "weexSymbol": raw_sym,
            "weexSpotSymbol": raw_sym,
            "name": name,
            "category": cat,
            "price": price,
            "change24h": round(change, 2),
            "vol24h": format_volume(vol_val),
            "high24h": high,
            "low24h": low,
            "markPrice": price,
            "indexPrice": price,
            "openInterest": format_volume(vol_val * 0.15),
            "fundingRate": "0.005% in 04:00:00",
            "maxLeverage": 20 if cat == "meme" else 50,
            "precision": prec,
            "isWeex": True,
            "isWeexSpot": True,
            "exchangeSource": "WEEX Spot V2 Live API"
        }
        added_count += 1

    print(f"Successfully added {added_count} new WEEX tokens to catalog.")
    print(f"Updated {updated_count} existing entries.")
    print(f"Total catalog size now: {len(catalog)} instruments")

    with open(catalog_path, "w") as f:
        json.dump(catalog, f, indent=2)

    print("Saved updated markets_catalog.json successfully.")

if __name__ == "__main__":
    ingest_weex_tokens()
