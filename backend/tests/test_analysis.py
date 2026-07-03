"""Tests for analysis endpoints: /api/analysis/*

The analysis engine was redesigned with a plugin architecture.
Endpoints:
  GET /api/analysis/           — list all analysis methods
  GET /api/analysis/categories — list categories
  GET /api/analysis/{symbol}/run/{method_id} — run a specific method
  POST /api/analysis/{symbol}/run-all         — run all methods (requires body)
  GET /api/analysis/{symbol}/summary          — get summary
"""

import pytest
from httpx import AsyncClient


@pytest.mark.anyio
class TestAnalysisMethods:
    """Test GET /api/analysis/"""

    async def test_analysis_list_methods(self, client: AsyncClient):
        response = await client.get("/api/analysis/")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0

    async def test_analysis_method_schema(self, client: AsyncClient):
        response = await client.get("/api/analysis/")
        assert response.status_code == 200
        data = response.json()
        method = data[0]
        assert "method_id" in method
        assert "method_name" in method
        assert "category" in method
        assert "description" in method

    async def test_analysis_has_technical_methods(self, client: AsyncClient):
        response = await client.get("/api/analysis/")
        assert response.status_code == 200
        data = response.json()
        categories = {m["category"] for m in data}
        assert "technical" in categories


@pytest.mark.anyio
class TestAnalysisCategories:
    """Test GET /api/analysis/categories"""

    async def test_categories_returns_200(self, client: AsyncClient):
        response = await client.get("/api/analysis/categories")
        assert response.status_code == 200


@pytest.mark.anyio
class TestAnalysisRunMethod:
    """Test GET /api/analysis/{symbol}/run/{method_id}"""

    async def test_run_rsi(self, client: AsyncClient):
        response = await client.get("/api/analysis/AAPL/run/rsi")
        assert response.status_code == 200
        data = response.json()
        assert "method_id" in data
        assert "signal" in data
        assert "confidence" in data
        assert data["signal"] in ("buy", "sell", "hold", "neutral")

    async def test_run_macd(self, client: AsyncClient):
        response = await client.get("/api/analysis/AAPL/run/macd")
        assert response.status_code == 200
        data = response.json()
        assert "method_id" in data
        assert "signal" in data

    async def test_run_invalid_method(self, client: AsyncClient):
        response = await client.get("/api/analysis/AAPL/run/nonexistent")
        assert response.status_code in (404, 400)

    async def test_run_invalid_symbol(self, client: AsyncClient):
        response = await client.get("/api/analysis/INVALIDQUOTE123XYZ/run/rsi")
        assert response.status_code in (404, 400)


@pytest.mark.anyio
class TestAnalysisRunAll:
    """Test POST /api/analysis/{symbol}/run-all"""

    async def test_run_all_with_category(self, client: AsyncClient):
        response = await client.post(
            "/api/analysis/AAPL/run-all",
            json={"category": "technical"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        assert isinstance(data["results"], list)

    async def test_run_all_result_schema(self, client: AsyncClient):
        response = await client.post(
            "/api/analysis/AAPL/run-all",
            json={"category": "technical"}
        )
        assert response.status_code == 200
        data = response.json()
        for result in data["results"]:
            assert "method_id" in result
            assert "signal" in result
            assert "confidence" in result

    async def test_run_all_invalid_category(self, client: AsyncClient):
        response = await client.post(
            "/api/analysis/AAPL/run-all",
            json={"category": "nonexistent"}
        )
        assert response.status_code == 400

    async def test_run_all_missing_body(self, client: AsyncClient):
        """POST without body should return 422."""
        response = await client.post("/api/analysis/AAPL/run-all")
        assert response.status_code == 422


@pytest.mark.anyio
class TestAnalysisSummary:
    """Test GET /api/analysis/{symbol}/summary"""

    async def test_summary_returns_200(self, client: AsyncClient):
        response = await client.get("/api/analysis/AAPL/summary")
        assert response.status_code == 200

    @pytest.mark.anyio
    async def test_summary_schema(self, client: AsyncClient):
        response = await client.get("/api/analysis/AAPL/summary")
        assert response.status_code == 200
        data = response.json()
        # The endpoint returns a list of results, one per method
        assert isinstance(data, list)
        assert len(data) > 0
        # Check that each result has the expected fields
        for result in data:
            assert "method_id" in result
            assert "method_name" in result
            assert "category" in result
            assert "symbol" in result  # each result should include the symbol
            assert "result" in result
            assert "signal" in result
            assert "confidence" in result
            assert "explanation" in result
