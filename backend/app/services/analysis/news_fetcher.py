"""
News Fetcher — retrieves and normalizes stock news from yfinance.
"""

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import yfinance as yf

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
    try:
        ticker = yf.Ticker(symbol.upper())
        raw_news = ticker.news
    except Exception as e:
        logger.warning(f"Failed to fetch news for {symbol}: {e}")
        return []

    if not raw_news:
        return []

    articles = []
    for item in raw_news[:max_articles]:
        # yfinance wraps everything in content since 2024
        content = item.get("content", item)  # fallback to item itself if no content wrapper
        
        title = content.get("title", "").strip()
        if not title:
            continue  # Skip articles without title
        
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

    logger.info(f"Fetched {len(articles)} news articles for {symbol}")
    return articles
