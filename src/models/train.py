"""Train and evaluate all models with 5-fold CV; every metric uses held-out predictions.

Usage:
    python -m src.models.train                 # full run (25 Optuna trials per outer fold)
    python -m src.models.train --quick         # 20% subset, 3 trials: smoke test / CI

What it does (docs/RESEARCH_DESIGN.md §5–§7):
    * target = ln(market value); tiers = fixed €2M / €10M / €30M boundaries
    * folds  = StratifiedKFold(5) on tier only (group is never used)
    * regressors: Ridge, RandomForest, HistGradientBoosting (default and Optuna-tuned,
      tuning nested inside each outer training fold)
    * tier classifier: HistGradientBoostingClassifier
    * each model is run for Model A (feature_set="full") and Model B ("performance")
    * MLflow logs params, metrics and artifacts; held-out predictions are written to
      data/processed/predictions/ for the fairness audit
"""

import argparse
import hashlib
import json

import mlflow
import numpy as np
import optuna
import pandas as pd
from sklearn.base import clone
from sklearn.ensemble import HistGradientBoostingClassifier, HistGradientBoostingRegressor, RandomForestRegressor
from sklearn.linear_model import Ridge
from sklearn.model_selection import KFold, StratifiedKFold
from sklearn.pipeline import Pipeline

from src.config import PROCESSED_DIR, RANDOM_SEED, REPORTS_DIR, ROOT, get_logger
from src.data.build_dataset import TARGET
from src.features.preprocess import assert_no_demographic_columns, build_preprocessor, feature_columns
from src.models.evaluate import (
    classification_metrics,
    error_breakdown,
    plot_classification,
    plot_regression,
    regression_metrics,
)
from src.models.tiers import TIER_BOUNDARIES_EUR, TIER_NAMES, assign_tier

log = get_logger(__name__)
PRED_DIR = PROCESSED_DIR / "predictions"
OUT = REPORTS_DIR / "models"
MLRUNS = ROOT / "mlruns"
EXPERIMENT = "fairvalue-m3-baselines"
N_FOLDS = 5
FEATURE_SETS = {"full": "Model A", "performance": "Model B"}
ALGORITHMS = ["ridge", "random_forest", "hgb", "hgb_tuned"]


# ---------------------------------------------------------------------------
# Model definitions
# ---------------------------------------------------------------------------
def make_regressor(algo: str, feature_set: str, params: dict | None = None) -> Pipeline:
    params = params or {}
    if algo == "ridge":
        model = Ridge(alpha=1.0)  # fixed baseline, deliberately untuned
    elif algo == "random_forest":
        model = RandomForestRegressor(n_estimators=300, min_samples_leaf=3, max_features=0.5,
                                      n_jobs=-1, random_state=RANDOM_SEED)
    elif algo in ("hgb", "hgb_tuned"):
        model = HistGradientBoostingRegressor(random_state=RANDOM_SEED, **params)
    else:
        raise ValueError(algo)
    return Pipeline([("pre", build_preprocessor(feature_set)), ("model", model)])


def make_classifier(feature_set: str) -> Pipeline:
    return Pipeline([("pre", build_preprocessor(feature_set)),
                     ("model", HistGradientBoostingClassifier(random_state=RANDOM_SEED))])


def make_folds(tier: np.ndarray) -> np.ndarray:
    """Fold id per row: stratified on tier only (never on group)."""
    folds = np.empty(len(tier), dtype=int)
    skf = StratifiedKFold(N_FOLDS, shuffle=True, random_state=RANDOM_SEED)
    for k, (_, test) in enumerate(skf.split(np.zeros(len(tier)), tier)):
        folds[test] = k
    return folds


def tune_hgb(X: pd.DataFrame, y: np.ndarray, feature_set: str, n_trials: int, seed: int) -> dict:
    """Optuna search using ONLY the given (outer-training) rows, with inner 3-fold CV."""
    inner = KFold(3, shuffle=True, random_state=seed)

    def objective(trial):
        params = {
            "learning_rate": trial.suggest_float("learning_rate", 0.02, 0.3, log=True),
            "max_iter": trial.suggest_int("max_iter", 100, 600, step=50),
            "max_leaf_nodes": trial.suggest_int("max_leaf_nodes", 15, 63),
            "min_samples_leaf": trial.suggest_int("min_samples_leaf", 10, 80),
            "l2_regularization": trial.suggest_float("l2_regularization", 1e-4, 10.0, log=True),
            "max_features": trial.suggest_float("max_features", 0.5, 1.0),
        }
        errs = []
        for tr, va in inner.split(X):
            m = make_regressor("hgb_tuned", feature_set, params).fit(X.iloc[tr], y[tr])
            errs.append(np.sqrt(np.mean((y[va] - m.predict(X.iloc[va])) ** 2)))
        return float(np.mean(errs))

    study = optuna.create_study(direction="minimize", sampler=optuna.samplers.TPESampler(seed=seed))
    study.optimize(objective, n_trials=n_trials, show_progress_bar=False)
    return study.best_params


# ---------------------------------------------------------------------------
# Cross-validated runs
# ---------------------------------------------------------------------------
def cv_regression(df, folds, algo, feature_set, n_trials):
    X, y = df[feature_columns(feature_set)], df["y_log"].to_numpy()
    oof = np.full(len(df), np.nan)
    fold_metrics, fold_params = [], []
    for k in range(N_FOLDS):
        tr, te = folds != k, folds == k
        params = tune_hgb(X[tr], y[tr], feature_set, n_trials, seed=RANDOM_SEED + k) if algo == "hgb_tuned" else {}
        model = make_regressor(algo, feature_set, params).fit(X[tr], y[tr])
        oof[te] = model.predict(X[te])
        fold_metrics.append(regression_metrics(y[te], oof[te]))
        fold_params.append(params)
    assert not np.isnan(oof).any(), "every row must receive exactly one held-out prediction"
    return oof, fold_metrics, fold_params


def cv_classifier(df, folds, feature_set):
    X, t = df[feature_columns(feature_set)], df["tier"].to_numpy()
    proba = np.full((len(df), len(TIER_NAMES)), np.nan)
    fold_metrics = []
    for k in range(N_FOLDS):
        tr, te = folds != k, folds == k
        m = clone(make_classifier(feature_set)).fit(X[tr], t[tr])
        assert list(m.classes_) == list(range(len(TIER_NAMES)))
        proba[te] = m.predict_proba(X[te])
        fold_metrics.append(classification_metrics(t[te], proba[te].argmax(1), proba[te]))
    return proba, fold_metrics


def summarise(fold_metrics: list[dict]) -> dict:
    f = pd.DataFrame(fold_metrics)
    return {f"cv_{c}_mean": float(f[c].mean()) for c in f} | {f"cv_{c}_sd": float(f[c].std()) for c in f}


def select_primary(suffix: str = "") -> str:
    """Pre-specified rule (D-019): lowest MEAN 5-fold CV log-RMSE under Model A.

    Computed from the saved held-out predictions (which carry their fold id), so it can be
    re-run without retraining.
    """
    rows = []
    for algo in ALGORITHMS:
        p = pd.read_parquet(PRED_DIR / f"oof_full_{algo}{suffix}.parquet")
        per_fold = p.groupby("fold").apply(lambda d: np.sqrt(np.mean((d.y_log - d.pred_log) ** 2)),
                                           include_groups=False)
        rows.append({"algorithm": algo, "cv_log_rmse_mean": float(per_fold.mean()),
                     "cv_log_rmse_sd": float(per_fold.std())})
    t = pd.DataFrame(rows).sort_values("cv_log_rmse_mean")
    primary = t.iloc[0]["algorithm"]
    (OUT / f"primary_model{suffix}.json").write_text(json.dumps(
        {"rule": "lowest mean 5-fold CV log RMSE under Model A (D-019)", "algorithm": primary,
         "candidates": t.round(5).to_dict("records"), "dataset_sha256_16": dataset_fingerprint()}, indent=2))
    return primary


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def load_training_data(quick: bool = False) -> pd.DataFrame:
    df = pd.read_parquet(PROCESSED_DIR / "model_dataset.parquet")
    assert_no_demographic_columns(df.columns)  # ER2 guard on the whole training table
    if quick:
        df = df.sample(frac=0.2, random_state=RANDOM_SEED).reset_index(drop=True)
    df["y_log"] = np.log(df[TARGET])
    df["tier"] = assign_tier(df[TARGET])
    return df


def dataset_fingerprint() -> str:
    return hashlib.sha256((PROCESSED_DIR / "model_dataset.parquet").read_bytes()).hexdigest()[:16]


def main(n_trials: int = 25, quick: bool = False) -> None:
    optuna.logging.set_verbosity(optuna.logging.WARNING)
    for d in (PRED_DIR, OUT, OUT / "plots"):
        d.mkdir(parents=True, exist_ok=True)
    mlflow.set_tracking_uri(MLRUNS.as_uri())
    mlflow.set_experiment(EXPERIMENT + ("-quick" if quick else ""))

    df = load_training_data(quick)
    folds = make_folds(df["tier"].to_numpy())
    fp = dataset_fingerprint()
    common = {"dataset_sha256_16": fp, "n_rows": len(df), "n_folds": N_FOLDS, "seed": RANDOM_SEED,
              "target": "ln(market_value_in_eur)", "tier_boundaries_eur": str(TIER_BOUNDARIES_EUR),
              "quick": quick}
    suffix = "_quick" if quick else ""
    reg_rows, clf_rows, tuned = [], [], []

    for fs, fs_name in FEATURE_SETS.items():
        for algo in ALGORITHMS:
            log.info("%s / %s", fs_name, algo)
            with mlflow.start_run(run_name=f"{fs_name} | {algo}"):
                oof, fm, fparams = cv_regression(df, folds, algo, fs, n_trials if not quick else 3)
                overall = regression_metrics(df["y_log"], oof)
                trials_used = (3 if quick else n_trials) if algo == "hgb_tuned" else 0
                mlflow.log_params(common | {"algorithm": algo, "feature_set": fs, "model_label": fs_name,
                                            "n_features_raw": len(feature_columns(fs)),
                                            "optuna_trials": trials_used,
                                            "optuna_inner_seed": "42 + outer fold index" if trials_used else "n/a"})
                mlflow.log_metrics({f"oof_{k}": v for k, v in overall.items()} | summarise(fm))
                for k, m in enumerate(fm):
                    mlflow.log_metrics({f"fold_{n}": v for n, v in m.items()}, step=k)
                pred = pd.DataFrame({"player_id": df["player_id"], "fold": folds, "y_log": df["y_log"],
                                     "pred_log": oof, "true_tier": df["tier"],
                                     "pred_tier_from_regression": assign_tier(np.exp(oof))})
                path = PRED_DIR / f"oof_{fs}_{algo}{suffix}.parquet"
                pred.to_parquet(path, index=False)
                plot = plot_regression(df["y_log"], oof, f"{fs_name} | {algo} (held-out)",
                                       OUT / "plots" / f"regression_{fs}_{algo}{suffix}.png")
                mlflow.log_artifact(str(plot))
                mlflow.log_artifact(str(path))
                if algo == "hgb_tuned":
                    mlflow.log_dict({"fold_best_params": fparams}, "optuna_best_params.json")
                    tuned += [{"feature_set": fs, "fold": k, **p} for k, p in enumerate(fparams)]
                binned = classification_metrics(df["tier"], pred["pred_tier_from_regression"])
                mlflow.log_metrics({f"binned_tier_{k}": v for k, v in binned.items()})
                reg_rows.append({"model": fs_name, "feature_set": fs, "algorithm": algo, **overall,
                                 "cv_log_rmse_mean": float(pd.DataFrame(fm)["log_rmse"].mean()),
                                 "cv_log_rmse_sd": float(pd.DataFrame(fm)["log_rmse"].std()),
                                 **{f"binned_tier_{k}": v for k, v in binned.items()}})

        log.info("%s / tier classifier", fs_name)
        with mlflow.start_run(run_name=f"{fs_name} | tier_classifier"):
            proba, fm = cv_classifier(df, folds, fs)
            pred_tier = proba.argmax(1)
            overall = classification_metrics(df["tier"], pred_tier, proba)
            mlflow.log_params(common | {"algorithm": "hgb_classifier", "feature_set": fs, "model_label": fs_name})
            mlflow.log_metrics({f"oof_{k}": v for k, v in overall.items()} | summarise(fm))
            cp = pd.DataFrame({"player_id": df["player_id"], "fold": folds, "true_tier": df["tier"],
                               "pred_tier": pred_tier,
                               **{f"proba_{k}": proba[:, k] for k in range(len(TIER_NAMES))}})
            path = PRED_DIR / f"oof_{fs}_tier_classifier{suffix}.parquet"
            cp.to_parquet(path, index=False)
            plot = plot_classification(df["tier"], pred_tier, proba, f"{fs_name} | tier classifier (held-out)",
                                       OUT / "plots" / f"classifier_{fs}{suffix}.png")
            mlflow.log_artifact(str(plot))
            mlflow.log_artifact(str(path))
            clf_rows.append({"model": fs_name, "feature_set": fs, **overall,
                             "cv_accuracy_sd": float(pd.DataFrame(fm)["accuracy"].std())})

    reg = pd.DataFrame(reg_rows)
    reg.round(4).to_csv(OUT / f"regression_summary{suffix}.csv", index=False)
    pd.DataFrame(clf_rows).round(4).to_csv(OUT / f"classification_summary{suffix}.csv", index=False)
    if tuned:
        pd.DataFrame(tuned).to_csv(OUT / f"optuna_best_params{suffix}.csv", index=False)

    primary = select_primary(suffix)

    # Error analysis for the primary model (no group columns; fairness is in src/fairness/audit.py).
    for fs in FEATURE_SETS:
        p = pd.read_parquet(PRED_DIR / f"oof_{fs}_{primary}{suffix}.parquet").merge(
            df[["player_id", "position", "valuation_league_id", "minutes"]], on="player_id")
        p["true_tier_name"] = p["true_tier"].map(dict(enumerate(TIER_NAMES)))
        p["minutes_band"] = pd.cut(p["minutes"], [450, 900, 1800, 1e9], right=False,
                                   labels=["450-899", "900-1799", "1800+"])
        for by in ["position", "valuation_league_id", "true_tier_name", "minutes_band"]:
            error_breakdown(p, by).to_csv(OUT / f"errors_by_{by}_{fs}{suffix}.csv", index=False)
    log.info("Primary model: %s. Summaries in %s", primary, OUT)


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--trials", type=int, default=25)
    ap.add_argument("--quick", action="store_true")
    a = ap.parse_args()
    main(n_trials=a.trials, quick=a.quick)
