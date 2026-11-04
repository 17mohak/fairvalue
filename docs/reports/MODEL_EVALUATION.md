# Model evaluation (Milestone 3)

**Run:** regenerated 2026-11-05 with `scripts/run_pipeline.sh` after the D-028 fixes. Training used
`python -m src.models.train --trials 25`; MLflow experiment `fairvalue-m3-baselines`; dataset
fingerprint `91174c392a8be652`.
**Population:** 5,820 players (docs/RESEARCH_DESIGN.md §1).
**Protocol:** 5-fold CV stratified on tier; Optuna nested inside the outer folds; every number below
comes from held-out (out-of-fold) predictions. Source tables: `reports/models/`.

## 1. Regression (target ln(value))

| Model | Algorithm | log RMSE | log MAE | log R² | EUR RMSE | EUR MAE | EUR R² | Median abs. error (EUR) | Fold SD of log RMSE |
|---|---|---|---|---|---|---|---|---|---|
| A | Ridge (baseline) | 0.604 | 0.471 | 0.856 | €6.97M | €2.73M | 0.751 | €0.68M | 0.012 |
| A | Random Forest | 0.646 | 0.503 | 0.836 | €7.87M | €3.06M | 0.683 | €0.72M | 0.010 |
| A | HGB (default) | 0.539 | 0.417 | 0.885 | €5.82M | €2.40M | 0.826 | €0.62M | 0.017 |
| **A** | **HGB (Optuna)** | **0.526** | **0.406** | **0.891** | **€5.49M** | **€2.32M** | **0.846** | **€0.62M** | 0.013 |
| B | Ridge | 1.026 | 0.830 | 0.585 | €9.44M | €4.33M | 0.544 | €1.26M | 0.027 |
| B | Random Forest | 0.986 | 0.791 | 0.617 | €9.55M | €4.22M | 0.532 | €1.13M | 0.022 |
| B | HGB (default) | 0.922 | 0.728 | 0.665 | €8.58M | €3.82M | 0.623 | €1.08M | 0.020 |
| B | HGB (Optuna) | 0.917 | 0.725 | 0.669 | €8.71M | €3.82M | 0.611 | €1.06M | 0.025 |

- **Primary model** (pre-specified rule D-019, lowest mean fold log RMSE under Model A): **Optuna-tuned
  HistGradientBoosting**. Mean fold log RMSE 0.5254 against 0.5391 for default HGB
  (`reports/models/primary_model.json`). Pooled out-of-fold RMSE gives the same ranking.
- **Reading the log scale:** a log MAE of 0.406 means the typical prediction is off by a factor of about
  e^0.406 ≈ 1.5. On the EUR scale the median absolute error is €0.62M, but RMSE (€5.49M) is dominated
  by the most expensive players.
- **Tuning:** tuning helps a little over default HGB (log RMSE 0.539 → 0.526). The selected
  hyperparameters vary a lot between folds (`optuna_best_params.csv`), which suggests a flat optimum.
  Random Forest with the chosen settings is worse than the Ridge baseline under Model A.
- **Model A vs Model B:** removing league identity and club strength raises log RMSE from 0.526 to 0.917
  and lowers R² from 0.891 to 0.669. Most of the explained variance comes from where a player plays,
  not only from how they perform. Given the data available, that is a central substantive finding.

### Error analysis (primary model, Model A; `errors_by_*_full.csv`)
- **By position:** goalkeepers have the largest error (log MAE 0.459); midfielders (0.394) and defenders
  (0.398) the smallest. Mean residuals are all within ±0.03.
- **By true tier:** Emerging players are over-predicted on average (mean residual −0.155), while
  Established (+0.103), Elite (+0.232) and World Class (+0.229) are under-predicted. This is the usual
  regression towards the mean: predictions are shrunk towards the centre.
- **By minutes:** error falls as minutes rise (log MAE 0.521 for 450–899, 0.430 for 900–1,799, 0.378
  for 1,800+). This matches the per-90 reliability analysis in the scope assessment.
- **By league:** Scotland has the largest error (log MAE 0.555); Ukraine (0.330) and Germany (0.364)
  the smallest.
- The residual plot shows diagonal bands because Transfermarkt values are rounded (102 distinct values).

### Generalisation to unseen clubs (supplementary)
With whole clubs held out, Model A log RMSE rises from 0.527 to 0.573 (+8.7%) and log R² falls from
0.891 to 0.871 (HGB with median tuned parameters). Ridge only rises 1.5%. The primary figures describe
players at clubs seen in training. See `SUPPLEMENTARY_CHECKS.md` §1.

## 2. Tier classification (€2M / €10M / €30M)

| Model | Accuracy | Balanced acc. | Macro F1 | Adjacent-tier acc. | Macro ROC AUC (OvR) | Fold SD acc. |
|---|---|---|---|---|---|---|
| A: HGB classifier | 0.793 | 0.721 | 0.737 | 0.999 | 0.946 | 0.013 |
| B: HGB classifier | 0.665 | 0.568 | 0.590 | 0.969 | 0.862 | 0.009 |
| A: tiers from primary regressor | 0.811 | — | 0.763 | — | — | — |
| B: tiers from primary regressor | 0.671 | — | 0.587 | — | — | — |

Per-tier one-vs-rest results for Model A (ROC AUC / average precision): Emerging 0.965 / 0.960,
Established 0.897 / 0.782, Elite 0.939 / 0.659, World Class 0.981 / 0.802.

- Almost all errors are to an adjacent tier (99.9% within one tier under Model A).
- Established and Elite are the hardest tiers. The confusion matrix (`plots/classifier_full.png`) shows
  most misclassifications fall between neighbouring tiers.
- **Calibration** (one-vs-rest reliability diagrams) is close to the diagonal for all four tiers.
  Predicted World Class probabilities rarely go above about 0.5.
- **Honest note:** binning the primary regressor's predictions gives slightly higher accuracy (0.811)
  and macro F1 (0.763) than the dedicated classifier. The classifier is kept because it provides the
  probabilities needed for ROC, PR and calibration (RESEARCH_DESIGN §5). Both are audited for fairness.
- The classifier results are identical to the first run: the classifier does not subsample features,
  so the D-028 category reordering does not affect it.

## 3. Quality gate (`src/models/quality_gate.py`)
The full-run gate passes: Model A log R² 0.891 ≥ 0.86; Model B 0.669 ≥ 0.62; Model A beats Model B;
tier accuracy 0.793 ≥ 0.75. Thresholds and their basis are in `docs/MONITORING.md`.
