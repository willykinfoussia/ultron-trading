"""
Analysis Registry - Central registry for all analysis methods.

Usage:
    from app.services.analysis import registry, AnalysisResult
    # Methods are auto-registered on first import
    all_methods = registry.list_all()
    result = await registry.run("rsi", "AAPL", period=14)
"""

import logging
from typing import Any, Dict, List, Optional, Type

from .base import AnalysisMethod, AnalysisResult

logger = logging.getLogger("ultron-trading.analysis")


class AnalysisRegistry:
    """Central registry that manages all analysis method plugins."""

    def __init__(self):
        self._methods: Dict[str, AnalysisMethod] = {}
        self._categories: Dict[str, List[str]] = {}

    def register(self, category: str, method_class: Type[AnalysisMethod]) -> None:
        """Register an analysis method under a given category."""
        instance = method_class()
        method_id = instance.method_id
        self._methods[method_id] = instance

        if category not in self._categories:
            self._categories[category] = []
        if method_id not in self._categories[category]:
            self._categories[category].append(method_id)

        logger.info(
            f"Registered method '{method_id}' ({instance.method_name}) "
            f"in category '{category}'"
        )

    def get_method(self, method_id: str) -> Optional[AnalysisMethod]:
        """Get a registered method instance by its ID."""
        return self._methods.get(method_id)
    def get_methods(self, category: Optional[str] = None) -> List[Dict[str, Any]]:
        """List method metadata, optionally filtered by category."""
        from .metadata import ANALYSIS_METADATA
        results = []
        for mid, method in self._methods.items():
            if category and method.category != category:
                continue
            meta = ANALYSIS_METADATA.get(mid, {})
            results.append({
                "method_id": method.method_id,
                "method_name": method.method_name,
                "category": method.category,
                "description": method.description,
                "parameters": method.parameters,
                "how_it_works": meta.get("how_it_works", method.how_it_works),
                "pros": meta.get("pros", method.pros),
                "cons": meta.get("cons", method.cons),
                "interpretation_guide": meta.get("interpretation_guide", method.interpretation_guide),
                "example_scenarios": meta.get("example_scenarios", method.example_scenarios),
            })
        return results

    def list_all(self) -> List[Dict[str, Any]]:
        """Return all registered methods with metadata."""
        return self.get_methods()

    def get_categories(self) -> Dict[str, int]:
        """Return category names with method counts."""
        return {cat: len(methods) for cat, methods in self._categories.items()}

    async def run(self, method_id: str, symbol: str, **params) -> AnalysisResult:
        """Run a specific analysis method."""
        method = self._methods.get(method_id)
        if not method:
            raise ValueError(
                f"Unknown analysis method: '{method_id}'. "
                f"Available: {list(self._methods.keys())}"
            )
        logger.info(f"Running {method_id} for {symbol} with params={params}")
        return await method.run(symbol, **params)

    async def run_category(
        self, category: str, symbol: str, **params
    ) -> List[AnalysisResult]:
        """Run all methods in a given category."""
        method_ids = self._categories.get(category, [])
        if not method_ids:
            logger.warning(f"No methods registered for category '{category}'")
            return []

        results = []
        for mid in method_ids:
            try:
                result = await self.run(mid, symbol, **params)
                results.append(result)
            except Exception as e:
                logger.error(f"Error running {mid} for {symbol}: {e}", exc_info=True)
        return results

    async def run_all(self, symbol: str, **params) -> List[AnalysisResult]:
        """Run all registered methods across all categories."""
        results = []
        for category in self._categories:
            category_results = await self.run_category(category, symbol, **params)
            results.extend(category_results)
        return results


# Global registry instance
registry = AnalysisRegistry()


# Auto-register all analysis methods
def _register_all():
    from app.services.analysis.technical import (
        RSIMethod, MACDMethod, BollingerBandsMethod, SMAMethod, EMAMethod,
    )
    from app.services.analysis.fundamental import (
        PERatioMethod, ROEMethod, DebtToEquityMethod, ProfitMarginMethod,
        DCFValuationMethod, CompsAnalysisMethod,
    )
    from app.services.analysis.sentiment import NewsSentimentMethod

    registry.register("technical", RSIMethod)
    registry.register("technical", MACDMethod)
    registry.register("technical", BollingerBandsMethod)
    registry.register("technical", SMAMethod)
    registry.register("technical", EMAMethod)

    registry.register("fundamental", PERatioMethod)
    registry.register("fundamental", ROEMethod)
    registry.register("fundamental", DebtToEquityMethod)
    registry.register("fundamental", ProfitMarginMethod)
    registry.register("fundamental", DCFValuationMethod)
    registry.register("fundamental", CompsAnalysisMethod)

    registry.register("sentiment", NewsSentimentMethod)


    logger.info(
        f"Analysis engine initialized: {len(registry.list_all())} methods "
        f"across {len(registry.get_categories())} categories"
    )


_register_all()
