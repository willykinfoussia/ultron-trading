import numpy as np
from app.services.analysis.quantitative import HestonMethod

def test_heston_price_basic():
    method = HestonMethod()
    params = {
        "v0": 0.04,
        "kappa": 2.0,
        "theta": 0.04,
        "sigma": 0.1,
        "rho": -0.5,
        "r": 0.05,
        "T": 1.0,
        "S0": 100.0,
        "K": 100.0,
        "option_type": "call",
    }
    result = method._compute(params)
    price = result["value"]
    assert price > 0, f"Price should be positive, got {price}"
    assert price < params["S0"], f"Call price should be less than spot, got {price}"
    # Put-call parity approximation: C - P = S0 - K*exp(-rT)
    params_put = params.copy()
    params_put["option_type"] = "put"
    result_put = method._compute(params_put)
    put_price = result_put["value"]
    lhs = price - put_price
    rhs = params["S0"] - params["K"] * np.exp(-params["r"] * params["T"])
    assert abs(lhs - rhs) < 0.01, f"Put-call parity violated: {lhs} vs {rhs}"

def test_heston_monotonic_strike():
    method = HestonMethod()
    base = {
        "v0": 0.04,
        "kappa": 2.0,
        "theta": 0.04,
        "sigma": 0.1,
        "rho": -0.5,
        "r": 0.05,
        "T": 1.0,
        "S0": 100.0,
        "K": 100.0,
        "option_type": "call",
    }
    prices = []
    for K in [80, 90, 100, 110, 120]:
        p = base.copy()
        p["K"] = K
        res = method._compute(p)
        prices.append(res["value"])
    # Call price should be decreasing in strike
    for i in range(len(prices)-1):
        assert prices[i] >= prices[i+1], f"Price not monotonic decreasing: {prices}"
