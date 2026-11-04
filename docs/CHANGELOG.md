# Development changelog

## 2026-11-05: Product-design correction (branch `feat/multipage-experience`, not pushed)
- **Direction (D-037):** a scouting-console language replaces the editorial hero-and-sections
  pattern in the analytical rooms. Compact title bars, panel grids and source badges; far smaller
  display type.
- **Players:**
  - The profile is a dossier: one header card holds the frame, identity, valuation and record strip.
    Panels for A vs B, traits, history, SHAP and audit sit in a grid.
  - The board is a database of comparable cards, with a table view.
  - A monogram frame replaces the silhouette.
- **Studio:** a workstation with designed ready, loading, live, offline and cached states. The eight
  research players are presets whose published results show, labelled cached, when the API is down.
- **Observatory:**
  - A headline-gaps strip (A, B, A−B, MAE gap).
  - A multi-chart stage per view, including the new SHAP group-gap chart, league sample sizes,
    accuracy against direction, and largest-error shares.
- **Overview:** a compact hero with three pathways and key figures. The market-vs-model spectrum of
  real players links to their dossiers, and room tiles carry real previews.
- **Fixes:**
  - The landing card no longer says "Live" unless the health verdict is online.
  - A CSS-module guard test found five more dead `.num`/`.prose` rules.
- **Tests:** web 69, Python 124 (11 skipped without data).

## 2026-11-05: Completing the player experience (branch `feat/multipage-experience`, not pushed)
- **Service status (D-036):**
  - `/api/health` verifies the upstream against the research registry and returns a verdict:
    online, unverified or offline.
  - One shared status feeds the masthead, studio and profiles. The studio auto-values only a
    verified service.
  - Served figures are labelled live, live and unverified, or cached research result.
  - Fixes a QA stub being shown as "Model online".
- **Real-data verification:**
  - `python -m src.product.verify_players` runs 24 checks, 27 with `--api`. It proves held-out
    estimates, percentiles and histories belong to the right players.
  - It reproduces the registry's held-out metrics, the published raw gaps and the published
    position counts.
  - Steps and expected output are in `docs/PLAYER_EXPORT_VERIFICATION.md`. Not yet run on real data.
- **Portraits:**
  - `scripts/portraits/find_candidates.py` finds candidates via Wikidata P2446 → P18 and checks
    each Commons file's licence. The output is a review sheet only.
  - `scripts/portraits/add_portrait.py` checks licence, transparency and size, then writes the
    manifest entry.
  - Allow-list widened to every CC BY / BY-SA version. The shortlist is in `docs/PLAYER_ASSETS.md`.
  - The attribution credit moved off the figure.
- **Tests:** Python +20 (verifier passes a correct export and fails four kinds of misalignment;
  licence rules; candidate verdicts; image checks); web 67 (+8: verification rules, masthead states,
  unverified handling).

## 2026-11-05: Player experience (branch `feat/multipage-experience`, not pushed)
- **Rooms:** `/players` board and `/players/[id]` profile added as room 02 (D-035); room numbers now
  come from the registry.
- **Data:** `src/product/players.py`. Committed showcase of the eight published representative players
  (`web/src/data/players.json`); full local export for the whole population (git-ignored). Window
  counts are recovered exactly from per-90 rates. Traits are within-position mid-rank percentiles of
  existing features, and peer deciles are included. Held-out and served estimates are kept apart.
- **Profile:** stadium backdrop in CSS/SVG, role-code glyph, portrait slot with a licensed-cutout path,
  pointer parallax, market vs Model A/B panel with live `/predict` and `/explain` and an offline
  fallback to the published SHAP, interactive radar with decile strip, valuation-history chart, audit
  context, and shared-element transitions from the board.
- **Assets:** portrait manifest with a licence allow-list and validation tests; `docs/PLAYER_ASSETS.md`.
- **Fixes:** `.num` selectors in CSS modules were hashed and never matched (footer, mobile menu,
  methods contents); now `:global(.num)`.
- **Tests:** Python +11 (showcase, percentiles, window counts, full export on synthetic frames); web
  59 passed (+11: helpers, URL parsing, portrait gate, radar, valuation panel offline/live).

## 2026-11-05: Multi-page experience (branch `feat/multipage-experience`, not pushed)
- **Structure (D-034):** four rooms with their own compositions. Overview (live streamed specimen,
  figures ledger, headline finding, room directory); studio as a viewport-height workbench with
  auto-valuation, Model A/B duel and SHAP; fairness observatory as an instrument with seven
  URL-addressable views, model overlay, league sorting and a definitions dialog (replaces the
  anchor-scroll explorer); methods as a light-paper publication with abstract, numbered sections,
  scroll-spy contents and margin notes.
- **Shell:** numbered room navigation with a morphing active indicator, mobile room sheet (inert
  background, Escape, closes on navigation/resize), model-service status, directional route
  transitions (React ViewTransition, off under reduced motion), designed 404 and error pages.
- **Fixes:** ValueRuler no longer blows out grid parents; the landing page's "live" estimate is no
  longer served from an hour-old cache; methods limitation figures are read from `research.json`;
  a home-page claim that contradicted the R² results was corrected; paper-theme small text meets AA.
- **Tests:** web 48 passed (room routing, observatory URL state, studio auto-run and its race);
  Python 93 passed, 11 skipped (no dataset or model binaries in this checkout).

## 2026-11-05: Product experience (branch `feat/product-experience`, not pushed)
- **API:** `POST /explain` (per-prediction SHAP, additivity enforced) and `GET /metadata` (D-033);
  optional CORS via `FAIRVALUE_CORS_ORIGINS`; `original_feature` moved to `src/features/preprocess.py`.
- **Export:** `src/product/export.py` writes `web/src/data/{research,openapi,catalog}.json` from
  committed outputs; staleness test added (D-032).
- **Web app (`web/`):** landing page with a live estimate, valuation studio, fairness explorer and
  methods page. See `docs/PRODUCT.md`.
- **Containers:** `web/Dockerfile` (Next.js standalone) and `docker-compose.yml`. The compose stack was
  built and smoke-tested locally: predict and explain through the proxy, 422 on a nationality field,
  all pages 200, clean 503 when the API is stopped.
- **CI:** new `web` job (typecheck, tests, build); the Docker job also smoke-tests `/explain` and the
  compose stack. Not yet run on GitHub (branch not pushed).
- **Tests:** Python 94 passed, 10 skipped (no dataset in the new checkout); web 39 passed.

## 2026-11-05: GitHub and first CI run
- Private repository `17mohak/fairvalue` created (owner-approved); `main` pushed.
- First CI run passed both jobs in about 6 minutes: unit tests; data acquisition reproduced the committed
  checksums; data/leakage tests; quick training and gate (identical numbers to the local run); refit;
  Docker build and smoke test. No image was published.

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
