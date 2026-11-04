"""Refit the selected models on the full approved population and save them for serving.

Usage:
    python -m src.models.final

What is refit (docs/RESEARCH_DESIGN.md §5, D-027):
    * the primary regressor (pre-specified rule, reports/models/primary_model.json) for
      Model A and Model B, with hyperparameters = median of the per-fold Optuna optima
    * the HGB tier classifier for Model A and Model B
Performance claims for these artefacts are the held-out CV results in docs/reports/MODEL_EVALUATION.md;
a model refit on all data has no held-out data of its own.

Outputs:
    models/<name>.joblib          fitted pipelines (git-ignored)
    models/model_registry.json    versions, params, dataset fingerprint, CV metrics (committed)
"""

import json
from datetime import datetime, timezone

import joblib
import numpy as np
import pandas as pd

from src.config import REPORTS_DIR, ROOT, get_logger
from src.features.preprocess import assert_no_demographic_columns, feature_columns
from src.models.tiers import TIER_BOUNDARIES_EUR, TIER_NAMES
from src.models.train import dataset_fingerprint, load_training_data, make_classifier, make_regressor

log = get_logger(__name__)
MODELS_DIR = ROOT / "models"
REGISTRY = MODELS_DIR / "model_registry.json"
INT_PARAMS = {"max_iter", "max_leaf_nodes", "min_samples_leaf"}


def median_tuned_params(feature_set: str) -> dict:
    """Median of the per-fold Optuna optima: one fixed setting for the full-data refit."""
    p = pd.read_csv(REPORTS_DIR / "models" / "optuna_best_params.csv")
    p = p[p.feature_set == feature_set].drop(columns=["feature_set", "fold"]).median()
    return {k: (int(round(v)) if k in INT_PARAMS else float(v)) for k, v in p.items()}


def model_name(kind: str, feature_set: str) -> str:
    return f"{kind}_{'A' if feature_set == 'full' else 'B'}"


def load_model(kind: str = "regressor", feature_set: str = "full"):
    return joblib.load(MODELS_DIR / f"{model_name(kind, feature_set)}.joblib")


def load_registry() -> dict:
    return json.loads(REGISTRY.read_text())


def main() -> None:
    MODELS_DIR.mkdir(exist_ok=True)
    df = load_training_data()
    assert_no_demographic_columns(df.columns)
    primary = json.loads((REPORTS_DIR / "models" / "primary_model.json").read_text())["algorithm"]
    reg_summary = pd.read_csv(REPORTS_DIR / "models" / "regression_summary.csv")
    clf_summary = pd.read_csv(REPORTS_DIR / "models" / "classification_summary.csv")
    fp = dataset_fingerprint()
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d")
    registry = {"created_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                "dataset_sha256_16": fp, "n_training_rows": len(df), "target": "ln(market_value_in_eur)",
                "tier_names": TIER_NAMES, "tier_boundaries_eur": list(TIER_BOUNDARIES_EUR), "models": {}}

    for fs in ["full", "performance"]:
        X = df[feature_columns(fs)]
        params = median_tuned_params(fs) if primary == "hgb_tuned" else {}
        reg = make_regressor(primary, fs, params).fit(X, df["y_log"].to_numpy())
        clf = make_classifier(fs).fit(X, df["tier"].to_numpy())
        # Sanity: in-sample predictions must be finite and classes complete.
        assert np.isfinite(reg.predict(X)).all() and list(clf.classes_) == list(range(len(TIER_NAMES)))
        cv_reg = reg_summary[(reg_summary.feature_set == fs) & (reg_summary.algorithm == primary)].iloc[0]
        cv_clf = clf_summary[clf_summary.feature_set == fs].iloc[0]
        for kind, model, cv in [("regressor", reg, {k: float(cv_reg[k]) for k in ["log_rmse", "log_mae", "log_r2", "eur_mae", "eur_r2"]}),
                                ("classifier", clf, {k: float(cv_clf[k]) for k in ["accuracy", "balanced_accuracy", "macro_f1", "roc_auc_ovr_macro"]})]:
            name = model_name(kind, fs)
            joblib.dump(model, MODELS_DIR / f"{name}.joblib")
            registry["models"][name] = {
                "version": f"fairvalue-{name}-{primary if kind == 'regressor' else 'hgb_classifier'}-{fp[:8]}-{stamp}",
                "file": f"models/{name}.joblib", "feature_set": fs,
                "model_label": "Model A" if fs == "full" else "Model B",
                "algorithm": primary if kind == "regressor" else "hgb_classifier",
                "hyperparameters": params if kind == "regressor" else "sklearn defaults (random_state=42)",
                "features": feature_columns(fs), "cv_heldout_metrics": cv,
            }
            log.info("Saved %s", name)
    REGISTRY.write_text(json.dumps(registry, indent=2))
    log.info("Registry written to %s", REGISTRY)


if __name__ == "__main__":
    main()
