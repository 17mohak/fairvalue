"""Raw-data quality checks: keys, relationships, value ranges, known oddities.

Usage:
    python -m src.data.quality      -> reports/data_quality.csv

Each check returns a row: check name, number of offending rows, and whether it
is a hard failure (the pipeline relies on it) or a documented warning.
"""

import pandas as pd

from src.config import REPORTS_DIR, get_logger
from src.data.build_dataset import NATIONAL_TEAM_COMPETITIONS, load_table

log = get_logger(__name__)


def run_checks() -> pd.DataFrame:
    p = load_table("players")
    pv = load_table("player_valuations", parse_dates=["date"])
    a = load_table("appearances", parse_dates=["date"])
    ge = load_table("game_events", usecols=["game_id", "type", "player_id"])
    g = load_table("games", usecols=["game_id"])
    tr = load_table("transfers", parse_dates=["transfer_date"])
    snapshot = pv["date"].max()

    checks = []

    def add(name, n_bad, severity, detail=""):
        checks.append({"check": name, "offending_rows": int(n_bad), "severity": severity, "detail": detail})

    # Keys
    add("players.player_id unique", p.player_id.duplicated().sum(), "fail")
    add("player_valuations (player_id, date) unique", pv.duplicated(["player_id", "date"]).sum(), "fail")
    add("appearances (player_id, game_id) unique", a.duplicated(["player_id", "game_id"]).sum(), "fail")
    # Relationships
    add("player_valuations.player_id in players", (~pv.player_id.isin(p.player_id)).sum(), "fail")
    add("appearances.player_id in players", (~a.player_id.isin(p.player_id)).sum(), "warn",
        "orphan appearances are dropped by the inner join to current valuations")
    add("appearances.game_id in games", (~a.game_id.isin(g.game_id)).sum(), "warn")
    # Ranges
    add("market_value_in_eur > 0", (pv.market_value_in_eur <= 0).sum(), "warn",
        "one 2008 row (player 60096); outside the training window and also filtered by eligibility")
    add("appearances minutes in [0, 130]", (~a.minutes_played.between(0, 130)).sum(), "warn")
    add("transfers dated after data snapshot", (tr.transfer_date > snapshot).sum(), "warn",
        "future-dated rows (planned moves / loan returns); transfers are not used as features")
    # Consistency between appearances and game_events (goals)
    ev_goals = ge[ge.type == "Goals"].groupby(["game_id", "player_id"]).size().rename("ev_goals")
    ap = a[a.goals > 0].set_index(["game_id", "player_id"])["goals"]
    j = ap.to_frame().join(ev_goals, how="left")
    add("appearance goals match game_events goals", (j.goals != j.ev_goals.fillna(0)).sum(), "warn",
        f"of {len(j)} player-games with goals; game_events also records own goals/penalties differently")
    # Known label problems
    add("duplicate country spellings (Turkey/Türkiye, Neukaledonien)",
        p.country_of_citizenship.isin(["Turkey", "Neukaledonien"]).sum(), "warn",
        "resolved via canonical_country in the confederation mapping")
    add("national-team competition appearances (excluded from features)",
        a.competition_id.isin(NATIONAL_TEAM_COMPETITIONS).sum(), "info")
    add("clubs.total_market_value all null", 1 if load_table("clubs").total_market_value.isna().all() else 0, "info",
        "column unusable; not used")
    return pd.DataFrame(checks)


def main() -> None:
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    df = run_checks()
    df.to_csv(REPORTS_DIR / "data_quality.csv", index=False)
    log.info("\n%s", df.to_string(index=False))


if __name__ == "__main__":
    main()
