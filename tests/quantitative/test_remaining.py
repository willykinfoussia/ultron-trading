import pytest
from app.services.analysis.quantitative import (
    BinomialTreeMethod,
    VasicekMethod,
    HullWhiteMethod,
    HestonMethod,
    MertonCreditMethod,
    VaRMethod,
    MonteCarloMethod,
)


@pytest.mark.anyio
async def test_binomial_tree_method_runs():
    method = BinomialTreeMethod()
    result = await method.run("TEST")
    assert result.method_id == "binomial_tree"
    assert result.method_name == "Binomial Tree Model"
    assert result.category == "quant"
    assert result.symbol == "TEST"
    assert isinstance(result.result, dict)
    assert "note" in result.result
    assert result.signal == "neutral"
    assert result.confidence == 0.3
    assert isinstance(result.explanation, str)
    assert result.chart_data is None


@pytest.mark.anyio
async def test_vasicek_method_runs():
    method = VasicekMethod()
    result = await method.run("TEST")
    assert result.method_id == "vasicek"
    assert result.method_name == "Vasicek Model"
    assert result.category == "quant"
    assert result.symbol == "TEST"
    assert isinstance(result.result, dict)
    assert "note" in result.result
    assert result.signal == "neutral"
    assert result.confidence == 0.3
    assert isinstance(result.explanation, str)
    assert result.chart_data is None


@pytest.mark.anyio
async def test_hull_white_method_runs():
    method = HullWhiteMethod()
    result = await method.run("TEST")
    assert result.method_id == "hull_white"
    assert result.method_name == "Hull-White Model"
    assert result.category == "quant"
    assert result.symbol == "TEST"
    assert isinstance(result.result, dict)
    assert "note" in result.result
    assert result.signal == "neutral"
    assert result.confidence == 0.3
    assert isinstance(result.explanation, str)
    assert result.chart_data is None


@pytest.mark.anyio
async def test_heston_method_runs():
    method = HestonMethod()
    result = await method.run("TEST")
    assert result.method_id == "heston"
    assert result.method_name == "Heston Model"
    assert result.category == "quant"
    assert result.symbol == "TEST"
    assert isinstance(result.result, dict)
    assert "note" in result.result
    assert result.signal == "neutral"
    assert result.confidence == 0.3
    assert isinstance(result.explanation, str)
    assert result.chart_data is None


@pytest.mark.anyio
async def test_merton_credit_method_runs():
    method = MertonCreditMethod()
    result = await method.run("TEST")
    assert result.method_id == "merton_credit"
    assert result.method_name == "Merton Credit Model"
    assert result.category == "quant"
    assert result.symbol == "TEST"
    assert isinstance(result.result, dict)
    assert "note" in result.result
    assert result.signal == "neutral"
    assert result.confidence == 0.3
    assert isinstance(result.explanation, str)
    assert result.chart_data is None


@pytest.mark.anyio
async def test_var_method_runs():
    method = VaRMethod()
    result = await method.run("TEST")
    assert result.method_id == "var"
    assert result.method_name == "Value at Risk"
    assert result.category == "quant"
    assert result.symbol == "TEST"
    assert isinstance(result.result, dict)
    assert "note" in result.result
    assert result.signal == "neutral"
    assert result.confidence == 0.3
    assert isinstance(result.explanation, str)
    assert result.chart_data is None


@pytest.mark.anyio
async def test_monte_carlo_method_runs():
    method = MonteCarloMethod()
    result = await method.run("TEST")
    assert result.method_id == "monte_carlo"
    assert result.method_name == "Monte Carlo Simulation"
    assert result.category == "quant"
    assert result.symbol == "TEST"
    assert isinstance(result.result, dict)
    assert "note" in result.result
    assert result.signal == "neutral"
    assert result.confidence == 0.3
    assert isinstance(result.explanation, str)
    assert result.chart_data is None