# FairValue: football market value prediction with a nationality-based fairness audit

Academic project for **BTECH CAP 501: Project Life Cycle Management**, ATLAS SkillTech University.

The system predicts a player's Transfermarkt market value (EUR) from match performance
and context, then audits whether the model's errors differ systematically between
UEFA and non-UEFA nationals, **even though nationality is never a model input**.

> Status: research design locked; baseline models and first fairness audit complete (Milestones 0–4).
> Results describe a **selected population** (14 European leagues) and are associations, not causal
> findings. See [`docs/PROJECT_STATE.md`](docs/PROJECT_STATE.md).

## Key findings so far
- Player-level match data exists only for **14 European leagues**. The comparison is
  therefore between UEFA and non-UEFA players *at clubs in those leagues*.
- Eligible modelling population: **5,820 players** (4,324 UEFA, 1,496 non-UEFA).
- Non-UEFA players lose 79% of their numbers to the coverage filter, versus 47% for UEFA.
- Details: [`docs/reports/COVERAGE_AUDIT.md`](docs/reports/COVERAGE_AUDIT.md).
- Primary model (tuned gradient boosting) explains 89% of log-value variance (held-out); without
  league/club context, 67%. See [`MODEL_EVALUATION`](docs/reports/MODEL_EVALUATION.md).
- Non-UEFA players are **under-predicted** relative to UEFA players in the same leagues
  (log gap +0.099, 95% CI 0.068–0.128). That is the opposite direction to the original hypothesis.
  See [`FAIRNESS_AUDIT`](docs/reports/FAIRNESS_AUDIT.md).

## Quick start
```bash
python -m venv .venv
./.venv/Scripts/python -m pip install -r requirements.txt   # Windows path; use .venv/bin on macOS/Linux
./.venv/Scripts/python -m src.data.acquire
./.venv/Scripts/python -m src.data.build_dataset
./.venv/Scripts/python -m src.fairness.coverage
./.venv/Scripts/python -m src.models.train      # ~20 min (nested Optuna)
./.venv/Scripts/python -m src.fairness.audit
./.venv/Scripts/python -m pytest -q
```

## Layout
```
data/              raw / interim / processed (git-ignored except MANIFEST.json)
src/config.py      paths and research constants
src/data/          acquire, quality checks, nationality mapping, dataset build
src/features/      feature lists + shared ColumnTransformer
src/fairness/      coverage, scope analysis, fairness audit (SHAP/DiCE next)
src/models/        tiers, training (CV + MLflow + Optuna), evaluation
src/monitoring, src/api   scaffolds for later milestones
tests/             unit tests (synthetic) + data tests (real outputs)
reports/           generated audit tables
docs/              decisions, provenance, features, limitations, roadmap, state
```

## Documentation
| Doc | Content |
|---|---|
| [PROJECT_STATE](docs/PROJECT_STATE.md) | progress and blockers |
| [RESEARCH_DESIGN](docs/RESEARCH_DESIGN.md) | **locked** population, questions, models, metrics |
| [DECISIONS](docs/DECISIONS.md) | engineering/method decisions and spec issues |
| [DATA_PROVENANCE](docs/DATA_PROVENANCE.md) | source chain, lineage, licensing |
| [FEATURES](docs/FEATURES.md) | feature dictionary and exclusions |
| [KNOWN_LIMITATIONS](docs/KNOWN_LIMITATIONS.md) | biases and caveats |
| [ROADMAP](docs/ROADMAP.md) | milestones |
| [CHANGELOG](docs/CHANGELOG.md) | development log |

## Data
[dcaribou/transfermarkt-datasets](https://github.com/dcaribou/transfermarkt-datasets)
(CC0 repository; scraped from Transfermarkt; upstream updates paused, snapshot to July 2026).
Raw data is not redistributed here.
