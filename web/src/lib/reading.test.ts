import { relativeTo, valuationReading } from "./reading";

const base = { lastName: "Haaland", maeA: Math.log(1.5), maeB: Math.log(2.1) };

describe("plain-language valuation reading", () => {
  it("states the held-out comparison and places the gap against the typical miss", () => {
    const r = valuationReading({ ...base, observed: 200e6, A: { value: 159e6, source: "heldout" }, B: { value: null, source: "live-only" } });
    expect(r.lead).toContain("never saw Haaland during training");
    expect(r.lead).toContain("€159M");
    expect(r.lead).toContain("26% above");
    expect(r.gap).toContain("×1.26");
    expect(r.gap).toContain("within its usual error");
    expect(r.context).toBeNull();
    expect(r.residualA).toBeCloseTo(Math.log(200 / 159), 10);
  });

  it("says when a gap is larger than the usual error, and handles the market below the model", () => {
    const r = valuationReading({ ...base, observed: 1e6, A: { value: 2.5e6, source: "heldout" }, B: { value: null, source: "live-only" } });
    expect(r.lead).toContain("60% below");
    expect(r.gap).toContain("larger than its usual error");
  });

  it("labels a served estimate as in-sample", () => {
    const r = valuationReading({ ...base, observed: 22e6, A: { value: 16.5e6, source: "cached" }, B: { value: null, source: "live-only" } });
    expect(r.lead).toContain("in-sample");
    expect(r.lead).not.toContain("never saw");
  });

  it("explains Model B honestly in both directions", () => {
    const further = valuationReading({ ...base, observed: 200e6, A: { value: 159e6, source: "heldout" }, B: { value: 101e6, source: "heldout" } });
    expect(further.context).toContain("further from the market");
    const closer = valuationReading({ ...base, observed: 200e6, A: { value: 120e6, source: "heldout" }, B: { value: 180e6, source: "heldout" } });
    expect(closer.context).toContain("closer to the market here");
  });

  it("never calls a player under- or over-priced", () => {
    for (const A of [100e6, 300e6]) {
      const r = valuationReading({ ...base, observed: 200e6, A: { value: A, source: "heldout" }, B: { value: 150e6, source: "heldout" } });
      const text = [r.lead, r.gap, r.context, r.caveat].join(" ").toLowerCase();
      expect(text).not.toMatch(/undervalued|overvalued|under-priced|over-priced|bargain|overpriced|underpriced/);
    }
  });

  it("falls back cleanly when no estimate is stored", () => {
    const r = valuationReading({ ...base, observed: 5e6, A: { value: null, source: "live-only" }, B: { value: null, source: "live-only" } });
    expect(r.lead).toContain("No Model A estimate is stored");
    expect(r.gap).toBeNull();
    expect(r.residualA).toBeNull();
  });

  it("rounds small differences to 'level with'", () => {
    expect(relativeTo(100, 99.9)).toBe("level with");
  });
});
