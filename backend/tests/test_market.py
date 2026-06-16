"""Tests for market endpoints: /api/market/*"""

import pytest
from httpx import AsyncClient


@pytest.mark.anyio
class TestMarketIndices:
    """Test GET /api/market/indices"""

    async def test_indices_returns_200(self, client: AsyncClient):
        response = await client.get("/api/market/indices")
        assert response.status_code == 200

    async def test_indices_schema(self, client: AsyncClient):
        response = await client.get("/api/market/indices")
        assert response.status_code == 200
        data = response.json()
        assert "indices" in data
        assert isinstance(data["indices"], list)

    async def test_indices_items_structure(self, client: AsyncClient):
        """Each index should have name, symbol, price, change, change_percent."""
        response = await client.get("/api/market/indices")
        assert response.status_code == 200
        data = response.json()
        if len(data["indices"]) > 0:
            item = data["indices"][0]
            assert "name" in item
            assert "symbol" in item
            assert isinstance(item["price"], (int, float))
            assert isinstance(item["change"], (int, float))
            assert isinstance(item["change_percent"], (int, float))


@pytest.mark.anyio
class TestMarketMovers:
    """Test GET /api/market/movers"""

    async def test_movers_returns_200(self, client: AsyncClient):
        response = await client.get("/api/market/movers")
        assert response.status_code == 200

    async def test_movers_schema(self, client: AsyncClient):
        response = await client.get("/api/market/movers")
        assert response.status_code == 200
        data = response.json()
        assert "gainers" in data
        assert "losers" in data
        assert "actives" in data

    async def test_movers_gainer_structure(self, client: AsyncClient):
        """Each mover should have symbol, price, change, change_percent, volume."""
        response = await client.get("/api/market/movers")
        assert response.status_code == 200
        data = response.json()
        for key in ("gainers", "losers", "actives"):
            assert isinstance(data[key], list)
            if len(data[key]) > 0:
                item = data[key][0]
                assert "symbol" in item
                assert "price" in item
                assert "change" in item
                assert "change_percent" in item
                assert "volume" in item


@pytest.mark.anyio
class TestMarketSectors:
    """Test GET /api/market/sectors"""

    async def test_sectors_returns_200(self, client: AsyncClient):
        response = await client.get("/api/market/sectors")
        assert response.status_code == 200

    async def test_sectors_schema(self, client: AsyncClient):
        response = await client.get("/api/market/sectors")
        assert response.status_code == 200
        data = response.json()
        assert "sectors" in data
        assert isinstance(data["sectors"], list)

    async def test_sector_item_structure(self, client: AsyncClient):
        response = await client.get("/api/market/sectors")
        assert response.status_code == 200
        data = response.json()
        if len(data["sectors"]) > 0:
            item = data["sectors"][0]
            assert "name" in item
            assert "symbol" in item
            assert isinstance(item["change_percent"], (int, float))


@pytest.mark.anyio
class TestFearGreed:
    """Test GET /api/market/fear-greed"""

    async def test_fear_greed_returns_200(self, client: AsyncClient):
        response = await client.get("/api/market/fear-greed")
        assert response.status_code == 200

    async def test_fear_greed_schema(self, client: AsyncClient):
        response = await client.get("/api/market/fear-greed")
        assert response.status_code == 200
        data = response.json()
        assert "value" in data
        assert "label" in data
        assert isinstance(data["value"], (int, float))
        assert isinstance(data["label"], str)

    async def test_fear_greed_value_range(self, client: AsyncClient):
        """Fear & Greed value should be between 0 and 100."""
        response = await client.get("/api/market/fear-greed")
        assert response.status_code == 200
        data = response.json()
        assert 0 <= data["value"] <= 100
