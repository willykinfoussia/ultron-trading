"""Search API routes."""
from fastapi import APIRouter, Query
from app.services.search_service import search_symbols

router = APIRouter()


@router.get("/")
async def search(q: str = Query(..., min_length=1, max_length=100, description="Search query — company name or symbol")):
    """Search for stocks by symbol or company name. Returns matching symbols with metadata."""
    results = search_symbols(q, limit=10)
    return {"query": q, "results": results, "count": len(results)}
