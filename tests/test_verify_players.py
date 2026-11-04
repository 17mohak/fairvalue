"""The export verifier must pass a correct export and fail on each kind of misalignment."""

import copy

import numpy as np
import pandas as pd

from src.product import players as P
from src.product import verify_players as V
from tests.test_product_players import _synthetic


def _build():
    md, universe, names, vals, audit, held = _synthetic()
    # The target valuation must appear in each player's history, as it does in the real data.
    vals = pd.concat([vals[vals.date < "2026-01-01"],
                      md[["player_id", "valuation_date", "market_value_in_eur"]].rename(columns={"valuation_date": "date"}).assign(current_club_name="Synthetic FC")])
    export = P.full(md, universe, names, vals, audit, held)
    oof = {m: pd.DataFrame({"player_id": md.player_id, "y_log": np.log(md.market_value_in_eur), "pred_log": np.log(held[m].to_numpy())})
           for m in ("A", "B")}
    return md, export, oof


def _all_ok(checks):
    return all(c.ok for c in checks), [c for c in checks if not c.ok]


def test_correct_export_passes_every_data_check():
    md, export, oof = _build()
    checks = (V.check_population(export, md, len(md)) + V.check_contract(export) + V.check_heldout(export, md, oof)
              + V.check_traits(export, md) + V.check_peers(export, md, md.position.value_counts().to_dict())
              + V.check_history(export, "2026-06-12"))
    ok, failed = _all_ok(checks)
    assert ok, failed


def test_metrics_and_gap_are_recomputed_from_the_export():
    md, export, _ = _build()
    # Synthetic held-out A = market x 0.9, so every residual is -log(0.9) and the gap is zero.
    m = V.heldout_metrics(export, "A")
    assert abs(m["log_mae"] - (-np.log(0.9))) < 1e-6
    assert abs(V.raw_gap(export, "A")) < 1e-6
    assert all(c.ok for c in V.check_gap(export, {"A": 0.0}))
    assert not any(c.ok for c in V.check_gap(export, {"A": 0.0933}))


def test_estimates_attached_to_the_wrong_players_fail():
    md, export, oof = _build()
    bad = copy.deepcopy(export)
    vals = [p["estimates"]["heldout"]["A"] for p in bad["players"]]
    for p, v in zip(bad["players"], vals[1:] + vals[:1]):  # shift by one player
        p["estimates"]["heldout"]["A"] = v
    assert not all(c.ok for c in V.check_heldout(bad, md, oof))
    shuffled = {**oof, "A": oof["A"].assign(y_log=oof["A"].y_log.sample(frac=1, random_state=1).to_numpy())}
    assert not V.check_heldout(export, md, shuffled)[0].ok


def test_wrong_percentiles_or_history_fail():
    md, export, _ = _build()
    bad = copy.deepcopy(export)
    bad["players"][0]["traits"][0]["percentile"] += 5
    assert not all(c.ok for c in V.check_traits(bad, md))
    bad = copy.deepcopy(export)
    bad["players"][0]["history"] = [h for h in bad["players"][0]["history"] if h["date"] != bad["players"][0]["valuation_date"]]
    assert not all(c.ok for c in V.check_history(bad, "2026-06-12"))
    bad = copy.deepcopy(export)
    bad["players"][0]["market_value_eur"] *= 2
    assert not all(c.ok for c in V.check_population(bad, md, len(md)))
