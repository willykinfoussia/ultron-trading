"""
News Fetcher — retrieves and normalizes stock news from yfinance.
"""

import logging
import time
from datetime import datetime
from typing import Any, Dict, List, Optional

import yfinance as yf

from .base import AnalysisMethod, AnalysisResult

logger = logging.getLogger("ultron-trading.analysis.news")


def fetch_stock_news(symbol: str, max_articles: int = 10) -> List[Dict[str, Any]]:
    """
    Fetch recent news for a stock from yfinance.

    Returns normalized list of articles:
    [
        {
            "title": str,
            "summary": str,
            "publisher": str,
            "published_at": str (ISO 8601),
            "url": str | None,
        },
        ...
    ]

    yfinance news structure: each item has {"id": str, "content": {...}}
    The content fields are: title, summary, pubDate, provider.displayName, canonicalUrl.url
    """
    # Get correlation ID if available
    try:
        from app.core.logging_config import get_correlation_id
        correlation_id = get_correlation_id()
    except ImportError:
        correlation_id = "none"
    
    logger.info(
        "Fetching stock news",
        extra={
            "symbol": symbol,
            "max_articles": max_articles,
            "correlation_id": correlation_id,
        }
    )
    
    start_time = time.time()
    try:
        ticker = yf.Ticker(symbol.upper())
        raw_news = ticker.news
    except Exception as e:
        duration_ms = (time.time() - start_time) * 1000
        logger.error(
            f"Failed to fetch news for {symbol}",
            extra={
                "symbol": symbol,
                "error": str(e),
                "error_type": type(e).__name__,
                "duration_ms": round(duration_ms, 2),
                "correlation_id": correlation_id,
            },
            exc_info=True
        )
        return []

    if not raw_news:
        duration_ms = (time.time() - start_time) * 1000
        logger.info(
            f"No news found for {symbol}",
            extra={
                "symbol": symbol,
                "raw_news_count": 0,
                "duration_ms": round(duration_ms, 2),
                "correlation_id": correlation_id,
            }
        )
        return []

    # Process articles
    articles = []
    skipped_titles = 0
    
    process_start = time.time()
    for i, item in enumerate(raw_news[:max_articles]):
        try:
            # yfinance wraps everything in content since 2024
            content = item.get("content", item)  # fallback to item itself if no content wrapper
            
            title = content.get("title", "").strip()
            if not title:
                skipped_titles += 1
                continue
            
            summary = content.get("summary", "") or content.get("description", "")
            pub_date_raw = content.get("pubDate", "")
            provider = content.get("provider", {}) or {}
            publisher = provider.get("displayName", "Unknown")
            canonical = content.get("canonicalUrl", {}) or {}
            url = canonical.get("url")
            
            # Normalize date
            published_at = ""
            if pub_date_raw:
                try:
                    # yfinance dates are ISO 8601 strings like "2026-06-29T12:40:03Z"
                    dt = datetime.fromisoformat(pub_date_raw.replace("Z", "+00:00"))
                    published_at = dt.isoformat()
                except (ValueError, AttributeError):
                    published_at = pub_date_raw

            articles.append({
                "title": title,
                "summary": summary.strip(),
                "publisher": publisher,
                "published_at": published_at,
                "url": url,
            })
        except Exception as e:
            logger.warning(
                f"Failed to parse news article {i} for {symbol}",
                extra={
                    "symbol": symbol,
                    "article_index": i,
                    "error": str(e),
                    "error_type": type(e).__name__,
                    "correlation_id": correlation_id,
                },
                exc_info=True
            )
            continue
    
    process_duration_ms = (time.time() - process_start) * 1000
    total_duration_ms = (time.time() - start_time) * 1000
    
    logger.info(
        f"Finished processing news for {symbol}",
        extra={
            "symbol": symbol,
            "requested_articles": max_articles,
            "fetched_articles": len(raw_news),
            "processed_articles": len(articles),
            "skipped_titles": skipped_titles,
            "processing_duration_ms": round(process_duration_ms, 2),
            "total_duration_ms": round(total_duration_ms, 2),
            "correlation_id": correlation_id,
        }
    )
    
    return articles