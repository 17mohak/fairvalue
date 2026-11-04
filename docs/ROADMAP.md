# Roadmap

Research design locked 2026-11-04 (`docs/RESEARCH_DESIGN.md`, D-011).

| # | Milestone | Status | Main outputs |
|---|---|---|---|
| 0 | Repository and environment | **Done** | layout, venv, pinned deps, config, logging, pytest, CI workflow |
| 1 | Dataset acquisition and investigation | **Done** | acquire.py + manifest, quality checks, mapping, coverage audit |
| 2 | Data preparation | **Done** | player-level dataset, audit table, drift snapshot, feature pipeline, leakage tests |
| 2b | Research scope and design lock | **Done** | scope assessment, RESEARCH_DESIGN.md, D-011 accepted |
| 3 | Baseline modelling | **Done (first full run)** | Ridge / RF / HGB / Optuna-tuned HGB, tier classifier, Model A/B, MLflow, evaluation reports |
| 4 | Fairness audit (initial) | **Done (first full run)** | signed residual gaps, MAE/RMSE gaps, league and strata tables, ER1a/ER1b, directional tier errors |
| 5 | Explainability | Next | SHAP (global, local, mean \|SHAP\| by group); feature-based DiCE per D-022 |
| 6 | Serving | Planned | refit primary model on full data, FastAPI `POST /predict`, Pydantic schemas (real feature ranges, S-3), Docker image |
| 7 | MLOps and monitoring | Planned | CI: tests + `train --quick` + quality gate set from measured baseline; Evidently drift report (drift reference vs current); retraining policy (S-2 features) |
| 8 | Responsible AI documentation | Planned | model card, data card, EU AI Act risk classification |
| 9 | Report integration | Planned | update academic report wording (S-1, S-8, scope statement), figures from `reports/` |

Pushing to GitHub, publishing to GHCR and hosting on Railway/Render need explicit approval.

## Known follow-ups inside completed milestones
- Optional per-90 shrinkage (empirical Bayes) for low-minute players, flagged in the scope
  assessment. It is not part of the locked design; it would need a DECISIONS entry if adopted.
- `notebooks/01_dataset_investigation.ipynb` (exploration/reporting) once Jupyter is added.
