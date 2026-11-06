"""Build the player-card portrait assets (D-053) from the local portrait research outputs.

Reads research/portrait_sourcing/ (untracked, local only):
  portrait_plan_all_players.csv   one source per player
  fl/framed/<id>.png              FootyLogos cutouts, framed 4:5
  berlin_cutout/<id>.png          Berlin / WikiPortraits frames, background removed by us
  fairvalue_portrait_selection_top200.csv   Commons file page + attribution for Berlin frames

Writes:
  web/public/players/portraits/cards/berlin/<id>.webp   CC BY-SA 4.0, committed
  web/src/data/portrait_cards.json                      Berlin entries + policy, committed
  web/public/players/portraits/cards/fl/<id>.webp       FootyLogos, UNLICENSED (D-044), git-ignored
  web/src/data/generated/portrait_cards_fl.json         ids list, git-ignored (always written, may be empty)

Usage: ./.venv/Scripts/python scripts/portraits/build_card_assets.py
"""
import json
from pathlib import Path

import pandas as pd
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
R = ROOT / "research" / "portrait_sourcing"
OUT = ROOT / "web" / "public" / "players" / "portraits" / "cards"
SIZE = (400, 500)


def save(src: Path, dst: Path) -> None:
    dst.parent.mkdir(parents=True, exist_ok=True)
    Image.open(src).convert("RGBA").resize(SIZE, Image.LANCZOS).save(dst, "WEBP", quality=82, method=4)


def main() -> None:
    plan = pd.read_csv(R / "portrait_plan_all_players.csv")
    sel = pd.read_csv(R / "fairvalue_portrait_selection_top200.csv").set_index("player_id")
    fl, berlin = [], []
    for r in plan.itertuples():
        if r.source in ("footylogos_headshoulders", "footylogos_closeup"):
            save(R / "fl" / "framed" / f"{r.player_id}.png", OUT / "fl" / f"{r.player_id}.webp")
            fl.append({"id": int(r.player_id), "closeup": r.source.endswith("closeup")})
        elif r.source == "berlin_wikiportraits":
            save(R / "berlin_cutout" / f"{r.player_id}.png", OUT / "berlin" / f"{r.player_id}.webp")
            berlin.append({"id": int(r.player_id), "source_url": str(sel.loc[r.player_id, "file_page"]),
                           "author": "Bryan Berlin / WikiPortraits", "licence": "CC-BY-SA-4.0"})
    # a Berlin frame replaces a FootyLogos close-up (plan order), so no player is listed twice
    berlin_ids = {b["id"] for b in berlin}
    fl = [f for f in fl if f["id"] not in berlin_ids]
    (ROOT / "web" / "src" / "data" / "portrait_cards.json").write_text(json.dumps({
        "policy": "Card portraits (D-053). Berlin / WikiPortraits frames are CC BY-SA 4.0 with the background removed by FairValue; "
                  "they are committed. FootyLogos images are unlicensed and used at the owner's risk (D-044): they are git-ignored, "
                  "listed in src/data/generated/portrait_cards_fl.json, and switched off with FAIRVALUE_FOOTYLOGOS_PORTRAITS=off.",
        "berlin": sorted(berlin, key=lambda b: b["id"]),
    }, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    gen = ROOT / "web" / "src" / "data" / "generated"
    gen.mkdir(parents=True, exist_ok=True)
    (gen / "portrait_cards_fl.json").write_text(json.dumps({"footylogos": sorted(fl, key=lambda f: f["id"])}) + "\n", encoding="utf-8")
    print(f"berlin {len(berlin)}, footylogos {len(fl)}")


if __name__ == "__main__":
    main()
