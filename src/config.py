"""Project-wide settings: paths, dataset source, and research constants.

Everything that a reviewer might want to check or change lives here, so the
rest of the code never hard-codes paths or magic numbers.
"""

import logging
import os
from pathlib import Path

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
RAW_DIR = DATA_DIR / "raw"
INTERIM_DIR = DATA_DIR / "interim"
PROCESSED_DIR = DATA_DIR / "processed"
REPORTS_DIR = ROOT / "reports"          # generated audit outputs (CSV/MD/PNG)
MAPPINGS_DIR = ROOT / "src" / "data" / "mappings"

# ---------------------------------------------------------------------------
# Dataset source (dcaribou/transfermarkt-datasets, public Cloudflare R2 bucket)
# The Kaggle mirror davidcariboo/player-scores holds the same files but needs
# credentials; the public bucket is the maintainer's primary distribution.
# ---------------------------------------------------------------------------
DATASET_BASE_URL = "https://pub-e682421888d945d684bcae8890b0ec20.r2.dev/data"

# Tables we download. game_lineups (~126 MB) and club_games are skipped:
# nothing in the current design needs them.
TABLES = [
    "players",
    "appearances",
    "game_events",
    "clubs",
    "competitions",
    "games",
    "player_valuations",
    "transfers",
    "countries",
    "national_teams",
]

# ---------------------------------------------------------------------------
# Research constants (see docs/DECISIONS.md for the reasoning behind each)
# ---------------------------------------------------------------------------
# Columns that must NEVER appear in the model feature matrix (ER2).
# Any column whose name contains one of these fragments is treated as demographic.
DEMOGRAPHIC_COLUMN_FRAGMENTS = (
    "citizenship",
    "nationality",
    "confederation",
    "country_of_birth",
    "city_of_birth",
    "national_team",
    "international_",   # caps/goals are earned via a national team -> proxy, see D-010
    "is_uefa",
    "audit_group",
)

# Prediction point = the last valuation date in the snapshot we train on.
# Set from the data at build time (see src/data/build_dataset.py); never hard-coded.

# Stats window: performance features use the last N seasons before the prediction point.
STATS_WINDOW_DAYS = 730       # two years of matches (D-008)
MIN_MINUTES_FOR_PER90 = 450   # per-90 rates are unstable below ~5 full matches (D-009)

# A "current" valuation must be recent relative to the snapshot cut-off,
# otherwise the player is probably retired / no longer tracked (D-007).
MAX_VALUATION_AGE_DAYS = 365

RANDOM_SEED = 42


def get_logger(name: str) -> logging.Logger:
    """Return a logger with a consistent, readable format."""
    level = os.getenv("FAIRVALUE_LOG_LEVEL", "INFO").upper()
    logging.basicConfig(
        level=level,
        format="%(asctime)s %(levelname)-7s %(name)s: %(message)s",
        datefmt="%H:%M:%S",
    )
    return logging.getLogger(name)
