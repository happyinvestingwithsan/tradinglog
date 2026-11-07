import json
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor

try:
    import yfinance as yf
except ImportError:
    print(json.dumps({"error": "yfinance not installed", "items": []}))
    sys.exit(1)

# All 80 symbols from F40 and E40
F40 = [
    'BAJAJ-AUTO', 'MARUTI', 'AXISBANK', 'HDFCBANK', 'ICICIBANK', 'KOTAKBANK', 'SBIN', 'LT',
    'RELIANCE', 'TITAN', 'HINDUNILVR', 'ITC', 'NESTLEIND', 'PIDILITIND', 'HCLTECH', 'INFY',
    'TCS', 'BAJAJFINSV', 'BAJAJHLDNG', 'BAJFINANCE', 'HDFCAMC', 'HDFCLIFE', 'ASIANPAINT',
    'HAVELLS', 'PAGEIND', 'VOLTAS', 'COLPAL', 'DABUR', 'MARICO', 'PGHH', 'ICICIGI',
    'NAM-INDIA', 'ICICIPRULI', 'BERGEPAINT', 'ABBOTINDIA', 'GLAXO', 'BATAINDIA', 'GILLETTE',
    'PFIZER', 'SANOFI'
]

E40 = [
    'EICHERMOT', 'HYUNDAI', 'M&M', 'VBL', 'ULTRACEMCO', 'DMART', 'GODREJCP', 'BSE',
    'JIOFIN', 'ADANIPORTS', 'CIPLA', 'BOSCHLTD', 'MRF', 'UNITDSPR', 'RADICO', 'UBL',
    'BLUESTARCO', 'DIXON', 'BAJAJHFL', 'MCX', 'APOLLOHOSP', 'FORTIS', 'INDHOTEL',
    'ITCHOTELS', 'JSWINFRA', 'ACC', 'AWL', 'HONAUT', 'KAJARIACER', 'RELAXO', 'CDSL',
    'ANGELONE', 'CAMS', 'MEDANTA', 'QUESS', 'TEAMLEASE', 'ASTRAZEN', 'ERIS', 'LALPATHLAB',
    'TMPV'
]

ALL_SYMBOLS = F40 + E40

def fetch_single(sym):
    yf_sym = f"{sym}.NS"
    try:
        t = yf.Ticker(yf_sym)
        fi = t.fast_info
        cur = fi.last_price
        high = fi.year_high
        low = fi.year_low
        prev = fi.previous_close

        if cur and high and prev and high > 0:
            drop_pct = round((high - cur) / high * 100, 2)
            day_pct = round((cur - prev) / prev * 100, 2)
            return {
                "symbol": sym,
                "price": round(cur, 2),
                "high52": round(high, 2),
                "low52": round(low, 2) if low else round(cur, 2),
                "prevClose": round(prev, 2),
                "dropPct": drop_pct,
                "dayPct": day_pct,
                "timestamp": int(time.time())
            }
    except Exception:
        pass
    return None

def main():
    t0 = time.time()
    results = {}
    with ThreadPoolExecutor(max_workers=16) as ex:
        items = list(filter(None, ex.map(fetch_single, ALL_SYMBOLS)))
        for item in items:
            results[item["symbol"]] = item

    payload = {
        "timestamp": int(time.time()),
        "duration": round(time.time() - t0, 2),
        "total": len(results),
        "items": results
    }

    # Save to local cache file
    cache_path = os.path.join(os.path.dirname(__file__), "..", "lib", "scan_cache.json")
    try:
        with open(cache_path, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2)
    except Exception:
        pass

    # Print output
    print(json.dumps(payload))

if __name__ == "__main__":
    main()
