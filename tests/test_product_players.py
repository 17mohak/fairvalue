"""Player profiles (src/product/players.py): the committed showcase and the full export's logic.

The full export needs the dataset, so its logic is tested here on small synthetic frames.
"""

import json

import numpy as np
import pandas as pd
import pytest

from src.api.schemas import PlayerFeatures
from src.config import REPORTS_DIR
from src.product import players as P


# ---------------------------------------------------------------- showcase (real, committed)
def test_showcase_is_the_published_explainability_selection():
    s = P.showcase()
    published = pd.read_csv(REPORTS_DIR / "explainability" / "shap_local_representative_players.csv")
    assert {p["id"] for p in s["players"]} == set(published.player_id)
    assert len(s["players"]) == 8
    assert s["source"] == "showcase" and s["peers"] is None


def test_showcase_inputs_are_valid_api_requests_without_demographics():
    for p in P.showcase()["players"]:
        PlayerFeatures(**p["features"])  # raises if the contract would reject it
        assert not any(k in json.dumps(p["features"]) for k in ("nation", "citizen", "confed", "birth"))


def test_showcase_explanation_adds_up_to_the_served_prediction():
    for p in P.showcase()["players"]:
        e = p["explanation"]
        total = e["base_log_value"] + sum(c["contribution"] for c in e["contributions"])
        assert total == pytest.approx(np.log(p["estimates"]["served"]["A"]), abs=1e-4)


def test_showcase_never_claims_numbers_it_does_not_have():
    for p in P.showcase()["players"]:
        assert p["estimates"]["heldout"] == {"A": None, "B": None}  # no OOF predictions are committed
        assert p["traits"] is None and p["history"] is None and p["club"] is None
        assert "image" not in json.dumps(p)


# ---------------------------------------------------------------- helpers
def test_midrank_percentile_is_within_group_and_handles_ties():
    v = pd.Series([1.0, 2.0, 3.0, 10.0, 10.0, 0.0])
    g = pd.Series(["A", "A", "A", "B", "B", "B"])
    pct = P.midrank_percentile(v, g).tolist()
    assert pct[:3] == [pytest.approx(100 / 6), 50.0, pytest.approx(500 / 6)]  # 1 of 3, 2 of 3, 3 of 3
    assert pct[3] == pct[4] == pytest.approx(200 / 3)  # tied: average rank 2.5 of 3
    assert pct[5] == pytest.approx(100 / 6)


def test_window_counts_are_recovered_exactly_from_rates():
    row = {"minutes": 2700, "appearances": 30, "goals_p90": 10 * 90 / 2700, "assists_p90": 4 * 90 / 2700,
           "start_share": 0.9, "yellow_p90": 3 * 90 / 2700, "red_p90": 0.0}
    assert P.window_stats(row) == {"appearances": 30, "minutes": 2700, "goals": 10, "assists": 4, "started": 27,
                                   "yellow_cards": 3, "red_cards": 0}


def test_names_slugs_and_role_codes():
    assert P.split_name("Takefusa Kubo") == ("Takefusa", "Kubo")
    assert P.split_name("Bernardo") == ("", "Bernardo")
    assert P.slugify("Khéphren Thuram") == "khephren-thuram"
    assert P.role_code("Centre-Forward") == "CF" and P.role_code("Goalkeeper") == "GK"


def test_goalkeepers_have_no_scoring_traits():
    assert "goals_p90" not in P.trait_keys("Goalkeeper") and "assists_p90" not in P.trait_keys("Goalkeeper")
    assert P.trait_keys("Attack")[:2] == ["goals_p90", "assists_p90"]


# ---------------------------------------------------------------- full export on synthetic frames
def _synthetic():
    rng = np.random.default_rng(0)
    n = 40
    pos = np.array(["Attack", "Defender", "Midfield", "Goalkeeper"] * 10)
    sub = {"Attack": "Centre-Forward", "Defender": "Centre-Back", "Midfield": "Central Midfield", "Goalkeeper": "Goalkeeper"}
    md = pd.DataFrame({
        "player_id": np.arange(1, n + 1), "valuation_date": pd.Timestamp("2026-03-01"),
        "market_value_in_eur": rng.integers(1, 80, n) * 500_000.0,
        "age": rng.uniform(18, 34, n), "height_in_cm": 180.0, "position": pos, "sub_position": [sub[p] for p in pos],
        "foot": "right", "valuation_league_id": "ES1", "club_ppg": 1.5, "appearances": 60, "minutes": rng.uniform(1600, 6000, n),
        "start_share": rng.uniform(0, 1, n), "goals_p90": rng.uniform(0, 0.8, n), "assists_p90": rng.uniform(0, 0.4, n),
        "yellow_p90": 0.1, "red_p90": 0.0, "intl_club_minutes_share": rng.uniform(0, 0.3, n), "minutes_last_365": 1500.0,
        "days_since_last_match": 5, "valuation_club_minutes_share": 1.0, "goal_contrib_p90": 0.5, "minutes_per_appearance": 70.0,
    })
    universe = pd.DataFrame({"player_id": md.player_id, "valuation_club_name": "Synthetic FC"})
    names = pd.DataFrame({"player_id": md.player_id, "name": [f"Test Player{i}" for i in md.player_id]})
    vals = pd.DataFrame({"player_id": np.repeat(md.player_id, 2), "date": [pd.Timestamp("2025-01-01"), pd.Timestamp("2026-03-01")] * n,
                         "market_value_in_eur": 1_000_000.0, "current_club_name": "Synthetic FC"})
    audit = pd.DataFrame({"player_id": md.player_id, "audit_group": ["UEFA", "non-UEFA"] * 20})
    heldout = {m: pd.Series(md.market_value_in_eur.to_numpy() * f, index=md.player_id) for m, f in (("A", 0.9), ("B", 0.7))}
    return md, universe, names, vals, audit, heldout


def test_full_export_profiles_traits_and_peers():
    md, *rest = _synthetic()
    out = P.full(md, *rest)
    assert out["source"] == "full" and len(out["players"]) == len(md)
    p = out["players"][0]
    assert p["club"] == "Synthetic FC" and p["valuation_date"] == "2026-03-01"
    assert p["estimates"]["heldout"]["A"] == pytest.approx(md.market_value_in_eur[0] * 0.9)
    assert [h["date"] for h in p["history"]] == ["2025-01-01", "2026-03-01"]
    # Percentiles: computed within position, so each position's goals_p90 percentiles span the same grid.
    att = [q for q in out["players"] if q["position"] == "Attack"]
    pcts = sorted(t["percentile"] for q in att for t in q["traits"] if t["key"] == "goals_p90")
    assert pcts == [round((k + 0.5) / 10 * 100, 1) for k in range(10)]
    gk = next(q for q in out["players"] if q["position"] == "Goalkeeper")
    assert [t["key"] for t in gk["traits"]] == P.trait_keys("Goalkeeper")
    assert out["peers"]["Attack"]["n"] == 10 and len(out["peers"]["Attack"]["traits"]["goals_p90"]["deciles"]) == 11
    assert "goals_p90" not in out["peers"]["Goalkeeper"]["traits"]


def test_full_export_without_cv_predictions_leaves_heldout_empty():
    md, universe, names, vals, audit, _ = _synthetic()
    out = P.full(md, universe, names, vals, audit, None)
    assert all(p["estimates"]["heldout"] == {"A": None, "B": None} for p in out["players"])


def test_full_export_feature_payload_never_contains_the_audit_group():
    md, *rest = _synthetic()
    for p in P.full(md, *rest)["players"]:
        assert set(p["features"]) == set(P.API_FIELDS)
        PlayerFeatures(**p["features"])
