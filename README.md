# FairValue: football market value prediction with a nationality-based fairness audit

Academic project for **BTECH CAP 501: Project Life Cycle Management**, ATLAS SkillTech University.

The system predicts a player's Transfermarkt market value (EUR) from match performance
and context, then audits whether the model's errors differ systematically between
UEFA and non-UEFA nationals, **even though nationality is never a model input**.

> Status: data foundation complete (Milestones 0–2). No model has been trained yet,
> so this repository contains **no accuracy or fairness results**. See `docs/PROJECT_STATE.md`.

## Key findings so far
- Player-level match data exists only for **14 European leagues**. The comparison is
  therefore between UEFA and non-UEFA players *at clubs in those leagues*.
- Eligible modelling population: **5,820 players** (4,324 UEFA, 1,496 non-UEFA).
- Non-UEFA players lose 79% of their numbers to the coverage filter, versus 47% for UEFA.
- Details: [`docs/reports/COVERAGE_AUDIT.md`](docs/reports/COVERAGE_AUDIT.md).

## Quick start
```bash
python -m venv .venv
./.venv/Scripts/python -m pip install -r requirements.txt   # Windows path; use .venv/bin on macOS/Linux
./.venv/Scripts/python -m src.data.acquire
./.venv/Scripts/python -m src.data.build_dataset
./.venv/Scripts/python -m src.fairness.coverage
./.venv/Scripts/python -m pytest -q
```

## Layout
```
data/              raw / interim / processed (git-ignored except MANIFEST.json)
src/config.py      paths and research constants
src/data/          acquire, quality checks, nationality mapping, dataset build
src/features/      feature lists + shared ColumnTransformer
src/fairness/      coverage audit (Fairlearn/SHAP/DiCE later)
src/models, src/monitoring, src/api   scaffolds for later milestones
tests/             unit tests (synthetic) + data tests (real outputs)
reports/           generated audit tables
docs/              decisions, provenance, features, limitations, roadmap, state
```

## Documentation
| Doc | Content |
|---|---|
| [PROJECT_STATE](docs/PROJECT_STATE.md) | progress and blockers |
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
