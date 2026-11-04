import { formatEur, logGapAsPercent, multiplier, percentagePoints, signed } from "./format";

describe("formatEur", () => {
  it.each([
    [17_056_329, "€17.1M"],
    [2_000_000, "€2M"],
    [850_000, "€850k"],
    [25_000, "€25k"],
    [200_000_000, "€200M"],
  ])("formats %d as %s", (v, out) => expect(formatEur(v)).toBe(out));
});

describe("signed values use a true minus sign", () => {
  it("formats gaps", () => {
    expect(signed(0.0933)).toBe("+0.093");
    expect(signed(-0.0169)).toBe("−0.017");
    expect(percentagePoints(0.0248)).toBe("+2.5 pp");
  });
});

describe("log-scale conversions", () => {
  it("turns the primary gap into a relative difference", () => {
    // exp(0.0933) - 1 = 9.78%, reported as "about +10%" in the audit.
    expect(logGapAsPercent(0.0933)).toBe("+10%");
  });
  it("shows SHAP contributions as multipliers", () => {
    expect(multiplier(0.401)).toBe("×1.49");
    expect(multiplier(-0.27)).toBe("×0.76");
  });
});
