# Project state

_Last updated: 2026-11-05_

## Where we are
- All eight milestones are implemented, tested and run on the full data. The research design is
  **locked** (`docs/RESEARCH_DESIGN.md`).
- Every reported number was regenerated from the committed code with `scripts/run_pipeline.sh` (D-028).
- Nothing has been pushed, published or deployed.

| Area | State | Evidence |
|---|---|---|
| Location | Permanent folder `C:\Users\MOHAK\fairvalue`; git history and data checksums verified after the move | `git log`, `data/raw/MANIFEST.json` |
| Data | 10 tables, checksummed; 5,820-player modelling set; separate audit table and drift snapshot | `data/processed/build_metadata.json` |
| Design | Locked: population, RQ1–RQ4, metrics, DiCE approach | `docs/RESEARCH_DESIGN.md`, DECISIONS D-011, D-017–D-031 |
| Models | Ridge, RF, HGB, Optuna-HGB × Model A/B; HGB tier classifier; 5-fold held-out predictions | `docs/reports/MODEL_EVALUATION.md` |
| Primary model | Optuna-tuned HGB: Model A log RMSE 0.526, R² 0.891 (unseen clubs: 0.573 / 0.871) | `reports/models/primary_model.json` |
| Serving | Full-data refits + registry; FastAPI `POST /predict`, `GET /health`. Docker image rebuilt from the re-run models and smoke-tested on 2026-11-05: predictions identical to the saved artefacts; 422 on 7 invalid-input cases (including a nationality field); 405 on GET /predict; non-root; HEALTHCHECK healthy | `docs/DEPLOYMENT.md`, `models/model_registry.json` |
| Fairness | Signed residual gaps, MAE/RMSE gaps, league/strata, calibration check, ER1a/ER1b, club-clustered CIs, tier power | `docs/reports/FAIRNESS_AUDIT.md`, `SUPPLEMENTARY_CHECKS.md` |
| Explainability | SHAP global/group/local; feature-based DiCE: full run complete (720 queries, no consistent group difference). DiCE is now time-bounded and checkpointed (D-031) | `docs/reports/EXPLAINABILITY.md` |
| Monitoring | Evidently + PSI drift simulation, retraining policy (NO ACTION), quality gates | `docs/MONITORING.md` |
| CI | Private repo [17mohak/fairvalue](https://github.com/17mohak/fairvalue). First run (2026-11-04, about 6 min) **passed**: 79 unit tests (+10 data tests skipped as designed); data re-downloaded with an unchanged manifest; 9 data/leakage tests; quick-run gate with numbers identical to the local run (0.851 / 0.581 / 0.718); refit; Docker build, health and predict smoke test. No image pushed | `.github/workflows/ci.yml`, GitHub Actions |
| Product (branch `feat/product-experience`) | Next.js app in `web/`: landing, valuation studio (live predict + per-prediction SHAP), fairness explorer, methods. `POST /explain`, `GET /metadata`. Compose stack built and smoke-tested locally. Not pushed or deployed | `docs/PRODUCT.md`, D-032, D-033 |
| Responsible AI | Model card, data card, EU AI Act assessment | `docs/MODEL_CARD.md`, `docs/DATA_CARD.md`, `docs/EU_AI_ACT_ASSESSMENT.md` |
| Tests | 89 passing (unit + real-data + API against the real models) | `pytest -q` |
| Reviews | Three independent read-only reviews; all findings addressed | DECISIONS D-015, D-023, D-028 |

## Key results (held-out, within the selected population)
- Context dominates prediction: Model A log R² 0.891 vs Model B 0.669.
- **Primary fairness result:** non-UEFA players are under-predicted relative to UEFA players in the same
  leagues.
  - League-stratified log gap **+0.093** (95% CI 0.063–0.124) under Model A; +0.164 under Model B.
  - It holds within predicted-value deciles, for every algorithm, at 900 minutes, for unseen clubs and
    with club-clustered CIs.
  - It is concentrated in RU1, TR1, GR1, UKR1 and BE1.
- This is the opposite of the original hypothesis. It is reported as found, with no causal reading.
- Accuracy (MAE/RMSE) is similar for both groups. Model A's ER1a is +2.5 pp, and its club-clustered CI
  reaches 0. Errors lean towards under-tiering non-UEFA players. The World Class and Elite tier
  components are too imprecise to interpret.

## Open items
- **Real-data check of the player export:** follow `docs/PLAYER_EXPORT_VERIFICATION.md` on a machine
  with the dataset and `data/processed/predictions/oof_*_hgb_tuned.parquet`; expect 24/24 (27/27
  with the API). Not yet run.
- **Portraits:** run `scripts/portraits/find_candidates.py` where Wikimedia is reachable, review the
  sheet, add cutouts with `scripts/portraits/add_portrait.py` (docs/PLAYER_ASSETS.md).
- **Player profiles (D-035):** the board and profiles ship with the eight-player research showcase.
  The full board, held-out estimates, traits radar and valuation history need
  `python -m src.product.players` to be run where the dataset and CV predictions exist; it was not
  run on real data in the session that built it (no dataset access). No licensed portraits yet.
- **Multi-page branch:** `feat/multipage-experience` (based on `feat/product-experience`) restructures
  the web app into four rooms (D-034). Local commits only; pushing and merging need owner approval.
  Its live API path was not exercised end to end in the session that built it (the cloud sandbox
  could not download the dataset to build model binaries); run the compose stack once before merging.
- **Product branch:** `feat/product-experience` is local only. Pushing it (and running its CI) and any
  merge into `main` need owner approval.
- **GitHub:** private repository created and CI green (owner-approved 2026-11-05). Visibility changes
  and collaborators are the owner's call.
- **Hosting (Railway/Render) and GHCR image publishing:** not done; needs approval, and free-tier terms
  must be checked first.
- **Academic report:** already submitted by the owner; no update planned from this repository.

## How to resume
- Start Docker Desktop first if you need the container (the engine runs after enabling virtualization).
- `bash scripts/run_pipeline.sh` regenerates everything except the full DiCE run (about 35 min; runs
  the bounded DiCE demo). `WITH_DICE=1 bash scripts/run_pipeline.sh` adds the full DiCE run (+80 min).
- To check things without retraining:
  - `./.venv/Scripts/python -m src.models.quality_gate` (gate on saved results);
  - `./.venv/Scripts/python -m src.fairness.counterfactuals` (bounded DiCE demo, at most 10 min);
  - `docker build -t fairvalue-api:local .` then `docker run -p 8000:8000 fairvalue-api:local`.
- `./.venv/Scripts/python -m pytest -q` runs the tests.
- The API runs with `./.venv/Scripts/python -m uvicorn src.api.app:app --port 8000`, or via Docker
  (see `docs/DEPLOYMENT.md`).
