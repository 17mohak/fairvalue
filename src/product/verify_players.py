"""Verify the full player export against its sources and the published research results.

Usage (after python -m src.product.players):
    python -m src.product.verify_players                        data checks only
    python -m src.product.verify_players --api http://127.0.0.1:8000   also check the served API

Each check prints PASS or FAIL with the numbers it compared; the exit code is 1 if any fails.
The checks are built so that a misaligned join (estimates, percentiles or history attached to the
wrong player) would fail loudly, and so that the export reproduces figures already published in
reports/ and models/model_registry.json. Nothing is written to disk.
"""

import argparse
import json
import sys
from dataclasses import dataclass

import numpy as np
import pandas as pd

from src.config import PROCESSED_DIR, REPORTS_DIR, ROOT
from src.product import players as P

TOL_METRIC = 5e-4  # registry and report values are stored to 4 decimals


@dataclass
class Check:
    name: str
    ok: bool
    detail: str


def _frame(export: dict) -> pd.DataFrame:
    rows = []
    for p in export["players"]:
        rows.append({"player_id": p["id"], "position": p["position"], "market": p["market_value_eur"],
                     "heldout_A": p["estimates"]["heldout"]["A"], "heldout_B": p["estimates"]["heldout"]["B"],
                     "group": p["audit"]["group"], "valuation_date": p["valuation_date"]})
    return pd.DataFrame(rows)


# ---------------------------------------------------------------- population and contract
def check_population(export: dict, md: pd.DataFrame, expected_n: int | None) -> list[Check]:
    e = _frame(export)
    ids_ok = e.player_id.is_unique and set(e.player_id) == set(md.player_id)
    m = e.merge(md[["player_id", "market_value_in_eur"]], on="player_id", how="left")
    value_ok = bool(np.allclose(m.market, m.market_value_in_eur, rtol=0, atol=0.5))
    out = [
        Check("one profile per modelling-population player", ids_ok, f"{len(e)} profiles, {e.player_id.nunique()} unique ids, {len(md)} players in model_dataset"),
        Check("observed market value equals the model target", value_ok, f"max abs difference €{(m.market - m.market_value_in_eur).abs().max():,.2f}"),
    ]
    if expected_n is not None:
        out.append(Check("population size matches the registry", len(e) == expected_n, f"{len(e)} vs n_training_rows {expected_n}"))
    return out


def check_contract(export: dict) -> list[Check]:
    from src.api.schemas import PlayerFeatures
    bad, leaks = [], []
    for p in export["players"]:
        try:
            PlayerFeatures(**p["features"])
        except Exception as exc:  # noqa: BLE001 - report every rejection
            bad.append(f"{p['id']}: {str(exc).splitlines()[0]}")
        text = json.dumps(p).lower()
        if any(k in text for k in ("image_url", "citizenship", "confederation", "country_of_birth", "national_team")):
            leaks.append(str(p["id"]))
    return [
        Check("every profile is a valid /predict request", not bad, f"{len(bad)} rejected" + (f", first: {bad[0]}" if bad else "")),
        Check("no image URLs or demographic fields in profiles", not leaks, f"{len(leaks)} profiles affected"),
    ]


# ---------------------------------------------------------------- held-out estimates
def check_heldout(export: dict, md: pd.DataFrame, oof: dict[str, pd.DataFrame]) -> list[Check]:
    e = _frame(export)
    out = []
    for m, o in oof.items():
        j = o.merge(md[["player_id", "market_value_in_eur"]], on="player_id", how="inner")
        aligned = len(j) == len(md) and bool(np.allclose(j.y_log, np.log(j.market_value_in_eur), atol=1e-9))
        out.append(Check(f"Model {m} CV predictions belong to the right players", aligned,
                         f"{len(j)} joined rows; target in predictions file equals log(market value): {aligned}"))
        k = e.merge(o[["player_id", "pred_log"]], on="player_id", how="left")
        diff = (k[f"heldout_{m}"] - np.exp(k.pred_log)).abs()
        out.append(Check(f"exported Model {m} held-out estimate equals exp(prediction)", bool(diff.max() <= 0.5 + 1e-6),
                         f"max difference €{diff.max():,.2f} (estimates are rounded to whole euros)"))
    return out


def heldout_metrics(export: dict, m: str) -> dict:
    e = _frame(export).dropna(subset=[f"heldout_{m}"])
    y, p = np.log(e.market.to_numpy()), np.log(e[f"heldout_{m}"].to_numpy())
    res = y - p
    return {"log_rmse": float(np.sqrt(np.mean(res**2))), "log_mae": float(np.mean(np.abs(res))),
            "log_r2": float(1 - np.sum(res**2) / np.sum((y - y.mean()) ** 2))}


def check_heldout_metrics(export: dict, registry: dict) -> list[Check]:
    out = []
    for m in ("A", "B"):
        want = registry["models"][f"regressor_{m}"]["cv_heldout_metrics"]
        got = heldout_metrics(export, m)
        ok = all(abs(got[k] - want[k]) <= TOL_METRIC for k in ("log_rmse", "log_mae", "log_r2"))
        out.append(Check(f"Model {m} held-out accuracy reproduces the registry", ok,
                         ", ".join(f"{k} {got[k]:.4f} vs {want[k]:.4f}" for k in ("log_rmse", "log_mae", "log_r2"))))
    return out


def raw_gap(export: dict, m: str) -> float:
    e = _frame(export).dropna(subset=[f"heldout_{m}"])
    e = e[e.group.isin(["UEFA", "non-UEFA"])]
    r = np.log(e.market) - np.log(e[f"heldout_{m}"])
    return float(r[e.group == "non-UEFA"].mean() - r[e.group == "UEFA"].mean())


def check_gap(export: dict, published: dict[str, float]) -> list[Check]:
    out = []
    for m, want in published.items():
        got = raw_gap(export, m)
        out.append(Check(f"Model {m} raw signed gap reproduces the audit", abs(got - want) <= TOL_METRIC,
                         f"{got:+.4f} vs published {want:+.4f} (reports/fairness/regression_log_scale.csv)"))
    return out


# ---------------------------------------------------------------- traits and peers
def check_traits(export: dict, md: pd.DataFrame) -> list[Check]:
    """Recompute every percentile by counting, independently of the export's pandas ranking."""
    by_id = md.set_index("player_id")
    worst, value_mismatch, wrong_axes = 0.0, 0, 0
    sorted_by_pos = {pos: {k: np.sort(g[k].astype(float).to_numpy()) for k in P.trait_keys(pos)} for pos, g in md.groupby("position")}
    for p in export["players"]:
        pos = p["position"]
        if [t["key"] for t in p["traits"]] != P.trait_keys(pos):
            wrong_axes += 1
        for t in p["traits"]:
            v = float(by_id.at[p["id"], t["key"]])
            if t["value"] is None or abs(t["value"] - v) > 1e-9:
                value_mismatch += 1
            s = sorted_by_pos[pos][t["key"]]
            below = np.searchsorted(s, v, side="left")
            equal = np.searchsorted(s, v, side="right") - below
            pct = (below + 0.5 * equal) / len(s) * 100
            worst = max(worst, abs(pct - t["percentile"]))
    return [
        Check("trait raw values equal the model features", value_mismatch == 0, f"{value_mismatch} mismatches"),
        Check("percentiles recomputed by counting within position agree", worst <= 0.051, f"max difference {worst:.3f} points (export rounds to 0.1)"),
        Check("goalkeepers have no scoring axes; outfield players have six", wrong_axes == 0, f"{wrong_axes} profiles with the wrong axes"),
    ]


def check_peers(export: dict, md: pd.DataFrame, published_n: dict[str, int] | None) -> list[Check]:
    peers = export["peers"]
    counts = md.position.value_counts().to_dict()
    n_ok = all(peers[pos]["n"] == counts.get(pos) for pos in peers) and set(peers) == set(counts)
    out = [Check("peer group sizes equal the population by position", n_ok, ", ".join(f"{k} {v['n']}" for k, v in peers.items()))]
    if published_n:
        pub_ok = all(peers.get(pos, {}).get("n") == n for pos, n in published_n.items())
        out.append(Check("peer group sizes match reports/models/errors_by_position_full.csv", pub_ok,
                         ", ".join(f"{k} {peers.get(k, {}).get('n')} vs {n}" for k, n in published_n.items())))
    mono = all(np.all(np.diff(t["deciles"]) >= -1e-12) and abs(t["median"] - t["deciles"][5]) < 1e-3
               for v in peers.values() for t in v["traits"].values())
    out.append(Check("peer deciles are ordered and the median is the fifth decile", mono, ""))
    return out


# ---------------------------------------------------------------- valuation history
def check_history(export: dict, snapshot: str | None) -> list[Check]:
    missing, unsorted, no_target, future = 0, 0, 0, 0
    for p in export["players"]:
        h = p["history"] or []
        if not h:
            missing += 1
            continue
        dates = [x["date"] for x in h]
        unsorted += dates != sorted(dates)
        hit = [x for x in h if x["date"] == p["valuation_date"]]
        no_target += not any(abs(x["value_eur"] - p["market_value_eur"]) < 0.5 for x in hit)
        future += bool(snapshot) and dates[-1] > snapshot
    return [
        Check("every player has a valuation history", missing == 0, f"{missing} without history"),
        Check("history is in date order", unsorted == 0, f"{unsorted} out of order"),
        Check("history contains the target valuation (same date and value)", no_target == 0, f"{no_target} players where it does not"),
        Check("no valuation after the snapshot date", future == 0, f"{future} players" + (f" (snapshot {snapshot})" if snapshot else "")),
    ]


def check_showcase(export: dict, showcase: dict) -> list[Check]:
    full = {p["id"]: p for p in export["players"]}
    mismatched = []
    for s in showcase["players"]:
        f = full.get(s["id"])
        if f is None:
            mismatched.append(f"{s['name']} missing")
            continue
        for k, v in s["features"].items():
            w = f["features"][k]
            if (isinstance(v, float) and (w is None or abs(v - w) > 1e-5)) or (not isinstance(v, float) and v != w):
                mismatched.append(f"{s['name']}.{k}: {v} vs {w}")
        if abs(s["market_value_eur"] - f["market_value_eur"]) > 0.5 or s["audit"]["group"] != f["audit"]["group"]:
            mismatched.append(f"{s['name']}: market value or group differs")
    return [Check("the 8 published showcase players match their full-export profiles", not mismatched,
                  f"{len(mismatched)} differences" + (f", first: {mismatched[0]}" if mismatched else ""))]


# ---------------------------------------------------------------- served API (optional)
def check_api(base: str, export: dict, showcase: dict, registry: dict, sample: int = 20) -> list[Check]:
    import httpx

    out = []
    h = httpx.get(f"{base}/health", timeout=10).json()
    want = {k: v["version"] for k, v in registry["models"].items()}
    ok = h.get("status") == "ok" and all(h.get("model_versions", {}).get(k) == v for k, v in want.items()) \
        and h.get("dataset_sha256_16") == registry["dataset_sha256_16"]
    out.append(Check("API serves the registered models", ok, f"status {h.get('status')}, dataset {h.get('dataset_sha256_16')}"))
    worst = 0.0
    for s in showcase["players"]:
        r = httpx.post(f"{base}/predict", json={"player": s["features"], "model": "A"}, timeout=10).json()
        worst = max(worst, abs(r["predicted_value_eur"] / s["estimates"]["served"]["A"] - 1))
    out.append(Check("served Model A reproduces the published showcase estimates", worst < 1e-5, f"max relative difference {worst:.2e}"))
    rng = np.random.default_rng(0)
    picks = rng.choice(len(export["players"]), size=min(sample, len(export["players"])), replace=False)
    fails = []
    for i in picks:
        p = export["players"][int(i)]
        for m in ("A", "B"):
            res = httpx.post(f"{base}/explain", json={"player": p["features"], "model": m}, timeout=20)
            if res.status_code != 200:
                fails.append(f"{p['id']}/{m}: HTTP {res.status_code}")
                continue
            e = res.json()
            if abs(e["base_log_value"] + sum(c["contribution"] for c in e["contributions"]) - e["predicted_log_value"]) > 1e-4:
                fails.append(f"{p['id']}/{m}: not additive")
    out.append(Check(f"API explains {len(picks)} random players with both models", not fails, f"{len(fails)} failures" + (f", first: {fails[0]}" if fails else "")))
    return out


# ---------------------------------------------------------------- runner
def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--api", help="base URL of a running API, e.g. http://127.0.0.1:8000")
    args = ap.parse_args()
    if not P.GENERATED.exists():
        sys.exit(f"{P.GENERATED.relative_to(ROOT).as_posix()} not found: run python -m src.product.players first")

    export = json.loads(P.GENERATED.read_text(encoding="utf-8"))
    md = pd.read_parquet(PROCESSED_DIR / "model_dataset.parquet")
    registry = json.loads((ROOT / "models" / "model_registry.json").read_text())
    showcase = P.showcase()
    meta_path = PROCESSED_DIR / "build_metadata.json"
    snapshot = json.loads(meta_path.read_text())["snapshot_date"] if meta_path.exists() else None
    log_scale = pd.read_csv(REPORTS_DIR / "fairness" / "regression_log_scale.csv").set_index("metric")
    by_pos = pd.read_csv(REPORTS_DIR / "models" / "errors_by_position_full.csv")

    checks = check_population(export, md, registry.get("n_training_rows")) + check_contract(export)
    if export.get("heldout_algorithm"):
        oof = {m: pd.read_parquet(P.PRED_DIR / f"oof_{fs}_{P.PRIMARY_ALGORITHM}.parquet") for m, fs in (("A", "full"), ("B", "performance"))}
        checks += check_heldout(export, md, oof) + check_heldout_metrics(export, registry)
        checks += check_gap(export, {m: float(log_scale.at[f"{m}_signed_gap_raw", "estimate"]) for m in ("A", "B")})
    else:
        checks.append(Check("held-out estimates present", False, "export has no CV predictions: run src.models.train or copy data/processed/predictions/"))
    checks += check_traits(export, md) + check_peers(export, md, dict(zip(by_pos.position, by_pos.n)))
    checks += check_history(export, snapshot) + check_showcase(export, showcase)
    if args.api:
        checks += check_api(args.api.rstrip("/"), export, showcase, registry)

    width = max(len(c.name) for c in checks)
    for c in checks:
        print(f"{'PASS' if c.ok else 'FAIL'}  {c.name:<{width}}  {c.detail}")
    failed = [c for c in checks if not c.ok]
    print(f"\n{len(checks) - len(failed)}/{len(checks)} checks passed")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
