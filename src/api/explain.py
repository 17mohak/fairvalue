"""Per-prediction SHAP explanations for the served regressors (POST /explain).

Same method as the offline analysis in src/fairness/explain_shap.py: TreeExplainer on the fitted
HistGradientBoosting regressor, on the log-value scale, with one-hot, missing-indicator and age^2
columns summed back to the input feature they came from.

SHAP is optional at runtime. If the `shap` package is missing, /explain answers 501 and /predict
keeps working, so a slim container never breaks prediction.
"""

import numpy as np
import pandas as pd

from src.features.preprocess import original_feature

try:  # shap pulls in numba; keep it optional so /predict never depends on it
    import shap
except ImportError:  # pragma: no cover - exercised only in slim installs
    shap = None

SHAP_AVAILABLE = shap is not None
# base value + sum of contributions must reproduce the model output (log scale).
ADDITIVITY_TOLERANCE = 1e-4


class ExplanationError(RuntimeError):
    """Raised when an explanation cannot be trusted (never shown to users)."""


def build_explainer(pipe):
    """TreeExplainer for the pipeline's final estimator (path-dependent, as in the offline run)."""
    if shap is None:
        raise ExplanationError("shap is not installed")
    return shap.TreeExplainer(pipe["model"])


def explain_row(pipe, explainer, X: pd.DataFrame, originals: list[str]) -> dict:
    """SHAP contributions for one row, aggregated to the original input features."""
    Xt = pipe["pre"].transform(X)
    names = pipe["pre"].get_feature_names_out()
    sv = np.asarray(explainer.shap_values(Xt))[0]
    mapping = [original_feature(n, originals) for n in names]
    agg = pd.Series(sv, index=names).groupby(mapping).sum().reindex(originals).fillna(0.0)
    base = float(np.ravel(explainer.expected_value)[0])
    predicted = float(pipe.predict(X)[0])
    error = abs(base + float(agg.sum()) - predicted)
    if error > ADDITIVITY_TOLERANCE:
        # A non-additive explanation would misattribute the prediction; refuse instead.
        raise ExplanationError(f"SHAP additivity check failed (error {error:.2e})")
    return {"base_log_value": base, "predicted_log_value": predicted,
            "contributions": {f: float(agg[f]) for f in originals}}
