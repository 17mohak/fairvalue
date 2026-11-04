"""API contract tests. Use the real saved models if present, else small models fitted on toy data."""

import copy

import joblib
import pytest
from fastapi.testclient import TestClient

from src.api import app as api
from src.api.schemas import DISCLAIMER, PlayerFeatures
from src.config import ROOT

EXAMPLE = PlayerFeatures.model_config["json_schema_extra"]["example"]


@pytest.fixture(scope="module")
def client(tmp_path_factory):
    models_dir = ROOT / "models"
    if not (models_dir / "regressor_A.joblib").exists():
        # Build tiny stand-in models so the contract can be tested without the dataset.
        from src.models.train import make_classifier, make_regressor
        from tests.test_models import toy_training_frame
        df = toy_training_frame(300)
        df["sub_position"] = "Centre-Forward"
        df["foot"] = "right"
        models_dir = tmp_path_factory.mktemp("models")
        for tag, fs in [("A", "full"), ("B", "performance")]:
            from src.features.preprocess import feature_columns
            X = df[feature_columns(fs)]
            joblib.dump(make_regressor("ridge", fs).fit(X, df.y_log), models_dir / f"regressor_{tag}.joblib")
            joblib.dump(make_classifier(fs).fit(X, df.tier), models_dir / f"classifier_{tag}.joblib")
    api.load_models(models_dir)
    with TestClient(api.app) as c:
        api.load_models(models_dir)  # lifespan reloads from the default dir; force the chosen one
        yield c


def test_health_reports_loaded_models(client):
    r = client.get("/health").json()
    assert r["status"] == "ok"
    assert {"regressor_A", "classifier_A"} <= set(r["models_loaded"])


@pytest.mark.parametrize("model", ["A", "B"])
def test_predict_returns_value_tier_version_and_disclaimer(client, model):
    r = client.post("/predict", json={"player": EXAMPLE, "model": model})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["predicted_value_eur"] > 0
    assert body["predicted_tier"] in ["Emerging", "Established", "Elite", "World Class"]
    assert abs(sum(body["tier_probabilities"].values()) - 1) < 1e-3
    assert set(body["model_version"]) == {"regressor", "classifier"}
    assert body["disclaimer"] == DISCLAIMER and "Research use only" in body["disclaimer"]


@pytest.mark.parametrize("field", ["nationality", "country_of_citizenship", "confederation"])
def test_demographic_fields_are_rejected(client, field):
    player = dict(EXAMPLE, **{field: "Brazil"})
    r = client.post("/predict", json={"player": player})
    assert r.status_code == 422


@pytest.mark.parametrize("change", [
    {"age": 12}, {"minutes": 300}, {"start_share": 1.5}, {"valuation_league_id": "BRA1"},
    {"minutes_last_365": 99999}, {"position": "Striker"},
])
def test_out_of_population_inputs_are_rejected(client, change):
    player = copy.deepcopy(EXAMPLE) | change
    assert client.post("/predict", json={"player": player}).status_code == 422


def test_consistency_rule_minutes_last_365(client):
    player = dict(EXAMPLE, minutes=1000, minutes_last_365=1500)
    assert client.post("/predict", json={"player": player}).status_code == 422


def test_prediction_is_deterministic(client):
    a = client.post("/predict", json={"player": EXAMPLE}).json()
    b = client.post("/predict", json={"player": EXAMPLE}).json()
    assert a["predicted_value_eur"] == b["predicted_value_eur"]


def test_sub_position_is_required_and_validated(client):
    assert client.post("/predict", json={"player": dict(EXAMPLE, sub_position=None)}).status_code == 422
    r = client.post("/predict", json={"player": dict(EXAMPLE, sub_position="Libero")})
    assert r.status_code == 422 and "Unknown sub_position" in r.text


def test_model_b_ignores_league_and_club_context(client):
    a = client.post("/predict", json={"player": dict(EXAMPLE, valuation_league_id="GB1", club_ppg=2.5), "model": "B"}).json()
    b = client.post("/predict", json={"player": dict(EXAMPLE, valuation_league_id="BE1", club_ppg=0.5), "model": "B"}).json()
    assert a["predicted_value_eur"] == b["predicted_value_eur"]


def test_derived_features_match_training_definitions():
    f = PlayerFeatures(**EXAMPLE).to_features()
    assert f["goal_contrib_p90"] == EXAMPLE["goals_p90"] + EXAMPLE["assists_p90"]
    assert f["minutes_per_appearance"] == EXAMPLE["minutes"] / EXAMPLE["appearances"]


def test_health_is_503_when_models_missing(tmp_path):
    api.load_models(tmp_path)  # empty directory
    try:
        r = TestClient(api.app).get("/health")
        assert r.status_code == 503 and r.json()["status"] == "degraded"
    finally:
        api.load_models()
