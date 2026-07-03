import numpy as np
import pandas as pd
from typing import List, Tuple


def cov_matrix(returns: pd.DataFrame) -> np.ndarray:
    """Return covariance matrix of returns."""
    return returns.cov().values


def annualize_ret(ret: float, periods_per_year: int = 252) -> float:
    """Annualize a period return."""
    return (1 + ret) ** periods_per_year - 1


def annualize_vol(vol: float, periods_per_year: int = 252) -> float:
    """Annualize a period volatility."""
    return vol * np.sqrt(periods_per_year)


def simulate_gbm_paths(S0: float, mu: float, sigma: float, T: float, steps: int, n_paths: int) -> np.ndarray:
    """Simulate Geometric Brownian Motion paths."""
    dt = T / steps
    rand = np.random.normal(0, 1, size=(steps, n_paths))
    increments = (mu - 0.5 * sigma**2) * dt + sigma * np.sqrt(dt) * rand
    log_returns = np.cumsum(increments, axis=0)
    log_returns = np.vstack([np.zeros(n_paths), log_returns])
    paths = S0 * np.exp(log_returns)
    return paths