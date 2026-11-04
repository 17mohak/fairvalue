"""Build the player-level modelling dataset and the separate audit table.

Usage:
    python -m src.data.build_dataset

Outputs (data/processed/, not committed to git):
    player_universe.parquet   every player with a current valuation + eligibility flags
    model_dataset.parquet     one row per eligible player: player_id, target, features
                              (NO nationality / confederation columns)
    audit_lookup.parquet      player_id -> citizenship, confederation, audit group
                              (joined to predictions ONLY after the model has run)
    drift_reference.parquet   earlier valuation snapshot, reserved for drift simulation
    build_metadata.json       dates, row counts and filters used

Time design (docs/DECISIONS.md D-006..D-008):
    snapshot_date  = last valuation date in the data
    ref_date       = snapshot_date - 365 days
    current target = each player's latest valuation in (ref_date, snapshot_date]
    drift snapshot = each player's latest valuation in (ref_date - 365 days, ref_date]
                     -> the two windows never overlap, so earlier snapshots cannot
                        leak into training or cross-validation
    features       = matches in the 730 days up to and including each player's own
                     valuation date, so no match after the valuation is used
"""

import json

import numpy as np
import pandas as pd

from src.config import (
    MAX_VALUATION_AGE_DAYS,
    MIN_MINUTES_FOR_PER90,
    PROCESSED_DIR,
    RAW_DIR,
    STATS_WINDOW_DAYS,
    get_logger,
)
from src.data.nationality import assign_confederation

log = get_logger(__name__)

# National-team competitions: excluded from performance features because only
# certain nationalities can play in them (e.g. AFCON -> African players only),
# which would smuggle nationality into the features (D-010).
NATIONAL_TEAM_COMPETITIONS = {"AFCN", "FIWC"}

# Club competitions played between clubs from different countries.
INTERNATIONAL_CLUB_COMPETITIONS = {"CL", "CLQ", "EL", "ELQ", "UCOL", "ECLQ", "USC", "KLUB"}


# ---------------------------------------------------------------------------
# Loading
# ---------------------------------------------------------------------------
def load_table(name: str, **kwargs) -> pd.DataFrame:
    return pd.read_csv(RAW_DIR / f"{name}.csv.gz", low_memory=False, **kwargs)


def load_all() -> dict:
    """Load the raw tables this module needs, with dates parsed."""
    t = {
        "players": load_table("players", parse_dates=["date_of_birth"]),
        "player_valuations": load_table("player_valuations", parse_dates=["date"]),
        "appearances": load_table("appearances", parse_dates=["date"]),
        "game_events": load_table(
            "game_events", usecols=["game_id", "date", "type", "player_in_id"], parse_dates=["date"]
        ),
        "games": load_table("games", parse_dates=["date"]),
        "competitions": load_table("competitions"),
    }
    return t


# ---------------------------------------------------------------------------
# Dates and valuation snapshots
# ---------------------------------------------------------------------------
def snapshot_dates(valuations: pd.DataFrame) -> tuple[pd.Timestamp, pd.Timestamp]:
    snapshot = valuations["date"].max()
    ref = snapshot - pd.Timedelta(days=MAX_VALUATION_AGE_DAYS)
    return snapshot, ref


def latest_valuation_in_window(valuations: pd.DataFrame, start, end) -> pd.DataFrame:
    """Each player's most recent valuation with start < date <= end (one row per player)."""
    v = valuations[(valuations["date"] > start) & (valuations["date"] <= end)]
    v = v.sort_values(["player_id", "date"]).groupby("player_id", as_index=False).tail(1)
    return v.rename(
        columns={
            "date": "valuation_date",
            "current_club_id": "valuation_club_id",
            "current_club_name": "valuation_club_name",
            "player_club_domestic_competition_id": "valuation_league_id",
        }
    ).reset_index(drop=True)


def covered_leagues(appearances: pd.DataFrame, competitions: pd.DataFrame) -> list[str]:
    """Domestic leagues that actually have player-level match data."""
    leagues = set(competitions.loc[competitions["type"] == "domestic_league", "competition_id"])
    return sorted(set(appearances["competition_id"]) & leagues)


# ---------------------------------------------------------------------------
# Performance features
# ---------------------------------------------------------------------------
def performance_features(appearances: pd.DataFrame, game_events: pd.DataFrame, current: pd.DataFrame) -> pd.DataFrame:
    """Aggregate club-match stats in the window ending at each player's valuation date.

    `current` has one row per player, so merging on player_id cannot multiply rows:
    each appearance gets exactly one valuation date attached.
    """
    a = appearances[~appearances["competition_id"].isin(NATIONAL_TEAM_COMPETITIONS)]
    a = a.merge(current[["player_id", "valuation_date", "valuation_club_id"]], on="player_id",
                how="inner", validate="many_to_one")
    in_window = (a["date"] <= a["valuation_date"]) & (
        a["date"] > a["valuation_date"] - pd.Timedelta(days=STATS_WINDOW_DAYS)
    )
    a = a[in_window].copy()

    # Matches where the player came on as a substitute (from game_events).
    subs = game_events[game_events["type"] == "Substitutions"].dropna(subset=["player_in_id"])
    subs = subs.assign(player_id=subs["player_in_id"].astype("int64"))[["game_id", "player_id"]].drop_duplicates()
    subs["came_on_as_sub"] = 1
    a = a.merge(subs, on=["game_id", "player_id"], how="left", validate="one_to_one")
    a["came_on_as_sub"] = a["came_on_as_sub"].fillna(0)
    # Minutes for the club the player was valued at (loans/transfers mix clubs otherwise),
    # and minutes in the most recent year (older form may be stale).
    a["valuation_club_minutes"] = np.where(a["player_club_id"] == a["valuation_club_id"], a["minutes_played"], 0)
    recent = a["date"] > a["valuation_date"] - pd.Timedelta(days=365)
    a["minutes_last_365"] = np.where(recent, a["minutes_played"], 0)
    a["intl_club_minutes"] = np.where(
        a["competition_id"].isin(INTERNATIONAL_CLUB_COMPETITIONS), a["minutes_played"], 0
    )

    g = a.groupby("player_id").agg(
        appearances=("game_id", "count"),
        minutes=("minutes_played", "sum"),
        goals=("goals", "sum"),
        assists=("assists", "sum"),
        yellow_cards=("yellow_cards", "sum"),
        red_cards=("red_cards", "sum"),
        sub_appearances=("came_on_as_sub", "sum"),
        intl_club_minutes=("intl_club_minutes", "sum"),
        valuation_club_minutes=("valuation_club_minutes", "sum"),
        minutes_last_365=("minutes_last_365", "sum"),
        first_match_date=("date", "min"),
        last_match_date=("date", "max"),
        valuation_date=("valuation_date", "first"),
    )

    # Per-90 rates are only meaningful with enough minutes (D-009); below the
    # threshold they are left missing rather than producing huge/noisy rates.
    enough = g["minutes"] >= MIN_MINUTES_FOR_PER90
    per90 = 90.0 / g["minutes"].where(enough)
    g["goals_p90"] = g["goals"] * per90
    g["assists_p90"] = g["assists"] * per90
    g["goal_contrib_p90"] = (g["goals"] + g["assists"]) * per90
    g["yellow_p90"] = g["yellow_cards"] * per90
    g["red_p90"] = g["red_cards"] * per90
    g["minutes_per_appearance"] = g["minutes"] / g["appearances"]
    g["start_share"] = 1 - g["sub_appearances"] / g["appearances"]
    g["intl_club_minutes_share"] = g["intl_club_minutes"] / g["minutes"].replace(0, np.nan)
    g["valuation_club_minutes_share"] = g["valuation_club_minutes"] / g["minutes"].replace(0, np.nan)
    g["days_since_last_match"] = (g["valuation_date"] - g["last_match_date"]).dt.days
    # Audit-only diagnostic (not a feature): no recorded match before the last year means the
    # player probably arrived from a league without match data, so their window is truncated.
    g["recent_arrival"] = g["first_match_date"] > g["valuation_date"] - pd.Timedelta(days=365)
    return g.drop(columns=["valuation_date"]).reset_index()


def club_points_per_game(games: pd.DataFrame, competitions: pd.DataFrame, current: pd.DataFrame) -> pd.DataFrame:
    """Points per league game of the player's valuation club, 365 days up to the valuation date."""
    leagues = set(competitions.loc[competitions["type"] == "domestic_league", "competition_id"])
    g = games[games["competition_id"].isin(leagues)]
    home = pd.DataFrame({"club_id": g["home_club_id"], "date": g["date"],
                         "gf": g["home_club_goals"], "ga": g["away_club_goals"]})
    away = pd.DataFrame({"club_id": g["away_club_id"], "date": g["date"],
                         "gf": g["away_club_goals"], "ga": g["home_club_goals"]})
    cg = pd.concat([home, away], ignore_index=True)
    cg["points"] = np.select([cg["gf"] > cg["ga"], cg["gf"] == cg["ga"]], [3, 1], 0)

    p = current[["player_id", "valuation_club_id", "valuation_date"]]
    m = p.merge(cg, left_on="valuation_club_id", right_on="club_id", how="inner")
    m = m[(m["date"] <= m["valuation_date"]) & (m["date"] > m["valuation_date"] - pd.Timedelta(days=365))]
    out = m.groupby("player_id").agg(club_ppg=("points", "mean"), club_league_games=("points", "size"))
    return out.reset_index()


# ---------------------------------------------------------------------------
# Assembly
# ---------------------------------------------------------------------------
# Columns from `players` allowed into the feature table. Everything else
# (citizenship, birthplace, caps, agent, contract date, highest value) is excluded:
# see docs/FEATURES.md for the reason for each.
PROFILE_COLUMNS = ["player_id", "position", "sub_position", "foot", "height_in_cm", "date_of_birth"]


def build_universe(t: dict) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, dict]:
    """Return (universe, audit_lookup, drift_reference, metadata)."""
    pv, players = t["player_valuations"], t["players"]
    snapshot, ref = snapshot_dates(pv)
    current = latest_valuation_in_window(pv, ref, snapshot)
    drift_ref = latest_valuation_in_window(pv, ref - pd.Timedelta(days=MAX_VALUATION_AGE_DAYS), ref)
    leagues = covered_leagues(t["appearances"], t["competitions"])

    perf = performance_features(t["appearances"], t["game_events"], current)
    ppg = club_points_per_game(t["games"], t["competitions"], current)

    u = current.merge(players[PROFILE_COLUMNS], on="player_id", how="left", validate="one_to_one")
    u = u.merge(perf, on="player_id", how="left", validate="one_to_one")
    u = u.merge(ppg, on="player_id", how="left", validate="one_to_one")
    u["age"] = (u["valuation_date"] - u["date_of_birth"]).dt.days / 365.25
    # 13 raw heights are impossible (e.g. 19 cm): treat as missing, the pipeline imputes them.
    u["height_in_cm"] = u["height_in_cm"].where(u["height_in_cm"].between(150, 215))
    u = u.drop(columns=["date_of_birth"])
    u["minutes"] = u["minutes"].fillna(0)
    u["appearances"] = u["appearances"].fillna(0)

    # Eligibility flags (kept as columns so the coverage audit can report a funnel).
    u["in_covered_league"] = u["valuation_league_id"].isin(leagues)
    u["has_min_minutes"] = u["minutes"] >= MIN_MINUTES_FOR_PER90
    u["has_age"] = u["age"].between(15, 45)
    u["has_positive_value"] = u["market_value_in_eur"] > 0  # needed for a log-scale target
    u["eligible"] = u["in_covered_league"] & u["has_min_minutes"] & u["has_age"] & u["has_positive_value"]

    audit = players[["player_id", "country_of_citizenship", "country_of_birth", "current_national_team_id"]].copy()
    audit = audit.join(assign_confederation(audit["country_of_citizenship"]))

    meta = {
        "snapshot_date": str(snapshot.date()),
        "ref_date": str(ref.date()),
        "current_window": f"({ref.date()}, {snapshot.date()}]",
        "drift_reference_window": f"({(ref - pd.Timedelta(days=MAX_VALUATION_AGE_DAYS)).date()}, {ref.date()}]",
        "stats_window_days": STATS_WINDOW_DAYS,
        "min_minutes": MIN_MINUTES_FOR_PER90,
        "covered_leagues": leagues,
        "excluded_competitions": sorted(NATIONAL_TEAM_COMPETITIONS),
        "n_players_total": int(len(players)),
        "n_current_valuations": int(len(current)),
        "n_eligible": int(u["eligible"].sum()),
        "n_drift_reference": int(len(drift_ref)),
    }
    return u, audit, drift_ref, meta


TARGET = "market_value_in_eur"
ID_COLUMNS = ["player_id", "valuation_date"]


def model_dataset(universe: pd.DataFrame) -> pd.DataFrame:
    """Eligible players only, with the target and candidate feature columns."""
    from src.features.preprocess import ALL_FEATURES

    d = universe[universe["eligible"]]
    return d[ID_COLUMNS + [TARGET] + ALL_FEATURES].reset_index(drop=True)


def main() -> None:
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    log.info("Loading raw tables")
    t = load_all()
    universe, audit, drift_ref, meta = build_universe(t)
    data = model_dataset(universe)

    universe.to_parquet(PROCESSED_DIR / "player_universe.parquet", index=False)
    data.to_parquet(PROCESSED_DIR / "model_dataset.parquet", index=False)
    audit.to_parquet(PROCESSED_DIR / "audit_lookup.parquet", index=False)
    drift_ref.to_parquet(PROCESSED_DIR / "drift_reference.parquet", index=False)
    meta["n_model_rows"] = int(len(data))
    (PROCESSED_DIR / "build_metadata.json").write_text(json.dumps(meta, indent=2))
    log.info("Build complete: %s", json.dumps(meta))


if __name__ == "__main__":
    main()
