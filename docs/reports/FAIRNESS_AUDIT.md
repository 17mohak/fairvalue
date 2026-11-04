# Fairness audit: initial results (Milestone 4, first full run)

**Run:** 2026-11-04, `python -m src.fairness.audit --boot 2000` on held-out predictions of the
pre-specified primary model (Optuna-tuned HistGradientBoosting; D-019). Tables:
`reports/fairness/*.csv`; generated summary: `reports/fairness/fairness_summary.md`.

**Conventions:**
- Residual = actual − predicted; **positive = the model under-predicts the player**.
- Gap = non-UEFA minus UEFA.
- "League-stratified" = within-league differences weighted to the non-UEFA league mix.
- 95% CIs come from a stratified bootstrap (2,000 replicates). They capture evaluation-set sampling only, not refit variance.

**Scope reminder:** players at clubs in 14 European first divisions, valued June 2025 – June 2026,
≥ 450 minutes (n = 5,820; 1,496 non-UEFA). This is a selected population (RESEARCH_DESIGN §9).
Every result below is an **association conditional on the model, its features and this
population**. None is evidence of discrimination or of a causal effect of nationality.

---

## Headline

**Under both models, non-UEFA players' Transfermarkt values are systematically *higher* than a
nationality-blind model predicts, relative to UEFA players in the same leagues.**
- Model A: league-stratified log gap **+0.099** (95% CI 0.068 to 0.128), about +10% in relative terms.
- Model B: **+0.159** (0.116 to 0.201).

This is the **opposite direction** to the original hypothesis, which predicted that non-UEFA players
would be valued *lower* than comparable UEFA players. Viewed from the model's side, the same fact
means the model **under-predicts non-UEFA players** relative to the market. It places them below
their actual tier more often than UEFA players (+3.3 pp, Model A classifier). If this model were used
as a valuation tool, that would be a disparity affecting non-UEFA players.

## 1. Differential valuation error (RQ2, primary)

### Log scale (primary)

| | Model A | Model B |
|---|---|---|
| Mean residual, UEFA | −0.022 (−0.037, −0.006) | −0.050 (−0.071, −0.028) |
| Mean residual, non-UEFA | +0.081 (0.054, 0.107) | +0.155 (0.119, 0.192) |
| **Signed gap, league-stratified** | **+0.099 (0.068, 0.128)** | **+0.159 (0.116, 0.201)** |
| Signed gap, raw | +0.103 (0.072, 0.132) | +0.206 (0.163, 0.249) |
| MAE UEFA / non-UEFA | 0.405 / 0.417 | 0.741 / 0.686 |
| MAE gap, league-stratified | +0.010 (−0.009, 0.031) | −0.014 (−0.044, 0.018) |
| RMSE gap, raw | +0.008 (−0.017, 0.036) | −0.059 (−0.099, −0.022) |

- **Accuracy is similar for both groups; the difference is in direction (bias).** Under Model A,
  MAE and RMSE differ by about 0.01, with CIs that include 0. The model is about as accurate for both
  groups, but it errs in opposite directions for them.
- Under Model B the raw MAE/RMSE are *lower* for non-UEFA players. After league stratification the
  MAE gap is about 0.

### EUR scale (interpretability)

| | Model A | Model B |
|---|---|---|
| Signed gap, league-stratified | +€0.41M (0.07M, 0.74M) | +€0.76M (0.29M, 1.21M) |
| MAE gap, league-stratified | +€0.10M (−0.20M, 0.40M) | +€0.14M (−0.32M, 0.56M) |

EUR-scale mean residuals are positive for **both** groups (Model A: UEFA +€0.72M, non-UEFA +€1.14M).
This is expected: exp(log prediction) is a median-type estimate (D-017). EUR averages are dominated
by expensive players, which is why the log scale is primary.

### Is it an artefact of value differences or miscalibration?

No. Residuals correlate with true value (regression towards the mean), and non-UEFA players are on
average more valuable, so the check was repeated **within deciles of the model's own prediction**.
Binning on the prediction avoids conditioning on the outcome.

| Model A | Gap (95% CI) |
|---|---|
| Stratified by predicted-value decile | +0.101 (0.072, 0.131) |
| Stratified by league × predicted decile | +0.105 (0.076, 0.136) |

The Model A gap is positive in all 10 deciles, ranging from +0.040 to +0.183
(`calibration_within_predicted_deciles.csv`).

### Robustness
- **Every algorithm** gives a positive league-stratified gap: Model A from +0.099 (tuned HGB) to
  +0.133 (Random Forest); Model B from +0.159 to +0.200.
- **900-minute sensitivity:** +0.087 (0.056, 0.118) under Model A.

## 2. Leagues, positions and strata (descriptive; RESEARCH_DESIGN §2)

**Leagues** (Model A signed log gap, 95% CI). League-level estimates only where n non-UEFA ≥ 100:

| League | n non-UEFA | Gap |
|---|---|---|
| RU1 | 108 | +0.279 (0.160, 0.401) |
| TR1 | 127 | +0.265 (0.150, 0.381) |
| BE1 | 108 | +0.119 (0.009, 0.230) |
| ES1 | 123 | +0.087 (−0.018, 0.191) |
| FR1 | 177 | +0.036 (−0.056, 0.133) |
| GB1 | 135 | +0.034 (−0.066, 0.133) |
| IT1 | 112 | +0.022 (−0.084, 0.124) |
| PO1 | 178 | −0.007 (−0.108, 0.093) |

In the pooled-only leagues (n < 100), GR1 (+0.241) and UKR1 (+0.180) are also clearly positive.
**The overall gap is concentrated in Russia, Türkiye, Greece, Ukraine and Belgium.** In England,
Italy, France, Portugal and Germany (L1 +0.016) it is close to 0 with CIs spanning 0.
These are leagues where imported players are expensive relative to local players. This is a
descriptive pattern, not an explanation.

**Strata** (Model A, league-stratified):

| Stratum | n non-UEFA | Gap (95% CI) |
|---|---|---|
| CONMEBOL vs UEFA | 533 | +0.128 (0.080, 0.176) |
| CAF vs UEFA | 675 | +0.086 (0.046, 0.128) |
| Recent arrivals | 410 | +0.130 (0.061, 0.199) |
| Established players | 1,086 | +0.083 (0.049, 0.120) |
| Diaspora-born non-UEFA vs UEFA | 376 | +0.065 (0.009, 0.117) |
| Other non-UEFA vs UEFA | 1,120 | +0.110 (0.075, 0.146) |
| Attack / Midfield / Defender | 532 / 395 / 508 | +0.096 / +0.089 / +0.102 |
| Goalkeeper | 61 | +0.131 (−0.021, 0.289) |
| Non-UEFA vs EU-mobile UEFA (exploratory) | 1,496 | +0.074 (0.036, 0.113) |
| Non-UEFA vs other UEFA (exploratory) | 1,496 | +0.071 (−0.011, 0.151) |

The gap is smaller where selection on migration is plausibly weaker (diaspora-born, established
players) and larger for recent arrivals and South American players. That pattern fits the selection
explanation in RESEARCH_DESIGN §9, but it does not establish it.

**Largest misses** (Model A, top 5% of residuals): non-UEFA players make up 35.4% of the largest
under-predictions and 19.9% of the largest over-predictions, against 25.7% of all players. Their share
of the largest *absolute* errors (26.1%) matches their population share.

## 3. Tier classification fairness (RQ3)

Classifier (primary for ER1), held-out:

| | Model A | Model B |
|---|---|---|
| Error rate UEFA / non-UEFA | 0.201 / 0.225 | 0.333 / 0.342 |
| **ER1a: error-rate gap** | **+0.025 (0.001, 0.049)** | **+0.009 (−0.018, 0.035)** |
| Under-tier rate gap (predicted below true) | +0.033 (0.013, 0.054) | +0.042 (0.018, 0.065) |
| Over-tier rate gap | −0.008 (−0.024, 0.008) | −0.033 (−0.050, −0.016) |
| **ER1b: per-tier EOD**: Emerging / Established / Elite / World Class | 0.013 / 0.033 / 0.035 / 0.052 | 0.013 / 0.040 / 0.037 / 0.009 |
| ER1b max EOD | 0.052 (0.028, 0.171) | 0.040 (0.032, 0.141) |

- The largest single component under Model A is the **World Class TPR gap: −5.2 pp** (−17.0, +5.8).
  Non-UEFA World Class players are recognised as World Class slightly less often, with very wide
  uncertainty (94 non-UEFA players in that tier).
- Tiers from the primary regressor show the same pattern: ER1a +0.036 (0.012, 0.059), under-tier gap
  +0.040 (0.020, 0.060).
- **Directional reading:** the errors lean towards under-tiering non-UEFA players. That is consistent
  with the positive regression residuals. ER1b alone would not show this, because it ignores direction.
- **Against the spec's provisional ~10 pp reference:** every point estimate is below 10 pp. But the
  CIs for the World Class and Elite components reach above it, and the reference is not evidence-based
  (D-021). **No compliance is claimed.**
- **Demographic parity (supplementary):** predicted-tier selection-rate gaps follow the true base-rate
  gaps. For example, Emerging under Model A: selection gap −0.071 vs base-rate gap −0.087. They mainly
  reflect the groups' different true tier distributions, so parity is not a target here.

## 4. Model A vs Model B (RQ4; not a causal decomposition)

- Removing league and club context **raises** the signed gap from +0.099 to +0.159. The paired
  difference A − B is −0.060 (−0.089, −0.032).
- Part of the gap Model B leaves unexplained lines up with league and club context, which non-UEFA
  players in this population are more often positioned in. A substantial positive gap remains
  *after* conditioning on context.
- ER1a differs little between models (A − B +0.016, CI −0.012 to 0.045). Model B over-tiers non-UEFA
  players less often (over-tier gap −0.033).

## 5. What can and cannot be concluded

**Can be said (within the population):**
- A nationality-blind model trained on performance, profile and context systematically under-predicts
  non-UEFA players' Transfermarkt values relative to UEFA players in the same leagues and at the same
  predicted value: log gaps of +0.099 (Model A) and +0.159 (Model B), about +10% and +17% in relative terms.
- Absolute accuracy is similar for both groups.
- The gap is not explained by league mix, predicted-value level or the minutes threshold. It is
  concentrated in a subset of leagues.
- The original hypothesis ("non-UEFA players get lower value-tier outcomes than comparable UEFA
  players") is **not supported in this population and with these features**. The observed association
  runs the other way.

**Candidate explanations that this study cannot separate** (none tested; listed so the result is not
over-read):
1. **Selection on unobserved quality.** Non-UEFA players reach these leagues after a stricter filter
   (RESEARCH_DESIGN §9). The larger gap for recent arrivals and the smaller gap for diaspora-born
   players fit this, but do not establish it.
2. **Deliberately excluded variables.** International caps were excluded as a nationality proxy (D-003),
   and so were contract and agent data. Non-UEFA players in Europe may differ on these, and they can
   affect value.
3. **League-specific market structure.** The gap is concentrated in RU1, TR1, GR1, UKR1 and BE1.
4. **Valuation practice.** How Transfermarkt's community values imported players. The target itself
   may carry patterns that are not about player quality.

**Cannot be said:** that anyone discriminates, in either direction; that nationality causes higher
valuations; or anything about players outside these 14 leagues.

## 6. Limitations specific to this audit
- The CIs ignore refit variance. Some stratum intervals will exclude 0 by chance (no multiplicity
  correction; strata are descriptive).
- The ER1b maximum is biased upwards. Per-tier World Class and Elite estimates rest on 94 and 246
  non-UEFA players.
- Results are for the pre-specified primary model. Other algorithms agree on the sign and size
  (section 1, Robustness).
- SHAP-based attribution of the gap to features is not done yet (Milestone 5).
