import fixtures from "@/data/players.json";
import type { PlayerProfile } from "@/lib/players";
import { castMember, leadersByLeague, leadersByPosition, logScaleFor, niceTicks, residualOf, shortName, squareToQuad, topCast, type Quad } from "./theatre";

const showcase = (fixtures as unknown as { players: PlayerProfile[] }).players;

function player(id: number, value: number, over: Partial<PlayerProfile> = {}): PlayerProfile {
  const base = showcase[0]!;
  return {
    ...base,
    id,
    slug: `${id}-p`,
    name: `P ${id}`,
    last_name: `P${id}`,
    market_value_eur: value,
    estimates: { served: { A: null, B: null }, heldout: { A: value * 0.8, B: null } },
    ...over,
  };
}

describe("perspective", () => {
  const quad: Quad = [
    { x: 0, y: 100 },
    { x: 200, y: 90 },
    { x: 170, y: 10 },
    { x: 40, y: 20 },
  ];
  it("maps the unit square's corners onto the quad", () => {
    const P = squareToQuad(quad);
    for (const [u, v, i] of [
      [0, 0, 0],
      [1, 0, 1],
      [1, 1, 2],
      [0, 1, 3],
    ] as const) {
      expect(P(u, v).x).toBeCloseTo(quad[i]!.x, 6);
      expect(P(u, v).y).toBeCloseTo(quad[i]!.y, 6);
    }
  });
  it("keeps straight lines straight", () => {
    const P = squareToQuad(quad);
    const [a, b, c] = [P(0.2, 0.5), P(0.5, 0.5), P(0.9, 0.5)];
    const cross = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
    expect(Math.abs(cross)).toBeLessThan(1e-6);
  });
});

describe("value scale", () => {
  it("puts every plotted value strictly inside the domain (no clamped markers)", () => {
    const values = [130e6, 200e6, 57.5e6, 175e6];
    const s = logScaleFor(values);
    for (const v of values) {
      expect(s.at(v)).toBeGreaterThan(0);
      expect(s.at(v)).toBeLessThan(1);
    }
  });
  it("only draws ticks inside the domain", () => {
    const ticks = niceTicks(51e6, 260e6);
    expect(ticks.length).toBeGreaterThan(1);
    for (const t of ticks) expect(t >= 51e6 && t <= 260e6).toBe(true);
  });
});

describe("selection rules", () => {
  it("takes Model A held-out first and labels the basis", () => {
    const c = castMember(player(1, 10e6))!;
    expect(c.basis).toBe("heldout");
    expect(c.estimate).toBe(8e6);
    const served = castMember(player(2, 10e6, { estimates: { served: { A: 9e6, B: null }, heldout: { A: null, B: null } } }))!;
    expect(served.basis).toBe("served");
    expect(castMember(player(3, 10e6, { estimates: { served: { A: null, B: null }, heldout: { A: null, B: null } } }))).toBeNull();
  });

  it("residual follows the research definition: log(observed) − log(estimate)", () => {
    expect(residualOf({ market_value_eur: 200, estimate: 100 })).toBeCloseTo(Math.log(2), 10);
  });

  it("orders the cast by observed value and breaks ties by surname, never by file order", () => {
    const rows = [player(5, 10e6, { last_name: "Zed" }), player(6, 50e6), player(7, 10e6, { last_name: "Abe" })];
    expect(topCast(rows, 3).map((c) => c.id)).toEqual([6, 7, 5]);
    expect(topCast([...rows].reverse(), 3).map((c) => c.id)).toEqual([6, 7, 5]);
  });

  it("picks the most valuable player per position, in pitch order", () => {
    const rows = [
      player(1, 5e6, { position: "Attack" }),
      player(2, 9e6, { position: "Attack" }),
      player(3, 1e6, { position: "Goalkeeper" }),
    ];
    expect(leadersByPosition(rows).map((c) => c.id)).toEqual([3, 2]);
  });

  it("picks one player per league", () => {
    const rows = [player(1, 5e6, { league_id: "GB1" }), player(2, 9e6, { league_id: "GB1" }), player(3, 1e6, { league_id: "DK1" })];
    const out = leadersByLeague(rows);
    expect(out.map((c) => c.id)).toEqual([2, 3]);
    expect(new Set(out.map((c) => c.league_id)).size).toBe(out.length);
  });

  it("works on the committed showcase export", () => {
    const cast = topCast(showcase, 8);
    expect(cast.length).toBeGreaterThan(0);
    for (const c of cast) expect(c.estimate).toBeGreaterThan(0);
  });
});

describe("short labels", () => {
  it("uses the surname, the owner's label for Vinicius Junior, and never a bare suffix", () => {
    expect(shortName({ id: 1, first_name: "Erling", last_name: "Haaland" })).toBe("Haaland");
    expect(shortName({ id: 371998, first_name: "Vinicius", last_name: "Junior" })).toBe("Vini Jr.");
    expect(shortName({ id: 2, first_name: "Fulano", last_name: "Júnior" })).toBe("Fulano Jr.");
  });
});
