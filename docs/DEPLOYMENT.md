# Deployment (Milestone 6)

## Serving artefacts
- `python -m src.models.final` refits the selected models on all 5,820 players and writes:
  - `models/regressor_{A,B}.joblib` and `models/classifier_{A,B}.joblib` (git-ignored);
  - `models/model_registry.json` (committed): versions, hyperparameters, features, dataset
    fingerprint and the held-out CV metrics that describe them.
- Hyperparameters are the median of the per-fold Optuna optima (D-027).

## API (`src/api/`)
| Endpoint | Purpose |
|---|---|
| `GET /health` | Status, loaded models, model versions, dataset fingerprint |
| `POST /predict` | `{"player": {...}, "model": "A"}` → `predicted_value_eur`, `predicted_tier`, `classifier_tier`, `tier_probabilities`, `model_version`, `disclaimer` |

**Validation (Pydantic, `src/api/schemas.py`):**
- Inputs must fall inside the approved population: age 15–45, minutes ≥ 450, one of the 14 leagues,
  rates within plausible ranges, `minutes_last_365 ≤ minutes`, and known sub-positions.
- Derived features (`goal_contrib_p90`, `minutes_per_appearance`) are computed by the server.
- **Unknown fields are rejected** (`extra="forbid"`). Sending `nationality`, `country_of_citizenship`
  or `confederation` returns HTTP 422, so demographic data cannot reach the model through the API.
- Every response includes the research-use disclaimer.

Run locally:
```bash
./.venv/Scripts/python -m uvicorn src.api.app:app --port 8000
```
Interactive docs are then at http://localhost:8000/docs.

## Docker
- The `Dockerfile` is based on `python:3.12-slim`. It installs only `requirements-api.txt` (no
  training or MLOps libraries), copies only the modules the API imports plus `models/`, runs as a
  non-root user, and has a `HEALTHCHECK` on `/health`.

```bash
python -m src.models.final
docker build -t fairvalue-api .
docker run -p 8000:8000 fairvalue-api
```

### Local verification status (2026-11-04)
- **The local Docker engine did not start on the development machine.** Docker Desktop 4.59.0 showed
  a startup error: its Model Runner ("Inference manager") could not remove a stale socket file under
  `%LOCALAPPDATA%\Docker\run\dockerInference`. The app offers "Quit" or "Reset to factory defaults".
  The reset would delete existing images and containers, so it was not done without the owner's approval.
- **Verified instead with a container-equivalent run:**
  - exactly the files the Dockerfile copies, placed in a clean folder;
  - a fresh virtual environment with only `requirements-api.txt` (confirmed MLflow is not importable);
  - uvicorn on a local port.
  - Result: `/health` OK with all four models; `/predict` returned a value, tier and versions; a
    `nationality` field gave HTTP 422.
- **The real image build and smoke test run in CI** (`.github/workflows/ci.yml`, job
  `train-quick-and-gate`). CI has not run yet because no GitHub remote exists.
- **To fix Docker locally:** try in order:
  1. Disable "Docker Model Runner" in Docker Desktop settings (if the UI opens), or quit Docker
     Desktop and delete the stale `dockerInference` entry, then restart.
  2. Use Troubleshoot → "Reset to factory defaults" (this removes local images and containers).

## Hosting and registry: NOT done (approval required)
- Pushing the image to GitHub Container Registry and deploying to Railway or Render both publish
  externally, and both need explicit owner approval.
- Free-tier terms must be checked at that point.
- Model files are build inputs. A CI publish job would need to train/refit first (as the CI job
  already does) or pull versioned models from a release artefact.
