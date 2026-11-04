"""Integrity checks on the REAL processed outputs (skipped if they have not been built).

Run `python -m src.data.acquire` and `python -m src.data.build_dataset` first.
"""

import io
import json

import pandas as pd
import pytest

from src.config import PROCESSED_DIR, RAW_DIR
from src.data.nationality import load_mapping
from src.features.preprocess import ALL_FEATURES, find_demographic_columns

pytestmark = pytest.mark.data
needs_data = pytest.mark.skipif(
    not (PROCESSED_DIR / "model_dataset.parquet").exists(), reason="processed data not built"
)


@pytest.fixture(scope="module")
def data():
    return {
        "model": pd.read_parquet(PROCESSED_DIR / "model_dataset.parquet"),
        "audit": pd.read_parquet(PROCESSED_DIR / "audit_lookup.parquet"),
        "drift": pd.read_parquet(PROCESSED_DIR / "drift_reference.parquet"),
        "meta": json.loads((PROCESSED_DIR / "build_metadata.json").read_text()),
    }


@needs_data
def test_model_dataset_has_no_demographic_columns(data):
    assert find_demographic_columns(data["model"].columns) == []


@needs_data
def test_one_row_per_player(data):
    assert data["model"]["player_id"].is_unique
    assert data["audit"]["player_id"].is_unique


@needs_data
def test_training_rows_come_only_from_current_snapshot(data):
    ref = pd.Timestamp(data["meta"]["ref_date"])
    snap = pd.Timestamp(data["meta"]["snapshot_date"])
    assert data["model"]["valuation_date"].gt(ref).all()
    assert data["model"]["valuation_date"].le(snap).all()
    assert data["drift"]["valuation_date"].le(ref).all()


@needs_data
def test_every_model_player_can_be_audited(data):
    assert data["model"]["player_id"].isin(data["audit"]["player_id"]).all()


@needs_data
def test_target_and_feature_ranges(data):
    m = data["model"]
    assert (m["market_value_in_eur"] > 0).all()
    assert m["age"].between(15, 45).all()
    assert (m["minutes"] >= 450).all()
    assert m["start_share"].between(0, 1).all()
    assert m["goals_p90"].between(0, 3).all()
    assert m["height_in_cm"].dropna().between(150, 215).all()
    assert list(m.columns[3:]) == ALL_FEATURES


@needs_data
def test_mapping_covers_every_citizenship_in_raw_data():
    players = pd.read_csv(RAW_DIR / "players.csv.gz", usecols=["country_of_citizenship"])
    missing = set(players["country_of_citizenship"].dropna()) - set(load_mapping()["citizenship_value"])
    assert not missing, f"unmapped citizenship values: {sorted(missing)}"


@needs_data
def test_build_is_reproducible(data):
    """Rebuilding from the same raw files gives an identical modelling table."""
    from src.data.build_dataset import build_universe, load_all, model_dataset

    universe, _, _, _ = build_universe(load_all())
    # Round-trip through parquet so missing values are encoded the same way as on disk.
    fresh = pd.read_parquet(io.BytesIO(model_dataset(universe).to_parquet(index=False)))
    pd.testing.assert_frame_equal(fresh, data["model"])
