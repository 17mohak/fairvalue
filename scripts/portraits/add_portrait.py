"""Add a reviewed, licensed cutout to the app's portrait manifest.

Usage:
    python scripts/portraits/add_portrait.py --player-id 849520 --image cutouts/castro.png \\
        --licence CC-BY-SA-4.0 --author "Photographer Name" \\
        --source-url "https://commons.wikimedia.org/wiki/File:..." \\
        --attribution "Photo: Photographer Name / Wikimedia Commons, CC BY-SA 4.0 (background removed)" \\
        [--focus 0.5 0.18] [--kind cutout]

Checks the licence against the allow-list and the image itself (a cutout needs transparency and at
least 1400 px of height), saves it as web/public/players/portraits/<player_id>.webp, and writes the
manifest entry with the real pixel size. Then run `cd web && npm test`.
"""

import argparse
import json
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts" / "portraits"))
from licences import ALLOWED, needs_share_alike  # noqa: E402

MANIFEST = ROOT / "web" / "src" / "data" / "portraits.json"
PUBLIC = ROOT / "web" / "public" / "players" / "portraits"
MIN_HEIGHT = 1400


def image_problems(img: Image.Image, kind: str) -> list[str]:
    out = []
    if kind == "cutout":
        if img.height < MIN_HEIGHT:
            out.append(f"cutouts need at least {MIN_HEIGHT}px of height (this is {img.height}px)")
        if "A" not in img.getbands():
            out.append("a cutout needs a transparent background (no alpha channel)")
        elif img.getchannel("A").getextrema()[0] == 255:
            out.append("the alpha channel is fully opaque: the background was not removed")
    return out


def entry(args, width: int, height: int) -> dict:
    attribution = args.attribution.strip()
    if needs_share_alike(args.licence) and "background removed" not in attribution.lower():
        attribution += " (background removed)"
    return {"player_id": args.player_id, "src": f"/players/portraits/{args.player_id}.webp", "kind": args.kind,
            "width": width, "height": height, "focus": {"x": args.focus[0], "y": args.focus[1]},
            "licence": args.licence, "author": args.author.strip(), "source_url": args.source_url.strip(), "attribution": attribution}


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--player-id", type=int, required=True)
    ap.add_argument("--image", type=Path, required=True)
    ap.add_argument("--licence", required=True, choices=ALLOWED)
    ap.add_argument("--author", required=True)
    ap.add_argument("--source-url", required=True)
    ap.add_argument("--attribution", required=True)
    ap.add_argument("--focus", type=float, nargs=2, default=[0.5, 0.18], metavar=("X", "Y"))
    ap.add_argument("--kind", choices=["cutout", "photo"], default="cutout")
    args = ap.parse_args()
    if not args.source_url.startswith(("http://", "https://")):
        sys.exit("--source-url must be the photo's original page")

    img = Image.open(args.image)
    img.load()
    problems = image_problems(img, args.kind)
    if problems:
        sys.exit("Not added:\n- " + "\n- ".join(problems))

    PUBLIC.mkdir(parents=True, exist_ok=True)
    img.save(PUBLIC / f"{args.player_id}.webp", "WEBP", quality=90, method=6)
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    manifest["portraits"] = [p for p in manifest["portraits"] if p["player_id"] != args.player_id]
    manifest["portraits"].append(entry(args, img.width, img.height))
    manifest["portraits"].sort(key=lambda p: p["player_id"])
    MANIFEST.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Added {args.player_id}: {img.width}x{img.height}, {args.licence}. Now run: cd web && npm test")


if __name__ == "__main__":
    main()
