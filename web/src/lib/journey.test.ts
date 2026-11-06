import { describe, expect, it } from "vitest";
import showcase from "@/data/players.json";
import { buildJourney, euroTicks, factor, journeyDomain, movers, toEur, type Explanation } from "./journey";

const players = (showcase as unknown as { players: { name: string; estimates: { served: { A: number } }; explanation: Explanation }[] }).players;

describe("valuation journey", () => {
  it("reproduces every published explanation exactly: base + contributions = prediction", () => {
    for (const p of players) {
      const j = buildJourney(p.explanation);
      expect(j.ok, p.name).toBe(true);
      const last = j.steps.at(-2)!; // the step before "final"
      expect(Math.abs(last.after - p.explanation.predicted_log_value)).toBeLessThan(1e-5);
      // The euro estimate is exp() of the log prediction: the served value, up to the export's
      // six-decimal rounding of the log value (a relative error below 1e-6).
      expect(Math.abs(toEur(p.explanation.predicted_log_value) / p.estimates.served.A - 1)).toBeLessThan(1e-6);
    }
  });

  it("chains steps: each starts where the previous one ended", () => {
    const j = buildJourney(players[0]!.explanation, 5);
    for (let i = 1; i < j.steps.length - 1; i++) expect(j.steps[i]!.before).toBeCloseTo(j.steps[i - 1]!.after, 12);
    const rest = j.steps.find((s) => s.kind === "rest")!;
    expect(rest.count).toBe(players[0]!.explanation.contributions.length - 5);
  });

  it("orders inputs by the size of their effect", () => {
    const j = buildJourney(players[3]!.explanation);
    const sizes = j.steps.filter((s) => s.kind === "feature").map((s) => Math.abs(s.contribution));
    expect([...sizes].sort((a, b) => b - a)).toEqual(sizes);
  });

  it("refuses an explanation that does not add up", () => {
    const e = { ...players[0]!.explanation, predicted_log_value: players[0]!.explanation.predicted_log_value + 0.01 };
    expect(buildJourney(e).ok).toBe(false);
  });

  it("formats multiplicative effects and euro ticks", () => {
    expect(factor(Math.log(2))).toBe("×2.00");
    expect(factor(-Math.log(2))).toBe("×0.50");
    const ticks = euroTicks([Math.log(400_000), Math.log(60_000_000)]);
    expect(ticks[0]).toBe(500_000);
    expect(ticks.at(-1)).toBe(50_000_000);
    const d = journeyDomain(buildJourney(players[0]!.explanation), 600_000);
    expect(d[0]).toBeLessThan(Math.log(600_000));
  });
});

describe("biggest movers", () => {
  it("returns the largest raises and lowers by effect, from the full explanation", () => {
    const e = players[0]!.explanation;
    const { raises, lowers } = movers(e, 3);
    expect(raises.length).toBeLessThanOrEqual(3);
    expect(raises.every((m) => m.contribution > 0)).toBe(true);
    expect(lowers.every((m) => m.contribution < 0)).toBe(true);
    expect(raises.map((m) => m.contribution)).toEqual([...raises.map((m) => m.contribution)].sort((a, b) => b - a));
    const maxUp = Math.max(...e.contributions.map((c) => c.contribution));
    if (maxUp > 0) expect(raises[0]!.contribution).toBe(maxUp);
    const maxDown = Math.min(...e.contributions.map((c) => c.contribution));
    if (maxDown < 0) expect(lowers[0]!.contribution).toBe(maxDown);
  });
});

describe("movers ignore negligible effects", () => {
  it("never lists an input whose effect rounds to x1.00", () => {
    const e = { model: "A" as const, base_log_value: 15, predicted_log_value: 15.5, contributions: [
      { feature: "age", value: 25, contribution: 0.5 },
      { feature: "foot", value: "left", contribution: -0.002 },
    ] };
    const { raises, lowers } = movers(e);
    expect(raises.map((m) => m.key)).toEqual(["age"]);
    expect(lowers).toEqual([]);
  });
});
