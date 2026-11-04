"""Join, aggregation and time-window logic, tested on small hand-made tables."""

import numpy as np
import pandas as pd

from src.data.build_dataset import (
    club_points_per_game,
    latest_valuation_in_window,
    performance_features,
    snapshot_dates,
)

D = pd.Timestamp


def valuations():
    return pd.DataFrame({
        "player_id": [1, 1, 1, 2, 2],
        "date": [D("2024-01-01"), D("2025-01-01"), D("2026-01-01"), D("2024-09-01"), D("2025-03-01")],
        "market_value_in_eur": [1e6, 2e6, 3e6, 5e5, 6e5],
        "current_club_name": ["A"] * 5,
        "current_club_id": [10] * 5,
        "player_club_domestic_competition_id": ["GB1"] * 5,
    })


def test_latest_valuation_picks_most_recent_in_window():
    v = latest_valuation_in_window(valuations(), D("2025-06-01"), D("2026-06-01"))
    assert v["player_id"].tolist() == [1]          # player 2 has nothing recent
    assert v.loc[0, "market_value_in_eur"] == 3e6
    assert v["player_id"].is_unique


def test_current_and_drift_windows_do_not_overlap():
    pv = valuations()
    snapshot, ref = snapshot_dates(pv)
    current = latest_valuation_in_window(pv, ref, snapshot)
    drift = latest_valuation_in_window(pv, ref - pd.Timedelta(days=365), ref)
    assert current["valuation_date"].min() > ref
    assert drift["valuation_date"].max() <= ref


def appearances():
    rows = [
        # player 1, valued 2026-01-01
        (100, 1, D("2025-12-20"), "GB1", 90, 1, 0),   # in window
        (101, 1, D("2025-11-01"), "CL", 90, 0, 1),    # in window, international club comp
        (102, 1, D("2026-02-01"), "GB1", 90, 3, 0),   # AFTER valuation -> excluded
        (103, 1, D("2023-06-01"), "GB1", 90, 2, 0),   # older than 730 days -> excluded
        (104, 1, D("2025-10-01"), "FIWC", 90, 2, 0),  # national team -> excluded
        (105, 1, D("2025-09-01"), "GB1", 300, 0, 0),  # padding to pass 450 minutes
        # player 2, valued 2026-01-01, too few minutes for per-90
        (100, 2, D("2025-12-20"), "GB1", 30, 1, 0),
    ]
    a = pd.DataFrame(rows, columns=["game_id", "player_id", "date", "competition_id", "minutes_played", "goals", "assists"])
    a["yellow_cards"] = 0
    a["red_cards"] = 0
    a["player_club_id"] = 10
    a.loc[a.game_id == 105, "player_club_id"] = 99   # a match for a previous club
    return a


def current():
    return pd.DataFrame({"player_id": [1, 2], "valuation_date": [D("2026-01-01"), D("2026-01-01")],
                         "valuation_club_id": [10, 10]})


def events():
    # player 2 came on as a substitute in game 100
    return pd.DataFrame({"game_id": [100], "date": [D("2025-12-20")], "type": ["Substitutions"], "player_in_id": [2.0]})


def test_performance_window_and_exclusions():
    f = performance_features(appearances(), events(), current()).set_index("player_id")
    p1 = f.loc[1]
    assert p1["appearances"] == 3            # games 100, 101, 105 only
    assert p1["minutes"] == 480
    assert p1["goals"] == 1                  # post-valuation, old and World Cup goals ignored
    assert p1["assists"] == 1
    assert p1["intl_club_minutes_share"] == 90 / 480
    np.testing.assert_allclose(p1["goals_p90"], 1 * 90 / 480)


def test_per90_missing_below_minutes_threshold():
    f = performance_features(appearances(), events(), current()).set_index("player_id")
    assert np.isnan(f.loc[2, "goals_p90"])
    assert f.loc[2, "start_share"] == 0.0    # their only game was as a substitute


def test_one_row_per_player():
    f = performance_features(appearances(), events(), current())
    assert f["player_id"].is_unique


def test_new_context_features():
    p1 = performance_features(appearances(), events(), current()).set_index("player_id").loc[1]
    assert p1["valuation_club_minutes_share"] == 180 / 480   # game 105 was for club 99
    assert p1["days_since_last_match"] == 12                 # last match 2025-12-20
    assert p1["minutes_last_365"] == 480


def test_window_edges():
    """A match exactly 730 days before valuation is OUT; one on the valuation date is IN."""
    val = D("2026-01-01")
    a = pd.DataFrame({
        "game_id": [1, 2, 3], "player_id": [1, 1, 1],
        "date": [val - pd.Timedelta(days=730), val - pd.Timedelta(days=729), val],
        "competition_id": ["GB1"] * 3, "minutes_played": [90] * 3,
        "goals": [5, 0, 1], "assists": [0, 0, 0], "yellow_cards": [0] * 3,
        "red_cards": [0] * 3, "player_club_id": [10] * 3,
    })
    cur = pd.DataFrame({"player_id": [1], "valuation_date": [val], "valuation_club_id": [10]})
    no_events = pd.DataFrame(columns=["game_id", "date", "type", "player_in_id"])
    f = performance_features(a, no_events, cur).set_index("player_id").loc[1]
    assert f["appearances"] == 2 and f["goals"] == 1


def test_club_ppg_uses_only_pre_valuation_league_games():
    games = pd.DataFrame({
        "game_id": [1, 2, 3, 4],
        "competition_id": ["GB1", "GB1", "GB1", "FAC"],
        "date": [D("2025-10-01"), D("2025-11-01"), D("2026-02-01"), D("2025-12-01")],
        "home_club_id": [10, 20, 10, 10], "away_club_id": [20, 10, 20, 30],
        "home_club_goals": [2, 1, 0, 5], "away_club_goals": [0, 1, 3, 0],
    })
    comps = pd.DataFrame({"competition_id": ["GB1", "FAC"], "type": ["domestic_league", "domestic_cup"]})
    # Two players at club 10 must each get their own single row.
    cur = pd.DataFrame({"player_id": [1, 2], "valuation_club_id": [10, 10],
                        "valuation_date": [D("2026-01-01"), D("2026-01-01")]})
    out = club_points_per_game(games, comps, cur).set_index("player_id")
    assert len(out) == 2
    # Game 1 win (3) + game 2 draw (1); game 3 is after valuation, game 4 is a cup game.
    assert out.loc[1, "club_ppg"] == 2.0 and out.loc[1, "club_league_games"] == 2
