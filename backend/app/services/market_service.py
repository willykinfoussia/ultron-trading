"""Market service — batch data, indices, movers, sectors."""
import logging
import math
from typing import Optional
from datetime import datetime

logger = logging.getLogger("ultron-trading.market")

# ── Universe of stocks for movers calculation ──────────────────────────
# S&P 500 top by market cap + popular tech + ETFs
UNIVERSE: list[str] = [
    # Mega cap tech
    "AAPL", "MSFT", "GOOGL", "GOOG", "AMZN", "NVDA", "META", "TSLA",
    # Finance
    "JPM", "BAC", "GS", "MS", "WFC", "C", "BLK", "SCHW", "AXP", "V", "MA",
    # Healthcare
    "JNJ", "PFE", "MRK", "ABT", "TMO", "DHR", "LLY", "BMY", "GILD",
    # Consumer
    "WMT", "PG", "KO", "PEP", "COST", "MCD", "NKE", "SBUX", "TGT", "DIS",
    # Industrial / Energy
    "XOM", "CVX", "BA", "CAT", "GE", "HON", "UPS", "RTX",
    # Tech mid-cap
    "AMD", "INTC", "CRM", "ADBE", "PYPL", "UBER", "SHOP", "SQ", "SNOW", "PLTR",
    "NET", "DDOG", "ZM", "ROKU", "TWLO", "OKTA", "FSLY", "HUBS",
    # Telecom / Media
    "VZ", "T", "CMCSA", "NFLX", "SPOT", "RIVN", "LCID",
    # ETFs
    "SPY", "QQQ", "IWM", "DIA", "VTI", "VOO", "ARKK", "XLF", "XLE", "XLK",
    # Crypto-adjacent
    "COIN", "MARA", "RIOT",
    # Other notable
    "RIVN", "NIO", "LI", "XPEV", "BB", "SOFI", "HOOD", "RBLX", "U", "DKNG",
]

# Major indices symbols (yfinance tickers)
INDEX_MAP: dict[str, str] = {
    "S&P 500": "^GSPC",
    "Dow Jones": "^DJI",
    "NASDAQ": "^IXIC",
    "Russell 2000": "^RUT",
    "VIX": "^VIX",
    "S&P/TSX": "^GSPTSE",
    "FTSE 100": "^FTSE",
    "DAX": "^GDAXI",
    "Nikkei 225": "^N225",
    "Hang Seng": "^HSI",
}

# Sector ETF mapping for sector performance
SECTOR_ETFS: dict[str, str] = {
    "Technology": "XLK",
    "Health Care": "XLV",
    "Financials": "XLF",
    "Consumer Disc.": "XLY",
    "Industrials": "XLI",
    "Energy": "XLE",
    "Consumer Staples": "XLP",
    "Utilities": "XLU",
    "Real Estate": "XLRE",
    "Materials": "XLB",
    "Comm. Services": "XLC",
}


def _chunk_list(lst: list, size: int):
    """Split list into chunks."""
    for i in range(0, len(lst), size):
        yield lst[i:i + size]


def _clean_float(val, default=0.0) -> float:
    """Ensure a float value is JSON-compliant (no NaN/Inf)."""
    try:
        f = float(val)
        if math.isnan(f) or math.isinf(f):
            return default
        return f
    except (TypeError, ValueError):
        return default


async def get_indices() -> list[dict]:
    """Fetch current data for major market indices."""
    import yfinance as yf

    logger.info("Fetching market indices")
    results = []
    symbols = list(INDEX_MAP.values())
    names = {v: k for k, v in INDEX_MAP.items()}

    try:
        # Download in batch for efficiency
        data = yf.download(symbols, period="2d", interval="1d", group_by="ticker", progress=False)
        if data.empty:
            logger.warning("No index data returned from yfinance")
            return _fallback_indices()

        for sym in symbols:
            try:
                name = names[sym]
                if len(symbols) == 1:
                    ticker_data = data
                else:
                    ticker_data = data[sym] if sym in data.columns.levels[0] else None

                if ticker_data is None or ticker_data.empty:
                    continue

                latest = ticker_data.iloc[-1]
                prev = ticker_data.iloc[-2] if len(ticker_data) > 1 else latest

                close = _clean_float(latest["Close"])
                prev_close = _clean_float(prev["Close"])
                change = close - prev_close
                change_pct = (change / prev_close) * 100 if prev_close else 0

                results.append({
                    "name": name,
                    "symbol": sym,
                    "price": round(close, 2),
                    "change": round(change, 2),
                    "change_percent": round(change_pct, 2),
                })
            except Exception as e:
                logger.warning(f"Error processing index {sym}: {e}")
                continue

    except Exception as e:
        logger.error(f"Error fetching indices: {e}", exc_info=True)
        return _fallback_indices()

    logger.info(f"Indices fetched: {len(results)} results")
    return results


def _fallback_indices() -> list[dict]:
    """Return empty indices with proper structure."""
    return [
        {"name": name, "symbol": sym, "price": 0, "change": 0, "change_percent": 0}
        for name, sym in INDEX_MAP.items()
    ]


async def get_movers(top_n: int = 25) -> dict[str, list[dict]]:
    """Fetch top gainers, losers, and most active stocks from our universe.

    Returns:
        {"gainers": [...], "losers": [...], "actives": [...]}
        Each item: {symbol, price, change, change_percent, volume}
    """
    import yfinance as yf

    logger.info(f"Fetching movers from universe of {len(UNIVERSE)} symbols")
    all_quotes: list[dict] = []

    # Process in chunks of 50 to avoid rate limiting
    for chunk in _chunk_list(UNIVERSE, 50):
        try:
            data = yf.download(chunk, period="2d", interval="1d", group_by="ticker", progress=False)
            if data.empty:
                continue

            for sym in chunk:
                try:
                    if len(chunk) == 1:
                        ticker_data = data
                    else:
                        ticker_data = data[sym] if sym in data.columns.levels[0] else None

                    if ticker_data is None or ticker_data.empty:
                        continue

                    latest = ticker_data.iloc[-1]
                    prev = ticker_data.iloc[-2] if len(ticker_data) > 1 else latest

                    close = _clean_float(latest["Close"])
                    prev_close = _clean_float(prev["Close"])
                    volume = int(_clean_float(latest.get("Volume", 0)))

                    if close <= 0 or prev_close <= 0:
                        continue

                    change = close - prev_close
                    change_pct = (change / prev_close) * 100

                    all_quotes.append({
                        "symbol": sym,
                        "price": round(close, 2),
                        "change": round(change, 2),
                        "change_percent": round(change_pct, 2),
                        "volume": volume,
                    })
                except Exception as e:
                    logger.debug(f"Error processing {sym}: {e}")
                    continue

        except Exception as e:
            logger.warning(f"Error fetching chunk: {e}")
            continue

    # Sort and slice
    gainers = sorted(all_quotes, key=lambda x: x["change_percent"], reverse=True)[:top_n]
    losers = sorted(all_quotes, key=lambda x: x["change_percent"])[:top_n]
    actives = sorted(all_quotes, key=lambda x: x["volume"], reverse=True)[:top_n]

    logger.info(f"Movers: {len(gainers)} gainers, {len(losers)} losers, {len(actives)} actives")
    return {"gainers": gainers, "losers": losers, "actives": actives}


async def get_sector_performance() -> list[dict]:
    """Fetch daily performance for each sector via sector ETFs."""
    import yfinance as yf

    logger.info("Fetching sector performance")
    results = []
    symbols = list(SECTOR_ETFS.values())
    names = {v: k for k, v in SECTOR_ETFS.items()}

    try:
        data = yf.download(symbols, period="2d", interval="1d", group_by="ticker", progress=False)
        if data.empty:
            logger.warning("No sector data returned")
            return _fallback_sectors()

        for sym in symbols:
            try:
                name = names[sym]
                if len(symbols) == 1:
                    ticker_data = data
                else:
                    ticker_data = data[sym] if sym in data.columns.levels[0] else None

                if ticker_data is None or ticker_data.empty:
                    continue

                latest = ticker_data.iloc[-1]
                prev = ticker_data.iloc[-2] if len(ticker_data) > 1 else latest

                close = _clean_float(latest["Close"])
                prev_close = _clean_float(prev["Close"])
                change_pct = ((close - prev_close) / prev_close) * 100 if prev_close else 0

                results.append({
                    "name": name,
                    "symbol": sym,
                    "change_percent": round(change_pct, 2),
                })
            except Exception as e:
                logger.warning(f"Error processing sector {sym}: {e}")
                continue

    except Exception as e:
        logger.error(f"Error fetching sectors: {e}", exc_info=True)
        return _fallback_sectors()

    # Sort by performance
    results.sort(key=lambda x: x["change_percent"], reverse=True)
    logger.info(f"Sector performance: {len(results)} sectors")
    return results


def _fallback_sectors() -> list[dict]:
    return [
        {"name": name, "symbol": sym, "change_percent": 0}
        for name, sym in SECTOR_ETFS.items()
    ]


def get_fear_greed_index() -> dict:
    """Return a simplified Fear & Greed index.

    In production, this would call CNN's API or similar.
    Here we compute a basic version from VIX level.
    """
    import yfinance as yf

    try:
        vix = yf.Ticker("^VIX")
        hist = vix.history(period="5d")
        if hist.empty:
            return {"value": 50, "label": "Neutral", "description": "VIX data unavailable"}

        vix_value = _clean_float(hist.iloc[-1]["Close"])

        # Simple VIX → Fear/Greed mapping
        if vix_value < 15:
            return {"value": 80, "label": "Extreme Greed", "description": f"VIX at {vix_value:.1f} — very low volatility"}
        elif vix_value < 20:
            return {"value": 65, "label": "Greed", "description": f"VIX at {vix_value:.1f} — low volatility"}
        elif vix_value < 25:
            return {"value": 50, "label": "Neutral", "description": f"VIX at {vix_value:.1f} — normal range"}
        elif vix_value < 30:
            return {"value": 30, "label": "Fear", "description": f"VIX at {vix_value:.1f} — elevated volatility"}
        else:
            return {"value": 15, "label": "Extreme Fear", "description": f"VIX at {vix_value:.1f} — high volatility"}

    except Exception as e:
        logger.warning(f"Error computing Fear & Greed: {e}")
        return {"value": 50, "label": "Neutral", "description": "Data unavailable"}
