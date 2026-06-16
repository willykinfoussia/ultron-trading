"""
Fundamental Analysis Methods

Implements PE ratio, ROE, Debt-to-Equity, and Profit Margin analysis
using yfinance company financials.
"""

import math
from datetime import datetime
from typing import Any, Dict

import yfinance as yf

from .base import AnalysisMethod, AnalysisResult

import logging

logger = logging.getLogger("ultron-trading.analysis.fundamental")

# Sector-average benchmarks (approximate)
SECTOR_PE_BENCHMARKS = {
    "Technology": 28.0,
    "Healthcare": 22.0,
    "Financial Services": 15.0,
    "Consumer Cyclical": 25.0,
    "Communication Services": 20.0,
    "Industrials": 18.0,
    "Consumer Defensive": 20.0,
    "Energy": 12.0,
    "Utilities": 18.0,
    "Real Estate": 25.0,
    "Basic Materials": 15.0,
}
DEFAULT_PE_BENCHMARK = 20.0


def _safe_float(val, default=0.0):
    try:
        f = float(val)
        if math.isnan(f) or math.isinf(f):
            return default
        return f
    except (TypeError, ValueError):
        return default


def _get_info(symbol: str) -> dict:
    """Fetch company info from yfinance."""
    ticker = yf.Ticker(symbol.upper())
    return ticker.info or {}


def _pe_signal(pe_ratio: float, sector_pe: float) -> tuple:
    """Signal based on PE relative to sector average."""
    if pe_ratio <= 0:
        return "neutral", 0.3, f"PE ratio is negative ({pe_ratio:.2f}) - company may have negative earnings"
    ratio_to_sector = pe_ratio / sector_pe if sector_pe > 0 else 1.0
    if ratio_to_sector < 0.7:
        confidence = min(1.0, 0.5 + (1 - ratio_to_sector) * 0.5)
        return "buy", confidence, f"PE {pe_ratio:.1f} is {ratio_to_sector:.0%} of sector avg ({sector_pe:.1f}) - potentially undervalued"
    elif ratio_to_sector > 1.4:
        confidence = min(1.0, 0.5 + (ratio_to_sector - 1) * 0.3)
        return "sell", confidence, f"PE {pe_ratio:.1f} is {ratio_to_sector:.0%} of sector avg ({sector_pe:.1f}) - potentially overvalued"
    else:
        return "neutral", 0.3, f"PE {pe_ratio:.1f} near sector avg ({sector_pe:.1f}) - fairly valued"


class PERatioMethod(AnalysisMethod):
    """Price-to-Earnings ratio analysis."""

    @property
    def method_id(self) -> str:
        return "pe_ratio"

    @property
    def method_name(self) -> str:
        return "Price-to-Earnings Ratio"

    @property
    def category(self) -> str:
        return "fundamental"

    @property
    def description(self) -> str:
        return "Compares stock PE ratio to sector average to identify potential over/undervaluation."

    @property
    def parameters(self) -> Dict[str, Dict[str, Any]]:
        return {}

    async def run(self, symbol: str, **params) -> AnalysisResult:
        info = _get_info(symbol)
        pe_ratio = _safe_float(info.get("trailingPE", 0))
        forward_pe = _safe_float(info.get("forwardPE", 0))
        sector = info.get("sector", "Unknown")
        sector_pe = SECTOR_PE_BENCHMARKS.get(sector, DEFAULT_PE_BENCHMARK)

        signal, confidence, explanation = _pe_signal(pe_ratio, sector_pe)

        return AnalysisResult(
            method_id=self.method_id,
            method_name=self.method_name,
            category=self.category,
            symbol=symbol.upper(),
            result={
                "pe_ratio": round(pe_ratio, 2),
                "forward_pe": round(forward_pe, 2),
                "sector": sector,
                "sector_avg_pe": sector_pe,
                "ratio_to_sector": round(pe_ratio / sector_pe, 2) if sector_pe > 0 else 0,
            },
            signal=signal,
            confidence=round(confidence, 3),
            explanation=explanation,
            chart_data=None,
        )


class ROEMethod(AnalysisMethod):
    """Return on Equity analysis."""

    @property
    def method_id(self) -> str:
        return "roe"

    @property
    def method_name(self) -> str:
        return "Return on Equity"

    @property
    def category(self) -> str:
        return "fundamental"

    @property
    def description(self) -> str:
        return "Measures profitability relative to shareholders' equity. ROE > 15% is generally strong."

    @property
    def parameters(self) -> Dict[str, Dict[str, Any]]:
        return {}

    async def run(self, symbol: str, **params) -> AnalysisResult:
        info = _get_info(symbol)
        roe = _safe_float(info.get("returnOnEquity", 0))

        # Convert to percentage if in decimal form
        if roe < 1.0 and roe > -1.0:
            roe_pct = roe * 100
        else:
            roe_pct = roe

        if roe_pct >= 20:
            signal = "buy"
            confidence = min(1.0, 0.5 + (roe_pct - 20) / 30)
            explanation = f"ROE of {roe_pct:.1f}% is excellent (above 20%)"
        elif roe_pct >= 15:
            signal = "buy"
            confidence = 0.5 + (roe_pct - 15) / 10
            explanation = f"ROE of {roe_pct:.1f}% is strong (15-20%)"
        elif roe_pct >= 10:
            signal = "neutral"
            confidence = 0.3
            explanation = f"ROE of {roe_pct:.1f}% is moderate (10-15%)"
        elif roe_pct > 0:
            signal = "sell"
            confidence = 0.4
            explanation = f"ROE of {roe_pct:.1f}% is below average (under 10%)"
        else:
            signal = "sell"
            confidence = 0.6
            explanation = f"ROE of {roe_pct:.1f}% is negative - company is destroying shareholder value"

        return AnalysisResult(
            method_id=self.method_id,
            method_name=self.method_name,
            category=self.category,
            symbol=symbol.upper(),
            result={
                "roe": round(roe_pct, 2),
            },
            signal=signal,
            confidence=round(confidence, 3),
            explanation=explanation,
            chart_data=None,
        )


class DebtToEquityMethod(AnalysisMethod):
    """Debt-to-Equity ratio analysis."""

    @property
    def method_id(self) -> str:
        return "debt_to_equity"

    @property
    def method_name(self) -> str:
        return "Debt-to-Equity Ratio"

    @property
    def category(self) -> str:
        return "fundamental"

    @property
    def description(self) -> str:
        return "Measures financial leverage. Lower is safer; above 2.0 may indicate high risk."

    @property
    def parameters(self) -> Dict[str, Dict[str, Any]]:
        return {}

    async def run(self, symbol: str, **params) -> AnalysisResult:
        info = _get_info(symbol)
        de_ratio = _safe_float(info.get("debtToEquity", 0))

        if de_ratio <= 0:
            signal = "neutral"
            confidence = 0.3
            explanation = f"No debt-to-equity data available for {symbol.upper()}"
        elif de_ratio < 1.0:
            signal = "buy"
            confidence = min(1.0, 0.5 + (1.0 - de_ratio) * 0.3)
            explanation = f"D/E of {de_ratio:.1f} is conservative (below 1.0) - low leverage"
        elif de_ratio < 2.0:
            signal = "neutral"
            confidence = 0.3
            explanation = f"D/E of {de_ratio:.1f} is moderate (1.0-2.0) - manageable leverage"
        else:
            signal = "sell"
            confidence = min(1.0, 0.4 + (de_ratio - 2.0) / 5.0)
            explanation = f"D/E of {de_ratio:.1f} is high (above 2.0) - elevated financial risk"

        return AnalysisResult(
            method_id=self.method_id,
            method_name=self.method_name,
            category=self.category,
            symbol=symbol.upper(),
            result={
                "debt_to_equity": round(de_ratio, 2),
            },
            signal=signal,
            confidence=round(confidence, 3),
            explanation=explanation,
            chart_data=None,
        )


class ProfitMarginMethod(AnalysisMethod):
    """Profit Margin analysis."""

    @property
    def method_id(self) -> str:
        return "profit_margin"

    @property
    def method_name(self) -> str:
        return "Profit Margin"

    @property
    def category(self) -> str:
        return "fundamental"

    @property
    def description(self) -> str:
        return "Measures how much profit a company makes per dollar of revenue. Higher is better."

    @property
    def parameters(self) -> Dict[str, Dict[str, Any]]:
        return {}

    async def run(self, symbol: str, **params) -> AnalysisResult:
        info = _get_info(symbol)
        profit_margin = _safe_float(info.get("profitMargins", 0))

        # Convert to percentage if in decimal form
        if profit_margin < 1.0 and profit_margin > -1.0:
            margin_pct = profit_margin * 100
        else:
            margin_pct = profit_margin

        if margin_pct >= 20:
            signal = "buy"
            confidence = min(1.0, 0.5 + (margin_pct - 20) / 30)
            explanation = f"Profit margin of {margin_pct:.1f}% is excellent (above 20%)"
        elif margin_pct >= 10:
            signal = "buy"
            confidence = 0.5 + (margin_pct - 10) / 20
            explanation = f"Profit margin of {margin_pct:.1f}% is healthy (10-20%)"
        elif margin_pct >= 5:
            signal = "neutral"
            confidence = 0.3
            explanation = f"Profit margin of {margin_pct:.1f}% is average (5-10%)"
        elif margin_pct > 0:
            signal = "sell"
            confidence = 0.4
            explanation = f"Profit margin of {margin_pct:.1f}% is thin (under 5%)"
        else:
            signal = "sell"
            confidence = 0.6
            explanation = f"Profit margin of {margin_pct:.1f}% is negative - company is unprofitable"

        return AnalysisResult(
            method_id=self.method_id,
            method_name=self.method_name,
            category=self.category,
            symbol=symbol.upper(),
            result={
                "profit_margin": round(margin_pct, 2),
            },
            signal=signal,
            confidence=round(confidence, 3),
            explanation=explanation,
            chart_data=None,
        )
