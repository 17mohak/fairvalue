"""Supplementary validation checks (D-026). They do NOT replace the primary protocol.

Usage:
    python -m src.fairness.supplementary [--boot 2000]

1. Grouped-by-club CV: how much does performance rely on seeing the same clubs in training
   and validation? Standard StratifiedKFold vs StratifiedGroupKFold (groups = valuation club),
   same algorithms and settings, held-out predictions in both cases.
2. Club-clustered bootstrap: players at the same club share context, so their residuals may be
   correlated. Resampling whole clubs (within league) instead of players gives CIs that allow
   for this. Compared with the primary player-level CIs.
3. Small-cell diagnostics for the per-tier equalized-odds components: denominators and the
   approximate minimum detectable TPR/FPR difference.

Outputs: reports/supplementary/*.csv
"""

import argparse

import numpy as np
import pandas as pd
from sklearn.model_selection import StratifiedGroupKFold

from src.config import PROCESSED_DIR, RANDOM_SEED, REPORTS_DIR, get_logger
from src.fairness.audit import load_frame, regression_stats, tier_stats
from src.features.preprocess import feature_columns
from src.models.evaluate import regression_metrics
from src.models.tiers import TIER_NAMES
from src.models.train import N_FOLDS, load_training_data, make_folds, make_regressor

log = get_logger(__name__)
OUT = REPORTS_DIR / "supplementary"


# ---------------------------------------------------------------------------
# 1. Grouped-by-club cross-validation
# ---------------------------------------------------------------------------
def club_folds(tier, clubs) -> np.ndarray:
    folds = np.empty(len(tier), dtype=int)
    sgkf = StratifiedGroupKFold(N_FOLDS, shuffle=True, random_state=RANDOM_SEED)
    for k, (_, te) in enumerate(sgkf.split(np.zeros(len(tier)), tier, groups=clubs)):
        folds[te] = k
    return folds


def median_tuned_params(feature_set) -> dict:
    """Fixed HGB settings = median of the per-fold Optuna optima (avoids re-tuning per scheme)."""
    p = pd.read_csv(REPORTS_DIR / "models" / "optuna_best_params.csv")
    p = p[p.feature_set == feature_set].drop(columns=["feature_set", "fold"]).median()
    ints = {"max_iter", "max_leaf_nodes", "min_samples_leaf"}
    return {k: (int(round(v)) if k in ints else float(v)) for k, v in p.items()}


def grouped_cv_check() -> tuple[pd.DataFrame, pd.DataFrame]:
    df = load_training_data()
    clubs = pd.read_parquet(PROCESSED_DIR / "player_universe.parquet")[["player_id", "valuation_club_id"]]
    df = df.merge(clubs, on="player_id", validate="one_to_one")
    audit = pd.read_parquet(PROCESSED_DIR / "audit_lookup.parquet")[["player_id", "audit_group"]]
    is_n = df.merge(audit, on="player_id").audit_group.eq("non-UEFA").to_numpy()
    schemes = {"standard (players)": make_folds(df.tier.to_numpy()),
               "grouped by club": club_folds(df.tier.to_numpy(), df.valuation_club_id.to_numpy())}
    # Sanity: in the grouped scheme no club appears in two folds.
    assert df.assign(f=schemes["grouped by club"]).groupby("valuation_club_id").f.nunique().max() == 1

    rows, gaps = [], []
    for fs in ["full", "performance"]:
        algos = {"ridge": {}, "hgb": {}, "hgb (median tuned params)": median_tuned_params(fs)}
        for algo, params in algos.items():
            for scheme, folds in schemes.items():
                X, y = df[feature_columns(fs)], df.y_log.to_numpy()
                oof = np.empty(len(df))
                for k in range(N_FOLDS):
                    tr, te = folds != k, folds == k
                    m = make_regressor("hgb" if algo.startswith("hgb") else algo, fs, params).fit(X[tr], y[tr])
                    oof[te] = m.predict(X[te])
                per_fold = [np.sqrt(np.mean((y[folds == k] - oof[folds == k]) ** 2)) for k in range(N_FOLDS)]
                met = regression_metrics(y, oof)
                rows.append({"model": "A" if fs == "full" else "B", "algorithm": algo, "cv_scheme": scheme,
                             "log_rmse_mean_fold": float(np.mean(per_fold)), "log_rmse_fold_sd": float(np.std(per_fold, ddof=1)),
                             "log_r2": met["log_r2"], "eur_r2": met["eur_r2"]})
                if algo == "hgb (median tuned params)":
                    res = y - oof
                    tmp = pd.DataFrame({"res_log_X": res, "nonuefa": is_n,
                                        "valuation_league_id": df.valuation_league_id.to_numpy()})
                    s = regression_stats(tmp.rename(columns={"res_log_X": "res_log_A"}), "A", "log")
                    gaps.append({"model": "A" if fs == "full" else "B", "cv_scheme": scheme,
                                 "signed_gap_league_stratified": s["signed_gap_league_stratified"],
                                 "mae_gap_league_stratified": s["mae_gap_league_stratified"]})
    t = pd.DataFrame(rows)
    piv = t.pivot_table(index=["model", "algorithm"], columns="cv_scheme", values="log_rmse_mean_fold")
    piv["increase_pct"] = 100 * (piv["grouped by club"] / piv["standard (players)"] - 1)
    return t, pd.DataFrame(gaps), piv.reset_index()


# ---------------------------------------------------------------------------
# 2. Club-clustered bootstrap
# ---------------------------------------------------------------------------
def icc_oneway(values, groups) -> float:
    """ANOVA ICC(1): share of residual variance that sits between clubs."""
    d = pd.DataFrame({"v": values, "g": groups})
    k = d.groupby("g").size()
    n, a = len(d), len(k)
    k0 = (n - (k ** 2).sum() / n) / (a - 1)
    grand = d.v.mean()
    msb = (k * (d.groupby("g").v.mean() - grand) ** 2).sum() / (a - 1)
    msw = ((d.v - d.groupby("g").v.transform("mean")) ** 2).sum() / (n - a)
    return float((msb - msw) / (msb + (k0 - 1) * msw))


def cluster_stats(d):
    out = {}
    for tag in "AB":
        r = regression_stats(d, tag, "log")
        t = tier_stats(d["true_tier"], d[f"clf_tier_{tag}"], d["nonuefa"])
        out |= {f"{tag}_signed_gap_league_stratified": r["signed_gap_league_stratified"],
                f"{tag}_mae_gap_league_stratified": r["mae_gap_league_stratified"],
                f"{tag}_ER1a_error_rate_gap": t["ER1a_error_rate_gap"],
                f"{tag}_under_tier_gap": t["under_tier_gap"],
                f"{tag}_ER1b_max_EOD": t["ER1b_max_EOD"]}
        out |= {f"{tag}_{n}_EOD": t[f"{n}_EOD"] for n in TIER_NAMES}
        out |= {f"{tag}_{n}_tpr_gap": t[f"{n}_tpr_gap"] for n in TIER_NAMES}
    return out


def clustered_bootstrap(n_boot) -> tuple[pd.DataFrame, pd.DataFrame]:
    df = load_frame("hgb_tuned")
    clubs = pd.read_parquet(PROCESSED_DIR / "player_universe.parquet")[["player_id", "valuation_club_id"]]
    df = df.merge(clubs, on="player_id", validate="one_to_one").reset_index(drop=True)
    icc = pd.DataFrame([{"model": tag, "icc_residual_within_club": icc_oneway(df[f"res_log_{tag}"], df.valuation_club_id)}
                        for tag in "AB"])

    # League -> list of club index arrays. Resample clubs with replacement within each league.
    by_league = {lg: list(d.groupby("valuation_club_id").indices.values())
                 for lg, d in df.groupby("valuation_league_id")}
    by_league = {lg: [df.index[df.valuation_league_id == lg][i] for i in idx] for lg, idx in by_league.items()}
    rng = np.random.default_rng(RANDOM_SEED)
    point = cluster_stats(df)
    reps = []
    for _ in range(n_boot):
        parts = []
        for clubs_idx in by_league.values():
            pick = rng.integers(0, len(clubs_idx), len(clubs_idx))
            parts.extend(clubs_idx[i] for i in pick)
        reps.append(cluster_stats(df.iloc[np.concatenate(parts)]))
    reps = pd.DataFrame(reps)

    player = pd.concat([pd.read_csv(REPORTS_DIR / "fairness" / f) for f in
                        ["regression_log_scale.csv", "tier_classifier.csv"]]).set_index("metric")
    rows = []
    for k, v in point.items():
        lo, hi = np.nanpercentile(reps[k], [2.5, 97.5])
        row = {"metric": k, "estimate": v, "club_ci95_low": lo, "club_ci95_high": hi}
        if k in player.index:
            pl = player.loc[k]
            row |= {"player_ci95_low": pl.ci95_low, "player_ci95_high": pl.ci95_high,
                    "width_ratio_club_vs_player": (hi - lo) / (pl.ci95_high - pl.ci95_low)}
        rows.append(row)
    return pd.DataFrame(rows), icc


# ---------------------------------------------------------------------------
# 3. Small cells in per-tier equalized odds
# ---------------------------------------------------------------------------
def tier_cell_power() -> pd.DataFrame:
    """Denominators of TPR/FPR by tier and group, and the approximate minimum detectable
    difference (two-sided alpha 0.05, power 0.80, normal approximation) at the observed rate."""
    df = load_frame("hgb_tuned")
    z = 1.96 + 0.84
    rows = []
    for tag in "AB":
        for k, name in enumerate(TIER_NAMES):
            pos, pred = df.true_tier == k, df[f"clf_tier_{tag}"] == k
            for kind, denom_mask in [("TPR", pos), ("FPR", ~pos)]:
                n_n = int((denom_mask & df.nonuefa).sum())
                n_u = int((denom_mask & ~df.nonuefa).sum())
                p = float(pred[denom_mask].mean())
                mdd = z * np.sqrt(p * (1 - p) * (1 / n_n + 1 / n_u))
                rows.append({"model": tag, "tier": name, "rate": kind, "denominator_nonUEFA": n_n,
                             "denominator_UEFA": n_u, "pooled_rate": round(p, 4),
                             "min_detectable_difference_pp": round(100 * mdd, 1)})
    return pd.DataFrame(rows)


def main(n_boot: int = 2000):
    OUT.mkdir(parents=True, exist_ok=True)
    log.info("1 grouped-by-club CV")
    t, gaps, piv = grouped_cv_check()
    t.round(4).to_csv(OUT / "grouped_cv_metrics.csv", index=False)
    piv.round(4).to_csv(OUT / "grouped_cv_rmse_comparison.csv", index=False)
    gaps.round(4).to_csv(OUT / "grouped_cv_fairness_gap.csv", index=False)
    log.info("2 club-clustered bootstrap")
    cb, icc = clustered_bootstrap(n_boot)
    cb.round(4).to_csv(OUT / "clustered_bootstrap.csv", index=False)
    icc.round(4).to_csv(OUT / "residual_icc.csv", index=False)
    log.info("3 tier cell power")
    tier_cell_power().to_csv(OUT / "tier_cell_power.csv", index=False)
    log.info("Wrote supplementary tables to %s", OUT)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--boot", type=int, default=2000)
    main(ap.parse_args().boot)
