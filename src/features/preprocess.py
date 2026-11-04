"""Feature lists and the shared scikit-learn preprocessing pipeline.

Training and the API both call `build_preprocessor`, so the same transformations
are applied at fit time and at inference time.

Two feature sets support the ablation in the locked spec:
    Model A (FEATURES_FULL):        performance + age + position + league/club context
    Model B (FEATURES_PERFORMANCE): performance + age + position only
"""

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import FunctionTransformer, OneHotEncoder, StandardScaler

from src.config import DEMOGRAPHIC_COLUMN_FRAGMENTS

PERFORMANCE_NUMERIC = [
    "age",
    "height_in_cm",
    "appearances",
    "minutes",
    "minutes_per_appearance",
    "start_share",
    "goals_p90",
    "assists_p90",
    "goal_contrib_p90",
    "yellow_p90",
    "red_p90",
    "intl_club_minutes_share",
    "minutes_last_365",
    "days_since_last_match",
    "valuation_club_minutes_share",
]
PERFORMANCE_CATEGORICAL = ["position", "sub_position", "foot"]

CONTEXT_NUMERIC = ["club_ppg"]                 # club strength: a reputation proxy
CONTEXT_CATEGORICAL = ["valuation_league_id"]  # league identity: a reputation proxy

FEATURES_PERFORMANCE = PERFORMANCE_NUMERIC + PERFORMANCE_CATEGORICAL
FEATURES_FULL = FEATURES_PERFORMANCE + CONTEXT_NUMERIC + CONTEXT_CATEGORICAL
ALL_FEATURES = FEATURES_FULL


def find_demographic_columns(columns) -> list[str]:
    """Return any column names that look like nationality/confederation data."""
    cols = [str(c).lower() for c in columns]
    return [c for c in cols if any(frag in c for frag in DEMOGRAPHIC_COLUMN_FRAGMENTS)]


def assert_no_demographic_columns(columns) -> None:
    """Hard stop if demographic data is about to enter a model (requirement ER2)."""
    leaked = find_demographic_columns(columns)
    if leaked:
        raise ValueError(f"Demographic columns must never be model features: {leaked}")


def _add_age_squared(X):
    # Market value rises then falls with age, so the linear baseline gets age^2 too.
    X = np.asarray(X, dtype=float)
    return np.column_stack([X, X[:, :1] ** 2])  # first numeric column is age


def _none_to_nan(X):
    # SimpleImputer(missing_values=np.nan) does not treat Python None as missing in object
    # columns, so None would become its own category (or an unknown one at inference).
    X = np.asarray(X, dtype=object)
    return np.where(pd.isna(X), np.nan, X)


def _age_squared_names(transformer, input_names):
    # Lets ColumnTransformer.get_feature_names_out() name the extra age^2 column (used by SHAP).
    return list(input_names) + ["age_squared"]


def build_preprocessor(feature_set: str = "full") -> ColumnTransformer:
    """ColumnTransformer for 'full' (Model A) or 'performance' (Model B) features."""
    if feature_set == "full":
        numeric = PERFORMANCE_NUMERIC + CONTEXT_NUMERIC
        categorical = PERFORMANCE_CATEGORICAL + CONTEXT_CATEGORICAL
    elif feature_set == "performance":
        numeric, categorical = PERFORMANCE_NUMERIC, PERFORMANCE_CATEGORICAL
    else:
        raise ValueError("feature_set must be 'full' or 'performance'")
    assert numeric[0] == "age", "age must be the first numeric column for age^2"
    assert_no_demographic_columns(numeric + categorical)

    numeric_pipe = Pipeline([
        ("impute", SimpleImputer(strategy="median", add_indicator=True)),
        ("age_sq", FunctionTransformer(_add_age_squared, feature_names_out=_age_squared_names)),
        ("scale", StandardScaler()),
    ])
    categorical_pipe = Pipeline([
        ("none_to_nan", FunctionTransformer(_none_to_nan, feature_names_out="one-to-one")),
        ("impute", SimpleImputer(strategy="constant", fill_value="missing")),
        ("onehot", OneHotEncoder(handle_unknown="ignore", min_frequency=20)),
    ])
    return ColumnTransformer(
        [("num", numeric_pipe, numeric), ("cat", categorical_pipe, categorical)],
        remainder="drop",  # anything not listed (ids, audit columns) is dropped
        sparse_threshold=0.0,  # always dense: HistGradientBoosting does not accept sparse input
    )


def feature_columns(feature_set: str = "full") -> list[str]:
    return FEATURES_FULL if feature_set == "full" else FEATURES_PERFORMANCE
