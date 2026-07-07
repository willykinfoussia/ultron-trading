"""
Analysis API Endpoints

Provides REST endpoints for the plugin-based analysis engine.
All methods are auto-registered on first import via the analysis package.
"""

import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query, Request
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
    request: Request,
    symbol: str,
    method_id: str,
):
    """Run a specific analysis method for a symbol.
    
    All query parameters are dynamically forwarded to the analysis method.
    Use GET /api/analysis/ to see available methods and their parameters.
    """
    sym = symbol.upper()
    method = registry.get_method(method_id)
    if not method:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown method '{method_id}'. Available: {[m['method_id'] for m in registry.list_all()]}",
        )

    # Extract all query parameters (excluding symbol and method_id path params)
    params = {}
    for key, value in request.query_params.items():
        # Type conversion based on method's declared parameters
        param_def = method.parameters.get(key, {})
        param_type = param_def.get("type", "str")
        try:
            if param_type == "int":
                params[key] = int(value)
            elif param_type == "float":
                params[key] = float(value)
            elif param_type == "bool":
                params[key] = value.lower() in ("true", "1", "yes", "on")
            else:
                params[key] = value
        except (ValueError, TypeError):
            # If conversion fails, pass as string and let method handle it
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
    """Run all analysis methods for a given category, or all categories if none specified."""
    sym = symbol.upper()
    category = body.category

    try:
        if category is None:
            # Run all methods across all categories
            results = await registry.run_all(sym, **body.params)
            return {
                "symbol": sym,
                "category": "all",
                "results": [r.model_dump() for r in results],
                "count": len(results),
            }
        else:
            # Run all methods for the specified category
            available_categories = registry.get_categories()
            if category not in available_categories:
                raise HTTPException(
                    status_code=400,
                    detail=f"Unknown category '{category}'. Available: {list(available_categories.keys())}",
                )

            results = await registry.run_category(category, sym, **body.params)
            return {
                "symbol": sym,
                "category": category,
                "results": [r.model_dump() for r in results],
                "count": len(results),
            }
    except HTTPException:
        raise
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