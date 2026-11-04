# Verifying the full player export on real data

The player board ships with the eight-player research showcase. The full export, covering every
player in the modelling population, has to be generated where the dataset and the cross-validation
predictions exist. This page gives the commands, what each should print, and the checks that prove
the held-out estimates, percentiles and valuation histories belong to the right players.

Commands are for Windows from the repository root, as in `CLAUDE.md` (on macOS or Linux use
`./.venv/bin/python`).

## 0. Inputs you need
| File | Made by | Check |
|---|---|---|
| `data/raw/*.csv.gz` | `python -m src.data.acquire` | checksums match `data/raw/MANIFEST.json` (the command verifies them) |
| `data/processed/model_dataset.parquet`, `player_universe.parquet`, `audit_lookup.parquet`, `build_metadata.json` | `python -m src.data.build_dataset` | `build_metadata.json` has `"n_eligible": 5820` |
| `data/processed/predictions/oof_full_hgb_tuned.parquet` and `oof_performance_hgb_tuned.parquet` | the original full `python -m src.models.train` run | file names have **no** `_quick` suffix |
| `models/*.joblib` (only for the API step) | `python -m src.models.final` | `GET /health` lists four models |

If the two `oof_*_hgb_tuned.parquet` files are missing, the held-out estimates cannot be exported
without re-running cross-validation (`src.models.train`, hours, Optuna inside every fold). That is a
retraining decision for you, not a step of this check. The export still works without them, but the
held-out checks below will FAIL by design.

## 1. Generate the export
```bash
./.venv/Scripts/python -m src.product.players
```
Expected last line:
```
Wrote 5820 player profiles to web/src/data/generated/players.json
```
A warning "No cross-validation predictions" means step 0's prediction files are missing.
The file is git-ignored; `git status` must not list it.

## 2. Verify it
```bash
./.venv/Scripts/python -m src.product.verify_players
```
Every line must start with PASS, and the last line must read `24/24 checks passed` (the command
exits 1 otherwise). The figures these checks must reproduce come from committed outputs:

| Check | Must show |
|---|---|
| one profile per modelling-population player | 5820 profiles, 5820 unique ids, 5820 players in model_dataset |
| population size matches the registry | 5820 vs n_training_rows 5820 |
| observed market value equals the model target | max abs difference €0.00 |
| Model A / B CV predictions belong to the right players | 5820 joined rows; target in predictions file equals log(market value): True |
| exported held-out estimate equals exp(prediction) | max difference ≤ €0.50 |
| Model A held-out accuracy reproduces the registry | log_rmse 0.5255, log_mae 0.4059, log_r2 0.8913 (each ± 0.0005) |
| Model B held-out accuracy reproduces the registry | log_rmse 0.9170, log_mae 0.7253, log_r2 0.6689 |
| Model A raw signed gap reproduces the audit | +0.0968 (published 0.0968) |
| Model B raw signed gap reproduces the audit | +0.2134 (published 0.2134) |
| percentiles recomputed by counting within position agree | max difference ≤ 0.05 points |
| peer group sizes match errors_by_position_full.csv | Attack 1583, Defender 2065, Goalkeeper 485, Midfield 1687 |
| history contains the target valuation | 0 players where it does not |
| no valuation after the snapshot date | 0 players |
| the 8 published showcase players match their full-export profiles | 0 differences |

Why these prove alignment: if estimates were joined to the wrong players, the accuracy and gap checks
could not reproduce the published figures (the test suite shifts estimates by one player and they fail).
The percentile check recomputes every value by counting, independently of the export's ranking.
The history check requires each player's own target valuation, with the same date and value, to sit
in their own history.

## 3. Verify the served API (optional, needs `models/*.joblib`)
```bash
./.venv/Scripts/python -m uvicorn src.api.app:app --port 8000
```
In a second terminal:
```bash
./.venv/Scripts/python -m src.product.verify_players --api http://127.0.0.1:8000
```
Adds three checks, `27/27` in total:
- **API serves the registered models**: `status ok, dataset 91174c392a8be652`.
- **Served Model A reproduces the published showcase estimates**: max relative difference below 1e-5.
  This compares against `reports/explainability/shap_local_representative_players.csv`.
- **API explains 20 random players with both models**: 0 failures. Every explanation must add up to
  its prediction.

## 4. Look at it
```bash
cd web
npm run dev
```
- Masthead, with the API from step 3 running: green **Model online**. With it stopped: red
  **Model offline**. It is never green for anything else (D-036).
- `/players`: header reads "All 5,820 players in the modelling population" and Source "Full export".
- `/players/849520-santiago-castro`:
  - market value **€32M**, World Class;
  - Club now filled in;
  - hero estimate labelled "Model A · held-out estimate";
  - radar "Compared with 1,583 attackers";
  - Valuation history present, its highlighted point equal to €32M.
- `/players/605184-jean-clair-todibo`: market value **€22M**; radar compared with 2,065 defenders.
- With the API running, the profile's Market and model panel says "Live: served estimates from the
  prediction API (fairvalue-regressor_A-hgb_tuned-91174c39-20261104)". Its served Model A figure for
  Castro must equal the showcase value, €39.7M.

## 5. Before sharing or deploying
The export holds every player's name, values and audit group. It is git-ignored and must stay out of
commits and public images unless you decide otherwise (see `docs/PROJECT_STATE.md`, open items).
Note that `docker compose up --build` copies it into the web image if it exists when you build
(`next.config.ts` traces it so the containerised site can show the full board). Delete or move it
first if the image will leave your machine.
