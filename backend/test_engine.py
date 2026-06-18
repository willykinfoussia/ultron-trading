"""Quick syntax/import test for the analysis engine."""
import sys
sys.path.insert(0, ".")

from app.services.analysis import registry
from app.services.analysis.base import AnalysisMethod, AnalysisResult

methods = registry.list_all()
print(f"Registered methods: {len(methods)}")
for m in methods:
    print(f"  [{m['category']}] {m['method_id']}: {m['method_name']}")

cats = registry.get_categories()
print(f"\nCategories: {cats}")

expected = [
    "rsi", "macd", "bollinger", "sma", "ema",
    "pe_ratio", "roe", "debt_to_equity", "profit_margin",
    "news_sentiment", "social_sentiment",
    "ml_prediction", "trend_classification",
]
actual = [m["method_id"] for m in methods]
missing = [e for e in expected if e not in actual]
if missing:
    print(f"\nMISSING methods: {missing}")
    sys.exit(1)
else:
    print(f"\nAll {len(expected)} expected methods registered!")
print("\nImport test PASSED")
