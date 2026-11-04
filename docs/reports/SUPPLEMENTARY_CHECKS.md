# Supplementary validation checks

**Run:** regenerated 2026-11-05 (`scripts/run_pipeline.sh`, after D-028), `python -m src.fairness.supplementary --boot 2000`. Tables: `reports/supplementary/`.
These checks do **not** change the primary protocol (RESEARCH_DESIGN §6–§7) or the primary results.
They describe how sensitive those results are to two assumptions: that players are independent,
and that validation players come from clubs already seen in training.

## 1. Generalisation to unseen clubs (grouped-by-club CV)

The primary protocol splits *players*, so a validation player's teammates are usually in the
training folds. Here, whole valuation clubs are held out (StratifiedGroupKFold, 326 clubs; no
club appears in two folds). The algorithms and settings are the same; HGB uses the median of the
per-fold Optuna optima, so no re-tuning was done.

| Model | Algorithm | Log RMSE (player folds) | Log RMSE (club folds) | Change | Log R² player → club | EUR R² player → club |
|---|---|---|---|---|---|---|
| A | Ridge | 0.604 | 0.613 | +1.5% | 0.856 → 0.853 | 0.751 → 0.740 |
| A | HGB (default) | 0.539 | 0.584 | +8.2% | 0.885 → 0.866 | 0.826 → 0.773 |
| A | HGB (median tuned) | 0.527 | 0.573 | +8.7% | 0.891 → 0.871 | 0.848 → 0.795 |
| B | Ridge | 1.026 | 1.028 | +0.2% | 0.585 → 0.583 | 0.544 → 0.539 |
| B | HGB (median tuned) | 0.915 | 0.941 | +2.9% | 0.670 → 0.651 | 0.615 → 0.601 |

- Gradient boosting in Model A gains about 8–9% in RMSE from having seen the same clubs. It probably
  learns club-specific value levels, since `club_ppg` effectively identifies a club. Ridge gains very little.
- For players at **clubs the model has never seen**, the realistic Model A performance is log RMSE of
  about 0.57 and log R² of about 0.87. The primary figures (0.526 / 0.891) describe players at known clubs.
- HGB still beats Ridge under club folds (0.573 vs 0.613), so the model choice stands.
- **The fairness gap does not depend on this.** Model A's league-stratified signed log gap is +0.099
  with player folds and +0.112 with club folds; Model B +0.166 and +0.166. These use the median-tuned
  settings, so they differ slightly from the primary +0.093, which uses per-fold tuning.

## 2. Dependence within clubs (club-clustered bootstrap)

Residual intra-club correlation (ICC(1) on held-out log residuals):

| Model | ICC |
|---|---|
| A | 0.084 |
| B | 0.494 |

- Under Model B about half the residual variance is between clubs, because Model B has no club or
  league context. Under Model A, club context absorbs most of it.
- The primary CIs resample *players* within league × group, which treats players as independent. As a
  sensitivity check, **whole clubs** were resampled within each league (2,000 replicates).

| Metric | Estimate | Player-level CI | Club-clustered CI | Width ratio |
|---|---|---|---|---|
| A signed gap (league-stratified) | +0.093 | 0.063 to 0.124 | 0.061 to 0.125 | 1.05 |
| A MAE gap | +0.012 | −0.008 to 0.031 | −0.008 to 0.030 | 0.98 |
| A ER1a | +0.025 | 0.001 to 0.049 | −0.000 to 0.050 | 1.04 |
| A under-tier gap | +0.033 | 0.013 to 0.054 | 0.012 to 0.056 | 1.06 |
| B signed gap (league-stratified) | +0.164 | 0.121 to 0.207 | 0.115 to 0.216 | 1.18 |
| B ER1a | +0.009 | −0.018 to 0.035 | −0.021 to 0.041 | 1.16 |

All metrics: `clustered_bootstrap.csv`. Width ratios range from 0.84 to 1.18.

**Conclusion:**
- Clustering widens the main intervals only slightly: about 5% for Model A and 18% for Model B.
- The signed gaps stay clearly above 0 under both schemes.
- The one material change: Model A's ER1a lower bound moves from +0.001 to −0.000. **ER1a should not
  be described as clearly different from 0.**
- Player-level CIs stay the primary reported intervals (locked protocol). Club-clustered CIs are reported
  alongside them as a sensitivity check.

## 3. World Class (and Elite) tier: limits of per-tier equalized odds

Denominators and the approximate minimum detectable difference (MDD): two-sided α = 0.05, 80%
power, normal approximation at the observed pooled rate (`tier_cell_power.csv`, Model A).

| Tier | TPR denominators (non-UEFA / UEFA) | MDD for TPR gap | FPR denominators | MDD for FPR gap |
|---|---|---|---|---|
| Emerging | 617 / 2,159 | 3.8 pp | 879 / 2,165 | 3.5 pp |
| Established | 539 / 1,317 | 6.2 pp | 957 / 3,007 | 3.6 pp |
| Elite | 246 / 597 | 10.3 pp | 1,250 / 3,727 | 2.1 pp |
| **World Class** | **94 / 251** | **16.4 pp** | 1,402 / 4,073 | 0.9 pp |

**How to read World Class and Elite results:**
- The World Class TPR gap (−5.2 pp, CI −17.0 to +5.8) is about a third of what the sample can
  reliably detect. The data is **compatible with no difference and with a difference of up to
  about 17 pp in either direction**. It should be reported as "not estimable with useful precision",
  not as "small" and not as "fair".
- Because World Class TPR dominates `ER1b_max_EOD` under Model A, the maximum EOD (0.052) mostly
  reflects this imprecise cell. The maximum is also biased upwards (RESEARCH_DESIGN §7).
- World Class FPR has a large denominator but a very low base rate (1.1%), so its small absolute
  differences say little about how World Class players themselves are treated.
- Elite TPR (MDD 10.3 pp) has the same problem to a lesser degree.
- The per-tier conclusions that can bear weight are those for **Emerging and Established**, plus
  the **directional** under-tier gap, which pools all tiers.
- No tier boundary was changed to enlarge the World Class cell: the boundaries are a locked label
  definition (D-018).
