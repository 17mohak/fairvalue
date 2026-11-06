import fixtures from "@/data/players.json";
import type { PlayerProfile } from "@/lib/players";
import { encodeSequence, explorerSequence, parseSequence, sequenceIds, stepFor } from "./sequence";

const base = (fixtures as unknown as { players: PlayerProfile[] }).players[0]!;
const mk = (id: number, value: number, over: Partial<PlayerProfile> = {}): PlayerProfile => ({ ...base, id, slug: `${id}-x`, name: `Player ${id}`, last_name: `P${id}`, market_value_eur: value, ...over });
const players = [
  mk(1, 50e6, { league_id: "GB1", position: "Attack" }),
  mk(2, 80e6, { league_id: "GB1", position: "Midfield" }),
  mk(3, 20e6, { league_id: "GB1", position: "Attack", name: "Bukayo Saka" }),
  mk(4, 90e6, { league_id: "ES1", position: "Attack" }),
];

describe("dossier sequences", () => {
  it("parses only well-formed sequences and round-trips them", () => {
    for (const raw of ["league:GB1", "position:Attack", "search:saka", "explorer:league=GB1&sort=age"]) expect(encodeSequence(parseSequence(raw)!)).toBe(raw);
    for (const bad of ["league:<x>", "position:Striker", "search:", "nonsense", "explorer:" + "x".repeat(500)]) expect(parseSequence(bad)).toBeNull();
    expect(parseSequence(undefined)).toBeNull();
  });

  it("rebuilds a league by observed value", () => {
    expect(sequenceIds({ kind: "league", league: "GB1" }, players)).toEqual([2, 1, 3]);
  });

  it("rebuilds an Explorer view with its own filter and sort", () => {
    const seq = explorerSequence(new URLSearchParams("position=Attack&sort=value&dir=asc&page=3&focus=1"));
    expect(seq).toEqual({ kind: "explorer", params: "position=Attack&sort=value&dir=asc" });
    expect(sequenceIds(seq, players)).toEqual([3, 1, 4]);
  });

  it("gives previous and next with the position in the list", () => {
    const s = stepFor(players[0]!, players, { kind: "league", league: "GB1" });
    expect(s).toMatchObject({ index: 2, total: 3 });
    expect(s.prev?.id).toBe(2);
    expect(s.next?.id).toBe(3);
    const first = stepFor(players[1]!, players, { kind: "league", league: "GB1" });
    expect(first.prev).toBeNull();
  });

  it("falls back to the player's league when the requested list does not contain them", () => {
    const s = stepFor(players[3]!, players, { kind: "league", league: "GB1" });
    expect(s.sequence).toEqual({ kind: "league", league: "ES1" });
    expect(s).toMatchObject({ index: 1, total: 1, prev: null, next: null });
  });
});
