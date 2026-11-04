"""The web app's JSON must be an exact, current reshaping of the committed research outputs."""

import json

import pandas as pd

from src.config import REPORTS_DIR
from src.product import export


def test_committed_web_json_is_up_to_date():
    for path, text in export.outputs().items():
        assert path.exists(), f"{path} missing: run python -m src.product.export"
        assert path.read_text(encoding="utf-8") == text, f"{path.name} is stale: run python -m src.product.export"


def test_headline_gap_comes_straight_from_the_audit_table():
    log = pd.read_csv(REPORTS_DIR / "fairness" / "regression_log_scale.csv").set_index("metric")
    h = export.headline()
    for m in ["A", "B"]:
        row = log.loc[f"{m}_signed_gap_league_stratified"]
        assert h[m]["signed_gap_league_stratified"] == {
            "estimate": round(row.estimate, 4), "low": round(row.ci95_low, 4), "high": round(row.ci95_high, 4)}
    assert h["A"]["signed_gap_league_stratified"]["estimate"] == 0.0933  # the reported primary result


def test_every_covered_league_and_tier_is_exported():
    r = export.research()
    assert len(r["leagues"]) == 14
    assert [t["tier"] for t in r["tiers"]["classifier"]["A"]["per_tier"]] == ["Emerging", "Established", "Elite", "World Class"]
    assert r["population"]["funnel"][-1]["total"] == r["models"]["n_training_rows"] == 5820


def test_exported_contract_forbids_unknown_fields():
    spec = json.loads(export.render(export.openapi()))
    player = spec["components"]["schemas"]["PlayerFeatures"]
    assert player["additionalProperties"] is False
    assert not any(k in p for p in player["properties"] for k in ("national", "citizen", "confed"))
    assert {"/predict", "/explain", "/metadata", "/health"} <= set(spec["paths"])
