# Development changelog

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
