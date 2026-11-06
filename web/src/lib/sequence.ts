// Previous / next player in the dossier. The list a player was opened from travels in the URL as
// `seq` (league:GB1, position:Attack, search:<query>, explorer:<explorer query string>) and the
// server rebuilds it with the same rules that produced it, so stepping matches what the user saw.
// Without `seq` the dossier steps through the player's league by observed value.

import { leagueName, POSITIONS, type Position } from "@/lib/football";
import { explorerRow, filterSort, parseExplorerQuery } from "@/lib/explorer";
import { POSITION_PLURAL, searchPlayers, type PlayerProfile } from "@/lib/players";

export type Sequence =
  | { kind: "league"; league: string }
  | { kind: "position"; position: Position }
  | { kind: "search"; q: string }
  | { kind: "explorer"; params: string };

/** Strictly validated; anything unexpected is treated as absent. */
export function parseSequence(raw: string | string[] | undefined): Sequence | null {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (!v) return null;
  const i = v.indexOf(":");
  if (i < 0) return null;
  const kind = v.slice(0, i);
  const arg = v.slice(i + 1);
  if (kind === "league" && /^[A-Z0-9]{2,5}$/.test(arg)) return { kind, league: arg };
  if (kind === "position" && (POSITIONS as string[]).includes(arg)) return { kind, position: arg as Position };
  if (kind === "search" && arg.trim() && arg.length <= 60) return { kind, q: arg };
  if (kind === "explorer" && arg.length <= 400) return { kind, params: arg };
  return null;
}

export function encodeSequence(s: Sequence): string {
  return s.kind === "league" ? `league:${s.league}` : s.kind === "position" ? `position:${s.position}` : s.kind === "search" ? `search:${s.q}` : `explorer:${s.params}`;
}

/** Explorer state as a sequence: filters and sort only (no page, focus or view). */
export function explorerSequence(params: URLSearchParams): Sequence {
  const p = new URLSearchParams(params);
  for (const k of ["page", "focus", "view"]) p.delete(k);
  return { kind: "explorer", params: p.toString() };
}

export function sequenceLabel(s: Sequence): string {
  if (s.kind === "league") return `${leagueName(s.league).split(",")[0]} by observed value`;
  if (s.kind === "position") return `${POSITION_PLURAL[s.position][0]!.toUpperCase()}${POSITION_PLURAL[s.position].slice(1)} by observed value`;
  if (s.kind === "search") return `Search: “${s.q}”`;
  return "Your Player Explorer view";
}

const byValue = (a: PlayerProfile, b: PlayerProfile) => b.market_value_eur - a.market_value_eur || a.id - b.id;

/** The ordered player ids of a sequence, rebuilt with the rules of the view that produced it. */
export function sequenceIds(s: Sequence, players: PlayerProfile[]): number[] {
  if (s.kind === "league") return players.filter((p) => p.league_id === s.league).sort(byValue).map((p) => p.id);
  if (s.kind === "position") return players.filter((p) => p.position === s.position).sort(byValue).map((p) => p.id);
  if (s.kind === "search") return searchPlayers(players.map((p) => ({ ...p, league: leagueName(p.league_id) })), s.q, 200).map((h) => h.row.id);
  const q = parseExplorerQuery(Object.fromEntries(new URLSearchParams(s.params)));
  return filterSort(players.map(explorerRow), q).map((r) => r.id);
}

export interface Step {
  sequence: Sequence;
  label: string;
  /** 1-based position of this player in the list. */
  index: number;
  total: number;
  prev: PlayerProfile | null;
  next: PlayerProfile | null;
}

/**
 * Where a player sits in the list they came from. If the list does not contain the player (a stale
 * or edited link), it falls back to the player's league so stepping always works.
 */
export function stepFor(player: PlayerProfile, players: PlayerProfile[], requested: Sequence | null): Step {
  const byId = new Map(players.map((p) => [p.id, p]));
  const tryOne = (s: Sequence) => {
    const ids = sequenceIds(s, players);
    const i = ids.indexOf(player.id);
    return i < 0 ? null : { s, ids, i };
  };
  const found = (requested && tryOne(requested)) ?? tryOne({ kind: "league", league: player.league_id })!;
  const { s, ids, i } = found;
  return {
    sequence: s,
    label: sequenceLabel(s),
    index: i + 1,
    total: ids.length,
    prev: i > 0 ? byId.get(ids[i - 1]!) ?? null : null,
    next: i < ids.length - 1 ? byId.get(ids[i + 1]!) ?? null : null,
  };
}
