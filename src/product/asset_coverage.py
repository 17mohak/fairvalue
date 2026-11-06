"""Asset coverage report for the product: which identity assets exist for the modelling population.

    python -m src.product.asset_coverage      writes reports/product/asset_coverage.{json,md}

Reads the full player export (web/src/data/generated/players.json, made by src.product.players)
and the committed asset manifests. Writes aggregate counts only, never per-player rows, so the
report can be committed. Nationality is counted for display coverage; it is never a model input.
"""

from __future__ import annotations

import json
from collections import Counter
from datetime import date
from pathlib import Path

from src.config import get_logger

log = get_logger(__name__)

ROOT = Path(__file__).resolve().parents[2]
WEB = ROOT / "web"
EXPORT = WEB / "src" / "data" / "generated" / "players.json"
COUNTRIES = WEB / "src" / "data" / "countries.json"
PORTRAITS = WEB / "src" / "data" / "portraits.json"
FLAGS_DIR = WEB / "public" / "flags"
OUT_DIR = ROOT / "reports" / "product"

# The covered leagues and their countries, as in web/src/lib/football.ts (LEAGUES).
LEAGUE_COUNTRY = {
    "GB1": "England", "ES1": "Spain", "IT1": "Italy", "L1": "Germany", "FR1": "France",
    "NL1": "Netherlands", "PO1": "Portugal", "BE1": "Belgium", "TR1": "Türkiye", "RU1": "Russia",
    "UKR1": "Ukraine", "GR1": "Greece", "SC1": "Scotland", "DK1": "Denmark",
}


def pct(n: int, d: int) -> str:
    return f"{100 * n / d:.1f}%" if d else "n/a"


def build() -> dict:
    if not EXPORT.exists():
        raise SystemExit(f"{EXPORT} is missing: run python -m src.product.players first.")
    export = json.loads(EXPORT.read_text(encoding="utf-8"))
    players = export["players"]
    n = len(players)
    flags: dict[str, str | None] = json.loads(COUNTRIES.read_text(encoding="utf-8"))["flags"]
    shipped = {p.stem for p in FLAGS_DIR.glob("*.svg")}
    portraits = json.loads(PORTRAITS.read_text(encoding="utf-8"))["portraits"]
    portrait_ids = {int(p["player_id"]) for p in portraits}

    nat = Counter(p.get("nationality") for p in players)
    nat_flag = sum(c for k, c in nat.items() if k and flags.get(k) and flags[k] in shipped)
    nat_text_only = {k: c for k, c in nat.items() if k and k in flags and flags[k] is None}
    nat_unmapped = {k: c for k, c in nat.items() if k and k not in flags}
    nat_missing = nat.get(None, 0)

    leagues = Counter(p["league_id"] for p in players)
    league_flag = {lid: bool(flags.get(LEAGUE_COUNTRY.get(lid, "")) in shipped) for lid in leagues}

    clubs = {p["club"] for p in players if p.get("club")}
    return {
        "generated": date.today().isoformat(),
        "population": n,
        "source": export.get("source"),
        "nationality": {
            "recorded": n - nat_missing,
            "missing": nat_missing,
            "distinct": len([k for k in nat if k]),
            "players_with_flag": nat_flag,
            "text_only": nat_text_only,
            "unmapped": nat_unmapped,
            "note": "One recorded citizenship per player (first-listed); second nationalities are not in the data.",
        },
        "league_flags": {"leagues": len(leagues), "with_flag": sum(league_flag.values()), "missing": sorted(k for k, v in league_flag.items() if not v)},
        "portraits": {"players_with_portrait": len(portrait_ids & {p["id"] for p in players}), "manifest_entries": len(portraits)},
        "shirt_numbers": {"players_with_number": 0, "reason": "Not in the acquired tables; the upstream match-level game_lineups table (126 MB) is not downloaded (D-001)."},
        "club_crests": {"clubs": len(clubs), "with_crest": 0, "reason": "No licensed source: club crests are trademarks and Transfermarkt images are not covered by the dataset licence."},
    }


def markdown(r: dict) -> str:
    n = r["population"]
    nat = r["nationality"]
    lf = r["league_flags"]
    text_only = ", ".join(f"{k} ({v})" for k, v in sorted(nat["text_only"].items())) or "none"
    unmapped = ", ".join(f"{k} ({v})" for k, v in sorted(nat["unmapped"].items())) or "none"
    return f"""# Product asset coverage

Generated {r['generated']} by `python -m src.product.asset_coverage` from the {r['source']} export
({n:,} players). Aggregate counts only. Policy and sources: `docs/PLAYER_ASSETS.md`.

| Asset | Coverage | Notes |
|---|---|---|
| Nationality (recorded) | {nat['recorded']:,} / {n:,} ({pct(nat['recorded'], n)}) | {nat['distinct']} countries. {nat['note']} |
| Nationality flag | {nat['players_with_flag']:,} / {n:,} ({pct(nat['players_with_flag'], n)}) | Text only, no settled flag: {text_only}. Unmapped: {unmapped}. |
| League flag | {lf['with_flag']} / {lf['leagues']} leagues | Missing: {', '.join(lf['missing']) or 'none'} |
| Portrait | {r['portraits']['players_with_portrait']:,} / {n:,} ({pct(r['portraits']['players_with_portrait'], n)}) | Licensed Wikimedia Commons cutouts only, after review |
| Shirt number | 0 / {n:,} | {r['shirt_numbers']['reason']} |
| Club crest | 0 / {r['club_crests']['clubs']} clubs | {r['club_crests']['reason']} |
"""


def main() -> None:
    r = build()
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUT_DIR / "asset_coverage.json").write_text(json.dumps(r, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (OUT_DIR / "asset_coverage.md").write_text(markdown(r), encoding="utf-8")
    log.info("Wrote %s", OUT_DIR / "asset_coverage.md")


if __name__ == "__main__":
    main()
