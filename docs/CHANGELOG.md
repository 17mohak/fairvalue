# Development changelog

## 2026-11-05 (later): Priority pass: engineering verification

- **DiCE:** the full run (720 queries) completed during this pass, after 83 minutes, and its outputs
  were saved (`reports/explainability/dice_*`). DiCE is now bounded: `--max-minutes`, per-player
  checkpoints, a demo default and incomplete-run labelling. The pipeline runs the full analysis only
  with `WITH_DICE=1` (D-031). Bounded mode was smoke-tested, including an early stop marked incomplete.
- **Docker:** the image was rebuilt from the re-run models and smoke-tested. Predictions are identical to
  the saved artefacts; 7 invalid inputs return 422; GET /predict returns 405; non-root user; HEALTHCHECK healthy.
- **Tests:** 89 passing.
- **Docs:** explainability report completed. Thresholds checked for agreement between code and
  `docs/MONITORING.md`. Run logs are kept out of git (they contain local paths).

## 2026-11-05: Milestones 5–8, review fixes, full re-run

### Added
- Project moved to the permanent folder `fairvalue` in the user's home directory. Git history
  restored, venv rebuilt, checksums verified, MLflow paths repointed.
- `src/models/final.py`: full-data refit of the selected models with `models/model_registry.json`.
- `src/fairness/explain_shap.py` (SHAP global, group and local) and `src/fairness/counterfactuals.py`
  (feature-based DiCE).
- `src/api/` (FastAPI `POST /predict`, `GET /health`, Pydantic validation), `Dockerfile`,
  `.dockerignore`, `requirements-api.txt`.
- `src/monitoring/drift.py` (Evidently + PSI on the reserved period, last-year model decay) and
  `src/monitoring/policy.py` (retraining triggers).
- `src/models/quality_gate.py`; CI now runs data → quick train → gate → refit → Docker smoke test.
- `scripts/run_pipeline.sh` regenerates every reported result.
- Docs: MODEL_CARD, DATA_CARD, EU_AI_ACT_ASSESSMENT, MONITORING, DEPLOYMENT, reports/EXPLAINABILITY,
  reports/SUPPLEMENTARY_CHECKS.
- Supplementary checks: club-grouped CV, club-clustered bootstrap, tier-cell power (D-026).
- Dependencies pinned: shap 0.46.0, dice-ml 0.12, fastapi 0.115.6, uvicorn 0.32.1, pydantic 2.14.2,
  httpx 0.28.1, evidently 0.7.14.

### Fixed (third independent review, D-028)
- Python `None` was not treated as missing in categorical features.
- API ranges are now the training ranges.
- DiCE minutes are consistent, and European-cup share is held fixed.
- The drift decay simulation no longer uses settings tuned on its test period.
- `final.py` checks the dataset fingerprint; `/health` returns 503 when models are missing.
- Then: a full pipeline re-run. Model A fairness gap +0.093 (was +0.099); all conclusions unchanged.

### Environment
- Docker Desktop's engine failed to start (stale Model Runner socket). It started after the owner
  rebooted and enabled virtualization, and the image was then built and smoke-tested locally.

## 2026-11-04: Session 1 (continued): design lock, models, first fairness audit

### Added
- `docs/RESEARCH_DESIGN.md`: the locked research design. D-011 accepted; D-017 to D-025 recorded.
- `src/fairness/scope_analysis.py` + `reports/scope/`: selection, threshold, overlap and proxy evidence.
- `src/models/tiers.py` (€2M / €10M / €30M), `src/models/evaluate.py`, and `src/models/train.py`
  (Ridge, RF, HGB, nested-Optuna HGB, HGB tier classifier; Model A/B; MLflow).
- `src/fairness/audit.py`: signed residual gaps, MAE/RMSE gaps, league-stratified estimates,
  stratified bootstrap, strata/league tables, calibration-within-deciles check, ER1a/ER1b via
  Fairlearn plus directional tier errors.
- Reports: `docs/reports/MODEL_EVALUATION.md`, `docs/reports/FAIRNESS_AUDIT.md`, `reports/models/`,
  `reports/fairness/`.
- Dependencies pinned: mlflow 2.22.0, optuna 4.2.1, fairlearn 0.12.0.
- Tests: tiers, folds, CV loop, nested tuning, metric scales, stratified-gap logic, bootstrap
  strata, Fairlearn agreement, arrival-strata regression test (63 total).

### Changed
- Scope assessment: selection language revised (observed vs plausible; no assumed direction).
- Preprocessor always outputs dense arrays (needed by HistGradientBoosting).

### Fixed (independent review, D-023)
- The "established players" stratum selected everyone (object-dtype boolean negation).
- Bootstrap replicates are now 2,000 everywhere; the primary-model rule matches the spec.

## 2026-11-04: Session 1: data foundation (Milestones 0–2)

### Added
- Repository scaffold, pinned core dependencies, config with research constants,
  logging, pytest config, GitHub Actions CI (unit tests; data tests skip without data).
- `src/data/acquire.py`: downloads 10 tables (~113 MB) from the maintainer's public
  bucket and writes a SHA-256 manifest.
- `src/data/mappings/country_confederation.csv` + `src/data/nationality.py`: 202
  citizenship values mapped by football confederation; agrees with the dataset's own
  `national_teams` table for all 123 labelled countries.
- `src/data/quality.py`: key, relationship, range and consistency checks → `reports/data_quality.csv`.
- `src/data/build_dataset.py`: player-level dataset (5,820 eligible players), separate
  audit table, disjoint drift reference snapshot, build metadata.
- `src/features/preprocess.py`: Model A / Model B feature lists and shared
  `ColumnTransformer`; demographic-column guard.
- `src/fairness/coverage.py`: UEFA/non-UEFA coverage audit → `reports/coverage/`.
- Tests: mapping rules, leakage guards (including output invariance to demographic
  columns), time windows, aggregation, and real-data integrity + reproducibility.
- Docs: README, CLAUDE.md, DECISIONS, DATA_PROVENANCE, FEATURES, KNOWN_LIMITATIONS,
  ROADMAP, PROJECT_STATE, COVERAGE_AUDIT.

### Found
- Upstream dataset is frozen (updates paused July 2026), contrary to "refreshed weekly".
- Match data only for 14 European leagues; 79% of currently valued non-UEFA players excluded.
- Only one citizenship per player is stored.
- Several locked-spec items do not apply to this dataset (S-1 … S-8 in DECISIONS.md).

### Changed after independent review
- Added recency / club-continuity features and the `recent_arrival` audit flag (D-015).
- Added proxy-strength measurement (D-016) and recent-arrivals table to the coverage audit.
- New tests: club points-per-game join, 730-day window edges, new features (44 tests total).
- Coverage labels read thresholds from config; birth-vs-citizenship compares canonical names.

### Fixed
- Python's default user agent got HTTP 403 from the bucket; the script now sends a project user agent.
- Impossible heights (13 raw rows, e.g. 19 cm) are set to missing.
