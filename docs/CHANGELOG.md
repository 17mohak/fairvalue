# Development changelog

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
