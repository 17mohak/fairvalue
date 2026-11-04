"""Predictive evaluation: metrics and plots computed from held-out (out-of-fold) predictions."""

import matplotlib

matplotlib.use("Agg")  # no display needed; plots are saved to files
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.calibration import calibration_curve
from sklearn.metrics import (
    ConfusionMatrixDisplay,
    accuracy_score,
    average_precision_score,
    balanced_accuracy_score,
    confusion_matrix,
    f1_score,
    mean_absolute_error,
    precision_recall_curve,
    r2_score,
    roc_auc_score,
    roc_curve,
)

from src.models.tiers import TIER_NAMES


def regression_metrics(y_log_true, y_log_pred) -> dict:
    """RMSE / MAE / R² on the log scale (primary) and the EUR scale.

    EUR predictions are exp(log prediction): a median-type estimate (no smearing), see D-017.
    """
    y_log_true, y_log_pred = np.asarray(y_log_true), np.asarray(y_log_pred)
    eur_true, eur_pred = np.exp(y_log_true), np.exp(y_log_pred)
    return {
        "log_rmse": float(np.sqrt(np.mean((y_log_true - y_log_pred) ** 2))),
        "log_mae": float(mean_absolute_error(y_log_true, y_log_pred)),
        "log_r2": float(r2_score(y_log_true, y_log_pred)),
        "eur_rmse": float(np.sqrt(np.mean((eur_true - eur_pred) ** 2))),
        "eur_mae": float(mean_absolute_error(eur_true, eur_pred)),
        "eur_r2": float(r2_score(eur_true, eur_pred)),
        "eur_median_abs_error": float(np.median(np.abs(eur_true - eur_pred))),
    }


def classification_metrics(y_true, y_pred, proba=None) -> dict:
    y_true, y_pred = np.asarray(y_true), np.asarray(y_pred)
    out = {
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "balanced_accuracy": float(balanced_accuracy_score(y_true, y_pred)),
        "macro_f1": float(f1_score(y_true, y_pred, average="macro")),
        "adjacent_accuracy": float(np.mean(np.abs(y_true - y_pred) <= 1)),
    }
    if proba is not None:
        onehot = np.eye(len(TIER_NAMES))[y_true]
        out["roc_auc_ovr_macro"] = float(roc_auc_score(y_true, proba, multi_class="ovr", average="macro"))
        for k, name in enumerate(TIER_NAMES):
            out[f"roc_auc_{name}"] = float(roc_auc_score(onehot[:, k], proba[:, k]))
            out[f"avg_precision_{name}"] = float(average_precision_score(onehot[:, k], proba[:, k]))
    return out


# ---------------------------------------------------------------------------
# Plots (each returns the saved path)
# ---------------------------------------------------------------------------
def plot_regression(y_log_true, y_log_pred, title, path):
    res = np.asarray(y_log_true) - np.asarray(y_log_pred)
    fig, ax = plt.subplots(1, 3, figsize=(15, 4.5))
    ax[0].scatter(y_log_pred, y_log_true, s=4, alpha=0.3)
    lims = [min(np.min(y_log_true), np.min(y_log_pred)), max(np.max(y_log_true), np.max(y_log_pred))]
    ax[0].plot(lims, lims, "k--", lw=1)
    ax[0].set(xlabel="predicted ln(value)", ylabel="actual ln(value)", title="Actual vs predicted (held-out)")
    ax[1].scatter(y_log_pred, res, s=4, alpha=0.3)
    ax[1].axhline(0, color="k", lw=1)
    ax[1].set(xlabel="predicted ln(value)", ylabel="residual (actual − predicted)", title="Residuals vs predicted")
    ax[2].hist(res, bins=60)
    ax[2].set(xlabel="log residual", title="Residual distribution")
    fig.suptitle(title)
    fig.tight_layout()
    fig.savefig(path, dpi=120)
    plt.close(fig)
    return path


def plot_classification(y_true, y_pred, proba, title, path):
    fig, ax = plt.subplots(1, 4, figsize=(22, 5))
    ConfusionMatrixDisplay(confusion_matrix(y_true, y_pred), display_labels=TIER_NAMES).plot(
        ax=ax[0], colorbar=False, xticks_rotation=30)
    ax[0].set_title("Confusion matrix (held-out)")
    onehot = np.eye(len(TIER_NAMES))[np.asarray(y_true)]
    for k, name in enumerate(TIER_NAMES):
        fpr, tpr, _ = roc_curve(onehot[:, k], proba[:, k])
        ax[1].plot(fpr, tpr, label=name)
        p, r, _ = precision_recall_curve(onehot[:, k], proba[:, k])
        ax[2].plot(r, p, label=name)
        frac, mean_p = calibration_curve(onehot[:, k], proba[:, k], n_bins=10, strategy="quantile")
        ax[3].plot(mean_p, frac, marker="o", ms=3, label=name)
    ax[1].plot([0, 1], [0, 1], "k--", lw=1)
    ax[1].set(xlabel="FPR", ylabel="TPR", title="ROC (one-vs-rest)")
    ax[2].set(xlabel="recall", ylabel="precision", title="Precision-recall (one-vs-rest)")
    ax[3].plot([0, 1], [0, 1], "k--", lw=1)
    ax[3].set(xlabel="mean predicted probability", ylabel="observed frequency", title="Calibration (one-vs-rest)")
    for a in ax[1:]:
        a.legend(fontsize=8)
    fig.suptitle(title)
    fig.tight_layout()
    fig.savefig(path, dpi=120)
    plt.close(fig)
    return path


def error_breakdown(df: pd.DataFrame, by: str) -> pd.DataFrame:
    """Held-out log-scale error by a column (position, league, true tier). No group columns here."""
    r = df["y_log"] - df["pred_log"]
    t = df.assign(res=r, abs_res=r.abs()).groupby(by).agg(
        n=("res", "size"), mean_residual=("res", "mean"), mae=("abs_res", "mean"),
        rmse=("res", lambda s: float(np.sqrt(np.mean(s ** 2)))))
    return t.round(4).reset_index()
