from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import yfinance as yf
from datetime import datetime, timedelta

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
    regular_market_time: str
    message: Optional[str] = None

@router.get("/{symbol}/quote", response_model=StockQuote)
async def get_stock_quote(symbol: str):
    try:
        ticker = yf.Ticker(symbol.upper())
        info = ticker.info
        
        # Extract relevant fields
        quote = StockQuote(
            symbol=symbol.upper(),
            price=info.get("regularMarketPrice", 0.0),
            currency=info.get("currency", "USD"),
            exchange=info.get("exchange", ""),
            quote_type=info.get("quoteType", ""),
            market_state=info.get("marketState", ""),
            regular_market_change=info.get("regularMarketChange", 0.0),
            regular_market_change_percent=info.get("regularMarketChangePercent", 0.0),
            regular_market_time=datetime.fromtimestamp(info.get("regularMarketTime", 0)).isoformat() if info.get("regularMarketTime") else None,
            message="Success"
        )
        return quote
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error fetching data for {symbol}: {str(e)}")

@router.get("/{symbol}/history")
async def get_stock_history(symbol: str, period: str = "1mo", interval: str = "1d"):
    try:
        ticker = yf.Ticker(symbol.upper())
        hist = ticker.history(period=period, interval=interval)
        if hist.empty:
            raise HTTPException(status_code=404, detail=f"No historical data found for {symbol}")
        
        # Convert to list of dicts for JSON serialization
        history_data = []
        for index, row in hist.iterrows():
            history_data.append({
                "date": index.isoformat(),
                "open": float(row["Open"]),
                "high": float(row["High"]),
                "low": float(row["Low"]),
                "close": float(row["Close"]),
                "volume": int(row["Volume"])
            })
        
        return {
            "symbol": symbol.upper(),
            "period": period,
            "interval": interval,
            "data": history_data
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error fetching history for {symbol}: {str(e)}")
