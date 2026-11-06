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
import time
from pathlib import Path
from urllib.parse import unquote

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


def commons_file_name(image_url: str) -> str:
    """Wikidata gives P18 as a percent-encoded Special:FilePath URL; Commons titles are plain text."""
    return unquote(image_url.rsplit("/", 1)[-1])


def polite_get(client, url: str, **kw):
    """GET with a few retries on rate limits and transient server errors (Wikimedia etiquette)."""
    for attempt in range(5):
        r = client.get(url, **kw)
        if r.status_code not in (429, 500, 502, 503, 504):
            break
        wait = int(r.headers.get("Retry-After", "0") or 0) or 5 * 2**attempt
        print(f"  {r.status_code} from {url.split('/')[2]}; retrying in {wait}s", flush=True)
        time.sleep(wait)
    r.raise_for_status()
    return r


def wikidata_images(client, tm_ids: list[str]) -> dict[str, dict]:
    values = " ".join(f'"{i}"' for i in tm_ids)
    query = f"""SELECT ?tm ?item ?itemLabel ?image WHERE {{
      VALUES ?tm {{ {values} }}
      ?item wdt:P2446 ?tm .
      OPTIONAL {{ ?item wdt:P18 ?image . }}
      SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en". }}
    }}"""
    r = polite_get(client, SPARQL, params={"query": query, "format": "json"})
    out = {}
    for b in r.json()["results"]["bindings"]:
        img = b.get("image", {}).get("value")
        out.setdefault(b["tm"]["value"], {
            "wikidata": b["item"]["value"], "label": b.get("itemLabel", {}).get("value", ""),
            "file": commons_file_name(img) if img else None,
        })
    return out


def commons_info(client, file_name: str) -> dict:
    return commons_infos(client, [file_name]).get(file_name, {})


def commons_infos(client, file_names: list[str]) -> dict[str, dict]:
    """Image info for up to 50 files in one request (the API's limit), keyed by the name asked for."""
    if not file_names:
        return {}
    titles = [f"File:{n}" for n in file_names]
    r = polite_get(client, COMMONS, params={"action": "query", "titles": "|".join(titles), "prop": "imageinfo",
                                            "iiprop": "url|size|extmetadata", "format": "json"})
    q = r.json()["query"]
    # Commons normalises titles (e.g. underscores, first letter); map answers back to what we asked.
    asked = {t: t for t in titles}
    for n in q.get("normalized", []):
        asked[n["to"]] = n["from"]
    out = {}
    for page in q["pages"].values():
        info = page.get("imageinfo", [{}])[0]
        if info:
            out[asked.get(page["title"], page["title"])[len("File:"):]] = info
    return out


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

    # Player names are printed as progress; a Windows console (cp1252) cannot encode e.g. "ı".
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")

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
            if k:
                time.sleep(1)  # one batch a second keeps well inside Wikimedia's limits
            batch = players[k: k + 50]
            wd = wikidata_images(client, [i for i, _ in batch])
            infos = commons_infos(client, sorted({w["file"] for w in wd.values() if w.get("file")}))
            for pid, name in batch:
                w = wd.get(pid)
                info = infos.get(w["file"]) if w and w.get("file") else None
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
