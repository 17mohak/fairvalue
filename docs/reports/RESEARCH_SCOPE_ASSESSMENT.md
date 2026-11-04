# Research-scope assessment (input to D-011)

**Status:** recommendation only. D-011 is **PENDING PROJECT-OWNER APPROVAL**. No dataset,
threshold or model was changed, and no model was trained.
**Evidence:** `python -m src.fairness.scope_analysis` → `reports/scope/*.csv` (15 tables).
Every number below is copied from those files or from `reports/coverage/`.

---

## Summary

1. **The retained sample is strongly selected, and more strongly for non-UEFA players.**
   Retained non-UEFA players sit at the 82nd percentile of their group's value distribution;
   retained UEFA players at the 74th. For AFC players, the retained median value is 10× the
   excluded median. A 14-league design studies the non-UEFA players who *made it* to Europe.
2. **That selection makes the audit asymmetric.** Finding that non-UEFA players are
   *undervalued* would be robust, because selection pushes the other way. Finding *no* gap,
   or a positive gap, cannot be read as "no undervaluation in the market".
3. **450 minutes is the lowest defensible threshold, not an optimal one.** Below it, per-90
   output is mostly noise (split-half reliability 0.19). The choice of threshold does not
   change group composition (non-UEFA share 25.5–26.0% at 90, 450 and 900 minutes).
4. **Within-league overlap is good.** In all 14 leagues, at least 94% of non-UEFA players have
   a comparable UEFA player in the same league and position. Pooled balance after matching is
   excellent (all |SMD| ≤ 0.062). Separate league-level estimates are only possible for 8 leagues.
5. **Proxy signal is spread across many features, not concentrated in league identity.** League
   identity adds about 0.03 AUC. Position, height and match statistics each carry similar
   amounts, and the signal stays inside leagues (within-league AUC 0.626). Across *all*
   leagues, league identity alone makes the group almost recoverable (AUC 0.859). That rules out Option B.
6. **The original hypothesis is a question about the valuation market (Question A).** The
   model is the measuring instrument. The right primary metric is the signed, conditional gap
   between target and prediction. Equalized odds answers Question B (does the model err equally
   often for both groups) and cannot test the hypothesis on its own.
7. **Recommendation: Option E (a refined C).** The primary analysis uses the 14 leagues, but is
   explicitly selection-aware: compare within league and position, decompose with Model A vs
   Model B, and include pre-specified selection diagnostics. All-league material is descriptive only.

---

## 1. Selection bias and representativeness

### Who is retained (`1_selection_profile.csv`)

| Group / status | n | Median age | Median value | p90 value | Has any match data |
|---|---|---|---|---|---|
| UEFA retained | 4,324 | 26.4 | €2.0M | €20M | 100% |
| UEFA excluded: league not covered | 4,859 | 25.6 | €0.4M | €2.0M | 43.1% |
| UEFA excluded: < 450 min | 1,212 | 22.5 | €0.3M | €2.0M | 74.4% |
| non-UEFA retained | 1,496 | 26.3 | €2.5M | €20M | 100% |
| non-UEFA excluded: league not covered | 7,127 | 26.4 | €0.4M | €2.5M | 12.1% |
| non-UEFA excluded: < 450 min | 346 | 22.4 | €0.5M | €3.5M | 81.2% |

- **Value:** retained players are worth far more than excluded ones in both groups (€2.0M vs €0.4M
  UEFA; €2.5M vs €0.4M non-UEFA).
- **Selection intensity** (`1_selection_intensity.csv`): retained players' median value percentile
  within their own group is 73.8 for UEFA and 82.3 for non-UEFA. The non-UEFA sample is drawn from
  higher up its distribution.
- **By confederation** (`1_selection_by_confederation.csv`): the median value of retained vs excluded
  players is 10× for AFC and OFC, 7× for CAF, 5× for CONMEBOL and UEFA, 4× for CONCACAF.
- **By nationality** (`1_selection_by_nationality.csv`): 0.7% of Saudi, 4.2% of South Korean, 6.1% of
  Colombian and 11.3% of Argentine valued players are retained, against 26.7% of Brazilians and 34.5%
  of Nigerians. Retained Argentines have a median of €5.0M, excluded ones €0.5M.
- **Position:** retained non-UEFA players are more often attackers (35.6% vs 24.3%) and rarely
  goalkeepers (4.1% vs 9.8%).
- **Age:** similar in both groups (26.3 vs 26.4).
- **The minutes filter is not group-differential** (`1_exclusion_given_value.csv`): within each value
  quartile, the share removed for having under 450 minutes differs by at most 4.1 points (Q2: 17.9% UEFA,
  22.0% non-UEFA). The selection happens at the **league-coverage** stage, not the minutes stage.

### Can the sample hide the disparity we are looking for?

Yes, in a specific direction:
- Entry into a covered league is plausibly selected on value. A club only imports a non-European player
  it already values highly. Work-permit and non-EU squad rules (known context, not measured here) push
  in the same direction.
- If the market undervalued some non-UEFA players, those players would be **less** likely to be signed,
  and so less likely to be in our sample. The retained non-UEFA players are then biased towards those
  the market rates highly for their observed performance. Selection on the outcome biases the
  conditional gap upwards (towards "overvalued").
- The data shows this pattern: before any adjustment, non-UEFA eligible players are valued higher
  (log-value SMD +0.204). After within-league, same-position matching on performance and profile,
  the gap is still +0.123 (`3_pooled_match_balance.csv`). **This is descriptive and must not be read
  as a result.** It is the pattern selection would produce, and also the pattern genuine overvaluation
  would produce. The data cannot tell them apart.

### Implications for the hypothesis
- **A finding of non-UEFA undervaluation** within this sample would be *conservative*, since selection
  works against it. It would be the strongest possible result.
- **A null or positive finding** says only that, among non-UEFA players who reached these leagues,
  valuations are not lower than a nationality-blind model predicts. It says nothing about the
  non-UEFA players in other leagues (83.3% of valued non-UEFA players).
- **External validity** is limited to "players at clubs in 14 European first divisions, valued
  2025-06 to 2026-06". It does not extend to the global market, to second divisions, or to non-European leagues.

### A framing issue the brief does not mention
The literature behind the hypothesis (Deschamps & De Sousa 2021, in the report) is about **EU labour
mobility**, not UEFA membership. Of 4,324 retained UEFA players, 1,024 hold non-EU/EEA/UK/CH
citizenships (Ukraine, Russia, Serbia, Türkiye and others), with a median value of €0.8M against
€2.5M for EU-mobile UEFA players (`1_eu_mobility_framing.csv`). The binary UEFA group is therefore
mixed with respect to the mechanism the hypothesis cites. I recommend keeping UEFA vs non-UEFA as
the locked primary contrast and adding EU-mobile vs not as a **secondary** contrast. This is a
proposal touching a locked decision, so it needs your approval.

---

## 2. Minutes threshold: 90 vs 450 vs 900

From `2_threshold_populations.csv`, `2_threshold_confederations.csv` and `2_per90_reliability.csv`:

| Threshold | UEFA n | non-UEFA n | non-UEFA share | Median value U / non-U | Per-90 computable* | Smallest value-quartile cell | CAF / CONMEBOL / CONCACAF / AFC |
|---|---|---|---|---|---|---|---|
| 90 | 4,951 | 1,693 | 25.5% | €1.5M / €2.4M | 87–88% | 313 | 769 / 582 / 185 / 147 |
| **450** | 4,324 | 1,496 | 25.7% | €2.0M / €2.5M | 100% | 297 | 675 / 533 / 154 / 127 |
| 900 | 3,797 | 1,331 | 26.0% | €2.0M / €3.0M | 100% | 267 | 596 / 478 / 134 / 117 |

*Under the current per-90 rule (≥ 450 minutes). Club strength and height are ≥ 95% present at every threshold.

**Reliability of per-90 output** (odd vs even matches, Spearman–Brown corrected):

| Minutes band | Players | Goal contributions per 90 | Yellow cards per 90 |
|---|---|---|---|
| 90–449 | 760 | 0.185 | −0.006 |
| 450–899 | 692 | 0.422 | 0.228 |
| 900–1,799 | 1,223 | 0.629 | 0.321 |
| 1,800+ | 3,905 | 0.862 | 0.590 |

**Assessment**
- **90 minutes is not defensible.** For 760 players the per-90 numbers would be essentially noise,
  and the extra players are mostly cheaper backups.
- **450 minutes is the lowest defensible threshold, chosen by convention.** It was originally picked
  as "about five full matches", not from evidence. The evidence now supports it as a floor: it is the
  first band where per-90 output has any reliability. But 692 eligible players (11.9%) are in the
  450–899 band, where reliability is modest (0.42).
- **900 minutes is more reliable but more selected.** It loses 11% of non-UEFA players and raises
  their median value from €2.5M to €3.0M, a stronger tilt towards established regulars.
- **None of the thresholds changes group composition or makes the comparison unviable.**

**Recommendation:** keep 450 as the primary threshold, and pre-register 900 as a sensitivity
analysis. Consider shrinking per-90 rates towards position means (empirical Bayes) so that
low-minute players carry less noise without a hard cutoff. `minutes` is already a feature, so the
model can partly learn reliability itself. Do not change the threshold now.

---

## 3. Within-league comparability

From `3_within_league.csv`, `3_within_league_smd.csv` and `3_pooled_match_balance.csv`.
Matching uses an out-of-fold propensity score (Model B features plus league, **no value**), 1:1
nearest neighbour with replacement within the same league and position, caliper 0.2 SD of the logit.

- **Common support:** 97.5–100% of non-UEFA players in every league.
- **Matched within caliper:** 94.4% (PO1) to 100% of non-UEFA players. 1,461 of 1,496 matched overall,
  using 1,080 distinct UEFA controls.
- **Pooled balance after matching:** all covariates within |SMD| 0.062. Before matching the biggest
  differences were height (−0.238), yellow cards per 90 (+0.219) and goal contributions per 90 (+0.150).
- **Per-league balance after matching** is noisy (largest covariate |SMD| 0.19–0.76), because each
  league has only 48–178 non-UEFA players.

| League group | Leagues | Use |
|---|---|---|
| n non-UEFA ≥ 100 | PO1, FR1, GB1, TR1, ES1, IT1, BE1, RU1 | League-level estimates possible, wide intervals |
| 50–99 | GR1, NL1, L1, UKR1, SC1 | Contribute to the pooled estimate only |
| < 50 | DK1 (48) | Pooled only |

**Leagues differ in opposite directions** (raw log-value SMD, non-UEFA vs UEFA): RU1 +0.73,
UKR1 +0.66, TR1 +0.49 (expensive imports into cheaper leagues), but PO1 −0.23 (Portugal imports many
inexpensive South American players). An aggregate gap would mostly reflect the league mix. Every
comparison must therefore be stratified by league, and position too: the position mix differs most
in UKR1 (TVD 0.275), DK1 and RU1.

**Conclusion:** comparable UEFA and non-UEFA players exist in every covered league. A pooled
within-league design is feasible. League-specific claims are only possible for 8 leagues, and
only with wide intervals.

---

## 4. Where the proxy signal comes from

From `4_proxy_decomposition.csv`, `4_univariate_signal.csv` and `4_within_league_proxy_auc.csv`.
Evaluation: 5×5 repeated stratified CV, ROC AUC, with the preprocessing fitted inside each fold.

| Features (14-league population) | AUC mean ± sd |
|---|---|
| Shuffled labels (negative control) | 0.507 ± 0.017 |
| Club strength (`club_ppg`) | 0.503 |
| Age | 0.515 |
| Height + foot | 0.568 |
| Position + sub-position | 0.589 |
| Match statistics | 0.596 |
| League identity | 0.601 |
| Club identity (not a feature; for reference) | 0.605 |
| Model B (logistic / gradient boosting) | 0.643 / 0.633 |
| Model A (logistic / gradient boosting) | 0.671 / 0.667 |

Removing one block from Model A (logistic):

| Block removed | AUC | Drop |
|---|---|---|
| League | 0.643 | −0.028 |
| Match statistics | 0.651 | −0.020 |
| Position | 0.652 | −0.019 |
| Height + foot | 0.657 | −0.014 |
| `club_ppg` | 0.670 | ≈0 |
| Age | 0.671 | 0 |

The largest single-feature differences are position mix (TVD 0.113, sub-position 0.136), height
(non-UEFA 2 cm shorter at the median), and yellow cards and goals per 90 (both higher for non-UEFA).

**Robustness:** the shuffled-label control gives 0.507, so the evaluation is not leaking. Gradient
boosting does not find more signal than logistic regression (0.667 vs 0.671), so the signal is
not hidden in interactions. Some logistic fits gave solver convergence warnings (mainly the
high-cardinality club one-hot), but AUC is stable across 25 folds (sd 0.014–0.022).

**Within leagues:** AUC computed inside each league averages 0.626 (range 0.571 FR1 to 0.713 RU1),
so the signal is not mainly between-league.

**Outside the 14 leagues:** profile features plus league identity reach **0.859** on all
currently valued players, against 0.651 within the 14 leagues. League identity alone nearly
identifies the group in the global population.

**Implications for interpreting fairness**
- No single feature to remove would make the model group-blind. Removing league costs 0.03 AUC.
  Removing position or height would discard legitimate valuation information to remove a proxy
  for recruitment patterns, which is a poor trade.
- The **Model A vs Model B comparison** isolates the context channel (league and club strength).
  The residual within-league signal (0.626) means a nationality-blind model can still produce
  group-differentiated predictions through role and style. That is a mechanism to explain with SHAP,
  not a bug.
- **Is league a legitimate control?** If nationality affects *which* league a player can join
  (permits, quotas), conditioning on league hides that channel ("bad control"). Model B gives
  the gap including this channel; Model A gives the gap within context. Both must be reported.
  The spec lists the ablation as the first thing to cut. The evidence says it is central to the
  interpretation and should be kept.

---

## 5. Which research question does the hypothesis support?

**Hypothesis (locked spec):** *"Non-UEFA confederation players get lower value-tier outcomes than
UEFA players with comparable performance profiles."*

| | Question A: outcome disparity for comparable players | Question B: error disparity |
|---|---|---|
| Asks | Do comparable UEFA and non-UEFA players receive different value / tier outcomes? | Is the model wrong more often, or in a different way, for one group? |
| About | The **valuation market** (the target), using the model as a measuring device | The **model** as a decision tool |
| Supported by the hypothesis? | **Yes, directly.** | Indirectly; it is the ER1 requirement |

**Why A cannot be read off predictions alone.** A model that never sees nationality gives the
same prediction to two players with identical features. Predicted-outcome gaps between
"comparable" players therefore only come from features outside the comparability definition
(league, club) or from imperfect matching. The hypothesis is really about whether
**Transfermarkt's values** differ for comparable players, and the model makes that testable:

> If the target contains a group-specific component that the features cannot explain, a
> nationality-blind model cannot learn it, so it appears as a **systematic signed residual** by group.
> Model predicts higher than target for non-UEFA players → the market values them less than their
> observed profile implies (consistent with the hypothesis). Model predicts lower → the opposite.

**Primary metrics for A** (on out-of-fold predictions, stratified by league, with bootstrap CIs):
1. Mean signed log-residual (target − prediction) by group: the "unexplained" gap, similar to the
   unexplained part of an Oaxaca–Blinder decomposition.
2. Directional tier errors by group: P(true tier < predicted tier), the under-tiering rate, and
   P(true tier > predicted tier).
3. Each computed for Model A and Model B (context channel), and in pre-specified strata: recent
   arrivals, diaspora-born, EU-mobile.

**Metrics for B:** per-group RMSE/MAE on log value, per-group calibration, per-group tier accuracy,
and equalized odds as below.

### Equalized odds for a 4-tier classifier
- Fairlearn's `equalized_odds_difference` is defined for **binary** labels. For four tiers it has to
  be computed **one-vs-rest per tier k**: binarise (true = k, predicted = k), then
  EOD_k = max(|ΔTPR_k|, |ΔFPR_k|) across groups. Report all eight per-tier components and the maximum.
- **What it measures.** ΔTPR_k is the difference in how often players truly in tier k are recognised
  as k. ΔFPR_k is the difference in how often players *not* in tier k are wrongly placed there.
- **What it does not measure:**
  - **Direction.** Putting an Elite player in Established and putting them in World Class count the
    same, but the hypothesis is directional. A model can have a small EOD while consistently
    under-tiering one group by one level.
  - **The target's own bias.** Error parity is measured against Transfermarkt's labels. A model can
    satisfy equalized odds exactly while reproducing whatever bias those labels contain.
  - **Noise in small cells.** Take the maximum over eight components, then compare smaller per-tier
    groups (e.g. 297 non-UEFA in the lowest quartile). The maximum is inflated by noise, so it needs
    bootstrap CIs or a permutation null.
  - **Quantile boundaries.** Players near a boundary flip tiers easily. Report the metric under shifted
    boundaries as a sensitivity check.
- **ER1 as written conflates two quantities** ("error rate ... measured via equalized odds"). Proposal:
  ER1a = difference in overall tier error rate ≤ 10 pp; ER1b = max per-tier one-vs-rest EOD,
  reported with CI. The thresholds are still placeholders, to be finalised before results are seen.

### What we can and cannot conclude
- **Can:** "Among eligible players at clubs in 14 European first divisions (valued June 2025–June 2026),
  Transfermarkt values of non-UEFA players differ from a nationality-blind model's predictions by X
  (95% CI), within league and position. The model's tier errors differ by Y pp."
- **Cannot:** discrimination or a causal effect of nationality (talent not captured in the data,
  missing defensive statistics, contract length, agents and marketing are all omitted). Nor
  conclusions about non-European leagues, or claims that Transfermarkt's values are "correct".
- **Asymmetry, from section 1:** an undervaluation finding is robust to the known selection; a null
  or overvaluation finding is not evidence of fairness.

---

## 6. The scope options, reassessed

| Criterion | A: 14 leagues | B: all leagues, profile-only | C: A + all-league descriptive | D: add external match data | **E: selection-aware within-league (refined C)** |
|---|---|---|---|---|---|
| Research validity | Good controls; selection unaddressed | Poor: league predicts group (AUC 0.859); no performance controls | As A | Potentially best | Good controls, plus explicit selection diagnostics and context decomposition |
| Representativeness | 16.7% of valued non-UEFA players | All | Exclusions described, not analysed | High | Same sample as A; limits measured and stated |
| Data quality | Full match data | No match data for 48.6% of players; 63.5% under 450 min | As A | Two sources to reconcile | As A |
| Fairness feasibility | Yes (overlap ≥ 94%) | Confounded | Yes | Unknown | Yes, with pre-specified metrics and strata |
| Complexity | Low | Low | Low–medium | High | Medium (a few extra stratified tables) |
| Defensibility | Moderate | Weak | Good | Weak (breaks locked dataset) | **Strongest** |

**Option E specification**
1. **Population:** eligible players at clubs in the 14 covered leagues, ≥ 450 minutes (primary);
   900-minute sensitivity check.
2. **Primary estimand:** the signed conditional gap (Question A), within league and position,
   with bootstrap CIs.
   - Model B gives the total gap; Model A gives the within-context gap.
   - Both on out-of-fold predictions; a matched-sample version as a robustness check.
3. **Error parity (Question B):** ER1a/ER1b as above, alongside per-group calibration and RMSE.
4. **Pre-specified selection diagnostics.** If selection drives the gap, it should be larger where
   selection is stronger:
   - recent arrivals vs established players (27.4% vs 18.3% recent arrivals);
   - diaspora-born vs not (376 of 1,496 non-UEFA players were born in a UEFA country);
   - EU-mobile vs non-EU UEFA (a secondary contrast, needs approval).
5. **Reporting:** per-confederation results for CAF and CONMEBOL only. League-level results for the
   8 leagues with ≥ 100 non-UEFA players. All-league tables are descriptive and make no fairness claim.
6. **Pre-registration:** freeze steps 1–5 in DECISIONS.md before any model is trained.

### The strongest argument against Option E
The sample is chosen partly *by the outcome we are studying*. Non-UEFA players reach a covered
league, and so our data, largely because the market already values them; retained non-UEFA players
sit at the 82nd percentile of their group's value distribution. The players most likely to be
undervalued are the ones least likely to be signed, so they are mostly invisible by design. The
selection diagnostics can show that selection matters, but they cannot correct for it. A null or
positive result from Option E is therefore close to uninformative about the hypothesis as
originally stated, and the project might honestly be able to report only "no evidence of
undervaluation among players who reached Europe". A reviewer could fairly argue that the
14-league population answers a narrower question than the title promises. If that is
unacceptable, the only real fix is better data (Option D) or a different design, for example
following players across a move between leagues using their pre-move valuations. Both are out of
scope under the current locks.

**I still recommend Option E.** Every alternative is worse on validity (B), breaks a locked
decision (D), or keeps the same sample without stating its limits (A/C). Option E turns the
selection problem into a measured, reported limitation, and keeps the one result that would be
robust (undervaluation despite positive selection) interpretable.

## Decisions needed from you
1. Approve, amend or reject **D-011 = Option E**.
2. Approve or reject the **EU-mobility secondary contrast** (touches the locked binary framing).
3. Approve splitting **ER1 into ER1a/ER1b**, and that the ablation is no longer the first item to cut.
