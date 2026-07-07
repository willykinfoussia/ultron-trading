from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
import time
import sys
from pathlib import Path

from app.api import stocks, charts, analysis, search, market
from app.core.logging_config import setup_logging
from app.core.middleware import CorrelationIdMiddleware

# ── Read version from VERSION file ──────────────────────────────────────
def _read_version() -> str:
    """Read version from the project root VERSION file."""
    for candidate in [Path(__file__).parent.parent / "VERSION", Path(__file__).parent / "VERSION"]:
        if candidate.exists():
            return candidate.read_text().strip()
    return "0.0.0"

VERSION = _read_version()

# ── Logging configuration ──────────────────────────────────────────────
setup_logging(
    log_level="INFO",
    log_to_file=True,
    log_file_path="/home/opc/ultron-trading/backend.log",
    json_logs=False,
)
logger = logging.getLogger("ultron-trading")

# ── App ────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Ultron Trading API",
    description="API for stock market analysis and data",
    version=VERSION,
)

# Add correlation ID middleware FIRST (so it's inner-most)
app.add_middleware(CorrelationIdMiddleware, header_name="X-Request-ID")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Enhanced Request/Response logging middleware ────────────────────────
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log incoming requests and outgoing responses with timing."""
    # Get correlation ID from request state (set by CorrelationIdMiddleware)
    correlation_id = getattr(request.state, "correlation_id", "unknown")
    
    start = time.time()
    client = request.client.host if request.client else "unknown"
    method = request.method
    path = request.url.path
    query = str(request.url.query)
    full_url = f"{path}?{query}" if query else path
    
    # Log request start
    logger.info(
        f"Request started",
        extra={
            "correlation_id": correlation_id,
            "method": method,
            "path": path,
            "query": query,
            "client_ip": client,
            "user_agent": request.headers.get("user-agent", "unknown"),
        }
    )

    try:
        response = await call_next(request)
        status_code = response.status_code
    except Exception as exc:
        # Log unhandled exceptions
        logger.exception(
            f"Unhandled exception during request processing",
            extra={
                "correlation_id": correlation_id,
                "method": method,
                "path": path,
                "error": str(exc),
                "error_type": type(exc).__name__,
            }
        )
        # Re-raise to let FastAPI handle it (will return 500)
        raise

    # Calculate duration
    elapsed_ms = (time.time() - start) * 1000

    # Log response
    logger.info(
        f"Request completed",
        extra={
            "correlation_id": correlation_id,
            "method": method,
            "path": path,
            "status_code": status_code,
            "duration_ms": round(elapsed_ms, 2),
            "client_ip": client,
        }
    )
    
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
    return {"message": "Welcome to Ultron Trading API", "version": VERSION}

@app.get("/health")
async def health_check():
    logger.debug("Health check OK")
    return {"status": "healthy", "version": VERSION}

@app.get("/api/version")
async def api_version():
    return {"version": VERSION}
