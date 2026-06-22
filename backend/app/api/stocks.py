from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import yfinance as yf
from datetime import datetime
import logging
import math

logger = logging.getLogger("ultron-trading.stocks")

def safe_yf_float(val, default=0.0):
    """Convert a yfinance value to float, handling NaN/Inf."""
    try:
        f = float(val)
        if math.isnan(f) or math.isinf(f):
            return default
        return f
    except (TypeError, ValueError):
        return default

router = APIRouter()

class StockQuote(BaseModel):
    symbol: str
    short_name: str = ""
    long_name: str = ""
    price: float
    currency: str
    exchange: str
    quote_type: str
    market_state: str
    regular_market_change: float
    regular_market_change_percent: float
    regular_market_time: Optional[str] = None
    message: Optional[str] = None

@router.get("/{symbol}/quote", response_model=StockQuote)
async def get_stock_quote(symbol: str):
    sym = symbol.upper()
    logger.info(f"Quote requested for {sym}")
    try:
        ticker = yf.Ticker(sym)
        info = ticker.info

        if not info or "regularMarketPrice" not in info:
            logger.warning(f"No data returned for {sym}")
            raise HTTPException(status_code=404, detail=f"No data found for symbol: {sym}")

        raw_change = info.get("regularMarketChange", 0.0)
        raw_change_pct = info.get("regularMarketChangePercent", 0.0)
        quote = StockQuote(
            symbol=sym,
            short_name=info.get("shortName") or info.get("short_name") or sym,
            long_name=info.get("longName") or info.get("long_name") or info.get("shortName") or sym,
            price=safe_yf_float(info.get("regularMarketPrice"), 0.0),
            currency=info.get("currency", "USD"),
            exchange=info.get("exchange", ""),
            quote_type=info.get("quoteType", ""),
            market_state=info.get("marketState", ""),
            regular_market_change=safe_yf_float(raw_change, 0.0),
            regular_market_change_percent=safe_yf_float(raw_change_pct, 0.0),
            regular_market_time=datetime.fromtimestamp(info["regularMarketTime"]).isoformat() if info.get("regularMarketTime") else None,
            message="Success",
        )
        logger.info(f"Quote for {sym}: ${quote.price:.2f} ({quote.regular_market_change_percent:+.2f}%)")
        return quote
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching quote for {sym}: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=f"Error fetching data for {sym}: {str(e)}")

@router.get("/{symbol}/history")
async def get_stock_history(symbol: str, period: str = "1mo", interval: str = "1d"):
    sym = symbol.upper()
    logger.info(f"History requested for {sym} (period={period}, interval={interval})")
    try:
        ticker = yf.Ticker(sym)
        hist = ticker.history(period=period, interval=interval)

        if hist.empty:
            logger.warning(f"No historical data for {sym}")
            raise HTTPException(status_code=404, detail=f"No historical data found for {sym}")

        history_data = []
        for index, row in hist.iterrows():
            history_data.append({
                "date": index.isoformat(),
                "open": safe_yf_float(row["Open"]),
                "high": safe_yf_float(row["High"]),
                "low": safe_yf_float(row["Low"]),
                "close": safe_yf_float(row["Close"]),
                "volume": int(row["Volume"]),
            })

        logger.info(f"History for {sym}: {len(history_data)} data points returned")
        return {
            "symbol": sym,
            "period": period,
            "interval": interval,
            "data": history_data,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching history for {sym}: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=f"Error fetching history for {sym}: {str(e)}")


# ── Company Profile, Financials, Holders, News ─────────────────────────

from app.services.company_service import (
    get_company_profile,
    get_company_financials,
    get_company_holders,
    get_company_news,
)


@router.get("/{symbol}/profile")
async def get_profile(symbol: str):
    """Get company profile data."""
    sym = symbol.upper()
    logger.info(f"Profile requested for {sym}")
    try:
        data = get_company_profile(sym)
        if not data.get("long_name") and not data.get("short_name"):
            raise HTTPException(status_code=404, detail=f"No profile data found for symbol: {sym}")
        return data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching profile for {sym}: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=f"Error fetching profile for {sym}: {str(e)}")


@router.get("/{symbol}/financials")
async def get_financials(symbol: str):
    """Get company financials data."""
    sym = symbol.upper()
    logger.info(f"Financials requested for {sym}")
    try:
        data = get_company_financials(sym)
        # If we got no annual revenue and no quarterly data, the symbol might be invalid
        if (
            not data.get("annual_revenue")
            and not data.get("quarterly_earnings")
            and not data.get("total_cash")
            and not data.get("total_debt")
        ):
            raise HTTPException(status_code=404, detail=f"No financial data found for symbol: {sym}")
        return data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching financials for {sym}: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=f"Error fetching financials for {sym}: {str(e)}")


@router.get("/{symbol}/holders")
async def get_holders(symbol: str):
    """Get company holder data."""
    sym = symbol.upper()
    logger.info(f"Holders requested for {sym}")
    try:
        data = get_company_holders(sym)
        if (
            not data.get("major_holders")
            and not data.get("institutional_holders")
            and not data.get("mutual_fund_holders")
        ):
            raise HTTPException(status_code=404, detail=f"No holder data found for symbol: {sym}")
        return data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching holders for {sym}: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=f"Error fetching holders for {sym}: {str(e)}")


@router.get("/{symbol}/news")
async def get_news(symbol: str):
    """Get company news."""
    sym = symbol.upper()
    logger.info(f"News requested for {sym}")
    try:
        ticker = yf.Ticker(sym)
        info = ticker.info
        if not info or "regularMarketPrice" not in info:
            raise HTTPException(status_code=404, detail=f"No data found for symbol: {sym}")
        data = get_company_news(sym)
        return data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching news for {sym}: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=f"Error fetching news for {sym}: {str(e)}")


@router.get("/{symbol}/related")
async def get_related(symbol: str, limit: int = 12):
    """Get related stocks — same sector peers with live quotes.

    Returns stocks in the same sector, sorted by absolute change_percent
    (most volatile/movers first), excluding the current symbol.
    """
    sym = symbol.upper()
    logger.info(f"Related stocks requested for {sym}")
    try:
        ticker = yf.Ticker(sym)
        info = ticker.info
        if not info or "regularMarketPrice" not in info:
            raise HTTPException(status_code=404, detail=f"No data found for symbol: {sym}")

        sector = info.get("sector", "")
        industry = info.get("industry", "")

        # Find stocks in our universe with the same sector
        from app.services.market_service import UNIVERSE, _get_name_map, _clean_float
        import concurrent.futures

        # Get sector for all universe stocks (use cache if available)
        related_symbols = []
        # Known sector mapping for our universe (fast path)
        SECTOR_MAP = {
            "Technology": [
                "AAPL", "MSFT", "GOOGL", "GOOG", "META", "NVDA", "AMD", "INTC",
                "CRM", "ADBE", "PYPL", "UBER", "SHOP", "SQ", "SNOW", "PLTR",
                "NET", "DDOG", "ZM", "ROKU", "TWLO", "OKTA", "FSLY", "HUBS",
            ],
            "Health Care": [
                "JNJ", "PFE", "MRK", "ABT", "TMO", "DHR", "LLY", "BMY", "GILD",
            ],
            "Financials": [
                "JPM", "BAC", "GS", "MS", "WFC", "C", "BLK", "SCHW", "AXP", "V", "MA",
            ],
            "Consumer Discretionary": [
                "AMZN", "TSLA", "MCD", "NKE", "SBUX", "TGT", "DIS", "NFLX", "SPOT",
                "RIVN", "LCID",
            ],
            "Consumer Staples": ["WMT", "PG", "KO", "PEP", "COST"],
            "Industrials": ["BA", "CAT", "GE", "HON", "UPS", "RTX"],
            "Energy": ["XOM", "CVX"],
            "Communication Services": ["VZ", "T", "CMCSA"],
        }

        candidates = SECTOR_MAP.get(sector, [])
        # Remove current symbol
        candidates = [s for s in candidates if s != sym]

        if not candidates:
            # Fallback: return top movers from universe
            candidates = [s for s in UNIVERSE[:20] if s != sym]

        # Fetch quotes in parallel
        results = []
        name_map = _get_name_map(UNIVERSE)

        def _fetch_quote(s: str) -> dict | None:
            try:
                t = yf.Ticker(s)
                h = t.history(period="5d")
                if h.empty:
                    return None
                latest = h.iloc[-1]
                prev = h.iloc[-2] if len(h) > 1 else latest
                close = _clean_float(latest["Close"])
                prev_close = _clean_float(prev["Close"])
                if close <= 0 or prev_close <= 0:
                    return None
                change = close - prev_close
                change_pct = (change / prev_close) * 100
                return {
                    "symbol": s,
                    "short_name": name_map.get(s, s),
                    "price": round(close, 2),
                    "change": round(change, 2),
                    "change_percent": round(change_pct, 2),
                    "volume": int(_clean_float(latest.get("Volume", 0))),
                    "sector": sector,  # Same sector as the queried stock
                }
            except Exception:
                return None

        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
            futures = {executor.submit(_fetch_quote, s): s for s in candidates[:20]}
            for future in concurrent.futures.as_completed(futures, timeout=25):
                result = future.result()
                if result:
                    results.append(result)

        # Sort by absolute change (most active movers first)
        results.sort(key=lambda x: abs(x["change_percent"]), reverse=True)

        logger.info(f"Related stocks for {sym} ({sector}): {len(results)} found")
        return {
            "symbol": sym,
            "sector": sector,
            "industry": industry,
            "count": len(results),
            "stocks": results[:limit],
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching related stocks for {sym}: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=f"Error fetching related stocks: {str(e)}")
