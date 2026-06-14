# ⚡ Ultron Trading

Stock market analysis web platform — real-time quotes, historical charts, and technical indicators.

**Live:** `http://<server-ip>:8090`

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Browser    │────▶│  nginx :8090 │────▶│ FastAPI :8080│
│              │◀────│  (reverse    │◀────│  (backend)   │
│              │     │   proxy)     │     │              │
└─────────────┘     └──────┬───────┘     └──────┬───────┘
                           │                     │
                    static files           yfinance API
                    (React SPA)           (Yahoo Finance)
```

| Component | Port | Description |
|-----------|------|-------------|
| nginx | 8090 | Reverse proxy + static frontend |
| FastAPI backend | 8080 | REST API (proxied via nginx) |
| React frontend | — | Built SPA served by nginx |

## Tech Stack

- **Backend:** FastAPI + Python 3.11 + `uv` package manager
- **Frontend:** React 18 + TypeScript + Vite + Recharts
- **Data:** yfinance (Yahoo Finance)
- **Server:** nginx reverse proxy + systemd

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/stocks/{symbol}/quote` | Real-time quote |
| GET | `/api/stocks/{symbol}/history?period=6mo&interval=1d` | Historical data |
| GET | `/api/charts/{symbol}/historical` | Chart data (placeholder) |
| GET | `/api/analysis/{symbol}/rsi` | RSI indicator (placeholder) |
| GET | `/api/analysis/{symbol}/macd` | MACD indicator (placeholder) |

### Example

```bash
curl http://localhost:8080/api/stocks/AAPL/quote
```

```json
{
  "symbol": "AAPL",
  "price": 291.13,
  "currency": "USD",
  "exchange": "NMS",
  "quote_type": "EQUITY",
  "market_state": "CLOSED",
  "regular_market_change": -4.5,
  "regular_market_change_percent": -1.52,
  "regular_market_time": "2026-06-12T20:00:01",
  "message": "Success"
}
```

## Project Structure

```
ultron-trading/
├── backend/
│   ├── main.py                 # FastAPI app entry point
│   ├── VERSION                 # Backend version
│   ├── pyproject.toml          # uv project config
│   ├── .venv/                  # Virtual environment
│   └── app/
│       ├── api/
│       │   ├── stocks.py       # Stock quotes & history
│       │   ├── charts.py       # Chart endpoints
│       │   └── analysis.py     # Technical analysis
│       ├── services/
│       └── core/
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── stocks.ts       # API client
│   │   │   └── types.ts        # TypeScript types
│   │   ├── components/
│   │   │   ├── SearchBar.tsx
│   │   │   ├── StockChart.tsx
│   │   │   └── StockTable.tsx
│   │   ├── pages/
│   │   │   └── Dashboard.tsx   # Main dashboard
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── dist/                   # Production build
│   └── vite.config.ts
├── deploy/
│   ├── backend.service         # systemd unit (backend)
│   └── frontend.service        # systemd unit (frontend, legacy)
├── VERSION                     # Project version
└── README.md
```

## Development

### Backend

```bash
cd backend
uv sync                    # Install dependencies
uv run uvicorn main:app --reload --port 8080
```

### Frontend

```bash
cd frontend
npm install
npm run dev                # Dev server on port 3000
npm run build              # Production build → dist/
```

## Deployment

### Services

- **Backend:** `ultron-trading.service` (systemd) — FastAPI on port 8080
- **Frontend:** Served by nginx on port 8090 (reverse proxy to backend)

### Logs

```bash
# Backend logs
journalctl -u ultron-trading -f
tail -f backend.log

# nginx logs
tail -f /var/log/nginx/ultron-trading-access.log
tail -f /var/log/nginx/ultron-trading-error.log
```

### Update & Deploy

```bash
# 1. Bump VERSION file
# 2. Commit & push
git add -A && git commit -m "..." && git push
# 3. Rebuild frontend
cd frontend && npm run build
# 4. Restart backend
sudo systemctl restart ultron-trading
# 5. Reload nginx
sudo systemctl reload nginx
```

## Versioning

Format: `X1.X2.X3`
- **X1** — Major vision change
- **X2** — Big feature / change
- **X3** — Bug fix / small feature

Current: **0.1.0**

## License

Proprietary — ZOO Company
