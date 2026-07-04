import math
import pytest

from app.services.analysis.quantitative import VasicekMethod


def test_vasicek_zcb_price():
    method = VasicekMethod()
    # Example parameters: a=0.1, b=0.05, sigma=0.01, r0=0.03, T=5
    result = method._compute({
        "a": 0.1,      # speed of mean reversion
        "b": 0.05,     # long-term mean level
        "sigma": 0.01, # volatility
        "r0": 0.03,    # current short rate
        "T": 5         # maturity in years
    })
    # Using analytic formula: P(t,T) = A(t,T) * exp(-B(t,T) * r_t)
    # where B = (1 - exp(-a*T))/a
    #      A = exp((b - sigma^2/(2*a^2))*(B - T) - (sigma^2/(4*a))*B^2)
    a = 0.1
    b = 0.05
    sigma = 0.01
    r0 = 0.03
    T = 5
    B = (1 - math.exp(-a * T)) / a
    A = math.exp((b - sigma**2 / (2 * a**2)) * (B - T) - (sigma**2 / (4 * a)) * B**2)
    expected = A * math.exp(-B * r0)
    assert abs(result["value"] - expected) < 1e-4