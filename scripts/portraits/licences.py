"""Licence rules for player portraits, shared by the finder, the add helper and the tests.

Allowed: licences that permit reuse in a product and derivative works such as a cutout, with
attribution where required. Excluded: NonCommercial (NC), NoDerivatives (ND), fair use, GFDL-only
and anything unrecognised. Must stay in step with "allowed_licences" in web/src/data/portraits.json.
"""

import re

ALLOWED = [
    "CC0-1.0", "PDM-1.0",
    "CC-BY-2.0", "CC-BY-2.5", "CC-BY-3.0", "CC-BY-4.0",
    "CC-BY-SA-2.0", "CC-BY-SA-2.5", "CC-BY-SA-3.0", "CC-BY-SA-4.0",
    "owned",
]


def normalise(short_name: str | None) -> str | None:
    """Commons LicenseShortName -> manifest licence id, or None when not allowed.

    'CC BY-SA 4.0' -> 'CC-BY-SA-4.0'; 'CC0' -> 'CC0-1.0'; 'Public domain' -> 'PDM-1.0';
    'CC BY-NC 2.0', 'CC BY-ND 3.0', 'Fair use', 'GFDL' -> None.
    """
    if not short_name:
        return None
    s = short_name.strip().upper().replace("_", " ")
    if s in ("CC0", "CC0 1.0", "CC-ZERO"):
        return "CC0-1.0"
    if s in ("PUBLIC DOMAIN", "PD"):
        return "PDM-1.0"
    # 'CC BY 2.0', 'CC BY-SA 4.0', also ported variants such as 'CC BY-SA 3.0 DE'. NC and ND never match.
    m = re.fullmatch(r"CC[ -]BY(-SA)?[ -](\d\.\d)(?:[ -][A-Z]{2,3})?", s)
    if not m:
        return None
    licence = f"CC-BY{'-SA' if m.group(1) else ''}-{m.group(2)}"
    return licence if licence in ALLOWED else None


def needs_share_alike(licence: str) -> bool:
    """A cutout made from a BY-SA photo must itself be released under the same licence."""
    return "-SA-" in licence
