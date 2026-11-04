# Model evaluation (Milestone 3, first full run)

**Run:** 2026-11-04, `python -m src.models.train --trials 25`; MLflow experiment `fairvalue-m3-baselines`
(10 runs); dataset fingerprint `91174c392a8be652`.
**Population:** 5,820 players (docs/RESEARCH_DESIGN.md §1).
**Protocol:** 5-fold CV stratified on tier; Optuna nested inside the outer folds; every number below
comes from held-out (out-of-fold) predictions. Source tables: `reports/models/`.

## 1. Regression (target ln(value))

| Model | Algorithm | log RMSE | log MAE | log R² | EUR RMSE | EUR MAE | EUR R² | Median abs. error (EUR) | Fold SD of log RMSE |
|---|---|---|---|---|---|---|---|---|---|
| A | Ridge (baseline) | 0.604 | 0.471 | 0.856 | €6.97M | €2.73M | 0.751 | €0.68M | 0.012 |
| A | Random Forest | 0.646 | 0.503 | 0.835 | €7.88M | €3.07M | 0.682 | €0.71M | 0.012 |
| A | HGB (default) | 0.539 | 0.417 | 0.885 | €5.82M | €2.40M | 0.826 | €0.62M | 0.017 |
| **A** | **HGB (Optuna)** | **0.529** | **0.408** | **0.890** | **€5.59M** | **€2.35M** | **0.840** | **€0.60M** | 0.014 |
| B | Ridge | 1.026 | 0.830 | 0.585 | €9.44M | €4.33M | 0.544 | €1.26M | 0.027 |
| B | Random Forest | 0.985 | 0.790 | 0.618 | €9.54M | €4.22M | 0.533 | €1.15M | 0.021 |
| B | HGB (default) | 0.922 | 0.728 | 0.665 | €8.58M | €3.82M | 0.623 | €1.08M | 0.020 |
| B | HGB (Optuna) | 0.919 | 0.727 | 0.668 | €8.66M | €3.81M | 0.616 | €1.06M | 0.020 |

- **Primary model** (pre-specified rule D-019, lowest mean fold log RMSE under Model A): **Optuna-tuned
  HistGradientBoosting**. Mean fold log RMSE 0.5285 against 0.5391 for default HGB
  (`reports/models/primary_model.json`). Pooled out-of-fold RMSE gives the same ranking.
- **Reading the log scale:** a log MAE of 0.408 means the typical prediction is off by a factor of about
  e^0.408 ≈ 1.5. On the EUR scale the median absolute error is €0.60M, but RMSE (€5.59M) is dominated
  by the most expensive players.
- **Tuning:** tuning helps a little over default HGB (log RMSE 0.539 → 0.529). The selected
  hyperparameters vary a lot between folds (`optuna_best_params.csv`), which suggests a flat
  optimum. Random Forest with the chosen settings is worse than the Ridge baseline under Model A.
- **Model A vs Model B:** removing league identity and club strength raises log RMSE from 0.529 to 0.919
  and lowers R² from 0.890 to 0.668. Most of the explained variance comes from where a player plays,
  not only from how they perform. Given the data available, that is a central substantive finding.

### Error analysis (primary model, Model A; `errors_by_*_full.csv`)
- **By position:** goalkeepers have the largest error (log MAE 0.462); midfielders and defenders the
  smallest (0.394, 0.395). Mean residuals are all close to 0.
- **By true tier:** Emerging players are over-predicted on average (mean residual −0.160), while
  Elite (+0.242) and World Class (+0.246) are under-predicted. This is the usual regression towards
  the mean: predictions are shrunk towards the centre.
- **By minutes:** error falls as minutes rise (log MAE 0.525 for 450–899, 0.429 for 900–1,799, 0.381
  for 1,800+). This matches the per-90 reliability analysis in the scope assessment.
- **By league:** Scotland has the largest error (log MAE 0.553); Ukraine (0.334) and Germany (0.358)
  the smallest.
- The residual plot shows diagonal bands because Transfermarkt values are rounded (102 distinct values).

### Generalisation to unseen clubs (supplementary)
With whole clubs held out, Model A log RMSE rises from 0.527 to 0.573 (+8.8%) and log R² falls from
0.891 to 0.871 (HGB with median tuned parameters). Ridge only rises 1.5%. The primary figures describe
players at clubs seen in training. See `SUPPLEMENTARY_CHECKS.md` §1.

## 2. Tier classification (€2M / €10M / €30M)

| Model | Accuracy | Balanced acc. | Macro F1 | Adjacent-tier acc. | Macro ROC AUC (OvR) | Fold SD acc. |
|---|---|---|---|---|---|---|
| A: HGB classifier | 0.793 | 0.721 | 0.737 | 0.999 | 0.946 | 0.013 |
| B: HGB classifier | 0.665 | 0.568 | 0.590 | 0.969 | 0.862 | 0.009 |
| A: tiers from primary regressor | 0.813 | — | 0.764 | — | — | — |
| B: tiers from primary regressor | 0.667 | — | 0.583 | — | — | — |

Per-tier one-vs-rest results for Model A (ROC AUC / average precision): Emerging 0.965 / 0.960,
Established 0.897 / 0.782, Elite 0.939 / 0.659, World Class 0.981 / 0.802.

- Almost all errors are to an adjacent tier (99.9% within one tier under Model A).
- Established and Elite are the hardest tiers. The confusion matrix (`plots/classifier_full.png`) shows
  most misclassifications fall between neighbouring tiers.
- **Calibration** (one-vs-rest reliability diagrams) is close to the diagonal for all four tiers.
  Predicted World Class probabilities rarely go above about 0.5.
- **Honest note:** binning the primary regressor's predictions gives slightly higher accuracy (0.813)
  and macro F1 (0.764) than the dedicated classifier. The classifier is kept because it provides the
  probabilities needed for ROC, PR and calibration (RESEARCH_DESIGN §5). Both are audited for fairness.

## 3. Not yet done
- No quality gate has been set. The spec's R² ≥ 0.75 placeholder (S-7) referred to a different setup.
  A CI gate should be set from these measured baselines in Milestone 7.
- The primary model has not yet been refit on all data for serving (Milestone 6).
- SHAP and DiCE: Milestone 5.
