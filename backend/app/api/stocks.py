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
