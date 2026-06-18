from app.api.analysis import router
print("API module imports OK")
print(f"Router routes: {len(router.routes)}")
for r in router.routes:
    if hasattr(r, 'path'):
        methods = getattr(r, 'methods', set())
        print(f"  {','.join(methods) if methods else 'MOUNT'} {r.path}")
