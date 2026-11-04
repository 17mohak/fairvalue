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

### Local verification (2026-11-04)
- **Built and run with Docker Engine 29.2.0 (linux/x86_64)**: image `fairvalue-api:local`, 676 MB.
  - `GET /health`: HTTP 200, all four models loaded, versions and dataset fingerprint reported.
  - `POST /predict`: value, tier, tier probabilities, model versions and disclaimer returned.
  - A request containing `nationality`: HTTP 422.
  - The process runs as the non-root `appuser`; Docker's HEALTHCHECK status is `healthy`.
- History: Docker Desktop first failed to start (its Model Runner could not remove a stale socket
  file). Before the engine came up, the image contents were verified with a container-equivalent
  run. The engine started normally after the owner rebooted and enabled virtualization.
- CI repeats the build and smoke test on every push (no push to any registry).

## Hosting and registry: NOT done (approval required)
- Pushing the image to GitHub Container Registry and deploying to Railway or Render both publish
  externally, and both need explicit owner approval.
- Free-tier terms must be checked at that point.
- Model files are build inputs. A CI publish job would need to train/refit first (as the CI job
  already does) or pull versioned models from a release artefact.
