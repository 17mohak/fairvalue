"""Export research outputs and the API contract as JSON for the web app (web/).

Usage:
    python -m src.product.export          write web/src/data/*.json
    python -m src.product.export --check  exit 1 if the committed JSON is out of date

Every figure the web app shows comes from these files, and they come only from committed,
generated outputs (reports/, models/model_registry.json) and from the FastAPI app's own OpenAPI
schema. Nothing here computes new results; it reshapes existing tables. No data or model binaries
are needed, so this runs (and is tested) anywhere the repository is checked out.
"""

import argparse
import json
import sys
from pathlib import Path

import pandas as pd

from src.config import REPORTS_DIR, ROOT

WEB_DATA = ROOT / "web" / "src" / "data"
GROUPS = {"UEFA": "uefa", "nonUEFA": "non_uefa"}


def _csv(rel: str) -> pd.DataFrame:
    return pd.read_csv(REPORTS_DIR / rel)


def _num(v, digits: int = 4):
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return None
    return round(float(v), digits)


def _ci(est, lo, hi, digits: int = 4) -> dict:
    return {"estimate": _num(est, digits), "low": _num(lo, digits), "high": _num(hi, digits)}


def _metric_table(rel: str) -> dict:
    """metric,estimate,ci95_low,ci95_high -> {metric: {estimate, low, high}}."""
    t = _csv(rel)
    return {r.metric: _ci(r.estimate, r.ci95_low, r.ci95_high) for r in t.itertuples()}


def _records(df: pd.DataFrame, digits: int = 4) -> list[dict]:
    out = []
    for row in df.to_dict(orient="records"):
        out.append({k: (_num(v, digits) if isinstance(v, (int, float)) and not isinstance(v, bool) else v)
                    for k, v in row.items()})
    return out


def headline() -> dict:
    log, eur = _metric_table("fairness/regression_log_scale.csv"), _metric_table("fairness/regression_eur_scale.csv")
    out = {}
    for m in ["A", "B"]:
        out[m] = {
            "signed_gap_league_stratified": log[f"{m}_signed_gap_league_stratified"],
            "signed_gap_raw": log[f"{m}_signed_gap_raw"],
            "mean_residual_uefa": log[f"{m}_mean_residual_UEFA"],
            "mean_residual_non_uefa": log[f"{m}_mean_residual_nonUEFA"],
            "mae_uefa": log[f"{m}_mae_UEFA"],
            "mae_non_uefa": log[f"{m}_mae_nonUEFA"],
            "mae_gap_league_stratified": log[f"{m}_mae_gap_league_stratified"],
            "rmse_uefa": log[f"{m}_rmse_UEFA"],
            "rmse_non_uefa": log[f"{m}_rmse_nonUEFA"],
            "rmse_gap_raw": log[f"{m}_rmse_gap_raw"],
            "signed_gap_eur_league_stratified": {k: _num(v, 0) for k, v in eur[f"{m}_signed_gap_league_stratified"].items()},
            "mae_gap_eur_league_stratified": {k: _num(v, 0) for k, v in eur[f"{m}_mae_gap_league_stratified"].items()},
        }
    out["A_minus_B"] = {
        "signed_gap_league_stratified": log["AminusB_signed_gap_league_stratified"],
        "mae_gap_league_stratified": log["AminusB_mae_gap_league_stratified"],
    }
    return out


def calibration() -> dict:
    t = _csv("fairness/calibration_within_predicted_deciles.csv")
    out = {}
    for m in ["A", "B"]:
        d = t[t.model == m]
        deciles = d[~d.predicted_decile.astype(str).str.startswith("ALL")]
        pooled = d[d.predicted_decile.astype(str).str.startswith("ALL")].set_index("predicted_decile")
        out[m] = {
            "deciles": [{"decile": int(r.predicted_decile), "n_uefa": int(r.n_UEFA), "n_non_uefa": int(r.n_nonUEFA),
                         "mean_residual_uefa": _num(r.mean_res_UEFA), "mean_residual_non_uefa": _num(r.mean_res_nonUEFA),
                         "gap": _num(r.gap)} for r in deciles.itertuples()],
            "stratified_by_decile": _ci(*pooled.loc["ALL: stratified by predicted decile", ["gap", "ci95_low", "ci95_high"]]),
            "stratified_by_league_and_decile": _ci(*pooled.loc["ALL: stratified by league x predicted decile",
                                                               ["gap", "ci95_low", "ci95_high"]]),
        }
    return out


def leagues() -> list[dict]:
    t = _csv("fairness/league_signed_log_gap.csv")
    return [{
        "league": r.league, "n_non_uefa": int(r.n_nonUEFA), "n_uefa": int(r.n_UEFA),
        "league_level_estimate": r.reporting == "league-level estimate", "reporting": r.reporting,
        "A": _ci(r.A_signed_log_gap, r.A_ci95_low, r.A_ci95_high),
        "B": _ci(r.B_signed_log_gap, r.B_ci95_low, r.B_ci95_high),
        "A_mae_uefa": _num(r.A_mae_UEFA), "A_mae_non_uefa": _num(r.A_mae_nonUEFA),
    } for r in t.itertuples()]


def strata() -> list[dict]:
    t = _csv("fairness/strata_signed_log_gap.csv")
    return [{
        "stratum": r.stratum, "n_non_uefa": int(r.n_nonUEFA), "n_uefa": int(r.n_UEFA),
        "A": _ci(r.A_signed_log_gap, r.A_ci95_low, r.A_ci95_high),
        "B": _ci(r.B_signed_log_gap, r.B_ci95_low, r.B_ci95_high),
    } for r in t.itertuples()]


def tiers() -> dict:
    out = {}
    for source, rel in [("classifier", "fairness/tier_classifier.csv"), ("regressor", "fairness/tier_from_regression.csv")]:
        t = _metric_table(rel)
        out[source] = {}
        for m in ["A", "B"]:
            per_tier = []
            for tier in ["Emerging", "Established", "Elite", "World Class"]:
                per_tier.append({
                    "tier": tier,
                    "tpr_uefa": t[f"{m}_{tier}_tpr_UEFA"], "tpr_non_uefa": t[f"{m}_{tier}_tpr_nonUEFA"],
                    "tpr_gap": t[f"{m}_{tier}_tpr_gap"], "fpr_gap": t[f"{m}_{tier}_fpr_gap"],
                    "eod": t[f"{m}_{tier}_EOD"],
                    "base_rate_uefa": t[f"{m}_{tier}_base_rate_UEFA"], "base_rate_non_uefa": t[f"{m}_{tier}_base_rate_nonUEFA"],
                    "selection_rate_gap": t[f"{m}_{tier}_selection_rate_gap"], "base_rate_gap": t[f"{m}_{tier}_base_rate_gap"],
                })
            out[source][m] = {
                "error_rate_uefa": t[f"{m}_error_rate_UEFA"], "error_rate_non_uefa": t[f"{m}_error_rate_nonUEFA"],
                "under_tier_rate_uefa": t[f"{m}_under_tier_rate_UEFA"], "under_tier_rate_non_uefa": t[f"{m}_under_tier_rate_nonUEFA"],
                "over_tier_rate_uefa": t[f"{m}_over_tier_rate_UEFA"], "over_tier_rate_non_uefa": t[f"{m}_over_tier_rate_nonUEFA"],
                "er1a_error_rate_gap": t[f"{m}_ER1a_error_rate_gap"],
                "under_tier_gap": t[f"{m}_under_tier_gap"], "over_tier_gap": t[f"{m}_over_tier_gap"],
                "er1b_max_eod": t[f"{m}_ER1b_max_EOD"], "per_tier": per_tier,
            }
    power = _csv("supplementary/tier_cell_power.csv")
    out["power"] = [{"model": r.model, "tier": r.tier, "rate": r.rate, "n_non_uefa": int(r.denominator_nonUEFA),
                     "n_uefa": int(r.denominator_UEFA), "min_detectable_difference_pp": _num(r.min_detectable_difference_pp, 1)}
                    for r in power.itertuples()]
    return out


def robustness() -> dict:
    alg = _csv("fairness/robustness_all_algorithms.csv")
    clustered = _csv("supplementary/clustered_bootstrap.csv")
    grouped = _csv("supplementary/grouped_cv_fairness_gap.csv")
    icc = _csv("supplementary/residual_icc.csv")
    worst = _csv("fairness/worst_errors.csv")
    return {
        "algorithms": _records(alg),
        "clustered": [{"metric": r.metric, "estimate": _num(r.estimate),
                       "club": {"low": _num(r.club_ci95_low), "high": _num(r.club_ci95_high)},
                       "player": {"low": _num(r.player_ci95_low), "high": _num(r.player_ci95_high)}}
                      for r in clustered.itertuples()],
        "grouped_cv": _records(grouped),
        "residual_icc": _records(icc),
        "worst_errors": _records(worst),
    }


def models() -> dict:
    reg = json.loads((ROOT / "models" / "model_registry.json").read_text())
    return {
        "regression": _records(_csv("models/regression_summary.csv")),
        "classification": _records(_csv("models/classification_summary.csv")),
        "primary": json.loads((REPORTS_DIR / "models" / "primary_model.json").read_text()),
        "grouped_cv": _records(_csv("supplementary/grouped_cv_metrics.csv")),
        "registry": {k: {"version": v["version"], "label": v["model_label"], "algorithm": v["algorithm"],
                         "feature_set": v["feature_set"], "features": v["features"],
                         "cv_heldout_metrics": v["cv_heldout_metrics"]} for k, v in reg["models"].items()},
        "dataset_sha256_16": reg["dataset_sha256_16"], "n_training_rows": reg["n_training_rows"],
        "created_utc": reg["created_utc"], "tier_names": reg["tier_names"],
        "tier_boundaries_eur": reg["tier_boundaries_eur"],
    }


def shap_global() -> dict:
    out = {}
    for m, fs in [("A", "full"), ("B", "performance")]:
        t = _csv(f"explainability/shap_global_by_group_{fs}.csv")
        out[m] = [{"feature": r.feature, "mean_abs": _num(r.mean_abs_shap_all, 5),
                   "mean_abs_uefa": _num(r.mean_abs_shap_UEFA, 5), "mean_abs_non_uefa": _num(r.mean_abs_shap_nonUEFA, 5),
                   "mean_uefa": _num(r.mean_shap_UEFA, 5), "mean_non_uefa": _num(r.mean_shap_nonUEFA, 5),
                   "gap_non_uefa_minus_uefa": _num(r.mean_shap_gap_nonUEFA_minus_UEFA, 5)} for r in t.itertuples()]
    return out


def population() -> dict:
    funnel = _csv("coverage/funnel.csv").rename(columns={"non-UEFA": "non_uefa", "non_uefa_share_%": "share"})
    value = _csv("coverage/value_by_group.csv").rename(columns={"25%": "p25", "50%": "p50", "75%": "p75", "90%": "p90"})
    proxy = _csv("coverage/proxy_strength.csv")
    return {
        "funnel": [{"stage": r.stage, "uefa": int(r.UEFA), "non_uefa": int(r.non_uefa), "total": int(r.total),
                    "non_uefa_share_pct": _num(r.share, 1)} for r in funnel.itertuples()],
        "value_by_group": [{"group": r.audit_group, "count": int(r.count), "mean": _num(r.mean, 0),
                            "p25": _num(r.p25, 0), "median": _num(r.p50, 0), "p75": _num(r.p75, 0),
                            "p90": _num(r.p90, 0), "min": _num(r.min, 0), "max": _num(r.max, 0)}
                           for r in value.itertuples()],
        "proxy_auc": [{"feature_set": r.feature_set, "auc": _num(r.cv_auc_mean, 3), "sd": _num(r.cv_auc_std, 3)}
                      for r in proxy.itertuples()],
    }


def monitoring() -> dict:
    return {
        "psi": _records(_csv("monitoring/psi.csv")),
        "decay": _records(_csv("monitoring/performance_decay.csv")),
        "policy": json.loads((REPORTS_DIR / "monitoring" / "policy_decision.json").read_text()),
    }


def dice() -> dict:
    t = _csv("explainability/dice_group_comparison.csv")
    meta = json.loads((REPORTS_DIR / "explainability" / "dice_run_meta.json").read_text())
    return {"comparison": _records(t), "run": meta}


def research() -> dict:
    return {
        "source": "Generated by `python -m src.product.export` from reports/ and models/model_registry.json. "
                  "Do not edit by hand.",
        "headline": headline(), "calibration": calibration(), "leagues": leagues(), "strata": strata(),
        "tiers": tiers(), "robustness": robustness(), "models": models(), "shap_global": shap_global(),
        "population": population(), "monitoring": monitoring(), "dice": dice(),
    }


def openapi() -> dict:
    from src.api.app import app  # the served contract is the single source of truth for the form
    return app.openapi()


def catalog() -> dict:
    """Input vocabulary and rules that are not expressed in OpenAPI (Python constants)."""
    from src.api.schemas import COVERED_LEAGUES, DISCLAIMER, MINUTES_PER_APPEARANCE_RANGE, SUB_POSITIONS_BY_POSITION
    from src.models.tiers import TIER_BOUNDARIES_EUR, TIER_NAMES
    return {
        "source": "Generated by `python -m src.product.export` from src/api/schemas.py and src/models/tiers.py.",
        "leagues": list(COVERED_LEAGUES.__args__),
        "sub_positions_by_position": SUB_POSITIONS_BY_POSITION,
        "minutes_per_appearance_range": list(MINUTES_PER_APPEARANCE_RANGE),
        "tier_names": TIER_NAMES, "tier_boundaries_eur": list(TIER_BOUNDARIES_EUR),
        "disclaimer": DISCLAIMER,
    }


def render(obj: dict) -> str:
    return json.dumps(obj, indent=2, sort_keys=False, ensure_ascii=False) + "\n"


def outputs() -> dict[Path, str]:
    return {WEB_DATA / "research.json": render(research()), WEB_DATA / "openapi.json": render(openapi()),
            WEB_DATA / "catalog.json": render(catalog())}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--check", action="store_true", help="fail if committed JSON is stale")
    args = parser.parse_args()
    stale = []
    for path, text in outputs().items():
        if args.check:
            if not path.exists() or path.read_text(encoding="utf-8") != text:
                stale.append(path.relative_to(ROOT).as_posix())
        else:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(text, encoding="utf-8", newline="\n")  # LF on every OS
            print(f"wrote {path.relative_to(ROOT).as_posix()}")
    if stale:
        print("Out of date (run python -m src.product.export):", ", ".join(stale))
        sys.exit(1)


if __name__ == "__main__":
    main()
