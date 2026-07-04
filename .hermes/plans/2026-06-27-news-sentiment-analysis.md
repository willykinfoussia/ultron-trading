# News Sentiment Analysis — Implementation Plan

> **For Hermes:** Implement task-by-task. Each task is self-contained.

**Goal:** Replace the current `news_sentiment` stub (random data) with a real sentiment analysis system that:
1. Fetches recent news headlines from yfinance `ticker.news`
2. Sends them to the Hermes LLM API (via ultron-controller proxy) for sentiment scoring
3. Returns a structured sentiment score with detailed breakdown per criterion
4. Integrates cleanly into the existing `NewsSentimentMethod.run()` interface

**Architecture:** 
- Data source: `yfinance.Ticker.news` (free, no API key)
- LLM backend: Hermes API via ultron-controller proxy at `http://localhost:9000/api/hermes/v1/chat/completions`
- Scoring: Structured JSON response from LLM with per-criteria scoring
- Fallback: If LLM unavailable, use keyword-based heuristic (zero-dependency)

**Tech Stack:** `yfinance`, `httpx` (async HTTP), `pydantic` (validation), `json` (structured output)

---

## Current State

- `NewsSentimentMethod` in `sentiment.py` currently uses `random.seed(hash(symbol))` → fake data
- News data is available via `yf.Ticker(symbol).news` → list of dicts with `content.title`, `content.summary`, `content.pubDate`, `content.provider.displayName`
- Hermes API accessible at `http://localhost:9000/api/hermes/v1/chat/completions` (OpenAI-compatible)
- Backend already has `httpx` available (check) or can use `urllib.request` (stdlib)

---

## Task 1: Create News Fetcher Utility

**Objective:** Extract and normalize news articles from yfinance into a clean format for LLM analysis.

**Files:**
- Create: `backend/app/services/analysis/news_fetcher.py`

**Step 1: Write the file**

```python
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
```

**Step 2: Test the fetcher**

```bash
cd /home/opc/ultron-trading && python3 -c "
from app.services.analysis.news_fetcher import fetch_stock_news
articles = fetch_stock_news('AAPL', max_articles=5)
for a in articles:
    print(f\"[{a['publisher']}] {a['title'][:80]}\")
    print(f\"  {a['summary'][:120]}\")
    print()
"
```

**Expected:** 5 real news headlines from AAPL with publisher and summary.

---

## Task 2: Create LLM Sentiment Scorer

**Objective:** Send news articles to Hermes LLM API and get structured sentiment scores back.

**Files:**
- Create: `backend/app/services/analysis/sentiment_scorer.py`

**Step 1: Write the file**

```python
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
HERMES_API_URL = os.environ.get("HERMES_API_URL", "http://localhost:9000/api/hermes/v1/chat/completions")
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
- **-conviction**: How confident you are in this assessment (0.0 to 1.0), considering the quantity and quality of news
- **key_themes**: List of 3-5 recurring themes/topics in the news
- **bull_case**: One sentence summarizing the bullish argument from the news
- **bear_case**: One sentence summarizing the bearish argument from the news

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
  "source": "llm"
}

The overall_sentiment should be a weighted average of the individual scores:
overall = (
    fundamental_impact * 0.20 +
    competitive_position * 0.15 +
    growth_prospects * 0.20 +
    (-risk_profile) * 0.15 +   (negative risk = positive for stock)
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
            lines.append(f"Summary: {a['summary']}")
        lines.append("")
    return "\n".join(lines)


# ─── Keyword-based fallback ──────────────────────────────────────────────────

POSITIVE_KEYWORDS = [
    "beat", "beats", "beaten", "outperform", "surge", "soar", "rally", "gain", "gains",
    "growth", "record high", "upgrade", "upgraded", "bullish", "optimism", "strong",
    "positive", "exceed", "exceeds", "exceeded", "opportunity", "breakthrough",
    "partnership", "expansion", "innovation", "launch", "success", "profitable",
    "dividend", "buyback", "momentum", "upgrade", "raise target", "price target raise",
    "all-time high", "moon", "rocket", "exceeded expectations", "record revenue",
    "market leader", "dominant", "revolutionary", "disruptive",
]

NEGATIVE_KEYWORDS = [
    "miss", "misses", "missed", "underperform", "plunge", "crash", "drop", "decline",
    "loss", "losses", "downgrade", "downgraded", "bearish", "pessimism", "weak",
    "negative", "warning", "layoff", "layoffs", "recession", "debt", "lawsuit",
    "investigation", "fraud", "scandal", "risk", "concern", "fear", "uncertainty",
    "volatility", "sell-off", " sell", "dump", "crash", "plummet", "tank",
    "bankruptcy", "default", "liquidity crisis", "regulatory fine", "penalty",
    " CEO resigns", "executive departure", "product recall", "slowdown",
]


def _keyword_sentiment(articles: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Fallback keyword-based sentiment analysis when LLM is unavailable.
    Uses simple keyword counting on titles and summaries.
    """
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
        conviction = min(0.6, total_signals / (len(articles) * 5))  # Max 0.6 for keyword approach

    # Derive per-criteria scores from the overall
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


# ─── Main scoring function ───────────────────────────────────────────────────

async def analyze_sentiment(
    symbol: str,
    days: int = 7,
    max_articles: int = 10,
    use_llm: bool = True,
) -> Dict[str, Any]:
    """
    Analyze sentiment for a stock based on recent news.
    
    Args:
        symbol: Stock ticker
        days: How many days back to consider news
        max_articles: Maximum articles to fetch and analyze
        use_llm: Whether to try LLM API first (fallback to keyword)
    
    Returns:
        Structured sentiment result dict
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
            logger.warning(f"LLM sentiment failed for {symbol}: {e}. Falling back to keyword analysis.")
    
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
        "temperature": 0.1,  # Low temp for consistent financial analysis
        "response_format": {"type": "json_object"},
    }
    # Remove None values
    payload = {k: v for k, v in payload.items() if v is not None}

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(HERMES_API_URL, json=payload)
        response.raise_for_status()
        data = response.json()

    # Parse LLM response
    content = data["choices"][0]["message"]["content"]
    result = json.loads(content)
    
    # Validate and enrich
    result["article_count"] = len(articles)
    result["source"] = "llm"
    
    return result
```

**Step 2: Test the scorer (keyword fallback)**

```bash
cd /home/opc/ultron-trading && python3 -c "
import asyncio
from app.services.analysis.sentiment_scorer import analyze_sentiment, _keyword_sentiment
from app.services.analysis.news_fetcher import fetch_stock_news

# Test keyword fallback
articles = fetch_stock_news('AAPL')
result = _keyword_sentiment(articles)
print('Keyword fallback result:')
print(f'  overall: {result[\"overall_sentiment\"]}')
print(f'  themes: {result[\"key_themes\"]}')
print(f'  articles: {result[\"article_count\"]}')
"
```

**Step 3: Test LLM integration**

```bash
cd /home/opc/ultron-trading && python3 -c "
import asyncio
from app.services.analysis.sentiment_scorer import analyze_sentiment

result = asyncio.run(analyze_sentiment('AAPL', use_llm=True))
print(f'Source: {result[\"source\"]}')
print(f'Overall: {result[\"overall_sentiment\"]}')
print(f'Scores: {result[\"scores\"]}')
print(f'Themes: {result[\"key_themes\"]}')
print(f'Bull: {result[\"bull_case\"]}')
print(f'Bear: {result[\"bear_case\"]}')
print(f'Conviction: {result[\"conviction\"]}')
"
```

---

## Task 3: Integrate into NewsSentimentMethod

**Objective:** Replace the stub `run()` method in `NewsSentimentMethod` to use real sentiment analysis.

**Files:**
- Modify: `backend/app/services/analysis/sentiment.py`

**Step 1: Replace the file content**

Replace the entire `NewsSentimentMethod` class:

```python
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
```

**Step 2: Test the integrated method**

```bash
cd /home/opc/ultron-trading && python3 -c "
import asyncio
from app.services.analysis import registry

async def test():
    result = await registry.run('news_sentiment', 'AAPL')
    print(f'Signal: {result.signal}')
    print(f'Confidence: {result.confidence}')
    print(f'Score: {result.result[\"sentiment_score\"]}')
    print(f'Source: {result.result[\"source\"]}')
    print(f'Themes: {result.result[\"key_themes\"]}')
    print(f'Bull: {result.result[\"bull_case\"]}')
    print(f'Bear: {result.result[\"bear_case\"]}')
    print(f'Explanation: {result.explanation}')

asyncio.run(test())
"
```

---

## Task 4: Install httpx dependency

**Objective:** Ensure httpx is available in the backend venv.

**Step 1: Add httpx to dependencies**

```bash
cd /home/opc/ultron-trading && source .venv/bin/activate && pip install httpx
```

**Step 2: Update requirements.txt**

```bash
cd /home/opc/ultron-trading && pip freeze | grep httpx >> backend/requirements.txt
```

**Step 3: Verify import works**

```bash
cd /home/opc/ultron-trading && python3 -c "import httpx; print('httpx OK:', httpx.__version__)"
```

---

## Task 5: Frontend — Display Rich Sentiment Results

**Objective:** Update the `AnalysisCard` component to show detailed sentiment breakdown when viewing news_sentiment results.

**Files:**
- Modify: `frontend/src/components/analysis/AnalysisCard.tsx`

**Step 1: Add sentiment detail rendering**

After the existing card content, add a conditional block for news_sentiment:

```tsx
// Inside AnalysisCard component, after the explanation text:
{result.method_id === 'news_sentiment' && result.result?.scores && (
  <div className="sentiment-breakdown">
    <div className="sentiment-scores-grid">
      {Object.entries(result.result.scores).map(([key, val]) => (
        <div key={key} className="sentiment-score-item">
          <span className="sentiment-score-label">
            {key.replace(/_/g, ' ')}
          </span>
          <div className="sentiment-score-bar">
            <div
              className={`sentiment-score-fill ${Number(val) >= 0 ? 'positive' : 'negative'}`}
              style={{ width: `${Math.abs(Number(val)) * 50}%` }}
            />
            <div className="sentiment-score-center" />
          </div>
          <span className="sentiment-score-value">
            {Number(val) > 0 ? '+' : ''}{Number(val).toFixed(2)}
          </span>
        </div>
      ))}
    </div>
    {result.result.key_themes?.length > 0 && (
      <div className="sentiment-themes">
        {result.result.key_themes.map((t: string) => (
          <span key={t} className="sentiment-theme-tag">{t}</span>
        ))}
      </div>
    )}
    {(result.result.bull_case || result.result.bear_case) && (
      <div className="sentiment-cases">
        {result.result.bull_case && (
          <div className="sentiment-bull">🟢 {result.result.bull_case}</div>
        )}
        {result.result.bear_case && (
          <div className="sentiment-bear">🔴 {result.result.bear_case}</div>
        )}
      </div>
    )}
    {result.result.source && (
      <div className="sentiment-source">
        Source: {result.result.source} · {result.result.article_count} articles
      </div>
    )}
  </div>
)}
```

**Step 2: Add CSS**

Append to `frontend/src/styles.css`:

```css
/* === Sentiment Analysis Detail === */
.sentiment-breakdown {
  margin-top: var(--sp-3);
  padding-top: var(--sp-3);
  border-top: 1px solid var(--border);
}

.sentiment-scores-grid {
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
  margin-bottom: var(--sp-3);
}

.sentiment-score-item {
  display: grid;
  grid-template-columns: 120px 1fr 45px;
  align-items: center;
  gap: var(--sp-2);
}

.sentiment-score-label {
  font-size: 0.7rem;
  color: var(--text-3);
  text-transform: capitalize;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sentiment-score-bar {
  position: relative;
  height: 6px;
  background: var(--surface-2);
  border-radius: 3px;
  overflow: hidden;
}

.sentiment-score-fill {
  position: absolute;
  top: 0;
  bottom: 0;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.sentiment-score-fill.positive {
  left: 50%;
  background: #10b981;
}

.sentiment-score-fill.negative {
  right: 50%;
  background: #ef4444;
}

.sentiment-score-center {
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  width: 1px;
  background: var(--border);
}

.sentiment-score-value {
  font-size: 0.7rem;
  font-family: var(--font-mono);
  color: var(--text-2);
  text-align: right;
}

.sentiment-themes {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-1);
  margin-bottom: var(--sp-2);
}

.sentiment-theme-tag {
  font-size: 0.65rem;
  padding: 2px 6px;
  background: var(--surface-2);
  border-radius: 3px;
  color: var(--text-3);
}

.sentiment-cases {
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
  font-size: 0.75rem;
}

.sentiment-bull { color: #34d399; }
.sentiment-bear { color: #f87171; }

.sentiment-source {
  margin-top: var(--sp-2);
  font-size: 0.65rem;
  color: var(--text-3);
  font-style: italic;
}
```

---

## Task 6: Bump Version + Deploy

**Step 1: Bump to v0.13.8**

```bash
cd /home/opc/ultron-trading && echo "0.13.8" > VERSION
```

**Step 2: Build + Commit + Deploy**

```bash
cd /home/opc/ultron-trading/frontend && npm run build
cd /home/opc/ultron-trading
chmod -R o+rX frontend/dist/
git add VERSION backend/app/services/analysis/news_fetcher.py backend/app/services/analysis/sentiment_scorer.py backend/app/services/analysis/sentiment.py frontend/src/components/analysis/AnalysisCard.tsx frontend/src/styles.css
git commit -m "feat: real news sentiment analysis via yfinance + Hermes LLM with keyword fallback"
git push
sudo systemctl restart ultron-trading
```

---

## Verification Checklist

- [ ] `fetch_stock_news('AAPL')` returns real articles with title, summary, publisher
- [ ] `_keyword_sentiment(articles)` returns coherent scores
- [ ] `_llm_sentiment(symbol, articles, 7)` returns structured JSON from Hermes
- [ ] `analyze_sentiment('AAPL')` returns full result with all criteria
- [ ] `registry.run('news_sentiment', 'AAPL')` works end-to-end
- [ ] Frontend shows sentiment breakdown per criterion when clicking on news_sentiment card
- [ ] Fallback works when LLM is down (keyword-based)
- [ ] No random data anymore

---

## Risks / Notes

- **LLM timeout:** Set to 30s. May need adjustment if articles are many.
- **Cost:** Each news_sentiment analysis = 1 LLM call. With caching this is fine.
- **yfinance rate limiting:** News fetch is a single request per symbol — not rate-limited.
- **Fallback quality:** Keyword-based is basic (±0.3 accuracy vs LLM). Acceptable for now.
- **No caching currently:** Each run re-fetches and re-analyzes. Consider adding a 1-hour cache layer later.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    NewsSentimentMethod.run()                 │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
              ┌─────────────────────────────┐
              │     analyze_sentiment()      │
              │   (sentiment_scorer.py)      │
              └───┬──────────────┬──────────┘
                  │              │
          ┌───────▼──────┐  ┌───▼──────────────┐
          │ fetch_stock  │  │  Fallback:        │
          │ _news()      │  │  _keyword_sentiment│
          │ (yfinance)   │  │  (if LLM fails)   │
          └──────────────┘  └───────────────────┘
                  │
                  ▼  (articles list)
          ┌─────────────────────────────┐
          │  _llm_sentiment()            │
          │  POST Hermes API             │
          │  /api/hermes/v1/chat/comp.   │
          │                              │
          │  Returns:                    │
          │  - scores (8 criteria)       │
          │  - overall_sentiment         │
          │  - key_themes, bull/bear     │
          │  - conviction                │
          └─────────────────────────────┘
```
