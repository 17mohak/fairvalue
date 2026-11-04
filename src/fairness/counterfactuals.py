"""Feature-based DiCE counterfactuals on the tier classifier (Milestone 5, D-022).

Usage:
    python -m src.fairness.counterfactuals [--per-cell 60]

What this is (and is not)
    * Question: "for this player, what change in MATCH STATISTICS would move the model's
      predicted tier up one level?" Answers are compared between UEFA and non-UEFA players.
    * It is NOT a nationality counterfactual. Nationality/confederation is not a model input,
      so changing it cannot change any prediction (tested in tests/test_leakage.py).
    * Changing club or league is NOT treated as equivalent to changing nationality: league,
      club strength, age, height, position and foot are held fixed.
    * Results describe the served classifier's decision surface for each group. They are not
      advice to players and not causal statements.

Design
    * Sample: players matched within league and position (same propensity matching as the scope
      analysis), complete cases only. Tier-stratified random sample by the model's current
      predicted tier (Emerging/Established/Elite), `per_cell` players per group and tier, seed 42.
    * Mutable: goals_p90, assists_p90, minutes, start_share, intl_club_minutes_share, each
      limited to the 1st-99th percentile of the training data. goal_contrib_p90 and
      minutes_per_appearance are recomputed from their parts by a wrapper, so counterfactuals
      stay internally consistent.
    * DiCE "random" method, 10 candidate counterfactuals per player, desired class = predicted tier + 1.
      Per player, the counterfactual with the smallest normalised change is summarised.

Outputs: reports/explainability/dice_*.csv
"""

import argparse
import logging

import dice_ml
import numpy as np
import pandas as pd

from src.config import RANDOM_SEED, REPORTS_DIR, get_logger
from src.fairness.scope_analysis import load as load_universe
from src.fairness.scope_analysis import within_league
from src.features.preprocess import CONTEXT_CATEGORICAL, PERFORMANCE_CATEGORICAL, feature_columns
from src.models.final import load_model
from src.models.tiers import TIER_NAMES
from src.models.train import load_training_data

log = get_logger(__name__)
logging.getLogger("dice_ml").setLevel(logging.WARNING)
OUT = REPORTS_DIR / "explainability"
MUTABLE = ["goals_p90", "assists_p90", "minutes", "start_share", "intl_club_minutes_share"]
DERIVED = ["goal_contrib_p90", "minutes_per_appearance"]
LABEL = {"full": "Model A", "performance": "Model B"}
N_CFS = 10  # candidates per player; the closest valid one is summarised


class ConsistentClassifier:
    """Wraps the served pipeline: recompute derived features before predicting."""

    def __init__(self, pipe, feature_set):
        self.pipe, self.cols = pipe, feature_columns(feature_set)
        self.classes_ = pipe.classes_

    def _complete(self, X):
        X = X.copy()
        X["goal_contrib_p90"] = X["goals_p90"] + X["assists_p90"]
        X["minutes_per_appearance"] = X["minutes"] / X["appearances"]
        return X[self.cols]

    def predict_proba(self, X):
        return self.pipe.predict_proba(self._complete(X))

    def predict(self, X):
        return self.pipe.predict(self._complete(X))


def matched_player_ids() -> set:
    """Players in the league x position propensity-matched sample (both groups)."""
    u = load_universe()
    _, _, e, _ = within_league(u)
    caliper = 0.2 * e.logit.std()
    ids = set()
    for _, d in e.groupby("valuation_league_id"):
        nu, uf = d[d.y == 1], d[d.y == 0]
        for _, r in nu.iterrows():
            c = uf[uf.position == r.position]
            if len(c) and (c.logit - r.logit).abs().min() <= caliper:
                ids.add(int(r.player_id))
                ids.add(int(c.loc[(c.logit - r.logit).abs().idxmin(), "player_id"]))
    return ids


def run(feature_set: str, df: pd.DataFrame, is_n: np.ndarray, matched: set, per_cell: int) -> pd.DataFrame:
    cols = feature_columns(feature_set)
    dice_cols = [c for c in cols if c not in DERIVED]
    categorical = [c for c in PERFORMANCE_CATEGORICAL + CONTEXT_CATEGORICAL if c in dice_cols]
    continuous = [c for c in dice_cols if c not in categorical]

    # DiCE's data interface needs no missing values: fill only for range statistics.
    frame = df[dice_cols].copy()
    frame[categorical] = frame[categorical].fillna("missing")
    frame[continuous] = frame[continuous].fillna(frame[continuous].median())
    frame["tier"] = df["tier"].to_numpy()
    data = dice_ml.Data(dataframe=frame, continuous_features=continuous, outcome_name="tier")
    model = ConsistentClassifier(load_model("classifier", feature_set), feature_set)
    explainer = dice_ml.Dice(data, dice_ml.Model(model=model, backend="sklearn"), method="random")
    ranges = {c: [float(df[c].quantile(0.01)), float(df[c].quantile(0.99))] for c in MUTABLE}
    mad = {c: float((df[c] - df[c].median()).abs().median()) or float(df[c].std()) for c in MUTABLE}

    pred = model.predict(df[dice_cols])
    complete = df[dice_cols].notna().all(axis=1).to_numpy()
    eligible = complete & df.player_id.isin(matched).to_numpy() & (pred < len(TIER_NAMES) - 1)
    rng = np.random.default_rng(RANDOM_SEED)
    rows = []
    for g_name, g_mask in [("UEFA", ~is_n), ("non-UEFA", is_n)]:
        for k in range(len(TIER_NAMES) - 1):
            idx = np.where(eligible & g_mask & (pred == k))[0]
            pick = rng.choice(idx, size=min(per_cell, len(idx)), replace=False)
            for i in pick:
                q = df[dice_cols].iloc[[i]]
                out = {"model": LABEL[feature_set], "player_id": int(df.player_id.iloc[i]), "group": g_name,
                       "predicted_tier": TIER_NAMES[k], "target_tier": TIER_NAMES[k + 1], "found": False}
                # The player's own value must lie inside the permitted range, or DiCE rejects the query.
                own = {c: [min(lo, float(q[c].iloc[0])), max(hi, float(q[c].iloc[0]))] for c, (lo, hi) in ranges.items()}
                try:
                    res = explainer.generate_counterfactuals(
                        q, total_CFs=N_CFS, desired_class=int(k + 1), features_to_vary=MUTABLE,
                        permitted_range=own, random_seed=RANDOM_SEED, verbose=False)
                    cfs = res.cf_examples_list[0].final_cfs_df
                except Exception as exc:  # DiCE raises when no counterfactual is found
                    out["note"] = type(exc).__name__
                    cfs = None
                if cfs is not None and len(cfs):
                    cfs = cfs[model.predict(cfs[dice_cols]) == k + 1]
                if cfs is not None and len(cfs):
                    delta = cfs[MUTABLE].astype(float).to_numpy() - q[MUTABLE].astype(float).to_numpy()
                    dist = np.abs(delta / np.array([mad[c] for c in MUTABLE])).sum(axis=1)
                    b = int(np.argmin(dist))
                    d = dict(zip(MUTABLE, delta[b]))
                    out |= {"found": True, "n_features_changed": int((np.abs(delta[b]) > 1e-9).sum()),
                            "normalised_distance": float(dist[b]),
                            "delta_goal_contrib_p90": d["goals_p90"] + d["assists_p90"],
                            "delta_minutes": d["minutes"], "delta_start_share": d["start_share"],
                            "delta_intl_club_minutes_share": d["intl_club_minutes_share"],
                            "base_goal_contrib_p90": float(q.goals_p90.iloc[0] + q.assists_p90.iloc[0])}
                rows.append(out)
            log.info("%s %s %s: %d players", LABEL[feature_set], g_name, TIER_NAMES[k], len(pick))
    return pd.DataFrame(rows)


def compare(res: pd.DataFrame, n_boot: int = 2000) -> pd.DataFrame:
    """Group comparison per model and tier: found rate and median required change, with bootstrap CIs."""
    rows = []
    rng = np.random.default_rng(RANDOM_SEED)
    metrics = {"found_rate": lambda d: d.found.mean(),
               "median_normalised_distance": lambda d: d.loc[d.found, "normalised_distance"].median(),
               "median_delta_goal_contrib_p90": lambda d: d.loc[d.found, "delta_goal_contrib_p90"].median(),
               "median_n_features_changed": lambda d: d.loc[d.found, "n_features_changed"].median()}
    for (model, tier), d in list(res.groupby(["model", "predicted_tier"])) + \
            [((m, "ALL"), d) for m, d in res.groupby("model")]:
        u, n = d[d.group == "UEFA"], d[d.group == "non-UEFA"]
        for name, f in metrics.items():
            est = f(n) - f(u)
            reps = [f(n.sample(len(n), replace=True, random_state=int(rng.integers(1e9)))) -
                    f(u.sample(len(u), replace=True, random_state=int(rng.integers(1e9)))) for _ in range(n_boot)]
            lo, hi = np.nanpercentile(reps, [2.5, 97.5])
            rows.append({"model": model, "predicted_tier": tier, "metric": name, "UEFA": f(u), "non_UEFA": f(n),
                         "n_UEFA": len(u), "n_nonUEFA": len(n), "gap_nonUEFA_minus_UEFA": est,
                         "ci95_low": lo, "ci95_high": hi})
    return pd.DataFrame(rows)


def main(per_cell: int = 60) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    df = load_training_data()
    from src.config import PROCESSED_DIR
    audit = pd.read_parquet(PROCESSED_DIR / "audit_lookup.parquet")[["player_id", "audit_group"]]
    is_n = df[["player_id"]].merge(audit, on="player_id", how="left").audit_group.eq("non-UEFA").to_numpy()
    matched = matched_player_ids()
    log.info("Matched players available: %d", len(matched))
    res = pd.concat([run(fs, df, is_n, matched, per_cell) for fs in ["full", "performance"]], ignore_index=True)
    res.to_csv(OUT / "dice_counterfactuals.csv", index=False)
    compare(res, n_boot=1000).round(4).to_csv(OUT / "dice_group_comparison.csv", index=False)
    log.info("Wrote DiCE outputs to %s", OUT)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--per-cell", type=int, default=60)
    main(ap.parse_args().per_cell)
