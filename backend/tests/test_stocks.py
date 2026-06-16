"""Tests for stock endpoints: /api/stocks/{symbol}/quote and /api/stocks/{symbol}/history."""

import pytest
from httpx import AsyncClient


@pytest.mark.anyio
class TestHealthAndVersion:
    """Test root, health, and version endpoints."""

    async def test_root(self, client: AsyncClient):
        response = await client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "version" in data

    async def test_health(self, client: AsyncClient):
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "version" in data

    async def test_api_version(self, client: AsyncClient):
        response = await client.get("/api/version")
        assert response.status_code == 200
        data = response.json()
        assert "version" in data


@pytest.mark.anyio
class TestStockQuote:
    """Test GET /api/stocks/{symbol}/quote"""

    async def test_quote_valid_symbol(self, client: AsyncClient):
        """Quote for a well-known symbol should return 200 + valid schema."""
        response = await client.get("/api/stocks/AAPL/quote")
        assert response.status_code == 200
        data = response.json()
        assert data["symbol"] == "AAPL"
        assert isinstance(data["price"], (int, float))
        assert data["price"] > 0
        assert "currency" in data
        assert "exchange" in data
        assert "quote_type" in data
        assert "market_state" in data
        assert isinstance(data["regular_market_change"], (int, float))
        assert isinstance(data["regular_market_change_percent"], (int, float))

    async def test_quote_lowercase_symbol(self, client: AsyncClient):
        """Lowercase symbol should be normalized to uppercase."""
        response = await client.get("/api/stocks/aapl/quote")
        assert response.status_code == 200
        data = response.json()
        assert data["symbol"] == "AAPL"

    async def test_quote_response_model_fields(self, client: AsyncClient):
        """All required StockQuote fields should be present."""
        response = await client.get("/api/stocks/MSFT/quote")
        assert response.status_code == 200
        data = response.json()
        expected_keys = {
            "symbol", "price", "currency", "exchange", "quote_type",
            "market_state", "regular_market_change",
            "regular_market_change_percent", "regular_market_time",
        }
        assert expected_keys.issubset(set(data.keys()))

    async def test_quote_invalid_symbol(self, client: AsyncClient):
        """Completely invalid symbol should return 404 or 400."""
        response = await client.get("/api/stocks/INVALIDQUOTE123XYZ/quote")
        assert response.status_code in (404, 400)

    async def test_quote_no_nan_values(self, client: AsyncClient):
        """Price values should never be NaN or Inf (yfinance safety)."""
        response = await client.get("/api/stocks/GOOGL/quote")
        assert response.status_code == 200
        import math
        data = response.json()
        assert not math.isnan(data["price"])
        assert not math.isinf(data["price"])
        assert not math.isnan(data["regular_market_change"])
        assert not math.isinf(data["regular_market_change"])


@pytest.mark.anyio
class TestStockHistory:
    """Test GET /api/stocks/{symbol}/history"""

    async def test_history_default_params(self, client: AsyncClient):
        """History with default params should return data array."""
        response = await client.get("/api/stocks/AAPL/history")
        assert response.status_code == 200
        data = response.json()
        assert data["symbol"] == "AAPL"
        assert isinstance(data["data"], list)
        assert len(data["data"]) > 0

    async def test_history_data_point_schema(self, client: AsyncClient):
        """Each history data point should have OHLCV fields."""
        response = await client.get("/api/stocks/AAPL/history?period=5d")
        assert response.status_code == 200
        data = response.json()
        if len(data["data"]) > 0:
            point = data["data"][0]
            assert "date" in point
            assert "open" in point
            assert "high" in point
            assert "low" in point
            assert "close" in point
            assert "volume" in point
            assert isinstance(point["volume"], int)

    async def test_history_custom_period(self, client: AsyncClient):
        """Custom period parameter should work."""
        response = await client.get("/api/stocks/AAPL/history?period=3mo")
        assert response.status_code == 200
        data = response.json()
        assert data["period"] == "3mo"

    async def test_history_invalid_symbol(self, client: AsyncClient):
        """Invalid symbol should return 404 or 400."""
        response = await client.get("/api/stocks/INVALIDQUOTE123XYZ/history")
        assert response.status_code in (404, 400)

    async def test_history_no_nan_ohlc(self, client: AsyncClient):
        """OHLC values should never be NaN or Inf."""
        import math
        response = await client.get("/api/stocks/GOOGL/history?period=5d")
        assert response.status_code == 200
        data = response.json()
        for point in data["data"]:
            for field in ("open", "high", "low", "close"):
                assert not math.isnan(point[field])
                assert not math.isinf(point[field])
