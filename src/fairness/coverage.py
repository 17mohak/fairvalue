"""UEFA vs non-UEFA coverage audit: is the fairness comparison viable at all?

Usage:
    python -m src.fairness.coverage     (run src.data.build_dataset first)

Writes every table to reports/coverage/*.csv and a summary to
reports/coverage/coverage_summary.md. All numbers in the summary are computed
here; nothing is typed in by hand.

This is descriptive. A difference between groups here describes the DATA,
not discrimination by anyone.
"""

import pandas as pd

from src.config import MIN_MINUTES_FOR_PER90, PROCESSED_DIR, RANDOM_SEED, RAW_DIR, REPORTS_DIR, get_logger
from src.data.nationality import load_mapping
from src.features.preprocess import FEATURES_FULL, build_preprocessor, feature_columns

log = get_logger(__name__)
OUT = REPORTS_DIR / "coverage"
GROUPS = ["UEFA", "non-UEFA", "UNKNOWN"]


def _pct(x):
    return round(100 * x, 1)


def funnel(universe: pd.DataFrame, audit: pd.DataFrame, players: pd.DataFrame) -> pd.DataFrame:
    """Players remaining at each eligibility stage, by audit group."""
    a = audit.set_index("player_id")["audit_group"]
    stages = {
        "1 all players in dataset": players["player_id"],
        "2 current valuation (last 12 months)": universe["player_id"],
        "3 + valued while in a covered league": universe.loc[universe.in_covered_league, "player_id"],
        f"4 + >= {MIN_MINUTES_FOR_PER90} club minutes in 2y window": universe.loc[universe.in_covered_league & universe.has_min_minutes, "player_id"],
        "5 eligible (+ valid age, value > 0)": universe.loc[universe.eligible, "player_id"],
    }
    rows = []
    for stage, ids in stages.items():
        counts = a.reindex(ids).value_counts()
        rows.append({"stage": stage, **{g: int(counts.get(g, 0)) for g in GROUPS}, "total": int(len(ids))})
    f = pd.DataFrame(rows)
    f["non_uefa_share_%"] = _pct(f["non-UEFA"] / (f["UEFA"] + f["non-UEFA"]))
    return f


def by_confederation(universe, audit) -> pd.DataFrame:
    u = universe.merge(audit[["player_id", "confederation"]], on="player_id", how="left")
    t = u.groupby("confederation").agg(
        current_valuation=("player_id", "size"),
        in_covered_league=("in_covered_league", "sum"),
        eligible=("eligible", "sum"),
        median_value_eligible_eur=("market_value_in_eur", lambda s: s[u.loc[s.index, "eligible"]].median()),
    )
    t["eligible_rate_%"] = _pct(t["eligible"] / t["current_valuation"])
    return t.sort_values("eligible", ascending=False).reset_index()


def top_nationalities(universe, audit, n=25) -> pd.DataFrame:
    u = universe[universe.eligible].merge(audit, on="player_id", how="left")
    t = u.groupby(["country_of_citizenship", "confederation"]).size().rename("eligible_players")
    return t.sort_values(ascending=False).head(n).reset_index()


def missingness(universe, audit) -> pd.DataFrame:
    """Null rate of each feature among eligible players, by group."""
    u = universe[universe.eligible].merge(audit[["player_id", "audit_group"]], on="player_id")
    t = u.groupby("audit_group")[FEATURES_FULL].apply(lambda d: d.isna().mean() * 100).T.round(2)
    return t.reindex(columns=[g for g in GROUPS if g in t.columns]).rename_axis("feature").reset_index()


def feature_density(universe, audit) -> pd.DataFrame:
    """How much match evidence stands behind each player's stats, by group."""
    u = universe[universe.eligible].merge(audit[["player_id", "audit_group"]], on="player_id")
    q = u.groupby("audit_group")[["minutes", "appearances"]].describe(percentiles=[0.25, 0.5, 0.75])
    q.columns = [f"{a}_{b}" for a, b in q.columns]
    keep = [c for c in q.columns if c.split("_")[-1] in {"count", "25%", "50%", "75%", "mean"}]
    return q[keep].round(1).reset_index()


def league_by_group(universe, audit) -> pd.DataFrame:
    u = universe[universe.eligible].merge(audit[["player_id", "audit_group"]], on="player_id")
    t = pd.crosstab(u["valuation_league_id"], u["audit_group"])
    t["total"] = t.sum(axis=1)
    t["non_uefa_share_%"] = _pct(t.get("non-UEFA", 0) / (t.get("UEFA", 0) + t.get("non-UEFA", 0)))
    t["median_value_eur"] = u.groupby("valuation_league_id")["market_value_in_eur"].median()
    return t.sort_values("total", ascending=False).reset_index()


def value_by_group(universe, audit) -> pd.DataFrame:
    """Raw (unadjusted) target distribution by group. Context only, not a finding."""
    u = universe[universe.eligible].merge(audit[["player_id", "audit_group"]], on="player_id")
    t = u.groupby("audit_group")["market_value_in_eur"].describe(percentiles=[0.25, 0.5, 0.75, 0.9])
    return t.round(0).reset_index()


def tier_cells(universe, audit) -> pd.DataFrame:
    """Players per provisional value quartile x group: are the smallest cells big enough?"""
    u = universe[universe.eligible].merge(audit[["player_id", "audit_group"]], on="player_id")
    u = u[u.audit_group != "UNKNOWN"]
    u["provisional_quartile"] = pd.qcut(u["market_value_in_eur"], 4, labels=["Q1", "Q2", "Q3", "Q4"], duplicates="drop")
    return pd.crosstab(u["provisional_quartile"], u["audit_group"]).reset_index()


def historical_coverage(universe, audit, valuations, drift_ref) -> pd.DataFrame:
    """Valuation history depth, and whether eligible players also appear in the drift snapshot."""
    u = universe[universe.eligible].merge(audit[["player_id", "audit_group"]], on="player_id")
    n_vals = valuations.groupby("player_id").size().rename("n_valuations")
    first = valuations.groupby("player_id")["date"].min().rename("first_valuation")
    u = u.join(n_vals, on="player_id").join(first, on="player_id")
    u["years_of_history"] = (u["valuation_date"] - u["first_valuation"]).dt.days / 365.25
    u["in_drift_reference"] = u["player_id"].isin(drift_ref["player_id"])
    t = u.groupby("audit_group").agg(
        players=("player_id", "size"),
        median_valuations=("n_valuations", "median"),
        median_years_history=("years_of_history", "median"),
        in_drift_reference_pct=("in_drift_reference", lambda s: _pct(s.mean())),
    )
    return t.round(1).reset_index()


def dual_nationality_check(audit, national_teams) -> pd.DataFrame:
    """Where a player has a current national team, does its confederation match ours?

    This is the only evidence in the data about the single-citizenship limitation (R4).
    """
    nt = national_teams[["national_team_id", "confederation"]].rename(columns={"confederation": "nt_confederation"})
    a = audit.dropna(subset=["current_national_team_id"]).merge(
        nt, left_on="current_national_team_id", right_on="national_team_id", how="left"
    )
    a["nt_group"] = a["nt_confederation"].map(lambda c: "UEFA" if c == "UEFA" else ("non-UEFA" if isinstance(c, str) else "UNKNOWN"))
    t = pd.crosstab(a["audit_group"], a["nt_group"], margins=True)
    return t.reset_index()


def birth_vs_citizenship(universe, audit) -> pd.DataFrame:
    """Eligible players born in a different country to their recorded citizenship."""
    u = universe[universe.eligible].merge(audit, on="player_id")
    known = u.dropna(subset=["country_of_birth", "country_of_citizenship"])
    # Compare canonical names so spelling variants (Turkey/Türkiye) do not count as "different".
    canon = load_mapping().set_index("citizenship_value")["canonical_country"]
    birth = known["country_of_birth"].map(canon).fillna(known["country_of_birth"])
    cit = known["country_of_citizenship"].map(canon)
    known = known.assign(differs=birth != cit)
    t = known.groupby("audit_group").agg(players=("player_id", "size"), born_elsewhere_pct=("differs", lambda s: _pct(s.mean())))
    return t.reset_index()


def recent_arrivals(universe, audit) -> pd.DataFrame:
    """Players with no recorded match before the last year: truncated stats window.

    Usually they joined from a league without match data, so their per-90 stats rest on
    fewer matches. If this differs by group, model error may differ for data reasons.
    """
    u = universe[universe.eligible].merge(audit[["player_id", "audit_group"]], on="player_id")
    t = u.groupby("audit_group").agg(
        players=("player_id", "size"),
        recent_arrival_pct=("recent_arrival", lambda s: _pct(s.mean())),
        median_valuation_club_minutes_share=("valuation_club_minutes_share", "median"),
        median_days_since_last_match=("days_since_last_match", "median"),
    )
    return t.round(3).reset_index()


def proxy_strength(universe, audit) -> pd.DataFrame:
    """How well do the ALLOWED features predict UEFA vs non-UEFA? (5-fold CV ROC AUC)

    AUC 0.5 = features carry no group information; 1.0 = group fully recoverable.
    Excluding nationality is not enough if the remaining features encode it, so this
    number is the honest measure of how "blind" the model really is.
    """
    from sklearn.linear_model import LogisticRegression
    from sklearn.model_selection import StratifiedKFold, cross_val_score
    from sklearn.pipeline import Pipeline

    u = universe[universe.eligible].merge(audit[["player_id", "audit_group"]], on="player_id")
    u = u[u.audit_group != "UNKNOWN"]
    y = (u["audit_group"] == "non-UEFA").astype(int)
    cv = StratifiedKFold(5, shuffle=True, random_state=RANDOM_SEED)
    rows = []
    for fs, label in [("full", "Model A features"), ("performance", "Model B features")]:
        clf = Pipeline([("pre", build_preprocessor(fs)), ("lr", LogisticRegression(max_iter=2000))])
        auc = cross_val_score(clf, u[feature_columns(fs)], y, cv=cv, scoring="roc_auc")
        rows.append({"feature_set": label, "classifier": "logistic regression",
                     "cv_auc_mean": round(auc.mean(), 3), "cv_auc_std": round(auc.std(), 3)})
    return pd.DataFrame(rows)


def to_md(df: pd.DataFrame) -> str:
    """Minimal markdown table writer (avoids an extra 'tabulate' dependency)."""
    cols = list(df.columns)
    lines = ["| " + " | ".join(map(str, cols)) + " |", "|" + "---|" * len(cols)]
    for _, r in df.iterrows():
        lines.append("| " + " | ".join("" if pd.isna(v) else (f"{v:,.0f}" if isinstance(v, float) and abs(v) >= 1000 else str(v)) for v in r) + " |")
    return "\n".join(lines)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    universe = pd.read_parquet(PROCESSED_DIR / "player_universe.parquet")
    audit = pd.read_parquet(PROCESSED_DIR / "audit_lookup.parquet")
    drift_ref = pd.read_parquet(PROCESSED_DIR / "drift_reference.parquet")
    players = pd.read_csv(RAW_DIR / "players.csv.gz", usecols=["player_id"])
    valuations = pd.read_csv(RAW_DIR / "player_valuations.csv.gz", usecols=["player_id", "date"], parse_dates=["date"])
    national_teams = pd.read_csv(RAW_DIR / "national_teams.csv.gz")

    tables = {
        "funnel": funnel(universe, audit, players),
        "by_confederation": by_confederation(universe, audit),
        "top_nationalities": top_nationalities(universe, audit),
        "league_by_group": league_by_group(universe, audit),
        "feature_density": feature_density(universe, audit),
        "missingness": missingness(universe, audit),
        "value_by_group": value_by_group(universe, audit),
        "tier_cells": tier_cells(universe, audit),
        "historical_coverage": historical_coverage(universe, audit, valuations, drift_ref),
        "national_team_vs_citizenship": dual_nationality_check(audit, national_teams),
        "birth_vs_citizenship": birth_vs_citizenship(universe, audit),
        "recent_arrivals": recent_arrivals(universe, audit),
        "proxy_strength": proxy_strength(universe, audit),
    }
    md = ["# Coverage audit (generated)", "",
          "Generated by `python -m src.fairness.coverage`. Do not edit by hand; "
          "interpretation lives in docs/reports/COVERAGE_AUDIT.md.", ""]
    for name, df in tables.items():
        df.to_csv(OUT / f"{name}.csv", index=False)
        md += [f"## {name}", "", to_md(df), ""]
    (OUT / "coverage_summary.md").write_text("\n".join(md), encoding="utf-8")
    log.info("Wrote %d tables to %s", len(tables), OUT)


if __name__ == "__main__":
    main()
