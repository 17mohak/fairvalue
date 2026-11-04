# Coverage audit: is a UEFA vs non-UEFA comparison viable?

**Data:** transfermarkt-datasets snapshot (valuations to 2026-06-12), checksums in
`data/raw/MANIFEST.json`. **Generated tables:** `reports/coverage/*.csv` and
`reports/coverage/coverage_summary.md` (`python -m src.fairness.coverage`).
All numbers below are copied from those generated tables.

## Verdict

**The binary UEFA vs non-UEFA comparison is viable, but only for players at clubs in
14 European leagues, and only as a comparison within that population.** It is not
viable per confederation except for CAF and CONMEBOL.

| Question | Answer |
|---|---|
| Enough non-UEFA players to model? | Yes: 1,496 eligible non-UEFA vs 4,324 UEFA (25.7% non-UEFA). |
| Enough per value tier? | Yes for a provisional quartile split: the smallest cell is 297 non-UEFA players (lowest quartile). |
| Per-confederation analysis? | CAF 675 and CONMEBOL 533 are usable. CONCACAF 154 and AFC 127 are borderline (wide intervals). OFC 7 is not usable. |
| Is performance data equally available? | Yes, within the eligible population: median minutes 2,599 (UEFA) vs 2,570 (non-UEFA); feature missingness under 3.1% in both groups. |
| Is the population representative of all non-UEFA players? | **No.** 79% of currently valued non-UEFA players are lost because their league has no match data. |
| Historical valuations for drift? | Yes: 97.6% (UEFA) and 98.1% (non-UEFA) of eligible players also appear in the drift reference snapshot. |

## 1. Funnel

| Stage | UEFA | non-UEFA | Unknown | non-UEFA share |
|---|---|---|---|---|
| All players in dataset | 32,234 | 17,646 | 269 | 35.4% |
| Current valuation (12 months to 2026-06-12) | 10,395 | 8,969 | 0 | 46.3% |
| + valued while at a club in a covered league | 5,536 | 1,842 | 0 | 25.0% |
| + ≥ 450 club minutes in the 2-year window (= eligible) | 4,324 | 1,496 | 0 | 25.7% |

The big drop is stage 2 → 3. It removes non-UEFA players far more than UEFA players,
because most non-UEFA players play in non-European leagues with no `appearances` data.

## 2. By confederation (players with a current valuation)

| Confederation | Current valuation | In covered league | Eligible | Eligible rate |
|---|---|---|---|---|
| UEFA | 10,395 | 5,536 | 4,324 | 41.6% |
| CAF | 1,854 | 845 | 675 | 36.4% |
| CONMEBOL | 3,279 | 625 | 533 | 16.3% |
| CONCACAF | 1,266 | 199 | 154 | 12.2% |
| AFC | 2,488 | 163 | 127 | 5.1% |
| OFC | 82 | 10 | 7 | 8.5% |

The non-UEFA group is therefore mostly African (45%) and South American (36%)
players in Europe. Asian and North American players are barely represented.
Conclusions should be phrased for that population.

## 3. League composition differs by group (confounding risk)

The non-UEFA share among eligible players ranges from 16.7% (UKR1) to 42.1% (PO1)
and 41.8% (FR1). League median values range from €0.4M (UKR1, SC1) to €18M (GB1).
League is therefore associated with both group membership and value, so any
unadjusted gap between groups is confounded by league. The fairness analysis must
compare groups **within** league (stratified metrics), or condition on league.

## 4. Raw target by group (context only, not a fairness result)

| Group | n | Median | 75th percentile | 90th percentile |
|---|---|---|---|---|
| UEFA | 4,324 | €2.0M | €6.5M | €20M |
| non-UEFA | 1,496 | €2.5M | €8.0M | €20M |

Non-UEFA players in this population are valued *higher* on average. The most likely
explanation is selection: a club only imports a non-European player who is already
good. This is exactly why the audit must condition on performance and why the raw gap
says nothing about fairness in either direction.

## 5. Citizenship quality

- 0.5% of all players (269) have no citizenship; none of them has a current valuation.
- Only one citizenship is stored per player (D-004 R4). Where a national team is known,
  it agrees with the citizenship group for 99.9% of 3,111 matched players.
- 25% of eligible non-UEFA players (376 of 1,496) were born in a UEFA country:
  mostly diaspora players representing, for example, Morocco, Algeria or DR Congo.
  This sub-group will be reported separately as a sensitivity check (D-005).

## 6. Are the allowed features really nationality-blind? (proxy strength)

A logistic regression was trained to predict UEFA vs non-UEFA from the **allowed**
features only (5-fold CV, eligible players).

| Feature set | CV ROC AUC (mean ± sd) |
|---|---|
| Model A (performance + league + club strength) | 0.671 ± 0.008 |
| Model B (performance only) | 0.644 ± 0.014 |

0.5 would mean the features carry no group information. They carry a moderate amount:
excluding nationality does **not** make the model blind to it. League and club context
add some of this, but most of it is already in age, position, height and match statistics.
This is the strongest argument for running the fairness audit at all, and it must be
reported next to every fairness result.

## 7. Recent arrivals (truncated statistics windows)

| Group | Recent arrival* | Median share of minutes at valuation club | Median days since last match |
|---|---|---|---|
| UEFA | 18.3% | 1.0 | 15 |
| non-UEFA | 27.4% | 1.0 | 15 |

*No recorded match more than a year before the valuation date. Usually the player joined
from a league without match data, so their per-90 numbers rest on less evidence. Because
this is more common among non-UEFA players, some error differences may come from data depth
rather than from the model treating groups differently. The flag is kept for the audit,
not used as a feature.

## Implications for the research design

1. **Scope statement (needs sign-off, D-011).** The audit studies players at clubs in
   14 European leagues. It cannot speak to players in South American, Asian or
   North American leagues.
2. **Survivorship bias is built in.** Non-UEFA players in Europe passed a selection
   filter UEFA players did not have to pass. A model can be "fair" on this population
   and the wider market still be unfair, and vice versa.
3. **Stratify by league** for every fairness metric; also report the Model B
   (no league/club) ablation, since league is a plausible route for group effects.
4. **Primary comparison stays binary.** Per-confederation results are reported only
   for CAF and CONMEBOL, with confidence intervals.
5. **Report proxy strength (AUC 0.671 / 0.644)** with the fairness results, and stratify
   error analysis by the recent-arrival flag.
6. **The target is Transfermarkt's own estimate**, which may itself carry bias.
   The audit measures whether a model reproduces patterns in that target, not
   whether the target is "correct".

## Reproduce

```bash
python -m src.data.acquire
python -m src.data.build_dataset
python -m src.fairness.coverage
python -m src.data.quality
```
