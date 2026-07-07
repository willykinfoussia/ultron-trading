"""
Analysis Registry - Central registry for all analysis methods.
"""

import logging
import time
from typing import Any, Dict, List, Optional, Type

from .base import AnalysisMethod, AnalysisResult
from .metadata import ANALYSIS_METADATA

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
        """
        Run a specific analysis method.
        """
        method = self._methods.get(method_id)
        if not method:
            raise ValueError(
                f"Unknown analysis method: '{method_id}'. "
                f"Available: {list(self._methods.keys())}"
            )
        
        # Get correlation ID
        try:
            from app.core.logging_config import get_correlation_id
            correlation_id = get_correlation_id()
        except ImportError:
            correlation_id = "none"
        
        logger.info(
                        f"Running {method_id} for {symbol} with params={params}",
                        extra={
                            "method_id": method_id,
                            "symbol": symbol,
                            "params": list(params.keys()) if params else [],
                            "correlation_id": correlation_id,
                        }
                    )
        start_time = time.time()
        try:
            result = await method.run(symbol, **params)
            duration_ms = (time.time() - start_time) * 1000
            
            logger.info(
                f"Completed {method_id} for {symbol}",
                extra={
                    "method_id": method_id,
                    "symbol": symbol,
                    "duration_ms": round(duration_ms, 2),
                    "signal": getattr(result, 'signal', None),
                    "confidence": getattr(result, 'confidence', None),
                    "correlation_id": correlation_id,
                }
            )
            return result
        except Exception as e:
            duration_ms = (time.time() - start_time) * 1000
            logger.error(
                f"Error running {method_id} for {symbol}: {e}",
                extra={
                    "method_id": method_id,
                    "symbol": symbol,
                    "error": str(e),
                    "error_type": type(e).__name__,
                    "duration_ms": round(duration_ms, 2),
                    "correlation_id": correlation_id,
                },
                exc_info=True
            )
            raise

    async def run_category(
        self, category: str, symbol: str, **params
    ) -> List[AnalysisResult]:
        """
        Run all methods in a given category.
        """
        method_ids = self._categories.get(category, [])
        if not method_ids:
            logger.warning(f"No methods registered for category '{category}'")
            return []

        # Get correlation ID
        try:
            from app.core.logging_config import get_correlation_id
            correlation_id = get_correlation_id()
        except ImportError:
            correlation_id = "none"
        
        logger.info(
            f"Starting category run for {category}",
            extra={
                "category": category,
                "symbol": symbol,
                "method_count": len(method_ids),
                "correlation_id": correlation_id,
            }
        )
        start_time = time.time()

        results = []
        method_start = time.time()  # Initialize at the start
        for i, mid in enumerate(method_ids):
            try:
                method_start = time.time()
                result = await self.run(mid, symbol, **params)
                method_duration_ms = (time.time() - method_start) * 1000
                
                results.append(result)
                
                logger.debug(
                    f"Completed method {i+1}/{len(method_ids)}: {mid}",
                    extra={
                        "method_index": i,
                        "method_id": mid,
                        "duration_ms": round(method_duration_ms, 2),
                        "correlation_id": correlation_id,
                    }
                )
            except Exception as e:
                method_duration_ms = (time.time() - method_start) * 1000
                logger.error(
                    f"Error running {mid} for {symbol}: {e}",
                    extra={
                        "method_id": mid,
                        "symbol": symbol,
                        "error": str(e),
                        "error_type": type(e).__name__,
                        "duration_ms": round(method_duration_ms, 2),
                        "correlation_id": correlation_id,
                    },
                    exc_info=True
                )
        total_duration_ms = (time.time() - start_time) * 1000
        
        logger.info(
            f"Completed category run for {category}",
            extra={
                "category": category,
                "symbol": symbol,
                "method_count": len(method_ids),
                "successful_count": len(results),
                "failed_count": len(method_ids) - len(results),
                "total_duration_ms": round(total_duration_ms, 2),
                "correlation_id": correlation_id,
            }
        )
        return results

    async def run_all(self, symbol: str, **params) -> List[AnalysisResult]:
        """
        Run all registered methods across all categories.
        """
        results = []
        for category in self._categories:
            category_results = await self.run_category(category, symbol, **params)
            results.extend(category_results)
        return results


# Global registry instance
registry = AnalysisRegistry()


def _register_all() -> None:
    """Auto-register all analysis methods."""
    from app.services.analysis.technical import (
        RSIMethod, MACDMethod, BollingerBandsMethod, SMAMethod, EMAMethod,
    )
    from app.services.analysis.fundamental import (
        PERatioMethod, ROEMethod, DebtToEquityMethod, ProfitMarginMethod,
        DCFValuationMethod, CompsAnalysisMethod,
    )
    from app.services.analysis.sentiment import NewsSentimentMethod
    from app.services.analysis.quantitative import (
        MarkowitzMethod, CAPMMethod,
        BinomialTreeMethod, VasicekMethod, HullWhiteMethod,
        HestonMethod, MertonCreditMethod, VaRMethod, MonteCarloMethod,
    )

    # Technical methods
    registry.register("technical", RSIMethod)
    registry.register("technical", MACDMethod)
    registry.register("technical", BollingerBandsMethod)
    registry.register("technical", SMAMethod)
    registry.register("technical", EMAMethod)

    # Fundamental methods
    registry.register("fundamental", PERatioMethod)
    registry.register("fundamental", ROEMethod)
    registry.register("fundamental", DebtToEquityMethod)
    registry.register("fundamental", ProfitMarginMethod)
    registry.register("fundamental", DCFValuationMethod)
    registry.register("fundamental", CompsAnalysisMethod)

    # Sentiment methods
    registry.register("sentiment", NewsSentimentMethod)

    # Quantitative methods
    registry.register("quant", MarkowitzMethod)
    registry.register("quant", CAPMMethod)
    registry.register("quant", BinomialTreeMethod)
    registry.register("quant", VasicekMethod)
    registry.register("quant", HullWhiteMethod)
    registry.register("quant", HestonMethod)
    registry.register("quant", MertonCreditMethod)
    registry.register("quant", VaRMethod)
    registry.register("quant", MonteCarloMethod)

    logger.info(
        f"Analysis engine initialized: {len(registry.list_all())} methods "
        f"across {len(registry.get_categories())} categories"
    )


_register_all()