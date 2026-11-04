"""FastAPI service: real-time POST /predict and GET /health.

Run locally:
    ./.venv/Scripts/python -m uvicorn src.api.app:app --port 8000
Docker:
    docker build -t fairvalue-api . && docker run -p 8000:8000 fairvalue-api

Models are the full-data refits from src/models/final.py (models/*.joblib + model_registry.json).
The directory can be overridden with FAIRVALUE_MODELS_DIR.
This module deliberately imports nothing from training code (no MLflow/Optuna in the container).
"""

import json
import os
from contextlib import asynccontextmanager
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException

from src.api.schemas import DISCLAIMER, HealthResponse, PredictRequest, PredictResponse
from src.features.preprocess import assert_no_demographic_columns, feature_columns
from src.models.tiers import TIER_NAMES, assign_tier

MODELS_DIR = Path(os.getenv("FAIRVALUE_MODELS_DIR", Path(__file__).resolve().parents[2] / "models"))
STATE: dict = {"models": {}, "registry": None}


def load_models(models_dir: Path = MODELS_DIR) -> None:
    STATE["models"].clear()
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
    return set(enc.categories_[cols.index("sub_position")]) - {"missing"}


@asynccontextmanager
async def lifespan(app: FastAPI):
    load_models()
    yield


app = FastAPI(title="FairValue market value API", version="0.1.0",
              description="Research prototype. " + DISCLAIMER, lifespan=lifespan)


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    reg = STATE["registry"] or {}
    versions = {k: v["version"] for k, v in reg.get("models", {}).items() if k in STATE["models"]}
    ok = {"regressor_A", "classifier_A"} <= set(STATE["models"])
    return HealthResponse(status="ok" if ok else "degraded", models_loaded=sorted(STATE["models"]),
                          model_versions=versions, dataset_sha256_16=reg.get("dataset_sha256_16"))


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest) -> PredictResponse:
    fs = "full" if req.model == "A" else "performance"
    reg, clf = STATE["models"].get(f"regressor_{req.model}"), STATE["models"].get(f"classifier_{req.model}")
    if reg is None or clf is None:
        raise HTTPException(status_code=503, detail=f"Model {req.model} is not loaded")
    feats = req.player.to_features()
    if feats["sub_position"] is not None and feats["sub_position"] not in known_sub_positions(reg):
        raise HTTPException(status_code=422, detail=f"Unknown sub_position '{feats['sub_position']}'; "
                                                    f"expected one of {sorted(known_sub_positions(reg))}")
    cols = feature_columns(fs)
    X = pd.DataFrame([{c: feats.get(c) for c in cols}], columns=cols)
    assert_no_demographic_columns(X.columns)  # defence in depth; the schema already forbids them
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
