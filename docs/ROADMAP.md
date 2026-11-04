# Roadmap

Research design locked 2026-11-04 (`docs/RESEARCH_DESIGN.md`, D-011).

| # | Milestone | Status | Main outputs |
|---|---|---|---|
| 0 | Repository and environment | **Done** | layout, venv, pinned deps, config, logging, pytest, CI workflow |
| 1 | Dataset acquisition and investigation | **Done** | acquire.py + manifest, quality checks, mapping, coverage audit |
| 2 | Data preparation | **Done** | player-level dataset, audit table, drift snapshot, feature pipeline, leakage tests |
| 2b | Research scope and design lock | **Done** | scope assessment, RESEARCH_DESIGN.md, D-011 accepted |
| 3 | Modelling | **Done** | Ridge / RF / HGB / Optuna-HGB, tier classifier, Model A/B, MLflow, evaluation |
| 4 | Fairness audit | **Done** | signed residual gaps, ER1a/ER1b, strata, calibration check, supplementary checks (D-026) |
| 5 | Explainability | **Done** | SHAP global/group/local; feature-based DiCE full run + bounded mode (D-022, D-030, D-031) |
| 6 | Serving | **Done (local)** | full-data refit + registry, FastAPI + Pydantic, Dockerfile; image rebuilt from re-run models and smoke-tested (predictions match saved artefacts) |
| 7 | MLOps and monitoring | **Done (CI not yet run)** | Evidently + PSI drift simulation, retraining policy, quality gates, GitHub Actions workflow |
| 8 | Responsible AI documentation | **Done** | model card, data card, EU AI Act assessment |
| 9 | Release (needs approval) | Not started | GitHub remote + first CI run; GHCR image; Railway/Render deployment |
| 10 | Report integration | Not started | update the academic report wording and figures from `reports/` |

Pushing to GitHub, publishing to GHCR and hosting on Railway/Render need explicit approval.

## Optional follow-ups (not part of the locked design)
- Per-90 shrinkage (empirical Bayes) for low-minute players.
- A persistent request log for the API (EU AI Act Art. 12-style record-keeping) if it is ever used beyond research.
- `notebooks/01_dataset_investigation.ipynb` for presentation.
