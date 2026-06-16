"""Tests for charts endpoints: /api/charts/*"""

import pytest
from httpx import AsyncClient


@pytest.mark.anyio
class TestChartsInfo:
    """Test GET /api/charts/"""

    async def test_charts_root(self, client: AsyncClient):
        response = await client.get("/api/charts/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data


@pytest.mark.anyio
class TestHistoricalChart:
    """Test GET /api/charts/{symbol}/historical"""

    async def test_historical_default(self, client: AsyncClient):
        response = await client.get("/api/charts/AAPL/historical")
        assert response.status_code == 200
        data = response.json()
        assert data["symbol"] == "AAPL"
        assert "period" in data
        assert "data" in data

    async def test_historical_custom_period(self, client: AsyncClient):
        response = await client.get("/api/charts/AAPL/historical?period=3mo")
        assert response.status_code == 200
        data = response.json()
        assert data["period"] == "3mo"
