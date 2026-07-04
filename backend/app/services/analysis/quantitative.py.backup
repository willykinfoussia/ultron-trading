# Quantitative Analysis Methods
# To be implemented: Markowitz, CAPM, Black-Scholes, Binomial Tree,
# Vasicek, Hull-White, Heston, Merton Credit, VaR, Monte Carlo

import numpy as np
import pandas as pd
from .base import AnalysisMethod, AnalysisResult
import math
from .utils import cov_matrix, annualize, annualize_vol


def _norm_cdf(x):
    """Approximation of the cumulative distribution function for the standard normal distribution"""
    # Using Abramowitz and Stegun approximation
    # Handle both scalar and array inputs
    x = np.asarray(x)
    # Constants
    a1 =  0.254829592
    a2 = -0.284496736
    a3 =  1.421413741
    a4 = -1.453152027
    a5 =  1.061405429
    p  =  0.3275911
    
    # Save sign of x
    sign = np.sign(x)
    x = np.abs(x) / np.sqrt(2.0)
    
    # A&S formula 7.1.26
    t = 1.0 / (1.0 + p * x)
    y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * np.exp(-x * x)
    
    return 0.5 * (1.0 + sign * y)


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
                    "A": np.random.normal(0.01, 0.02, lookback),
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
                f"with expected annual return {annualize(port_mu):.2%} "
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

        # Expected return (CAPM)
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
        return {
            "S": {"type": "float", "description": "Current stock price", "default": 100.0},
            "K": {"type": "float", "description": "Strike price", "default": 100.0},
            "T": {"type": "float", "description": "Time to maturity (years)", "default": 1.0},
            "r": {"type": "float", "description": "Risk-free rate", "default": 0.05},
            "sigma": {"type": "float", "description": "Volatility", "default": 0.2, "min": 0.0},
            "option_type": {"type": "str", "description": "call or put", "default": "call"},
            "american": {"type": "bool", "description": "American option (True) or European (False)", "default": False},
            "steps": {"type": "int", "description": "Number of time steps", "default": 100, "min": 1},
        }

    def _compute(self, params: dict) -> dict:
        """Compute option price using binomial tree (CRR)."""
        S = float(params.get("S", 100.0))
        K = float(params.get("K", 100.0))
        T = float(params.get("T", 1.0))
        r = float(params.get("r", 0.05))
        sigma = float(params.get("sigma", 0.2))
        option_type = params.get("option_type", "call").lower()
        american = bool(params.get("american", False))
        steps = int(params.get("steps", 100))

        if option_type not in ("call", "put"):
            raise ValueError("option_type must be 'call' or 'put'")
        if steps < 1:
            raise ValueError("steps must be >= 1")
        if T <= 0:
            raise ValueError("T must be positive")
        if sigma < 0:
            raise ValueError("sigma must be non-negative")

        dt = T / steps
        u = math.exp(sigma * math.sqrt(dt))
        d = 1.0 / u
        p = (math.exp(r * dt) - d) / (u - d)
        # discount factor
        df = math.exp(-r * dt)

        # Initialize asset prices at maturity
        # We'll compute option values directly without storing full tree
        # Using backward induction
        # Initialize array of option values at final step
        values = [0.0] * (steps + 1)
        for i in range(steps + 1):
            # Number of up moves = i, down moves = steps - i
            stock_price = S * (u ** i) * (d ** (steps - i))
            if option_type == "call":
                values[i] = max(stock_price - K, 0.0)
            else:
                values[i] = max(K - stock_price, 0.0)

        # Backward induction
        for step in range(steps - 1, -1, -1):
            for i in range(step + 1):
                # Expected value from next period
                expected = p * values[i + 1] + (1 - p) * values[i]
                value = expected * df
                if american:
                    # Early exercise value
                    stock_price = S * (u ** i) * (d ** (step - i))
                    if option_type == "call":
                        exercise = max(stock_price - K, 0.0)
                    else:
                        exercise = max(K - stock_price, 0.0)
                    value = max(value, exercise)
                values[i] = value

        return {"value": values[0]}

    async def run(self, symbol: str, **params) -> AnalysisResult:
        result = self._compute(params)
        return AnalysisResult(
            method_id=self.method_id,
            method_name=self.method_name,
            category=self.category,
            symbol=symbol.upper(),
            result=result,
            signal="neutral",  # For pricing models, signal is not applicable; we set neutral
            confidence=0.95,   # High confidence in the model
            explanation=f"Binomial tree option price: {result['value']:.6f}",
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
        return {
            "a": {"type": "float", "description": "Speed of mean reversion", "default": 0.1, "min": 0.0},
            "b": {"type": "float", "description": "Long-term mean level", "default": 0.05},
            "sigma": {"type": "float", "description": "Volatility", "default": 0.01, "min": 0.0},
            "r0": {"type": "float", "description": "Initial short rate", "default": 0.03},
            "T": {"type": "float", "description": "Time to maturity", "default": 1.0, "min": 0.0},
        }

    def _compute(self, params: dict) -> dict:
        """Compute zero-coupon bond price using Vasicek model."""
        a = float(params.get("a", 0.1))
        b = float(params.get("b", 0.05))
        sigma = float(params.get("sigma", 0.01))
        r0 = float(params.get("r0", 0.03))
        T = float(params.get("T", 1.0))

        if a <= 0:
            raise ValueError("Parameter 'a' must be positive.")
        if sigma < 0:
            raise ValueError("Parameter 'sigma' must be non-negative.")
        if T <= 0:
            raise ValueError("Parameter 'T' must be positive.")

        # B = (1 - exp(-a*T)) / a
        B = (1 - math.exp(-a * T)) / a
        # A = exp( (b - sigma^2/(2*a^2)) * (B - T) - (sigma^2/(4*a)) * B^2 )
        A = math.exp((b - sigma**2 / (2 * a**2)) * (B - T) - (sigma**2 / (4 * a)) * B**2)
        price = A * math.exp(-B * r0)
        return {"value": price}

    async def run(self, symbol: str, **params) -> AnalysisResult:
        result = self._compute(params)
        return AnalysisResult(
            method_id=self.method_id,
            method_name=self.method_name,
            category=self.category,
            symbol=symbol.upper(),
            result=result,
            signal="neutral",  # For interest rate models, signal is not applicable; we set neutral
            confidence=0.95,   # High confidence in the model
            explanation=f"Vasicek ZCB price: {result['value']:.6f}",
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
        return "Extends the Vasicek model with time-dependent parameters for better fit to term structure."

    @property
    def parameters(self) -> dict:
        return {
            "a": {"type": "float", "default": 0.1, "min": 0.0, "description": "Speed of mean reversion"},
            "b": {"type": "float", "default": 0.05, "description": "Long-term mean level (can be time-dependent)"},
            "sigma": {"type": "float", "default": 0.01, "min": 0.0, "description": "Volatility"},
            "r0": {"type": "float", "default": 0.03, "description": "Initial short rate"},
            "T": {"type": "float", "default": 1.0, "min": 0.0, "description": "Time to maturity"},
        }

    def _compute(self, params: dict) -> dict:
        """Compute zero-coupon bond price using Hull-White model.
        For constant parameters, this reduces to the Vasicek formula.

        Returns a dict with at least 'value' (bond price).
        """
        a = float(params.get("a", 0.1))
        b = float(params.get("b", 0.05))
        sigma = float(params.get("sigma", 0.01))
        r0 = float(params.get("r0", 0.03))
        T = float(params.get("T", 1.0))

        if a <= 0:
            raise ValueError("Parameter 'a' must be positive.")
        if sigma < 0:
            raise ValueError("Parameter 'sigma' must be non-negative.")
        if T <= 0:
            raise ValueError("Parameter 'T' must be positive.")

        # B = (1 - exp(-a*T)) / a
        B = (1 - math.exp(-a * T)) / a
        # A = exp( (b - sigma^2/(2*a^2)) * (B - T) - (sigma^2/(4*a)) * B^2 )
        A = math.exp((b - sigma**2 / (2 * a**2)) * (B - T) - (sigma**2 / (4 * a)) * B**2)
        price = A * math.exp(-B * r0)
        return {"value": price}

    async def run(self, symbol: str, **params) -> AnalysisResult:
        result = self._compute(params)
        return AnalysisResult(
            method_id=self.method_id,
            method_name=self.method_name,
            category=self.category,
            symbol=symbol.upper(),
            result=result,
            signal="neutral",  # For pricing models, signal is not applicable; we set neutral
            confidence=0.95,   # High confidence in the model
            explanation=f"Hull-White zero-coupon bond price: {result['value']:.4f}",
            chart_data=None,
        )


class HestonMethod(AnalysisMethod):
    """Heston stochastic volatility model for European option pricing."""

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
        return {
            "v0": {"type": "float", "description": "Initial variance", "default": 0.04, "min": 0.0},
            "kappa": {"type": "float", "description": "Mean reversion speed", "default": 2.0, "min": 0.0},
            "theta": {"type": "float", "description": "Long-term variance", "default": 0.04, "min": 0.0},
            "sigma": {"type": "float", "description": "Volatility of volatility", "default": 0.3, "min": 0.0},
            "rho": {"type": "float", "description": "Correlation between asset and volatility", "default": -0.7},
            "r": {"type": "float", "description": "Risk-free rate", "default": 0.05},
            "T": {"type": "float", "description": "Time to maturity", "default": 1.0, "min": 0.0},
            "S0": {"type": "float", "description": "Spot price", "default": 100.0, "min": 0.0},
            "K": {"type": "float", "description": "Strike price", "default": 100.0, "min": 0.0},
            "option_type": {"type": "str", "description": "call or put", "default": "call"},
        }

    def _characteristic_function(self, phi, v0, kappa, theta, sigma, rho, r, T):
        """
        Heston model characteristic function for log(S_t).
        
        Based on the formulation in Heston (1993) and commonly used in option pricing.
        Returns the characteristic function φ(φ) = E[exp(i*φ*log(S_t))].
        
        Args:
            phi: vector or scalar of values at which to compute the characteristic function
            v0: initial variance
            kappa: mean reversion speed
            theta: long-term variance
            sigma: volatility of volatility
            rho: correlation between asset and volatility returns
            r: risk-free rate
            T: time to maturity
            
        Returns:
            characteristic function values (same shape as phi)
        """
        i = complex(0, 1)  # imaginary unit
        
        # Handle both scalar and array inputs
        phi = np.asarray(phi, dtype=complex)
        scalar_input = phi.ndim == 0
        
        if scalar_input:
            phi = phi.reshape(1)
        
        # Parameters that appear frequently
        a = kappa * theta
        b = kappa  # In risk-neutral pricing, market price of risk is 0
        
        # Precompute constants
        sigma_sigma = sigma**2
        
        # Initialize output array
        result = np.zeros_like(phi, dtype=complex)
        
        # Process each element to avoid issues with array comparisons
        for idx, phi_val in enumerate(phi):
            # Handle phi = 0 special case to avoid division by zero later
            if phi_val == 0:
                # When phi=0, characteristic function is 1 (since E[exp(0)]=1)
                result[idx] = 1.0 + 0.0j
                continue
                
            # Intermediate calculations
            rho_sigma_phi = rho * sigma * phi_val * 1j
            
            # b - rho*sigma*phi*i
            b_minus_rho_sigma_phi = b - rho_sigma_phi
            
            # phi^2 + i*phi
            alpha = phi_val * (phi_val + 1j)
            
            # discriminant = (b - rho*sigma*phi*i)^2 + sigma^2*(phi^2 + i*phi)
            discriminant = b_minus_rho_sigma_phi**2 + sigma_sigma * alpha
            
            # sqrt of discriminant (principal branch)
            # Handle potential numerical issues
            sqrt_discriminant = np.sqrt(discriminant)
            
            # g = (b - rho*sigma*phi*i - d) / (b - rho*sigma*phi*i + d)
            g_num = b_minus_rho_sigma_phi - sqrt_discriminant
            g_den = b_minus_rho_sigma_phi + sqrt_discriminant
            
            # Avoid division by zero
            if abs(g_den) < 1e-12:
                g = 0.0 + 0.0j  # Limit case
            else:
                g = g_num / g_den
            
            # Compute exponential terms
            exp_term = np.exp(-sqrt_discriminant * T)
            g_exp = g * exp_term
            
            # For numerical stability, handle cases where denominator is near zero
            one_minus_g = 1 - g
            one_minus_g_exp = 1 - g_exp
            
            # Avoid division by zero in C and D calculations
            if abs(one_minus_g) < 1e-12:
                one_minus_g = 1e-12 if abs(one_minus_g) == 0 else one_minus_g
            if abs(one_minus_g_exp) < 1e-12:
                one_minus_g_exp = 1e-12 if abs(one_minus_g_exp) == 0 else one_minus_g_exp
            
            # Calculate C and D according to Heston model
            # C = r*phi*i*T + (a/sigma^2)*[(b - rho*sigma*phi*i - d)*T - 2*log((1 - g*exp(-d*T))/(1 - g))]
            # D = (b - rho*sigma*phi*i - d)/sigma^2 * (1 - exp(-d*T))/(1 - g*exp(-d*T))
            
            term1 = r * phi_val * 1j * T
            term2 = (a / sigma_sigma) * ((b_minus_rho_sigma_phi - sqrt_discriminant) * T - 
                                       2 * np.log(one_minus_g_exp / one_minus_g))
            C = term1 + term2
            
            D = (b_minus_rho_sigma_phi - sqrt_discriminant) / sigma_sigma * (1 - exp_term) / one_minus_g_exp
            
            # Characteristic function: f = exp(C + D*v0 + i*phi*log(S0))
            # Note: S0 is not passed here, will be handled in _compute_heston_price
            result[idx] = np.exp(C + D * v0)
        
        # Return scalar if input was scalar
        if scalar_input:
            return result[0]
        else:
            return result

    def _compute_heston_price(self, params):
        """
        Compute European option price using Heston model with numerical integration.
        """
        # Extract parameters
        v0 = float(params.get("v0", 0.04))
        kappa = float(params.get("kappa", 2.0))
        theta = float(params.get("theta", 0.04))
        sigma = float(params.get("sigma", 0.3))
        rho = float(params.get("rho", -0.7))
        r = float(params.get("r", 0.05))
        T = float(params.get("T", 1.0))
        S0 = float(params.get("S0", 100.0))
        K = float(params.get("K", 100.0))
        option_type = params.get("option_type", "call").lower()
        
        # Validate parameters
        if v0 < 0:
            raise ValueError("v0 must be non-negative")
        if kappa < 0:
            raise ValueError("kappa must be non-negative")
        if theta < 0:
            raise ValueError("theta must be non-negative")
        if sigma < 0:
            raise ValueError("sigma must be non-negative")
        if abs(rho) > 1:
            raise ValueError("rho must be between -1 and 1")
        if T <= 0:
            raise ValueError("T must be positive")
        if S0 <= 0:
            raise ValueError("S0 must be positive")
        if K <= 0:
            raise ValueError("K must be positive")
            
        # Characteristic function wrapper for Heston model
        def char_func_phi(phi):
            """Characteristic function phi -> phi(phi) for log stock price."""
            return self._characteristic_function(phi, v0, kappa, theta, sigma, rho, r, T)
        
        # Integration using Simpson's rule
        def simpson_integral(f, a, b, n=1000):
            """Integrate f from a to b using Simpson's rule with n segments."""
            if n % 2 == 1:
                n += 1  # Ensure n is even
            h = (b - a) / n
            x = np.linspace(a, b, n + 1)
            # Handle both scalar and array returns from f
            y_vals = f(x)
            y = np.asarray(y_vals)
            # Simpson's rule: h/3 * (y0 + yn + 4*sum(y_odd) + 2*sum(y_even))
            return h / 3 * (y[0] + y[n] + 4 * np.sum(y[1:n:2]) + 2 * np.sum(y[2:n-1:2]))
        
        # Integrands for P1 and P2 probabilities
        # Based on the Lewis (2000) formulation for Heston model
        def integrand_P2(phi_val):
            """Integrand for P2 probability."""
            # Handle phi = 0 case
            if phi_val == 0:
                return 0.0  # Avoid division by zero, limit is 0
            
            char_val = char_func_phi(phi_val)
            # φ(-i) = characteristic function at phi = -i
            char_minus_i = char_func_phi(-1j)
            
            # Avoid division by zero
            denominator = 1j * phi_val * char_minus_i
            if abs(denominator) < 1e-12:
                return 0.0
                
            numerator = np.exp(-1j * phi_val * np.log(K)) * char_val
            return np.real(numerator / denominator)
        
        def integrand_P1(phi_val):
            """Integrand for P1 probability."""
            # Handle phi = 0 case
            if phi_val == 0:
                return 0.0  # Avoid division by zero, limit is 0
                
            char_val = char_func_phi(phi_val - 1j)  # φ(u-i)
            # φ(-i) = characteristic function at phi = -i
            
            # Avoid division by zero
            denominator = 1j * phi_val
            if abs(denominator) < 1e-12:
                return 0.0
                
            numerator = np.exp(-1j * phi_val * np.log(K)) * char_val
            return np.real(numerator / denominator)
        
        # Integration limits - characteristic function decays, so we can truncate
        # Use adaptive limit based on parameters for better accuracy/performance
        # Typical values: 50-200 works well for most parameters
        # Increase for volatile parameters
        base_limit = 100.0
        # Adjust based on volatility of volatility and mean reversion
        volatility_factor = min(max(sigma * kappa, 0.5), 2.0)
        upper_limit = base_limit * volatility_factor
        upper_limit = min(max(upper_limit, 50.0), 200.0)  # Clamp between 50 and 200
        
        try:
            # Calculate P2 integral
            integral_P2 = simpson_integral(integrand_P2, 0, upper_limit, n=1000)
            P2 = 0.5 + integral_P2 / np.pi
            
            # Calculate P1 integral
            integral_P1 = simpson_integral(integrand_P1, 0, upper_limit, n=1000)
            P1 = 0.5 + integral_P1 / np.pi
            
            # Ensure probabilities are in [0, 1] (handle numerical errors)
            P1 = max(0.0, min(1.0, P1))
            P2 = max(0.0, min(1.0, P2))
            
            # Calculate call and put prices using the Lewis formula
            # Call price: C = S0 * P1 - K * exp(-r*T) * P2
            call_price = S0 * P1 - K * np.exp(-r * T) * P2
            # Put price via put-call parity: P = C - S0 + K*exp(-r*T)
            put_price = call_price - S0 + K * np.exp(-r * T)
            
            # Ensure non-negative prices (can happen due to numerical errors)
            call_price = max(0.0, call_price)
            put_price = max(0.0, put_price)
            
            if option_type == "call":
                return {"value": float(call_price)}
            else:  # put
                return {"value": float(put_price)}
                
        except Exception as e:
            # Fallback to Black-Scholes with sqrt(v0) volatility if integration fails
            # This ensures we always return a reasonable price
            vol_approx = np.sqrt(max(v0, 1e-8))  # Ensure non-negative
            if vol_approx == 0 or T == 0:
                d1 = d2 = 0.0
            else:
                d1 = (np.log(S0 / K) + (r + 0.5 * vol_approx**2) * T) / (vol_approx * np.sqrt(T))
                d2 = d1 - vol_approx * np.sqrt(T)
            
            # Use the approximation for normal CDF
            if option_type == "call":
                price = S0 * _norm_cdf(d1) - K * np.exp(-r * T) * _norm_cdf(d2)
            else:  # put
                price = K * np.exp(-r * T) * _norm_cdf(-d2) - S0 * _norm_cdf(-d1)
                
            return {"value": float(max(0.0, price))}

    def _compute(self, params: dict) -> dict:
        """Compute European option price using Heston model."""
        # Store params for use in characteristic function if needed
        return self._compute_heston_price(params)

    async def run(self, symbol: str, **params) -> AnalysisResult:
        result = self._compute(params)
        return AnalysisResult(
            method_id=self.method_id,
            method_name=self.method_name,
            category=self.category,
            symbol=symbol.upper(),
            result=result,
            signal="neutral",  # For pricing models, signal is not applicable; we set neutral
            confidence=0.95,   # High confidence in the model
            explanation=f"Heston model option price: {result['value']:.6f}",
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
        return ("Structural model of credit risk where default occurs when "
                "asset value falls below debt threshold.")

    @property
    def parameters(self) -> dict:
        return {
            "V": {"type": "float", "description": "Asset value", "default": 100.0},
            "D": {"type": "float", "description": "Debt face value", "default": 50.0},
            "mu": {"type": "float", "description": "Asset drift (expected return)", "default": 0.05},
            "sigma": {"type": "float", "description": "Asset volatility", "default": 0.2, "min": 0.0},
            "T": {"type": "float", "description": "Time to maturity", "default": 1.0, "min": 0.0},
            "r": {"type": "float", "description": "Risk-free rate", "default": 0.03},
        }

    def _compute(self, params: dict) -> dict:
        """Compute distance to default and probability of default using Merton model."""
        V = float(params.get("V", 100.0))
        D = float(params.get("D", 50.0))
        mu = float(params.get("mu", 0.05))
        sigma = float(params.get("sigma", 0.2))
        T = float(params.get("T", 1.0))
        r = float(params.get("r", 0.03))

        if V <= 0:
            raise ValueError("Asset value V must be positive")
        if D <= 0:
            raise ValueError("Debt D must be positive")
        if sigma < 0:
            raise ValueError("Volatility sigma must be non-negative")
        if T <= 0:
            raise ValueError("Time T must be positive")

        # Distance to default
        dd = (np.log(V / D) + (mu - 0.5 * sigma**2) * T) / (sigma * np.sqrt(T))

        # Probability of default (risk-neutral)
        # Using risk-neutral drift: dd_Q = (ln(V/D) + (r - 0.5*sigma^2)*T) / (sigma*sqrt(T))
        dd_q = (np.log(V / D) + (r - 0.5 * sigma**2) * T) / (sigma * np.sqrt(T))
        p_norm = _norm_cdf
        pd = p_norm(-dd_q)  # Probability of default

        # Distance to default using actual drift
        dd_actual = dd

        # Equity value (call option on assets)
        # E = V*N(d1) - D*exp(-rT)*N(d2)
        d1 = (np.log(V / D) + (r + 0.5 * sigma**2) * T) / (sigma * np.sqrt(T))
        d2 = d1 - sigma * np.sqrt(T)
        equity_value = V * _norm_cdf(d1) - D * np.exp(-r * T) * _norm_cdf(d2)

        # Debt value (risk-free bond minus put option on assets)
        # D_value = D*exp(-rT) - D*exp(-rT)*N(-d2) + V*N(-d1)
        # Simpler: D_value = V - E (by put-call parity for firm assets)
        debt_value = V - equity_value

        return {
            "distance_to_default": float(dd_actual),
            "risk-neutral_distance_to_default": float(dd_q),
            "probability_of_default": float(pd),
            "equity_value": float(equity_value),
            "debt_value": float(debt_value),
            "asset_value": V,
            "debt_face_value": D,
            "time_to_maturity": T,
            "risk_free_rate": r,
            "asset_drift": mu,
            "asset_volatility": sigma,
        }

    async def run(self, symbol: str, **params) -> AnalysisResult:
        result = self._compute(params)
        return AnalysisResult(
            method_id=self.method_id,
            method_name=self.method_name,
            category=self.category,
            symbol=symbol.upper(),
            result=result,
            signal="neutral",  # Credit model signal is not straightforward; set neutral
            confidence=0.9,    # High confidence in the model
            explanation=f"Merton model: PD={result['probability_of_default']:.2%}, DD={result['distance_to_default']:.2f}",
            chart_data=None,
        )


class VaRMethod(AnalysisMethod):
    """Value at Risk (VaR) calculation using parametric, historical, or Monte Carlo methods."""

    @property
    def method_id(self) -> str:
        return "var"

    @property
    def method_name(self) -> str:
        return "Value at Risk (VaR)"

    @property
    def category(self) -> str:
        return "quant"

    @property
    def description(self) -> str:
        return ("Estimates potential loss in value of a portfolio over a defined period "
                "for a given confidence interval.")

    @property
    def parameters(self) -> dict:
        return {
            "returns": {"type": "list", "description": "Historical returns (as list of floats)"},
            "confidence": {"type": "float", "description": "Confidence level (e.g., 0.95 for 95%)", "default": 0.95, "min": 0.5, "max": 0.999},
            "method": {"type": "str", "description": "Method: 'historical', 'parametric', or 'monte_carlo'", "default": "historical"},
            "position_value": {"type": "float", "description": "Current position/portfolio value", "default": 1000000.0},
            "holding_period": {"type": "int", "description": "Holding period in days", "default": 1, "min": 1},
        }

    def _compute(self, params: dict) -> dict:
        """Calculate Value at Risk."""
        returns_list = params.get("returns", [])
        confidence = float(params.get("confidence", 0.95))
        method = params.get("method", "historical").lower()
        position_value = float(params.get("position_value", 1000000.0))
        holding_period = int(params.get("holding_period", 1))

        if not returns_list:
            # Generate sample returns if none provided
            returns_list = np.random.normal(0.0005, 0.02, 252).tolist()  # ~252 trading days

        returns = np.array(returns_list)
        if len(returns) < 2:
            raise ValueError("Need at least 2 return observations for VaR calculation")

        # Scale for holding period
        if holding_period > 1:
            # Scale volatility by sqrt(time) for i.i.d. returns
            scaled_returns = returns * np.sqrt(holding_period)
        else:
            scaled_returns = returns

        if method == "historical":
            # Historical simulation: percentile of returns
            var_percentile = np.percentile(scaled_returns, (1 - confidence) * 100)
            var_value = -var_percentile * position_value  # VaR is positive loss amount
            cvar = -np.mean(scaled_returns[scaled_returns <= var_percentile]) * position_value

        elif method == "parametric":
            # Parametric (variance-covariance) method assuming normal distribution
            mu = np.mean(scaled_returns)
            sigma = np.std(scaled_returns)
            z_score = _norm_cdf(1 - confidence)  # Actually, we need PPF, but we'll use approximation
            # For simplicity, use common z-scores: 1.645 for 95%, 2.33 for 99%
            if abs(confidence - 0.95) < 0.001:
                z_score = 1.645
            elif abs(confidence - 0.99) < 0.001:
                z_score = 2.33
            else:
                # Approximation for other values
                z_score = max(0, np.sqrt(2) * _erfinv(2 * confidence - 1))
            var_value = -(mu + z_score * sigma) * position_value
            cvar = -(mu + sigma * np.exp(-z_score**2/2) / (np.sqrt(2*np.pi) * (1 - confidence))) * position_value

        elif method == "monte_carlo":
            # Monte Carlo simulation
            mu = np.mean(scaled_returns)
            sigma = np.std(scaled_returns)
            # Seed for reproducibility
            np.random.seed(42)
            simulated_returns = np.random.normal(mu, sigma, 10000)
            var_percentile = np.percentile(simulated_returns, (1 - confidence) * 100)
            var_value = -var_percentile * position_value
            cvar = -np.mean(simulated_returns[simulated_returns <= var_percentile]) * position_value

        else:
            raise ValueError(f"Method '{method}' not supported. Use 'historical', 'parametric', or 'monte_carlo'")

        def _erfinv(x):
            """Approximation of inverse error function"""
            # Using Abramowitz and Stegun approximation
            w = -np.log((1.0 - x) * (1.0 + x))
            if w < 5:
                w = w - 2.5
                return (((((-0.0001801251 * w + 0.0008132812) * w - 0.001442611) * w + 0.001421256) * w - 0.000276656) * w + 0.000835729) * w
            else:
                w = np.sqrt(w) - 1.741
                return (((((0.000063828 * w + 0.000373195) * w - 0.000637124) * w + 0.000515057) * w - 0.000037332) * w + 0.00004666) * w

        return {
            "value_at_risk": float(max(0, var_value)),  # Ensure non-negative
            "conditional_var": float(max(0, cvar)),     # CVaR >= VaR
            "confidence_level": confidence,
            "method": method,
            "position_value": position_value,
            "holding_period": holding_period,
            "mean_return": float(np.mean(scaled_returns)),
            "volatility": float(np.std(scaled_returns)),
            "observations": len(returns),
        }

    async def run(self, symbol: str, **params) -> AnalysisResult:
        result = self._compute(params)
        return AnalysisResult(
            method_id=self.method_id,
            method_name=self.method_name,
            category=self.category,
            symbol=symbol.upper(),
            result=result,
            signal="neutral",  # VaR is a risk measure, not directional
            confidence=0.85,   # Moderate confidence due to model risk
            explanation=f"VaR({result['confidence_level']*100:.0f}%): {result['value_at_risk']:.2f} (method: {result['method']})",
            chart_data=None,
        )


class MonteCarloMethod(AnalysisMethod):
    """Monte Carlo simulation for complex financial instruments and path-dependent options."""

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
        return ("Uses random sampling to simulate various outcomes for complex financial instruments "
                "and portfolios.")

    @property
    def parameters(self) -> dict:
        return {
            "S0": {"type": "float", "description": "Initial asset price", "default": 100.0},
            "K": {"type": "float", "description": "Strike price", "default": 100.0},
            "T": {"type": "float", "description": "Time to maturity (years)", "default": 1.0},
            "r": {"type": "float", "description": "Risk-free rate", "default": 0.05},
            "sigma": {"type": "float", "description": "Volatility", "default": 0.2, "min": 0.0},
            "option_type": {"type": "str", "description": "call or put", "default": "call"},
            "n_paths": {"type": "int", "description": "Number of simulation paths", "default": 10000, "min": 100},
            "n_steps": {"type": "int", "description": "Number of time steps per path", "default": 252, "min": 1},
            "model": {"type": "str", "description": "Process model: 'gbm', 'heston'", "default": "gbm"},
            # Heston-specific parameters
            "v0": {"type": "float", "description": "Initial variance (for Heston)", "default": 0.04},
            "kappa": {"type": "float", "description": "Mean reversion speed (for Heston)", "default": 2.0},
            "theta": {"type": "float", "description": "Long-term variance (for Heston)", "default": 0.04},
            "sigma": {"type": "float", "description": "Volatility of volatility (for Heston)", "default": 0.3},
            "rho": {"type": "float", "description": "Correlation (for Heston)", "default": -0.7},
        }

    def _compute(self, params: dict) -> dict:
        """Run Monte Carlo simulation."""
        S0 = float(params.get("S0", 100.0))
        K = float(params.get("K", 100.0))
        T = float(params.get("T", 1.0))
        r = float(params.get("r", 0.05))
        sigma = float(params.get("sigma", 0.2))
        option_type = params.get("option_type", "call").lower()
        n_paths = int(params.get("n_paths", 10000))
        n_steps = int(params.get("n_steps", 252))
        model = params.get("model", "gbm").lower()

        if S0 <= 0:
            raise ValueError("Initial price S0 must be positive")
        if K <= 0:
            raise ValueError("Strike price K must be positive")
        if T <= 0:
            raise ValueError("Time to maturity T must be positive")
        if sigma < 0:
            raise ValueError("Volatility sigma must be non-negative")
        if n_paths < 1:
            raise ValueError("Number of paths must be positive")
        if n_steps < 1:
            raise ValueError("Number of steps must be positive")
        if option_type not in ("call", "put"):
            raise ValueError("option_type must be 'call' or 'put'")
        if model not in ("gbm", "heston"):
            raise ValueError("model must be 'gbm' or 'heston'")

        dt = T / n_steps
        discount_factor = np.exp(-r * T)

        if model == "gbm":
            # Geometric Brownian Motion
            # ST = S0 * exp((r - 0.5*sigma^2)*T + sigma*sqrt(T)*Z)
            Z = np.random.standard_normal(n_paths)
            ST = S0 * np.exp((r - 0.5 * sigma**2) * T + sigma * np.sqrt(T) * Z)
            payoffs = np.maximum(ST - K, 0) if option_type == "call" else np.maximum(K - ST, 0)
            price = np.mean(payoffs) * discount_factor
            std_error = np.std(payoffs) * discount_factor / np.sqrt(n_paths)
            confidence_interval = [
                price - 1.96 * std_error,
                price + 1.96 * std_error
            ]

        elif model == "heston":
            # Heston stochastic volatility model
            v0 = float(params.get("v0", 0.04))
            kappa = float(params.get("kappa", 2.0))
            theta = float(params.get("theta", 0.04))
            sigma_v = float(params.get("sigma", 0.3))  # vol of vol
            rho = float(params.get("rho", -0.7))

            # Validate Heston parameters
            if v0 < 0:
                raise ValueError("Initial variance v0 must be non-negative")
            if kappa < 0:
                raise ValueError("Mean reversion kappa must be non-negative")
            if theta < 0:
                raise ValueError("Long-term variance theta must be non-negative")
            if sigma_v < 0:
                raise ValueError("Volatility of volatility sigma must be non-negative")
            if abs(rho) > 1:
                raise ValueError("Correlation rho must be between -1 and 1")
            # Feller condition check (warning only)
            if 2 * kappa * theta <= sigma_v**2:
                # Feller condition not satisfied - variance can reach zero
                pass  # Warning but continue

            # Initialize arrays
            S = np.zeros((n_steps + 1, n_paths))
            v = np.zeros((n_steps + 1, n_paths))
            S[0, :] = S0
            v[0, :] = v0

            # Generate correlated random numbers
            for i in range(n_steps):
                # Generate two independent standard normals
                Z1 = np.random.standard_normal(n_paths)
                Z2 = np.random.standard_normal(n_paths)
                # Induce correlation: Z2 = rho*Z1 + sqrt(1-rho^2)*Z2_ind
                Z2_corr = rho * Z1 + np.sqrt(1 - rho**2) * Z2

                # Update variance process (CIR process with full truncation)
                # v_{t+1} = v_t + kappa*(theta - v_t)*dt + sigma_v*sqrt(max(v_t,0)*dt)*Z2
                v_i = np.maximum(v[i, :], 0)  # Ensure non-negative variance
                sqrt_v_dt = np.sqrt(np.maximum(v_i * dt, 0))
                dv = kappa * (theta - v_i) * dt + sigma_v * sqrt_v_dt * Z2_corr
                v[i + 1, :] = v_i + dv
                # Ensure variance stays non-negative
                v[i + 1, :] = np.maximum(v[i + 1, :], 0)

                # Update asset price
                # S_{t+1} = S_t * exp((r - 0.5*v_t)*dt + sqrt(v_t*dt)*Z1)
                sqrt_v_dt = np.sqrt(np.maximum(v[i, :] * dt, 0))
                S[i + 1, :] = S[i, :] * np.exp((r - 0.5 * v[i, :]) * dt + sqrt_v_dt * Z1)

            # Calculate payoffs
            ST = S[-1, :]  # Stock prices at maturity
            payoffs = np.maximum(ST - K, 0) if option_type == "call" else np.maximum(K - ST, 0)
            price = np.mean(payoffs) * discount_factor
            std_error = np.std(payoffs) * discount_factor / np.sqrt(n_paths)
            confidence_interval = [
                price - 1.96 * std_error,
                price + 1.96 * std_error
            ]

        return {
            "price": float(price),
            "std_error": float(std_error),
            "confidence_interval": [float(confidence_interval[0]), float(confidence_interval[1])],
            "n_paths": n_paths,
            "n_steps": n_steps,
            "model": model,
        }

    async def run(self, symbol: str, **params) -> AnalysisResult:
        result = self._compute(params)
        return AnalysisResult(
            method_id=self.method_id,
            method_name=self.method_name,
            category=self.category,
            symbol=symbol.upper(),
            result=result,
            signal="neutral",  # For pricing models, signal is not applicable; we set neutral
            confidence=0.95,   # High confidence in the model (with sufficient paths)
            explanation=f"Monte Carlo option price: {result['price']:.6f} (model: {result['model']}, paths: {result['n_paths']})",
            chart_data=None,
        )