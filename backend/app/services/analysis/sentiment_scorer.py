"""
LLM Sentiment Scorer — sends news to Hermes API for structured sentiment analysis.
Falls back to keyword-based heuristic if LLM is unavailable.
"""

import json
import logging
import os
from typing import Any, Dict, List, Optional

import httpx
from httpcore import TimeoutException

from .news_fetcher import fetch_stock_news

logger = logging.getLogger("ultron-trading.analysis.sentiment_scorer")


# Add time import for timing measurements
import time


# Add correlation ID utility
from app.core.logging_config import get_correlation_id, generate_correlation_id

# Hermes API endpoint (via ultron-controller proxy)
HERMES_API_URL = os.environ.get("HERMES_API_URL", "http://localhost:9000/api/hermes_api/v1/chat/completions")
HERMES_MODEL = os.environ.get("SENTIMENT_MODEL", None)  # None = default model

# Sentiment analysis system prompt
SENTIMENT_SYSTEM_PROMPT = """You are a financial sentiment analyst. Analyze news about a stock and output JSON only.

Score criteria (-1.0 to +1.0, 0=neutral):
1. fundamental_impact: revenue/earnings/margins impact
2. competitive_position: vs rivals
3. growth_prospects: future growth expectations
4. risk_profile: regulation/litigation/debt/geopolitical risk
5. management_quality: management decisions
6. market_sentiment: emotional tone (fear/optimism)
7. headline_sentiment: title-only sentiment
8. momentum_signal: investor interest trend

Also provide: conviction (0-1), key_themes (3-5 topics), bull_case (1 sentence), bear_case (1 sentence), llm_explanation (2-3 sentences explaining overall score with criteria/article refs).

JSON schema:
{"scores": {"fundamental_impact": float, "competitive_position": float, "growth_prospects": float, "risk_profile": float, "management_quality": float, "market_sentiment": float, "headline_sentiment": float, "momentum_signal": float}, "overall_sentiment": float, "conviction": float, "key_themes": [string], "bull_case": string, "bear_case": string, "article_count": int, "source": "llm", "llm_explanation": string}

overall = fundamental*0.20 + competitive*0.15 + growth*0.20 - risk*0.15 + mgmt*0.10 + market*0.10 + headline*0.10"""

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
            summary = a['summary'][:200]
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
    
    Args:
        symbol: Stock symbol to analyze
        days: Number of days to look back for news
        max_articles: Maximum number of articles to analyze
        use_llm: Whether to use LLM for analysis (fallback to keyword if False or on failure)
        
    Returns:
        Dictionary with sentiment analysis results
    """
    # Generate or get correlation ID for this analysis request
    correlation_id = get_correlation_id()
    if correlation_id == "none":
        # Generate a new one if not in request context
        correlation_id = generate_correlation_id()
        # Note: We don't set it here as we don't want to override request context
    
    logger.info(
        "Starting sentiment analysis",
        extra={
            "symbol": symbol,
            "days": days,
            "max_articles": max_articles,
            "use_llm": use_llm,
            "correlation_id": correlation_id,
        }
    )
    
    start_time = time.time()
    
    # Step 1: Fetch news
    fetch_start = time.time()
    articles = fetch_stock_news(symbol, max_articles=max_articles)
    fetch_duration_ms = (time.time() - fetch_start) * 1000
    
    logger.info(
        "News fetching completed",
        extra={
            "symbol": symbol,
            "articles_found": len(articles),
            "fetch_duration_ms": round(fetch_duration_ms, 2),
            "correlation_id": correlation_id,
        }
    )
    
    if not articles:
        duration_ms = (time.time() - start_time) * 1000
        logger.warning(
                    "No articles found for sentiment analysis",
                    extra={
                        "symbol": symbol,
                        "total_duration_ms": round(duration_ms, 2),
                        "correlation_id": correlation_id,
                    }
                )
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
        llm_start = time.time()
        logger.info(
            "Attempting LLM sentiment analysis",
            extra={
                "symbol": symbol,
                "article_count": len(articles),
                "correlation_id": correlation_id,
            }
        )
        
        try:
            result = await _llm_sentiment(symbol, articles, days)
            llm_duration_ms = (time.time() - llm_start) * 1000
            
            logger.info(
                "LLM sentiment analysis completed successfully",
                extra={
                    "symbol": symbol,
                    "llm_duration_ms": round(llm_duration_ms, 2),
                    "result_source": result.get("source", "unknown"),
                    "sentiment_score": result.get("overall_sentiment", 0),
                    "correlation_id": correlation_id,
                }
            )
            
            total_duration_ms = (time.time() - start_time) * 1000
            logger.info(
                "Sentiment analysis completed via LLM",
                extra={
                    "symbol": symbol,
                    "total_duration_ms": round(total_duration_ms, 2),
                    "correlation_id": correlation_id,
                }
            )
            return result
            
        except Exception as e:
            llm_duration_ms = (time.time() - llm_start) * 1000
            total_duration_ms = (time.time() - start_time) * 1000
            
            logger.warning(
                            f"LLM sentiment failed for {symbol}: {type(e).__name__}: {e}. Falling back to keyword analysis.",
                            extra={
                                "symbol": symbol,
                                "error": str(e),
                                "error_type": type(e).__name__,
                                "llm_duration_ms": round(llm_duration_ms, 2),
                                "total_duration_ms": round(total_duration_ms, 2),
                                "correlation_id": correlation_id,
                            },
                            exc_info=True
                        )
            # Fall through to keyword analysis
    else:
        logger.info(
            "Skipping LLM analysis (use_llm=False), using keyword analysis",
            extra={
                "symbol": symbol,
                "correlation_id": correlation_id,
            }
        )

    # Step 3: Fallback to keyword analysis
    keyword_start = time.time()
    result = _keyword_sentiment(articles)
    keyword_duration_ms = (time.time() - keyword_start) * 1000
    
    total_duration_ms = (time.time() - start_time) * 1000
    
    logger.info(
        "Sentiment analysis completed via keyword fallback",
        extra={
            "symbol": symbol,
            "keyword_duration_ms": round(keyword_duration_ms, 2),
            "total_duration_ms": round(total_duration_ms, 2),
            "result_source": result.get("source", "keyword_fallback"),
            "sentiment_score": result.get("overall_sentiment", 0),
            "correlation_id": correlation_id,
        }
    )
    
    return result
async def _llm_sentiment(symbol: str, articles: List[Dict[str, Any]], days: int) -> Dict[str, Any]:
    """
    Call Hermes LLM API for structured sentiment analysis.
    """
    # Get correlation ID
    correlation_id = get_correlation_id()
    
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

    # Log LLM request details (truncate for brevity)
    prompt_length = len(json.dumps(payload))
    logger.info(
        "Sending request to LLM API",
        extra={
            "symbol": symbol,
            "article_count": len(articles),
            "prompt_size_chars": prompt_length,
            "estimated_tokens": prompt_length // 4,  # Rough estimate
            "model": HERMES_MODEL or "default",
            "temperature": 0.1,
            "timeout_seconds": 55.0,
            "correlation_id": correlation_id,
        }
    )
    
    start_time = time.time()
    try:
        async with httpx.AsyncClient(timeout=55.0) as client:
            response = await client.post(HERMES_API_URL, json=payload)
            response.raise_for_status()
            data = response.json()
            
        request_duration_ms = (time.time() - start_time) * 1000
        
        # Log response details
        response_size = len(json.dumps(data))
        logger.info(
            "Received response from LLM API",
            extra={
                "symbol": symbol,
                "status_code": response.status_code,
                "response_size_chars": response_size,
                "request_duration_ms": round(request_duration_ms, 2),
                "correlation_id": correlation_id,
            }
        )
        
    except TimeoutException as e:
        request_duration_ms = (time.time() - start_time) * 1000
        logger.error(
            f"LLM API timeout for {symbol}",
            extra={
                "symbol": symbol,
                "error": "TimeoutException",
                "error_type": "TimeoutException",
                "request_duration_ms": round(request_duration_ms, 2),
                "timeout_seconds": 55.0,
                "correlation_id": correlation_id,
            },
            exc_info=True
        )
        raise
    except httpx.HTTPStatusError as e:
        request_duration_ms = (time.time() - start_time) * 1000
        logger.error(
            f"LLM API HTTP error for {symbol}: {e.response.status_code}",
            extra={
                "symbol": symbol,
                "error": f"HTTP {e.response.status_code}",
                "error_type": "HTTPStatusError",
                "status_code": e.response.status_code,
                "response_text": e.response.text[:200] if e.response.text else "",
                "request_duration_ms": round(request_duration_ms, 2),
                "correlation_id": correlation_id,
            },
            exc_info=True
        )
        raise
    except Exception as e:
        request_duration_ms = (time.time() - start_time) * 1000
        logger.error(
            f"LLM API request failed for {symbol}: {type(e).__name__}: {e}",
            extra={
                "symbol": symbol,
                "error": str(e),
                "error_type": type(e).__name__,
                "request_duration_ms": round(request_duration_ms, 2),
                "correlation_id": correlation_id,
            },
            exc_info=True
        )
        raise

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

    try:
        result = json.loads(content)
    except json.JSONDecodeError as e:
        logger.error(
            f"Failed to parse LLM response as JSON for {symbol}",
            extra={
                "symbol": symbol,
                "error": str(e),
                "error_type": "JSONDecodeError",
                "response_preview": content[:200],
                "correlation_id": correlation_id,
            },
            exc_info=True
        )
        raise

    # Validate and enrich
    result["article_count"] = len(articles)
    result["source"] = "llm"

    # Ensure llm_explanation exists (fallback if LLM omits it)
    if "llm_explanation" not in result or not result["llm_explanation"]:
        overall = result.get("overall_sentiment", 0.0)
        themes = result.get("key_themes", [])
        themes_str = ", ".join(themes[:3]) if themes else "general news"
        result["llm_explanation"] = f"Sentiment score ({overall:+.2f}) driven by {themes_str}. LLM explanation not provided."

    llm_processing_duration_ms = (time.time() - start_time) * 1000
    logger.info(
        "LLM response processed successfully",
        extra={
            "symbol": symbol,
            "processing_duration_ms": round(llm_processing_duration_ms, 2),
            "overall_sentiment": result.get("overall_sentiment", 0),
            "confidence": result.get("conviction", 0),
            "source": result.get("source", "unknown"),
            "correlation_id": correlation_id,
        }
    )

    return result
