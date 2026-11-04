# CLAUDE.md: project instructions

Football player market value prediction with a nationality-based fairness audit
(BTECH CAP 501, ATLAS SkillTech University, solo project by Mohak Mandwani).
The fairness audit is the main contribution.

## Read first when resuming
1. `docs/PROJECT_STATE.md`: where things stand, blockers
2. `docs/DECISIONS.md`: decisions D-xxx and spec issues S-x
3. `docs/ROADMAP.md`: milestone order

## Non-negotiable rules
- Nationality, citizenship, confederation, audit group, birth place, national-team ids and
  caps must **never** enter a model feature matrix. They live only in `audit_lookup.parquet`.
  Use `src.features.preprocess.assert_no_demographic_columns` before any fit.
- Train / cross-validate only on the current snapshot (valuations in (ref_date, snapshot_date]).
  `drift_reference.parquet` is for drift simulation only.
- Features use only matches up to each player's own valuation date.
- Never invent metrics, fairness results or dataset statistics. Numbers in docs must
  come from generated outputs (`reports/`, `data/processed/build_metadata.json`).
- A UEFA/non-UEFA gap is not proof of discrimination; the target (Transfermarkt value)
  may itself be biased. Say so wherever results are reported.
- Never commit data, credentials, or large artifacts. Do not push, publish images or
  deploy without the user's explicit approval.

## Locked stack
scikit-learn (Ridge, RandomForest, GradientBoosting), MLflow, Optuna, Fairlearn, SHAP,
DiCE, FastAPI + Pydantic, Docker, GitHub Actions, Evidently, pytest, Railway/Render, GHCR.
Real-time `POST /predict` only; no batch or streaming.

## Commands (Windows, from repo root)
```bash
./.venv/Scripts/python -m src.data.acquire          # download raw tables (~113 MB)
./.venv/Scripts/python -m src.data.build_dataset    # processed parquet files
./.venv/Scripts/python -m src.fairness.coverage     # coverage audit tables
./.venv/Scripts/python -m src.data.quality          # data quality checks
./.venv/Scripts/python -m pytest -q                 # tests (data tests skip without data)
```

## Conventions
- Production logic in `src/`, notebooks only for exploration/reporting.
- Beginner-readable code, short comments explaining *why*.
- Pin a dependency in `requirements.txt` only once it is installed and tested.
- Update PROJECT_STATE, DECISIONS and CHANGELOG at the end of each work session.
