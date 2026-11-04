"""Contract tests for POST /explain and GET /metadata.

Uses the real saved models when present; otherwise small tree models fitted on toy data, so the
SHAP path is exercised in CI too (where no trained models exist in the unit-test job).
"""

import joblib
import numpy as np
import pytest
from fastapi.testclient import TestClient

from src.api import app as api
from src.api import explain as shap_explain
from src.api.schemas import DISCLAIMER, SUB_POSITIONS_BY_POSITION, PlayerFeatures
from src.config import ROOT
from src.features.preprocess import FEATURES_FULL, FEATURES_PERFORMANCE

EXAMPLE = PlayerFeatures.model_config["json_schema_extra"]["example"]
pytestmark = pytest.mark.skipif(not shap_explain.SHAP_AVAILABLE, reason="shap not installed")


@pytest.fixture(scope="module")
def client(tmp_path_factory):
    models_dir = ROOT / "models"
    if not (models_dir / "regressor_A.joblib").exists():
        from src.features.preprocess import feature_columns
        from src.models.train import make_classifier, make_regressor
        from tests.test_models import toy_training_frame
        df = toy_training_frame(300)
        df["sub_position"] = "Centre-Forward"
        df["foot"] = "right"
        models_dir = tmp_path_factory.mktemp("tree_models")
        for tag, fs in [("A", "full"), ("B", "performance")]:
            X = df[feature_columns(fs)]
            joblib.dump(make_regressor("hgb", fs).fit(X, df.y_log), models_dir / f"regressor_{tag}.joblib")
            joblib.dump(make_classifier(fs).fit(X, df.tier), models_dir / f"classifier_{tag}.joblib")
    with TestClient(api.app) as c:
        api.load_models(models_dir)  # lifespan loads the default dir; force the chosen one
        yield c
    api.load_models()


@pytest.mark.parametrize("model,features", [("A", FEATURES_FULL), ("B", FEATURES_PERFORMANCE)])
def test_explain_is_additive_and_matches_predict(client, model, features):
    body = {"player": EXAMPLE, "model": model}
    e = client.post("/explain", json=body)
    assert e.status_code == 200, e.text
    e = e.json()
    total = e["base_log_value"] + sum(c["contribution"] for c in e["contributions"])
    assert total == pytest.approx(e["predicted_log_value"], abs=1e-4)
    p = client.post("/predict", json=body).json()
    assert e["predicted_value_eur"] == p["predicted_value_eur"]  # same model, same estimate
    assert [c["feature"] for c in e["contributions"]] != [] and {c["feature"] for c in e["contributions"]} == set(features)
    mags = [abs(c["contribution"]) for c in e["contributions"]]
    assert mags == sorted(mags, reverse=True)
    assert e["disclaimer"] == DISCLAIMER and e["model"] == model


def test_explain_reports_derived_inputs_and_never_demographics(client):
    e = client.post("/explain", json={"player": EXAMPLE}).json()
    values = {c["feature"]: c["value"] for c in e["contributions"]}
    assert values["goal_contrib_p90"] == pytest.approx(EXAMPLE["goals_p90"] + EXAMPLE["assists_p90"])
    assert values["minutes_per_appearance"] == pytest.approx(EXAMPLE["minutes"] / EXAMPLE["appearances"])
    assert values["valuation_league_id"] == EXAMPLE["valuation_league_id"]
    assert not any(k in c["feature"] for c in e["contributions"]
                   for k in ("national", "citizen", "confed", "birth"))


def test_explain_model_b_has_no_context_features(client):
    e = client.post("/explain", json={"player": EXAMPLE, "model": "B"}).json()
    names = {c["feature"] for c in e["contributions"]}
    assert "valuation_league_id" not in names and "club_ppg" not in names


def test_explain_missing_optional_inputs_are_null(client):
    player = dict(EXAMPLE, height_in_cm=None, club_ppg=None, foot=None)
    e = client.post("/explain", json={"player": player})
    assert e.status_code == 200, e.text
    values = {c["feature"]: c["value"] for c in e.json()["contributions"]}
    assert values["height_in_cm"] is None and values["club_ppg"] is None and values["foot"] is None


@pytest.mark.parametrize("change", [{"nationality": "Brazil"}, {"age": 12}, {"sub_position": "Libero"}])
def test_explain_rejects_invalid_input(client, change):
    assert client.post("/explain", json={"player": dict(EXAMPLE, **change)}).status_code == 422


def test_explain_refuses_non_additive_explanations(client, monkeypatch):
    class Broken:
        expected_value = np.array([0.0])

        def shap_values(self, X):
            return np.zeros((1, X.shape[1]))  # sums to 0, so it cannot reproduce the prediction

    monkeypatch.setitem(api.STATE["explainers"], "A", Broken())
    r = client.post("/explain", json={"player": EXAMPLE})
    assert r.status_code == 500 and "additivity" in r.text


def test_metadata_lists_supported_inputs(client):
    m = client.get("/metadata")
    assert m.status_code == 200
    m = m.json()
    assert len(m["leagues"]) == 14 and "GB1" in m["leagues"]
    assert m["tier_names"] == ["Emerging", "Established", "Elite", "World Class"]
    assert m["tier_boundaries_eur"] == [2_000_000, 10_000_000, 30_000_000]
    assert set(m["sub_positions_by_position"]) == {"Goalkeeper", "Defender", "Midfield", "Attack"}
    assert m["explain_available"] is True


def test_sub_position_taxonomy_matches_the_served_encoder():
    """Every sub-position the real model knows appears in the taxonomy, and vice versa."""
    path = ROOT / "models" / "regressor_A.joblib"
    if not path.exists():
        pytest.skip("real models not present")
    known = api.known_sub_positions(joblib.load(path))
    listed = {s for subs in SUB_POSITIONS_BY_POSITION.values() for s in subs}
    assert listed == known
