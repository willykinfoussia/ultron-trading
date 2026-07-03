"""
Sentiment Analysis Methods (Placeholders)

These methods return structured stub data for news and social media sentiment.
In production, they would integrate with news APIs and social media data sources.
"""

from datetime import datetime
from typing import Any, Dict

from .base import AnalysisMethod, AnalysisResult

import logging

logger = logging.getLogger("ultron-trading.analysis.sentiment")


class NewsSentimentMethod(AnalysisMethod):
    """Real news sentiment analysis via yfinance + Hermes LLM."""

    @property
    def method_id(self) -> str:
        return "news_sentiment"

    @property
    def method_name(self) -> str:
        return "News Sentiment Analysis"

    @property
    def category(self) -> str:
        return "sentiment"

    @property
    def description(self) -> str:
        return "Analyzes recent news headlines and summaries using LLM to determine market sentiment."

    @property
    def parameters(self) -> Dict[str, Dict[str, Any]]:
        return {
            "lookback_days": {"type": "int", "default": 7, "min": 1, "max": 30},
            "max_articles": {"type": "int", "default": 10, "min": 3, "max": 25},
        }

    async def run(self, symbol: str, **params) -> AnalysisResult:
        from app.services.analysis.sentiment_scorer import analyze_sentiment
        
        lookback_days = int(params.get("lookback_days", 7))
        max_articles = int(params.get("max_articles", 10))

        sentiment = await analyze_sentiment(
            symbol=symbol,
            days=lookback_days,
            max_articles=max_articles,
            use_llm=True,
        )

        # Convert overall_sentiment (-1.0 to 1.0) to signal + confidence
        overall = sentiment.get("overall_sentiment", 0.0)
        conviction = sentiment.get("conviction", 0.3)
        
        if overall > 0.15:
            signal = "buy"
            confidence = min(0.95, 0.4 + abs(overall) * 0.4 + conviction * 0.2)
        elif overall < -0.15:
            signal = "sell"
            confidence = min(0.95, 0.4 + abs(overall) * 0.4 + conviction * 0.2)
        else:
            signal = "neutral"
            confidence = max(0.2, 0.4 - abs(overall) * 0.5)

        return AnalysisResult(
            method_id=self.method_id,
            method_name=self.method_name,
            category=self.category,
            symbol=symbol.upper(),
            result={
                "sentiment_score": round(overall, 3),
                "scores": sentiment.get("scores", {}),
                "article_count": sentiment.get("article_count", 0),
                "key_themes": sentiment.get("key_themes", []),
                "bull_case": sentiment.get("bull_case", ""),
                "bear_case": sentiment.get("bear_case", ""),
                "source": sentiment.get("source", "unknown"),
                "conviction": round(conviction, 3),
                "lookback_days": lookback_days,
            },
            signal=signal,
            confidence=round(confidence, 3),
            explanation=self._build_explanation(sentiment, symbol),
            chart_data={
                "type": "sentiment",
                "sentiment_score": overall,
                "scores": sentiment.get("scores", {}),
                "articles": sentiment.get("article_count", 0),
                "themes": sentiment.get("key_themes", []),
            },
        )

    def _build_explanation(self, sentiment: dict, symbol: str) -> str:
        """Build human-readable explanation from sentiment result."""
        overall = sentiment.get("overall_sentiment", 0.0)
        direction = "positive" if overall > 0.15 else "negative" if overall < -0.15 else "neutral"
        themes = sentiment.get("key_themes", [])
        themes_str = ", ".join(themes[:3]) if themes else "general market news"
        source = sentiment.get("source", "unknown")
        articles = sentiment.get("article_count", 0)
        
        return (
            f"News sentiment for {symbol.upper()} is {direction} "
            f"({overall:+.2f}) across {articles} articles. "
            f"Key themes: {themes_str}. "
            f"Analysis: {source}."
        )



