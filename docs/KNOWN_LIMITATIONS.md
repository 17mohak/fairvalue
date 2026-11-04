# Known limitations

| Limitation | Evidence | Effect | Status |
|---|---|---|---|
| Coverage bias: match data only for 14 European leagues | `appearances` competitions; funnel in COVERAGE_AUDIT.md | 79% of currently valued non-UEFA players excluded | Scoped out (D-011, needs sign-off) |
| Survivorship bias | non-UEFA median €2.5M vs UEFA €2.0M before any adjustment | Non-UEFA group is positively selected | Documented; affects interpretation |
| Single citizenship per player | one `country_of_citizenship` column | Dual nationals classified by first-listed citizenship | Sensitivity check planned (D-005) |
| Diaspora players in non-UEFA group | 376 / 1,496 born in UEFA countries | Group mixes migrants and European-raised players | Sub-group analysis planned |
| Target is an estimate, possibly biased | Transfermarkt crowd valuation | Model can reproduce target bias | Disclosed; audit measures model vs target only |
| Reputation proxies | league, club_ppg, European cup minutes | Group effects can flow through context | Model B ablation |
| Frozen snapshot | upstream paused 2026-07 | No new data for "live" monitoring | Drift is simulated historically |
| Licensing of scraped content | repo CC0; Transfermarkt terms not reviewed | Redistribution rights unclear | Raw data not committed; academic use only |
| Small per-confederation samples | AFC 127, CONCACAF 154, OFC 7 | Per-confederation results unreliable | Binary comparison primary |
| Defensive stats are thin | no tackles/passes in the data | Defenders and goalkeepers are described mostly by minutes and context | Expect weaker fit for them; check by position |
| Features still carry group information | CV AUC 0.671 (A) / 0.644 (B) predicting audit group | "Nationality-blind" ≠ group-blind | Measured; reported with results |
| Truncated windows for recent arrivals | 27.4% non-UEFA vs 18.3% UEFA | Error gaps may partly reflect data depth | Stratify error analysis by flag |
| Profile fields scraped at snapshot time | height/position/foot from current `players` | May postdate the valuation (rarely changes) | Accepted, documented |
| Substitution records incomplete | review: sub-on events without appearance rows | `start_share` may be slightly overstated | Accepted, documented |
| Per-90 mixes league and cup matches | all club competitions aggregated | Cup goals vs weaker sides inflate rates a little | Accepted; revisit if SHAP shows it matters |
| Back-transformed predictions are median-type | exp(log prediction), no smearing correction | EUR-scale mean residuals are positive on average by construction | Log scale is primary for fairness (D-017) |
| CIs ignore refit variance | bootstrap resamples held-out predictions only | CIs are somewhat too narrow | Documented; fold-to-fold metric SDs reported alongside |
| Many strata and leagues | 14 leagues, ~14 strata, 8 tier components | Some intervals will exclude 0 by chance | No significance thresholds; strata are descriptive (RESEARCH_DESIGN §2) |
| Fixed tier boundaries from the full population | €2M/€10M/€30M | Label definition known before CV (no feature leakage) | Documented (D-018) |
| Valuation club vs playing club | stats include all club matches in 2 years, even at a previous club | Recently transferred players mix two clubs' context | To quantify in Milestone 3 |
