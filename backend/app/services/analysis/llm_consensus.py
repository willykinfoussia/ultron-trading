"""
LLM Consensus Analyst — sends the full consensus report to Hermes API
for a dynamic investment thesis (verdict + analysis + UI blocks).

Falls back to a rule-based summary if the LLM is unavailable.
"""

import json
import logging
import os
from typing import Any, Dict, List, Optional

import httpx
from httpcore import TimeoutException

logger = logging.getLogger("ultron-trading.analysis.llm_consensus")

# Hermes API endpoint (via ultron-controller proxy) — same as sentiment_scorer
HERMES_API_URL = os.environ.get(
    "HERMES_API_URL", "http://localhost:9000/api/hermes_api/v1/chat/completions"
)
HERMES_MODEL = os.environ.get("CONSENSUS_MODEL", None)  # None = default model

AI_SYSTEM_PROMPT = """You are a senior financial analyst. You receive a structured consensus report
from a quantitative analysis engine covering technical, fundamental, sentiment and quantitative methods
for a single stock.

Your job:
1. Produce an investment verdict (STRONG_BUY, BUY, HOLD, SELL, STRONG_SELL).
2. Explain your reasoning clearly.
3. Build a DYNAMIC UI report using blocks that the frontend will render.

Block types you can use (output as JSON array `blocks`):
- {"type": "text", "title": string, "content": string}  -> narrative paragraph
- {"type": "indicator", "label": string, "value": string, "status": "positive"|"negative"|"neutral"} -> KPI chip
- {"type": "chart", "chart_type": "bar"|"pie"|"line", "title": string, "data": [{"name": string, "value": number}]} -> chart
- {"type": "risk_gauge", "title": string, "score": number} -> gauge (-100..+100)
- {"type": "table", "headers": [string], "rows": [[string]]} -> table

Guidelines:
- Be objective, concise, and avoid hedging.
- Use the provided method_details, risk_metrics and conflicts to ground your analysis.
- The `buy_thesis` and `sell_thesis` must be 1-3 sentences each.
- Include at least 3 blocks (mix of text, indicator, chart, table).
- Output ONLY valid JSON matching the schema below. No markdown, no commentary.

JSON schema:
{
  "verdict": "STRONG_BUY|BUY|HOLD|SELL|STRONG_SELL",
  "confidence": 0.0-1.0,
  "summary": "2-3 sentence synthesis",
  "buy_thesis": "why to buy",
  "sell_thesis": "why to avoid / risks",
  "blocks": [ ... ]
}"""

AI_USER_PROMPT_TEMPLATE = """Consensus report for {symbol}:

OVERALL:
- Score: {score} / 100
- Verdict (engine): {verdict}
- Confidence: {confidence}

CATEGORIES:
{categories_block}

RISK METRICS:
{risk_block}

KEY METRICS:
{key_metrics_block}

INSIGHTS:
{insights_block}

CONFLICTS:
{conflicts_block}

METHOD DETAILS ({method_count} methods):
{methods_block}

Produce the investment report JSON now."""


def _build_categories_block(categories: List[Dict[str, Any]]) -> str:
    lines = []
    for c in categories:
        lines.append(
            f"- {c.get('category')}: score={c.get('score')}, "
            f"confidence={c.get('confidence')}, "
            f"signals=buy:{c.get('signal_counts', {}).get('buy')}/"
            f"sell:{c.get('signal_counts', {}).get('sell')}/"
            f"hold:{c.get('signal_counts', {}).get('hold')}/"
            f"neutral:{c.get('signal_counts', {}).get('neutral')}"
        )
    return "\n".join(lines) if lines else "- none"


def _build_risk_block(risk: Dict[str, Any]) -> str:
    if not risk:
        return "- none"
    items = [
        f"Expected Return: {risk.get('expected_return')}",
        f"Volatility: {risk.get('volatility_estimate')}",
        f"Sharpe: {risk.get('sharpe_estimate')}",
        f"Max Drawdown: {risk.get('max_drawdown_estimate')}",
        f"VaR 95%: {risk.get('var_95')}",
        f"Risk/Reward: {risk.get('risk_reward_ratio')}",
    ]
    return "\n".join(f"- {i}" for i in items)


def _build_key_metrics_block(kpis: List[Dict[str, Any]]) -> str:
    if not kpis:
        return "- none"
    return "\n".join(f"- {k.get('label')}: {k.get('value')}" for k in kpis)


def _build_insights_block(insights: List[Dict[str, Any]]) -> str:
    if not insights:
        return "- none"
    return "\n".join(f"- [{i.get('type')}] {i.get('title')}: {i.get('description')}" for i in insights)


def _build_conflicts_block(conflicts: List[Dict[str, Any]]) -> str:
    if not conflicts:
        return "- none"
    return "\n".join(
        f"- [{c.get('severity')}] {c.get('description')} (cats: {', '.join(c.get('categories', []))})"
        for c in conflicts
    )


def _build_methods_block(methods: List[Dict[str, Any]]) -> str:
    lines = []
    for m in methods:
        lines.append(
            f"- {m.get('method_name')} [{m.get('category')}]: "
            f"signal={m.get('signal')}, confidence={m.get('confidence')}, "
            f"key={m.get('key_result')}"
        )
    # Truncate to keep prompt manageable for LLM
    text = "\n".join(lines) if lines else "- none"
    if len(text) > 2500:
        text = text[:2500] + "\n... (truncated)"
    return text


def _rule_based_fallback(symbol: str, report: Dict[str, Any]) -> Dict[str, Any]:
    """Fallback when Hermes is unavailable."""
    overall = report.get("overall", {})
    verdict = overall.get("verdict", "HOLD")
    score = overall.get("score", 0)
    insights = report.get("insights", [])
    conflicts = report.get("conflicts", [])
    risk = report.get("risk_metrics", {})

    summary = (
        f"Engine consensus for {symbol}: score {score:+.0f}/100 → {verdict}. "
        f"{len(insights)} insight(s), {len(conflicts)} conflict(s) detected."
    )

    blocks = [
        {
            "type": "risk_gauge",
            "title": "Consensus Score",
            "score": score,
        },
        {
            "type": "text",
            "title": "Engine Analysis",
            "content": summary,
        },
        {
            "type": "indicator",
            "label": "Sharpe Ratio",
            "value": str(risk.get("sharpe_estimate", "N/A")),
            "status": "positive" if risk.get("sharpe_estimate", 0) > 1 else "neutral",
        },
        {
            "type": "indicator",
            "label": "VaR 95%",
            "value": f"{risk.get('var_95', 0) * 100:.1f}%",
            "status": "negative",
        },
    ]

    buy_thesis = "; ".join(
        i.get("description", "") for i in insights if i.get("type") in ("bullish", "opportunity")
    ) or "No strong bullish signal from engine."
    sell_thesis = "; ".join(
        i.get("description", "") for i in insights if i.get("type") in ("bearish", "risk")
    ) or "No strong bearish signal from engine."

    return {
        "verdict": verdict,
        "confidence": overall.get("confidence", 0.5),
        "summary": summary,
        "buy_thesis": buy_thesis,
        "sell_thesis": sell_thesis,
        "blocks": blocks,
        "source": "rule_based_fallback",
    }


async def generate_ai_report(symbol: str, consensus_report: Dict[str, Any]) -> Dict[str, Any]:
    """
    Send the consensus report to Hermes and return a dynamic AI investment report.

    Args:
        symbol: Stock symbol
        consensus_report: output of consensus.compute_consensus()

    Returns:
        Dict with verdict, confidence, summary, buy_thesis, sell_thesis, blocks[]
    """
    overall = consensus_report.get("overall", {})
    user_prompt = AI_USER_PROMPT_TEMPLATE.format(
        symbol=symbol,
        score=overall.get("score", 0),
        verdict=overall.get("verdict", "HOLD"),
        confidence=overall.get("confidence", 0),
        categories_block=_build_categories_block(consensus_report.get("categories", [])),
        risk_block=_build_risk_block(consensus_report.get("risk_metrics", {})),
        key_metrics_block=_build_key_metrics_block(consensus_report.get("key_metrics", [])),
        insights_block=_build_insights_block(consensus_report.get("insights", [])),
        conflicts_block=_build_conflicts_block(consensus_report.get("conflicts", [])),
        method_count=len(consensus_report.get("method_details", [])),
        methods_block=_build_methods_block(consensus_report.get("method_details", [])),
    )

    payload = {
        "model": HERMES_MODEL,
        "messages": [
            {"role": "system", "content": AI_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.2,
        "response_format": {"type": "json_object"},
    }
    payload = {k: v for k, v in payload.items() if v is not None}

    logger.info(f"Sending consensus report to Hermes for {symbol}")
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(HERMES_API_URL, json=payload)
            response.raise_for_status()
            data = response.json()

        content = data["choices"][0]["message"]["content"]
        content = content.strip()
        if content.startswith("```"):
            content = content.split("\n", 1)[1] if "\n" in content else content[3:]
            if content.endswith("```"):
                content = content[:-3]
            content = content.strip()

        result = json.loads(content)
        result["source"] = "llm"

        # Validate required fields
        if "verdict" not in result:
            result["verdict"] = overall.get("verdict", "HOLD")
        if "blocks" not in result or not isinstance(result["blocks"], list):
            result["blocks"] = [
                {"type": "text", "title": "Analysis", "content": result.get("summary", "")}
            ]
        logger.info(f"Hermes AI report generated for {symbol}: verdict={result['verdict']}")
        return result

    except (TimeoutException, httpx.HTTPStatusError, Exception) as e:
        logger.warning(f"Hermes LLM failed for {symbol}: {type(e).__name__}: {e}. Fallback.")
        return _rule_based_fallback(symbol, consensus_report)
