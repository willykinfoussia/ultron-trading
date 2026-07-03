def test_utils_import():
    from app.services.analysis.utils import cov_matrix
    assert callable(cov_matrix)