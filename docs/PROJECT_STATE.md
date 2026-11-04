# Project state

_Last updated: 2026-11-04 (end of session 1)_

## Where we are
- The research design is **locked** (`docs/RESEARCH_DESIGN.md`, D-011 accepted).
- Milestones 0–4 are implemented, tested and run on the full data: data foundation, scope
  assessment, baseline models with tuning and MLflow tracking, the tier classifier, and the first
  fairness audit.

| Area | State | Evidence |
|---|---|---|
| Data | 10 tables, checksummed; 5,820-player modelling set; separate audit table and drift snapshot | `data/raw/MANIFEST.json`, `data/processed/build_metadata.json` |
| Design | Locked: population, RQ1–RQ4, metrics, DiCE approach | `docs/RESEARCH_DESIGN.md`, DECISIONS D-011, D-017–D-025 |
| Models | Ridge, RF, HGB, Optuna-HGB × Model A/B; HGB tier classifier; 5-fold held-out predictions | `reports/models/`, `docs/reports/MODEL_EVALUATION.md` |
| Primary model | Optuna-tuned HGB (Model A log RMSE 0.529, R² 0.890) | `reports/models/primary_model.json` |
| MLflow | 10 runs in `fairvalue-m3-baselines` (local `mlruns/`, git-ignored) | `python -m mlflow ui --backend-store-uri mlruns` |
| Fairness | Signed residual gaps, MAE/RMSE gaps, league/strata tables, calibration check, ER1a/ER1b | `reports/fairness/`, `docs/reports/FAIRNESS_AUDIT.md` |
| Supplementary checks | Club-grouped CV, club-clustered CIs, tier-cell power (D-026) | `docs/reports/SUPPLEMENTARY_CHECKS.md` |
| Tests | 65 passing (unit + real-data) | `pytest -q` |
| Reviews | Two independent read-only reviews; all findings addressed | DECISIONS D-015, D-023 |

## Key results so far (held-out, within the selected population)
- Context matters most for prediction: Model A R² 0.890 vs Model B 0.668 (log scale).
- **Primary fairness result:** non-UEFA players are under-predicted relative to UEFA players in
  the same leagues.
  - League-stratified log gap +0.099 (95% CI 0.068–0.128) under Model A; +0.159 under Model B.
  - It holds within predicted-value deciles, across all algorithms, and at 900 minutes.
  - It is concentrated in RU1, TR1, GR1, UKR1 and BE1.
- This is the opposite of the original hypothesis; it is reported as found, with no causal reading.
- Accuracy (MAE/RMSE) is similar for both groups. ER1a is +2.5 pp under Model A. Errors lean towards
  under-tiering non-UEFA players.

## Blockers
- **Permanent folder not yet chosen.** The project is still in the temporary session folder. Milestone 5
  starts only after it has moved and the copy is verified (owner's instruction).
- No GitHub remote. Pushing, GHCR and hosting all need approval.

## Next steps (in order)
1. **Milestone 5: explainability.**
   - SHAP for the primary model (global, local, mean |SHAP| by group).
   - Feature-based DiCE on the tier classifier (D-022).
   - Install `shap` and `dice-ml` and pin them.
2. **Milestone 6: serving.**
   - Refit the primary model on all 5,820 players and save it.
   - FastAPI `POST /predict` with Pydantic schemas using real feature ranges.
   - Dockerfile.
3. **Milestone 7: MLOps.**
   - CI runs `train --quick` with a quality gate based on the measured baseline.
   - Evidently drift report (drift reference vs current), with drift features per S-2.
4. **Milestone 8: Responsible AI documentation.** Model card, data card, EU AI Act classification.
5. **Report integration:** update the academic report (frozen dataset, sizes, scope statement, results).
