"""Quality gate for CI and releases. Exits non-zero if the trained models fall below thresholds.

Usage:
    python -m src.models.quality_gate --quick     # after `train --quick` (CI, 20% subset)
    python -m src.models.quality_gate             # after a full training run (release)

Thresholds are set from MEASURED results (2026-11-04), with a margin for run-to-run and
platform variation. They guard against regressions; they are not targets.
    quick run (20% subset, 3 Optuna trials): measured primary Model A log R² 0.826-0.851
        -> gate 0.78; Model B measured 0.58-0.60 -> gate 0.50; tier accuracy 0.718 -> gate 0.68
    full run: measured Model A log R² 0.890, Model B 0.668, Model A tier accuracy 0.793
        -> gates 0.86, 0.62, 0.75
Model A must also beat Model B (context features must add information; a failure here would
signal a broken feature pipeline). Fairness metrics are deliberately NOT gated: they are audited
and reported, and no compliance threshold is claimed (RESEARCH_DESIGN §7).
"""

import argparse
import json
import sys

import pandas as pd

from src.config import REPORTS_DIR

GATES = {
    "quick": {"A_log_r2_min": 0.78, "B_log_r2_min": 0.50, "A_tier_accuracy_min": 0.68},
    "full": {"A_log_r2_min": 0.86, "B_log_r2_min": 0.62, "A_tier_accuracy_min": 0.75},
}


def check(quick: bool) -> list[str]:
    sfx = "_quick" if quick else ""
    gates = GATES["quick" if quick else "full"]
    d = REPORTS_DIR / "models"
    primary = json.loads((d / f"primary_model{sfx}.json").read_text())["algorithm"]
    reg = pd.read_csv(d / f"regression_summary{sfx}.csv")
    clf = pd.read_csv(d / f"classification_summary{sfx}.csv")
    a = reg[(reg.feature_set == "full") & (reg.algorithm == primary)].iloc[0]
    b = reg[(reg.feature_set == "performance") & (reg.algorithm == primary)].iloc[0]
    acc = clf[clf.feature_set == "full"].iloc[0]["accuracy"]
    results = [
        (f"Model A ({primary}) held-out log R² {a.log_r2:.3f} >= {gates['A_log_r2_min']}", a.log_r2 >= gates["A_log_r2_min"]),
        (f"Model B ({primary}) held-out log R² {b.log_r2:.3f} >= {gates['B_log_r2_min']}", b.log_r2 >= gates["B_log_r2_min"]),
        (f"Model A log RMSE {a.log_rmse:.3f} < Model B {b.log_rmse:.3f}", a.log_rmse < b.log_rmse),
        (f"Model A tier accuracy {acc:.3f} >= {gates['A_tier_accuracy_min']}", acc >= gates["A_tier_accuracy_min"]),
    ]
    for msg, ok in results:
        print(("PASS  " if ok else "FAIL  ") + msg)
    return [m for m, ok in results if not ok]


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--quick", action="store_true")
    failures = check(ap.parse_args().quick)
    sys.exit(1 if failures else 0)
