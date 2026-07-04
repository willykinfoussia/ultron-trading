import math
from app.services.analysis.quantitative import HullWhiteMethod


def test_hull_white_zcb_price():
    method = HullWhiteMethod()
    result = method._compute({
        "a": 0.1,      # mean reversion
        "sigma": 0.01, # volatility
        "r0": 0.03,    # current short rate
        "T": 5.0,      # maturity
        "b": 0.0       # long term mean
    })
    a = 0.1
    b = 0.0
    sigma = 0.01
    r0 = 0.03
    T = 5.0
    B = (1 - math.exp(-a * T)) / a
    A = math.exp((b - sigma**2 / (2 * a**2)) * (B - T) - (sigma**2 / (4 * a)) * B**2)
    expected = A * math.exp(-B * r0)
    assert abs(result["value"] - expected) < 1e-4