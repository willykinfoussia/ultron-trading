from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import routers from the app package
from app.api import stocks, charts, analysis

app = FastAPI(
    title="Ultron Trading API",
    description="API for stock market analysis and data",
    version="0.1.0",
)

# CORS middleware to allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(stocks.router, prefix="/api/stocks", tags=["stocks"])
app.include_router(charts.router, prefix="/api/charts", tags=["charts"])
app.include_router(analysis.router, prefix="/api/analysis", tags=["analysis"])

@app.get("/")
async def root():
    return {"message": "Welcome to Ultron Trading API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
