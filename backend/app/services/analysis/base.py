"""
Analysis Engine - Base classes for the plugin-based analysis architecture.

AnalysisMethod: abstract base class that all analysis methods must implement.
AnalysisResult: Pydantic model representing the output of any analysis method.
"""

from abc import ABC, abstractmethod
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class AnalysisResult(BaseModel):
    """Standardized result from any analysis method."""

    method_id: str
    method_name: str
    category: str
    symbol: str
    result: Dict[str, Any] = Field(default_factory=dict)
    signal: str = "neutral"  # "buy", "sell", "hold", "neutral"
    confidence: float = Field(0.0, ge=0.0, le=1.0)
    explanation: str = ""
    chart_data: Optional[Dict[str, Any]] = None
    computed_at: datetime = Field(default_factory=datetime.utcnow)


class AnalysisMethod(ABC):
    """Abstract base class for all analysis methods (plugin pattern)."""

    def __init__(self):
        self._validate_metadata()

    @property
    @abstractmethod
    def method_id(self) -> str:
        """Unique identifier, e.g. 'rsi', 'macd'."""
        ...

    @property
    @abstractmethod
    def method_name(self) -> str:
        """Human-readable name, e.g. 'Relative Strength Index'."""
        ...

    @property
    @abstractmethod
    def category(self) -> str:
        """Category: 'technical', 'fundamental', 'sentiment', 'ml'."""
        ...

    @property
    @abstractmethod
    def description(self) -> str:
        """Short description of what this method does."""
        ...

    @property
    def parameters(self) -> Dict[str, Dict[str, Any]]:
        """Parameter schema: {name: {type, default, min, max, description}}."""
        return {}

    @property
    def how_it_works(self) -> str:
        """Detailed explanation of how this method works."""
        return ""

    @property
    def pros(self) -> List[str]:
        """List of advantages."""
        return []

    @property
    def cons(self) -> List[str]:
        """List of disadvantages."""
        return []

    @property
    def interpretation_guide(self) -> Dict[str, str]:
        """How to interpret signals: {buy_signal, sell_signal, hold_signal, confidence_meaning}."""
        return {}

    @property
    def example_scenarios(self) -> List[Dict[str, str]]:
        """Example scenarios: [{scenario, outcome}]."""
        return []

    def _validate_metadata(self):
        """Validate that required metadata is not empty."""
        if not self.method_id:
            raise ValueError("method_id cannot be empty")
        if not self.method_name:
            raise ValueError("method_name cannot be empty")
        valid_categories = ("technical", "fundamental", "sentiment", "ml")
        if self.category not in valid_categories:
            raise ValueError(f"category must be one of {valid_categories}, got '{self.category}'")

    @abstractmethod
    async def run(self, symbol: str, **params) -> AnalysisResult:
        """Execute the analysis method for the given symbol.

        Args:
            symbol: Stock ticker symbol (e.g. 'AAPL')
            **params: Method-specific parameters (e.g. period=14)

        Returns:
            AnalysisResult with signal, confidence, explanation, chart_data
        """
        ...
