"""Find licensed portrait candidates for players, for human review. Writes nothing to the app.

Usage (needs internet access to wikidata.org and commons.wikimedia.org):
    python scripts/portraits/find_candidates.py                       the 8 showcase players
    python scripts/portraits/find_candidates.py --ids 849520 605184
    python scripts/portraits/find_candidates.py --from-export --limit 200   from the full export
    python scripts/portraits/find_candidates.py --download            also fetch allowed originals

How: Wikidata links a player's Transfermarkt ID (property P2446) to their main image (P18) on
Wikimedia Commons; the Commons API returns that file's licence, author and size. The output is
a review sheet, data/interim/portrait_candidates.csv (git-ignored). A person must still look at
each photo (quality, framing, personality-rights notices) before preparing a cutout and adding
it with scripts/portraits/add_portrait.py.

Set WIKIMEDIA_CONTACT (e.g. an email or URL) to include it in the User-Agent, as Wikimedia's API
etiquette asks; it is never sent otherwise.
"""

import argparse
import csv
import html
import json
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts" / "portraits"))
from licences import needs_share_alike, normalise  # noqa: E402

SPARQL = "https://query.wikidata.org/sparql"
COMMONS = "https://commons.wikimedia.org/w/api.php"
OUT = ROOT / "data" / "interim" / "portrait_candidates.csv"
MIN_HEIGHT = 1400


def user_agent() -> str:
    contact = os.environ.get("WIKIMEDIA_CONTACT", "").strip()
    return "FairValue-portrait-finder/1.0 (academic research project)" + (f" {contact}" if contact else "")


def wikidata_images(client, tm_ids: list[str]) -> dict[str, dict]:
    values = " ".join(f'"{i}"' for i in tm_ids)
    query = f"""SELECT ?tm ?item ?itemLabel ?image WHERE {{
      VALUES ?tm {{ {values} }}
      ?item wdt:P2446 ?tm .
      OPTIONAL {{ ?item wdt:P18 ?image . }}
      SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en". }}
    }}"""
    r = client.get(SPARQL, params={"query": query, "format": "json"})
    r.raise_for_status()
    out = {}
    for b in r.json()["results"]["bindings"]:
        img = b.get("image", {}).get("value")
        out.setdefault(b["tm"]["value"], {
            "wikidata": b["item"]["value"], "label": b.get("itemLabel", {}).get("value", ""),
            "file": img.rsplit("/", 1)[-1].replace("%20", " ") if img else None,
        })
    return out


def commons_info(client, file_name: str) -> dict:
    r = client.get(COMMONS, params={"action": "query", "titles": f"File:{file_name}", "prop": "imageinfo",
                                     "iiprop": "url|size|extmetadata", "format": "json"})
    r.raise_for_status()
    page = next(iter(r.json()["query"]["pages"].values()))
    return page.get("imageinfo", [{}])[0]


def strip_html(s: str | None) -> str:
    return html.unescape(re.sub(r"<[^>]+>", "", s or "")).strip()


def assess(player_id: str, name: str, wd: dict | None, info: dict | None) -> dict:
    """One review-sheet row. Pure, so it is unit-tested without network access."""
    row = {"player_id": player_id, "name": name, "wikidata": (wd or {}).get("wikidata", ""), "file": (wd or {}).get("file") or "",
           "licence_on_commons": "", "licence": "", "allowed": False, "share_alike": False, "author": "",
           "width": "", "height": "", "tall_enough": False, "restrictions": "", "file_page": "", "original_url": "",
           "suggested_attribution": "", "verdict": ""}
    if not wd:
        row["verdict"] = "no Wikidata item with this Transfermarkt ID"
        return row
    if not wd.get("file"):
        row["verdict"] = "Wikidata item has no image (P18)"
        return row
    if not info:
        row["verdict"] = "Commons file not found"
        return row
    meta = info.get("extmetadata", {})
    short = meta.get("LicenseShortName", {}).get("value")
    licence = normalise(short)
    author = strip_html(meta.get("Artist", {}).get("value"))
    restrictions = strip_html(meta.get("Restrictions", {}).get("value"))
    row.update({
        "licence_on_commons": short or "", "licence": licence or "", "allowed": bool(licence), "author": author,
        "share_alike": bool(licence and needs_share_alike(licence)),
        "width": info.get("width", ""), "height": info.get("height", ""),
        "tall_enough": bool(info.get("height")) and int(info["height"]) >= MIN_HEIGHT,
        "restrictions": restrictions, "file_page": info.get("descriptionurl", ""), "original_url": info.get("url", ""),
    })
    if licence:
        row["suggested_attribution"] = f"Photo: {author or 'unknown author'} / Wikimedia Commons, {short} (background removed)"
    row["verdict"] = (
        "licence not allowed" if not licence
        else "allowed, but too small for a cutout" if not row["tall_enough"]
        else "candidate: review the photo and any personality-rights notice" if restrictions
        else "candidate: review the photo"
    )
    return row


def showcase_players() -> list[tuple[str, str]]:
    data = json.loads((ROOT / "web" / "src" / "data" / "players.json").read_text(encoding="utf-8"))
    return [(str(p["id"]), p["name"]) for p in data["players"]]


def main() -> None:
    import httpx

    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--ids", nargs="*", help="Transfermarkt player ids")
    ap.add_argument("--from-export", action="store_true", help="read players from web/src/data/generated/players.json")
    ap.add_argument("--limit", type=int, default=0, help="with --from-export: the N most valuable players")
    ap.add_argument("--download", action="store_true", help="download allowed, large-enough originals to data/interim/portraits/")
    args = ap.parse_args()

    if args.ids:
        players = [(i, "") for i in args.ids]
    elif args.from_export:
        data = json.loads((ROOT / "web" / "src" / "data" / "generated" / "players.json").read_text(encoding="utf-8"))
        ps = sorted(data["players"], key=lambda p: -p["market_value_eur"])
        players = [(str(p["id"]), p["name"]) for p in (ps[: args.limit] if args.limit else ps)]
    else:
        players = showcase_players()

    rows = []
    with httpx.Client(headers={"User-Agent": user_agent()}, timeout=30, follow_redirects=True) as client:
        for k in range(0, len(players), 50):  # SPARQL VALUES in batches
            batch = players[k: k + 50]
            wd = wikidata_images(client, [i for i, _ in batch])
            for pid, name in batch:
                w = wd.get(pid)
                info = commons_info(client, w["file"]) if w and w.get("file") else None
                row = assess(pid, name or (w or {}).get("label", ""), w, info)
                rows.append(row)
                if args.download and row["allowed"] and row["tall_enough"]:
                    dest = ROOT / "data" / "interim" / "portraits" / f"{pid}{Path(row['file']).suffix.lower()}"
                    dest.parent.mkdir(parents=True, exist_ok=True)
                    dest.write_bytes(client.get(row["original_url"]).content)
                print(f"{pid:>8}  {row['name'][:28]:<28}  {row['verdict']}")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    with OUT.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]))
        w.writeheader()
        w.writerows(rows)
    print(f"\n{sum(r['allowed'] and r['tall_enough'] for r in rows)} of {len(rows)} players have an allowed, large-enough image."
          f"\nReview sheet: {OUT.relative_to(ROOT).as_posix()}")


if __name__ == "__main__":
    main()
