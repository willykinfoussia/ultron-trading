"""Tests for search endpoint: /api/search/"""

import pytest
from httpx import AsyncClient


@pytest.mark.anyio
class TestSearch:
    """Test GET /api/search/?q={query}"""

    async def test_search_by_name(self, client: AsyncClient):
        response = await client.get("/api/search/?q=apple")
        assert response.status_code == 200
        data = response.json()
        assert "query" in data
        assert "results" in data
        assert "count" in data
        assert data["query"] == "apple"
        assert isinstance(data["results"], list)

    async def test_search_by_symbol(self, client: AsyncClient):
        response = await client.get("/api/search/?q=AAPL")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data["results"], list)

    async def test_search_result_schema(self, client: AsyncClient):
        """Each result should have symbol, shortname, exchange."""
        response = await client.get("/api/search/?q=MSFT")
        assert response.status_code == 200
        data = response.json()
        if len(data["results"]) > 0:
            item = data["results"][0]
            assert "symbol" in item
            assert "shortname" in item
            assert "exchange" in item

    async def test_search_no_query_returns_422(self, client: AsyncClient):
        """Missing query param should return 422 validation error."""
        response = await client.get("/api/search/")
        assert response.status_code == 422

    async def test_search_count_matches_results(self, client: AsyncClient):
        """Count field should match length of results array."""
        response = await client.get("/api/search/?q=tech")
        assert response.status_code == 200
        data = response.json()
        assert data["count"] == len(data["results"])

    async def test_search_returns_results(self, client: AsyncClient):
        """Search for common terms should return at least one result."""
        response = await client.get("/api/search/?q=A")
        assert response.status_code == 200
        data = response.json()
        assert data["count"] > 0
