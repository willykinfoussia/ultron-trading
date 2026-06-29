"""
Technical Analysis Methods

Implements RSI, MACD, Bollinger Bands, SMA, and EMA using the `ta` library
with yfinance for price data fetching.
"""

import math
from datetime import datetime
from typing import Any, Dict, Optional

import pandas as pd
import ta
import yfinance as yf

from .base import AnalysisMethod, AnalysisResult

import logging

logger = logging.getLogger("ultron-trading.analysis.technical")


def _safe_float(val, default=0.0):
    """Convert value to float, replacing NaN/Inf with default."""
    try:
        f = float(val)
        if math.isnan(f) or math.isinf(f):
            return default
        return f
    except (TypeError, ValueError):
        return default


def _fetch_prices(symbol: str, period: str = "3mo", interval: str = "1d") -> pd.DataFrame:
    """Fetch historical price data via yfinance and return OHLCV DataFrame."""
    ticker = yf.Ticker(symbol.upper())
    hist = ticker.history(period=period, interval=interval)
    if hist.empty:
        raise ValueError(f"No historical data found for {symbol}")
    return hist


def _rsi_signal(rsi_val: float) -> tuple:
    """Determine signal and confidence from RSI value."""
    if rsi_val <= 30:
        confidence = min(1.0, (30 - rsi_val) / 30 + 0.5)
        return "buy", confidence, f"RSI at {rsi_val:.1f} indicates oversold conditions"
    elif rsi_val >= 70:
        confidence = min(1.0, (rsi_val - 70) / 30 + 0.5)
        return "sell", confidence, f"RSI at {rsi_val:.1f} indicates overbought conditions"
    else:
        confidence = 0.3 + 0.2 * (1 - abs(rsi_val - 50) / 20)
        return "neutral", confidence, f"RSI at {rsi_val:.1f} is in neutral territory"


def _macd_signal(macd_val: float, signal_val: float, hist_val: float, price: float = 100.0) -> tuple:
    """Determine signal and confidence from MACD values. Confidence normalized by price."""
    if macd_val > signal_val and hist_val > 0:
        # Normalize histogram as % of price for confidence calibration
        normalized_hist = abs(hist_val) / price * 100 if price > 0 else 0
        confidence = min(0.90, 0.5 + normalized_hist * 3)
        return "buy", confidence, f"MACD ({macd_val:.3f}) above signal ({signal_val:.3f}), positive histogram ({hist_val:.3f})"
    elif macd_val < signal_val and hist_val < 0:
        normalized_hist = abs(hist_val) / price * 100 if price > 0 else 0
        confidence = min(0.90, 0.5 + normalized_hist * 3)
        return "sell", confidence, f"MACD ({macd_val:.3f}) below signal ({signal_val:.3f}), negative histogram ({hist_val:.3f})"
    else:
        return "neutral", 0.3, f"MACD ({macd_val:.3f}) near signal ({signal_val:.3f}), histogram ({hist_val:.3f})"


def _bb_signal(price: float, upper: float, lower: float, middle: float) -> tuple:
    """Determine signal and confidence from Bollinger Band position."""
    if price <= lower:
        confidence = min(1.0, (lower - price) / (middle - lower + 1e-10) * 0.5 + 0.5)
        return "buy", confidence, f"Price ({price:.2f}) at/below lower Bollinger Band ({lower:.2f})"
    elif price >= upper:
        confidence = min(1.0, (price - upper) / (upper - middle + 1e-10) * 0.5 + 0.5)
        return "sell", confidence, f"Price ({price:.2f}) at/above upper Bollinger Band ({upper:.2f})"
    else:
        position = (price - lower) / (upper - lower + 1e-10)
        if position < 0.4:
            return "neutral", 0.3, f"Price ({price:.2f}) in lower half of Bollinger Bands ({lower:.2f}-{upper:.2f})"
        elif position > 0.6:
            return "neutral", 0.3, f"Price ({price:.2f}) in upper half of Bollinger Bands ({lower:.2f}-{upper:.2f})"
        else:
            return "neutral", 0.2, f"Price ({price:.2f}) near middle of Bollinger Bands ({middle:.2f})"


class RSIMethod(AnalysisMethod):
    """Relative Strength Index (RSI) analysis."""

    @property
    def method_id(self) -> str:
        return "rsi"

    @property
    def method_name(self) -> str:
        return "Relative Strength Index"

    @property
    def category(self) -> str:
        return "technical"

    @property
    def description(self) -> str:
        return "Measures momentum on a 0-100 scale. Values below 30 suggest oversold (buy), above 70 suggest overbought (sell)."

    @property
    def parameters(self) -> Dict[str, Dict[str, Any]]:
        return {
            "period": {"type": "int", "default": 14, "min": 2, "max": 100, "description": "Lookback period"},
            "period_data": {"type": "str", "default": "3mo", "description": "Historical data range (yfinance format)"},
        }

    async def run(self, symbol: str, **params) -> AnalysisResult:
        period = int(params.get("period", 14))
        period_data = params.get("period_data", "3mo")

        hist = _fetch_prices(symbol, period=period_data)
        rsi_indicator = ta.momentum.RSIIndicator(close=hist["Close"], window=period, fillna=False)
        rsi_series = rsi_indicator.rsi()
        current_rsi = _safe_float(rsi_series.iloc[-1], 50.0)

        signal, confidence, explanation = _rsi_signal(current_rsi)

        # Build chart_data: RSI values for last 60 days
        recent_rsi = rsi_series.tail(60)
        chart_data = {
            "type": "indicator",
            "indicator": "RSI",
            "period": period,
            "values": [
                {"date": str(idx), "rsi": _safe_float(v)}
                for idx, v in recent_rsi.items()
            ],
            "overbought": 70,
            "oversold": 30,
        }

        return AnalysisResult(
            method_id=self.method_id,
            method_name=self.method_name,
            category=self.category,
            symbol=symbol.upper(),
            result={
                "rsi": current_rsi,
                "period": period,
            },
            signal=signal,
            confidence=round(confidence, 3),
            explanation=explanation,
            chart_data=chart_data,
        )


class MACDMethod(AnalysisMethod):
    """Moving Average Convergence Divergence (MACD) analysis."""

    @property
    def method_id(self) -> str:
        return "macd"

    @property
    def method_name(self) -> str:
        return "Moving Average Convergence Divergence"

    @property
    def category(self) -> str:
        return "technical"

    @property
    def description(self) -> str:
        return "Trend-following momentum indicator showing relationship between two EMAs of price."

    @property
    def parameters(self) -> Dict[str, Dict[str, Any]]:
        return {
            "fast": {"type": "int", "default": 12, "min": 2, "max": 100},
            "slow": {"type": "int", "default": 26, "min": 2, "max": 200},
            "signal": {"type": "int", "default": 9, "min": 2, "max": 50},
            "period_data": {"type": "str", "default": "3mo"},
        }

    async def run(self, symbol: str, **params) -> AnalysisResult:
        fast = int(params.get("fast", 12))
        slow = int(params.get("slow", 26))
        signal_period = int(params.get("signal", 9))
        period_data = params.get("period_data", "3mo")

        hist = _fetch_prices(symbol, period=period_data)
        macd_indicator = ta.trend.MACD(
            close=hist["Close"], window_slow=slow, window_fast=fast, window_sign=signal_period, fillna=False
        )
        macd_val = _safe_float(macd_indicator.macd().iloc[-1])
        signal_val = _safe_float(macd_indicator.macd_signal().iloc[-1])
        hist_val = _safe_float(macd_indicator.macd_diff().iloc[-1])
        current_price = _safe_float(hist["Close"].iloc[-1])

        signal, confidence, explanation = _macd_signal(macd_val, signal_val, hist_val, price=current_price)

        # Chart data: MACD line, signal line, histogram (last 60 days)
        macd_series = macd_indicator.macd().tail(60)
        sig_series = macd_indicator.macd_signal().tail(60)
        hist_series = macd_indicator.macd_diff().tail(60)

        chart_data = {
            "type": "indicator",
            "indicator": "MACD",
            "macd_line": [{"date": str(idx), "value": _safe_float(v)} for idx, v in macd_series.items()],
            "signal_line": [{"date": str(idx), "value": _safe_float(v)} for idx, v in sig_series.items()],
            "histogram": [{"date": str(idx), "value": _safe_float(v)} for idx, v in hist_series.items()],
            "params": {"fast": fast, "slow": slow, "signal": signal_period},
        }

        return AnalysisResult(
            method_id=self.method_id,
            method_name=self.method_name,
            category=self.category,
            symbol=symbol.upper(),
            result={
                "macd": macd_val,
                "signal": signal_val,
                "histogram": hist_val,
                "fast": fast,
                "slow": slow,
                "signal_period": signal_period,
            },
            signal=signal,
            confidence=round(confidence, 3),
            explanation=explanation,
            chart_data=chart_data,
        )


class BollingerBandsMethod(AnalysisMethod):
    """Bollinger Bands analysis."""

    @property
    def method_id(self) -> str:
        return "bollinger"

    @property
    def method_name(self) -> str:
        return "Bollinger Bands"

    @property
    def category(self) -> str:
        return "technical"

    @property
    def description(self) -> str:
        return "Price-based bands showing volatility. Price near lower band suggests buy; near upper band suggests sell."

    @property
    def parameters(self) -> Dict[str, Dict[str, Any]]:
        return {
            "period": {"type": "int", "default": 20, "min": 5, "max": 100},
            "std_dev": {"type": "float", "default": 2.0, "min": 0.5, "max": 5.0},
            "period_data": {"type": "str", "default": "3mo"},
        }

    async def run(self, symbol: str, **params) -> AnalysisResult:
        period = int(params.get("period", 20))
        std_dev = float(params.get("std_dev", 2.0))
        period_data = params.get("period_data", "3mo")

        hist = _fetch_prices(symbol, period=period_data)
        bb = ta.volatility.BollingerBands(
            close=hist["Close"], window=period, window_dev=std_dev, fillna=False
        )
        upper = _safe_float(bb.bollinger_hband().iloc[-1])
        lower = _safe_float(bb.bollinger_lband().iloc[-1])
        middle = _safe_float(bb.bollinger_mavg().iloc[-1])
        current_price = _safe_float(hist["Close"].iloc[-1])

        signal, confidence, explanation = _bb_signal(current_price, upper, lower, middle)

        # Chart data: price + bands (last 60 days)
        close_recent = hist["Close"].tail(60)
        upper_recent = bb.bollinger_hband().tail(60)
        lower_recent = bb.bollinger_lband().tail(60)
        middle_recent = bb.bollinger_mavg().tail(60)

        chart_data = {
            "type": "overlay",
            "indicator": "Bollinger Bands",
            "price": [{"date": str(idx), "close": _safe_float(v)} for idx, v in close_recent.items()],
            "upper": [{"date": str(idx), "value": _safe_float(v)} for idx, v in upper_recent.items()],
            "lower": [{"date": str(idx), "value": _safe_float(v)} for idx, v in lower_recent.items()],
            "middle": [{"date": str(idx), "value": _safe_float(v)} for idx, v in middle_recent.items()],
            "params": {"period": period, "std_dev": std_dev},
        }

        return AnalysisResult(
            method_id=self.method_id,
            method_name=self.method_name,
            category=self.category,
            symbol=symbol.upper(),
            result={
                "upper_band": round(upper, 2),
                "middle_band": round(middle, 2),
                "lower_band": round(lower, 2),
                "current_price": round(current_price, 2),
                "bandwidth": round((upper - lower) / middle * 100, 2) if middle else 0,
                "period": period,
                "std_dev": std_dev,
            },
            signal=signal,
            confidence=round(confidence, 3),
            explanation=explanation,
            chart_data=chart_data,
        )


class SMAMethod(AnalysisMethod):
    """Simple Moving Average analysis."""

    @property
    def method_id(self) -> str:
        return "sma"

    @property
    def method_name(self) -> str:
        return "Simple Moving Average"

    @property
    def category(self) -> str:
        return "technical"

    @property
    def description(self) -> str:
        return "Average price over N periods. Buy signal when price crosses above SMA, sell when below."

    @property
    def parameters(self) -> Dict[str, Dict[str, Any]]:
        return {
            "period": {"type": "int", "default": 20, "min": 5, "max": 200},
            "period_data": {"type": "str", "default": "3mo"},
        }

    async def run(self, symbol: str, **params) -> AnalysisResult:
        period = int(params.get("period", 20))
        period_data = params.get("period_data", "3mo")

        hist = _fetch_prices(symbol, period=period_data)
        sma_indicator = ta.trend.SMAIndicator(close=hist["Close"], window=period, fillna=False)
        sma_series = sma_indicator.sma_indicator()
        current_sma = _safe_float(sma_series.iloc[-1])
        current_price = _safe_float(hist["Close"].iloc[-1])

        if current_price > current_sma * 1.02:
            signal = "buy"
            confidence = min(1.0, 0.5 + (current_price / current_sma - 1) * 5)
            explanation = f"Price ({current_price:.2f}) above SMA({period}) ({current_sma:.2f}) - bullish"
        elif current_price < current_sma * 0.98:
            signal = "sell"
            confidence = min(1.0, 0.5 + (1 - current_price / current_sma) * 5)
            explanation = f"Price ({current_price:.2f}) below SMA({period}) ({current_sma:.2f}) - bearish"
        else:
            signal = "neutral"
            confidence = 0.3
            explanation = f"Price ({current_price:.2f}) near SMA({period}) ({current_sma:.2f}) - neutral"

        # Chart data: price + SMA overlay (last 60 days)
        recent_close = hist["Close"].tail(60)
        recent_sma = sma_series.tail(60)

        chart_data = {
            "type": "overlay",
            "indicator": "SMA",
            "price": [{"date": str(idx), "close": _safe_float(v)} for idx, v in recent_close.items()],
            "sma": [{"date": str(idx), "value": _safe_float(v)} for idx, v in recent_sma.items()],
            "period": period,
        }

        return AnalysisResult(
            method_id=self.method_id,
            method_name=self.method_name,
            category=self.category,
            symbol=symbol.upper(),
            result={
                "sma": round(current_sma, 2),
                "current_price": round(current_price, 2),
                "period": period,
                "difference_pct": round((current_price / current_sma - 1) * 100, 2) if current_sma else 0,
            },
            signal=signal,
            confidence=round(confidence, 3),
            explanation=explanation,
            chart_data=chart_data,
        )


class EMAMethod(AnalysisMethod):
    """Exponential Moving Average analysis."""

    @property
    def method_id(self) -> str:
        return "ema"

    @property
    def method_name(self) -> str:
        return "Exponential Moving Average"

    @property
    def category(self) -> str:
        return "technical"

    @property
    def description(self) -> str:
        return "Exponentially weighted average that reacts faster to price changes than SMA."

    @property
    def parameters(self) -> Dict[str, Dict[str, Any]]:
        return {
            "period": {"type": "int", "default": 21, "min": 5, "max": 200},
            "period_data": {"type": "str", "default": "3mo"},
        }

    async def run(self, symbol: str, **params) -> AnalysisResult:
        period = int(params.get("period", 21))
        period_data = params.get("period_data", "3mo")

        hist = _fetch_prices(symbol, period=period_data)
        ema_indicator = ta.trend.EMAIndicator(close=hist["Close"], window=period, fillna=False)
        ema_series = ema_indicator.ema_indicator()
        current_ema = _safe_float(ema_series.iloc[-1])
        current_price = _safe_float(hist["Close"].iloc[-1])

        if current_price > current_ema * 1.02:
            signal = "buy"
            confidence = min(1.0, 0.5 + (current_price / current_ema - 1) * 5)
            explanation = f"Price ({current_price:.2f}) above EMA({period}) ({current_ema:.2f}) - bullish"
        elif current_price < current_ema * 0.98:
            signal = "sell"
            confidence = min(1.0, 0.5 + (1 - current_price / current_ema) * 5)
            explanation = f"Price ({current_price:.2f}) below EMA({period}) ({current_ema:.2f}) - bearish"
        else:
            signal = "neutral"
            confidence = 0.3
            explanation = f"Price ({current_price:.2f}) near EMA({period}) ({current_ema:.2f}) - neutral"

        # Chart data: price + EMA overlay (last 60 days)
        recent_close = hist["Close"].tail(60)
        recent_ema = ema_series.tail(60)

        chart_data = {
            "type": "overlay",
            "indicator": "EMA",
            "price": [{"date": str(idx), "close": _safe_float(v)} for idx, v in recent_close.items()],
            "ema": [{"date": str(idx), "value": _safe_float(v)} for idx, v in recent_ema.items()],
            "period": period,
        }

        return AnalysisResult(
            method_id=self.method_id,
            method_name=self.method_name,
            category=self.category,
            symbol=symbol.upper(),
            result={
                "ema": round(current_ema, 2),
                "current_price": round(current_price, 2),
                "period": period,
                "difference_pct": round((current_price / current_ema - 1) * 100, 2) if current_ema else 0,
            },
            signal=signal,
            confidence=round(confidence, 3),
            explanation=explanation,
            chart_data=chart_data,
        )
