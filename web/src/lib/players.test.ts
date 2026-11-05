import showcase from "@/data/players.json";
import { filterPlayers, idFromParam, parseBoardQuery, searchPlayers, summary, type PlayerProfile } from "./players";

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

describe("ranked player search", () => {
  const row = (name: string, value: number, club = "Club", nationality: string | null = null) => ({ name, club, market_value_eur: value, nationality });
  const rows = [row("Melih Kabasakal", 600_000), row("Bukayo Saka", 110_000_000, "Arsenal FC", "England"), row("Isa Sakamoto", 4_000_000), row("Aaron Wan-Bissaka", 15_000_000)];

  it("puts a whole-word name match ahead of a substring, whatever the file order", () => {
    expect(searchPlayers(rows, "saka").map((h) => h.row.name)[0]).toBe("Bukayo Saka");
    expect(searchPlayers([...rows].reverse(), "saka").map((h) => h.row.name)[0]).toBe("Bukayo Saka");
  });

  it("ranks word starts before mid-word matches", () => {
    const names = searchPlayers(rows, "saka").map((h) => h.row.name);
    expect(names.indexOf("Isa Sakamoto")).toBeLessThan(names.indexOf("Melih Kabasakal"));
  });

  it("is accent-insensitive and needs every word to match somewhere", () => {
    const accented = [row("Kylian Mbappé", 180e6, "Real Madrid", "France"), row("Kylian Other", 1e6)];
    expect(searchPlayers(accented, "mbappe").map((h) => h.row.name)).toEqual(["Kylian Mbappé"]);
    expect(searchPlayers(accented, "kylian madrid").map((h) => h.row.name)).toEqual(["Kylian Mbappé"]);
    expect(searchPlayers(accented, "kylian zzz")).toEqual([]);
  });

  it("finds players by club or nationality after name matches", () => {
    expect(searchPlayers(rows, "arsenal").map((h) => h.row.name)).toEqual(["Bukayo Saka"]);
    expect(searchPlayers(rows, "england").map((h) => h.row.name)).toEqual(["Bukayo Saka"]);
  });

  it("returns nothing for an empty query and respects the limit", () => {
    expect(searchPlayers(rows, "   ")).toEqual([]);
    expect(searchPlayers(rows, "a", 2)).toHaveLength(2);
  });
});
