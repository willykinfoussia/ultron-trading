"""
Analysis API Endpoints

Provides REST endpoints for the plugin-based analysis engine.
All methods are auto-registered on first import via the analysis package.
"""

import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.services.analysis import registry

logger = logging.getLogger("ultron-trading.analysis.api")

router = APIRouter()


# Request/Response Models

class RunAllRequest(BaseModel):
    category: Optional[str] = None
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

<tool_call>
<function=terminal>
<parameter=command>
cd /home/opc/ultron-trading/backend && wc -l app/api/analysis.py
