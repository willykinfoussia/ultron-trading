import sys
sys.path.insert(0, '.')
from app.services.analysis import registry
methods = registry.list_all()
print(f'Total methods registered: {len(methods)}')
print('\nMethod IDs:')
for m in methods:
    print(f'  - {m["method_id"]}: {m["method_name"]} ({m["category"]})')
print('\nCategories:')
cats = registry.get_categories()
for cat, count in cats.items():
    print(f'  {cat}: {count} methods')
