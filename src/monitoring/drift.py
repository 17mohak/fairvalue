"""Drift simulation and retraining-policy check using the reserved historical period (Milestone 7).

Usage:
    python -m src.monitoring.drift

Why simulate: there is no live traffic. The dataset's own history provides two snapshots
built by the same pipeline and the same eligibility rules:
    reference = valuations in (2024-06-12, 2025-06-12]   (reserved; never used by research models)
    current   = valuations in (2025-06-12, 2026-06-12]   (the approved training population)

Checks
    1. Feature and target drift: Evidently DataDriftPreset (all features) plus our own PSI for the
       monitored features (S-2: age, minutes, goal_contrib_p90, club_ppg, market value).
    2. Performance decay: a "last-year model" (same algorithm as the served regressor, default settings)
       is fit on the reference snapshot only, then scored on the current snapshot. Its error is
       compared with its own 5-fold CV error on the reference period. This model exists only for
       this simulation. Neither it nor the reference data ever enters research training or CV.
    3. The documented retraining policy (src/monitoring/policy.py) is applied to the results.

Outputs: reports/monitoring/ (drift_report.html, psi.csv, performance_decay.csv, policy_decision.json)
"""

import json
import os

os.environ.setdefault("DO_NOT_TRACK", "1")  # disable Evidently usage telemetry

import numpy as np
import pandas as pd
from evidently import DataDefinition, Dataset, Report
from evidently.presets import DataDriftPreset
from sklearn.model_selection import KFold

from src.config import MIN_MINUTES_FOR_PER90, PROCESSED_DIR, RANDOM_SEED, REPORTS_DIR, get_logger
from src.data.build_dataset import (
    PROFILE_COLUMNS,
    club_points_per_game,
    covered_leagues,
    load_all,
    performance_features,
)
from src.features.preprocess import (
    CONTEXT_CATEGORICAL,
    FEATURES_FULL,
    PERFORMANCE_CATEGORICAL,
    assert_no_demographic_columns,
)
from src.models.train import make_regressor
from src.monitoring.policy import MONITORED_FEATURES, evaluate_policy

log = get_logger(__name__)
OUT = REPORTS_DIR / "monitoring"
REF_PATH = PROCESSED_DIR / "drift_reference_features.parquet"


def build_reference_features() -> pd.DataFrame:
    """Same feature construction and eligibility as the training set, for the reference snapshot."""
    t = load_all()
    ref = pd.read_parquet(PROCESSED_DIR / "drift_reference.parquet")
    perf = performance_features(t["appearances"], t["game_events"], ref)
    ppg = club_points_per_game(t["games"], t["competitions"], ref)
    u = ref.merge(t["players"][PROFILE_COLUMNS], on="player_id", how="left", validate="one_to_one")
    u = u.merge(perf, on="player_id", how="left", validate="one_to_one")
    u = u.merge(ppg, on="player_id", how="left", validate="one_to_one")
    u["age"] = (u["valuation_date"] - u["date_of_birth"]).dt.days / 365.25
    u["height_in_cm"] = u["height_in_cm"].where(u["height_in_cm"].between(150, 215))
    u["minutes"] = u["minutes"].fillna(0)
    leagues = covered_leagues(t["appearances"], t["competitions"])
    keep = (u.valuation_league_id.isin(leagues) & (u.minutes >= MIN_MINUTES_FOR_PER90)
            & u.age.between(15, 45) & (u.market_value_in_eur > 0))
    out = u.loc[keep, ["player_id", "valuation_date", "market_value_in_eur"] + FEATURES_FULL].reset_index(drop=True)
    assert_no_demographic_columns(out.columns)
    out.to_parquet(REF_PATH, index=False)
    return out


def psi(ref: pd.Series, cur: pd.Series, bins: int = 10) -> float:
    """Population stability index with reference-quantile bins (0.1 small, 0.25 large shift)."""
    ref, cur = ref.dropna().to_numpy(), cur.dropna().to_numpy()
    edges = np.unique(np.quantile(ref, np.linspace(0, 1, bins + 1)))
    if len(edges) < 2:  # constant reference: split around the constant
        edges = np.array([edges[0] - 0.5, edges[0] + 0.5])
    edges[0], edges[-1] = -np.inf, np.inf
    r = np.histogram(ref, edges)[0] / len(ref)
    c = np.histogram(cur, edges)[0] / len(cur)
    r, c = np.clip(r, 1e-4, None), np.clip(c, 1e-4, None)
    return float(np.sum((c - r) * np.log(c / r)))


def evidently_report(ref: pd.DataFrame, cur: pd.DataFrame) -> dict:
    num = [c for c in FEATURES_FULL if c not in PERFORMANCE_CATEGORICAL + CONTEXT_CATEGORICAL] + ["log_value"]
    cat = PERFORMANCE_CATEGORICAL + CONTEXT_CATEGORICAL
    dd = DataDefinition(numerical_columns=num, categorical_columns=cat)
    snap = Report([DataDriftPreset()]).run(current_data=Dataset.from_pandas(cur[num + cat], data_definition=dd),
                                           reference_data=Dataset.from_pandas(ref[num + cat], data_definition=dd))
    snap.save_html(str(OUT / "drift_report.html"))
    d = snap.dict()
    rows = [{"metric": str(m.get("metric_id") or m.get("metric_name")), "value": m.get("value")} for m in d["metrics"]]
    pd.DataFrame(rows).to_csv(OUT / "evidently_metrics.csv", index=False)
    overall = next(r["value"] for r in rows if r["metric"].startswith("DriftedColumnsCount"))
    return {"drifted_columns": overall["count"], "drifted_share": overall["share"], "n_columns": len(num + cat)}


def performance_decay(ref: pd.DataFrame, cur: pd.DataFrame) -> pd.DataFrame:
    """Train on the reference period only; compare in-period CV error with error on the next year."""
    rows = []
    for fs in ["full", "performance"]:
        from src.features.preprocess import feature_columns
        # Default HGB settings: the Optuna parameters were tuned on the current window, which is
        # this simulation's test period, so reusing them would leak.
        cols, params = feature_columns(fs), {}
        y_ref, y_cur = ref.log_value.to_numpy(), cur.log_value.to_numpy()
        cv = []
        for tr, te in KFold(5, shuffle=True, random_state=RANDOM_SEED).split(ref):
            m = make_regressor("hgb_tuned", fs, params).fit(ref[cols].iloc[tr], y_ref[tr])
            cv.append(np.sqrt(np.mean((y_ref[te] - m.predict(ref[cols].iloc[te])) ** 2)))
        last_year = make_regressor("hgb_tuned", fs, params).fit(ref[cols], y_ref)
        pred = last_year.predict(cur[cols])
        rmse_next = float(np.sqrt(np.mean((y_cur - pred) ** 2)))
        rows.append({"model": "A" if fs == "full" else "B", "reference_cv_log_rmse": float(np.mean(cv)),
                     "next_year_log_rmse": rmse_next,
                     "degradation_pct": 100 * (rmse_next / float(np.mean(cv)) - 1),
                     "next_year_mean_log_residual": float(np.mean(y_cur - pred))})
    return pd.DataFrame(rows)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    log.info("Building reference-period features (same rules as training)")
    ref = build_reference_features()
    cur = pd.read_parquet(PROCESSED_DIR / "model_dataset.parquet")
    for d in (ref, cur):
        d["log_value"] = np.log(d["market_value_in_eur"])
    log.info("Reference n=%d, current n=%d", len(ref), len(cur))

    psi_rows = [{"feature": f, "psi": psi(ref[f], cur[f]),
                 "reference_median": float(ref[f].median()), "current_median": float(cur[f].median())}
                for f in MONITORED_FEATURES]
    psi_df = pd.DataFrame(psi_rows)
    psi_df.round(4).to_csv(OUT / "psi.csv", index=False)
    ev = evidently_report(ref, cur)
    decay = performance_decay(ref, cur)
    decay.round(4).to_csv(OUT / "performance_decay.csv", index=False)

    decision = evaluate_policy(psi_df, decay[decay.model == "A"].iloc[0].to_dict(), ev)
    decision |= {"reference_window": "(2024-06-12, 2025-06-12]", "current_window": "(2025-06-12, 2026-06-12]",
                 "n_reference": len(ref), "n_current": len(cur), "overlap_players": int(ref.player_id.isin(cur.player_id).sum())}
    (OUT / "policy_decision.json").write_text(json.dumps(decision, indent=2, default=float))
    log.info("Policy decision: %s", decision["decision"])


if __name__ == "__main__":
    main()
