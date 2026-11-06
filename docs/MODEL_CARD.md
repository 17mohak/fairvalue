# Model card: FairValue market value model

Format follows Mitchell et al. (2019), "Model Cards for Model Reporting". All numbers come from
held-out (out-of-fold) evaluation unless stated otherwise. Sources: `docs/reports/MODEL_EVALUATION.md`,
`docs/reports/FAIRNESS_AUDIT.md`, `docs/reports/SUPPLEMENTARY_CHECKS.md`, `models/model_registry.json`.

## Model details
| | |
|---|---|
| Developer | Mohak Mandwani |
| Date / version | 2026-11-05 (regenerated after D-028) · `fairvalue-regressor_A-hgb_tuned-91174c39-20261104` (+ classifier and Model B variants) |
| Type | scikit-learn `Pipeline`: shared `ColumnTransformer` + `HistGradientBoostingRegressor` (target: ln EUR value). Separate `HistGradientBoostingClassifier` for 4 value tiers |
| Variants | **Model A** (served default): performance + profile + league + club strength. **Model B** (ablation): performance + profile only |
| Hyperparameters | Median of the per-fold Optuna optima (25 trials, nested CV); listed in the registry |
| Training data | 5,820 players, valuations 2025-06-12 to 2026-06-12, clubs in 14 European first divisions, ≥ 450 club minutes (`docs/DATA_CARD.md`) |
| Licence | Code: MIT (`LICENSE`). Data: see the data card (licensing uncertain) |
| Interface | `POST /predict` (FastAPI): value in EUR, tier, tier probabilities, model version, disclaimer |

## Intended use
- **Intended:** research and teaching about the ML lifecycle and fairness auditing, and
  illustrating how a nationality-blind model can still produce group-differentiated errors.
- **Users:** the project owner, course reviewers, other researchers.
- **Out of scope (must not be used for):** scouting, recruitment, transfer or contract negotiation,
  wage setting, or any decision about a real person. This includes players outside the 14 leagues,
  players with fewer than 450 minutes, and any period other than the 2025–26 snapshot. The API
  rejects inputs outside the approved population.

## Factors
- **Groups audited:** UEFA vs non-UEFA nationals, from recorded citizenship. Nationality is never a
  model input; it is joined only after prediction.
- **Strata:** league, position, recent arrival, diaspora-born, CAF / CONMEBOL, and (exploratory)
  EU/EEA/UK/CH citizenship.
- **Other relevant factors:** league prestige and club strength are strong drivers and act as
  reputation proxies. The allowed features predict group membership with ROC AUC 0.671 (Model A) and
  0.644 (Model B), so "nationality-blind" does not mean group-blind.

## Metrics (held-out, 5-fold CV)
| | Model A | Model B |
|---|---|---|
| log RMSE / MAE / R² | 0.526 / 0.406 / 0.891 | 0.917 / 0.725 / 0.669 |
| EUR MAE / R² / median abs. error | €2.32M / 0.846 / €0.62M | €3.82M / 0.611 / €1.06M |
| log RMSE, clubs unseen in training (supplementary) | 0.573 (+8.7%) | 0.941 (+2.9%) |
| Tier classifier accuracy / macro F1 / macro ROC AUC | 0.793 / 0.737 / 0.946 | 0.665 / 0.590 / 0.862 |

Typical error: predictions are off by a factor of about 1.5 (e^0.406). Errors are larger for
goalkeepers, players with under 900 minutes and Scottish-league players. Low-value players are
over-predicted and high-value players under-predicted (shrinkage towards the mean).

## Quantitative fairness analysis
Gap = non-UEFA − UEFA; residual = actual − predicted (positive = under-predicted); 95% stratified-bootstrap CIs.

| | Model A | Model B |
|---|---|---|
| Signed log-residual gap, league-stratified | **+0.093** (0.063, 0.124) | **+0.164** (0.121, 0.207) |
| Same, club-clustered CI | (0.061, 0.125) | (0.115, 0.216) |
| MAE gap (league-stratified) | +0.012 (−0.008, 0.031) | −0.009 (−0.039, 0.022) |
| ER1a tier error-rate gap | +0.025 (0.001, 0.049); club-clustered (−0.000, 0.050) | +0.009 (−0.018, 0.035) |
| Under-tier rate gap | +0.033 (0.013, 0.054) | +0.042 (0.018, 0.065) |
| Per-tier EOD (Emerging / Established / Elite / World Class) | 0.013 / 0.033 / 0.035 / 0.052 | 0.013 / 0.040 / 0.037 / 0.009 |

**Interpretation:**
- The model **under-predicts non-UEFA players' Transfermarkt values by about 10% relative to UEFA
  players in the same leagues**, at similar overall accuracy.
- This holds within predicted-value deciles, for every algorithm, at the 900-minute threshold, and with
  clubs held out. It is concentrated in RU1, TR1, GR1, UKR1 and BE1.
- It runs **opposite** to the project's original hypothesis.
- World Class and Elite per-tier components are imprecise: the minimum detectable TPR difference is
  about 16 pp and about 10 pp respectively. Do not read them as evidence of fairness.
- These are associations conditional on the model, its features and a selected population. They are
  not evidence of discrimination or of any causal effect of nationality.

## Training and evaluation data
- Same population for both; evaluation uses out-of-fold predictions (StratifiedKFold on tier, seed 42).
- The earlier valuation period (2024-06-12 to 2025-06-12) is reserved for drift simulation and never
  used in training, tuning or CV.

## Ethical considerations
- **Target bias:** the target is Transfermarkt's community estimate, which may itself reflect
  reputation or national bias. The model reproduces it; it cannot correct it.
- **Selection:** only 16.7% of currently valued non-UEFA players fall within the population, against
  41.6% of UEFA players. Results do not generalise to the global market.
- **Personal data:** professional players' public performance data, processed under legitimate interest
  for research. Citizenship is held separately and used only for the audit.
- **Misuse risk:** a valuation number can be used to justify lower offers. The disclaimer, input
  validation and out-of-scope list are mitigations, not guarantees.
- **EU AI Act:** see `docs/EU_AI_ACT_ASSESSMENT.md` (research use outside scope; high-risk if
  repurposed for recruitment).

## Caveats and recommendations
- Re-run the fairness audit after any retraining (`docs/MONITORING.md`, policy T1–T3).
- Report the unseen-club figures if the model is ever applied to new clubs.
- EUR predictions are median-type (exp of log prediction, no smearing correction).
- Explanations (`docs/reports/EXPLAINABILITY.md`): league and age drive most of the difference between
  groups' predictions (SHAP). DiCE (720 queries) shows no consistent group difference in distance to the next tier. DiCE results are
  feature-based counterfactuals, not nationality interventions.
