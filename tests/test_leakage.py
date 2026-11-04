"""Demographic leakage guards (requirement ER2).

Nationality and confederation must never reach the model. These tests check the
feature lists, the guard function, and - most importantly - that the fitted
preprocessing output does not change at all when demographic columns change.
"""

import numpy as np
import pandas as pd
import pytest

from src.features.preprocess import (
    ALL_FEATURES,
    FEATURES_PERFORMANCE,
    assert_no_demographic_columns,
    build_preprocessor,
    find_demographic_columns,
)


def toy_frame(n=60, seed=0):
    rng = np.random.default_rng(seed)
    return pd.DataFrame({
        "age": rng.uniform(18, 35, n),
        "height_in_cm": rng.uniform(170, 195, n),
        "appearances": rng.integers(10, 60, n),
        "minutes": rng.integers(500, 5000, n),
        "minutes_per_appearance": rng.uniform(30, 90, n),
        "start_share": rng.uniform(0, 1, n),
        "goals_p90": rng.uniform(0, 1, n),
        "assists_p90": rng.uniform(0, 0.5, n),
        "goal_contrib_p90": rng.uniform(0, 1.5, n),
        "yellow_p90": rng.uniform(0, 0.4, n),
        "red_p90": rng.uniform(0, 0.05, n),
        "intl_club_minutes_share": rng.uniform(0, 0.3, n),
        "minutes_last_365": rng.integers(0, 3000, n),
        "days_since_last_match": rng.integers(0, 400, n),
        "valuation_club_minutes_share": rng.uniform(0, 1, n),
        "club_ppg": rng.uniform(0.5, 2.5, n),
        "position": rng.choice(["Attack", "Midfield", "Defender", "Goalkeeper"], n),
        "sub_position": rng.choice(["Centre-Forward", "Central Midfield", "Centre-Back"], n),
        "foot": rng.choice(["right", "left", None], n),
        "valuation_league_id": rng.choice(["GB1", "ES1", "IT1"], n),
        # audit-only columns that must be ignored:
        "country_of_citizenship": rng.choice(["Spain", "Ghana"], n),
        "confederation": rng.choice(["UEFA", "CAF"], n),
        "audit_group": rng.choice(["UEFA", "non-UEFA"], n),
    })


def test_feature_lists_contain_no_demographic_columns():
    assert find_demographic_columns(ALL_FEATURES) == []
    assert find_demographic_columns(FEATURES_PERFORMANCE) == []


@pytest.mark.parametrize("col", [
    "country_of_citizenship", "confederation", "audit_group", "is_uefa",
    "nationality", "country_of_birth", "international_caps", "current_national_team_id",
])
def test_guard_rejects_demographic_columns(col):
    with pytest.raises(ValueError, match="Demographic"):
        assert_no_demographic_columns(["age", col])


@pytest.mark.parametrize("feature_set", ["full", "performance"])
def test_output_is_invariant_to_demographic_columns(feature_set):
    df = toy_frame()
    pre = build_preprocessor(feature_set).fit(df)
    before = pre.transform(df)

    flipped = df.copy()
    flipped["confederation"] = flipped["confederation"].map({"UEFA": "CAF", "CAF": "UEFA"})
    flipped["audit_group"] = flipped["audit_group"].map({"UEFA": "non-UEFA", "non-UEFA": "UEFA"})
    flipped["country_of_citizenship"] = "Brazil"
    after = pre.transform(flipped)

    a = before.toarray() if hasattr(before, "toarray") else before
    b = after.toarray() if hasattr(after, "toarray") else after
    np.testing.assert_array_equal(a, b)


@pytest.mark.parametrize("feature_set", ["full", "performance"])
def test_fitted_preprocessor_uses_only_declared_columns(feature_set):
    pre = build_preprocessor(feature_set).fit(toy_frame())
    used = [c for _, _, cols in pre.transformers_ if isinstance(cols, list) for c in cols]
    assert find_demographic_columns(used) == []
    # The performance-only model must not see league or club context.
    if feature_set == "performance":
        assert "valuation_league_id" not in used and "club_ppg" not in used


def test_python_none_is_treated_as_missing_in_categoricals():
    """Regression test: None must be imputed like NaN (it previously became its own category)."""
    df = toy_frame()
    pre = build_preprocessor("full").fit(df)
    a, b = df.iloc[:1].copy(), df.iloc[:1].copy()
    a["foot"], b["foot"] = None, np.nan
    np.testing.assert_array_equal(pre.transform(a), pre.transform(b))
