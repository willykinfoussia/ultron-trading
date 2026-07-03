import numpy as np
import pandas as pd
import pytest
from app.services.analysis.utils import cov_matrix, annualize, simulate_gbm_paths

def test_cov_matrix():
    # Simple test: two assets with known covariance
    returns = pd.DataFrame({
        'A': [0.1, 0.2, 0.15, 0.05],
        'B': [0.05, 0.1, 0.08, 0.03]
    })
    # Compute expected covariance manually
    expected = returns.cov().values
    result = cov_matrix(returns)
    assert np.allclose(result, expected)

def test_annualize():
    # Test annualizing a simple return
    ret = 0.01  # 1% per period
    periods_per_year = 252
    expected = (1 + ret) ** periods_per_year - 1
    result = annualize(ret, periods_per_year)
    assert np.isclose(result, expected)
    # Test default periods_per_year
    result_default = annualize(ret)
    assert np.isclose(result_default, expected)

def test_simulate_gbm_paths():
    S0 = 100.0
    mu = 0.05
    sigma = 0.2
    T = 1.0
    steps = 252
    n_paths = 1000
    paths = simulate_gbm_paths(S0, mu, sigma, T, steps, n_paths)
    # Check shape: (steps+1, n_paths)
    assert paths.shape == (steps + 1, n_paths)
    # Check initial value
    assert np.allclose(paths[0, :], S0)
    # Check that the output is 2D
    assert len(paths.shape) == 2