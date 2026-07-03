# Quantitative Analysis Methods
# To be implemented: Markowitz, CAPM, Black-Scholes, Binomial Tree,
# Vasicek, Hull-White, Heston, Merton Credit, VaR, Monte Carlo

import numpy as np
import pandas as pd
from .base import AnalysisMethod, AnalysisResult
from .utils import cov_matrix, annualize_ret, annualize_vol


class MarkowitzMethod(AnalysisMethod):
    """Mean-variance portfolio optimization (Markowitz)."""

    @property
    def method_id(self) -> str:
        return "markowitz"

    @property
    def method_name(self) -> str:
        return "Markowitz Mean-Variance Optimization"

    @property
    def category(self) -> str:
        return "quant"

    @property
    def description(self) -> str:
        return ("Computes optimal portfolio weights for a target return or "
                "minimum volatility using historical returns.")

    @property
    def parameters(self) -> dict:
        return {
            "target_return": {
                "type": "float",
                "default": 0.1,
                "min": -1.0,
                "max": 2.0,
            },
            "risk_free_rate": {
                "type": "float",
                "default": 0.02,
                "min": 0.0,
                "max": 0.1,
            },
            "lookback_days": {
                "type": "int",
                "default": 252,
                "min": 30,
                "max": 1000,
            },
        }

    async def run(self, symbol: str, **params) -> AnalysisResult:
        # symbol is ignored; we treat it as a placeholder
        # for a portfolio ticker list.
        lookback = int(params.get("lookback_days", 252))
        target_ret = float(params.get("target_return", 0.1))
        rf = float(params.get("risk_free_rate", 0.02))

        # For demo, use random returns; in production fetch a basket
        returns = pd.DataFrame({
            "A": np.random.normal(0.001, 0.02, lookback),
            "B": np.random.normal(0.0008, 0.015, lookback)
        })
        Sigma = cov_matrix(returns)
        mu = returns.mean().values

        # Minimize w'Σw subject to w'μ = target, sum(w)=1, w>=0 (long-only)
        from scipy.optimize import minimize
        n = len(mu)
        def port_var(w): return w @ Sigma @ w
        def port_ret(w): return w @ mu
        constraints = [
            {"type": "eq", "fun": lambda w: np.sum(w) - 1},
            {"type": "eq", "fun": lambda w: port_ret(w) - target_ret}
        ]
        bounds = tuple((0, 1) for _ in range(n))
        w0 = np.ones(n) / n
        res = minimize(
            port_var, w0, bounds=bounds, constraints=constraints
        )
        weights = res.x if res.success else w0
        port_mu = port_ret(weights)
        port_vol = np.sqrt(port_var(weights))
        sharpe = (port_mu - rf) / port_vol if port_vol > 0 else 0

        # Prepare weights dictionary for explanation
        weights_dict = dict(
            zip(returns.columns, map(lambda x: round(x, 3), weights))
        )

        return AnalysisResult(
            method_id=self.method_id,
            method_name=self.method_name,
            category=self.category,
            symbol=symbol.upper(),
            result={
                "weights": dict(zip(returns.columns, map(float, weights))),
                "expected_return": float(port_mu),
                "volatility": float(port_vol),
                "sharpe_ratio": float(sharpe),
                "target_return": target_ret,
                "risk_free_rate": rf,
            },
            signal=(
                "buy" if sharpe > 1 else
                "neutral" if sharpe > 0 else
                "sell"
            ),
            confidence=min(
                0.95,
                0.5 + abs(sharpe) * 0.2
            ),
            explanation=(
                f"Markowitz optimization yields weights {weights_dict} "
                f"with expected annual return {annualize_ret(port_mu):.2%} "
                f"and volatility {annualize_vol(port_vol):.2%}."
            ),
            chart_data={
                "type": "pie",
                "labels": list(returns.columns),
                "data": list(map(float, weights)),
            },
        )


class CAPMMethod(AnalysisMethod):
    """Capital Asset Pricing Model (CAPM) for expected return estimation."""

    @property
    def method_id(self) -> str:
        return "capm"

    @property
    def method_name(self) -> str:
        return "Capital Asset Pricing Model"

    @property
    def category(self) -> str:
        return "quant"

    @property
    def description(self) -> str:
        return ("Estimates expected return using CAPM: E(R) = Rf + β*(Rm - Rf). "
                "Compares expected vs actual returns to generate signals.")

    @property
    def parameters(self) -> dict:
        return {
            "market_symbol": {
                "type": "str",
                "default": "^GSPC",
                "description": "Market index ticker (e.g., ^GSPC for S&P 500)"
            },
            "risk_free_rate": {
                "type": "float",
                "default": 0.02,
                "min": 0.0,
                "max": 0.1,
                "description": "Risk-free rate (e.g., 0.02 for 2%)"
            },
            "period": {
                "type": "str",
                "default": "1y",
                "description": "Historical data period (e.g., 1y, 6mo, 3mo)"
            }
        }

    async def run(self, symbol: str, **params) -> AnalysisResult:
        import yfinance as yf
        import numpy as np

        market_symbol = params.get("market_symbol", "^GSPC")
        risk_free = float(params.get("risk_free_rate", 0.02))
        period = params.get("period", "1y")

        # Fetch historical data
        stock = yf.Ticker(symbol.upper())
        market = yf.Ticker(market_symbol)
        stock_hist = stock.history(period=period)
        market_hist = market.history(period=period)

        if stock_hist.empty or market_hist.empty:
            raise ValueError(f"Insufficient data for {symbol} or {market_symbol}")

        # Calculate returns
        stock_returns = stock_hist['Close'].pct_change().dropna()
        market_returns = market_hist['Close'].pct_change().dropna()

        # Align dates
        aligned = pd.concat([stock_returns, market_returns], axis=1, join='inner')
        aligned.columns = ['stock', 'market']
        if aligned.empty:
            raise ValueError("No overlapping dates for stock and market data")

        stock_returns = aligned['stock'].values
        market_returns = aligned['market'].values

        # Calculate beta = covariance(stock, market) / variance(market)
        covariance = np.cov(stock_returns, market_returns)[0][1]
        market_variance = np.var(market_returns)
        if market_variance == 0:
            beta = 0
        else:
            beta = covariance / market_variance

        # Calculate expected return (CAPM)
        market_return = np.mean(market_returns)
        expected_return = risk_free + beta * (market_return - risk_free)

        # Actual average return of the stock
        actual_return = np.mean(stock_returns)

        # Alpha = actual - expected
        alpha = actual_return - expected_return

        # Determine signal based on alpha
        if alpha > 0:
            signal = "buy"
            confidence = min(0.95, 0.5 + abs(alpha) * 10)  # Scale factor for confidence
        else:
            signal = "sell"
            confidence = min(0.95, 0.5 + abs(alpha) * 10)

        # Annualize returns (assuming 252 trading days)
        ann_expected = (1 + expected_return) ** 252 - 1
        ann_actual = (1 + actual_return) ** 252 - 1
        ann_alpha = ann_actual - ann_expected

        return AnalysisResult(
            method_id=self.method_id,
            method_name=self.method_name,
            category=self.category,
            symbol=symbol.upper(),
            result={
                "beta": float(beta),
                "expected_return": float(expected_return),
                "actual_return": float(actual_return),
                "alpha": float(alpha),
                "annualized_expected_return": float(ann_expected),
                "annualized_actual_return": float(ann_actual),
                "annualized_alpha": float(ann_alpha),
                "market_return": float(market_return),
                "risk_free_rate": risk_free,
            },
            signal=signal,
            confidence=max(0.0, min(0.95, confidence)),  # Clamp to [0, 0.95]
            explanation=(
                f"CAPM analysis: β={beta:.2f}, expected return {ann_expected:.2%}, "
                f"actual return {ann_actual:.2%}, alpha {ann_alpha:.2%}. "
                f"Stock {'outperforms' if alpha > 0 else 'underperforms'} expected return."
            ),
            chart_data={
                "type": "scatter",
                "x_label": "Market Returns",
                "y_label": "Stock Returns",
                "x_data": market_returns.tolist(),
                "y_data": stock_returns.tolist(),
                "beta": beta,
                "alpha": alpha,
            },
        )


class BinomialTreeMethod(AnalysisMethod):
    """Binomial tree option pricing model."""

    @property
    def method_id(self) -> str:
        return "binomial_tree"

    @property
    def method_name(self) -> str:
        return "Binomial Tree Model"

    @property
    def category(self) -> str:
        return "quant"

    @property
    def description(self) -> str:
        return ("Prices options using a binomial lattice-based model, "
                "showing possible paths the underlying asset's price can take.")

    @property
    def parameters(self) -> dict:
        return {}

    async def run(self, symbol: str, **params) -> AnalysisResult:
        return AnalysisResult(
            method_id=self.method_id,
            method_name=self.method_name,
            category=self.category,
            symbol=symbol.upper(),
            result={"note": "Stub implementation for Binomial Tree model"},
            signal="neutral",
            confidence=0.3,
            explanation="Stub implementation for Binomial Tree option pricing model.",
            chart_data=None,
        )


class VasicekMethod(AnalysisMethod):
    """Vasicek interest rate model."""

    @property
    def method_id(self) -> str:
        return "vasicek"

    @property
    def method_name(self) -> str:
        return "Vasicek Model"

    @property
    def category(self) -> str:
        return "quant"

    @property
    def description(self) -> str:
        return ("Models interest rate movements using mean-reverting stochastic process.")

    @property
    def parameters(self) -> dict:
        return {}

    async def run(self, symbol: str, **params) -> AnalysisResult:
        return AnalysisResult(
            method_id=self.method_id,
            method_name=self.method_name,
            category=self.category,
            symbol=symbol.upper(),
            result={"note": "Stub implementation for Vasicek interest rate model"},
            signal="neutral",
            confidence=0.3,
            explanation="Stub implementation for Vasicek interest rate model.",
            chart_data=None,
        )


class HullWhiteMethod(AnalysisMethod):
    """Hull-White interest rate model."""

    @property
    def method_id(self) -> str:
        return "hull_white"

    @property
    def method_name(self) -> str:
        return "Hull-White Model"

    @property
    def category(self) -> str:
        return "quant"

    @property
    def description(self) -> str:
        return ("Extends the Vasicek model with time-dependent parameters for better fit to term structure.")

    @property
    def parameters(self) -> dict:
        return {}

    async def run(self, symbol: str, **params) -> AnalysisResult:
        return AnalysisResult(
            method_id=self.method_id,
            method_name=self.method_name,
            category=self.category,
            symbol=symbol.upper(),
            result={"note": "Stub implementation for Hull-White model"},
            signal="neutral",
            confidence=0.3,
            explanation="Stub implementation for Hull-White interest rate model.",
            chart_data=None,
        )


class HestonMethod(AnalysisMethod):
    """Heston stochastic volatility model."""

    @property
    def method_id(self) -> str:
        return "heston"

    @property
    def method_name(self) -> str:
        return "Heston Model"

    @property
    def category(self) -> str:
        return "quant"

    @property
    def description(self) -> str:
        return ("Models stochastic volatility with mean-reverting variance process, "
                "used for option pricing.")

    @property
    def parameters(self) -> dict:
        return {}

    async def run(self, symbol: str, **params) -> AnalysisResult:
        return AnalysisResult(
            method_id=self.method_id,
            method_name=self.method_name,
            category=self.category,
            symbol=symbol.upper(),
            result={"note": "Stub implementation for Heston stochastic volatility model"},
            signal="neutral",
            confidence=0.3,
            explanation="Stub implementation for Heston stochastic volatility model.",
            chart_data=None,
        )


class MertonCreditMethod(AnalysisMethod):
    """Merton structural credit risk model."""

    @property
    def method_id(self) -> str:
        return "merton_credit"

    @property
    def method_name(self) -> str:
        return "Merton Credit Model"

    @property
    def category(self) -> str:
        return "quant"

    @property
    def description(self) -> str:
        return ("Models credit risk using structural approach, treating equity as a call option on assets.")

    @property
    def parameters(self) -> dict:
        return {}

    async def run(self, symbol: str, **params) -> AnalysisResult:
        return AnalysisResult(
            method_id=self.method_id,
            method_name=self.method_name,
            category=self.category,
            symbol=symbol.upper(),
            result={"note": "Stub implementation for Merton credit risk model"},
            signal="neutral",
            confidence=0.3,
            explanation="Stub implementation for Merton structural credit risk model.",
            chart_data=None,
        )


class VaRMethod(AnalysisMethod):
    """Value at Risk (VaR) calculation."""

    @property
    def method_id(self) -> str:
        return "var"

    @property
    def method_name(self) -> str:
        return "Value at Risk"

    @property
    def category(self) -> str:
        return "quant"

    @property
    def description(self) -> str:
        return ("Estimates potential loss in value of a portfolio over a defined period for a given confidence interval.")

    @property
    def parameters(self) -> dict:
        return {}

    async def run(self, symbol: str, **params) -> AnalysisResult:
        return AnalysisResult(
            method_id=self.method_id,
            method_name=self.method_name,
            category=self.category,
            symbol=symbol.upper(),
            result={"note": "Stub implementation for Value at Risk (VaR) calculation"},
            signal="neutral",
            confidence=0.3,
            explanation="Stub implementation for Value at Risk (VaR) calculation.",
            chart_data=None,
        )


class MonteCarloMethod(AnalysisMethod):
    """Monte Carlo simulation for derivatives pricing and risk analysis."""

    @property
    def method_id(self) -> str:
        return "monte_carlo"

    @property
    def method_name(self) -> str:
        return "Monte Carlo Simulation"

    @property
    def category(self) -> str:
        return "quant"

    @property
    def description(self) -> str:
        return ("Uses random sampling to simulate various outcomes for complex financial instruments and portfolios.")

    @property
    def parameters(self) -> dict:
        return {}

    async def run(self, symbol: str, **params) -> AnalysisResult:
        return AnalysisResult(
            method_id=self.method_id,
            method_name=self.method_name,
            category=self.category,
            symbol=symbol.upper(),
            result={"note": "Stub implementation for Monte Carlo simulation"},
            signal="neutral",
            confidence=0.3,
            explanation="Stub implementation for Monte Carlo simulation.",
            chart_data=None,
        )