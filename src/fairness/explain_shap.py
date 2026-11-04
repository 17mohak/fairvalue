"""SHAP explanations for the final regressors (Milestone 5, RESEARCH_DESIGN §8).

Usage:
    python -m src.fairness.explain_shap        (after src.models.final)

Explains the full-data models in models/ (the served models), on the log-value scale.
    * global importance: mean |SHAP| per ORIGINAL feature (one-hot columns summed back)
    * group view: mean signed SHAP per feature for UEFA vs non-UEFA. The differences add up to
      the difference in mean predicted log value between groups, so they show which inputs
      move the two groups' predictions apart. They are descriptions of the model, not causes.
    * local explanations: one representative player per group x tier (closest to the
      group-tier median prediction)
Group labels come from audit_lookup.parquet and are joined only after SHAP values are computed.

Outputs: reports/explainability/*.csv, *.png
"""

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import shap

from src.config import PROCESSED_DIR, RAW_DIR, REPORTS_DIR, get_logger
from src.features.preprocess import feature_columns
from src.models.final import load_model
from src.models.tiers import TIER_NAMES, assign_tier
from src.models.train import load_training_data

log = get_logger(__name__)
OUT = REPORTS_DIR / "explainability"
LABEL = {"full": "Model A", "performance": "Model B"}


def original_feature(transformed: str, originals: list[str]) -> str:
    """Map a ColumnTransformer output name back to the raw feature it came from."""
    kind, name = transformed.split("__", 1)
    if kind == "num":
        if name.startswith("missingindicator_"):
            return name.removeprefix("missingindicator_")
        return "age" if name == "age_squared" else name
    matches = [o for o in originals if name.startswith(o + "_")]
    return max(matches, key=len)


def shap_by_feature(feature_set: str, df: pd.DataFrame):
    """Return (per-player SHAP aggregated to original features, base value, predictions)."""
    pipe = load_model("regressor", feature_set)
    X = df[feature_columns(feature_set)]
    Xt = pipe["pre"].transform(X)
    names = pipe["pre"].get_feature_names_out()
    explainer = shap.TreeExplainer(pipe["model"])
    sv = explainer.shap_values(Xt, check_additivity=True)
    originals = feature_columns(feature_set)
    mapping = [original_feature(n, originals) for n in names]
    agg = pd.DataFrame(sv, columns=names).T.groupby(mapping).sum().T
    base = float(np.ravel(explainer.expected_value)[0])
    pred = pipe.predict(X)
    # SHAP is additive: base + sum of contributions = model output (log scale).
    np.testing.assert_allclose(base + agg.sum(axis=1).to_numpy(), pred, atol=1e-6)
    return agg[originals], base, pred


def group_table(agg: pd.DataFrame, is_n: np.ndarray, feature_set: str) -> pd.DataFrame:
    t = pd.DataFrame({
        "feature": agg.columns,
        "mean_abs_shap_all": agg.abs().mean().to_numpy(),
        "mean_abs_shap_UEFA": agg[~is_n].abs().mean().to_numpy(),
        "mean_abs_shap_nonUEFA": agg[is_n].abs().mean().to_numpy(),
        "mean_shap_UEFA": agg[~is_n].mean().to_numpy(),
        "mean_shap_nonUEFA": agg[is_n].mean().to_numpy(),
    })
    t["mean_shap_gap_nonUEFA_minus_UEFA"] = t.mean_shap_nonUEFA - t.mean_shap_UEFA
    t.insert(0, "model", LABEL[feature_set])
    return t.sort_values("mean_abs_shap_all", ascending=False)


def representative_players(df, pred, is_n) -> pd.DataFrame:
    rows = []
    pred_tier = assign_tier(np.exp(pred))
    for g_name, g_mask in [("UEFA", ~is_n), ("non-UEFA", is_n)]:
        for k, tier in enumerate(TIER_NAMES):
            m = g_mask & (pred_tier == k)
            if not m.any():
                continue
            idx = np.where(m)[0]
            pick = idx[np.argmin(np.abs(pred[idx] - np.median(pred[idx])))]
            rows.append({"row": int(pick), "group": g_name, "predicted_tier": tier})
    return pd.DataFrame(rows)


def plot_global(tables: list[pd.DataFrame], path):
    fig, ax = plt.subplots(1, 2, figsize=(14, 6))
    for a, t in zip(ax, tables):
        t = t.sort_values("mean_abs_shap_all")
        a.barh(t.feature, t.mean_abs_shap_all)
        a.set(title=f"{t.model.iloc[0]}: mean |SHAP| (log value)", xlabel="mean |contribution| to ln(value)")
    fig.tight_layout()
    fig.savefig(path, dpi=120)
    plt.close(fig)


def plot_group_gap(tables: list[pd.DataFrame], path):
    fig, ax = plt.subplots(1, 2, figsize=(14, 6))
    for a, t in zip(ax, tables):
        t = t.sort_values("mean_shap_gap_nonUEFA_minus_UEFA")
        a.barh(t.feature, t.mean_shap_gap_nonUEFA_minus_UEFA,
               color=["C3" if v < 0 else "C0" for v in t.mean_shap_gap_nonUEFA_minus_UEFA])
        a.axvline(0, color="k", lw=0.8)
        a.set(title=f"{t.model.iloc[0]}: mean SHAP, non-UEFA − UEFA", xlabel="difference in mean contribution (log)")
    fig.tight_layout()
    fig.savefig(path, dpi=120)
    plt.close(fig)


def plot_local(local: pd.DataFrame, base: float, path, top=8):
    players = local.player_label.unique()
    fig, ax = plt.subplots(2, 4, figsize=(22, 9))
    for a, p in zip(ax.ravel(), players):
        d = local[local.player_label == p].reindex(local[local.player_label == p].shap.abs().sort_values().index)
        d = d.tail(top)
        a.barh(d.feature, d.shap, color=["C3" if v < 0 else "C0" for v in d.shap])
        a.axvline(0, color="k", lw=0.8)
        r = local[local.player_label == p].iloc[0]
        a.set_title(f"{p}\npred €{r.predicted_eur/1e6:.1f}M, actual €{r.actual_eur/1e6:.1f}M", fontsize=9)
        a.tick_params(labelsize=8)
    fig.suptitle(f"Model A local SHAP (top {top} contributions, log scale; base value {base:.2f} = €{np.exp(base)/1e6:.2f}M)")
    fig.tight_layout()
    fig.savefig(path, dpi=110)
    plt.close(fig)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    df = load_training_data()
    audit = pd.read_parquet(PROCESSED_DIR / "audit_lookup.parquet")[["player_id", "audit_group"]]
    is_n = df[["player_id"]].merge(audit, on="player_id", how="left").audit_group.eq("non-UEFA").to_numpy()
    names = pd.read_csv(RAW_DIR / "players.csv.gz", usecols=["player_id", "name"])

    tables, results = [], {}
    for fs in ["full", "performance"]:
        agg, base, pred = shap_by_feature(fs, df)
        results[fs] = (agg, base, pred)
        t = group_table(agg, is_n, fs)
        t.round(5).to_csv(OUT / f"shap_global_by_group_{fs}.csv", index=False)
        tables.append(t)
        # Check: SHAP gaps add up to the gap in mean predictions.
        pred_gap = pred[is_n].mean() - pred[~is_n].mean()
        assert abs(pred_gap - t.mean_shap_gap_nonUEFA_minus_UEFA.sum()) < 1e-6
        log.info("%s: mean predicted log gap %.4f = sum of SHAP gaps %.4f", LABEL[fs], pred_gap,
                 t.mean_shap_gap_nonUEFA_minus_UEFA.sum())

    plot_global(tables, OUT / "shap_global.png")
    plot_group_gap(tables, OUT / "shap_group_gap.png")

    agg, base, pred = results["full"]
    reps = representative_players(df, pred, is_n)
    rows = []
    for r in reps.itertuples():
        pid = int(df.player_id.iloc[r.row])
        nm = names.loc[names.player_id == pid, "name"].iloc[0]
        label = f"{nm} ({r.group}, {r.predicted_tier})"
        for f, v in agg.iloc[r.row].items():
            rows.append({"player_id": pid, "player_label": label, "group": r.group, "predicted_tier": r.predicted_tier,
                         "feature": f, "feature_value": df[f].iloc[r.row], "shap": float(v),
                         "predicted_eur": float(np.exp(pred[r.row])), "actual_eur": float(df.market_value_in_eur.iloc[r.row])})
    local = pd.DataFrame(rows)
    local.to_csv(OUT / "shap_local_representative_players.csv", index=False)
    plot_local(local, base, OUT / "shap_local.png")
    log.info("Wrote SHAP outputs to %s", OUT)


if __name__ == "__main__":
    main()
