"""
LLM Sentiment Scorer — sends news to Hermes API for structured sentiment analysis.
Falls back to keyword-based heuristic if LLM is unavailable.
"""

import json
import logging
import os
from typing import Any, Dict, List, Optional

import httpx

from .news_fetcher import fetch_stock_news

logger = logging.getLogger("ultron-trading.analysis.sentiment_scorer")

# Hermes API endpoint (via ultron-controller proxy)
HERMES_API_URL = os.environ.get("HERMES_API_URL", "http://localhost:9000/api/hermes_api/v1/chat/completions")
HERMES_MODEL = os.environ.get("SENTIMENT_MODEL", None)  # None = default model

# Sentiment analysis system prompt
SENTIMENT_SYSTEM_PROMPT = """You are a financial sentiment analyst.
Analyze the provided news articles about a stock and determine the overall market sentiment.

Score each of the following criteria on a scale from -1.0 (extremely negative) to +1.0 (extremely positive), with 0.0 being neutral:

1. **fundamental_impact**: Does the news suggest improvement or deterioration of the company's fundamentals (revenue, earnings, margins, market share)?
2. **competitive_position**: Does the news strengthen or weaken the company's competitive position vs rivals?
3. **growth_prospects**: Does the news indicate upward or downward revision of future growth expectations?
4. **risk_profile**: Does the news increase or decrease the investment risk (regulation, litigation, geopolitical, debt)?
5. **management_quality**: Does the news reflect positively or negatively on management decisions and execution?
6. **market_sentiment**: What is the emotional tone of the coverage (fear, optimism, uncertainty, enthusiasm)?

Also provide:
- **headline_sentiment**: Average sentiment of the article titles alone (-1.0 to +1.0)
- **momentum_signal**: Whether this news flow suggests increasing or decreasing investor interest (scale -1.0 to +1.0)
- **conviction**: How confident you are in this assessment (0.0 to 1.0), considering the quantity and quality of news
- **key_themes**: List of 3-5 recurring themes/topics in the news
- **bull_case**: One sentence summarizing the bullish argument from the news
- **bear_case**: One sentence summarizing the bearish argument from the news
- **llm_explanation**: A 2-3 sentence natural language explanation of WHY the overall_sentiment score was assigned, citing specific criteria and articles. Example: "The moderately positive score (+0.35) reflects a strong earnings beat and raised guidance (fundamental_impact: +0.6), partially offset by margin pressure warnings (risk_profile: -0.3). Management's confident tone on AI roadmap supports the bullish bias."

Respond STRICTLY in JSON format with no additional text. Schema:
{
  "scores": {
    "fundamental_impact": float (-1.0 to 1.0),
    "competitive_position": float (-1.0 to 1.0),
    "growth_prospects": float (-1.0 to 1.0),
    "risk_profile": float (-1.0 to 1.0),
    "management_quality": float (-1.0 to 1.0),
    "market_sentiment": float (-1.0 to 1.0),
    "headline_sentiment": float (-1.0 to 1.0),
    "momentum_signal": float (-1.0 to 1.0)
  },
  "overall_sentiment": float (-1.0 to 1.0),
  "conviction": float (0.0 to 1.0),
  "key_themes": [string],
  "bull_case": string,
  "bear_case": string,
  "article_count": int,
  "source": "llm",
  "llm_explanation": string
}

The overall_sentiment should be a weighted average of the individual scores:
overall = (
    fundamental_impact * 0.20 +
    competitive_position * 0.15 +
    growth_prospects * 0.20 +
    (-risk_profile) * 0.15 +
    management_quality * 0.10 +
    market_sentiment * 0.10 +
    headline_sentiment * 0.10
)

The momentum_signal is separate and measures the TREND of sentiment (improving vs deteriorating).
"""

SENTIMENT_USER_PROMPT_TEMPLATE = """News articles about {symbol} from the last {days} days:

{articles_block}

Analyze the sentiment of these {count} articles. Be objective and consider the financial implications of each article for {symbol}'s stock price."""


def _build_articles_block(articles: List[Dict[str, Any]]) -> str:
    """Format articles for the LLM prompt."""
    lines = []
    for i, a in enumerate(articles, 1):
        date_str = a.get("published_at", "")[:10] if a.get("published_at") else "recent"
        lines.append(f"### Article {i}")
        lines.append(f"Date: {date_str}")
        lines.append(f"Publisher: {a.get('publisher', 'Unknown')}")
        lines.append(f"Title: {a['title']}")
        if a.get("summary"):
            # Truncate summary to keep prompt small for faster LLM response
            summary = a['summary'][:300]
            lines.append(f"Summary: {summary}")
        lines.append("")
    return "\n".join(lines)


# --- Keyword-based fallback ---

POSITIVE_KEYWORDS = [
    "beat", "beats", "beaten", "outperform", "surge", "soar", "rally", "gain", "gains",
    "growth", "record high", "upgrade", "upgraded", "bullish", "optimism", "strong",
    "positive", "exceed", "exceeds", "exceeded", "opportunity", "breakthrough",
    "partnership", "expansion", "innovation", "launch", "success", "profitable",
    "dividend", "buyback", "momentum", "raise target", "price target raise",
    "all-time high", "exceeded expectations", "record revenue",
    "market leader", "dominant", "revolutionary", "disruptive",
]

NEGATIVE_KEYWORDS = [
    "miss", "misses", "missed", "underperform", "plunge", "crash", "drop", "decline",
    "loss", "losses", "downgrade", "downgraded", "bearish", "pessimism", "weak",
    "negative", "warning", "layoff", "layoffs", "recession", "debt", "lawsuit",
    "investigation", "fraud", "scandal", "risk", "concern", "fear", "uncertainty",
    "volatility", "sell-off", "sell", "dump", "plummet", "tank",
    "bankruptcy", "default", "liquidity crisis", "regulatory fine", "penalty",
    "resigns", "executive departure", "product recall", "slowdown",
]


def _keyword_sentiment(articles: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Fallback keyword-based sentiment analysis when LLM is unavailable."""
    total_positive = 0
    total_negative = 0
    all_text = " ".join(
        [a.get("title", "") + " " + a.get("summary", "") for a in articles]
    ).lower()
    
    for word in POSITIVE_KEYWORDS:
        count = all_text.count(word.lower())
        total_positive += count
    
    for word in NEGATIVE_KEYWORDS:
        count = all_text.count(word.lower())
        total_negative += count

    total_signals = total_positive + total_negative
    if total_signals == 0:
        raw_score = 0.0
        conviction = 0.2
    else:
        raw_score = (total_positive - total_negative) / total_signals
        conviction = min(0.6, total_signals / (len(articles) * 5))

    sentiment_normalized = max(-1.0, min(1.0, raw_score))
    
    return {
        "scores": {
            "fundamental_impact": round(sentiment_normalized * 0.7, 2),
            "competitive_position": round(sentiment_normalized * 0.5, 2),
            "growth_prospects": round(sentiment_normalized * 0.8, 2),
            "risk_profile": round(-sentiment_normalized * 0.6, 2),
            "management_quality": round(sentiment_normalized * 0.4, 2),
            "market_sentiment": round(sentiment_normalized * 0.9, 2),
            "headline_sentiment": round(sentiment_normalized * 0.8, 2),
            "momentum_signal": round(sentiment_normalized * 0.3, 2),
        },
        "overall_sentiment": round(sentiment_normalized, 2),
        "conviction": round(conviction, 2),
        "key_themes": _extract_themes(all_text),
        "bull_case": "Positive keywords detected in news flow" if sentiment_normalized > 0 else "No significant bullish signals",
        "bear_case": "Negative keywords detected in news flow" if sentiment_normalized < 0 else "No significant bearish signals",
        "article_count": len(articles),
        "source": "keyword_fallback",
    }


def _extract_themes(text: str) -> List[str]:
    """Extract common financial themes from text."""
    themes = []
    theme_keywords = {
        "earnings": ["earnings", "revenue", "profit", "eps", "margin"],
        "regulation": ["regulation", "sec", "ftc", "antitrust", "fine", "compliance"],
        "product_launch": ["launch", "release", "new product", "unveil"],
        "partnership": ["partnership", "deal", "collaboration", "agreement"],
        "macro": ["fed", "interest rate", "inflation", "recession", "tariff"],
        "ai_technology": ["ai", "artificial intelligence", "machine learning", "llm"],
        "competition": ["competition", "rival", "market share", "vs"],
        "analyst_action": ["upgrade", "downgrade", "price target", "overweight", "underweight"],
    }
    for theme, keywords in theme_keywords.items():
        if any(kw in text for kw in keywords):
            themes.append(theme)
    return themes[:5]


# --- Main scoring function ---

async def analyze_sentiment(
    symbol: str,
    days: int = 7,
    max_articles: int = 10,
    use_llm: bool = True,
) -> Dict[str, Any]:
    """
    Analyze sentiment for a stock based on recent news.
    """
    # Step 1: Fetch news
    articles = fetch_stock_news(symbol, max_articles=max_articles)
    
    if not articles:
        return {
            "scores": {k: 0.0 for k in [
                "fundamental_impact", "competitive_position", "growth_prospects",
                "risk_profile", "management_quality", "market_sentiment",
                "headline_sentiment", "momentum_signal"
            ]},
            "overall_sentiment": 0.0,
            "conviction": 0.1,
            "key_themes": [],
            "bull_case": "No news available",
            "bear_case": "No news available",
            "article_count": 0,
            "source": "no_data",
        }

    # Step 2: Try LLM if enabled
    if use_llm:
        try:
            result = await _llm_sentiment(symbol, articles, days)
            return result
        except Exception as e:
            logger.warning(f"LLM sentiment failed for {symbol}: {type(e).__name__}: {e}. Falling back to keyword analysis.")
    
    # Step 3: Fallback to keyword analysis
    return _keyword_sentiment(articles)


async def _llm_sentiment(symbol: str, articles: List[Dict[str, Any]], days: int) -> Dict[str, Any]:
    """Call Hermes LLM API for structured sentiment analysis."""
    
    articles_block = _build_articles_block(articles)
    user_prompt = SENTIMENT_USER_PROMPT_TEMPLATE.format(
        symbol=symbol,
        days=days,
        articles_block=articles_block,
        count=len(articles),
    )

    payload = {
        "model": HERMES_MODEL,
        "messages": [
            {"role": "system", "content": SENTIMENT_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.1,
        "response_format": {"type": "json_object"},
    }
    # Remove None values
    payload = {k: v for k, v in payload.items() if v is not None}

    async with httpx.AsyncClient(timeout=45.0) as client:
        response = await client.post(HERMES_API_URL, json=payload)
        response.raise_for_status()
        data = response.json()

    # Parse LLM response
    content = data["choices"][0]["message"]["content"]
    logger.debug(f"LLM raw response for {symbol}: {content[:200]}...")
    
    # Strip markdown code blocks if present (```json ... ```)
    content = content.strip()
    if content.startswith("```"):
        # Remove opening ```json or ```
        content = content.split("\n", 1)[1] if "\n" in content else content[3:]
        # Remove closing ```
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()
    
    result = json.loads(content)
    
    # Validate and enrich
    result["article_count"] = len(articles)
    result["source"] = "llm"
    
    # Ensure llm_explanation exists (fallback if LLM omits it)
    if "llm_explanation" not in result or not result["llm_explanation"]:
        overall = result.get("overall_sentiment", 0.0)
        themes = result.get("key_themes", [])
        themes_str = ", ".join(themes[:3]) if themes else "general news"
        result["llm_explanation"] = f"Sentiment score ({overall:+.2f}) driven by {themes_str}. LLM explanation not provided."
    
    return result
