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
| CI | Unit tests → data → quick train → gate → refit → Docker build/smoke test. **Not yet run on GitHub** (no remote) | `.github/workflows/ci.yml` |
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
- **GitHub remote / CI run:** CI is written but has never run. Creating a remote and pushing needs the
  owner's approval.
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
