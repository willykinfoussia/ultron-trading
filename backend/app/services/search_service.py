"""Search service — wraps yfinance Search for symbol/company lookup."""
import logging
from typing import Optional

logger = logging.getLogger("ultron-trading.search")

# Fallback: common symbols for when yfinance search is unavailable
COMMON_SYMBOLS: list[dict] = [
    {"symbol": "AAPL", "shortname": "Apple Inc.", "longname": "Apple Inc.", "quoteType": "equity", "exchange": "NMS"},
    {"symbol": "MSFT", "shortname": "Microsoft Corporation", "longname": "Microsoft Corporation", "quoteType": "equity", "exchange": "NMS"},
    {"symbol": "GOOGL", "shortname": "Alphabet Inc.", "longname": "Alphabet Inc.", "quoteType": "equity", "exchange": "NMS"},
    {"symbol": "GOOG", "shortname": "Alphabet Inc.", "longname": "Alphabet Inc.", "quoteType": "equity", "exchange": "NMS"},
    {"symbol": "AMZN", "shortname": "Amazon.com Inc.", "longname": "Amazon.com Inc.", "quoteType": "equity", "exchange": "NMS"},
    {"symbol": "TSLA", "shortname": "Tesla Inc.", "longname": "Tesla Inc.", "quoteType": "equity", "exchange": "NMS"},
    {"symbol": "NVDA", "shortname": "NVIDIA Corporation", "longname": "NVIDIA Corporation", "quoteType": "equity", "exchange": "NMS"},
    {"symbol": "META", "shortname": "Meta Platforms Inc.", "longname": "Meta Platforms Inc.", "quoteType": "equity", "exchange": "NMS"},
    {"symbol": "JPM", "shortname": "JPMorgan Chase & Co.", "longname": "JPMorgan Chase & Co.", "quoteType": "equity", "exchange": "NYQ"},
    {"symbol": "JNJ", "shortname": "Johnson & Johnson", "longname": "Johnson & Johnson", "quoteType": "equity", "exchange": "NYQ"},
    {"symbol": "V", "shortname": "Visa Inc.", "longname": "Visa Inc.", "quoteType": "equity", "exchange": "NYQ"},
    {"symbol": "WMT", "shortname": "Walmart Inc.", "longname": "Walmart Inc.", "quoteType": "equity", "exchange": "NYQ"},
    {"symbol": "PG", "shortname": "Procter & Gamble Co.", "longname": "Procter & Gamble Company", "quoteType": "equity", "exchange": "NYQ"},
    {"symbol": "DIS", "shortname": "Walt Disney Co.", "longname": "Walt Disney Company", "quoteType": "equity", "exchange": "NYQ"},
    {"symbol": "NFLX", "shortname": "Netflix Inc.", "longname": "Netflix Inc.", "quoteType": "equity", "exchange": "NMS"},
    {"symbol": "SPY", "shortname": "SPDR S&P 500 ETF", "longname": "SPDR S&P 500 ETF Trust", "quoteType": "etf", "exchange": "PCX"},
    {"symbol": "QQQ", "shortname": "Invesco QQQ Trust", "longname": "Invesco QQQ Trust Series 1", "quoteType": "etf", "exchange": "NMS"},
    {"symbol": "AMD", "shortname": "Advanced Micro Devices", "longname": "Advanced Micro Devices Inc.", "quoteType": "equity", "exchange": "NMS"},
    {"symbol": "INTC", "shortname": "Intel Corporation", "longname": "Intel Corporation", "quoteType": "equity", "exchange": "NMS"},
    {"symbol": "BAC", "shortname": "Bank of America Corp.", "longname": "Bank of America Corporation", "quoteType": "equity", "exchange": "NYQ"},
    {"symbol": "GS", "shortname": "Goldman Sachs Group", "longname": "Goldman Sachs Group Inc.", "quoteType": "equity", "exchange": "NYQ"},
    {"symbol": "CRM", "shortname": "Salesforce Inc.", "longname": "Salesforce Inc.", "quoteType": "equity", "exchange": "NYQ"},
    {"symbol": "ADBE", "shortname": "Adobe Inc.", "longname": "Adobe Inc.", "quoteType": "equity", "exchange": "NMS"},
    {"symbol": "PYPL", "shortname": "PayPal Holdings Inc.", "longname": "PayPal Holdings Inc.", "quoteType": "equity", "exchange": "NMS"},
    {"symbol": "UBER", "shortname": "Uber Technologies Inc.", "longname": "Uber Technologies Inc.", "quoteType": "equity", "exchange": "NYQ"},
    {"symbol": "SHOP", "shortname": "Shopify Inc.", "longname": "Shopify Inc.", "quoteType": "equity", "exchange": "NYQ"},
    {"symbol": "SQ", "shortname": "Block Inc.", "longname": "Block Inc.", "quoteType": "equity", "exchange": "NYQ"},
    {"symbol": "BA", "shortname": "Boeing Co.", "longname": "Boeing Company", "quoteType": "equity", "exchange": "NYQ"},
    {"symbol": "NKE", "shortname": "Nike Inc.", "longname": "Nike Inc.", "quoteType": "equity", "exchange": "NYQ"},
    {"symbol": "KO", "shortname": "Coca-Cola Co.", "longname": "Coca-Cola Company", "quoteType": "equity", "exchange": "NYQ"},
    {"symbol": "PEP", "shortname": "PepsiCo Inc.", "longname": "PepsiCo Inc.", "quoteType": "equity", "exchange": "NMS"},
    {"symbol": "COST", "shortname": "Costco Wholesale", "longname": "Costco Wholesale Corporation", "quoteType": "equity", "exchange": "NMS"},
    {"symbol": "AVGO", "shortname": "Broadcom Inc.", "longname": "Broadcom Inc.", "quoteType": "equity", "exchange": "NMS"},
    {"symbol": "TMO", "shortname": "Thermo Fisher Scientific", "longname": "Thermo Fisher Scientific Inc.", "quoteType": "equity", "exchange": "NYQ"},
    {"symbol": "ABT", "shortname": "Abbott Laboratories", "longname": "Abbott Laboratories", "quoteType": "equity", "exchange": "NYQ"},
    {"symbol": "MRK", "shortname": "Merck & Co.", "longname": "Merck & Co. Inc.", "quoteType": "equity", "exchange": "NYQ"},
    {"symbol": "PFE", "shortname": "Pfizer Inc.", "longname": "Pfizer Inc.", "quoteType": "equity", "exchange": "NYQ"},
    {"symbol": "XOM", "shortname": "Exxon Mobil Corp.", "longname": "Exxon Mobil Corporation", "quoteType": "equity", "exchange": "NYQ"},
    {"symbol": "CVX", "shortname": "Chevron Corporation", "longname": "Chevron Corporation", "quoteType": "equity", "exchange": "NYQ"},
    {"symbol": "LLY", "shortname": "Eli Lilly and Company", "longname": "Eli Lilly and Company", "quoteType": "equity", "exchange": "NYQ"},
]


def search_symbols(query: str, limit: int = 10) -> list[dict]:
    """Search for symbols/companies matching the query.

    Uses yfinance.Search when available, falls back to local COMMON_SYMBOLS list.
    """
    if not query or len(query.strip()) < 1:
        return []

    q = query.strip().lower()
    logger.info(f"Search request: '{query}'")

    # Try yfinance Search first
    try:
        import yfinance as yf
        search = yf.Search(query, max_results=limit)
        # yfinance Search returns quotes dict
        quotes = getattr(search, 'quotes', None)
        if quotes and isinstance(quotes, list) and len(quotes) > 0:
            results = []
            for item in quotes[:limit]:
                results.append({
                    "symbol": item.get("symbol", ""),
                    "shortname": item.get("shortname") or item.get("longname") or item.get("symbol", ""),
                    "longname": item.get("longname") or item.get("shortname") or item.get("symbol", ""),
                    "quoteType": item.get("quoteType", item.get("typeDisp", "equity")),
                    "exchange": item.get("exchange", ""),
                    "score": item.get("score", 0),
                })
            logger.info(f"yfinance search returned {len(results)} results for '{query}'")
            return results
    except Exception as e:
        logger.warning(f"yfinance Search failed for '{query}': {e}, using fallback")

    # Fallback: filter COMMON_SYMBOLS
    results = []
    for item in COMMON_SYMBOLS:
        searchable = f"{item['symbol']} {item['shortname']} {item.get('longname', '')}".lower()
        if q in searchable:
            results.append({**item, "score": 1.0})

    # Prioritize symbol prefix matches
    results.sort(key=lambda x: (
        not x["symbol"].lower().startswith(q),
        not x["shortname"].lower().startswith(q),
    ))
    logger.info(f"Fallback search returned {len(results)} results for '{query}'")
    return results[:limit]
