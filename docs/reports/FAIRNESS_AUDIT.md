# Fairness audit (Milestone 4)

**Run:** regenerated 2026-11-05 with `scripts/run_pipeline.sh` after the D-028 fixes
(`python -m src.fairness.audit --boot 2000`). It uses held-out predictions of the pre-specified
primary model (Optuna-tuned HistGradientBoosting; D-019). Tables: `reports/fairness/*.csv`; generated
summary: `reports/fairness/fairness_summary.md`.

**Conventions:**
- Residual = actual − predicted; **positive = the model under-predicts the player**.
- Gap = non-UEFA minus UEFA.
- "League-stratified" = within-league differences weighted to the non-UEFA league mix.
- 95% CIs come from a stratified bootstrap (2,000 replicates). They capture evaluation-set sampling only,
  not refit variance. Club-clustered CIs are in `SUPPLEMENTARY_CHECKS.md`.

**Scope reminder:** players at clubs in 14 European first divisions, valued June 2025 – June 2026,
≥ 450 minutes (n = 5,820; 1,496 non-UEFA). This is a selected population (RESEARCH_DESIGN §9).
Every result below is an **association conditional on the model, its features and this population**.
None is evidence of discrimination or of a causal effect of nationality. The target, Transfermarkt's
valuation, may itself be biased.

---

## Headline

**Under both models, non-UEFA players' Transfermarkt values are systematically *higher* than a
nationality-blind model predicts, relative to UEFA players in the same leagues.**
- Model A: league-stratified log gap **+0.093** (95% CI 0.063 to 0.124), about +10% in relative terms.
- Model B: **+0.164** (0.121 to 0.207).

This is the **opposite direction** to the original hypothesis, which predicted that non-UEFA players
would be valued *lower* than comparable UEFA players. Viewed from the model's side, the same fact
means the model **under-predicts non-UEFA players** relative to the market. It places them below
their actual tier more often than UEFA players (+3.3 pp, Model A classifier). If this model were used
as a valuation tool, that would be a disparity affecting non-UEFA players.

## 1. Differential valuation error (RQ2, primary)

### Log scale (primary)

| | Model A | Model B |
|---|---|---|
| Mean residual, UEFA | −0.019 (−0.034, −0.003) | −0.054 (−0.075, −0.032) |
| Mean residual, non-UEFA | +0.078 (0.052, 0.104) | +0.160 (0.123, 0.196) |
| **Signed gap, league-stratified** | **+0.093 (0.063, 0.124)** | **+0.164 (0.121, 0.207)** |
| Signed gap, raw | +0.097 (0.067, 0.126) | +0.213 (0.171, 0.257) |
| MAE UEFA / non-UEFA | 0.403 / 0.415 | 0.738 / 0.689 |
| MAE gap, league-stratified | +0.012 (−0.008, 0.031) | −0.009 (−0.039, 0.022) |
| RMSE gap, raw | +0.006 (−0.019, 0.033) | −0.051 (−0.090, −0.013) |

- **Accuracy is similar for both groups; the difference is in direction (bias).** Under Model A, MAE and
  RMSE differ by about 0.01, with CIs that include 0. The model is about as accurate for both groups,
  but it errs in opposite directions for them.
- Under Model B the raw RMSE is *lower* for non-UEFA players. After league stratification the MAE gap is about 0.

### EUR scale (interpretability)

| | Model A | Model B |
|---|---|---|
| Signed gap, league-stratified | +€0.36M (0.02M, 0.68M) | +€0.78M (0.30M, 1.24M) |
| MAE gap, league-stratified | +€0.08M (−0.22M, 0.37M) | +€0.17M (−0.29M, 0.60M) |

EUR-scale mean residuals are positive for **both** groups (Model A: UEFA +€0.68M, non-UEFA +€1.07M).
This is expected: exp(log prediction) is a median-type estimate (D-017). EUR averages are dominated
by expensive players, which is why the log scale is primary.

### Is it an artefact of value differences or miscalibration?

No. Residuals correlate with true value (regression towards the mean), and non-UEFA players are on
average more valuable, so the check was repeated **within deciles of the model's own prediction**.
Binning on the prediction avoids conditioning on the outcome (D-024).

| Model A | Gap (95% CI) |
|---|---|
| Stratified by predicted-value decile | +0.095 (0.066, 0.125) |
| Stratified by league × predicted decile | +0.101 (0.070, 0.131) |

The gap is positive in all 10 deciles, ranging from +0.030 to +0.174
(`calibration_within_predicted_deciles.csv`).

### Robustness
- **Every algorithm** gives a positive league-stratified gap: Model A from +0.093 (tuned HGB) to +0.134
  (Random Forest); Model B from +0.164 to +0.200.
- **900-minute sensitivity:** +0.084 (0.052, 0.114) under Model A.
- **Unseen clubs** (club-grouped CV, supplementary): +0.112.
- **Club-clustered CI:** 0.061 to 0.125.

## 2. Leagues, positions and strata (descriptive; RESEARCH_DESIGN §2)

**Leagues** (Model A signed log gap, 95% CI). League-level estimates only where n non-UEFA ≥ 100:

| League | n non-UEFA | Gap |
|---|---|---|
| RU1 | 108 | +0.264 (0.147, 0.384) |
| TR1 | 127 | +0.257 (0.139, 0.375) |
| BE1 | 108 | +0.130 (0.026, 0.238) |
| ES1 | 123 | +0.071 (−0.035, 0.177) |
| FR1 | 177 | +0.038 (−0.056, 0.133) |
| GB1 | 135 | +0.035 (−0.063, 0.132) |
| IT1 | 112 | +0.010 (−0.095, 0.112) |
| PO1 | 178 | −0.017 (−0.120, 0.082) |

In the pooled-only leagues (n < 100), GR1 (+0.237) and UKR1 (+0.158) are also clearly positive.
**The overall gap is concentrated in Russia, Türkiye, Greece, Ukraine and Belgium.** In England,
Italy, France, Portugal and Germany (L1 +0.003) it is close to 0 with CIs spanning 0. These are leagues
where imported players are expensive relative to local players. This is a descriptive pattern, not an
explanation.

**Strata** (Model A, league-stratified):

| Stratum | n non-UEFA | Gap (95% CI) |
|---|---|---|
| CONMEBOL vs UEFA | 533 | +0.118 (0.070, 0.165) |
| CAF vs UEFA | 675 | +0.084 (0.043, 0.125) |
| Recent arrivals | 410 | +0.118 (0.049, 0.185) |
| Established players | 1,086 | +0.080 (0.046, 0.117) |
| Diaspora-born non-UEFA vs UEFA | 376 | +0.071 (0.014, 0.121) |
| Other non-UEFA vs UEFA | 1,120 | +0.101 (0.065, 0.135) |
| Attack / Midfield / Defender | 532 / 395 / 508 | +0.092 / +0.079 / +0.098 |
| Goalkeeper | 61 | +0.130 (−0.016, 0.283) |
| Non-UEFA vs EU-mobile UEFA (exploratory) | 1,496 | +0.069 (0.033, 0.109) |
| Non-UEFA vs other UEFA (exploratory) | 1,496 | +0.054 (−0.028, 0.134) |

The gap is smaller for diaspora-born and established players, and larger for recent arrivals and South
American players. Those are the groups where selection on migration is plausibly weaker and stronger
respectively. That pattern fits the selection explanation in RESEARCH_DESIGN §9, but it does not
establish it, and the strata CIs overlap.

**Largest misses** (Model A, top 5% of residuals): non-UEFA players make up 35.7% of the largest
under-predictions and 21.0% of the largest over-predictions, against 25.7% of all players. Their share
of the largest *absolute* errors (24.1%) is close to their population share.

## 3. Tier classification fairness (RQ3)

Classifier (primary for ER1), held-out. These numbers are identical to the first run (see MODEL_EVALUATION §2).

| | Model A | Model B |
|---|---|---|
| Error rate UEFA / non-UEFA | 0.201 / 0.225 | 0.333 / 0.342 |
| **ER1a: error-rate gap** | **+0.025 (0.001, 0.049)**; club-clustered (−0.000, 0.050) | **+0.009 (−0.018, 0.035)** |
| Under-tier rate gap (predicted below true) | +0.033 (0.013, 0.054) | +0.042 (0.018, 0.065) |
| Over-tier rate gap | −0.008 (−0.024, 0.008) | −0.033 (−0.050, −0.016) |
| **ER1b: per-tier EOD**: Emerging / Established / Elite / World Class | 0.013 / 0.033 / 0.035 / 0.052 | 0.013 / 0.040 / 0.037 / 0.009 |
| ER1b max EOD | 0.052 (0.028, 0.171) | 0.040 (0.032, 0.141) |

- The largest single component under Model A is the **World Class TPR gap: −5.2 pp** (−17.0, +5.8).
- Tiers from the primary regressor show the same pattern: ER1a +0.039 (0.016, 0.063), under-tier gap
  +0.043 (0.023, 0.064).
- **Directional reading:** the errors lean towards under-tiering non-UEFA players. That is consistent
  with the positive regression residuals. ER1b alone would not show this, because it ignores direction.
- **Against the spec's provisional ~10 pp reference:** every point estimate is below 10 pp. But the CIs
  for the World Class and Elite components reach above it, and the reference is not evidence-based
  (D-021). **No compliance is claimed.**
- **Demographic parity (supplementary):** predicted-tier selection-rate gaps follow the true base-rate
  gaps. For example, Emerging under Model A: selection gap −0.071 vs base-rate gap −0.087. They mainly
  reflect the groups' different true tier distributions, so parity is not a target here.

> **Small-sample caution (`SUPPLEMENTARY_CHECKS.md` §3):** with 94 non-UEFA World Class players, the
> minimum detectable TPR difference is about 16 pp (Elite: about 10 pp). The World Class and Elite
> components, and therefore `ER1b_max_EOD`, are **not estimable with useful precision**. Read them as
> "compatible with no gap or a sizeable gap", not as evidence of fairness. Under club-clustered CIs,
> Model A's ER1a lower bound reaches 0.

## 4. Model A vs Model B (RQ4; not a causal decomposition)

- Removing league and club context **raises** the signed gap from +0.093 to +0.164. The paired
  difference A − B is −0.071 (−0.102, −0.041).
- Part of the gap Model B leaves unexplained lines up with league and club context, which non-UEFA
  players in this population are more often positioned in. A substantial positive gap remains *after*
  conditioning on context.
- SHAP (`EXPLAINABILITY.md`) shows league identity and age contribute most to the difference between the
  groups' *predictions* under Model A. The *residual* gap is, by definition, what the features do not explain.
- ER1a differs little between models (A − B +0.016, CI −0.012 to 0.045). Model B over-tiers non-UEFA
  players less often (over-tier gap −0.033).

## 5. What can and cannot be concluded

**Can be said (within the population):**
- A nationality-blind model trained on performance, profile and context systematically under-predicts
  non-UEFA players' Transfermarkt values relative to UEFA players in the same leagues and at the same
  predicted value. Log gaps are +0.093 (Model A) and +0.164 (Model B), about +10% and +18% in relative terms.
- Absolute accuracy is similar for both groups.
- The gap is not explained by league mix, predicted-value level, the minutes threshold or familiarity with
  the club. It is concentrated in a subset of leagues.
- The original hypothesis ("non-UEFA players get lower value-tier outcomes than comparable UEFA players")
  is **not supported in this population and with these features**. The observed association runs the
  other way.

**Candidate explanations that this study cannot separate** (none tested; listed so the result is not
over-read):
1. **Selection on unobserved quality.** Non-UEFA players reach these leagues after a stricter filter
   (RESEARCH_DESIGN §9). The larger gap for recent arrivals and the smaller gap for diaspora-born players
   fit this, but do not establish it.
2. **Deliberately excluded variables.** International caps were excluded as a nationality proxy (D-003),
   and so were contract and agent data. Non-UEFA players in Europe may differ on these, and they can
   affect value.
3. **League-specific market structure.** The gap is concentrated in RU1, TR1, GR1, UKR1 and BE1.
4. **Valuation practice.** How Transfermarkt's community values imported players. The target itself may
   carry patterns that are not about player quality.

**Cannot be said:** that anyone discriminates, in either direction; that nationality causes higher
valuations; or anything about players outside these 14 leagues.

## 6. Limitations specific to this audit
- Club dependence: residual ICC is 0.08 (A) and 0.49 (B). Club-clustered CIs are 0.84–1.18 × as wide,
  and conclusions are unchanged (SUPPLEMENTARY_CHECKS §2).
- The CIs ignore refit variance. Some stratum intervals will exclude 0 by chance (no multiplicity
  correction; strata are descriptive).
- The ER1b maximum is biased upwards. Per-tier World Class and Elite estimates rest on 94 and 246
  non-UEFA players.
- Results are for the pre-specified primary model. Other algorithms agree on the sign and size (§1).
- The first run's estimates (Model A +0.099) moved slightly after the D-028 preprocessing fix. Every
  number here comes from the regenerated outputs.
