import showcase from "@/data/players.json";
import { filterPlayers, idFromParam, parseBoardQuery, summary, type PlayerProfile } from "./players";

const players = (showcase.players as unknown as PlayerProfile[]).map(summary);

describe("player helpers", () => {
  it("reads ids from slugged and bare params, and rejects anything else", () => {
    expect(idFromParam("605184-jean-clair-todibo")).toBe(605184);
    expect(idFromParam("605184")).toBe(605184);
    expect(idFromParam("todibo")).toBeNull();
    expect(idFromParam("605184/../x")).toBeNull();
  });

  it("falls back to safe defaults for unknown board parameters", () => {
    const q = parseBoardQuery({ position: "Striker", tier: "Legend", sort: "residual", league: "<script>", q: "x".repeat(200) });
    expect(q).toEqual({ q: "x".repeat(60), position: "", league: "", tier: "", sort: "value", view: "cards" });
  });

  it("filters by accent-insensitive name, position and tier, sorted by observed value", () => {
    const byName = filterPlayers(players, parseBoardQuery({ q: "khephren" }));
    expect(byName.map((p) => p.last_name)).toEqual(["Thuram"]);
    const defenders = filterPlayers(players, parseBoardQuery({ position: "Defender" }));
    expect(defenders.every((p) => p.position === "Defender")).toBe(true);
    const values = defenders.map((p) => p.market_value_eur);
    expect(values).toEqual([...values].sort((a, b) => b - a));
    expect(filterPlayers(players, parseBoardQuery({ tier: "World Class" })).map((p) => p.market_tier)).toEqual(["World Class", "World Class"]);
  });
});

describe("committed showcase", () => {
  const profiles = showcase.players as unknown as PlayerProfile[];
  it("is the eight published players, with no held-out estimates, traits or history claimed", () => {
    expect(profiles).toHaveLength(8);
    for (const p of profiles) {
      expect(p.estimates.served.A).toBeGreaterThan(0);
      expect(p.estimates.heldout).toEqual({ A: null, B: null });
      expect(p.traits).toBeNull();
      expect(p.history).toBeNull();
      expect(JSON.stringify(p.features)).not.toMatch(/nation|citizen|confed|birth/);
    }
  });
});
