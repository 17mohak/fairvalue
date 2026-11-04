import fixtures from "@/test/fixtures.json";
import type { ExplainResponse } from "@/lib/api/types";
import { buildSteps } from "./ContributionChart";

describe("buildSteps", () => {
  const e = fixtures.explain_A as ExplainResponse;

  it("walks from the baseline to exactly the served prediction", () => {
    const { steps, start, end } = buildSteps(e, 8);
    expect(start).toBe(e.base_log_value);
    expect(end).toBeCloseTo(e.predicted_log_value, 6);
    expect(Math.exp(end)).toBeCloseTo(e.predicted_value_eur, -1);
    expect(steps).toHaveLength(9); // 8 named effects + "smaller effects"
    for (let i = 1; i < steps.length; i++) expect(steps[i]!.from).toBeCloseTo(steps[i - 1]!.to, 12);
  });

  it("keeps the largest effects first, as the API ranks them", () => {
    const { steps } = buildSteps(e, 3);
    expect(steps.slice(0, 3).map((s) => s.key)).toEqual(e.contributions.slice(0, 3).map((c) => c.feature));
  });
});
