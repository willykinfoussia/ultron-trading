def test_binomial_tree_european_call():
    from app.services.analysis.quantitative import BinomialTreeMethod
    method = BinomialTreeMethod()
    result = method._compute(
        {"S": 100.0, "K": 100.0, "T": 1.0, "r": 0.05, "sigma": 0.2, "option_type": "call", "american": False, "steps": 100}
    )
    assert 10.4 < result["value"] < 10.5