import { logHistogram, nearestByValue, standingText, valueStanding } from "./peers";

describe("value standing", () => {
  const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((v) => v * 1e6);

  it("ranks the highest first and counts players below", () => {
    const s = valueStanding(values, 12e6);
    expect(s).toMatchObject({ n: 12, rank: 1, below: 11, tied: 1 });
    expect(s.median).toBe(6.5e6);
  });

  it("describes the top, the bottom, the top ten and everyone else in plain words", () => {
    expect(standingText(valueStanding(values, 12e6), "Premier League players")).toBe("The highest observed value among 12 Premier League players.");
    expect(standingText(valueStanding(values, 1e6), "Premier League players")).toBe("The lowest observed value among 12 Premier League players.");
    expect(standingText(valueStanding(values, 10e6), "Premier League players")).toBe("3rd highest observed value among 12 Premier League players.");
    expect(standingText(valueStanding(values, 2e6), "Premier League players")).toBe("Valued above 8% of the 12 Premier League players.");
  });

  it("says 'joint' when players share the value", () => {
    const s = valueStanding([200e6, 200e6, 50e6], 200e6);
    expect(s.tied).toBe(2);
    expect(standingText(s, "LaLiga players")).toBe("The joint highest observed value among 3 LaLiga players.");
  });
});

describe("neighbours by value", () => {
  it("returns the closest values on the log scale, never the player, ties by id", () => {
    const pool = [
      { id: 1, market_value_eur: 10e6 },
      { id: 2, market_value_eur: 20e6 },
      { id: 3, market_value_eur: 5e6 },
      { id: 4, market_value_eur: 100e6 },
      { id: 9, market_value_eur: 10e6 },
    ];
    // 20M and 5M are both a factor of 2 from 10M: equal on the log scale, so id decides.
    expect(nearestByValue(pool, { id: 1, market_value_eur: 10e6 }, 3).map((p) => p.id)).toEqual([9, 2, 3]);
  });
});

describe("log histogram", () => {
  it("keeps every value and clamps the ends", () => {
    // Bins over €100k–€100M on the log scale: [100k, 1M), [1M, 10M), [10M, 100M]; values off the edges.
    const h = logHistogram([2e5, 3e6, 4e7, 9e7, 5e8, 1e3], 1e5, 1e8, 3);
    expect(h.reduce((a, b) => a + b, 0)).toBe(6);
    expect(h).toEqual([2, 1, 3]); // 1e3 clamps into the first bin, 5e8 into the last
  });
});
