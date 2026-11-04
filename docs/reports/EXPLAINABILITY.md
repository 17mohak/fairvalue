# Explainability: SHAP and DiCE (Milestone 5)

**Run:** regenerated 2026-11-05 (`scripts/run_pipeline.sh`). SHAP: `python -m src.fairness.explain_shap`;
DiCE: `python -m src.fairness.counterfactuals --per-cell 60`. Outputs are in `reports/explainability/`.

Both analyses explain the **served models**: the full-data refits in `models/` (D-027), on the
log-value scale. They describe how the model behaves. They are not causal statements about players
or nationality.

## 1. SHAP (TreeExplainer on the HistGradientBoosting regressors)

One-hot and missing-indicator columns are summed back to their original feature. Additivity is
checked: base value + the sum of contributions equals the model output for every player (to 1e-6).

### Global importance (mean |SHAP|, log scale)

| Rank | Model A | mean \|SHAP\| | Model B | mean \|SHAP\| |
|---|---|---|---|---|
| 1 | league (`valuation_league_id`) | 0.675 | age | 0.469 |
| 2 | age | 0.468 | appearances | 0.381 |
| 3 | club strength (`club_ppg`) | 0.323 | European-cup minute share | 0.323 |
| 4 | appearances | 0.246 | days since last match | 0.261 |
| 5 | European-cup minute share | 0.184 | minutes | 0.163 |
| 6 | minutes in last 365 days | 0.178 | goal contributions per 90 | 0.139 |

- In Model A, *where* a player plays (league and club strength) dominates.
- Without context (Model B), age, playing time and European-cup exposure carry the model, and the
  per-90 output statistics rank only sixth.

### Group view: what moves the two groups' *predictions* apart
Mean SHAP for non-UEFA minus UEFA. These differences add up exactly to the gap in mean predicted
log value: 0.253 under Model A and 0.140 under Model B.

| Model A feature | Contribution to prediction gap | Model B feature | Contribution |
|---|---|---|---|
| age | +0.064 | age | +0.056 |
| league | +0.064 | days since last match | +0.052 |
| days since last match | +0.024 | goal contributions per 90 | +0.028 |
| minutes in last 365 days | +0.021 | minutes in last 365 days | +0.010 |
| club strength | +0.020 | appearances | −0.013 |
| goal contributions per 90 | +0.020 | height | −0.009 |

- The model predicts higher values for non-UEFA players on average, mainly because of the age profile
  and the leagues they play in, plus recency and output. No feature lowers non-UEFA predictions in
  Model A.
- **This is not the fairness gap.** The audit's gap is in the *residuals*, the part of the actual value
  that these features do *not* explain. SHAP explains predictions, so by construction it cannot
  attribute the residual gap. What it does show is that the model's own group differences come from
  legitimate-looking inputs that are also correlated with group membership (RESEARCH_DESIGN §4,
  proxy AUC 0.67).

### Local explanations
One representative player per group × predicted tier: the player closest to that cell's median
prediction (`shap_local.png`, `shap_local_representative_players.csv`). These are in-sample
explanations of the served model, so predictions sit close to actual values. Typical patterns:
- league and club strength push the higher tiers up;
- low recent minutes and low appearances pull Emerging players down;
- age adds value for players in their mid-twenties.

Representative players are public professional footballers. They are named only to make the
explanation concrete; no assessment of any individual is implied.

## 2. DiCE: feature-based counterfactuals on the tier classifier

**What this is.** For a sampled player, DiCE searches for the smallest change in **match statistics**
that would move the classifier's predicted tier up one level. Results are compared between UEFA and
non-UEFA players.
- Mutable: goals and assists per 90, minutes, start share.
- Fixed: age, height, position, foot, league, club strength and European-cup share (D-030).

**What this is not.** It is not a nationality counterfactual. Nationality is not a model input, so
changing it cannot change any prediction (`tests/test_leakage.py`). Changing league or club is also not
treated as a substitute for changing nationality.

**Design.**
- Sample: players from the league × position matched sample, 60 per group × predicted tier
  (Emerging, Established, Elite), seed 42.
- 10 candidate counterfactuals per player; the closest valid one is summarised.
- "Valid" means: it reaches the target tier, minutes ≥ last-365 minutes, and minutes per appearance
  stay within the training range.

### Results (complete run: 720 queries, 60 per cell, 2026-11-05)
Files: `dice_counterfactuals.csv`, `dice_group_comparison.csv` (bootstrap CIs, 1,000 replicates) and
`dice_run_meta.json`. The run took 83 minutes.

- **Found a valid counterfactual:** 469 of 720 queries (65.1%): Model A 60.8%, Model B 69.4%. For the
  rest, DiCE's random search found no candidate that met the target tier and the consistency
  constraints. These are recorded as `UserConfigValidationException`, which is how DiCE reports "No
  counterfactuals found for any of the query points".

Found rate by group (UEFA / non-UEFA, n = 60 each):

| Model | Emerging → Established | Established → Elite | Elite → World Class |
|---|---|---|---|
| A | 0.733 / 0.650 | 0.517 / 0.583 | 0.650 / 0.517 |
| B | 0.867 / 0.817 | 0.533 / 0.633 | 0.617 / 0.700 |

Group comparisons (non-UEFA − UEFA, 95% CI):

| Model | Tier | Found-rate gap | Median Δ goal contributions per 90 needed |
|---|---|---|---|
| A | Emerging | −0.083 (−0.250, 0.083) | −0.027 (−0.228, 0.118) |
| A | Established | +0.067 (−0.100, 0.233) | +0.045 (−0.158, 0.230) |
| A | Elite | −0.133 (−0.317, 0.050) | **−0.243 (−0.360, −0.011)** |
| B | Emerging | −0.050 (−0.183, 0.067) | +0.007 (−0.121, 0.138) |
| B | Established | +0.100 (−0.067, 0.283) | +0.042 (−0.207, 0.266) |
| B | Elite | +0.083 (−0.083, 0.250) | −0.108 (−0.263, 0.046) |

- The typical valid counterfactual changes **2** of the 4 mutable statistics (median, both groups and models).
- **Reading:** with 60 players per cell, no found-rate difference between groups is distinguishable
  from 0. Of the 24 tier-level comparisons (4 metrics × 3 tiers × 2 models, including median distance and
  number of features changed), one interval excludes 0: under Model A, non-UEFA players
  predicted Elite needed a *smaller* increase in goal contributions per 90 to reach World Class
  (median 0.29 vs 0.53). With this many comparisons, one interval excluding 0 is expected by chance,
  so it is reported descriptively, not as a finding.
- **Overall:** the counterfactual analysis shows no consistent group difference in how far players are
  from the next tier in the model's decision surface. That is consistent with the audit's finding that
  the model's *accuracy* is similar for both groups, while the *signed* gap lives in the target.

### Bounded execution (D-031)
- The full analysis is expensive. DiCE's random search scores many candidate batches through the full
  pipeline, and valid candidates are rare at upper tiers under the consistency constraints.
- The module is therefore bounded:
  - default = a demonstration (Model A, 5 per cell, 10-minute limit);
  - results are checkpointed after every player;
  - a run that hits the limit is written and labelled `"complete": false` in `dice_run_meta*.json`.
- The pipeline script runs only the demonstration unless `WITH_DICE=1`.
- The full run above was completed before the limit was added. It used `--per-cell 60 --max-minutes 0
  --models AB --tag ""`.
