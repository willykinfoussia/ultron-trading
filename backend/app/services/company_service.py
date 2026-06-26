"""Company service — wraps yfinance for company profile, financials, holders, news."""
import logging
import math
import time
from typing import Optional

import yfinance as yf

logger = logging.getLogger("ultron-trading.company")


# ── Simple in-memory cache ─────────────────────────────────────────────

class _TTLCache:
    """Simple TTL in-memory cache."""

    def __init__(self):
        self._store: dict = {}

    def get(self, key: str):
        entry = self._store.get(key)
        if entry is None:
            return None
        value, expires_at = entry
        if time.time() > expires_at:
            del self._store[key]
            return None
        return value

    def set(self, key: str, value, ttl: int):
        self._store[key] = (value, time.time() + ttl)

    def clear(self):
        self._store.clear()


_profile_cache = _TTLCache()   # TTL: 60s
_financials_cache = _TTLCache()  # TTL: 300s


def _safe_float(val, default=0.0) -> float:
    """Convert a yfinance value to float, handling NaN/Inf/None."""
    try:
        f = float(val)
        if math.isnan(f) or math.isinf(f):
            return default
        return f
    except (TypeError, ValueError):
        return default


def _safe_int(val, default=0) -> int:
    """Convert a yfinance value to int, handling NaN/Inf/None."""
    try:
        f = float(val)
        if math.isnan(f) or math.isinf(f):
            return default
        return int(f)
    except (TypeError, ValueError):
        return default


def _sanitize_dict(d: dict, float_fields: list[str], int_fields: Optional[list[str]] = None) -> dict:
    """Sanitize a dict by converting specified fields to safe float/int."""
    result = {}
    for k, v in d.items():
        if k in float_fields:
            result[k] = _safe_float(v)
        elif int_fields and k in int_fields:
            result[k] = _safe_int(v)
        else:
            result[k] = v
    return result


def get_company_profile(symbol: str) -> dict:
    """Fetch company profile data for a symbol.

    Returns dict with:
        symbol, short_name, long_name, sector, industry, country, website,
        description, employees, market_cap, currency, pe_ratio, eps,
        dividend_yield, beta, fifty_two_week_high, fifty_two_week_low,
        day_high, day_low, day_open, previous_close, volume, average_volume
    """
    sym = symbol.upper()
    logger.info(f"Company profile requested for {sym}")

    cached = _profile_cache.get(sym)
    if cached is not None:
        logger.info(f"Profile cache hit for {sym}")
        return cached

    try:
        ticker = yf.Ticker(sym)
        info = ticker.info

        if not info or len(info) <= 1:
            logger.warning(f"No profile data returned for {sym}")
            return _empty_profile(sym)

        profile = {
            "symbol": sym,
            "short_name": info.get("shortName") or info.get("short_name") or sym,
            "long_name": info.get("longName") or info.get("long_name") or info.get("shortName") or sym,
            "sector": info.get("sector") or "",
            "industry": info.get("industry") or "",
            "country": info.get("country") or "",
            "website": info.get("website") or "",
            "description": info.get("longBusinessSummary") or info.get("description") or "",
            "employees": _safe_int(info.get("fullTimeEmployees")),
            "market_cap": _safe_int(info.get("marketCap")),
            "currency": info.get("currency") or "USD",
            "pe_ratio": _safe_float(info.get("trailingPE")),
            "eps": _safe_float(info.get("trailingEps")),
            "dividend_yield": _safe_float(info.get("dividendYield")),
            "beta": _safe_float(info.get("beta")),
            "fifty_two_week_high": _safe_float(info.get("fiftyTwoWeekHigh")),
            "fifty_two_week_low": _safe_float(info.get("fiftyTwoWeekLow")),
            "day_high": _safe_float(info.get("dayHigh") or info.get("regularMarketDayHigh")),
            "day_low": _safe_float(info.get("dayLow") or info.get("regularMarketDayLow")),
            "day_open": _safe_float(info.get("open") or info.get("regularMarketOpen")),
            "previous_close": _safe_float(info.get("previousClose") or info.get("regularMarketPreviousClose")),
            "volume": _safe_int(info.get("volume") or info.get("regularMarketVolume")),
            "average_volume": _safe_int(info.get("averageVolume")),
        }

        logger.info(f"Profile for {sym}: {profile.get('long_name')} ({profile.get('sector')})")
        _profile_cache.set(sym, profile, ttl=60)
        return profile

    except Exception as e:
        logger.error(f"Error fetching profile for {sym}: {e}", exc_info=True)
        return _empty_profile(sym)


def _empty_profile(symbol: str) -> dict:
    """Return an empty profile with the correct structure."""
    return {
        "symbol": symbol.upper(),
        "short_name": "",
        "long_name": "",
        "sector": "",
        "industry": "",
        "country": "",
        "website": "",
        "description": "",
        "employees": 0,
        "market_cap": 0,
        "currency": "USD",
        "pe_ratio": 0.0,
        "eps": 0.0,
        "dividend_yield": 0.0,
        "beta": 0.0,
        "fifty_two_week_high": 0.0,
        "fifty_two_week_low": 0.0,
        "day_high": 0.0,
        "day_low": 0.0,
        "day_open": 0.0,
        "previous_close": 0.0,
        "volume": 0,
        "average_volume": 0,
    }


def get_company_financials(symbol: str) -> dict:
    """Fetch company financials data for a symbol.

    Returns dict with:
        annual_revenue (list of {year, revenue}),
        annual_income (list of {year, net_income}),
        quarterly_earnings (list of {quarter, revenue, net_income}),
        total_cash, total_debt, free_cash_flow,
        profit_margin, operating_margin, roe
    """
    sym = symbol.upper()
    logger.info(f"Company financials requested for {sym}")

    cached = _financials_cache.get(sym)
    if cached is not None:
        logger.info(f"Financials cache hit for {sym}")
        return cached

    try:
        ticker = yf.Ticker(sym)
        info = ticker.info

        if not info or len(info) <= 1:
            logger.warning(f"No financial data returned for {sym}")
            return _empty_financials(sym)

        # Annual revenue from financials DataFrame
        annual_revenue = []
        annual_income = []
        try:
            financials = ticker.financials
            if financials is not None and not financials.empty:
                # Rows we care about
                revenue_row_labels = ["Total Revenue", "Revenue"]
                income_row_labels = ["Net Income", "Net Income Common Stockholders"]

                for col in financials.columns:
                    year = col.year if hasattr(col, "year") else str(col)[:4]

                    # Revenue
                    for label in revenue_row_labels:
                        if label in financials.index:
                            val = _safe_float(financials.loc[label, col])
                            if val != 0:
                                annual_revenue.append({"year": year, "revenue": _safe_int(val)})
                                break

                    # Net Income
                    for label in income_row_labels:
                        if label in financials.index:
                            val = _safe_float(financials.loc[label, col])
                            if val != 0:
                                annual_income.append({"year": year, "net_income": _safe_int(val)})
                                break
        except Exception as e:
            logger.debug(f"Error processing annual financials for {sym}: {e}")

        # Quarterly earnings
        quarterly_earnings = []
        try:
            q_financials = ticker.quarterly_financials
            if q_financials is not None and not q_financials.empty:
                revenue_row_labels = ["Total Revenue", "Revenue"]
                income_row_labels = ["Net Income", "Net Income Common Stockholders"]

                for col in q_financials.columns:
                    quarter = str(col)
                    revenue = 0
                    net_income = 0

                    for label in revenue_row_labels:
                        if label in q_financials.index:
                            revenue = _safe_int(_safe_float(q_financials.loc[label, col]))
                            break

                    for label in income_row_labels:
                        if label in q_financials.index:
                            net_income = _safe_int(_safe_float(q_financials.loc[label, col]))
                            break

                    quarterly_earnings.append({
                        "quarter": quarter,
                        "revenue": revenue,
                        "net_income": net_income,
                    })
        except Exception as e:
            logger.debug(f"Error processing quarterly financials for {sym}: {e}")

        result = {
            "symbol": sym,
            "annual_revenue": annual_revenue[:4],  # last 4 years
            "annual_income": annual_income[:4],
            "quarterly_earnings": quarterly_earnings[:8],  # last 8 quarters
            "total_cash": _safe_int(info.get("totalCash")),
            "total_debt": _safe_int(info.get("totalDebt")),
            "free_cash_flow": _safe_int(info.get("freeCashflow")),
            "profit_margin": _safe_float(info.get("profitMargins")),
            "operating_margin": _safe_float(info.get("operatingMargins")),
            "roe": _safe_float(info.get("returnOnEquity")),
        }

        logger.info(
            f"Financials for {sym}: {len(annual_revenue)}y revenue, "
            f"{len(quarterly_earnings)}q earnings"
        )
        _financials_cache.set(sym, result, ttl=300)
        return result

    except Exception as e:
        logger.error(f"Error fetching financials for {sym}: {e}", exc_info=True)
        return _empty_financials(sym)


def _empty_financials(symbol: str) -> dict:
    """Return empty financials with correct structure."""
    return {
        "symbol": symbol.upper(),
        "annual_revenue": [],
        "annual_income": [],
        "quarterly_earnings": [],
        "total_cash": 0,
        "total_debt": 0,
        "free_cash_flow": 0,
        "profit_margin": 0.0,
        "operating_margin": 0.0,
        "roe": 0.0,
    }


def get_company_holders(symbol: str) -> dict:
    """Fetch company holder data for a symbol.

    Returns dict with:
        major_holders (list of {name, shares, percent}),
        institutional_holders (list of {name, shares, percent}),
        mutual_fund_holders (list of {name, shares, percent})
    """
    sym = symbol.upper()
    logger.info(f"Company holders requested for {sym}")

    try:
        ticker = yf.Ticker(sym)
        info = ticker.info

        if not info or len(info) <= 1:
            logger.warning(f"No holder data returned for {sym}")
            return _empty_holders(sym)

        # Major holders — usually a DataFrame or list of tuples
        major_holders = []
        try:
            holders = ticker.major_holders
            if holders is not None and not (hasattr(holders, "empty") and holders.empty):
                if hasattr(holders, "iterrows"):
                    for _, row in holders.iterrows():
                        major_holders.append({
                            "name": str(row.get("Holder", row.iloc[0] if len(row) > 0 else "")),
                            "shares": _safe_int(row.get("Shares", row.iloc[1] if len(row) > 1 else 0)),
                            "percent": _safe_float(row.get("% Out", row.get("pctHeld", row.iloc[2] if len(row) > 2 else 0))),
                        })
                elif isinstance(holders, list):
                    for item in holders:
                        if isinstance(item, (list, tuple)) and len(item) >= 3:
                            major_holders.append({
                                "name": str(item[0]),
                                "shares": _safe_int(item[1]),
                                "percent": _safe_float(item[2]),
                            })
                        elif isinstance(item, dict):
                            major_holders.append({
                                "name": str(item.get("Holder", item.get("name", ""))),
                                "shares": _safe_int(item.get("Shares", item.get("shares", 0))),
                                "percent": _safe_float(item.get("% Out", item.get("percent", 0))),
                            })
        except Exception as e:
            logger.debug(f"Error processing major holders for {sym}: {e}")

        # Institutional holders
        institutional_holders = []
        try:
            inst = ticker.institutional_holders
            if inst is not None and not (hasattr(inst, "empty") and inst.empty):
                if hasattr(inst, "iterrows"):
                    for _, row in inst.iterrows().__iter__():
                        institutional_holders.append({
                            "name": str(row.get("Holder", row.iloc[0] if len(row) > 0 else "")),
                            "shares": _safe_int(row.get("Shares", row.get("shares", row.iloc[1] if len(row) > 1 else 0))),
                            "percent": _safe_float(row.get("% Out", row.get("pctHeld", row.get("pct", row.iloc[2] if len(row) > 2 else 0)))),
                        })
        except Exception as e:
            logger.debug(f"Error processing institutional holders for {sym}: {e}")

        # Mutual fund holders
        mutual_fund_holders = []
        try:
            mf = ticker.mutualfund_holders
            if mf is not None and not (hasattr(mf, "empty") and mf.empty):
                if hasattr(mf, "iterrows"):
                    for _, row in mf.iterrows().__iter__():
                        mutual_fund_holders.append({
                            "name": str(row.get("Holder", row.iloc[0] if len(row) > 0 else "")),
                            "shares": _safe_int(row.get("Shares", row.get("shares", row.iloc[1] if len(row) > 1 else 0))),
                            "percent": _safe_float(row.get("% Out", row.get("pctHeld", row.get("pct", row.iloc[2] if len(row) > 2 else 0)))),
                        })
        except Exception as e:
            logger.debug(f"Error processing mutual fund holders for {sym}: {e}")

        result = {
            "symbol": sym,
            "major_holders": major_holders,
            "institutional_holders": institutional_holders[:20],
            "mutual_fund_holders": mutual_fund_holders[:20],
        }

        logger.info(
            f"Holders for {sym}: {len(major_holders)} major, "
            f"{len(institutional_holders)} inst, {len(mutual_fund_holders)} mf"
        )
        return result

    except Exception as e:
        logger.error(f"Error fetching holders for {sym}: {e}", exc_info=True)
        return _empty_holders(sym)


def _empty_holders(symbol: str) -> dict:
    """Return empty holders with correct structure."""
    return {
        "symbol": symbol.upper(),
        "major_holders": [],
        "institutional_holders": [],
        "mutual_fund_holders": [],
    }


def get_company_news(symbol: str) -> list:
    """Fetch company news for a symbol.

    Returns list of dicts with:
        title, publisher, link, providerPublishTime, summary
    """
    sym = symbol.upper()
    logger.info(f"Company news requested for {sym}")

    try:
        ticker = yf.Ticker(sym)
        info = ticker.info

        if not info or len(info) <= 1:
            logger.warning(f"No data (for news) returned for {sym}")
            return []

        from datetime import datetime

        def parse_news_item(item: dict) -> dict | None:
            """Parse a single news item, handling both flat and nested (content) structures."""
            if not isinstance(item, dict):
                return None
            # yfinance now wraps data in a 'content' key
            content = item.get("content", item)
            if not isinstance(content, dict):
                return None
            # publisher can be nested
            provider = content.get("provider", {})
            publisher_name = ""
            if isinstance(provider, dict):
                publisher_name = provider.get("displayName", provider.get("name", ""))
            if not publisher_name:
                publisher_name = content.get("publisher", "")

            # link — try multiple locations
            link = ""
            for key in ("canonicalUrl", "clickThroughUrl", "url"):
                val = content.get(key)
                if isinstance(val, dict):
                    link = val.get("url", "")
                    break
                elif isinstance(val, str) and val:
                    link = val
                    break
            if not link:
                link = content.get("link", "")

            # pub date
            pub_time = content.get("pubDate", content.get("providerPublishTime", content.get("date", "")))
            if isinstance(pub_time, (int, float)) and pub_time > 0:
                try:
                    pub_time = datetime.fromtimestamp(pub_time).isoformat()
                except (OSError, OverflowError):
                    pub_time = ""
            elif isinstance(pub_time, str):
                # Keep ISO string as-is
                pass

            title = content.get("title", "")
            summary = content.get("summary", content.get("description", ""))

            if not title:
                return None  # skip empty items

            return {
                "title": title,
                "publisher": publisher_name,
                "link": link,
                "providerPublishTime": str(pub_time) if pub_time else "",
                "summary": summary,
            }

        news_items = []
        try:
            news = ticker.news
            if news and isinstance(news, list):
                for item in news:
                    parsed = parse_news_item(item)
                    if parsed:
                        news_items.append(parsed)
        except Exception as e:
            logger.debug(f"Error processing news for {sym}: {e}")

        # Fallback: try info["news"] if ticker.news is empty
        if not news_items:
            try:
                info_news = info.get("news", [])
                if isinstance(info_news, list):
                    for item in info_news:
                        parsed = parse_news_item(item)
                        if parsed:
                            news_items.append(parsed)
            except Exception:
                pass

        logger.info(f"News for {sym}: {len(news_items)} items")
        return news_items

    except Exception as e:
        logger.error(f"Error fetching news for {sym}: {e}", exc_info=True)
        return []
