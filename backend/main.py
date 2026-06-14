from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
import time
import sys

from app.api import stocks, charts, analysis, search, market

# ── Logging configuration ──────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("/home/opc/ultron-trading/backend.log", mode="a"),
    ],
)
logger = logging.getLogger("ultron-trading")

# ── App ────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Ultron Trading API",
    description="API for stock market analysis and data",
    version="0.2.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Request/Response logging middleware ────────────────────────────────
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    client = request.client.host if request.client else "unknown"
    logger.info(f"→ {request.method} {request.url.path} from {client}")

    try:
        response = await call_next(request)
    except Exception as exc:
        logger.exception(f"✖ Unhandled exception on {request.method} {request.url.path}: {exc}")
        return JSONResponse(status_code=500, content={"detail": "Internal server error"})

    elapsed = (time.time() - start) * 1000
    logger.info(f"← {request.method} {request.url.path} → {response.status_code} ({elapsed:.1f}ms)")
    return response

# ── Routers ────────────────────────────────────────────────────────────
app.include_router(stocks.router, prefix="/api/stocks", tags=["stocks"])
app.include_router(charts.router, prefix="/api/charts", tags=["charts"])
app.include_router(analysis.router, prefix="/api/analysis", tags=["analysis"])
app.include_router(search.router, prefix="/api/search", tags=["search"])
app.include_router(market.router, prefix="/api/market", tags=["market"])

# ── Health & root ──────────────────────────────────────────────────────
@app.get("/")
async def root():
    logger.info("Root endpoint called")
    return {"message": "Welcome to Ultron Trading API", "version": "0.2.0"}

@app.get("/health")
async def health_check():
    logger.debug("Health check OK")
    return {"status": "healthy", "version": "0.2.0"}
