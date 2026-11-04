#!/usr/bin/env bash
# Reproduce every reported result from raw data, in order. Takes about 1.5 hours (nested Optuna, DiCE).
# Usage (repo root):  bash scripts/run_pipeline.sh            # assumes data/raw is present
#                     bash scripts/run_pipeline.sh --acquire  # download raw data first
set -euo pipefail
export DO_NOT_TRACK=1 PYTHONIOENCODING=utf-8
PY="${PYTHON:-./.venv/Scripts/python}"
[ -x "$PY" ] || PY=./.venv/bin/python
step() { echo; echo "=== $(date +%T) $*"; }

if [ "${1:-}" = "--acquire" ]; then step acquire; "$PY" -m src.data.acquire; fi
step "build dataset";        "$PY" -m src.data.build_dataset
step "data quality";         "$PY" -m src.data.quality
step "coverage audit";       "$PY" -m src.fairness.coverage
step "scope analysis";       "$PY" -W ignore -m src.fairness.scope_analysis
step "train (5-fold CV, nested Optuna, MLflow)"; "$PY" -W ignore -m src.models.train --trials 25
step "quality gate (full)";  "$PY" -m src.models.quality_gate
step "refit serving models"; "$PY" -W ignore -m src.models.final
step "fairness audit";       "$PY" -W ignore -m src.fairness.audit --boot 2000
step "supplementary checks"; "$PY" -W ignore -m src.fairness.supplementary --boot 2000
step "SHAP";                 "$PY" -W ignore -m src.fairness.explain_shap
step "drift + policy";       "$PY" -W ignore -m src.monitoring.drift
step "DiCE";                 "$PY" -W ignore -m src.fairness.counterfactuals --per-cell 60
step "tests";                "$PY" -m pytest -q -W ignore
step "done"
