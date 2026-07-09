"""
Consensus Report Service - computes enriched consensus from analysis results.
"""

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from app.services.analysis import registry

logger = logging.getLogger("ultron-trading.analysis.consensus")


def _safe_float(val: Any, default: float = 0.0) -> float:
    """Safely convert value to float."""
    try:
        f = float(val)
        if f != f:  # NaN check
            return default
        return f
    except (ValueError, TypeError):
        return default


def _compute_risk_metrics(results: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Compute risk metrics from available analysis results.
    Uses available data where possible, provides estimates otherwise.
    """
    # Initialize defaults
    expected_return = 0.0
    volatility_estimate = 0.0
    sharpe_estimate = 0.0
    max_drawdown_estimate = 0.0
    var_95 = 0.0
    risk_reward_ratio = 0.0

    # Try to extract from DCF valuation
    for r in results:
        if r.get("method_id") == "dcf_valuation":
            result_data = r.get("result", {})
            # Use growth rate as proxy for expected return
            growth = _safe_float(result_data.get("growth_rate", 0)) / 100.0  # convert from %
            expected_return = growth  # simple approximation
            # Use discount rate for risk-free rate approximation
            discount = _safe_float(result_data.get("discount_rate", 10)) / 100.0
            # We'll use this later for Sharpe
            break

    # Estimate volatility from Bollinger Bands width if available
    bb_widths = []
    for r in results:
        if r.get("method_id") == "bollinger":
            result_data = r.get("result", {})
            bandwidth = _safe_float(result_data.get("bandwidth", 0))  # already %
            if bandwidth > 0:
                # Approximate volatility as bandwidth/2 (rough)
                bb_widths.append(bandwidth / 100.0)  # convert to decimal

    if bb_widths:
        volatility_estimate = sum(bb_widths) / len(bb_widths)

    # Compute Sharpe if we have expected return and volatility
    if volatility_estimate > 0:
        risk_free = 0.02  # assume 2% risk-free
        sharpe_estimate = (expected_return - risk_free) / volatility_estimate
        # Risk/reward ratio approximation
        if expected_return > risk_free:
            risk_reward_ratio = expected_return / (volatility_estimate * 2)  # simple

    # Max drawdown estimate - placeholder
    # Could be estimated from volatility assuming normal distribution
    max_drawdown_estimate = -volatility_estimate * 2  # rough 2-sigma downside

    # VaR 95% approximation (parametric)
    if volatility_estimate > 0:
        # For normal distribution, VaR 95% ≈ 1.65 * volatility
        var_95 = -1.65 * volatility_estimate

    return {
        "expected_return": round(expected_return, 4),
        "volatility_estimate": round(volatility_estimate, 4),
        "sharpe_estimate": round(sharpe_estimate, 2),
        "max_drawdown_estimate": round(max_drawdown_estimate, 4),
        "var_95": round(var_95, 4),
        "risk_reward_ratio": round(risk_reward_ratio, 2),
    }
def _compute_signal_distribution(results: List[Dict[str, Any]]) -> Dict[str, int]:
    """Count signals across all results."""
    counts = {"buy": 0, "sell": 0, "hold": 0, "neutral": 0}
    for r in results:
        signal = r.get("signal", "neutral")
        if signal in counts:
            counts[signal] += 1
    return counts


def _compute_category_consensus(results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Compute consensus per category with quality-adjusted weights."""
    # Group by category
    by_category: Dict[str, List[Dict[str, Any]]] = {}
    for r in results:
        cat = r.get("category", "unknown")
        by_category.setdefault(cat, []).append(r)

    # Determine method quality: real methods = 1.0, stub methods = 0.2
    # For simplicity, treat all methods as real (quality = 1.0) since we have no stub indicators.
    # If we had a way to detect stubs, we could adjust.
    def method_quality(method_id: str) -> float:
        # Placeholder: if method_id contains "stub" treat as stub
        if isinstance(method_id, str) and "stub" in method_id.lower():
            return 0.2
        return 1.0

    # Precompute quality-adjusted confidence for each method
    quality_confidence = []
    for r in results:
        confidence = _safe_float(r.get("confidence", 0))
        quality = method_quality(r.get("method_id", ""))
        quality_confidence.append(confidence * quality)
    total_qc = sum(quality_confidence)

    categories = []
    for category, methods in by_category.items():
        if not methods:
            continue

        # Compute signal counts
        signal_counts = _compute_signal_distribution(methods)
        buy = signal_counts["buy"]
        sell = signal_counts["sell"]
        hold = signal_counts["hold"]
        neutral = signal_counts["neutral"]

        # Compute weighted signal (-100 to +100) using quality-adjusted confidence
        weighted_sum = 0.0
        total_weight = 0.0
        for m in methods:
            confidence = _safe_float(m.get("confidence", 0))
            quality = method_quality(m.get("method_id", ""))
            weighted_confidence = confidence * quality
            signal = m.get("signal", "neutral")
            if signal == "buy":
                signal_val = 100
            elif signal == "sell":
                signal_val = -100
            elif signal == "hold":
                signal_val = 20
            else:  # neutral
                signal_val = 0
            weighted_sum += signal_val * weighted_confidence
            total_weight += weighted_confidence

        weighted_signal = 0.0
        if total_weight > 0:
            weighted_signal = weighted_sum / total_weight

        # Average confidence (unweighted)
        avg_confidence = sum(_safe_float(m.get("confidence", 0)) for m in methods) / len(methods)

        # Build method summaries
        method_summaries = []
        for m in methods:
            method_summaries.append({
                "method_id": m.get("method_id", ""),
                "method_name": m.get("method_name", ""),
                "signal": m.get("signal", "neutral"),
                "confidence": _safe_float(m.get("confidence", 0)),
                "key_result": _extract_key_result(m),
            })

        # Category weight: proportion of quality-adjusted confidence
        category_qc = sum(_safe_float(m.get("confidence", 0)) * method_quality(m.get("method_id", "")) for m in methods)
        weight = (category_qc / total_qc) if total_qc > 0 else 0.0

        categories.append({
            "category": category,
            "weight": round(weight, 3),
            "score": round(weighted_signal, 2),
            "confidence": round(avg_confidence, 3),
            "signal_counts": signal_counts,
            "methods": method_summaries,
        })

    # Sort categories by predefined order for consistency
    category_order = ["technical", "fundamental", "sentiment", "ml", "quant"]
    def cat_order_key(cat_dict):
        cat = cat_dict["category"]
        try:
            return category_order.index(cat)
        except ValueError:
            return len(category_order)  # unknown categories go to end
    categories.sort(key=cat_order_key)

    return categories
def _extract_key_result(result: Dict[str, Any]) -> str:
    """Extract a human-readable key result from analysis result."""
    method_id = result.get("method_id", "")
    res = result.get("result", {})

    # Map common method IDs to key fields
    key_fields = {
        "rsi": "rsi",
        "macd": "macd",
        "bollinger": "bandwidth",
        "sma": "sma",
        "ema": "ema",
        "pe_ratio": "pe_ratio",
        "roe": "roe",
        "debt_to_equity": "debt_to_equity",
        "profit_margin": "profit_margin",
        "dcf_valuation": "fair_value",
        "comps_analysis": "implied_value",
        "markowitz": "sharpe_ratio",
        "capm": "alpha",
        "var": "value_at_risk",
        "news_sentiment": "sentiment_score",
    }

    field = key_fields.get(method_id)
    if field and field in res:
        val = res[field]
        if isinstance(val, float):
            # Format based on field
            if field in ["rsi", "pe_ratio", "roe"]:
                return f"{val:.1f}"
            elif field in ["bandwidth", "sharpe_ratio", "alpha"]:
                return f"{val:.2f}"
            elif field in ["fair_value", "implied_value"]:
                return f"${val:.2f}"
            elif field == "value_at_risk":
                return f"${val:,.0f}"
            elif field == "sentiment_score":
                return f"{val:+.2f}"
            else:
                return str(val)
        else:
            return str(val)

    # Fallback: show first few fields
    if res:
        items = list(res.items())[:2]
        return ", ".join(f"{k}={v}" for k, v in items)
    return "N/A"


def compute_consensus(results: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Compute enriched consensus report from analysis results.

    Args:
        results: List of analysis result dicts from registry.run_all()

    Returns:
        Consensus report dict ready for API response
    """
    if not results:
        return {
            "symbol": "UNKNOWN",
            "computed_at": "",
            "overall": {
                "score": 0,
                "verdict": "HOLD",
                "confidence": 0.0,
                "signal_distribution": {"buy": 0, "sell": 0, "hold": 0, "neutral": 0},
            },
            "categories": [],
            "risk_metrics": {
                "expected_return": 0.0,
                "volatility_estimate": 0.0,
                "sharpe_estimate": 0.0,
                "max_drawdown_estimate": 0.0,
                "var_95": 0.0,
                "risk_reward_ratio": 0.0,
            },
            "key_metrics": [],
            "insights": [],
            "conflicts": [],
            "chart_data": {},
            "method_details": [],
        }

    # Extract symbol from first result
    symbol = results[0].get("symbol", "UNKNOWN").upper()

    # Compute signal distribution
    signal_dist = _compute_signal_distribution(results)
    total = len(results)
    buy_pct = signal_dist["buy"] / total if total > 0 else 0
    sell_pct = signal_dist["sell"] / total if total > 0 else 0
    hold_pct = signal_dist["hold"] / total if total > 0 else 0
    neutral_pct = signal_dist["neutral"] / total if total > 0 else 0

    # Compute overall weighted score (-100 to +100) using quality-adjusted confidence
    weighted_sum = 0.0
    total_weight = 0.0
    for r in results:
        confidence = _safe_float(r.get("confidence", 0))
        quality = 1.0  # default quality; could be refined with stub detection
        weighted_confidence = confidence * quality
        signal = r.get("signal", "neutral")
        if signal == "buy":
            signal_val = 100
        elif signal == "sell":
            signal_val = -100
        elif signal == "hold":
            signal_val = 20
        else:  # neutral
            signal_val = 0
        weighted_sum += signal_val * weighted_confidence
        total_weight += weighted_confidence

    overall_score = 0.0
    if total_weight > 0:
        overall_score = weighted_sum / total_weight

    # Determine verdict
    if overall_score >= 60:
        verdict = "STRONG_BUY"
    elif overall_score >= 25:
        verdict = "BUY"
    elif overall_score >= -25:
        verdict = "HOLD"
    elif overall_score >= -60:
        verdict = "SELL"
    else:
        verdict = "STRONG_SELL"

    # Overall confidence (average)
    avg_confidence = sum(_safe_float(r.get("confidence", 0)) for r in results) / total if total > 0 else 0

    # Compute category consensus
    categories = _compute_category_consensus(results)

    # Compute risk metrics
    risk_metrics = _compute_risk_metrics(results)

    # Build key metrics KPIs
    key_metrics = []
    # Consensus score
    key_metrics.append({
        "label": "Consensus Score",
        "value": f"{overall_score:+.0f}",
        "trend": "up" if overall_score > 0 else "down" if overall_score < 0 else "neutral",
    })
    # Average confidence
    key_metrics.append({
        "label": "Avg Confidence",
        "value": f"{avg_confidence*100:.0f}%",
        "trend": "neutral",
    })
    # Methods run
    key_metrics.append({
        "label": "Methods Run",
        "value": f"{len(results)}/15",
        "trend": "neutral",
    })
    # Add risk metrics if meaningful
    if risk_metrics["sharpe_estimate"] != 0:
        key_metrics.append({
            "label": "Sharpe Ratio",
            "value": f"{risk_metrics['sharpe_estimate']:.2f}",
            "trend": "up" if risk_metrics['sharpe_estimate'] > 1 else "down",
        })
    if risk_metrics["var_95"] != 0:
        key_metrics.append({
            "label": "VaR 95%",
            "value": f"{risk_metrics['var_95']*100:.1f}%",
            "trend": "down",  # risk is negative
        })

    # Generate insights
    insights = []
    # Bullish insights
    if signal_dist["buy"] > signal_dist["sell"]:
        insights.append({
            "type": "bullish",
            "title": "Bullish Consensus",
            "description": f"{signal_dist['buy']} methods signal buy vs {signal_dist['sell']} sell",
            "confidence": min(0.95, 0.5 + (buy_pct - sell_pct)),
            "supporting_methods": [r.get("method_id", "") for r in results if r.get("signal") == "buy"][:3],
        })
    # Bearish insights
    if signal_dist["sell"] > signal_dist["buy"]:
        insights.append({
            "type": "bearish",
            "title": "Bearish Consensus",
            "description": f"{signal_dist['sell']} methods signal sell vs {signal_dist['buy']} buy",
            "confidence": min(0.95, 0.5 + (sell_pct - buy_pct)),
            "supporting_methods": [r.get("method_id", "") for r in results if r.get("signal") == "sell"][:3],
        })
    # High confidence insight
    if avg_confidence > 0.7:
        insights.append({
            "type": "bullish",
            "title": "High Confidence",
            "description": f"Average method confidence is {avg_confidence*100:.0f}%",
            "confidence": avg_confidence,
            "supporting_methods": [],
        })
    # Low confidence insight
    if avg_confidence < 0.4:
        insights.append({
            "type": "bearish",
            "title": "Low Confidence",
            "description": f"Average method confidence is only {avg_confidence*100:.0f}%",
            "confidence": 1 - avg_confidence,
            "supporting_methods": [],
        })
    # Neutral insight (when signals are balanced)
    if abs(buy_pct - sell_pct) < 0.15 and abs(buy_pct - hold_pct) < 0.15 and abs(sell_pct - hold_pct) < 0.15:
        insights.append({
            "type": "neutral",
            "title": "Neutral Market",
            "description": "Signals are mixed with no clear directional bias",
            "confidence": 0.5,
            "supporting_methods": [],
        })
    # Risk insight (high volatility)
    if risk_metrics["volatility_estimate"] > 0.3:  # 30% volatility threshold
        insights.append({
            "type": "risk",
            "title": "High Volatility",
            "description": f"Estimated volatility of {risk_metrics['volatility_estimate']*100:.1f}% suggests elevated risk",
            "confidence": min(0.9, risk_metrics['volatility_estimate'] * 2),  # simple scaling
            "supporting_methods": [],
        })
    # Opportunity insight (high Sharpe)
    if risk_metrics["sharpe_estimate"] > 1.5:
        insights.append({
            "type": "opportunity",
            "title": "Attractive Risk-Adjusted Return",
            "description": f"Sharpe ratio of {risk_metrics['sharpe_estimate']:.2f} indicates attractive risk-adjusted returns",
            "confidence": min(0.9, risk_metrics['sharpe_estimate'] / 3),  # simple scaling
            "supporting_methods": [],
        })
    # Opportunity insight (high expected return)
    if risk_metrics["expected_return"] > 0.15:  # 15% expected return
        insights.append({
            "type": "opportunity",
            "title": "High Expected Return",
            "description": f"Expected return of {risk_metrics['expected_return']*100:.1f}% suggests strong growth potential",
            "confidence": min(0.9, risk_metrics['expected_return'] * 3),  # simple scaling
            "supporting_methods": [],
        })

    # Generate conflicts
    conflicts = []
    # Check technical vs fundamental divergence
    tech_score = None
    fund_score = None
    for cat in categories:
        if cat["category"] == "technical":
            tech_score = cat["score"]
        elif cat["category"] == "fundamental":
            fund_score = cat["score"]
    if tech_score is not None and fund_score is not None:
        diff = tech_score - fund_score
        if diff > 40:  # technical much more bullish
            conflicts.append({
                "type": "divergence",
                "categories": ["technical", "fundamental"],
                "description": "Technical indicators are bullish while fundamentals suggest caution",
                "severity": "medium" if diff < 60 else "high",
            })
        elif diff < -40:  # fundamental much more bullish
            conflicts.append({
                "type": "divergence",
                "categories": ["technical", "fundamental"],
                "description": "Fundamentals are bullish while technicals show weakness",
                "severity": "medium" if abs(diff) < 60 else "high",
            })

    # Check sentiment vs fundamentals
    sent_score = None
    for cat in categories:
        if cat["category"] == "sentiment":
            sent_score = cat["score"]
    if sent_score is not None and fund_score is not None:
        diff = sent_score - fund_score
        if diff > 30:
            conflicts.append({
                "type": "divergence",
                "categories": ["sentiment", "fundamental"],
                "description": "Market sentiment is overly positive compared to fundamentals",
                "severity": "medium",
            })
        elif diff < -30:
            conflicts.append({
                "type": "divergence",
                "categories": ["sentiment", "fundamental"],
                "description": "Market sentiment is negative despite strong fundamentals",
                "severity": "medium",
            })

    # Check for contradiction (strong buy vs strong sell within same category)
    # For simplicity, we already capture divergence; could add contradiction detection.

    # Build method details
    method_details = []
    for r in results:
        method_details.append({
            "method_id": r.get("method_id", ""),
            "method_name": r.get("method_name", ""),
            "category": r.get("category", ""),
            "signal": r.get("signal", "neutral"),
            "confidence": _safe_float(r.get("confidence", 0)),
            "key_result": _extract_key_result(r),
            "weight_in_consensus": _safe_float(r.get("confidence", 0)) / total_weight if total_weight > 0 else 0,
            "quality_score": 1.0,  # placeholder
        })

    # Build chart data (simplified for now - frontend will compute from results)
    chart_data = {
        "signal_distribution": signal_dist,
        "method_confidences": [_safe_float(r.get("confidence", 0)) for r in results],
        "category_scores": [{"category": c["category"], "score": c["score"]} for c in categories],
        "risk_metrics": risk_metrics,
    }

    return {
        "symbol": symbol,
        "computed_at": "",  # Will be set by endpoint
        "overall": {
            "score": round(overall_score, 2),
            "verdict": verdict,
            "confidence": round(avg_confidence, 3),
            "signal_distribution": signal_dist,
        },
        "categories": categories,
        "risk_metrics": risk_metrics,
        "key_metrics": key_metrics,
        "insights": insights,
        "conflicts": conflicts,
        "chart_data": chart_data,
        "method_details": method_details,
    }