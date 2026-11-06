// Server-only loader. The full export (python -m src.product.players) is git-ignored dataset
// content; when it is absent the app uses the committed eight-player research showcase.

import "server-only";
import fs from "node:fs";
import path from "node:path";
import showcase from "@/data/players.json";
import type { PlayerProfile, PlayerSet } from "./players";

const GENERATED = path.join(process.cwd(), "src", "data", "generated", "players.json");

let cache: PlayerSet | null = null;

export function playerSet(): PlayerSet {
  if (cache) return cache;
  try {
    cache = JSON.parse(fs.readFileSync(GENERATED, "utf8")) as PlayerSet;
  } catch {
    cache = showcase as unknown as PlayerSet;
  }
  return cache;
}

export function playerById(id: number): PlayerProfile | undefined {
  return playerSet().players.find((p) => p.id === id);
}

/** Neighbours in the board's default order (observed value), for the profile's "more players" strip. */
export function neighbours(id: number, count = 4): PlayerProfile[] {
  const all = [...playerSet().players].sort((a, b) => b.market_value_eur - a.market_value_eur);
  const i = all.findIndex((p) => p.id === id);
  if (i < 0) return [];
  const out: PlayerProfile[] = [];
  for (let d = 1; out.length < count && d < all.length; d++) {
    if (all[i - d]) out.push(all[i - d]!);
    if (out.length < count && all[i + d]) out.push(all[i + d]!);
  }
  return out;
}
