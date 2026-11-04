"""The confederation mapping must be valid, complete and follow the documented rules."""

import pandas as pd
import pytest

from src.data.nationality import assign_confederation, load_mapping


@pytest.fixture(scope="module")
def mapping():
    return load_mapping()


def test_mapping_is_valid(mapping):
    assert mapping["citizenship_value"].is_unique
    assert set(mapping["confederation"]) <= {"UEFA", "CAF", "AFC", "CONMEBOL", "CONCACAF", "OFC"}


@pytest.mark.parametrize(
    "country, expected",
    [
        ("Israel", "UEFA"),           # R1: membership, not geography
        ("Kazakhstan", "UEFA"),
        ("Australia", "AFC"),
        ("Guyana", "CONCACAF"),
        ("Suriname", "CONCACAF"),
        ("England", "UEFA"),
        ("Türkiye", "UEFA"),
        ("Turkey", "UEFA"),           # old spelling in the source data
        ("Neukaledonien", "OFC"),     # German spelling in the source data
        ("Guadeloupe", "CONCACAF"),   # R2: confederation member, not FIFA member
        ("Morocco", "CAF"),
        ("Brazil", "CONMEBOL"),
    ],
)
def test_known_cases(mapping, country, expected):
    out = assign_confederation(pd.Series([country]), mapping)
    assert out.loc[0, "confederation"] == expected


def test_spelling_variants_share_a_canonical_country(mapping):
    canon = mapping.set_index("citizenship_value")["canonical_country"]
    assert canon["Turkey"] == canon["Türkiye"]
    assert canon["Neukaledonien"] == canon["New Caledonia"]


def test_missing_citizenship_is_unknown_not_dropped(mapping):
    out = assign_confederation(pd.Series(["Spain", None, "Ghana"]), mapping)
    assert out["audit_group"].tolist() == ["UEFA", "UNKNOWN", "non-UEFA"]


def test_unmapped_value_raises(mapping):
    # A new spelling after a data refresh must fail loudly, not become "non-UEFA".
    with pytest.raises(ValueError, match="missing from mapping"):
        assign_confederation(pd.Series(["Atlantis"]), mapping)
