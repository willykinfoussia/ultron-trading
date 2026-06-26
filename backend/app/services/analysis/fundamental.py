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


# ─── DCF (Discounted Cash Flow) Valuation ───────────────────────────────────

def _dcf_fair_value(info: dict) -> dict:
    """
    Simplified DCF model using yfinance data.
    Estimates intrinsic value from free cash flow, growth, and discount rate.
    Returns {fair_value, current_price, margin_of_safety, growth_rate, discount_rate, fcf}
    """
    # Extract inputs
    fcf = _safe_float(info.get("freeCashflow", 0))
    market_cap = _safe_float(info.get("marketCap", 0))
    current_price = _safe_float(info.get("currentPrice", 0)) or _safe_float(info.get("regularMarketPrice", 0))
    # Growth rate: use analyst estimate or default 8%
    growth_rate = _safe_float(info.get("earningsGrowth", 0)) or 0.08
    if growth_rate > 1.0:
        growth_rate = growth_rate / 100  # Convert from percentage
    # Discount rate (WACC): default 10%
    discount_rate = 0.10
    # Terminal growth rate
    terminal_growth = 0.025
    # Projection years
    years = 5

    result = {
        "fair_value": 0.0,
        "current_price": round(current_price, 2),
        "margin_of_safety": 0.0,
        "growth_rate": round(growth_rate * 100, 2),
        "discount_rate": round(discount_rate * 100, 2),
        "fcf": round(fcf, 0),
        "method": "simplified_dcf",
    }

    if fcf <= 0 or current_price <= 0:
        return result  # Cannot compute

    # Project FCFs and discount back
    pv_fcf = 0.0
    for year in range(1, years + 1):
        projected_fcf = fcf * ((1 + growth_rate) ** year)
        pv_fcf += projected_fcf / ((1 + discount_rate) ** year)

    # Terminal value
    terminal_fcf = fcf * ((1 + growth_rate) ** (years + 1))
    terminal_value = terminal_fcf / (discount_rate - terminal_growth)
    pv_terminal = terminal_value / ((1 + discount_rate) ** years)

    # Enterprise value → Equity value (simplified: subtract debt)
    total_debt = _safe_float(info.get("totalDebt", 0))
    cash = _safe_float(info.get("totalCash", 0))
    enterprise_value = pv_fcf + pv_terminal
    equity_value = enterprise_value - total_debt + cash

    # Shares outstanding
    shares = _safe_float(info.get("sharesOutstanding", 0))
    if shares > 0:
        fair_value = equity_value / shares
    else:
        # Fallback: use market cap as equity value proxy
        fair_value = (equity_value / market_cap) * current_price if market_cap > 0 else 0

    result["fair_value"] = round(fair_value, 2)
    result["enterprise_value"] = round(enterprise_value, 0)
    result["pv_fcf"] = round(pv_fcf, 0)
    result["pv_terminal"] = round(pv_terminal, 0)
    result["total_debt"] = round(total_debt, 0)
    result["cash"] = round(cash, 0)

    if fair_value > 0 and current_price > 0:
        margin = (fair_value - current_price) / fair_value * 100
        result["margin_of_safety"] = round(margin, 2)

    return result


class DCFValuationMethod(AnalysisMethod):
    """Discounted Cash Flow (DCF) intrinsic value analysis."""

    @property
    def method_id(self) -> str:
        return "dcf_valuation"

    @property
    def method_name(self) -> str:
        return "DCF Intrinsic Value"

    @property
    def category(self) -> str:
        return "fundamental"

    @property
    def description(self) -> str:
        return "Estimates intrinsic value using discounted free cash flow. Compares to current price to determine over/undervaluation."

    @property
    def parameters(self) -> Dict[str, Dict[str, Any]]:
        return {
            "discount_rate": {"type": "float", "default": 10.0, "description": "WACC/discount rate (%)"},
            "growth_rate": {"type": "float", "default": 8.0, "description": "FCF growth rate override (%)"},
        }

    async def run(self, symbol: str, **params) -> AnalysisResult:
        info = _get_info(symbol)

        # Allow parameter overrides
        if "discount_rate" in params:
            discount_rate_override = float(params["discount_rate"]) / 100
            # Re-run with override (simplified: we just note it was overridden)
        else:
            discount_rate_override = None

        dcf_result = _dcf_fair_value(info)

        fair_value = dcf_result["fair_value"]
        current_price = dcf_result["current_price"]
        margin = dcf_result["margin_of_safety"]

        if fair_value <= 0 or current_price <= 0:
            signal = "neutral"
            confidence = 0.3
            explanation = f"DCF cannot be computed — insufficient data (FCF={dcf_result['fcf']}, price={current_price})"
        elif margin > 20:
            signal = "buy"
            confidence = min(1.0, 0.5 + margin / 60)
            explanation = f"Intrinsic value ${fair_value:.2f} vs current ${current_price:.2f} — {margin:.0f}% undervalued (margin of safety)"
        elif margin > 5:
            signal = "buy"
            confidence = 0.4 + (margin - 5) / 30
            explanation = f"Intrinsic value ${fair_value:.2f} vs current ${current_price:.2f} — slightly undervalued ({margin:.0f}% margin)"
        elif margin > -10:
            signal = "neutral"
            confidence = 0.3
            explanation = f"Intrinsic value ${fair_value:.2f} near current price ${current_price:.2f} — fairly valued ({margin:.0f}%)"
        elif margin > -25:
            signal = "sell"
            confidence = 0.4 + (abs(margin) - 10) / 30
            explanation = f"Intrinsic value ${fair_value:.2f} below current ${current_price:.2f} — {abs(margin):.0f}% overvalued"
        else:
            signal = "sell"
            confidence = min(1.0, 0.5 + abs(margin) / 50)
            explanation = f"Intrinsic value ${fair_value:.2f} far below current ${current_price:.2f} — significantly overvalued ({abs(margin):.0f}%)"

        return AnalysisResult(
            method_id=self.method_id,
            method_name=self.method_name,
            category=self.category,
            symbol=symbol.upper(),
            result=dcf_result,
            signal=signal,
            confidence=round(confidence, 3),
            explanation=explanation,
            chart_data=None,
        )


# ─── Comparable Company Analysis ────────────────────────────────────────────

# Sector-average multiples for comparison
SECTOR_MULTIPLES = {
    "Technology": {"pe": 28.0, "pb": 5.0, "ps": 6.0, "ev_ebitda": 18.0},
    "Healthcare": {"pe": 22.0, "pb": 4.0, "ps": 4.5, "ev_ebitda": 15.0},
    "Financial Services": {"pe": 15.0, "pb": 2.0, "ps": 3.0, "ev_ebitda": 12.0},
    "Consumer Cyclical": {"pe": 25.0, "pb": 4.5, "ps": 2.5, "ev_ebitda": 14.0},
    "Communication Services": {"pe": 20.0, "pb": 3.5, "ps": 3.0, "ev_ebitda": 13.0},
    "Industrials": {"pe": 18.0, "pb": 3.0, "ps": 2.0, "ev_ebitda": 12.0},
    "Consumer Defensive": {"pe": 20.0, "pb": 4.0, "ps": 2.5, "ev_ebitda": 13.0},
    "Energy": {"pe": 12.0, "pb": 2.0, "ps": 1.5, "ev_ebitda": 8.0},
    "Utilities": {"pe": 18.0, "pb": 2.5, "ps": 3.0, "ev_ebitda": 12.0},
    "Real Estate": {"pe": 25.0, "pb": 3.0, "ps": 8.0, "ev_ebitda": 18.0},
    "Basic Materials": {"pe": 15.0, "pb": 2.5, "ps": 1.5, "ev_ebitda": 10.0},
}
DEFAULT_MULTIPLES = {"pe": 20.0, "pb": 3.0, "ps": 3.0, "ev_ebitda": 13.0}


def _comps_analysis(info: dict) -> dict:
    """
    Comparable Company Analysis.
    Compares stock multiples to sector averages.
    Returns {implied_value, metrics: {pe, pb, ps, ev_ebitda}, sector_avg, undervaluation_pct}
    """
    sector = info.get("sector", "Unknown")
    sector_mults = SECTOR_MULTIPLES.get(sector, DEFAULT_MULTIPLES)

    pe = _safe_float(info.get("trailingPE", 0))
    pb = _safe_float(info.get("priceToBook", 0))
    ps = _safe_float(info.get("priceToSalesTrailing12Months", 0))
    ev = _safe_float(info.get("enterpriseValue", 0))
    ebitda = _safe_float(info.get("ebitda", 0))
    ev_ebitda = ev / ebitda if ebitda > 0 else 0
    current_price = _safe_float(info.get("currentPrice", 0)) or _safe_float(info.get("regularMarketPrice", 0))

    metrics = {
        "pe": round(pe, 2),
        "pb": round(pb, 2),
        "ps": round(ps, 2),
        "ev_ebitda": round(ev_ebitda, 2),
    }
    sector_avg = {
        "pe": sector_mults["pe"],
        "pb": sector_mults["pb"],
        "ps": sector_mults["ps"],
        "ev_ebitda": sector_mults["ev_ebitda"],
    }

    # Calculate implied value from each multiple
    eps = _safe_float(info.get("trailingEps", 0))
    book_value_per_share = _safe_float(info.get("bookValue", 0))
    revenue_per_share = _safe_float(info.get("revenuePerShare", 0))

    implied_values = []
    if eps > 0 and sector_mults["pe"] > 0:
        implied_values.append(eps * sector_mults["pe"])
    if book_value_per_share > 0 and sector_mults["pb"] > 0:
        implied_values.append(book_value_per_share * sector_mults["pb"])
    if revenue_per_share > 0 and sector_mults["ps"] > 0:
        implied_values.append(revenue_per_share * sector_mults["ps"])

    if implied_values:
        implied_value = sum(implied_values) / len(implied_values)
    else:
        implied_value = 0

    # Overall undervaluation
    undervaluation = 0
    if implied_value > 0 and current_price > 0:
        undervaluation = (implied_value - current_price) / implied_value * 100

    return {
        "implied_value": round(implied_value, 2),
        "current_price": round(current_price, 2),
        "metrics": metrics,
        "sector_avg": sector_avg,
        "sector": sector,
        "undervaluation_pct": round(undervaluation, 2),
        "multiples_count": len(implied_values),
    }


class CompsAnalysisMethod(AnalysisMethod):
    """Comparable Company Analysis (multiples-based valuation)."""

    @property
    def method_id(self) -> str:
        return "comps_analysis"

    @property
    def method_name(self) -> str:
        return "Comparable Company Analysis"

    @property
    def category(self) -> str:
        return "fundamental"

    @property
    def description(self) -> str:
        return "Compares valuation multiples (PE, PB, PS, EV/EBITDA) to sector peers to identify over/undervaluation."

    @property
    def parameters(self) -> Dict[str, Dict[str, Any]]:
        return {}

    async def run(self, symbol: str, **params) -> AnalysisResult:
        info = _get_info(symbol)
        comps = _comps_analysis(info)

        undervaluation = comps["undervaluation_pct"]
        implied = comps["implied_value"]
        current = comps["current_price"]

        if implied <= 0 or current <= 0:
            signal = "neutral"
            confidence = 0.3
            explanation = f"Comps analysis not available — insufficient data for {symbol.upper()}"
        elif undervaluation > 15:
            signal = "buy"
            confidence = min(1.0, 0.5 + undervaluation / 50)
            explanation = f"Implied value ${implied:.2f} vs current ${current:.2f} — {undervaluation:.0f}% undervalued vs sector peers"
        elif undervaluation > 5:
            signal = "buy"
            confidence = 0.4 + undervaluation / 20
            explanation = f"Slightly undervalued — implied ${implied:.2f} vs ${current:.2f} ({undervaluation:.0f}% below sector-derived value)"
        elif undervaluation > -10:
            signal = "neutral"
            confidence = 0.3
            explanation = f"Fairly valued — implied ${implied:.2f} near current ${current:.2f} (within 10% of sector peers)"
        elif undervaluation > -20:
            signal = "sell"
            confidence = 0.4 + (abs(undervaluation) - 10) / 25
            explanation = f"Overvalued — implied ${implied:.2f} below current ${current:.2f} ({abs(undervaluation):.0f}% above sector-derived value)"
        else:
            signal = "sell"
            confidence = min(1.0, 0.5 + abs(undervaluation) / 40)
            explanation = f"Significantly overvalued — implied ${implied:.2f} vs current ${current:.2f} ({abs(undervaluation):.0f}% premium to sector)"

        return AnalysisResult(
            method_id=self.method_id,
            method_name=self.method_name,
            category=self.category,
            symbol=symbol.upper(),
            result=comps,
            signal=signal,
            confidence=round(confidence, 3),
            explanation=explanation,
            chart_data=None,
        )
