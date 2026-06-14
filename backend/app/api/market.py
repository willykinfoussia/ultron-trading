"""Market data API routes — indices, movers, sectors, fear & greed."""
from fastapi import APIRouter
from app.services.market_service import (
    get_indices,
    get_movers,
    get_sector_performance,
    get_fear_greed_index,
)

router = APIRouter()


@router.get("/indices")
async def market_indices():
    """Get current values for major market indices (S&P 500, Dow, NASDAQ, etc.)."""
    indices = await get_indices()
    return {"indices": indices}


@router.get("/movers")
async def market_movers():
    """Get top gainers, losers, and most active stocks."""
    movers = await get_movers(top_n=25)
    return movers


@router.get("/sectors")
async def market_sectors():
    """Get daily performance by sector (via sector ETFs)."""
    sectors = await get_sector_performance()
    return {"sectors": sectors}


@router.get("/fear-greed")
async def fear_greed():
    """Get Fear & Greed index (derived from VIX)."""
    return get_fear_greed_index()
