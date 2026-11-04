"""FastAPI service: real-time POST /predict, POST /explain, GET /metadata and GET /health.

Run locally:
    ./.venv/Scripts/python -m uvicorn src.api.app:app --port 8000
Docker:
    docker build -t fairvalue-api . && docker run -p 8000:8000 fairvalue-api

Models are the full-data refits from src/models/final.py (models/*.joblib + model_registry.json).
The directory can be overridden with FAIRVALUE_MODELS_DIR.
Browser clients normally reach the API through the web app's server-side proxy (web/), so CORS is
off by default; set FAIRVALUE_CORS_ORIGINS (comma-separated) to allow direct browser calls.
This module deliberately imports nothing from training code (no MLflow/Optuna in the container).
"""

import json
import os
from contextlib import asynccontextmanager
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware

from src.api import explain as shap_explain
from src.api.schemas import (
    COVERED_LEAGUES, DISCLAIMER, SUB_POSITIONS_BY_POSITION, ExplainResponse, FeatureContribution,
    HealthResponse, MetadataResponse, ModelInfo, PlayerFeatures, PredictRequest, PredictResponse,
)
from src.features.preprocess import assert_no_demographic_columns, feature_columns
from src.models.tiers import TIER_BOUNDARIES_EUR, TIER_NAMES, assign_tier

MODELS_DIR = Path(os.getenv("FAIRVALUE_MODELS_DIR", Path(__file__).resolve().parents[2] / "models"))
STATE: dict = {"models": {}, "registry": None, "explainers": {}}


def load_models(models_dir: Path = MODELS_DIR) -> None:
    STATE["models"].clear()
    STATE["explainers"].clear()  # explainers are rebuilt lazily from the newly loaded regressors
    reg_path = models_dir / "model_registry.json"
    STATE["registry"] = json.loads(reg_path.read_text()) if reg_path.exists() else None
    for name in ["regressor_A", "classifier_A", "regressor_B", "classifier_B"]:
        p = models_dir / f"{name}.joblib"
        if p.exists():
            STATE["models"][name] = joblib.load(p)


def known_sub_positions(pipe) -> set:
    """Sub-positions the fitted encoder has seen (others would be silently ignored, so reject)."""
    enc = pipe["pre"].named_transformers_["cat"]["onehot"]
    cols = pipe["pre"].transformers_[1][2]
    return set(enc.categories_[cols.index("sub_position")])


@asynccontextmanager
async def lifespan(app: FastAPI):
    load_models()
    yield


app = FastAPI(title="FairValue market value API", version="0.2.0",
              description="Research prototype. " + DISCLAIMER, lifespan=lifespan)

_cors = [o.strip() for o in os.getenv("FAIRVALUE_CORS_ORIGINS", "").split(",") if o.strip()]
if _cors:
    app.add_middleware(CORSMiddleware, allow_origins=_cors, allow_methods=["GET", "POST"],
                       allow_headers=["Content-Type"])


def model_frame(player: PlayerFeatures, model: str, reg) -> pd.DataFrame:
    """Validated request -> the one-row feature frame the pipeline expects (no demographics)."""
    feats = player.to_features()
    if feats["sub_position"] not in known_sub_positions(reg):
        raise HTTPException(status_code=422, detail=f"Unknown sub_position '{feats['sub_position']}'; "
                                                    f"expected one of {sorted(known_sub_positions(reg))}")
    cols = feature_columns("full" if model == "A" else "performance")
    X = pd.DataFrame([{c: feats.get(c) for c in cols}], columns=cols)
    assert_no_demographic_columns(X.columns)  # defence in depth; the schema already forbids them
    return X


@app.get("/health", response_model=HealthResponse)
def health(response: Response) -> HealthResponse:
    reg = STATE["registry"] or {}
    versions = {k: v["version"] for k, v in reg.get("models", {}).items() if k in STATE["models"]}
    ok = {"regressor_A", "classifier_A"} <= set(STATE["models"])
    if not ok:
        response.status_code = 503  # lets the Docker HEALTHCHECK fail when models are missing
    return HealthResponse(status="ok" if ok else "degraded", models_loaded=sorted(STATE["models"]),
                          model_versions=versions, dataset_sha256_16=reg.get("dataset_sha256_16"))


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest) -> PredictResponse:
    reg, clf = STATE["models"].get(f"regressor_{req.model}"), STATE["models"].get(f"classifier_{req.model}")
    if reg is None or clf is None:
        raise HTTPException(status_code=503, detail=f"Model {req.model} is not loaded")
    X = model_frame(req.player, req.model, reg)
    log_value = float(reg.predict(X)[0])
    value = float(np.exp(log_value))
    proba = clf.predict_proba(X)[0]
    versions = (STATE["registry"] or {}).get("models", {})
    return PredictResponse(
        predicted_value_eur=round(value, 0),
        predicted_tier=TIER_NAMES[int(assign_tier([value])[0])],
        classifier_tier=TIER_NAMES[int(np.argmax(proba))],
        tier_probabilities={TIER_NAMES[i]: round(float(p), 4) for i, p in enumerate(proba)},
        model=req.model,
        model_version={k: versions.get(f"{k}_{req.model}", {}).get("version", "unknown")
                       for k in ["regressor", "classifier"]},
    )


def _input_value(v):
    if v is None or (not isinstance(v, str) and pd.isna(v)):
        return None
    return v if isinstance(v, str) else float(v)


@app.post("/explain", response_model=ExplainResponse)
def explain(req: PredictRequest) -> ExplainResponse:
    """Why the regressor produced this estimate: per-feature SHAP contributions (log scale)."""
    if not shap_explain.SHAP_AVAILABLE:
        raise HTTPException(status_code=501, detail="Explanations need the 'shap' package on the server")
    reg = STATE["models"].get(f"regressor_{req.model}")
    if reg is None:
        raise HTTPException(status_code=503, detail=f"Model {req.model} is not loaded")
    X = model_frame(req.player, req.model, reg)
    try:
        explainer = STATE["explainers"].get(req.model)
        if explainer is None:
            explainer = STATE["explainers"][req.model] = shap_explain.build_explainer(reg)
        out = shap_explain.explain_row(reg, explainer, X, list(X.columns))
    except shap_explain.ExplanationError as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
    row = X.iloc[0]
    ranked = sorted(out["contributions"].items(), key=lambda kv: -abs(kv[1]))
    versions = (STATE["registry"] or {}).get("models", {})
    return ExplainResponse(
        model=req.model,
        model_version=versions.get(f"regressor_{req.model}", {}).get("version", "unknown"),
        base_log_value=out["base_log_value"], base_value_eur=float(np.exp(out["base_log_value"])),
        predicted_log_value=out["predicted_log_value"],
        predicted_value_eur=round(float(np.exp(out["predicted_log_value"])), 0),
        contributions=[FeatureContribution(feature=f, value=_input_value(row[f]), contribution=c)
                       for f, c in ranked],
    )


@app.get("/metadata", response_model=MetadataResponse)
def metadata() -> MetadataResponse:
    """What the served models accept and how they were validated (for building client forms)."""
    reg = STATE["registry"] or {}
    known = known_sub_positions(STATE["models"]["regressor_A"]) if "regressor_A" in STATE["models"] else None
    subs = {pos: [s for s in options if known is None or s in known]
            for pos, options in SUB_POSITIONS_BY_POSITION.items()}
    models = {
        key: ModelInfo(label=m["model_label"], version=m["version"], algorithm=m["algorithm"],
                       feature_set=m["feature_set"], features=m["features"],
                       cv_heldout_metrics=m["cv_heldout_metrics"])
        for key, m in reg.get("models", {}).items() if key in STATE["models"]
    }
    return MetadataResponse(
        leagues=list(COVERED_LEAGUES.__args__), sub_positions_by_position=subs,
        tier_names=TIER_NAMES, tier_boundaries_eur=[float(b) for b in TIER_BOUNDARIES_EUR],
        models=models, explain_available=shap_explain.SHAP_AVAILABLE,
        dataset_sha256_16=reg.get("dataset_sha256_16"), n_training_rows=reg.get("n_training_rows"),
    )
