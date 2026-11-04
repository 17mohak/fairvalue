# Roadmap

| # | Milestone | Status | Main outputs |
|---|---|---|---|
| 0 | Repository and environment | **Done** | layout, venv, pinned deps, config, logging, pytest, CI workflow |
| 1 | Dataset acquisition and investigation | **Done** | acquire.py + manifest, schema profile, quality checks, mapping, coverage audit |
| 2 | Data preparation | **Done (first version)** | player-level dataset, audit table, drift snapshot, feature pipeline, leakage tests |
| 3 | Baseline modelling | Next | log-target Ridge baseline, RF, HistGradientBoosting; 5-fold CV on current snapshot; MLflow tracking; tier boundaries from quantiles |
| 4 | Tuning and ablation | Planned | Optuna on GBM; Model A vs Model B; quality gate set from baseline |
| 5 | Fairness audit | Planned | Fairlearn MetricFrame by group and by league; per-tier equalized odds; residual gaps; diaspora sensitivity; SHAP; DiCE (pending S-4 decision) |
| 6 | Serving | Planned | FastAPI `POST /predict`, Pydantic schemas, Docker image |
| 7 | MLOps and monitoring | Planned | GitHub Actions train-on-subset + gate; Evidently drift report (reference vs current); retraining policy |
| 8 | Responsible AI documentation | Planned | model card, data card, EU AI Act risk classification |

Hosting (Railway/Render) and GHCR publishing need your approval before any push or deploy.

## Priorities
1. Sign-off on D-011 (scope) and S-4 (DiCE design), since they shape milestones 3–5.
2. Baseline models with honest CV numbers before any tuning.
3. Fairness audit design locked before looking at fairness results, to avoid tuning to a desired answer.
