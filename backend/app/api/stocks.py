from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import yfinance as yf
from datetime import datetime
import logging

logger = logging.getLogger("ultron-trading.stocks")

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

        quote = StockQuote(
            symbol=sym,
            price=info.get("regularMarketPrice", 0.0),
            currency=info.get("currency", "USD"),
            exchange=info.get("exchange", ""),
            quote_type=info.get("quoteType", ""),
            market_state=info.get("marketState", ""),
            regular_market_change=info.get("regularMarketChange", 0.0),
            regular_market_change_percent=info.get("regularMarketChangePercent", 0.0),
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
                "open": float(row["Open"]),
                "high": float(row["High"]),
                "low": float(row["Low"]),
                "close": float(row["Close"]),
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
