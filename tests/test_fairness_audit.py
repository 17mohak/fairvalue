"""Fairness statistics: sign conventions, stratification and agreement with Fairlearn."""

import numpy as np
import pandas as pd
import pytest

from src.config import PROCESSED_DIR

from src.fairness.audit import (
    bootstrap,
    dropped_share,
    fairlearn_tier_check,
    load_frame,
    regression_stats,
    stratified_gap,
    tier_stats,
)


def test_stratified_gap_removes_league_composition_effect():
    # Within each league the groups are identical, but non-UEFA players are concentrated in the
    # league with larger residuals. The raw gap is non-zero; the stratified gap must be zero.
    res = np.array([1.0, 1.0, 1.0, 0.0, 0.0, 0.0])
    is_n = np.array([True, True, False, True, False, False])
    league = np.array(["X", "X", "X", "Y", "Y", "Y"])
    raw = res[is_n].mean() - res[~is_n].mean()
    assert raw != 0
    assert stratified_gap(res, is_n, ~is_n, league) == 0


def test_stratified_gap_weights_by_nonuefa_count():
    res = np.array([2.0, 0.0, 1.0, 0.0])
    is_n = np.array([True, False, True, False])
    league = np.array(["X", "X", "Y", "Y"])
    # gaps: X = 2, Y = 1; one non-UEFA player each -> mean 1.5
    assert stratified_gap(res, is_n, ~is_n, league) == 1.5


def test_strata_missing_a_group_are_skipped():
    res = np.array([5.0, 1.0, 0.0])
    is_n = np.array([True, True, False])
    league = np.array(["only_nonuefa", "Y", "Y"])
    assert stratified_gap(res, is_n, ~is_n, league) == 1.0


def test_signed_gap_sign_convention():
    """Non-UEFA players worth more than predicted -> positive residuals -> positive gap."""
    df = pd.DataFrame({
        "valuation_league_id": ["X"] * 4,
        "nonuefa": [True, True, False, False],
        "res_log_A": np.log([10e6, 10e6, 5e6, 5e6]) - np.log([5e6, 5e6, 5e6, 5e6]),
    })
    s = regression_stats(df, "A", "log")
    assert s["mean_residual_nonUEFA"] > 0 and s["mean_residual_UEFA"] == 0
    assert s["signed_gap_raw"] > 0 and s["signed_gap_league_stratified"] > 0


def test_bootstrap_preserves_stratum_sizes():
    df = pd.DataFrame({"valuation_league_id": list("XXXYYYYY"), "nonuefa": [1, 0, 0, 1, 1, 0, 0, 0],
                       "r": np.arange(8.0)})
    df["nonuefa"] = df["nonuefa"].astype(bool)
    want = df.groupby(["valuation_league_id", "nonuefa"]).size().to_dict()
    seen = []

    def fn(d):
        seen.append(d.groupby(["valuation_league_id", "nonuefa"]).size().to_dict())
        return {"m": float(d.r.mean())}

    bootstrap(df, fn, 20)
    assert all(c == want for c in seen)


def test_dropped_share_reports_strata_without_comparator():
    is_n = np.array([True, True, False])
    strata = np.array(["only_nonuefa", "Y", "Y"])
    assert dropped_share(is_n, strata) == 0.5


def test_tier_stats_match_fairlearn_and_directional_rates():
    rng = np.random.default_rng(0)
    true = rng.integers(0, 4, 400)
    pred = np.clip(true + rng.choice([-1, 0, 0, 1], 400), 0, 3)
    is_n = rng.random(400) < 0.3
    s = tier_stats(true, pred, is_n)
    f = fairlearn_tier_check(true, pred, np.where(is_n, "non-UEFA", "UEFA"))
    assert np.isclose(abs(s["ER1a_error_rate_gap"]), f["ER1a_error_rate_gap_fairlearn_abs"])
    for name in ["Emerging", "Established", "Elite", "World Class"]:
        assert np.isclose(s[f"{name}_EOD"], f[f"{name}_EOD_fairlearn"])
    # Error rate splits exactly into under- and over-tiering.
    for g in ["UEFA", "nonUEFA"]:
        assert np.isclose(s[f"error_rate_{g}"], s[f"under_tier_rate_{g}"] + s[f"over_tier_rate_{g}"])


def test_bootstrap_is_reproducible_and_brackets_estimate():
    rng = np.random.default_rng(1)
    df = pd.DataFrame({"valuation_league_id": rng.choice(["X", "Y"], 300), "nonuefa": rng.random(300) < 0.3,
                       "r": rng.normal(0, 1, 300)})
    fn = lambda d: {"gap": d.r[d.nonuefa].mean() - d.r[~d.nonuefa].mean()}
    a, b = bootstrap(df, fn, 200, seed=3), bootstrap(df, fn, 200, seed=3)
    pd.testing.assert_frame_equal(a, b)
    row = a.iloc[0]
    assert row.ci95_low <= row.estimate <= row.ci95_high


@pytest.mark.data
@pytest.mark.skipif(not (PROCESSED_DIR / "predictions" / "oof_full_ridge.parquet").exists(),
                    reason="held-out predictions not built")
def test_arrival_strata_partition_each_group():
    """Regression test for the object-dtype bug: ~recent_arrival must be a real boolean NOT."""
    df = load_frame("ridge")
    assert df["recent_arrival"].dtype == bool
    for g in [True, False]:
        m = df.nonuefa == g
        assert (m & df.recent_arrival).sum() + (m & ~df.recent_arrival).sum() == m.sum()
        assert 0 < (m & ~df.recent_arrival).sum() < m.sum()
