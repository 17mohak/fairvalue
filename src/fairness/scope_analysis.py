"""Evidence for the research-scope decision (D-011). Read-only: changes no dataset.

Usage:
    python -m src.fairness.scope_analysis      (after src.data.build_dataset)

Writes reports/scope/*.csv. Interpretation: docs/reports/RESEARCH_SCOPE_ASSESSMENT.md.

Sections
    1  selection: who is retained vs excluded, by group
    2  minutes-threshold sensitivity (90 / 450 / 900) incl. split-half reliability of per-90 stats
    3  within-league comparability: balance (SMD), propensity overlap, caliper matching
    4  proxy decomposition: where does the UEFA/non-UEFA signal in the features come from?
"""

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import RepeatedStratifiedKFold, StratifiedKFold, cross_val_predict, cross_val_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from src.config import PROCESSED_DIR, RANDOM_SEED, RAW_DIR, REPORTS_DIR, get_logger
from src.data.build_dataset import NATIONAL_TEAM_COMPETITIONS, STATS_WINDOW_DAYS

log = get_logger(__name__)
OUT = REPORTS_DIR / "scope"
THRESHOLDS = [90, 450, 900]

# EU27 + EEA + UK home nations + Switzerland: free labour mobility in European football
# historically (Bosman). Used only for a secondary framing check, not as the audit group.
EU_MOBILE = {
    "Austria", "Belgium", "Bulgaria", "Croatia", "Cyprus", "Czech Republic", "Denmark", "Estonia",
    "Finland", "France", "Germany", "Greece", "Hungary", "Ireland", "Italy", "Latvia", "Lithuania",
    "Luxembourg", "Malta", "Netherlands", "Poland", "Portugal", "Romania", "Slovakia", "Slovenia",
    "Spain", "Sweden", "Iceland", "Liechtenstein", "Norway", "Switzerland",
    "England", "Scotland", "Wales", "Northern Ireland",
}

NUM_PERF = ["age", "height_in_cm", "appearances", "minutes", "minutes_per_appearance", "start_share",
            "goals_p90", "assists_p90", "goal_contrib_p90", "yellow_p90", "red_p90",
            "intl_club_minutes_share", "minutes_last_365", "days_since_last_match",
            "valuation_club_minutes_share"]
CAT_PROFILE = ["position", "sub_position", "foot"]


def _pct(x):
    return round(100 * float(x), 1)


def load() -> pd.DataFrame:
    u = pd.read_parquet(PROCESSED_DIR / "player_universe.parquet")
    a = pd.read_parquet(PROCESSED_DIR / "audit_lookup.parquet")
    u = u.merge(a[["player_id", "audit_group", "confederation", "country_of_citizenship"]], on="player_id")
    u = u[u["audit_group"] != "UNKNOWN"].copy()
    u["y"] = (u["audit_group"] == "non-UEFA").astype(int)
    u["log_value"] = np.log10(u["market_value_in_eur"].clip(lower=1))
    return u


def preprocessor(numeric, categorical, dense=False):
    parts = []
    if numeric:
        parts.append(("num", Pipeline([("imp", SimpleImputer(strategy="median", add_indicator=True)),
                                       ("sc", StandardScaler())]), numeric))
    if categorical:
        parts.append(("cat", Pipeline([("imp", SimpleImputer(strategy="constant", fill_value="missing")),
                                       ("oh", OneHotEncoder(handle_unknown="ignore", min_frequency=5,
                                                            sparse_output=not dense))]), categorical))
    return ColumnTransformer(parts)


# ---------------------------------------------------------------------------
# 1. Selection
# ---------------------------------------------------------------------------
def selection_profile(u):
    status = np.select([u.eligible, ~u.in_covered_league], ["retained", "excluded: league not covered"],
                       "excluded: covered league, < 450 min")
    u = u.assign(status=status)
    rows = []
    for (g, s), d in u.groupby(["audit_group", "status"]):
        pos = d["position"].value_counts(normalize=True)
        rows.append({
            "group": g, "status": s, "n": len(d),
            "age_median": round(d.age.median(), 1),
            "value_p25": d.market_value_in_eur.quantile(.25), "value_median": d.market_value_in_eur.median(),
            "value_p75": d.market_value_in_eur.quantile(.75), "value_p90": d.market_value_in_eur.quantile(.9),
            "pct_any_match_data": _pct((d.minutes > 0).mean()),
            **{f"pct_{p.lower()}": _pct(pos.get(p, 0)) for p in ["Attack", "Midfield", "Defender", "Goalkeeper"]},
        })
    return pd.DataFrame(rows)


def selection_intensity(u):
    """Where in their own group's value distribution do retained players sit?"""
    u = u.copy()
    u["value_pctile_in_group"] = u.groupby("audit_group")["market_value_in_eur"].rank(pct=True) * 100
    t = u.groupby(["audit_group", "eligible"]).agg(n=("player_id", "size"),
                                                   median_value_percentile=("value_pctile_in_group", "median"))
    return t.round(1).reset_index()


def selection_by_confederation(u):
    t = u.groupby("confederation").apply(lambda d: pd.Series({
        "current_valued": len(d),
        "retained_pct": _pct(d.eligible.mean()),
        "median_value_retained": d.loc[d.eligible, "market_value_in_eur"].median(),
        "median_value_excluded": d.loc[~d.eligible, "market_value_in_eur"].median(),
        "median_age_retained": round(d.loc[d.eligible, "age"].median(), 1),
        "median_age_excluded": round(d.loc[~d.eligible, "age"].median(), 1),
    }), include_groups=False)
    t["value_ratio_retained_vs_excluded"] = (t.median_value_retained / t.median_value_excluded).round(2)
    return t.reset_index()


def selection_by_nationality(u, n=10):
    top = u[u.audit_group == "non-UEFA"].country_of_citizenship.value_counts().head(n).index
    d = u[u.country_of_citizenship.isin(top)]
    t = d.groupby("country_of_citizenship").apply(lambda x: pd.Series({
        "current_valued": len(x), "retained": int(x.eligible.sum()),
        "retained_pct": _pct(x.eligible.mean()),
        "median_value_retained": x.loc[x.eligible, "market_value_in_eur"].median(),
        "median_value_excluded": x.loc[~x.eligible, "market_value_in_eur"].median(),
    }), include_groups=False)
    return t.sort_values("current_valued", ascending=False).reset_index()


def exclusion_given_value(u):
    """Within covered leagues: is the minutes filter applied evenly across groups at the same value?"""
    c = u[u.in_covered_league].copy()
    c["value_quartile"] = pd.qcut(c.market_value_in_eur, 4, labels=["Q1", "Q2", "Q3", "Q4"], duplicates="drop")
    t = c.groupby(["value_quartile", "audit_group"], observed=True).agg(
        n=("player_id", "size"), dropped_by_minutes_pct=("has_min_minutes", lambda s: _pct(1 - s.mean())))
    return t.reset_index()


def eu_framing(u):
    e = u[u.eligible].copy()
    e["mobility_group"] = np.where(e.audit_group == "non-UEFA", "non-UEFA",
                                   np.where(e.country_of_citizenship.isin(EU_MOBILE), "UEFA: EU/EEA/UK/CH", "UEFA: other"))
    return e.groupby("mobility_group").agg(n=("player_id", "size"),
                                           median_value=("market_value_in_eur", "median")).reset_index()


# ---------------------------------------------------------------------------
# 2. Minutes threshold
# ---------------------------------------------------------------------------
def threshold_populations(u):
    rows, conf_rows = [], []
    base = u.in_covered_league & u.has_age & u.has_positive_value
    for t in THRESHOLDS:
        d = u[base & (u.minutes >= t)]
        per90_ok = d.minutes >= 450  # current pipeline only computes per-90 at >= 450
        q = pd.qcut(d.market_value_in_eur, 4, labels=False, duplicates="drop")
        cells = pd.crosstab(q, d.audit_group)
        lg = d.groupby("valuation_league_id").y.sum()
        for g, dg in d.groupby("audit_group"):
            rows.append({
                "threshold_min": t, "group": g, "n": len(dg),
                "value_median": dg.market_value_in_eur.median(),
                "value_p25": dg.market_value_in_eur.quantile(.25), "value_p75": dg.market_value_in_eur.quantile(.75),
                "age_median": round(dg.age.median(), 1),
                "pct_per90_computable_now": _pct((dg.minutes >= 450).mean()),
                "pct_club_ppg_present": _pct(dg.club_ppg.notna().mean()),
                "pct_height_present": _pct(dg.height_in_cm.notna().mean()),
                "smallest_value_quartile_cell": int(cells[g].min()),
                "leagues_with_30plus_nonuefa": int((lg >= 30).sum()),
                "non_uefa_share_pct": _pct(d.y.mean()),
            })
        cc = d.groupby("confederation").size()
        conf_rows.append({"threshold_min": t, **cc.to_dict()})
        del per90_ok
    return pd.DataFrame(rows), pd.DataFrame(conf_rows).fillna(0)


def split_half_reliability(u):
    """Reliability of per-90 output by minutes band (odd vs even matches, Spearman-Brown).

    Answers: below how many minutes is a per-90 number mostly noise?
    """
    a = pd.read_csv(RAW_DIR / "appearances.csv.gz", usecols=["player_id", "game_id", "date", "competition_id",
                                                            "minutes_played", "goals", "assists", "yellow_cards"],
                    parse_dates=["date"])
    a = a[~a.competition_id.isin(NATIONAL_TEAM_COMPETITIONS)]
    cov = u[u.in_covered_league & u.has_age & (u.minutes >= 90)][["player_id", "valuation_date", "minutes"]]
    a = a.merge(cov, on="player_id")
    a = a[(a.date <= a.valuation_date) & (a.date > a.valuation_date - pd.Timedelta(days=STATS_WINDOW_DAYS))]
    a = a.sort_values(["player_id", "date"])
    a["half"] = a.groupby("player_id").cumcount() % 2
    h = a.groupby(["player_id", "half"]).agg(m=("minutes_played", "sum"), gc=("goals", "sum"),
                                             ast=("assists", "sum"), yc=("yellow_cards", "sum"))
    h["ga"] = h.gc + h.ast
    w = h.unstack("half").dropna()
    w = w[(w[("m", 0)] > 0) & (w[("m", 1)] > 0)]
    tot = cov.set_index("player_id").minutes.reindex(w.index)
    bands = pd.cut(tot, [90, 450, 900, 1800, 1e9], right=False, labels=["90-449", "450-899", "900-1799", "1800+"])
    rows = []
    for b in bands.cat.categories:
        sel = w[bands == b]
        out = {"minutes_band": b, "players": len(sel)}
        for stat in ["ga", "yc"]:
            r = np.corrcoef(sel[(stat, 0)] * 90 / sel[("m", 0)], sel[(stat, 1)] * 90 / sel[("m", 1)])[0, 1]
            out[f"{stat}_p90_split_half_r"] = round(r, 3)
            out[f"{stat}_p90_spearman_brown"] = round(2 * r / (1 + r), 3) if r > -1 else np.nan
        rows.append(out)
    return pd.DataFrame(rows).rename(columns=lambda c: c.replace("ga_", "goal_contrib_").replace("yc_", "yellow_"))


# ---------------------------------------------------------------------------
# 3. Within-league comparability
# ---------------------------------------------------------------------------
SMD_FEATURES = ["age", "height_in_cm", "minutes", "start_share", "goal_contrib_p90", "yellow_p90",
                "intl_club_minutes_share", "club_ppg", "log_value"]


def smd(a, b):
    a, b = a.dropna(), b.dropna()
    s = np.sqrt((a.var() + b.var()) / 2)
    return (b.mean() - a.mean()) / s if s > 0 else 0.0


def propensity(e):
    """Out-of-fold probability of being non-UEFA from Model B features + league (no value)."""
    pre = preprocessor(NUM_PERF, CAT_PROFILE + ["valuation_league_id"])
    clf = Pipeline([("pre", pre), ("lr", LogisticRegression(max_iter=3000, C=1.0))])
    cv = StratifiedKFold(5, shuffle=True, random_state=RANDOM_SEED)
    return cross_val_predict(clf, e, e.y, cv=cv, method="predict_proba")[:, 1]


def within_league(u):
    e = u[u.eligible].copy()
    e["ps"] = propensity(e)
    e["logit"] = np.log(e.ps / (1 - e.ps))
    caliper = 0.2 * e.logit.std()
    rows, smd_rows = [], []
    for lg, d in e.groupby("valuation_league_id"):
        nu, uf = d[d.y == 1], d[d.y == 0]
        pos_nu = nu.position.value_counts(normalize=True)
        pos_uf = uf.position.value_counts(normalize=True)
        pos_tvd = 0.5 * sum(abs(pos_nu.get(p, 0) - pos_uf.get(p, 0)) for p in set(pos_nu.index) | set(pos_uf.index))
        lo, hi = max(nu.ps.min(), uf.ps.min()), min(nu.ps.max(), uf.ps.max())
        in_support = nu.ps.between(lo, hi).mean()
        # 1:1 nearest-neighbour matching with replacement, same league AND same position.
        matched, pairs = 0, []
        for _, r in nu.iterrows():
            cand = uf[uf.position == r.position]
            if cand.empty:
                continue
            dist = (cand.logit - r.logit).abs()
            if dist.min() <= caliper:
                matched += 1
                pairs.append((r.name, dist.idxmin()))
        row = {"league": lg, "n_uefa": len(uf), "n_non_uefa": len(nu), "non_uefa_pct": _pct(len(nu) / len(d)),
               "age_median_uefa": round(uf.age.median(), 1), "age_median_non_uefa": round(nu.age.median(), 1),
               "position_mix_difference_tvd": round(pos_tvd, 3),
               "value_median_uefa": uf.market_value_in_eur.median(), "value_median_non_uefa": nu.market_value_in_eur.median(),
               "goal_contrib_p90_median_uefa": round(uf.goal_contrib_p90.median(), 3),
               "goal_contrib_p90_median_non_uefa": round(nu.goal_contrib_p90.median(), 3),
               "pct_non_uefa_in_common_support": _pct(in_support),
               "pct_non_uefa_matched_caliper": _pct(matched / len(nu)) if len(nu) else 0.0}
        smd_before = {f: smd(uf[f], nu[f]) for f in SMD_FEATURES}
        if pairs:
            mt = e.loc[[p[0] for p in pairs]]
            mc = e.loc[[p[1] for p in pairs]]
            smd_after = {f: smd(mc[f], mt[f]) for f in SMD_FEATURES if f != "log_value"}
            row["max_abs_smd_covariates_after_match"] = round(max(abs(v) for v in smd_after.values()), 3)
        row["max_abs_smd_covariates_before"] = round(max(abs(v) for k, v in smd_before.items() if k != "log_value"), 3)
        row["smd_log_value_raw"] = round(smd_before["log_value"], 3)
        rows.append(row)
        smd_rows.append({"league": lg, **{k: round(v, 3) for k, v in smd_before.items()}})
    t = pd.DataFrame(rows)

    # Overlap is good in every league (support and matching >= 94%), so the limiting
    # factor is sample size: per-league post-match balance is noisy below ~100 players.
    def verdict(r):
        if r.pct_non_uefa_matched_caliper < 75:
            return "poor overlap"
        if r.n_non_uefa >= 100:
            return "league-level estimate possible (wide CI)"
        if r.n_non_uefa >= 50:
            return "pooled estimate only; league estimate unreliable"
        return "pooled estimate only; too small alone"
    t["verdict"] = t.apply(verdict, axis=1)
    # Pooled balance across all leagues after league+position matching.
    all_pairs = []
    for lg, d in e.groupby("valuation_league_id"):
        nu, uf = d[d.y == 1], d[d.y == 0]
        for i, r in nu.iterrows():
            c = uf[uf.position == r.position]
            if len(c) and (c.logit - r.logit).abs().min() <= caliper:
                all_pairs.append((i, (c.logit - r.logit).abs().idxmin()))
    mt, mc = e.loc[[p[0] for p in all_pairs]], e.loc[[p[1] for p in all_pairs]]
    pooled = pd.DataFrame({
        "covariate": SMD_FEATURES,
        "smd_before_matching": [round(smd(e[e.y == 0][f], e[e.y == 1][f]), 3) for f in SMD_FEATURES],
        "smd_after_matching": [round(smd(mc[f], mt[f]), 3) for f in SMD_FEATURES],
    })
    pooled.attrs["n_matched"] = len(all_pairs)
    pooled.loc[len(pooled)] = {"covariate": f"n matched non-UEFA = {len(all_pairs)}; unique UEFA controls = {mc.index.nunique()}",
                               "smd_before_matching": np.nan, "smd_after_matching": np.nan}
    return t.sort_values("n_non_uefa", ascending=False), pd.DataFrame(smd_rows), e, pooled


# ---------------------------------------------------------------------------
# 4. Proxy decomposition
# ---------------------------------------------------------------------------
PERF_STATS = ["appearances", "minutes", "minutes_per_appearance", "start_share", "goals_p90", "assists_p90",
              "goal_contrib_p90", "yellow_p90", "red_p90", "intl_club_minutes_share", "minutes_last_365",
              "days_since_last_match", "valuation_club_minutes_share"]
BLOCKS = {
    "league identity": ([], ["valuation_league_id"]),
    "club strength (club_ppg)": (["club_ppg"], []),
    "club identity (one-hot)": ([], ["valuation_club_id"]),
    "age": (["age"], []),
    "position + sub_position": ([], ["position", "sub_position"]),
    "height + foot": (["height_in_cm"], ["foot"]),
    "match statistics": (PERF_STATS, []),
    "Model B (all performance/profile)": (NUM_PERF, CAT_PROFILE),
    "Model A (B + league + club_ppg)": (NUM_PERF + ["club_ppg"], CAT_PROFILE + ["valuation_league_id"]),
}


def _auc(df, numeric, categorical, model="lr", repeats=5):
    X = df[numeric + categorical].copy()
    if "valuation_club_id" in categorical:
        X["valuation_club_id"] = X["valuation_club_id"].astype(str)
    if model == "lr":
        clf = Pipeline([("pre", preprocessor(numeric, categorical)), ("m", LogisticRegression(max_iter=3000))])
    else:
        clf = Pipeline([("pre", preprocessor(numeric, categorical, dense=True)),
                        ("m", HistGradientBoostingClassifier(max_iter=200, learning_rate=0.05, random_state=RANDOM_SEED))])
    cv = RepeatedStratifiedKFold(n_splits=5, n_repeats=repeats, random_state=RANDOM_SEED)
    s = cross_val_score(clf, X, df.y, cv=cv, scoring="roc_auc")
    return round(s.mean(), 3), round(s.std(), 3), round(s.min(), 3), round(s.max(), 3)


def proxy_decomposition(u):
    e = u[u.eligible].copy()
    rows = []
    for name, (num, cat) in BLOCKS.items():
        m, sd, lo, hi = _auc(e, num, cat)
        rows.append({"population": "14-league eligible", "features": name, "model": "logistic",
                     "auc_mean": m, "auc_sd": sd, "auc_min": lo, "auc_max": hi})
    for name in ["Model B (all performance/profile)", "Model A (B + league + club_ppg)"]:
        num, cat = BLOCKS[name]
        m, sd, lo, hi = _auc(e, num, cat, model="hgb", repeats=2)
        rows.append({"population": "14-league eligible", "features": name, "model": "gradient boosting",
                     "auc_mean": m, "auc_sd": sd, "auc_min": lo, "auc_max": hi})
    # Drop-one-block from Model A.
    full_num, full_cat = BLOCKS["Model A (B + league + club_ppg)"]
    for name in ["league identity", "club strength (club_ppg)", "age", "position + sub_position",
                 "height + foot", "match statistics"]:
        bn, bc = BLOCKS[name]
        m, sd, lo, hi = _auc(e, [c for c in full_num if c not in bn], [c for c in full_cat if c not in bc])
        rows.append({"population": "14-league eligible", "features": f"Model A minus {name}", "model": "logistic",
                     "auc_mean": m, "auc_sd": sd, "auc_min": lo, "auc_max": hi})
    # Negative control: shuffled labels must give ~0.5 if the evaluation is sound.
    rng = np.random.default_rng(RANDOM_SEED)
    shuffled = e.assign(y=rng.permutation(e.y.values))
    m, sd, lo, hi = _auc(shuffled, full_num, full_cat)
    rows.append({"population": "14-league eligible", "features": "Model A, SHUFFLED labels (control)",
                 "model": "logistic", "auc_mean": m, "auc_sd": sd, "auc_min": lo, "auc_max": hi})
    # Same profile-only features in the 14-league vs all-league populations.
    prof_num, prof_cat = ["age", "height_in_cm"], ["position", "sub_position", "foot"]
    allv = u[u.has_age & u.has_positive_value].copy()
    allv["valuation_league_id"] = allv["valuation_league_id"].fillna("untracked")
    for pop_name, d in [("14-league eligible", e), ("all current-valued players", allv)]:
        for label, cat in [("profile only (age, height, position, foot)", prof_cat),
                           ("profile + league identity", prof_cat + ["valuation_league_id"])]:
            m, sd, lo, hi = _auc(d, prof_num, cat)
            rows.append({"population": pop_name, "features": label, "model": "logistic",
                         "auc_mean": m, "auc_sd": sd, "auc_min": lo, "auc_max": hi})
    return pd.DataFrame(rows)


def within_league_auc(e):
    """AUC of the propensity score computed inside each league (league effect removed)."""
    rows = []
    for lg, d in e.groupby("valuation_league_id"):
        if d.y.nunique() == 2:
            rows.append({"league": lg, "n": len(d), "within_league_auc": round(roc_auc_score(d.y, d.ps), 3)})
    t = pd.DataFrame(rows)
    pooled_weighted = round((t.within_league_auc * t.n).sum() / t.n.sum(), 3)
    return t, pooled_weighted


def univariate_signal(u):
    e = u[u.eligible]
    rows = []
    for f in NUM_PERF + ["club_ppg"]:
        d = e[[f, "y"]].dropna()
        auc = roc_auc_score(d.y, d[f])
        rows.append({"feature": f, "univariate_auc": round(auc, 3), "signal_abs": round(abs(auc - 0.5), 3),
                     "median_uefa": round(d.loc[d.y == 0, f].median(), 3),
                     "median_non_uefa": round(d.loc[d.y == 1, f].median(), 3)})
    for f in ["position", "sub_position", "foot"]:
        ct = pd.crosstab(e[f].fillna("missing"), e.y, normalize="columns") * 100
        tvd = 0.5 * (ct[0] - ct[1]).abs().sum() / 100
        rows.append({"feature": f, "univariate_auc": np.nan, "signal_abs": round(tvd, 3),
                     "median_uefa": "distribution", "median_non_uefa": "TVD shown in signal_abs"})
    return pd.DataFrame(rows).sort_values("signal_abs", ascending=False)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    u = load()
    out = {}
    log.info("1 selection")
    out["1_selection_profile"] = selection_profile(u)
    out["1_selection_intensity"] = selection_intensity(u)
    out["1_selection_by_confederation"] = selection_by_confederation(u)
    out["1_selection_by_nationality"] = selection_by_nationality(u)
    out["1_exclusion_given_value"] = exclusion_given_value(u)
    out["1_eu_mobility_framing"] = eu_framing(u)
    log.info("2 thresholds")
    out["2_threshold_populations"], out["2_threshold_confederations"] = threshold_populations(u)
    out["2_per90_reliability"] = split_half_reliability(u)
    log.info("3 within-league")
    out["3_within_league"], out["3_within_league_smd"], e, out["3_pooled_match_balance"] = within_league(u)
    wl, pooled = within_league_auc(e)
    wl.loc[len(wl)] = {"league": "ALL (n-weighted mean)", "n": int(wl.n.sum()), "within_league_auc": pooled}
    out["4_within_league_proxy_auc"] = wl
    log.info("4 proxies")
    out["4_proxy_decomposition"] = proxy_decomposition(u)
    out["4_univariate_signal"] = univariate_signal(u)
    for k, v in out.items():
        v.to_csv(OUT / f"{k}.csv", index=False)
    log.info("Wrote %d tables to %s", len(out), OUT)


if __name__ == "__main__":
    main()
