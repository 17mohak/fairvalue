"""Fairness audit on HELD-OUT predictions (docs/RESEARCH_DESIGN.md §7). Nothing here trains a model.

Usage:
    python -m src.fairness.audit            (after src.models.train)
    python -m src.fairness.audit --boot 500 (faster, wider-MC-error CIs)

Conventions
    residual = actual − predicted     (positive = the model UNDER-predicts the player)
    gap      = non-UEFA minus UEFA    (e.g. a negative signed gap = non-UEFA players are, on
                                       average, valued below what the model predicts, relative to UEFA)
    league-stratified gap = Σ_l w_l (mean_nonUEFA,l − mean_UEFA,l), w_l = non-UEFA share in league l
    95% CIs: stratified bootstrap (players resampled within league × group), percentile method.

Group membership comes from audit_lookup.parquet and is joined AFTER prediction.
These are associations conditional on the model, features and a selected population.
They are not evidence of discrimination or of any causal effect.
"""

import argparse
import json

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from fairlearn.metrics import MetricFrame, equalized_odds_difference, false_positive_rate, true_positive_rate

from src.config import PROCESSED_DIR, RANDOM_SEED, REPORTS_DIR, get_logger
from src.data.nationality import load_mapping
from src.fairness.scope_analysis import EU_MOBILE
from src.models.tiers import TIER_NAMES

log = get_logger(__name__)
PRED_DIR = PROCESSED_DIR / "predictions"
OUT = REPORTS_DIR / "fairness"
MODELS = {"full": "Model A", "performance": "Model B"}
K = len(TIER_NAMES)


# ---------------------------------------------------------------------------
# Data
# ---------------------------------------------------------------------------
def load_frame(algo: str, suffix: str = "") -> pd.DataFrame:
    """One row per player: residuals for Model A and B, tier predictions, group and strata."""
    u = pd.read_parquet(PROCESSED_DIR / "player_universe.parquet")
    a = pd.read_parquet(PROCESSED_DIR / "audit_lookup.parquet")
    base = None
    for fs, tag in [("full", "A"), ("performance", "B")]:
        r = pd.read_parquet(PRED_DIR / f"oof_{fs}_{algo}{suffix}.parquet")
        c = pd.read_parquet(PRED_DIR / f"oof_{fs}_tier_classifier{suffix}.parquet")
        r = r.rename(columns={"pred_log": f"pred_log_{tag}", "pred_tier_from_regression": f"reg_tier_{tag}"})
        r = r.merge(c[["player_id", "pred_tier"]].rename(columns={"pred_tier": f"clf_tier_{tag}"}), on="player_id")
        cols = ["player_id", f"pred_log_{tag}", f"reg_tier_{tag}", f"clf_tier_{tag}"]
        base = r if base is None else base.merge(r[cols], on="player_id", validate="one_to_one")
    df = base.merge(u[["player_id", "valuation_league_id", "position", "recent_arrival", "minutes", "age"]],
                    on="player_id", validate="one_to_one")
    df = df.merge(a[["player_id", "audit_group", "confederation", "country_of_citizenship", "country_of_birth"]],
                  on="player_id", validate="one_to_one")
    df = df[df.audit_group != "UNKNOWN"].reset_index(drop=True)

    # recent_arrival is stored as object dtype in the universe (NaN for players without match
    # data). Cast explicitly: "~" on Python bools gives -1/-2, which would select everyone.
    assert df["recent_arrival"].notna().all()
    df["recent_arrival"] = df["recent_arrival"].astype(bool)
    df["nonuefa"] = df["audit_group"].eq("non-UEFA")
    for tag in "AB":
        df[f"res_log_{tag}"] = df["y_log"] - df[f"pred_log_{tag}"]
        df[f"res_eur_{tag}"] = np.exp(df["y_log"]) - np.exp(df[f"pred_log_{tag}"])
    birth_conf = df["country_of_birth"].map(dict(zip(load_mapping().citizenship_value, load_mapping().confederation)))
    df["diaspora_born"] = df["nonuefa"] & birth_conf.eq("UEFA")
    df["eu_mobile"] = ~df["nonuefa"] & df["country_of_citizenship"].isin(EU_MOBILE)
    return df


# ---------------------------------------------------------------------------
# Core statistics (numpy; used for point estimates AND inside the bootstrap)
# ---------------------------------------------------------------------------
def stratified_gap(values, is_n, is_u, strata) -> float:
    """Σ_l w_l (mean_N,l − mean_U,l), w_l ∝ #N in l; strata lacking either group are skipped."""
    values, is_n, is_u, strata = map(np.asarray, (values, is_n, is_u, strata))
    num, wsum = 0.0, 0.0
    for s in np.unique(strata):
        m = strata == s
        n_n, n_u = (m & is_n).sum(), (m & is_u).sum()
        if n_n == 0 or n_u == 0:
            continue
        num += n_n * (values[m & is_n].mean() - values[m & is_u].mean())
        wsum += n_n
    return num / wsum if wsum else np.nan


def dropped_share(is_n, strata) -> float:
    """Share of non-UEFA players sitting in strata that have no UEFA player (excluded by stratified_gap)."""
    is_n, strata = np.asarray(is_n), np.asarray(strata)
    no_u = {s for s in np.unique(strata) if not (~is_n & (strata == s)).any()}
    return float(np.isin(strata[is_n], list(no_u)).mean()) if is_n.any() else 0.0


def regression_stats(df: pd.DataFrame, tag: str, scale: str) -> dict:
    r = df[f"res_{scale}_{tag}"].to_numpy()
    n, u = df["nonuefa"].to_numpy(), ~df["nonuefa"].to_numpy()
    lg = df["valuation_league_id"].to_numpy()
    rmse = lambda x: float(np.sqrt(np.mean(x ** 2)))
    return {
        "mean_residual_UEFA": r[u].mean(), "mean_residual_nonUEFA": r[n].mean(),
        "signed_gap_raw": r[n].mean() - r[u].mean(),
        "signed_gap_league_stratified": stratified_gap(r, n, u, lg),
        "mae_UEFA": np.abs(r[u]).mean(), "mae_nonUEFA": np.abs(r[n]).mean(),
        "mae_gap_raw": np.abs(r[n]).mean() - np.abs(r[u]).mean(),
        "mae_gap_league_stratified": stratified_gap(np.abs(r), n, u, lg),
        "rmse_UEFA": rmse(r[u]), "rmse_nonUEFA": rmse(r[n]), "rmse_gap_raw": rmse(r[n]) - rmse(r[u]),
    }


def tier_stats(true, pred, is_n) -> dict:
    """ER1a, ER1b (one-vs-rest per tier) and directional rates, by group."""
    true, pred, is_n = np.asarray(true), np.asarray(pred), np.asarray(is_n)
    out = {}
    for g, m in [("UEFA", ~is_n), ("nonUEFA", is_n)]:
        out[f"error_rate_{g}"] = float(np.mean(true[m] != pred[m]))
        out[f"under_tier_rate_{g}"] = float(np.mean(pred[m] < true[m]))   # model places player BELOW actual tier
        out[f"over_tier_rate_{g}"] = float(np.mean(pred[m] > true[m]))
    out["ER1a_error_rate_gap"] = out["error_rate_nonUEFA"] - out["error_rate_UEFA"]
    out["under_tier_gap"] = out["under_tier_rate_nonUEFA"] - out["under_tier_rate_UEFA"]
    out["over_tier_gap"] = out["over_tier_rate_nonUEFA"] - out["over_tier_rate_UEFA"]
    eods = []
    for k, name in enumerate(TIER_NAMES):
        yt, yp = true == k, pred == k
        rates = {}
        for g, m in [("UEFA", ~is_n), ("nonUEFA", is_n)]:
            pos, neg = yt & m, ~yt & m
            rates[f"tpr_{g}"] = yp[pos].mean() if pos.any() else np.nan
            rates[f"fpr_{g}"] = yp[neg].mean() if neg.any() else np.nan
            rates[f"selection_rate_{g}"] = yp[m].mean()
            rates[f"base_rate_{g}"] = yt[m].mean()
        d_tpr = rates["tpr_nonUEFA"] - rates["tpr_UEFA"]
        d_fpr = rates["fpr_nonUEFA"] - rates["fpr_UEFA"]
        eod = float(np.nanmax([abs(d_tpr), abs(d_fpr)]))
        eods.append(eod)
        out |= {f"{name}_{k2}": v for k2, v in rates.items()}
        out |= {f"{name}_tpr_gap": d_tpr, f"{name}_fpr_gap": d_fpr, f"{name}_EOD": eod,
                f"{name}_selection_rate_gap": rates["selection_rate_nonUEFA"] - rates["selection_rate_UEFA"],
                f"{name}_base_rate_gap": rates["base_rate_nonUEFA"] - rates["base_rate_UEFA"]}
    out["ER1b_max_EOD"] = float(np.nanmax(eods))
    return out


def fairlearn_tier_check(true, pred, groups) -> dict:
    """Same ER1a / per-tier EOD via Fairlearn, as an independent implementation."""
    true, pred = np.asarray(true), np.asarray(pred)
    mf = MetricFrame(metrics={"error_rate": lambda t, p: np.mean(t != p)}, y_true=true, y_pred=pred,
                     sensitive_features=groups)
    out = {"ER1a_error_rate_gap_fairlearn_abs": float(mf.difference()["error_rate"])}
    for k, name in enumerate(TIER_NAMES):
        yt, yp = (true == k).astype(int), (pred == k).astype(int)
        out[f"{name}_EOD_fairlearn"] = float(equalized_odds_difference(yt, yp, sensitive_features=groups))
        rates = MetricFrame(metrics={"tpr": true_positive_rate, "fpr": false_positive_rate},
                            y_true=yt, y_pred=yp, sensitive_features=groups).by_group
        out[f"{name}_tpr_by_group"] = rates["tpr"].round(4).to_dict()
        out[f"{name}_fpr_by_group"] = rates["fpr"].round(4).to_dict()
    return out


# ---------------------------------------------------------------------------
# Bootstrap
# ---------------------------------------------------------------------------
def bootstrap(df: pd.DataFrame, stat_fn, n_boot: int, seed: int = RANDOM_SEED) -> pd.DataFrame:
    """Percentile CIs for every value returned by stat_fn(df) (a flat dict of floats)."""
    point = stat_fn(df)
    strata = df.groupby(["valuation_league_id", "nonuefa"]).indices
    groups = list(strata.values())
    rng = np.random.default_rng(seed)
    reps = []
    for _ in range(n_boot):
        idx = np.concatenate([rng.choice(g, size=len(g), replace=True) for g in groups])
        reps.append(stat_fn(df.iloc[idx]))
    reps = pd.DataFrame(reps)
    rows = []
    for k, v in point.items():
        if isinstance(v, (int, float, np.floating)) and k in reps:
            lo, hi = np.nanpercentile(reps[k], [2.5, 97.5])
            rows.append({"metric": k, "estimate": float(v), "ci95_low": float(lo), "ci95_high": float(hi)})
    return pd.DataFrame(rows)


def regression_block(df, scale):
    """Model A, Model B and the paired A − B difference in one pass, so CIs are paired."""
    def fn(d):
        a, b = regression_stats(d, "A", scale), regression_stats(d, "B", scale)
        return ({f"A_{k}": v for k, v in a.items()} | {f"B_{k}": v for k, v in b.items()} |
                {f"AminusB_{k}": a[k] - b[k] for k in ("signed_gap_raw", "signed_gap_league_stratified",
                                                     "mae_gap_raw", "mae_gap_league_stratified")})
    return fn


def tier_block(source):
    def fn(d):
        a = tier_stats(d["true_tier"], d[f"{source}_tier_A"], d["nonuefa"])
        b = tier_stats(d["true_tier"], d[f"{source}_tier_B"], d["nonuefa"])
        return ({f"A_{k}": v for k, v in a.items()} | {f"B_{k}": v for k, v in b.items()} |
                {f"AminusB_{k}": a[k] - b[k] for k in ("ER1a_error_rate_gap", "ER1b_max_EOD", "under_tier_gap", "over_tier_gap")})
    return fn


# ---------------------------------------------------------------------------
# Strata
# ---------------------------------------------------------------------------
def strata_table(df, n_boot) -> pd.DataFrame:
    """League-stratified signed log gap (non-UEFA subset vs UEFA subset) for pre-specified strata."""
    specs = [
        ("all players", df.nonuefa, ~df.nonuefa),
        ("minutes >= 900 (sensitivity)", df.nonuefa & (df.minutes >= 900), ~df.nonuefa & (df.minutes >= 900)),
        ("recent arrivals", df.nonuefa & df.recent_arrival, ~df.nonuefa & df.recent_arrival),
        ("established (not recent arrivals)", df.nonuefa & ~df.recent_arrival, ~df.nonuefa & ~df.recent_arrival),
        ("CAF vs UEFA", df.confederation.eq("CAF"), ~df.nonuefa),
        ("CONMEBOL vs UEFA", df.confederation.eq("CONMEBOL"), ~df.nonuefa),
        ("diaspora-born non-UEFA vs UEFA", df.diaspora_born, ~df.nonuefa),
        ("other non-UEFA vs UEFA", df.nonuefa & ~df.diaspora_born, ~df.nonuefa),
        ("non-UEFA vs EU-mobile UEFA (exploratory)", df.nonuefa, df.eu_mobile),
        ("non-UEFA vs other UEFA (exploratory)", df.nonuefa, ~df.nonuefa & ~df.eu_mobile),
    ] + [(f"position: {p}", df.nonuefa & df.position.eq(p), ~df.nonuefa & df.position.eq(p))
         for p in ["Attack", "Midfield", "Defender", "Goalkeeper"]]
    rows = []
    rng = np.random.default_rng(RANDOM_SEED)
    for name, mn, mu in specs:
        sub = df[mn | mu].copy()
        sub["nonuefa"] = mn[mn | mu]
        lg = sub.valuation_league_id.to_numpy()
        row = {"stratum": name, "n_nonUEFA": int(mn.sum()), "n_UEFA": int(mu.sum()),
               "flag": "small (n_nonUEFA < 30): descriptive only" if mn.sum() < 30 else "",
               # share of non-UEFA players in leagues with no UEFA comparator (dropped from the estimate)
               "dropped_nonUEFA_share": float(dropped_share(sub.nonuefa.to_numpy(), lg))}
        strata = list(sub.groupby(["valuation_league_id", "nonuefa"]).indices.values())
        for tag in "AB":
            r = sub[f"res_log_{tag}"].to_numpy()
            est = stratified_gap(r, sub.nonuefa.to_numpy(), ~sub.nonuefa.to_numpy(), lg)
            reps = []
            for _ in range(n_boot):
                idx = np.concatenate([rng.choice(g, len(g)) for g in strata])
                s = sub.iloc[idx]
                reps.append(stratified_gap(s[f"res_log_{tag}"].to_numpy(), s.nonuefa.to_numpy(),
                                           ~s.nonuefa.to_numpy(), s.valuation_league_id.to_numpy()))
            lo, hi = np.nanpercentile(reps, [2.5, 97.5])
            row |= {f"{tag}_signed_log_gap": est, f"{tag}_ci95_low": lo, f"{tag}_ci95_high": hi}
        rows.append(row)
    return pd.DataFrame(rows)


def league_table(df, n_boot) -> pd.DataFrame:
    rows = []
    rng = np.random.default_rng(RANDOM_SEED)
    for lg, d in df.groupby("valuation_league_id"):
        n, u = d[d.nonuefa], d[~d.nonuefa]
        row = {"league": lg, "n_nonUEFA": len(n), "n_UEFA": len(u),
               "reporting": "league-level estimate" if len(n) >= 100 else "pooled only (n < 100)"}
        for tag in "AB":
            rn, ru = n[f"res_log_{tag}"].to_numpy(), u[f"res_log_{tag}"].to_numpy()
            reps = [rng.choice(rn, len(rn)).mean() - rng.choice(ru, len(ru)).mean() for _ in range(n_boot)]
            lo, hi = np.percentile(reps, [2.5, 97.5])
            row |= {f"{tag}_signed_log_gap": rn.mean() - ru.mean(), f"{tag}_ci95_low": lo, f"{tag}_ci95_high": hi,
                    f"{tag}_mae_UEFA": np.abs(ru).mean(), f"{tag}_mae_nonUEFA": np.abs(rn).mean()}
        rows.append(row)
    return pd.DataFrame(rows).sort_values("n_nonUEFA", ascending=False)


def calibration_check(df, n_boot) -> pd.DataFrame:
    """Gap WITHIN bins of predicted value (deciles), also stratified by league.

    Residuals correlate with value, and the groups' value distributions differ. If the overall
    gap only reflected mild miscalibration across the prediction range, it would vanish inside
    bins of the model's own prediction. Binning on the prediction (not the true value) avoids
    conditioning on the outcome.
    """
    rows = []
    rng = np.random.default_rng(RANDOM_SEED)
    for tag in "AB":
        dec = pd.qcut(df[f"pred_log_{tag}"], 10, labels=False)
        strata_bin = dec.astype(str).to_numpy()
        strata_lb = (df.valuation_league_id + "_" + dec.astype(str)).to_numpy()
        r, n = df[f"res_log_{tag}"].to_numpy(), df.nonuefa.to_numpy()
        for d in range(10):
            m = dec.to_numpy() == d
            rows.append({"model": tag, "predicted_decile": d + 1, "n_nonUEFA": int((m & n).sum()), "n_UEFA": int((m & ~n).sum()),
                         "mean_res_UEFA": r[m & ~n].mean(), "mean_res_nonUEFA": r[m & n].mean(),
                         "gap": r[m & n].mean() - r[m & ~n].mean()})
        idx_groups = list(pd.DataFrame({"s": strata_lb, "n": n}).groupby(["s", "n"]).indices.values())
        for label, strata in [("ALL: stratified by predicted decile", strata_bin),
                              ("ALL: stratified by league x predicted decile", strata_lb)]:
            est = stratified_gap(r, n, ~n, strata)
            reps = []
            for _ in range(n_boot):
                idx = np.concatenate([rng.choice(g, len(g)) for g in idx_groups])
                reps.append(stratified_gap(r[idx], n[idx], ~n[idx], strata[idx]))
            lo, hi = np.nanpercentile(reps, [2.5, 97.5])
            rows.append({"model": tag, "predicted_decile": label, "gap": est, "ci95_low": lo, "ci95_high": hi,
                         "dropped_nonUEFA_share": dropped_share(n, strata)})
    return pd.DataFrame(rows)


def worst_errors(df, tag="A", top=0.05) -> pd.DataFrame:
    """Are the model's largest held-out misses disproportionately non-UEFA?"""
    r = df[f"res_log_{tag}"]
    rows = []
    for name, mask in [("largest under-predictions", r >= r.quantile(1 - top)),
                       ("largest over-predictions", r <= r.quantile(top)),
                       ("largest absolute errors", r.abs() >= r.abs().quantile(1 - top))]:
        rows.append({"model": MODELS["full" if tag == "A" else "performance"], "set": f"{name} (top {int(top*100)}%)",
                     "n": int(mask.sum()), "nonUEFA_share_in_set": float(df.nonuefa[mask].mean()),
                     "nonUEFA_share_overall": float(df.nonuefa.mean())})
    return pd.DataFrame(rows)


# ---------------------------------------------------------------------------
# Plots
# ---------------------------------------------------------------------------
def plot_residuals_by_group(df, path):
    fig, ax = plt.subplots(1, 2, figsize=(12, 4.5), sharey=True)
    for a, tag in zip(ax, "AB"):
        data = [df.loc[~df.nonuefa, f"res_log_{tag}"], df.loc[df.nonuefa, f"res_log_{tag}"]]
        a.boxplot(data, tick_labels=["UEFA", "non-UEFA"], showfliers=False)
        a.axhline(0, color="k", lw=0.8)
        a.set_title(f"{MODELS['full' if tag == 'A' else 'performance']}: held-out log residual")
    ax[0].set_ylabel("ln(actual) − ln(predicted)   (+ = under-predicted)")
    fig.tight_layout()
    fig.savefig(path, dpi=120)
    plt.close(fig)


def plot_league_forest(lt, path):
    lt = lt.sort_values("A_signed_log_gap")
    fig, ax = plt.subplots(figsize=(8, 6))
    y = np.arange(len(lt))
    for off, tag, col in [(-0.15, "A", "C0"), (0.15, "B", "C1")]:
        ax.errorbar(lt[f"{tag}_signed_log_gap"], y + off,
                    xerr=[lt[f"{tag}_signed_log_gap"] - lt[f"{tag}_ci95_low"], lt[f"{tag}_ci95_high"] - lt[f"{tag}_signed_log_gap"]],
                    fmt="o", ms=4, color=col, label=MODELS["full" if tag == "A" else "performance"])
    ax.axvline(0, color="k", lw=0.8)
    ax.set_yticks(y, [f"{l} (n={n})" for l, n in zip(lt.league, lt.n_nonUEFA)])
    ax.set_xlabel("signed log-residual gap, non-UEFA − UEFA (95% CI)")
    ax.set_title("Within-league gaps (leagues with n < 100 non-UEFA: pooled use only)")
    ax.legend()
    fig.tight_layout()
    fig.savefig(path, dpi=120)
    plt.close(fig)


def to_md(df):
    cols = list(df.columns)
    fmt = lambda v: "" if pd.isna(v) else (f"{v:,.4f}" if isinstance(v, float) else str(v))
    return "\n".join(["| " + " | ".join(cols) + " |", "|" + "---|" * len(cols)] +
                     ["| " + " | ".join(fmt(v) for v in r) + " |" for r in df.itertuples(index=False)])


def main(n_boot: int = 2000, suffix: str = "") -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    primary = json.loads((REPORTS_DIR / "models" / f"primary_model{suffix}.json").read_text())["algorithm"]
    log.info("Primary algorithm (pre-specified rule): %s", primary)
    df = load_frame(primary, suffix)
    groups = df["audit_group"].to_numpy()

    out = {
        "regression_log_scale": bootstrap(df, regression_block(df, "log"), n_boot),
        "regression_eur_scale": bootstrap(df, regression_block(df, "eur"), n_boot),
        "tier_classifier": bootstrap(df, tier_block("clf"), n_boot),
        "tier_from_regression": bootstrap(df, tier_block("reg"), n_boot),
        "strata_signed_log_gap": strata_table(df, n_boot),
        "league_signed_log_gap": league_table(df, n_boot),
        "worst_errors": pd.concat([worst_errors(df, "A"), worst_errors(df, "B")]),
        "calibration_within_predicted_deciles": calibration_check(df, n_boot),
    }
    checks = {tag: fairlearn_tier_check(df["true_tier"], df[f"clf_tier_{tag}"], groups) for tag in "AB"}
    (OUT / f"fairlearn_check{suffix}.json").write_text(json.dumps(checks, indent=2, default=float))

    # Robustness: every algorithm's league-stratified signed log gap (Model A and B).
    rob = []
    for algo in ["ridge", "random_forest", "hgb", "hgb_tuned"]:
        try:
            d = load_frame(algo, suffix)
        except FileNotFoundError:
            continue
        for tag in "AB":
            rs = regression_stats(d, tag, "log")
            rob.append({"algorithm": algo, "model": tag, "signed_gap_raw": rs["signed_gap_raw"],
                        "signed_gap_league_stratified": rs["signed_gap_league_stratified"],
                        "mae_gap_raw": rs["mae_gap_raw"], "rmse_UEFA": rs["rmse_UEFA"], "rmse_nonUEFA": rs["rmse_nonUEFA"]})
    out["robustness_all_algorithms"] = pd.DataFrame(rob)

    for k, v in out.items():
        v.to_csv(OUT / f"{k}{suffix}.csv", index=False)
    plot_residuals_by_group(df, OUT / f"residuals_by_group{suffix}.png")
    plot_league_forest(out["league_signed_log_gap"], OUT / f"league_gaps{suffix}.png")

    md = [f"# Fairness audit tables (generated, primary algorithm: {primary})", "",
          "Residual = actual − predicted (+ = under-predicted). Gap = non-UEFA − UEFA. 95% CIs: stratified bootstrap.",
          "Associations only; not evidence of discrimination. Interpretation: docs/reports/FAIRNESS_AUDIT.md.", ""]
    for k, v in out.items():
        md += [f"## {k}", "", to_md(v), ""]
    (OUT / f"fairness_summary{suffix}.md").write_text("\n".join(md), encoding="utf-8")
    log.info("Fairness audit written to %s", OUT)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--boot", type=int, default=2000)
    ap.add_argument("--quick", action="store_true", help="use the --quick training outputs")
    a = ap.parse_args()
    main(n_boot=a.boot, suffix="_quick" if a.quick else "")
