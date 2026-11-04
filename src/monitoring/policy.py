"""Documented retraining policy (Milestone 7). Pure functions, so they are easy to test.

Triggers (docs/MONITORING.md). Thresholds are conventional, not tuned to this data:
    T1  PSI > 0.25 on any monitored feature (large shift)     -> RETRAIN
    T2  PSI > 0.25 on the target ln(value)                    -> RETRAIN
    T3  log-RMSE degradation > 15% vs reference CV error      -> RETRAIN
    W1  PSI 0.10-0.25 on any monitored feature or target      -> WARN (review, no automatic retrain)
    W2  Evidently flags drift in > 50% of columns             -> WARN
A RETRAIN decision also requires re-running the fairness audit before the new model is served.
Nothing retrains automatically: the policy produces a decision that a human acts on.
"""

PSI_WARN, PSI_RETRAIN = 0.10, 0.25
RMSE_DEGRADATION_PCT = 15.0
EVIDENTLY_SHARE_WARN = 0.5
MONITORED_FEATURES = ["age", "minutes", "goal_contrib_p90", "club_ppg", "log_value"]


def evaluate_policy(psi_df, decay_row: dict, evidently: dict) -> dict:
    """Return {'decision': 'NO ACTION'|'WARN'|'RETRAIN', 'triggers': [...], 'warnings': [...]}."""
    triggers, warnings = [], []
    for r in psi_df.itertuples():
        name = "target ln(value)" if r.feature == "log_value" else r.feature
        if r.psi > PSI_RETRAIN:
            triggers.append(f"{'T2' if r.feature == 'log_value' else 'T1'}: PSI {r.psi:.3f} > {PSI_RETRAIN} on {name}")
        elif r.psi > PSI_WARN:
            warnings.append(f"W1: PSI {r.psi:.3f} in ({PSI_WARN}, {PSI_RETRAIN}] on {name}")
    deg = float(decay_row["degradation_pct"])
    if deg > RMSE_DEGRADATION_PCT:
        triggers.append(f"T3: log-RMSE degradation {deg:.1f}% > {RMSE_DEGRADATION_PCT}%")
    if evidently.get("drifted_share", 0) > EVIDENTLY_SHARE_WARN:
        warnings.append(f"W2: Evidently drift in {evidently['drifted_share']:.0%} of columns")
    decision = "RETRAIN" if triggers else ("WARN" if warnings else "NO ACTION")
    return {"decision": decision, "triggers": triggers, "warnings": warnings,
            "rmse_degradation_pct": deg, "evidently": evidently,
            "required_after_retrain": ["re-run src.fairness.audit", "update model card", "human sign-off"]
            if decision == "RETRAIN" else []}
