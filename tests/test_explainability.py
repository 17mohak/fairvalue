"""SHAP feature-name mapping back to original features."""

from src.fairness.explain_shap import original_feature
from src.features.preprocess import FEATURES_FULL


def test_original_feature_mapping():
    assert original_feature("num__age_squared", FEATURES_FULL) == "age"
    assert original_feature("num__missingindicator_club_ppg", FEATURES_FULL) == "club_ppg"
    assert original_feature("num__goals_p90", FEATURES_FULL) == "goals_p90"
    assert original_feature("cat__position_Attack", FEATURES_FULL) == "position"
    assert original_feature("cat__sub_position_Centre-Forward", FEATURES_FULL) == "sub_position"
    assert original_feature("cat__valuation_league_id_GB1", FEATURES_FULL) == "valuation_league_id"
    assert original_feature("cat__foot_infrequent_sklearn", FEATURES_FULL) == "foot"
