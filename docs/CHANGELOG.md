# Development changelog

## 2026-11-05: Portrait sourcing and Sprint 2 audit (branch `feat/multipage-experience`)
- **Portraits (D-043):** the finder works with the owner's contact and was run on all 5,820 players.
  3,674 have an allowed licence, 2,765 at ≥ 800 px and 1,755 at ≥ 1,400 px. The finder was fixed
  (file-name decoding, batching, retries, UTF-8) and has a regression test.
- **Sprint 2 audit:** the product was audited on the full export. `docs/ROADMAP.md` now holds the
  backlog S2-01 to S2-10 with evidence, acceptance criteria and sizes. Two P0 regressions from the
  full-population switch were found: no published explanations in the full export (the Overview
  cover is gone), and a hard-coded spectrum axis that hides 8 of 10 markers. Not implemented yet;
  this waits for approval.

## 2026-11-05: Release foundation and identity assets (branch `feat/multipage-experience`)
- **Roadmap:** `docs/ROADMAP.md` is now the single plan: the research milestones plus product
  Sprints 0–6, each with status, priority, dependencies, acceptance criteria and blockers.
- **Sprint 0:** CI is green on the pushed integration commit. The Docker Compose stack runs with a
  Caddy edge proxy (D-041), and the player index drops from 1.78 MB to 320 KB. The containerised
  API passes 27/27. Configuration is documented in DEPLOYMENT.md.
- **Sprint 1 (D-042):**
  - Nationality flags (dossier only) and league flags (Explorer, dossier, League board, Compare)
    from flag-icons (MIT).
  - Asset coverage report `src.product.asset_coverage`: flags 99.6% and 14/14 leagues; portraits,
    shirt numbers and crests 0.
  - The portrait finder is blocked by Wikimedia's User-Agent policy; shirt numbers and crests are
    blocked for the documented reasons.
- **Tests:** web 108 (+4), Python 137 (+1); production build passes.

## 2026-11-05: Full-population integration (branch `feat/multipage-experience`, not pushed)
- **Data:** the full export was generated locally from the existing dataset and held-out
  predictions: 5,820 players. `verify_players` passed 24/24, and 27/27 against the live API. No
  acquisition, rebuild, retraining or cross-validation was run.
- **API:** the local binaries are served with dataset `91174c392a8be652`. Predict and explain work
  for Models A and B through the web proxy. A nationality field gets 422, GET /predict gets 405, an
  unknown player gets 404, and the stopped service gets 503 with "Model offline".
- **Fixes (D-040):**
  - Dense scatters for the full population (Market Landscape 5.3 MB to 400 KB).
  - Live SHAP in the Comparison Studio for players without published explanations.
  - The dossier's live line names both served models.
  - The narrow-screen rail no longer stretches.
- **Tests:** web 104 (+6), Python 136 passed with data present; typecheck and production build pass.
- **Performance (production server, full export):** pages answer in 35 to 85 ms, gzipped at 10 to
  97 KB. The server uses about 185 MB of memory. `/api/players` is 1.8 MB uncompressed (D-040).

## 2026-11-05: Brand identity (branch `feat/multipage-experience`, not pushed)
- **Identity (D-039):**
  - Big Shoulders and Archivo (expanded labels) replace Barlow; Source Serif is kept for reading.
  - A solid/outline grammar for observed vs model, residual ▲/▼, tier gauge and gold ID plates,
    shared by every chart and table.
- **Overview:**
  - A cover with a broadcast score bug and the solid/outline headline with its key.
  - A cover valuation (observed, Model A, residual, journey ribbon) and a market band.
  - Doors, a numbered spectrum section, a Stories-style finding band, and the directory.
- **Stories:** outline chapter numerals, reading progress, a two-act research story around a
  stat-duel interstitial, a verdict on the valuation stage, and the grammar on sparklines.
- **Terminal:**
  - Explorer rows carry markers, the residual indicator and the tier gauge.
  - A phone layout keeps who, observed and Model A.
  - Comparison ladder in the grammar with player stripes; a readable matrix with a pinned input
    column.
  - Table row headers are no longer sticky.
- **Dossier:** larger name and observed value in chalk, Model A estimates with markers and
  residuals, tier gauge, more readable journey rows. Narrow journeys now keep a usable track (a
  container-query fix).
- **QA:** the unstyled capture traced to an orphaned server serving a deleted build; documented.
  The head-to-head scale's 5px mobile overflow is fixed.
- **Tests:** web 98 (+3 marks), Python 125; production build passes.

## 2026-11-05: Three experiences (branch `feat/multipage-experience`, not pushed)
- **Architecture (D-038):**
  - Overview, Terminal and Stories behind a persistent switcher, with a transition per crossing
    (reduced motion respected).
  - ⌘K command palette over players, workspaces and stories.
  - The player dossier is shared, with a `?from=` context bar.
  - `/players`, `/studio` and `/fairness` redirect into the Terminal.
- **Terminal:**
  - Shell with a workspace rail, status strip, coverage and build information, and `g` shortcuts.
  - Player Explorer: URL-state filters including numeric ones, sortable table and cards,
    comparison tray, watch, inspector.
  - Comparison Studio: value ladder, explanation matrix, trait lanes, record, history.
  - Watchlists, stored in this browser only, with JSON export.
  - Market Landscape, League Landscape and Discrepancy Explorer.
  - The studio and the observatory, moved in.
- **Valuation Journey:** an interactive SHAP waterfall. Running € = exp(base + Σ contributions);
  additivity is checked; Model B is offered only when it can be explained. It appears in the
  dossier, inspector, stories and Overview.
- **Stories:**
  - A cover page.
  - A scroll-driven research story and a scroll-driven valuation story for each showcase player.
  - Two head-to-heads and a market story.
  - Spotlight shown as not published, with the reason.
- **Overview:** featured valuation (journey ribbon), market snapshot with a league board, doors
  into Stories and the Terminal, the audit finding, directory and live model check.
- **Export:** `research.json` gains `market` (held-out error by position, tier, minutes and league;
  league sizes and medians; no group columns).
- **Tests:** web 95 (+26: routing, stores, explorer query, journey arithmetic against all 8
  published explanations, stories registry, goalkeeper rule, switcher); Python 125 (+1 market export).

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
