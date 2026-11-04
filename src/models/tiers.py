"""Four value tiers (D-018): a fixed label definition, not a learned quantity.

Boundaries are the 50th / 80th / 95th percentiles of the primary population's market value.
Source values are rounded, so the cut-offs come out as round numbers. They are fixed here so
the label definition cannot drift between runs; `derive_boundaries` exists so a test can check
they still match the data.
"""

import numpy as np

TIER_NAMES = ["Emerging", "Established", "Elite", "World Class"]
TIER_QUANTILES = (0.50, 0.80, 0.95)
TIER_BOUNDARIES_EUR = (2_000_000, 10_000_000, 30_000_000)


def assign_tier(values_eur) -> np.ndarray:
    """Map EUR values to tier index 0..3. A value equal to a boundary goes to the higher tier."""
    return np.digitize(np.asarray(values_eur, dtype=float), TIER_BOUNDARIES_EUR, right=False)


def derive_boundaries(values_eur, quantiles=TIER_QUANTILES) -> tuple:
    return tuple(float(np.quantile(np.asarray(values_eur, dtype=float), q)) for q in quantiles)
