"""
Analysis API Endpoints

Provides REST endpoints for the plugin-based analysis engine.
All methods are auto-registered on first import via the analysis package.
"""

import logging
from typing import Any, Dict, List

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.services.analysis import registry

logger = logging.getLogger("ultron-trading.analysis.api")

router = APIRouter()


# Request/Response Models

class RunAllRequest(BaseModel):
    category: str
    params: Dict[str, Any] = {}


class MethodSummary(BaseModel):
    method_id: str
    method_name: str
    category: str
    description: str
    parameters: Dict[str, Any]
    how_it_works: str = ""
    pros: List[str] = []
    cons: List[str] = []
    interpretation_guide: Dict[str, str] = {}
    example_scenarios: List[Dict[str, str]] = []


# Endpoints

@router.get("/", response_model=List[MethodSummary])
async def list_all_methods():
    """List all available analysis methods with metadata."""
    return registry.list_all()


@router.get("/categories")
async def list_categories():
    """List all categories with method counts and method metadata."""
    categories = registry.get_categories()
    result = []
    for cat_name, count in categories.items():
        methods = registry.get_methods(category=cat_name)
        result.append({
            "category": cat_name,
            "methods_count": count,
            "methods": methods,
        })
    return result


@router.get("/{symbol}/run/{method_id}")
async def run_analysis(
    symbol: str,
    method_id: str,
    period: int = Query(None, description="Lookback period for technical methods"),
    fast: int = Query(None, description="MACD fast period"),
    slow: int = Query(None, description="MACD slow period"),
    signal: int = Query(None, description="MACD signal period"),
    std_dev: float = Query(None, description="Bollinger Bands std deviation"),
    period_data: str = Query(None, description="Historical data range"),
    lookback_days: int = Query(None, description="Lookback days for ML/trend"),
    lookback_hours: int = Query(None, description="Lookback hours for social sentiment"),
    horizon_days: int = Query(None, description="Prediction horizon for ML"),
):
    """Run a specific analysis method for a symbol."""
    sym = symbol.upper()
    method = registry.get_method(method_id)
    if not method:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown method '{method_id}'. Available: {[m['method_id'] for m in registry.list_all()]}",
        )

    params = {}
    for key, value in {
        "period": period, "fast": fast, "slow": slow, "signal": signal,
        "std_dev": std_dev, "period_data": period_data,
        "lookback_days": lookback_days, "lookback_hours": lookback_hours,
        "horizon_days": horizon_days,
    }.items():
        if value is not None:
            params[key] = value

    try:
        result = await registry.run(method_id, sym, **params)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error running {method_id} for {sym}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.post("/{symbol}/run-all")
async def run_all_category(symbol: str, body: RunAllRequest):
    """Run all analysis methods for a given category."""
    sym = symbol.upper()
    category = body.category

    available_categories = registry.get_categories()
    if category not in available_categories:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown category '{category}'. Available: {list(available_categories.keys())}",
        )

    try:
        results = await registry.run_category(category, sym, **body.params)
        return {
            "symbol": sym,
            "category": category,
            "results": [r.model_dump() for r in results],
            "count": len(results),
        }
    except Exception as e:
        logger.error(f"Error running category {category} for {sym}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.get("/{symbol}/all")
async def run_all_analysis(symbol: str):
    """Run all analysis methods across all categories. Returns flat list of results."""
    sym = symbol.upper()
    try:
        results = await registry.run_all(sym)
        return [r.model_dump() for r in results]
    except Exception as e:
        logger.error(f"Error running all analysis for {sym}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.get("/{symbol}/summary")
async def run_summary(symbol: str):
    """Run all analysis methods across all categories and return a flat list."""
    sym = symbol.upper()
    try:
        results = await registry.run_all(sym)
        return [r.model_dump() for r in results]
    except Exception as e:
        logger.error(f"Error running summary for {sym}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
