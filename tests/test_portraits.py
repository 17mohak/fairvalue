"""Portrait tooling: licence rules, candidate assessment and the manifest's actual image files."""

import json
import sys
from pathlib import Path

import pytest
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts" / "portraits"))
from add_portrait import image_problems  # noqa: E402
from find_candidates import assess  # noqa: E402
from licences import ALLOWED, normalise  # noqa: E402

MANIFEST = json.loads((ROOT / "web" / "src" / "data" / "portraits.json").read_text(encoding="utf-8"))


@pytest.mark.parametrize("commons, expected", [
    ("CC BY-SA 4.0", "CC-BY-SA-4.0"), ("CC BY-SA 3.0", "CC-BY-SA-3.0"), ("CC BY 2.0", "CC-BY-2.0"),
    ("CC BY-SA 3.0 DE", "CC-BY-SA-3.0"), ("CC0", "CC0-1.0"), ("Public domain", "PDM-1.0"),
    ("CC BY-NC-SA 2.0", None), ("CC BY-ND 4.0", None), ("CC BY-NC 3.0", None), ("GFDL", None), ("Fair use", None), (None, None),
])
def test_only_reusable_derivative_friendly_licences_pass(commons, expected):
    assert normalise(commons) == expected


def test_python_and_web_allow_lists_agree():
    assert MANIFEST["allowed_licences"] == ALLOWED


def _info(licence="CC BY-SA 4.0", height=2400, restrictions=""):
    # Shaped like a Commons imageinfo response; values are test inputs, not a real file.
    return {"width": 1600, "height": height, "url": "https://upload.example/x.jpg", "descriptionurl": "https://commons.example/File:X.jpg",
            "extmetadata": {"LicenseShortName": {"value": licence}, "Artist": {"value": "<a href='#'>A. Photographer</a>"},
                            "Restrictions": {"value": restrictions}}}


def test_candidate_assessment():
    wd = {"wikidata": "http://www.wikidata.org/entity/Q1", "file": "X.jpg"}
    assert assess("1", "P", None, None)["verdict"].startswith("no Wikidata item")
    assert assess("1", "P", {**wd, "file": None}, None)["verdict"] == "Wikidata item has no image (P18)"
    assert assess("1", "P", wd, _info("CC BY-NC 2.0"))["verdict"] == "licence not allowed"
    assert assess("1", "P", wd, _info(height=900))["verdict"] == "allowed, but too small for a cutout"
    ok = assess("1", "P", wd, _info(restrictions="personality"))
    assert ok["allowed"] and ok["share_alike"] and ok["author"] == "A. Photographer"
    assert "personality-rights" in ok["verdict"] and "CC BY-SA 4.0" in ok["suggested_attribution"]


def test_cutout_image_checks():
    opaque = Image.new("RGBA", (1200, 1600), (10, 20, 30, 255))
    cut = opaque.copy()
    cut.paste((0, 0, 0, 0), (0, 0, 600, 1600))
    assert image_problems(cut, "cutout") == []
    assert any("fully opaque" in p for p in image_problems(opaque, "cutout"))
    assert any("alpha" in p for p in image_problems(Image.new("RGB", (1200, 1600)), "cutout"))
    assert any("1400px" in p for p in image_problems(cut.resize((600, 800)), "cutout"))
    assert image_problems(Image.new("RGB", (800, 600)), "photo") == []


def test_manifest_images_are_what_they_claim():
    for p in MANIFEST["portraits"]:
        path = ROOT / "web" / "public" / p["src"].lstrip("/")
        assert path.exists(), f"{p['src']} missing"
        with Image.open(path) as img:
            assert (img.width, img.height) == (p["width"], p["height"]), f"{p['src']} size differs from the manifest"
            assert image_problems(img, p["kind"]) == [], p["src"]
