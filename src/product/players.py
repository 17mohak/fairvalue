"""Player profiles for the web app's /players experience (D-035).

Usage:
    python -m src.product.players      write web/src/data/generated/players.json (git-ignored)

Two sources produce the same profile schema:

* Showcase (committed, built by src.product.export): the eight players the explainability analysis
  already published in reports/explainability/shap_local_representative_players.csv, one per audit
  group x predicted tier. It carries their model inputs, the served Model A estimate and its SHAP
  values. It needs no data, so it runs anywhere the repository is checked out.
* Full (this command, needs the dataset and the cross-validation predictions): every player in the
  modelling population, adding club, valuation history, held-out (out-of-fold) estimates for both
  models and positional-peer percentiles. It reads existing outputs only. Nothing is retrained.

Rules this module keeps:
* Nothing here feeds a model. The audit group is attached for the profile's audit-context panel
  only, from audit_lookup.parquet, exactly as the audit itself does.
* No player images: the dataset's image_url points at copyrighted photos and is never exported.
  Portraits come only from the licensed manifest in web/src/data/portraits.json.
* Traits are existing features, ranked within the player's own position. Passing, progression and
  defensive actions are not in the dataset, so no trait claims to measure them.
"""

import json
import re
import sys
import unicodedata

import numpy as np
import pandas as pd

from src.config import PROCESSED_DIR, RAW_DIR, REPORTS_DIR, ROOT, get_logger

log = get_logger(__name__)

GENERATED = ROOT / "web" / "src" / "data" / "generated" / "players.json"
PRED_DIR = PROCESSED_DIR / "predictions"
SHOWCASE_CSV = REPORTS_DIR / "explainability" / "shap_local_representative_players.csv"
PRIMARY_ALGORITHM = "hgb_tuned"  # reports/models/primary_model.json (D-019)

# The served API's input fields, in contract order (src/api/schemas.py PlayerFeatures).
API_FIELDS = [
    "age", "height_in_cm", "position", "sub_position", "foot", "valuation_league_id", "club_ppg",
    "appearances", "minutes", "start_share", "goals_p90", "assists_p90", "yellow_p90", "red_p90",
    "intl_club_minutes_share", "minutes_last_365", "days_since_last_match", "valuation_club_minutes_share",
]
INT_FIELDS = {"appearances", "days_since_last_match"}

# Traits: existing model features, nothing derived beyond what the feature pipeline computes.
# `outfield_only` traits are not meaningful for goalkeepers and are left out of their radar.
TRAITS = [
    {"key": "goals_p90", "outfield_only": True},
    {"key": "assists_p90", "outfield_only": True},
    {"key": "minutes", "outfield_only": False},
    {"key": "start_share", "outfield_only": False},
    {"key": "minutes_last_365", "outfield_only": False},
    {"key": "intl_club_minutes_share", "outfield_only": False},
]
DECILES = [i / 10 for i in range(11)]

ROLE_CODES = {
    "Goalkeeper": "GK", "Centre-Back": "CB", "Left-Back": "LB", "Right-Back": "RB",
    "Defensive Midfield": "DM", "Central Midfield": "CM", "Attacking Midfield": "AM",
    "Left Midfield": "LM", "Right Midfield": "RM", "Left Winger": "LW", "Right Winger": "RW",
    "Second Striker": "SS", "Centre-Forward": "CF",
}


# ---------------------------------------------------------------------------
# Small helpers shared by both sources
# ---------------------------------------------------------------------------
def _clean(v):
    """JSON-safe scalar: NaN/NaT -> None, numpy -> python."""
    if v is None:
        return None
    if isinstance(v, (float, np.floating)) and not np.isfinite(v):
        return None
    if isinstance(v, np.integer):
        return int(v)
    if isinstance(v, np.floating):
        return float(v)
    return v


def slugify(name: str) -> str:
    s = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def split_name(name: str) -> tuple[str, str]:
    """('Takefusa', 'Kubo'); mononyms such as 'Bernardo' have no first name."""
    parts = name.strip().split()
    return (" ".join(parts[:-1]), parts[-1]) if len(parts) > 1 else ("", name.strip())


def role_code(sub_position: str | None) -> str:
    if not sub_position:
        return ""
    return ROLE_CODES.get(sub_position, "".join(w[0] for w in sub_position.replace("-", " ").split()).upper()[:2])


def api_features(row: dict) -> dict:
    """The player's model inputs as a valid POST /predict body."""
    out = {}
    for f in API_FIELDS:
        v = _clean(row.get(f))
        if f in INT_FIELDS and v is not None:
            v = int(round(float(v)))
        elif isinstance(v, str) or v is None:
            pass
        else:
            v = round(float(v), 6)
        out[f] = v
    return out


def window_stats(row: dict) -> dict:
    """Counts in the two-year feature window. Goals and assists are recovered exactly from the
    per-90 rates (rate = count x 90 / minutes), so no new statistic is introduced."""
    minutes = float(row["minutes"])
    apps = int(round(float(row["appearances"])))

    def count(p90):
        v = _clean(row.get(p90))
        return None if v is None else int(round(float(v) * minutes / 90))

    return {"appearances": apps, "minutes": int(round(minutes)), "goals": count("goals_p90"),
            "assists": count("assists_p90"), "started": int(round(float(row["start_share"]) * apps)),
            "yellow_cards": count("yellow_p90"), "red_cards": count("red_p90")}


def tier_of(value_eur: float | None) -> str | None:
    from src.models.tiers import TIER_BOUNDARIES_EUR, TIER_NAMES
    if value_eur is None:
        return None
    return TIER_NAMES[int(np.searchsorted(TIER_BOUNDARIES_EUR, value_eur, side="right"))]


def base_profile(pid: int, name: str, row: dict, market_value: float, group: str, nationality: str | None = None) -> dict:
    first, last = split_name(name)
    return {
        "id": int(pid),
        "slug": f"{int(pid)}-{slugify(name)}",
        "name": name, "first_name": first, "last_name": last,
        "position": row["position"], "sub_position": row["sub_position"], "role_code": role_code(row["sub_position"]),
        "foot": _clean(row.get("foot")), "height_cm": _clean(row.get("height_in_cm")),
        "age": round(float(row["age"]), 2), "league_id": row["valuation_league_id"],
        "club": None, "valuation_date": None,
        # First-listed citizenship, shown as profile information only (D-037). Never a model input.
        "nationality": nationality,
        "market_value_eur": float(market_value), "market_tier": tier_of(float(market_value)),
        "features": api_features(row),
        "window": window_stats(row),
        "estimates": {"served": {"A": None, "B": None}, "heldout": {"A": None, "B": None}},
        "explanation": None, "traits": None, "history": None,
        # Audit label, shown only in the audit-context panel. Never a model input.
        "audit": {"group": group if group in ("UEFA", "non-UEFA") else None},
    }


# ---------------------------------------------------------------------------
# Traits: percentile within position
# ---------------------------------------------------------------------------
def midrank_percentile(values: pd.Series, groups: pd.Series) -> pd.Series:
    """Percentile of each value among players in the same group, 0-100.

    Mid-rank definition: (number below + half the number tied, counting itself) / n x 100.
    A player at the group median scores 50; ties share one percentile.
    """
    ranks = values.groupby(groups).rank(method="average")
    n = values.groupby(groups).transform("count")
    return (ranks - 0.5) / n * 100


def trait_keys(position: str) -> list[str]:
    return [t["key"] for t in TRAITS if not (t["outfield_only"] and position == "Goalkeeper")]


def trait_percentiles(df: pd.DataFrame) -> pd.DataFrame:
    """One percentile column per trait, ranked within `position` across the whole population."""
    out = pd.DataFrame(index=df.index)
    for t in TRAITS:
        out[t["key"]] = midrank_percentile(df[t["key"]].astype(float), df["position"])
    return out


def peer_summary(df: pd.DataFrame) -> dict:
    """Per position and trait: peer count, deciles and median of the raw value."""
    out = {}
    for pos, g in df.groupby("position"):
        out[pos] = {"n": int(len(g)), "traits": {}}
        for key in trait_keys(pos):
            q = g[key].astype(float).quantile(DECILES)
            out[pos]["traits"][key] = {"deciles": [round(float(v), 4) for v in q], "median": round(float(g[key].median()), 4)}
    return out


# ---------------------------------------------------------------------------
# Source 1: committed showcase from published research output
# ---------------------------------------------------------------------------
def showcase() -> dict:
    """The eight representative players from the explainability report (no data needed)."""
    t = pd.read_csv(SHOWCASE_CSV)
    players = []
    for pid, g in t.groupby("player_id", sort=False):
        row = dict(zip(g.feature, g.feature_value))
        for k, v in row.items():  # the long CSV stores every value as text
            try:
                row[k] = float(v)
            except (TypeError, ValueError):
                row[k] = None if v in ("", "nan") or (isinstance(v, float) and np.isnan(v)) else v
        first = g.iloc[0]
        name = re.sub(r"\s*\([^)]*\)\s*$", "", first.player_label)
        p = base_profile(pid, name, row, first.actual_eur, first.group)
        pred = float(first.predicted_eur)
        p["estimates"]["served"]["A"] = round(pred, 0)
        contributions = [{"feature": r.feature, "value": _clean(row.get(r.feature)), "contribution": round(float(r.shap), 6)}
                         for r in g.sort_values("shap", key=np.abs, ascending=False).itertuples()]
        p["explanation"] = {
            "model": "A", "source": "reports/explainability/shap_local_representative_players.csv",
            # SHAP is additive on the log scale, so the baseline is the prediction minus the contributions.
            "base_log_value": round(float(np.log(pred) - g.shap.sum()), 6),
            "predicted_log_value": round(float(np.log(pred)), 6),
            "contributions": contributions,
        }
        players.append(p)
    return {
        "source": "showcase",
        "generated_by": "python -m src.product.export (from reports/explainability/shap_local_representative_players.csv)",
        "selection": "One player per audit group and predicted tier: the player closest to that cell's median "
                     "Model A prediction (src/fairness/explain_shap.py).",
        "peers": None,
        "players": players,
    }


# ---------------------------------------------------------------------------
# Source 2: full export from the processed dataset (needs data, run locally)
# ---------------------------------------------------------------------------
def _heldout(fs: str) -> pd.Series:
    p = pd.read_parquet(PRED_DIR / f"oof_{fs}_{PRIMARY_ALGORITHM}.parquet")
    return pd.Series(np.exp(p["pred_log"].to_numpy()), index=p["player_id"].to_numpy())


def full(md: pd.DataFrame, universe: pd.DataFrame, names: pd.DataFrame, valuations: pd.DataFrame,
         audit: pd.DataFrame, heldout: dict[str, pd.Series] | None) -> dict:
    """Build every profile. Inputs are passed in so tests can use small synthetic frames."""
    md = md.reset_index(drop=True)
    pct = trait_percentiles(md)
    club = universe.set_index("player_id")["valuation_club_name"]
    name = names.set_index("player_id")["name"]
    group = audit.set_index("player_id")["audit_group"]
    nation = audit.set_index("player_id")["country_of_citizenship"] if "country_of_citizenship" in audit else pd.Series(dtype=object)
    hist = valuations[valuations.player_id.isin(md.player_id)].sort_values(["player_id", "date"])
    hist_by = {pid: g for pid, g in hist.groupby("player_id")}

    players = []
    for i, r in md.iterrows():
        row = r.to_dict()
        pid = int(row["player_id"])
        p = base_profile(pid, str(name.get(pid, f"Player {pid}")), row, row["market_value_in_eur"], str(group.get(pid, "")),
                         _clean(nation.get(pid)))
        p["club"] = _clean(club.get(pid))
        p["valuation_date"] = pd.Timestamp(row["valuation_date"]).date().isoformat()
        if heldout:
            for m, s in heldout.items():
                v = s.get(pid)
                p["estimates"]["heldout"][m] = None if v is None else round(float(v), 0)
        p["traits"] = [{"key": k, "value": _clean(row[k]), "percentile": round(float(pct.at[i, k]), 1)} for k in trait_keys(row["position"])]
        h = hist_by.get(pid)
        if h is not None:
            p["history"] = [{"date": pd.Timestamp(d).date().isoformat(), "value_eur": float(v), "club": _clean(c)}
                            for d, v, c in zip(h.date, h.market_value_in_eur, h.get("current_club_name", [None] * len(h)))]
        players.append(p)

    return {
        "source": "full",
        "generated_by": "python -m src.product.players (processed dataset + cross-validation predictions)",
        "selection": "Every player in the modelling population (D-011).",
        "heldout_algorithm": PRIMARY_ALGORITHM if heldout else None,
        "peers": peer_summary(md),
        "players": players,
    }


def main() -> None:
    needed = [PROCESSED_DIR / "model_dataset.parquet", PROCESSED_DIR / "player_universe.parquet",
              PROCESSED_DIR / "audit_lookup.parquet", RAW_DIR / "players.csv.gz", RAW_DIR / "player_valuations.csv.gz"]
    missing = [p.relative_to(ROOT).as_posix() for p in needed if not p.exists()]
    if missing:
        sys.exit("Missing inputs (run src.data.acquire and src.data.build_dataset first): " + ", ".join(missing))

    md = pd.read_parquet(PROCESSED_DIR / "model_dataset.parquet")
    universe = pd.read_parquet(PROCESSED_DIR / "player_universe.parquet", columns=["player_id", "valuation_club_name"])
    audit = pd.read_parquet(PROCESSED_DIR / "audit_lookup.parquet", columns=["player_id", "audit_group", "country_of_citizenship"])
    names = pd.read_csv(RAW_DIR / "players.csv.gz", usecols=["player_id", "name"])  # image_url deliberately not read
    vals = pd.read_csv(RAW_DIR / "player_valuations.csv.gz", usecols=["player_id", "date", "market_value_in_eur", "current_club_name"],
                       parse_dates=["date"])
    heldout = None
    if all((PRED_DIR / f"oof_{fs}_{PRIMARY_ALGORITHM}.parquet").exists() for fs in ("full", "performance")):
        heldout = {"A": _heldout("full"), "B": _heldout("performance")}
    else:
        log.warning("No cross-validation predictions in %s: profiles will show served estimates only", PRED_DIR)

    out = full(md, universe, names, vals, audit, heldout)
    GENERATED.parent.mkdir(parents=True, exist_ok=True)
    GENERATED.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    log.info("Wrote %d player profiles to %s", len(out["players"]), GENERATED.relative_to(ROOT).as_posix())


if __name__ == "__main__":
    main()
