#!/usr/bin/env python3
"""
fetch_crypto_price.py — 由 Cron 每 10 分鐘執行
抓取 TAO、FET 價格，寫入 price.json
API key 只在這裡，不在 GitHub Pages 前端
"""
import json
import os
import sys
import urllib.request
import urllib.error
from datetime import datetime

CG_KEY = "CG-w7Q4MQpgk8CzaP6K6FpbU9bH"
CG_BASE = "https://api.coingecko.com/api/v3"
OUTPUT_DIR = "/tmp/oren_github/docs/knowledges/data"
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "price.json")

COINS = [
    {"id": "bittensor", "symbol": "TAO", "tv": "COINBASE:TAOUSD"},
    {"id": "fetch-ai", "symbol": "FET", "tv": "COINBASE:FINFETUSD"},
]

def fetch_price(coin_id: str) -> dict:
    url = f"{CG_BASE}/coins/markets?vs_currency=usd&ids={coin_id}&price_change_percentage=24h&x_cg_demo_api_key={CG_KEY}"
    try:
        with urllib.request.urlopen(url, timeout=10) as resp:
            data = json.loads(resp.read())
            if not data:
                return None
            c = data[0]
            return {
                "id": c["id"],
                "symbol": c["symbol"].upper(),
                "name": c["name"],
                "price": c.get("current_price"),
                "change_24h": c.get("price_change_percentage_24h"),
                "market_cap": c.get("market_cap"),
                "volume_24h": c.get("total_volume"),
                "updated_at": datetime.now().isoformat(),
            }
    except Exception as e:
        print(f"[fetch_crypto_price] 錯誤：{coin_id} — {e}", file=sys.stderr)
        return None

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    results = []
    for coin in COINS:
        data = fetch_price(coin["id"])
        if data:
            results.append(data)
            print(f"[fetch_crypto_price] {data['symbol']}: ${data['price']} ({data['change_24h']:+.2f}%)")

    if not results:
        print("[fetch_crypto_price] 沒有抓到任何資料，保留舊檔案")
        sys.exit(1)

    output = {
        "updated_at": datetime.now().isoformat(),
        "coins": results
    }

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"[fetch_crypto_price] 寫入：{OUTPUT_FILE}")
    return output

if __name__ == "__main__":
    main()
