# Decisions log

Each entry: what was decided, why, and what it affects. Status is one of
**Decided** (reversible engineering default), **Needs sign-off** (affects the
research question or fairness validity), or **Open**.

---

## D-001 Acquire data from the maintainer's public bucket, not Kaggle — Decided
- **What:** `src/data/acquire.py` downloads per-table `.csv.gz` files from the
  dcaribou/transfermarkt-datasets public R2 bucket and writes `data/raw/MANIFEST.json`
  (URL, bytes, SHA-256, download time). The manifest is committed; the data is not.
- **Why:** No Kaggle credentials exist on this machine. The R2 bucket is the
  maintainer's primary distribution (Kaggle is a mirror of it). Per-table files let
  us skip `game_lineups` (126 MB) and `club_games`, which nothing uses.
- **Note:** The bucket returns HTTP 403 to Python's default user agent; the script
  sends `fairvalue-research/0.1`.

## D-002 Repository layout and dependencies — Decided
- Layout follows the brief (`src/data`, `src/features`, `src/models`, `src/fairness`,
  `src/monitoring`, `src/api`, `tests`, `docs`). `src` is imported as a package;
  pytest adds the repo root to the path.
- Only dependencies that are installed and exercised by tests are pinned in
  `requirements.txt`. MLflow, Optuna, Fairlearn, SHAP, DiCE, Evidently and FastAPI are
  listed (unpinned) in `requirements-later.txt` until their milestone.
- Raw files stay compressed CSV as published; processed tables are Parquet (typed, small).

## D-003 Profile columns excluded from features — Decided
| Column | Reason |
|---|---|
| `country_of_citizenship`, `country_of_birth`, `city_of_birth` | Demographic (ER2). Audit table only. |
| `international_caps`, `international_goals`, `current_national_team_id` | Earned through a national team, so they encode nationality (strength of national team, confederation competition schedule). Also scraped "as of now", not as of the valuation date. |
| `highest_market_value_in_eur` | Derived from the valuation history; often equals the target. Target leakage. |
| `contract_expiration_date`, `agent_name` | Recorded as of the scrape, not as of the valuation date; 37% / 46.5% missing. Could be reconsidered later with care. |
| `players.current_club_*` | Club at scrape time; we use the club recorded on the valuation row instead (D-012). |

## D-004 Nationality → confederation mapping rules — Decided
File: `src/data/mappings/country_confederation.csv` (202 rows, one per distinct
`country_of_citizenship` string). Code: `src/data/nationality.py`.
- **R1** Football confederation membership, not geography (Israel, Kazakhstan → UEFA;
  Australia → AFC; Guyana, Suriname → CONCACAF).
- **R2** Confederation members that are not FIFA members (Guadeloupe, Martinique,
  French Guiana, Saint-Martin, Sint Maarten, Bonaire) keep their confederation, flagged `fifa_member=False`.
- **R3** Territories in no confederation (Monaco → UEFA, Réunion → CAF) assigned by geography, flagged.
- **R4** Dual nationals: the dataset stores **one** citizenship per player. We use it as given; a
  "UEFA if any citizenship is UEFA" rule is impossible with this data. See D-005.
- **R5** Missing citizenship → `UNKNOWN`, excluded from comparisons but always counted.
- **Source:** written from FIFA / confederation membership as of 2026. **Independent check:**
  the dataset's own `national_teams.confederation` agrees with the mapping for all 123
  countries it labels (Laos has no upstream label).
- Unmapped values raise an error, so a new spelling after a data refresh cannot be
  silently classed as non-UEFA.

## D-005 Audit group is defined from recorded citizenship — Decided (sensitivity check planned)
- `audit_group` = UEFA / non-UEFA from `country_of_citizenship`.
- Evidence on the single-citizenship limitation: of 3,260 players with a current national
  team, the national team's confederation disagrees with the citizenship group for 3
  (0.1%); 149 have national teams missing from `national_teams`. This only covers
  internationals, so it is weak evidence.
- 376 of 1,496 eligible non-UEFA players (25%) were born in a UEFA country
  (e.g. 65 Morocco, 22 Algeria, 21 DR Congo citizens). The "non-UEFA" group mixes
  migrants and European-raised diaspora players. Planned: report fairness metrics
  for both sub-groups as a sensitivity analysis.

## D-006 Prediction point and target snapshot — Decided
- `snapshot_date` = last valuation date in the data = **2026-06-12**.
- Target = each player's latest valuation in **(2025-06-12, 2026-06-12]**.
  `players.market_value_in_eur` is not used directly: it equals the latest valuation
  for 100% of 41,528 players, but that valuation can be years old (9,693 players were
  last valued in 2023), so it would mix stale targets in.

## D-007 Drift reference snapshot is disjoint from training — Decided
- Drift reference = latest valuation per player in **(2024-06-12, 2025-06-12]**
  (18,243 players), written to a separate file. Windows cannot overlap by construction,
  and a test asserts it. Earlier valuations are never used as features.

## D-008 Per-player feature window ends at that player's valuation date — Decided
- Match stats use club matches in the 730 days up to and including the player's own
  valuation date. Using a global cut-off instead would let matches played after a
  player was valued influence their features.

## D-009 Per-90 rates require ≥ 450 minutes; modelling population requires it too — Decided
- Below about five full matches, per-90 rates are noise. Players under the threshold
  are excluded from the modelling population rather than imputed.

## D-010 National-team matches excluded from performance features — Decided
- `appearances` includes World Cup (`FIWC`) and AFCON (`AFCN`) matches (3,027 rows).
  Only African players can play AFCON, so including it would put nationality into
  the features. Only club competitions are aggregated.

## D-011 Research population and scope — **ACCEPTED 2026-11-04**
- **Decision:** Option E, a selection-aware within-league design. The binding specification is
  `docs/RESEARCH_DESIGN.md` (population, research questions, models, metrics, limitations).
  Evidence: `docs/reports/RESEARCH_SCOPE_ASSESSMENT.md`, `reports/scope/`.
- **Population:** players valued at clubs in the 14 covered leagues, >= 450 minutes (n = 5,820);
  900-minute sensitivity; all 19,364 currently valued players for description only.
- **Rationale:**
  - The covered leagues are the only ones with performance data, so "comparable performance"
    can only be tested there.
  - Within-league overlap is good (>= 94% of non-UEFA players matched in every league).
  - Modelling all leagues would let league identity almost recover the group (AUC 0.859) without
    performance controls.
  - Adding external data would break the locked dataset decision.
- **Accepted limitation:** the population is selected (16.7% of currently valued non-UEFA players
  vs 41.6% of UEFA). Findings are not generalised to the global market. The direction of any
  selection effect is not assumed (RESEARCH_DESIGN §9).

### Original D-011 note (initial finding, kept for history)
- **Finding:** `appearances` only covers 14 European leagues (BE1, DK1, ES1, FR1, GB1,
  GR1, IT1, L1, NL1, PO1, RU1, SC1, TR1, UKR1) plus cups. Players valued while at
  clubs in Brazil, Argentina, MLS, Japan, Saudi Arabia, etc. have no player-level match data.
- **Effect:** non-UEFA players with a current valuation drop from 8,969 to 1,842 when
  restricted to covered leagues (−79%); UEFA players drop from 10,395 to 5,536 (−47%).
- **Decision taken (reversible):** model only covered-league players. The research
  question becomes: *"Among players at clubs in 14 European leagues, does a model
  trained without nationality produce systematically different errors for UEFA vs
  non-UEFA nationals?"* This is a narrower but better-controlled comparison (same
  leagues, same data source for performance).
- **Alternative considered:** include all leagues with profile-only features (age,
  position, height, league). Rejected for the main model: it would compare players
  with and without performance data and make "comparable performance" untestable.
  Could be a secondary analysis.
- **Survivorship implication:** non-UEFA players in European leagues are a selected group
  (they were good enough to be signed abroad). Raw median value is *higher* for
  non-UEFA (€2.5M) than UEFA (€2.0M) eligible players. This describes selection, not fairness.

## D-012 League and club taken from the valuation row — Decided
- `player_valuations` records the club and league at the time of each valuation. We
  use those instead of `players.current_club_*`, which reflects the scrape date.

## D-013 Club strength proxy: points per league game — Decided
- `club_ppg` = mean league points of the valuation club over the 365 days up to the
  valuation date (from `games`). `clubs.total_market_value` is 100% null and a club's
  squad value would include the player's own value anyway (target leakage).
- `club_ppg` and league identity are reputation proxies; they are excluded from
  Model B (performance-only) for the ablation.

## D-014 Data quality handling — Decided
See `reports/data_quality.csv`. Key items: 2 orphan appearances (dropped by inner join);
one zero valuation (2008, outside window; eligibility also requires value > 0);
449 of 161,548 player-games where appearance goals ≠ goal events (0.3%, tolerated);
3,327 future-dated transfers (transfers not used).

## D-015 Recency and club-continuity features (from independent review) — Decided
- An independent read-only review of the pipeline found no blocking bugs. It confirmed:
  0 eligible players with matches after their valuation date, 0 duplicate player-games,
  disjoint windows, and correct per-90 maths. It flagged stale/partial windows (100 eligible players
  had no minutes in the year before valuation; 19.3% played under half their window minutes for
  their valuation club).
- Added `minutes_last_365`, `days_since_last_match`, `valuation_club_minutes_share` as features
  (all known at valuation time) rather than excluding these players. Added the audit-only
  `recent_arrival` flag. Added `UCOL` to international club competitions (no rows today).

## D-016 Measure proxy strength instead of assuming blindness — Decided
- `src/fairness/coverage.py::proxy_strength` reports how well the allowed features predict
  the audit group (CV ROC AUC 0.671 Model A, 0.644 Model B). The leakage tests prove
  nationality is not an input; this measurement shows how much group information the
  remaining inputs still carry. Both are needed.

## D-017 Log-scale regression target — Decided
- Model ln(market value): skewness 4.86 raw vs 0.11 log. Back-transform with exp() (median-type
  prediction, no smearing). Metrics on both scales; log is primary.

## D-018 Tier labels: €2M / €10M / €30M — Decided
- Cut at the 50th/80th/95th percentiles of the primary population (round values because the source
  values are rounded). Quartiles were rejected: they would label the top 25% (≥ €7M) "World Class",
  which is not credible. The top tier holds 345 players (94 non-UEFA), enough for per-tier
  metrics with CIs. Boundaries are a fixed label definition, computed once; no features involved.

## D-019 Validation, tuning, model selection — Decided
- 5-fold StratifiedKFold on tier (seed 42); all metrics on out-of-fold predictions.
- Optuna nested inside outer folds (inner 3-fold, 25 trials).
- Primary fairness model = lowest CV log-RMSE under Model A; the same algorithm for Model B.
- The Model A/B ablation is retained as RQ4 and is not optional.

## D-020 Fairness estimation — Decided
- Residual = actual − predicted (positive = underprediction), log and EUR scales.
- League-stratified difference weighted to the non-UEFA league mix.
- Stratified bootstrap 95% CIs (2,000 reps); no significance thresholds.
- EU-mobility is an exploratory stratum only; the primary contrast stays UEFA vs non-UEFA.

## D-021 Tier fairness: ER1a / ER1b — Decided (resolves S-6)
- ER1a = error-rate difference. ER1b = per-tier one-vs-rest TPR/FPR and EOD_k via Fairlearn on
  binarised labels, plus directional under/over-tier rates. Demographic parity is supplementary,
  shown against base rates.
- The spec's ~10 pp is a reference only; no compliance is claimed.

## D-022 DiCE approach — Decided (resolves S-4)
- No nationality counterfactual: the model does not use nationality, so it is undefined
  (invariance tested).
- Feature-based DiCE counterfactuals on the tier classifier, mutable = match statistics,
  compared across groups. No auxiliary model containing nationality is trained.

## D-023 Fixes from the independent review of modelling/audit code — Decided
- **Bug fixed:** `recent_arrival` is stored as object dtype, so `~` produced -1/-2 and the
  "established" stratum selected everyone. It is now cast to bool in `load_frame`, with a
  regression test. The bug only affected quick (smoke-test) outputs; all reported results were
  produced after the fix.
- All bootstrap blocks now use the full 2,000 replicates (some had used 500).
- The primary-model rule now uses mean fold log RMSE, exactly as the spec says. It was applied
  from saved held-out predictions (`select_primary`), and the pooled-RMSE ranking agrees.
- Small strata (< 30 non-UEFA) are flagged, and the share of non-UEFA players dropped by stratified
  gaps is reported. Max-EOD bias and multiplicity are documented in RESEARCH_DESIGN §7.

## D-024 Supplementary check: gap within predicted-value deciles — Decided
- Residuals correlate with value and the groups' value distributions differ. The signed gap is
  therefore also reported stratified by deciles of the model's own prediction (not the true value,
  which would condition on the outcome), and by league × decile.
- This is a robustness check for RQ2, not a new metric or a design change.

## D-025 First full results recorded, design unchanged — Decided
- First full run: 2026-11-04 (`docs/reports/MODEL_EVALUATION.md`, `docs/reports/FAIRNESS_AUDIT.md`).
- The primary signed gap is positive (non-UEFA under-predicted relative to UEFA). That is the
  opposite of the original hypothesis, and it is reported as found.
- The design is not revised in response to the result.

## D-026 Supplementary validation: club grouping, clustered CIs, small tier cells — Decided
- Three checks run as **supplements**; the primary protocol is unchanged (`docs/reports/SUPPLEMENTARY_CHECKS.md`).
- Grouped-by-club CV: Model A HGB log RMSE is +8.7% for unseen clubs (0.527 → 0.573); Ridge is +1.5%.
  Unseen-club performance is reported alongside the primary figures. The fairness gap is unchanged.
- Club-clustered bootstrap: CI widths are 0.84–1.18 × the player-level widths, and the signed gaps
  stay clearly positive. Model A's ER1a lower bound reaches 0, so ER1a is not described as clearly non-zero.
- Per-tier EOD: World Class TPR minimum detectable difference is about 16 pp (94 non-UEFA players).
  World Class and Elite components are reported as imprecise and not interpreted as evidence of
  fairness or unfairness.

## D-027 Serving models: full-data refit with median tuned settings — Decided
- The served regressor is the pre-specified primary algorithm refit on all 5,820 players, using the
  median of the per-fold Optuna optima (one fixed setting; no extra tuning on all data).
- Its performance claims are the held-out CV results; a full-data refit has no held-out data of its own.
- `models/model_registry.json` records versions, settings, features, the dataset fingerprint and
  those CV metrics. `final.py` refuses to refit if the dataset fingerprint changed.

## D-028 Second independent review: fixes and full re-run — Decided
- Fixes:
  - Python `None` is now treated as missing in categorical features (the 49 unknown-foot players
    were a separate `None` category before);
  - API ranges match the training data;
  - DiCE holds European-cup share fixed and keeps minutes consistent;
  - the drift decay model uses default settings.
- The preprocessing fix reorders one-hot columns. Because gradient boosting subsamples features,
  results shift slightly. **Every reported result was regenerated from the committed code**
  (`scripts/run_pipeline.sh`), and documents were updated to the re-run numbers.

## D-029 Docker image: verified locally (after an engine fault was resolved) and built in CI — Decided
- Docker Desktop on the development machine fails to start: its Model Runner cannot remove a stale
  socket file. The offered fix, factory reset, would delete the owner's images and containers, so it
  was not done without approval.
- The image contents were first verified with a container-equivalent run. After the owner rebooted
  and enabled virtualization, Docker Engine 29.2.0 started. The real image was then built and
  smoke-tested locally: health, predict, nationality rejected, non-root user, HEALTHCHECK healthy.
  CI repeats this on every push (no push to any registry).

## D-030 DiCE mutable features — Decided (refines D-022)
- Mutable: goals_p90, assists_p90, minutes, start_share. European-cup minute share is treated as
  club context and held fixed, consistent with RESEARCH_DESIGN §8.
- Minutes are bounded by minutes in the last 365 days and by the training maximum minutes per appearance.

## D-031 DiCE is bounded and non-blocking — Decided (2026-11-05)
- The full DiCE analysis (720 queries) took 83 minutes, so DiCE must not block the pipeline or deployment.
- The module now has a wall-clock limit (`--max-minutes`), per-player checkpointing, and a small
  default demonstration. Runs that stop at the limit are labelled incomplete in `dice_run_meta*.json`.
- `scripts/run_pipeline.sh` runs the full analysis only with `WITH_DICE=1`.
- The completed full run is kept as the reported result. No result was altered.

## D-032 Web product layer on top of the research — Decided (2026-11-05)
- A Next.js app in `web/` (TypeScript, CSS modules, Motion; tests with Vitest) is the product front end.
  The browser calls the app's own `/api/*` routes, which proxy to FastAPI server-side
  (`FAIRVALUE_API_URL`), so the backend address stays private and CORS stays off by default.
- Research figures reach the web app only through `python -m src.product.export`, which reshapes
  committed `reports/` tables, the model registry and the API's OpenAPI schema into
  `web/src/data/*.json`. A test fails if those files are stale. The app computes no new results.
- No retraining, no change to the population, metrics, features or the locked design (D-011).

## D-033 Per-prediction SHAP endpoint — Decided (2026-11-05)
- `POST /explain` runs SHAP TreeExplainer on the served regressor, the same method as the offline
  analysis (D-027), and returns contributions summed back to input features.
- It refuses (HTTP 500) if base + contributions differ from the prediction by more than 1e-4, so a
  wrong explanation is never shown. `shap` is optional at runtime: without it `/explain` returns 501
  and `/predict` is unaffected. `shap==0.46.0` is added to `requirements-api.txt` (same pin as
  `requirements.txt`).
- `GET /metadata` exposes valid inputs and model versions. `/predict` behaviour is unchanged.

## D-034 Four-room product structure — Decided (2026-11-05)
- The web app is organised as four routes with distinct layouts: Overview `/`, Valuation studio
  `/studio`, Fairness observatory `/fairness`, Methods `/methods`. No anchor-scroll imitation of pages.
- The observatory keeps its state (view, model, comparison overlay) in the URL query, so every view is
  linkable and works with refresh and back/forward. The page renders per request from that query.
- The studio values the illustrative starting profile automatically once `/health` reports the
  service up (never while it is down, never over the user's own edits).
- The landing page's live example is fetched uncached: it is labelled "live", so it must be.
- Presentation only: no research figure, model, feature, metric or API contract changes (D-011, D-032).

## D-035 Player profiles — Decided (2026-11-05)
- `/players` (board) and `/players/[id]` (profile) are a fifth room. Profiles use the served API
  (`/predict`, `/explain`) with each player's own model inputs: there is no second prediction system.
- **Data sources.** Committed: the eight players the explainability report already publishes
  (`reports/explainability/shap_local_representative_players.csv`), exported to
  `web/src/data/players.json` by `src.product.export`. Full population: `python -m src.product.players`,
  run where the dataset and the cross-validation predictions exist. It is written to a git-ignored
  path because it is per-player dataset content. Nothing is retrained.
- **Held-out vs served.** The served models were refitted on every player, so their estimate for a
  named player is in-sample. Profiles label it as such and show the out-of-fold (held-out) estimate,
  when exported, as the comparison with the observed market value.
- **Traits** are existing model features (goals and assists per 90, minutes over two years, start share,
  minutes in the last 365 days, European club minute share), ranked by mid-rank percentile within the
  player's position across the modelling population. Goalkeepers have no scoring axes. Passing,
  progression and defensive actions are not in the dataset and are not claimed.
- **No ranking by model error.** The board sorts by observed value, name or age, never by residual:
  a gap between market and model is not a verdict on a player (model card: not for scouting).
- **Audit group** appears only in the profile's audit-context panel, with the group-level result and
  the caveat that one player's residual is not evidence of anything.
- **Portraits** only from `web/src/data/portraits.json` with an allow-listed licence and attribution
  (docs/PLAYER_ASSETS.md); Transfermarkt's `image_url` is never read. None ship yet; a labelled
  silhouette holds the slot. Shirt numbers are not in the acquired tables (game_lineups is not
  downloaded), so the oversized glyph is the player's role code.

## D-036 Service status is verified, not assumed — Decided (2026-11-05)
- The site calls the prediction service **online** only when `/health` reports all four registered
  model versions and the dataset fingerprint from `models/model_registry.json`. A service that
  answers with anything else is **unverified** (amber, never green); unreachable or not loaded is
  **offline**. The check runs server-side in `web/src/app/api/health/route.ts`.
- One client-side status feeds the masthead, studio and profiles. A failed prediction marks the
  service offline at once; a success after an outage triggers a re-check rather than an assumption.
- Every served figure says where it came from: **live** (the verified service), **live, unverified**,
  or **cached research result** (published in `reports/`). Offline states name what is missing.
- Reason: during QA a replay stub answered `/health` and the site showed "Model online" for it.
  Test tooling must identify itself and must never pass as the model service.
- Portrait licences: the allow-list covers CC0, Public Domain Mark, CC BY and CC BY-SA 2.0–4.0, and
  `owned`. These all allow reuse in a product and derivative cutouts. NC, ND, fair use and GFDL-only
  are excluded. Candidates are found by Transfermarkt ID via Wikidata (P2446 → P18) and reviewed by a
  person before `scripts/portraits/add_portrait.py` adds them (docs/PLAYER_ASSETS.md).

## D-037 Scouting-console design direction — Decided (2026-11-05)
- The analytical rooms (players, studio, observatory) use one console vocabulary: compact title
  bars, panels with header rows, chips and a source badge (live, unverified, cached, offline), laid
  out in grids rather than stacked editorial sections. The overview is the product's front door;
  methods stays a paper. Identity is kept: pitch greens, chalk, sodium yellow, condensed type.
- No licensed portrait shows a labelled monogram frame; no person-shaped stand-in.
- Nationality (first-listed citizenship) is shown on profiles as information only, from the full
  export; it never enters a model input. The audit group stays in the audit-context panel.
- The studio offers the eight research players with real inputs. Without a verified live service
  they open on their published Model A result, badged "Cached research result · not live".
- New research visual: the SHAP group gap (mean SHAP non-UEFA minus UEFA per input, served model),
  captioned as a description of predictions, not causes, and not of the error gap.

## D-038 Three experiences: Overview, Terminal, Stories — Decided (2026-11-05)
- **Architecture.** One product, three environments behind a persistent switcher in the global bar:
  **Overview** (`/`, editorial and analytical in balance), **Terminal** (`/terminal/*`, the
  analytical workstation) and **Stories** (`/stories/*`, the editorial side; `/methods` belongs to
  it). The player dossier (`/players/[id]`) is shared: the same record everywhere, with a context
  bar from `?from=` as the only difference. This supersedes D-034's five numbered rooms.
- **Moves, with redirects:** `/players` → `/terminal` (Player Explorer), `/studio` →
  `/terminal/valuation`, `/fairness` → `/terminal/audit`. Studio and Observatory are unchanged
  inside; they now sit in the Terminal shell.
- **Terminal workspaces:** Player Explorer, Comparison Studio (2–4 players), Watchlists, Market
  Landscape, League Landscape, Discrepancy Explorer, Valuation Studio, Fairness Audit. Rail, status
  strip, ⌘K command palette, `g`-then-letter shortcuts.
- **Persistence:** watchlists, the comparison tray and recently viewed live in `localStorage`,
  labelled "this browser only, not synced". Accounts or server storage would need authentication
  and a database: backend work, out of scope.
- **Discrepancy Explorer** ranks players by residual (log observed − log estimate). This narrows the
  earlier rule that nothing sorts by residual (D-035): ranking happens only there, with the
  terminology fixed (positive = observed above the estimate, the model under-predicts), one basis
  per ranking (held-out with the full export; served and labelled in-sample with the showcase) and
  no "under/over-priced" language. The Explorer still sorts only by value, age, minutes and model
  estimate.
- **Market data:** `src.product.export` adds `research.json → market`: held-out error by position,
  observed tier, minutes band and league (`reports/models/errors_by_*`) and league size and median
  value (`reports/coverage/league_by_group.csv`). Audit-group columns are left out on purpose.
  Player-level charts (value vs age, estimate vs observed) use the current export and say when it
  is the eight-player showcase.
- **Valuation Journey:** an interactive SHAP waterfall on the model's log scale.
  Running estimate = exp(base + contributions so far), the exact inverse of `y = log(value)`
  (`src/models/train.py`, `src/api/app.py`). It is refused if base + Σ contributions misses the
  prediction by more than 1e-4. Model B can be explained only by the live service, so its toggle is
  disabled without one.
- **Stories** are built from committed outputs only: one research story, one market story, a
  valuation story per showcase player and two same-position head-to-heads. Standfirsts are
  generated from the data. Player Spotlight is listed but not published until licensed photography
  exists; covers are typographic and labelled "No licensed photograph".
- **Identity per environment:** Overview uses serif headlines on turf. Terminal is black and
  hairline-dense with tabular numbers. Stories is a black stage with broadcast-scale condensed type
  and serif reading text. Gold marks the selection in all three.
  Comparison colours: three validated slots plus a fourth, always with marker shapes and one row per
  player. Negative contributions use a restrained red (`--lower`).
- **Transitions:** React `<ViewTransition>` with a type per crossing:
  - into the Terminal, a top-down wipe;
  - into Stories, a cut up from black;
  - into the Overview or the dossier, a short rise;
  - between workspaces or chapters, a quick swap.
  Back and forward simply swap; reduced motion disables all of them.

## D-039 FairValue brand identity — Decided (2026-11-05)
- **Direction:** an independent football-intelligence publication and instrument, drawn from the
  Stories environment. One identity, three expressions:
  - Overview, the cover;
  - Terminal, the instrument;
  - Stories, the broadcast.
  The generic serif-headline, italic-gold and letter-spaced-eyebrow formula is retired.
- **Type** (all OFL, self-hosted by next/font). Three directions were tested on real content:
  Barlow Condensed/Barlow; Archivo across its width axis; Big Shoulders with IBM Plex.
  - Chosen: **Big Shoulders** (a condensed signage face) for display and big figures.
  - **Archivo** for the interface. Its expanded width (wdth 125) is the broadcast label style that
    replaces letter-spaced eyebrows.
  - **Source Serif 4** only for long-form reading in Stories and Methods.
  - Barlow and Barlow Condensed are removed. Big Shoulders has no next/font fallback metrics, so it
    names a narrow system fallback.
- **Grammar** (`components/brand/Marks.tsx`):
  - Observed value is a solid chalk disc; Model A a gold outline diamond; Model B a dashed diamond.
  - The same duality runs through the type: solid for what the market says, outline for the model.
    The Overview headline states it.
  - Residual: ▲ gold when observed is above the estimate (the model under-predicts), ▼ slate when
    below.
  - Tier: a four-step gauge. Position code: a slanted gold ID plate (`.fv-role`).
- **Gold** marks player IDs, model estimates, selection, key statistics, broadcast tags and
  research highlights. Observed values are chalk.
- **Stories pacing:**
  - outline chapter numerals;
  - a scroll-driven reading-progress rule;
  - the research story split into two acts around a "same accuracy, different direction" stat duel;
  - a verdict on the valuation stage.
- **Not changed:** the Valuation Journey's calculation, the data, the models and the research
  outputs.
- **QA finding:** a capture that rendered with browser defaults came from an orphaned
  `next-server` process. It survived when its parent was killed and served a `.next` that had been
  deleted, so CSS requests failed. It was a QA-harness fault, not an app defect. Servers are now
  stopped by port, and PRODUCT.md warns about building or deleting `.next` under a live server.


## D-040 Full-population integration on real data — Decided (2026-11-05)
- **Context:** the multi-page product had only been run on the eight-player showcase. The local
  machine has the dataset, both `oof_*_hgb_tuned.parquet` files and the four model binaries.
- **Done without retraining or rebuilding data:** `python -m src.product.players` wrote 5,820
  profiles; `verify_players` passed 24/24, and 27/27 with the API running.
- **Fixes found by running the full export:**
  - The Market Landscape scatters drew 5,820 SVG circles with tooltips each, so the page was
    5.3 MB. Above 200 points the scatter now draws one path of round dots with rounded
    coordinates (400 KB in development, 97 KB gzipped in production). The eight-player showcase
    still gets labelled circles.
  - The Comparison Studio's explanation panel worked only for showcase players, which have
    published SHAP values. When fewer than two compared players have one, it now asks the live
    API for Model A explanations of all of them. One basis is used for every column, never a mix.
    Explanations that fail the additivity check are dropped, and the panel says so when the API is
    offline.
  - The dossier's "Live" line named only the Model A version. It now names every served model it
    shows.
  - On narrow screens the Terminal rail stretched to fill the empty height when results were short.
    The grid rows are now `auto 1fr`.
- **Not changed:** models, cross-validation, research outputs, metrics, residual definitions.
- **Known limit:** `/api/players` (the search, watchlist and compare index) is 1.8 MB of JSON.
  Next.js does not compress route-handler responses and strips a manual `Content-Encoding`. Gzip
  belongs to the reverse proxy or CDN in deployment.


## D-041 Compression belongs at the edge — Decided (2026-11-05)
- **Context:** `/api/players` (the index behind search, watchlists and compare) is 1.8 MB of JSON.
  Next.js compresses pages but not route-handler responses, and it strips a handler's own
  `Content-Encoding` header (tried and reverted in D-040).
- **Decision:** add a Caddy edge proxy (`deploy/Caddyfile`, `encode zstd gzip`) to the compose stack
  on host port 3000; `web` becomes internal. Responses Next already compresses pass through
  unchanged.
- **Result:** the index drops from 1.78 MB to 320 KB with gzip and decodes to all 5,820 players. The
  compose stack is healthy, and `verify_players --api` passes 27/27 against the containerised API.
- **For hosting:** the chosen platform must compress at its edge, or keep this proxy.

## D-042 Identity assets: flags yes, crests and shirt numbers no (for now) — Decided (2026-11-05)
- **Flags:** come from flag-icons (MIT), copied selectively by a script and mapped in
  `web/src/data/countries.json`. A test keeps the mapping, the shipped files and the league list in
  step.
  - Countries with no single settled flag are text only: Northern Ireland (the Ulster Banner is
    contested), Guadeloupe, Martinique, French Guiana and Bonaire.
  - Coverage: 5,798 of 5,820 players (99.6%) and 14/14 leagues
    (`reports/product/asset_coverage.md`).
- **Placement:** league flags appear in the Explorer, dossier, League board and Compare record.
  Nationality flags appear **only in the dossier**, where the audit-context panel explains the
  nationality grouping. They are kept out of residual rankings and tables, so the product does not
  invite reading a single player's residual as a nationality effect.
- **Shirt numbers:** not shown. They are not in the acquired tables, and the upstream `game_lineups`
  table is match-level. Showing them needs approval to acquire it and a rule for the number at the
  valuation date.
- **Crests:** not shown, because no licensed source exists. **Second nationalities:** not in the
  data.
- **Portraits:** the finder is blocked by Wikimedia's User-Agent policy (403). The owner supplies
  the contact. No personal details are sent on their behalf.


## D-043 Portrait sourcing works at population scale — Decided (2026-11-05)
- **Contact:** Wikimedia requires contact details in the User-Agent. At the owner's explicit
  request, the owner's email is passed through `WIKIMEDIA_CONTACT` for each run. It is never written
  to the repository.
- **Finder fixes:**
  - Full percent-decoding of Commons file names (bracketed names were missed).
  - Batched Commons lookups (50 per request).
  - Polite retries on 429 and 5xx.
  - UTF-8 console output.
  - The batched results are identical to the per-file lookup on the showcase.
- **Result on 5,820 players:**
  - 3,674 allowed licences: 2,765 at ≥ 800 px and 1,755 at ≥ 1,400 px.
  - 87 of the top 100 by value have an allowed image of at least 800 px.
  - Showcase: 4/8 meet the cutout standard.
- **Consequence:** the hand-cutout standard (≥ 1,400 px, transparent) would cover at most 1,755
  players and needs manual work for each one. Sprint 2 task S2-03 proposes a framed-crop rendering
  for scale. That needs the owner's decision, including the personality-rights stance before any
  public deployment.

## D-044 Owner accepts the risk of using FootyLogos player images; permission requests sent in parallel — Decided (2026-11-05)
- **Decision (owner):** proceed with player images from footylogos.com/player-pngs for now, credit the
  sources, and remove any image on request. Take-down will be handled if and when asked.
- **What is known:** FootyLogos publishes no licence for the player photos ("Database and site content
  rights reserved"; its rights page says it cannot authorize use on behalf of rights holders). Its FAQ says
  images come from league, competition and club image libraries, with a source label per image. A credit is
  not a licence, so this use is **unlicensed**. Personality rights are a separate issue and also open.
- **Why recorded:** it overrides the PLAYER_ASSETS.md rule that club and agency images need a written licence.
  The Wikimedia route (D-043, `research/portrait_sourcing/`, 190 CC BY-SA 4.0 portraits verified per file) remains
  the licensed fallback.
- **Mitigations:** keep the source label and credit per image in the manifest; keep a one-step removal path
  (manifest entry to monogram); send permission requests to leagues and clubs and keep any written reply
  outside the repository; do not deploy publicly without the owner's explicit go-ahead (CLAUDE.md).

## D-045 Valuation Theatre Overview, global player search, canonical dossier — Decided (2026-11-05)
- **Scope:** a frontend sprint only. No model, feature, dataset, metric or residual definition changed;
  every figure comes from `research.json` or the player export, as before.
- **Overview = five chapters** (Theatre, Market, Discrepancy, Players, Research). The hero is an original
  SVG pitch in perspective: its length is a log value scale fitted to the plotted values (this also fixes
  ROADMAP S2-02's clamped axis), and each lane is one real player with ● observed and ◇ Model A.
  - **Selection rules are stated on the page:** the seven most valuable players (ties at the cut taken in
    surname order, and the page says so); per position; per league. No player is picked by hand, and none
    is picked for the size of their residual.
  - Estimates are held-out (out-of-fold) in the full export and labelled "served, in-sample" in the
    showcase build. The raw gap (+0.097) and the league-stratified headline (+0.093) are shown and named
    separately. The MAE gap is shown with its CI, which crosses zero.
  - The hero does not depend on portraits; the monogram fallback is used everywhere.
- **No fourth environment.** Search stays global (header control, ⌘/Ctrl K, `/`), over the existing
  `/api/players` index; no new backend. It now ranks results (whole-word name > word start > substring >
  club/league/nationality, then observed value), has loading, empty and error/retry states, recent
  searches in `localStorage`, and passes `?from=` so the dossier's breadcrumb returns to the origin.
- **Amends D-042 for search only:** search rows show the recorded nationality, as the owner asked. Search
  rows show no residual. Everywhere a residual is shown (Overview hero, spotlights, league leaders,
  Explorer, Discrepancies), nationality stays off, as D-042 requires.
- **Dossier:** `/players/[id]` was already canonical and linked everywhere. It now declares
  `rel=canonical` (`/players/{id-slug}`) and has breadcrumbs (origin from `?from=`; "Overview" for a
  shared link), a Back button only after in-app navigation, and a sticky section index. The H2H story
  headers now link to it.
- **Motion:** CSS keyframes for the hero (plays before hydration, no layout shift); `motion` (already a
  dependency) for counters; IntersectionObserver reveals that hide nothing in server HTML. No GSAP or
  Lenis. Reduced motion now also zeroes animation and transition delays globally.

## D-046 Dossier opening: valuation lane and plain-language reading — Decided (2026-11-05)
- **Why:** the owner's product journey is Overview (curiosity) → search (find) → dossier (stay). The
  dossier opened on a large empty portrait frame and a small ruler.
- **Lane:** the Overview's theatre narrowed to one player (`DossierLane`): a pitch strip whose length is
  a log value scale fitted to this player's figures; a chalk line for the observed value; Model A and
  Model B on their own lanes, each with its residual arc. Basis labels (held-out, in-sample, live service
  only) are always shown, and a model with no stored estimate gets no marker. Pitch markings are now one
  shared helper (`pitchDrawing`) for the Overview and the dossier.
- **Reading (`lib/reading.ts`):** two or three sentences built only from stored figures: observed value,
  Model A (held-out, or labelled in-sample), the gap in percent and as a factor, compared with the
  registry's held-out typical miss, and Model B's context. It never calls a player under- or over-priced
  (tested), and ends with the caveat that a gap describes the model, not the player's worth.
- **Portrait:** without a licensed portrait, a small monogram badge sits by the name; the full frame
  column returns automatically when a portrait exists (S2-03 unchanged).
- **Names:** the reading uses the same short label as the Overview ("Vini Jr.").

## D-047 Valuation Journey as the dossier's centrepiece — Decided (2026-11-05)
- **Placement:** the journey is now the first section after the dossier's opening, at full width,
  and first in the DOM as well (keyboard and screen-reader order match the visual order). Model A vs B,
  traits, history and audit context follow.
- **Provenance up front:** SHAP runs only on the served regressor. The heading says which estimate is
  explained ("Why Model A says €197M"), whether it is live, live and unverified, or a cached research
  result, and why it differs from the held-out estimate in the header (the served model was refitted
  on every player, this one included).
- **Biggest movers:** the three inputs that raised and lowered the estimate most, from the full
  explanation (`movers()` in `lib/journey.ts`). Effects that would show as ×1.00 are left out. Display
  only: SHAP values as returned, nothing recomputed.
- **Loading:** a skeleton while the live explanation loads, never a number-shaped placeholder; the
  offline message is unchanged.

## D-048 Dossier in context: standings, neighbours, where the player appears — Decided (2026-11-05)
- **Standings:** where the observed value sits within the player's league and position, in plain words
  ("The highest observed value among 555 Premier League players", "Valued above 78% of …", "joint"
  when tied), with a log-scale histogram silhouette of the group (one bar per bin, not one mark per
  player, to keep the page light). Shown only for groups of 12 or more.
- **Observed values only:** counts and ranks of Transfermarkt values. Residuals are never ranked or
  compared between players here (model card); the page says so.
- **Near this valuation:** the closest observed values (log scale) in the same league, then the same
  position; replaces the old "More players" strip, which used the whole board. `?from=` is kept.
- **Where the player appears:** published Stories that include the player, the Player Explorer filtered
  to the league (with the player in focus) and the League Landscape, plus, from this browser only, the
  comparison tray and watchlists (rendered after hydration, so the server never claims anything about a
  viewer's lists). This is ROADMAP S2-08 for the dossier.

## D-049 Previous / next player in the dossier — Decided (2026-11-05)
- **The list travels in the URL:** `seq=league:GB1`, `position:Attack`, `search:<query>` or
  `explorer:<filters and sort>`. The dossier server rebuilds the list with the same rules that produced
  it (`filterSort` for the Explorer, `searchPlayers` for search), so stepping matches what the user saw,
  and dossier links stay shareable. No client-side list storage.
- **Defaults and fallbacks:** without `seq`, or when the list no longer contains the player, the dossier
  steps through the player's league by observed value.
- **Sources:** Explorer table and cards pass their current view; search results pass the typed query;
  "Near this valuation" cards pass league or position. `?from=` is kept, so the breadcrumb is unchanged.
- **Stepper:** "2 of 555 · Your Player Explorer view" with previous and next names; J or ] next, K or [
  previous (ignored while typing or with search open). Compare and Watch stay one click in the dossier
  bar.
- **Lane fix:** a tier label that would overprint the observed-value label is skipped (the tier line stays).

## D-050 Share cards for dossier links — Decided (2026-11-05)
- **Card:** `players/[playerId]/opengraph-image` renders a 1200 × 630 PNG with `next/og`: name, role,
  club and league, observed value, the Model A estimate with its basis (held-out or served, in-sample),
  the residual in words, the standing caveat, and the player's valuation lane. Figures come from the
  export only. Nationality is left out because a residual is shown (D-042).
- **Text:** per-player `og:` and `twitter:` description (`lib/share.ts`, tested), `summary_large_image`.
- **Base URL:** `metadataBase` comes from `FAIRVALUE_SITE_URL` (documented in `web/.env.example`),
  defaulting to `http://localhost:3000`, the compose stack's address. Set it before any public deployment.
- **Trade-off:** the card uses next/og's bundled Geist, because the brand faces are self-hosted as woff2,
  which the renderer cannot read. Using Big Shoulders and Archivo needs their OFL TTF files in the
  repository; that is the owner's call.

## D-051 Dossier sprint closed: accessibility and edge-case pass — Decided (2026-11-05)
- **Lighthouse (mobile, production build):** dossier and Overview 100 for accessibility, best practices
  and SEO, 0 failed audits (the dossier started at 93).
- **Fixes:** footer labels below 4.5:1 contrast; two definition lists with invalid children (the record
  strip's note moved outside the list; history dates became a second `<dd>`); the missing favicon (a
  404 on every page; `app/icon.svg` from the FairValue mark); the Overview search buttons now take their
  accessible name from their visible text.
- **Small groups:** a standing is stated, and its silhouette drawn, only for groups of 12 or more. In
  the eight-player showcase "the highest among 2 Premier League players" was true but meaningless; it now
  says the group is too small.
- **Checked:** goalkeeper (no goals or assists in the record strip), the lowest-valued player (no
  "next"), a player with one valuation (no History section), and the showcase build (served, in-sample
  labels throughout; the full export was set aside and restored, checksum verified). Keyboard order runs
  skip link, global nav, search, breadcrumb, actions, stepper, section index, journey; no positive tabindex.
- **Still open:** Safari, Firefox and a screen-reader pass; brand fonts in share cards (D-050).

## D-052 Pre-live deployment on Cloud Run: private API, password-gated web app — Decided (2026-11-06)
- **Host:** Google Cloud Run in `asia-south1`, project `fairvalue-513904`, on free-trial credit with a
  ₹1,000/month enforced budget cap. Both services run with **min-instances 0**, so idle cost is zero;
  max-instances caps (API 2, web 3) bound burst cost. Images go only to the private Artifact Registry
  repository (cleanup keeps the latest two), because the web image carries the full player export.
- **Reviewer-only launch:** until the owner settles the data-rights question, every page is behind HTTP
  Basic auth (`FAIRVALUE_REVIEW_PASSWORD`, user `FAIRVALUE_REVIEW_USER`, default `fairvalue`) in
  `web/src/proxy.ts`. Credentials are compared as SHA-256 digests in constant time. Only `/api/ping`
  (the container health check) and static assets are open. With no password set the gate is off, so
  local and compose runs are unchanged.
- **Not indexed:** `X-Robots-Tag: noindex, nofollow` on every response and a `robots.txt` that disallows
  everything, unless `FAIRVALUE_NOINDEX=0`.
- **Private API:** the API service refuses unauthenticated requests (Cloud Run IAM; rejected requests
  are not billed). The web app runs as its own service account with `roles/run.invoker` on the API, and
  with `FAIRVALUE_API_AUTH=gcp-id-token` sends a Google identity token from the metadata server
  (cached until five minutes before expiry). A failed token fetch becomes the usual clean 503.
- **Compression in the app:** Cloud Run has no Caddy in front. The cause of D-041 was found: Next.js
  does compress responses, but a route handler's `Content-Type` reaches its compression filter as an
  array, which the filter rejects (and a handler cannot gzip its own body, because Next.js drops a
  handler's `Content-Encoding`). `next.config.ts` now sets `/api/players`' `Content-Type` up front, so
  Next.js gzips it: 1.92 MB raw to 324 KB, measured on the standalone server and the Docker image
  (2026-11-06). Compose keeps Caddy, which leaves an already-encoded response alone.
- **Deploy:** `scripts/deploy_gcp.sh` prints the full plan by default and runs it only with `--execute`.
  It refuses uncommitted code (the image tag is the commit), masks the password in its output, and
  bakes the deterministic `run.app` URL into the web build. Pushing images and deploying still need the
  owner's explicit approval each time.

## D-053 Portrait card direction C ("The Denomination") locked; portraits go live under D-044 — Decided (2026-11-06)
- **Direction:** C, the card printed like security paper with the observed value as its denomination. Chosen over A (Floodlit Plate) and B (Under the Lights) after the A/B/C comparison was rebuilt with real cutouts
  (`research/portrait_sourcing/abc/`, not in the app). C handles every portrait type, including tight face close-ups, and has the best no-portrait fallback.
- **Sources, in order, per player** (`research/portrait_sourcing/portrait_plan_all_players.csv`): FootyLogos head-and-shoulders cutout (866) > Berlin / WikiPortraits frame with background removed by us (57, CC BY-SA 4.0)
  > FootyLogos close-up (262) > engraved monogram (4,635). FootyLogos images are unlicensed: the owner accepts the takedown risk (D-044) and wants them live. Permission emails (Premier League, Bundesliga, LaLiga,
  Ligue 1, Eredivisie) are sent and unanswered.
- **Conditions:** every image shows a credit; Berlin images carry "background removed" and CC BY-SA 4.0; a credits page and a takedown contact ship with the portraits; one flag turns FootyLogos images off at once if a
  takedown arrives. Portraits are a presentation layer and say nothing about the model or the audit. Card faces show Transfermarkt value, club and league only.
- **Known limits:** close-up flag is a heuristic checked on a sample; FootyLogos kits are often older than the current club; Berlin kits are national-team kits; personality-rights warnings on Berlin files remain open.
- **Built (2026-11-06):** `PlayerCard` in the dossier hero, `portraitFor` serves Berlin and FootyLogos card portraits, `/credits` page, `NEXT_PUBLIC_FAIRVALUE_FOOTYLOGOS_PORTRAITS=off` (build-time) switch. FootyLogos image files and their id list are git-ignored (`web/public/players/portraits/cards/fl/`, `web/src/data/generated/portrait_cards_fl.json`); regenerate with `scripts/portraits/build_card_assets.py`. Not yet on other screens (Explorer rows, Stories heroes, Overview). Deploying publicly still needs the owner's explicit go-ahead.

---

# Issues found in the locked technical spec

These do not change locked decisions; they are places where the spec cannot be
applied literally. Recommendations are proposals until approved.

| # | Spec text | Problem | Recommendation |
|---|---|---|---|
| S-1 | Dataset "refreshed weekly" | Upstream README: updates paused; data current to **2026-07-06**, valuations to 2026-06-12. | Treat as a frozen snapshot. Drift simulation still works (historical). Update report wording. |
| S-2 | Drift monitored on "age, overall, potential, pace, value" | `overall`, `potential`, `pace` are FIFA-game fields; they do not exist here. | Monitor age, minutes, goal_contrib_p90, club_ppg, market value. |
| S-3 | Pydantic "ratings 1-99" | No ratings in this dataset. | Validate the actual features (age 15–45, minutes ≥ 0, shares in [0,1], …). |
| S-4 (resolved: D-022) | DiCE: "what if this player's confederation were UEFA instead of CAF" | Confederation is (correctly) **not** a model input, so changing it cannot change the prediction. The counterfactual is trivially "no change" by construction. | Report invariance as a guarantee (already tested), and use DiCE on model features: compare, by group, how far players are from the next tier. Pair with residual analysis conditioned on features. **Needs sign-off.** |
| S-5 | "built-in `confederation` field" | The field on `competitions`/`countries` describes leagues/countries in German labels (`europa`, `afrika`, …), not players. | Use our own mapping (D-004). |
| S-6 (resolved: D-021) | ER1 via Fairlearn `equalized_odds_difference` | That metric is defined for binary labels; the tier task has 4 classes. | Compute it per tier (one-vs-rest) and report the maximum, plus regression-residual gaps. |
| S-7 (partly resolved: D-017) | Quality gate R² ≥ 0.75 | Placeholder; value is highly skewed (max €200M, median €2M). | Model log(value); set the gate after the baseline exists. |
| S-8 | "37,000+ players, 500,000+ valuations" | Actual snapshot: 50,149 players, 656,301 valuations, 1,894,350 appearances. | Update report figures. |
