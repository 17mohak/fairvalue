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
