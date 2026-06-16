"""Tests for company profile, financials, holders, and news endpoints.

These endpoints ARE implemented (Phase 3 was completed by backend-engineer).
All tests validate the actual response schema.
"""

import pytest
from httpx import AsyncClient


@pytest.mark.anyio
class TestCompanyProfile:
    """Test GET /api/stocks/{symbol}/profile"""

    async def test_profile_returns_200(self, client: AsyncClient):
        response = await client.get("/api/stocks/AAPL/profile")
        assert response.status_code == 200

    async def test_profile_schema(self, client: AsyncClient):
        response = await client.get("/api/stocks/AAPL/profile")
        assert response.status_code == 200
        data = response.json()
        assert data["symbol"] == "AAPL"
        assert "short_name" in data or "shortName" in data
        assert "long_name" in data or "longName" in data
        assert "sector" in data
        assert "industry" in data

    async def test_profile_required_fields(self, client: AsyncClient):
        response = await client.get("/api/stocks/MSFT/profile")
        assert response.status_code == 200
        data = response.json()
        expected_keys = {
            "symbol", "sector", "industry", "country", "website",
            "description", "employees", "market_cap", "currency",
        }
        assert expected_keys.issubset(set(data.keys()))

    async def test_profile_invalid_symbol(self, client: AsyncClient):
        response = await client.get("/api/stocks/INVALIDQUOTE123XYZ/profile")
        assert response.status_code in (404, 400)


@pytest.mark.anyio
class TestCompanyFinancials:
    """Test GET /api/stocks/{symbol}/financials"""

    async def test_financials_returns_200(self, client: AsyncClient):
        response = await client.get("/api/stocks/AAPL/financials")
        assert response.status_code == 200

    async def test_financials_schema(self, client: AsyncClient):
        response = await client.get("/api/stocks/AAPL/financials")
        assert response.status_code == 200
        data = response.json()
        assert "annual_revenue" in data
        assert "annual_income" in data
        assert "quarterly_earnings" in data
        assert isinstance(data["annual_revenue"], list)
        assert isinstance(data["quarterly_earnings"], list)

    async def test_financials_revenue_structure(self, client: AsyncClient):
        response = await client.get("/api/stocks/AAPL/financials")
        assert response.status_code == 200
        data = response.json()
        if len(data["annual_revenue"]) > 0:
            item = data["annual_revenue"][0]
            assert "year" in item
            assert "revenue" in item

    async def test_financials_quarterly_structure(self, client: AsyncClient):
        response = await client.get("/api/stocks/AAPL/financials")
        assert response.status_code == 200
        data = response.json()
        if len(data["quarterly_earnings"]) > 0:
            item = data["quarterly_earnings"][0]
            assert "quarter" in item
            assert "revenue" in item
            assert "net_income" in item or "netIncome" in item

    async def test_financials_invalid_symbol(self, client: AsyncClient):
        response = await client.get("/api/stocks/INVALIDQUOTE123XYZ/financials")
        assert response.status_code in (404, 400)


@pytest.mark.anyio
class TestCompanyHolders:
    """Test GET /api/stocks/{symbol}/holders"""

    async def test_holders_returns_200(self, client: AsyncClient):
        response = await client.get("/api/stocks/AAPL/holders")
        assert response.status_code == 200

    async def test_holders_schema(self, client: AsyncClient):
        response = await client.get("/api/stocks/AAPL/holders")
        assert response.status_code == 200
        data = response.json()
        assert "major_holders" in data or "majorHolders" in data
        assert "institutional_holders" in data or "institutionalHolders" in data
        assert "mutual_fund_holders" in data or "mutualFundHolders" in data

    async def test_holders_invalid_symbol(self, client: AsyncClient):
        response = await client.get("/api/stocks/INVALIDQUOTE123XYZ/holders")
        assert response.status_code in (404, 400)


@pytest.mark.anyio
class TestCompanyNews:
    """Test GET /api/stocks/{symbol}/news"""

    async def test_news_returns_200(self, client: AsyncClient):
        response = await client.get("/api/stocks/AAPL/news")
        assert response.status_code == 200

    async def test_news_schema(self, client: AsyncClient):
        """News endpoint returns {symbol, news: [...]} not a plain list."""
        response = await client.get("/api/stocks/AAPL/news")
        assert response.status_code == 200
        data = response.json()
        # Actual format: {"symbol": "AAPL", "news": [...]}
        assert "symbol" in data
        assert "news" in data
        assert isinstance(data["news"], list)

    async def test_news_item_structure(self, client: AsyncClient):
        response = await client.get("/api/stocks/AAPL/news")
        assert response.status_code == 200
        data = response.json()
        if len(data["news"]) > 0:
            item = data["news"][0]
            assert "title" in item
            assert "publisher" in item
            assert "link" in item

    async def test_news_invalid_symbol(self, client: AsyncClient):
        response = await client.get("/api/stocks/INVALIDQUOTE123XYZ/news")
        assert response.status_code in (404, 400)
