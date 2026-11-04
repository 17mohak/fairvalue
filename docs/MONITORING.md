# Monitoring, drift and retraining policy (Milestone 7)

Run: `python -m src.monitoring.drift` → `reports/monitoring/` (`drift_report.html` is the Evidently report).

## Design
- **No live traffic exists, and the source data is frozen.** Drift is therefore *simulated* from the
  dataset's own history, using two snapshots built with identical code and eligibility rules:
  - **reference:** valuations in (2024-06-12, 2025-06-12], 5,278 eligible players. This period is
    reserved and never used by research models.
  - **current:** valuations in (2025-06-12, 2026-06-12], 5,820 players (the training population).
  - 4,296 players appear in both snapshots, each with a different valuation date and feature window.
- **Monitored features** (spec S-2, replacing the FIFA-era list): age, minutes, goal_contrib_p90,
  club_ppg and the target ln(value).
- **Performance decay:** a "last-year model" (same algorithm as the served regressor, with default
  settings, because the tuned settings came from the current window) is fit on the reference snapshot only. Its error on the current snapshot is compared with its own 5-fold
  CV error on the reference period. This model exists only for the simulation.

## Results (regenerated 2026-11-05)
**PSI** (reference-quantile bins):

| Feature | PSI | Median ref → current |
|---|---|---|
| age | 0.002 | 26.35 → 26.39 |
| minutes | 0.002 | 2,645 → 2,592 |
| goal_contrib_p90 | 0.001 | 0.159 → 0.158 |
| club_ppg | 0.041 | 1.333 → 1.265 |
| ln(value) | 0.007 | 14.51 → 14.51 |

- **Evidently DataDriftPreset:** 2 of 21 columns flagged (9.5%): `red_p90` (distance 0.173) and
  `club_ppg` (0.106), each just above Evidently's 0.1 threshold for large samples.
- **Performance decay:**

  | Model | CV log RMSE (reference period) | Log RMSE on next year | Change |
  |---|---|---|---|
  | A | 0.538 | 0.570 | **+6.0%** |
  | B | 0.939 | 1.059 | +12.9% |

- **Policy decision: NO ACTION** (no triggers, no warnings).

## Retraining policy (`src/monitoring/policy.py`)
| Code | Condition | Action |
|---|---|---|
| T1 | PSI > 0.25 on any monitored feature | RETRAIN |
| T2 | PSI > 0.25 on target ln(value) | RETRAIN |
| T3 | log-RMSE degradation > 15% vs reference CV error | RETRAIN |
| W1 | PSI in (0.10, 0.25] on a monitored feature or the target | WARN: human review |
| W2 | Evidently flags drift in > 50% of columns | WARN: human review |

- A RETRAIN decision requires all of the following before a new model is served: re-run training
  (`src.models.train`), pass the full quality gate, refit (`src.models.final`), **re-run the fairness
  audit** (`src.fairness.audit`), update the model card, and get human sign-off.
- **Nothing retrains automatically.** The thresholds are conventional (PSI 0.1 / 0.25) and the spec's
  15% figure; they were not tuned to this data.
- **Feedback loops:** not applicable. No predictions are written back into training data (Sculley et al.
  technical-debt review, spec Unit 5).

## CI quality gate (`src/models/quality_gate.py`)
Thresholds are set from measured results with a margin. Fairness metrics are audited, not gated.

| Run | Model A log R² | Model B log R² | Model A tier accuracy | Also required |
|---|---|---|---|---|
| CI (20% subset, `train --quick`) | ≥ 0.78 (measured 0.826–0.851) | ≥ 0.50 (0.58–0.60) | ≥ 0.68 (0.718) | A beats B |
| Release (full run) | ≥ 0.86 (0.891) | ≥ 0.62 (0.669) | ≥ 0.75 (0.793) | A beats B |
