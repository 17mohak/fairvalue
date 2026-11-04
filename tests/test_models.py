"""Tier labels, fold construction and the cross-validation loop."""

import numpy as np
import pandas as pd
import pytest

from src.config import PROCESSED_DIR
from src.models.evaluate import classification_metrics, regression_metrics
from src.models.tiers import TIER_BOUNDARIES_EUR, assign_tier, derive_boundaries
from src.models.train import N_FOLDS, cv_classifier, cv_regression, make_folds
from tests.test_leakage import toy_frame


def test_tier_boundaries_are_inclusive_at_the_lower_edge():
    vals = [1_999_999, 2_000_000, 9_999_999, 10_000_000, 30_000_000, 2e8]
    assert assign_tier(vals).tolist() == [0, 1, 1, 2, 3, 3]


def test_folds_cover_every_row_once_and_are_tier_stratified():
    tier = np.repeat([0, 1, 2, 3], [500, 300, 150, 50])
    folds = make_folds(tier)
    assert set(folds) == set(range(N_FOLDS))
    for k in range(N_FOLDS):  # each fold holds ~1/5 of every tier
        np.testing.assert_allclose(np.bincount(tier[folds == k]), np.bincount(tier) / N_FOLDS, atol=1)


def toy_training_frame(n=200):
    df = toy_frame(n=n, seed=1).drop(columns=["country_of_citizenship", "confederation", "audit_group"])
    rng = np.random.default_rng(2)
    df["y_log"] = 14 + 0.5 * df["goals_p90"] + 0.3 * df["club_ppg"] + rng.normal(0, 0.3, n)
    df["tier"] = np.digitize(df["y_log"], np.quantile(df["y_log"], [0.5, 0.8, 0.95]))
    df["player_id"] = np.arange(n)
    return df


@pytest.mark.parametrize("algo", ["ridge", "random_forest", "hgb"])
def test_cv_regression_gives_one_heldout_prediction_per_row(algo):
    df = toy_training_frame()
    folds = make_folds(df["tier"].to_numpy())
    oof, fold_metrics, _ = cv_regression(df, folds, algo, "full", n_trials=0)
    assert oof.shape == (len(df),) and not np.isnan(oof).any()
    assert len(fold_metrics) == N_FOLDS


def test_nested_tuning_runs_and_returns_params():
    df = toy_training_frame(120)
    folds = make_folds(df["tier"].to_numpy())
    oof, _, params = cv_regression(df, folds, "hgb_tuned", "performance", n_trials=2)
    assert not np.isnan(oof).any()
    assert len(params) == N_FOLDS and all("learning_rate" in p for p in params)


def test_cv_classifier_probabilities_are_valid():
    df = toy_training_frame()
    proba, _ = cv_classifier(df, make_folds(df["tier"].to_numpy()), "performance")
    np.testing.assert_allclose(proba.sum(1), 1.0, atol=1e-6)


def test_metric_scales():
    y = np.log([1e6, 2e6, 4e6])
    m = regression_metrics(y, y)
    assert m["log_rmse"] == 0 and m["eur_mae"] == 0 and m["log_r2"] == 1
    m2 = regression_metrics(np.log([1e6, 4e6]), np.log([2e6, 2e6]))
    np.testing.assert_allclose(m2["log_mae"], np.log(2))
    np.testing.assert_allclose(m2["eur_mae"], 1.5e6)
    c = classification_metrics(np.array([0, 1, 2, 3]), np.array([0, 2, 2, 0]))
    assert c["accuracy"] == 0.5 and c["adjacent_accuracy"] == 0.75


@pytest.mark.data
@pytest.mark.skipif(not (PROCESSED_DIR / "model_dataset.parquet").exists(), reason="processed data not built")
def test_fixed_tier_boundaries_match_the_data():
    v = pd.read_parquet(PROCESSED_DIR / "model_dataset.parquet")["market_value_in_eur"]
    assert derive_boundaries(v) == tuple(float(b) for b in TIER_BOUNDARIES_EUR)


@pytest.mark.data
@pytest.mark.skipif(not (PROCESSED_DIR / "model_dataset.parquet").exists(), reason="processed data not built")
def test_training_data_excludes_drift_snapshot():
    import json

    from src.models.train import load_training_data

    meta = json.loads((PROCESSED_DIR / "build_metadata.json").read_text())
    d = load_training_data()
    assert d["valuation_date"].gt(pd.Timestamp(meta["ref_date"])).all()
