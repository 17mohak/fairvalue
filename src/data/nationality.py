"""Nationality -> confederation mapping, used ONLY for the fairness audit.

Why a separate, hand-maintained mapping?
    The competitions table has a `confederation` column, but it describes where a
    *league* is (e.g. the Premier League is "europa"), not where a *player* is from.
    The countries / national_teams tables only cover 124 countries, while players
    hold 202 distinct citizenship values. So we maintain our own mapping in
    src/data/mappings/country_confederation.csv, keyed on the exact strings that
    appear in players.country_of_citizenship.

Mapping rules (also in docs/DECISIONS.md, D-004):
    R1  Football confederation membership is used, not geography
        (Israel and Kazakhstan -> UEFA, Australia -> AFC, Guyana/Suriname -> CONCACAF).
    R2  Confederation members that are not FIFA members (Guadeloupe, Martinique, ...)
        keep their confederation and are flagged fifa_member=False.
    R3  Territories that belong to no confederation (Monaco, Réunion) are assigned by
        geography and flagged in the `note` column.
    R4  Dual nationals: the dataset stores ONE citizenship per player (the first one
        Transfermarkt lists). We use it as-is. We cannot apply a "any UEFA citizenship"
        rule because the second citizenship is not in the data. The size of this
        problem is estimated in the coverage audit using national-team records.
    R5  Missing citizenship -> group "UNKNOWN". These players are excluded from the
        fairness comparison but their count is always reported.

The output of this module must never be joined into the model feature matrix.
It lives in a separate audit table (see src/data/build_dataset.py).
"""

import pandas as pd

from src.config import MAPPINGS_DIR

MAPPING_PATH = MAPPINGS_DIR / "country_confederation.csv"
CONFEDERATIONS = {"UEFA", "CAF", "AFC", "CONMEBOL", "CONCACAF", "OFC"}

# The dataset's national_teams table uses these labels already (UEFA, CAF, ...),
# while countries/competitions use German labels. Kept here for the cross-check.
GERMAN_LABELS = {"europa": "UEFA", "afrika": "CAF", "asien": "AFC", "amerika": "AMERICAS"}


def load_mapping() -> pd.DataFrame:
    """Load and validate the mapping table. Raises ValueError if it is malformed."""
    m = pd.read_csv(MAPPING_PATH, dtype=str, keep_default_na=False)
    problems = []
    if m["citizenship_value"].duplicated().any():
        problems.append(f"duplicate keys: {m.loc[m.citizenship_value.duplicated(), 'citizenship_value'].tolist()}")
    bad = sorted(set(m["confederation"]) - CONFEDERATIONS)
    if bad:
        problems.append(f"unknown confederation labels: {bad}")
    if not set(m["fifa_member"]) <= {"True", "False"}:
        problems.append("fifa_member must be True/False")
    if (m["citizenship_value"].str.strip() != m["citizenship_value"]).any():
        problems.append("keys have leading/trailing whitespace")
    if problems:
        raise ValueError("Invalid confederation mapping: " + "; ".join(problems))
    m["fifa_member"] = m["fifa_member"] == "True"
    return m


def assign_confederation(citizenship: pd.Series, mapping: pd.DataFrame | None = None) -> pd.DataFrame:
    """Map a Series of citizenship strings to confederation and the binary audit group.

    Returns a DataFrame aligned to the input index with columns:
        confederation   one of CONFEDERATIONS or "UNKNOWN"
        audit_group     "UEFA", "non-UEFA" or "UNKNOWN"
    Raises ValueError if a non-missing citizenship value is not in the mapping,
    so new spellings in a future data refresh cannot slip through silently.
    """
    mapping = load_mapping() if mapping is None else mapping
    lookup = dict(zip(mapping["citizenship_value"], mapping["confederation"]))

    present = citizenship.dropna()
    unmapped = sorted(set(present) - set(lookup))
    if unmapped:
        raise ValueError(f"Citizenship values missing from mapping: {unmapped}")

    confed = citizenship.map(lookup).fillna("UNKNOWN")
    group = confed.where(confed == "UNKNOWN", other=confed.eq("UEFA").map({True: "UEFA", False: "non-UEFA"}))
    return pd.DataFrame({"confederation": confed, "audit_group": group}, index=citizenship.index)


def cross_check_with_national_teams(national_teams: pd.DataFrame, mapping: pd.DataFrame | None = None) -> pd.DataFrame:
    """Compare our mapping with the dataset's own national_teams.confederation.

    This is an independent consistency check: the national_teams table is scraped
    from Transfermarkt's national-team pages, our mapping is written by hand.
    Returns the rows where the two disagree or where the country could not be matched.
    """
    mapping = load_mapping() if mapping is None else mapping
    ours = mapping.drop_duplicates("canonical_country").set_index("canonical_country")["confederation"]
    by_value = mapping.set_index("citizenship_value")["confederation"]

    def our_label(name):
        if name in by_value.index:
            return by_value[name]
        return ours.get(name, None)

    nt = national_teams[["country_name", "confederation"]].copy()
    nt["ours"] = nt["country_name"].map(our_label)
    return nt[(nt["ours"].isna()) | (nt["ours"] != nt["confederation"])]
