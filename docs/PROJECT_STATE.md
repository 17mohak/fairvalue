# Project state

_Last updated: 2026-11-04 (end of session 1)_

## Where we are
Milestones 0–2 (data foundation) are implemented and tested. **No model has been
trained; there are no accuracy or fairness results yet.**

| Area | State | Evidence |
|---|---|---|
| Environment | `.venv`, Python 3.12.5, pinned core deps | `requirements.txt` |
| Data | 10 tables downloaded, checksummed | `data/raw/MANIFEST.json` |
| Quality checks | 13 checks, no blocking failures | `reports/data_quality.csv` |
| Mapping | 202 citizenship values; matches `national_teams` for all 123 labelled countries | `src/data/mappings/country_confederation.csv` |
| Dataset | 5,820 eligible players (4,324 UEFA, 1,496 non-UEFA), 20 features | `data/processed/build_metadata.json` |
| Coverage audit | 13 generated tables + written interpretation | `reports/coverage/`, `docs/reports/COVERAGE_AUDIT.md` |
| Tests | 44 passing (unit + real-data integrity + reproducibility) | `pytest -q` |
| Independent review | done, findings addressed | DECISIONS D-015 |
| CI | workflow written, **not yet run** on GitHub (no remote) | `.github/workflows/ci.yml` |

## Decisions waiting for the project owner
1. **D-011 scope:** model only players at clubs in the 14 European leagues with match data.
   Recommended: accept, and state it as the research population.
2. **S-4 DiCE design:** flipping confederation cannot change a model that never sees it.
   Recommended: DiCE on real features (distance to the next tier, compared by group).
3. **S-1 / S-8 report wording:** the dataset is frozen (July 2026), not weekly; real sizes
   are 50,149 players / 656,301 valuations.

## Blockers
- None technical. The project folder is currently a temporary session folder and should be
  moved to a permanent location before further work.
- No GitHub remote yet; pushing, GHCR and hosting all need approval.

## Next steps
1. Milestone 3: log-target Ridge baseline → RandomForest → HistGradientBoosting,
   5-fold CV on `model_dataset.parquet`, MLflow tracking; derive tier quantiles.
2. Fix the fairness metric plan (per-tier equalized odds, residual gaps by group within
   league, recent-arrival and diaspora strata) **before** looking at results.
3. Exploration notebook (`notebooks/01_dataset_investigation.ipynb`) once Jupyter is added.
