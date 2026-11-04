"""Supplementary checks: club-grouped folds and the residual ICC helper."""

import numpy as np

from src.fairness.supplementary import club_folds, icc_oneway


def test_club_folds_never_split_a_club():
    rng = np.random.default_rng(0)
    clubs = np.repeat(np.arange(40), 20)
    tier = rng.integers(0, 4, len(clubs))
    folds = club_folds(tier, clubs)
    for c in np.unique(clubs):
        assert len(set(folds[clubs == c])) == 1
    assert set(folds) == set(range(5))


def test_icc_detects_club_effect_and_its_absence():
    rng = np.random.default_rng(1)
    clubs = np.repeat(np.arange(100), 20)
    noise = rng.normal(0, 1, len(clubs))
    assert abs(icc_oneway(noise, clubs)) < 0.05
    effect = rng.normal(0, 1, 100)[clubs]  # between-club variance = within-club variance
    assert 0.4 < icc_oneway(effect + noise, clubs) < 0.6
