"""PSI and the retraining policy."""

import numpy as np
import pandas as pd

from src.monitoring.drift import psi
from src.monitoring.policy import evaluate_policy


def test_psi_is_zero_for_identical_and_large_for_shifted():
    rng = np.random.default_rng(0)
    a = pd.Series(rng.normal(0, 1, 5000))
    assert psi(a, a) < 1e-9
    assert psi(a, pd.Series(rng.normal(0, 1, 5000))) < 0.02
    assert psi(a, pd.Series(rng.normal(1.5, 1, 5000))) > 0.25


def _psi(**vals):
    return pd.DataFrame({"feature": list(vals), "psi": list(vals.values())})


def test_policy_no_action_warn_and_retrain():
    ok = evaluate_policy(_psi(age=0.01, log_value=0.02), {"degradation_pct": 5}, {"drifted_share": 0.1})
    assert ok["decision"] == "NO ACTION"
    warn = evaluate_policy(_psi(age=0.15), {"degradation_pct": 5}, {"drifted_share": 0.1})
    assert warn["decision"] == "WARN"
    rt = evaluate_policy(_psi(log_value=0.3), {"degradation_pct": 5}, {"drifted_share": 0.1})
    assert rt["decision"] == "RETRAIN" and rt["triggers"][0].startswith("T2")
    rt2 = evaluate_policy(_psi(age=0.01), {"degradation_pct": 20}, {"drifted_share": 0.1})
    assert rt2["decision"] == "RETRAIN" and "re-run src.fairness.audit" in rt2["required_after_retrain"]


def test_policy_thresholds_are_strict_and_w2_fires():
    edge = evaluate_policy(_psi(age=0.25), {"degradation_pct": 15}, {"drifted_share": 0.5})
    assert edge["decision"] == "WARN"  # 0.25 and 15% are not "greater than"; 0.25 > 0.10 warns
    quiet = evaluate_policy(_psi(age=0.10), {"degradation_pct": 0}, {"drifted_share": 0.5})
    assert quiet["decision"] == "NO ACTION"
    w2 = evaluate_policy(_psi(age=0.0), {"degradation_pct": 0}, {"drifted_share": 0.6})
    assert w2["decision"] == "WARN" and w2["warnings"][0].startswith("W2")


def test_psi_handles_constant_reference():
    assert psi(pd.Series([1.0] * 100), pd.Series([1.0] * 100)) < 1e-9
