# Ultron Trading — Test Plan

> Version: 0.5.0
> Last updated: 2026-06-16
> Author: qa-engineer

---

## 1. Backend API Test Cases

### 1.1 Health & Version Endpoints

| # | Endpoint | Expected | curl command |
|---|----------|----------|-------------|
| H1 | `GET /` | 200, returns `{message, version}` | `curl -s http://localhost:8080/ | python3 -m json.tool` |
| H2 | `GET /health` | 200, returns `{status: "healthy", version}` | `curl -s http://localhost:8080/health | python3 -m json.tool` |
| H3 | `GET /api/version` | 200, returns `{version}` | `curl -s http://localhost:8080/api/version | python3 -m json.tool` |

### 1.2 Stock Endpoints

| # | Endpoint | Expected | curl command |
|---|----------|----------|-------------|
| S1 | `GET /api/stocks/{symbol}/quote` | 200, StockQuote schema | `curl -s http://localhost:8080/api/stocks/AAPL/quote | python3 -m json.tool` |
| S2 | `GET /api/stocks/{symbol}/quote` (invalid) | 404 or 400 | `curl -s http://localhost:8080/api/stocks/INVALIDQUOTE123/quote` |
| S3 | `GET /api/stocks/{symbol}/history` | 200, history data array | `curl -s "http://localhost:8080/api/stocks/AAPL/history?period=1mo&interval=1d" | python3 -m json.tool` |
| S4 | `GET /api/stocks/{symbol}/history` (invalid symbol) | 404 or 400 | `curl -s "http://localhost:8080/api/stocks/INVALID/history"` |
| S5 | `GET /api/stocks/{symbol}/history?period=1y` | 1 year of data | `curl -s "http://localhost:8080/api/stocks/AAPL/period=1y" | python3 -m json.tool` |
| S6 | `GET /api/stocks/{symbol}/profile` | **NOT IMPLEMENTED** (planned Phase 3) | `curl -s http://localhost:8080/api/stocks/AAPL/profile` |
| S7 | `GET /api/stocks/{symbol}/financials` | **NOT IMPLEMENTED** (planned Phase 3) | `curl -s http://localhost:8080/api/stocks/AAPL/financials` |
| S8 | `GET /api/stocks/{symbol}/holders` | **NOT IMPLEMENTED** (planned Phase 3) | `curl -s http://localhost:8080/api/stocks/AAPL/holders` |
| S9 | `GET /api/stocks/{symbol}/news` | **NOT IMPLEMENTED** (planned Phase 3) | `curl -s http://localhost:8080/api/stocks/AAPL/news` |

### 1.3 Analysis Endpoints

| # | Endpoint | Expected | curl command |
|---|----------|----------|-------------|
| A1 | `GET /api/analysis/` | 200, info message | `curl -s http://localhost:8080/api/analysis/ | python3 -m json.tool` |
| A2 | `GET /api/analysis/{symbol}/rsi` | 200, placeholder data | `curl -s http://localhost:8080/api/analysis/AAPL/rsi | python3 -m json.tool` |
| A3 | `GET /api/analysis/{symbol}/rsi?period=21` | 200, custom period | `curl -s "http://localhost:8080/api/analysis/AAPL/rsi?period=21" | python3 -m json.tool` |
| A4 | `GET /api/analysis/{symbol}/macd` | 200, placeholder data | `curl -s http://localhost:8080/api/analysis/AAPL/macd | python3 -m json.tool` |

### 1.4 Charts Endpoints

| # | Endpoint | Expected | curl command |
|---|----------|----------|-------------|
| C1 | `GET /api/charts/` | 200, info message | `curl -s http://localhost:8080/api/charts/ | python3 -m json.tool` |
| C2 | `GET /api/charts/{symbol}/historical` | 200, placeholder data | `curl -s http://localhost:8080/api/charts/AAPL/historical | python3 -m json.tool` |

### 1.5 Search Endpoints

| # | Endpoint | Expected | curl command |
|---|----------|----------|-------------|
| SE1 | `GET /api/search/?q=apple` | 200, results array | `curl -s "http://localhost:8080/api/search/?q=apple" | python3 -m json.tool` |
| SE2 | `GET /api/search/?q=AAPL` | 200, results array | `curl -s "http://localhost:8080/api/search/?q=AAPL" | python3 -m json.tool` |
| SE3 | `GET /api/search/` (no query) | 422 validation error | `curl -s http://localhost:8080/api/search/` |

### 1.6 Market Endpoints

| # | Endpoint | Expected | curl command |
|---|----------|----------|-------------|
| M1 | `GET /api/market/indices` | 200, indices array | `curl -s http://localhost:8080/api/market/indices | python3 -m json.tool` |
| M2 | `GET /api/market/movers` | 200, gainers/losers/actives | `curl -s http://localhost:8080/api/market/movers | python3 -m json.tool` |
| M3 | `GET /api/market/sectors` | 200, sector performance array | `curl -s http://localhost:8080/api/market/sectors | python3 -m json.tool` |
| M4 | `GET /api/market/fear-greed` | 200, fear/greed index | `curl -s http://localhost:8080/api/market/fear-greed | python3 -m json.tool` |

---

## 2. Frontend Component Checklist

### 2.1 Navigation & Layout
- [ ] Sidebar renders with all 6 tabs: Stocks, Market, Analysis, Watchlist, System, Settings
- [ ] Sidebar collapse/expand toggle works
- [ ] Topbar shows active tab name
- [ ] API status indicator shows in topbar
- [ ] Toast notification system renders and auto-dismisses

### 2.2 Stocks Page
- [ ] AutocompleteSearch component renders
- [ ] StockQuote displays: symbol, price, change, change%, market state
- [ ] StatGrid shows: Change, Change%, Market State, Type
- [ ] StockChart renders with historical data
- [ ] Period selector works (1mo, 3mo, 6mo, 1y)
- [ ] Popular stocks chips render and are clickable
- [ ] Loading spinner shown during data fetch
- [ ] Error state displays on API failure
- [ ] Negative change shown in red, positive in green

### 2.3 Market Page
- [ ] PageHeader shows "Market" title
- [ ] IndexTicker renders with market indices
- [ ] MoversTabs shows: Gainers, Losers, Most Active
- [ ] FearGreedGauge renders
- [ ] SectorGrid renders with sector performance
- [ ] MarketHeatmap renders
- [ ] Refresh button works
- [ ] Loading spinner shown during data fetch
- [ ] Error state displays on API failure
- [ ] Auto-refresh every 60s

### 2.4 Placeholder Pages
- [ ] Analysis page shows placeholder content
- [ ] Watchlist page shows empty state
- [ ] System page shows: API Status, Version, Polling info
- [ ] Settings page shows: Appearance settings

---

## 3. Integration Test Scenarios

### 3.1 End-to-End Data Flow

| Scenario | Steps | Expected |
|----------|-------|----------|
| Search → Stock View | 1. Search for "AAPL" 2. Select result 3. Stocks page loads | Quote + chart data displayed |
| Market → Stock View | 1. Click on mover in Market page 2. Navigates to Stocks page | Selected stock loaded |
| Multi-endpoint load | 1. Load Stocks page 2. Quote + history fetched in parallel | Both render without conflict |
| Error recovery | 1. Enter invalid symbol 2. See error 3. Enter valid symbol | Error clears, valid data loads |

### 3.2 Cross-Component Communication
- `navigateToStock()` callback passes symbol from Market to Stocks page
- Toast notification system accessible via `window.__setToast`
- API health polling at 30s doesn't interfere with data fetching at 60s

---

## 4. Performance Considerations

### 4.1 yfinance Rate Limiting
- yfinance has undocumented rate limits; batch requests preferred
- Market movers endpoint processes ~100 symbols in chunks of 50
- **Recommendation:** Add caching layer (Redis or in-memory TTL) to avoid hitting yfinance on every request
- **Recommendation:** Set timeout on yfinance requests to prevent hanging

### 4.2 Response Time Targets
| Endpoint | Target p50 | Target p95 |
|----------|-----------|-----------|
| `/health` | < 10ms | < 50ms |
| `/api/stocks/{symbol}/quote` | < 500ms | < 2s |
| `/api/stocks/{symbol}/history` | < 500ms | < 2s |
| `/api/search/` | < 500ms | < 2s |
| `/api/market/indices` | < 2s | < 10s |
| `/api/market/movers` | < 5s | < 30s |
| `/api/market/sectors` | < 2s | < 10s |
| `/api/market/fear-greed` | < 500ms | < 2s |

### 4.3 Frontend Performance
- Lazy loading for placeholder pages (Analysis, Watchlist, Settings)
- Debounce search input (300ms)
- Chart data: limit to max 250 data points for render performance
- AbortController for in-flight request cancellation on symbol change

---

## 5. Known Gaps / Missing Features (Phase 3+)

| Feature | Status | Impact |
|---------|--------|--------|
| Company Profile endpoint (`/api/stocks/{symbol}/profile`) | NOT IMPLEMENTED | Frontend types exist, backend missing |
| Company Financials endpoint (`/api/stocks/{symbol}/financials`) | NOT IMPLEMENTED | Frontend types exist, backend missing |
| Company Holders endpoint (`/api/stocks/{symbol}/holders`) | NOT IMPLEMENTED | Frontend types exist, backend missing |
| Company News endpoint (`/api/stocks/{symbol}/news`) | NOT IMPLEMENTED | Frontend types exist, backend missing |
| Analysis engine plugin architecture | NOT IMPLEMENTED | Only placeholder RSI/MACD endpoints |
| StockTabs with 6 tabs | NOT IMPLEMENTED | Frontend has Stocks page but no sub-tabs for profile/financials/holders/news |
| CompanyProfile component | NOT IMPLEMENTED | Referenced in plan but not created |
| FinancialsTable component | NOT IMPLEMENTED | Referenced in plan but not created |
| HoldersChart component | NOT IMPLEMENTED | Referenced in plan but not created |
| NewsFeed component | NOT IMPLEMENTED | Referenced in plan but not created |
| Analysis page | PLACEHOLDER | Only shows "coming soon" |
| Caching layer | NOT IMPLEMENTED | Will hit yfinance rate limits under load |
| Authentication | NOT IMPLEMENTED | No user/auth system |

---

## 6. Test Execution History

| Date | Run | Tests | Passed | Failures | Notes |
|------|-----|-------|--------|----------|-------|
| 2026-06-16 | 1 | TBD | TBD | TBD | Initial test plan and automated tests created |

---

## 7. Issues Found During Testing

### Issue 1: Frontend-Backend Type Mismatch for News Endpoint
- **Severity**: Medium
- **File**: `frontend/src/api/stocks.ts` — `getCompanyNews()` expects `NewsItem[]`
- **Actual**: Backend returns `{symbol: string, news: NewsItem[]}` (wrapped object)
- **Impact**: Frontend will try to iterate over object instead of array, causing runtime error
- **Fix**: Either update frontend to use `data.news` or update backend to return plain array

### Issue 2: Analysis Engine Replaced Placeholder Endpoints
- **Severity**: Low (improvement, not a bug)
- **Detail**: The old `/api/analysis/{symbol}/rsi` and `/api/analysis/{symbol}/macd` placeholder routes were replaced with a plugin-based architecture using `/api/analysis/{symbol}/run/{method_id}`. Tests were updated to match.

### Issue 3: Company Endpoints Implemented Ahead of Schedule
- **Severity**: Informational
- **Detail**: Company profile, financials, holders, and news endpoints were already implemented by the backend-engineer, despite the task plan listing them as Phase 3. Tests were updated to validate actual behavior.

### Issue 4: Version Mismatch
- **Severity**: Low
- **Detail**: `app.version` in `main.py` says `"0.2.0"` but the root/health/api_version endpoints return `"0.5.0"`. The app-level version field is inconsistent with the API response.

### Issue 5: No Caching Layer
- **Severity**: Medium (performance)
- **Detail**: Every market data request hits yfinance directly. Under load or with rate limiting, this will cause failures. Recommend adding TTL-based caching.

### Issue 6: Frontend Missing Components
- **Severity**: Medium
- **Detail**: The following components referenced in the plan are not yet created:
  - `CompanyProfile` component
  - `FinancialsTable` component
  - `HoldersChart` component
  - `NewsFeed` component
  - `StockTabs` with 6 sub-tabs
  - Analysis page (only placeholder exists)
