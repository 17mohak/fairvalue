# Research design (LOCKED)

**Locked:** 2026-11-04, under D-011 (accepted). This is the single authoritative statement of
the population, questions, models and metrics. It is not reopened during ordinary
implementation. Any change needs a new, dated entry in `docs/DECISIONS.md`.

Evidence behind it: `docs/reports/COVERAGE_AUDIT.md` and `docs/reports/RESEARCH_SCOPE_ASSESSMENT.md`.

---

## 1. Population

| Item | Definition |
|---|---|
| Snapshot | Valuations in (2025-06-12, 2026-06-12]: each player's latest valuation in that window |
| Primary population | Players valued while at a club in one of 14 leagues with player-level match data (BE1, DK1, ES1, FR1, GB1, GR1, IT1, L1, NL1, PO1, RU1, SC1, TR1, UKR1), with ≥ 450 club minutes in the 730 days up to their valuation date, age 15–45 and value > 0. **n = 5,820** (4,324 UEFA, 1,496 non-UEFA). |
| Sensitivity population | Same, with ≥ 900 minutes (n = 5,128). Evaluated on the held-out predictions of the primary models. |
| Descriptive population | All 19,364 players with a current valuation. Used for coverage and selection description only. |
| Drift reference | Latest valuation in (2024-06-12, 2025-06-12]. **Never used for training, tuning or CV.** |

**Scope statement (to be used in all reporting):** the findings describe players at clubs in 14
European first divisions valued between June 2025 and June 2026. This population is selected
(only 16.7% of currently valued non-UEFA players are in it) and does not represent the global
football market.

## 2. Groups

- **Primary:** UEFA vs non-UEFA, from recorded citizenship via `src/data/mappings/country_confederation.csv`.
- **Pre-specified strata** (descriptive, not separate hypotheses):
  - league;
  - position;
  - recent arrival (no recorded match more than a year before valuation);
  - diaspora-born (non-UEFA citizens born in a UEFA country);
  - EU/EEA/UK/CH citizenship within UEFA (exploratory);
  - CAF and CONMEBOL separately (the only confederations large enough).
- Nationality, confederation and all strata variables are **never model features**. They are
  joined to held-out predictions only, from `audit_lookup.parquet`.

## 3. Types of analysis (kept separate)

| Type | Question | Example output | Claims allowed |
|---|---|---|---|
| Descriptive | What does the data contain? | coverage funnel, raw value by group | Facts about this dataset |
| Predictive evaluation | How well do the models predict value / tier? | RMSE, MAE, R², confusion matrix | Out-of-sample accuracy on this population |
| Fairness evaluation | Do held-out errors differ by group? | signed residual gaps, ER1a, ER1b | Associations between group and model error, conditional on the model and features |
| Causal | Does nationality *cause* a different valuation? | — | **None. This study cannot establish causal effects.** |

## 4. Research questions

- **RQ1 (predictive):** How accurately can Transfermarkt market value be predicted from match
  performance, profile and club/league context in this population?
- **RQ2 (primary fairness: differential valuation error):** Do nationality-blind models'
  held-out valuation errors differ systematically between UEFA and non-UEFA players, overall and
  within leagues?
- **RQ3 (tier fairness):** Does the four-tier classifier's error rate (ER1a) and per-tier error
  profile (ER1b) differ between groups?
- **RQ4 (context):** How do the RQ2–RQ3 results change between Model A (with league/club context)
  and Model B (without)?

**Link to the original hypothesis** ("non-UEFA players get lower value-tier outcomes than UEFA
players with comparable performance profiles"):
- A nationality-blind model gives identical predictions for identical features. A group-specific
  pattern in the target that the features do not capture therefore shows up as a systematic
  signed residual.
- A **negative** mean residual for non-UEFA players (prediction above actual value) is the
  pattern the hypothesis predicts. A positive one is the opposite pattern.
- Either is an association conditional on the features and the selected population. Neither is
  evidence of discrimination.

## 5. Targets, tiers and models

- **Regression target:** natural log of `market_value_in_eur`. Raw values are extremely skewed
  (skewness 4.86, kurtosis 36.7); after the log transform skewness is 0.11.
  - Predictions are back-transformed with exp(). That estimates a conditional *median*-type value,
    not the mean; no smearing correction is applied (documented limitation).
- **Tiers** (label definition, fixed from the 50th / 80th / 95th percentiles of the primary
  population; values are rounded in the source, so the cut-offs are round numbers):

  | Tier | Value range | UEFA | non-UEFA |
  |---|---|---|---|
  | Emerging | < €2M | 2,159 | 617 |
  | Established | €2M – < €10M | 1,317 | 539 |
  | Elite | €10M – < €30M | 597 | 246 |
  | World Class | ≥ €30M | 251 | 94 |

- **Feature sets** (`src/features/preprocess.py`):
  - **Model A:** performance + profile + league identity + club strength (`club_ppg`).
  - **Model B:** performance + profile only.
- **Regressors:** Ridge (baseline), RandomForestRegressor, HistGradientBoostingRegressor
  (default, then Optuna-tuned).
- **Tier classifier:** HistGradientBoostingClassifier on the same feature sets (probabilities are
  needed for ROC, PR and calibration). Tiers obtained by binning regression predictions are
  reported as a secondary comparison.
- **Primary model for fairness reporting** (pre-specified selection rule): the regressor with
  the lowest mean 5-fold CV RMSE on the log scale under Model A, and the same algorithm under
  Model B. All three algorithms are reported as a robustness check.

## 6. Validation protocol

- 5-fold `StratifiedKFold` (shuffled, seed 42), stratified on **tier** only. Group is never used
  in splitting, training or tuning.
- Every reported metric uses **out-of-fold (held-out) predictions**: each player is predicted
  exactly once, by a model that did not see them.
- **Optuna:** nested inside the outer folds (inner 3-fold CV, 25 TPE trials, seed 42), so tuning
  never sees the outer held-out fold.
- **MLflow:** local tracking store `mlruns/` (git-ignored). One run per algorithm × feature set,
  logging parameters, fold and overall metrics, and artifacts (plots, held-out predictions).

## 7. Metrics

### Predictive (RQ1)
- Regression: RMSE, MAE, R² on the log scale (primary) and the EUR scale, plus residual plots and
  error analysis by position, league and value tier.
- Classification:
  - accuracy, balanced accuracy, macro F1, adjacent-tier accuracy;
  - confusion matrix;
  - one-vs-rest ROC AUC and average precision with curves;
  - reliability diagrams (one-vs-rest).

### Fairness: differential valuation error (RQ2, primary)
- **Residual = actual − predicted.** Positive = the model underpredicts.
  - Log scale: ln(actual) − ln(predicted), interpreted roughly as a proportional error.
  - EUR scale: actual − exp(predicted log). EUR-scale averages are dominated by expensive
    players; log-scale averages weight every player's *relative* error equally. Log scale is the
    primary scale for fairness; EUR is reported for interpretability.
- Per group: mean signed residual, MAE, RMSE. Differences reported as non-UEFA minus UEFA.
- **Adjustment:** a league-stratified difference, Σ_l w_l (mean_nonUEFA,l − mean_UEFA,l), with
  w_l = share of non-UEFA players in league l. This compares non-UEFA players with UEFA players in
  the same leagues, weighted to the non-UEFA league mix. Position-stratified results are reported
  in the same way.
- **Uncertainty:** stratified bootstrap (resampling players within league × group), 2,000
  replicates, percentile 95% CIs. This captures sampling variation in the evaluation set, not
  refitting variation (documented limitation). No significance thresholds are used; CIs are
  reported and interpreted.

### Fairness: tier classification (RQ3)
- **ER1a:** overall tier error rate (1 − accuracy) by group and the difference, via Fairlearn `MetricFrame`.
- **ER1b:** for each tier k, binarise (true = k vs not, predicted = k vs not). Then report:
  - TPR_k and FPR_k by group;
  - EOD_k = max(|ΔTPR_k|, |ΔFPR_k|), via Fairlearn `equalized_odds_difference` on the binarised labels;
  - all 8 components and the maximum, with bootstrap CIs.
- **Directional** (the hypothesis is directional; ER1b is not): under-tier rate
  P(predicted tier < true tier) and over-tier rate, by group.
- **Supplementary:** per-tier predicted selection rates by group (demographic parity), shown next to
  true base rates. Groups differ in true tier distribution, so parity is **not** a fairness target here.
- **Statistical caveats** (clarification added 2026-11-04 after code review; definitions unchanged):
  - `ER1b_max_EOD` is a maximum of 8 noisy components, so it is biased upwards, and its
    percentile CI is approximate. The per-tier components are the primary ER1b output.
  - With about 14 strata, 14 leagues and 8 components, some intervals will exclude 0 by chance.
    Strata are descriptive; no multiplicity correction is applied and no stratum result is read as
    a separate finding.
  - Strata with fewer than 30 non-UEFA players are flagged. Leagues with no UEFA comparator are
    dropped from stratified gaps, and the dropped share is reported.
  - Optuna's inner sampler seed is 42 + outer fold index (reproducible, differs per fold).
- **Thresholds:** the spec's ~10 pp for ER1 is a placeholder, not an evidence-based limit. Results
  are reported with CIs against it as a reference only. No compliance is claimed.

### Context (RQ4)
- All RQ2–RQ3 metrics for Model A and Model B side by side, with the difference. This describes
  how predictions and gaps change when context features are removed. It is **not** a causal
  decomposition.

## 8. Explainability and DiCE
- **SHAP:** global importance and local explanations for the primary regressor, plus mean |SHAP| by
  group for each feature (describes which inputs drive predictions differently by group).
- **Nationality counterfactuals are undefined for this model.** Confederation is not an input, so
  changing it cannot change a prediction. This invariance is tested (`tests/test_leakage.py`) and
  reported as a design property.
- **DiCE (feature-based):** counterfactuals on the tier classifier for a pre-specified,
  tier-stratified random sample of matched players from both groups (excluding World Class).
  - Mutable features: match statistics only (goals and assists per 90, minutes, start share; D-030).
  - Immutable: age, height, position, foot, league, club strength.
  - Compared by group: the share of players with a valid counterfactual, and the size of change
    needed to reach the next tier.
  - This describes the model's decision surface for each group. Changing club or league is **not**
    treated as equivalent to changing nationality, and no auxiliary model with nationality is trained.

## 9. Selection bias and limitations

**Observed selection patterns (measured):**
- Coverage retains 16.7% of currently valued non-UEFA players vs 41.6% of UEFA players.
- Retained players sit higher in their group's value distribution (median percentile 82.3 non-UEFA,
  73.8 UEFA). The retained/excluded median-value ratio ranges from 4× (CONCACAF) to 10× (AFC).
- The minutes filter removes similar shares of both groups at the same value level.

**Plausible mechanisms (not measured here):**
- Clubs signing non-European players are likely to select players they already rate highly.
- Work-permit and non-EU squad rules may shape who can be signed.
- Players may choose leagues for reasons related to their valuation.

**Implications for external validity:**
- Results apply to this population only.
- How far, and in which direction, selection shifts the measured gap relative to the wider market
  depends on how selection relates to unobserved player quality. That relationship cannot be
  measured with this data.

**What this dataset cannot establish:**
- Whether players outside the 14 leagues are valued differently.
- Whether any gap is caused by nationality rather than unobserved factors (talent not in the
  statistics, defensive data, contracts, agents, marketing).
- Whether Transfermarkt's values themselves are accurate or fair.

Other limitations: see `docs/KNOWN_LIMITATIONS.md`.
