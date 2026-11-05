// The Valuation Journey: a SHAP waterfall on the model's own scale.
//
// The regressors predict log(value in euros) (src/models/train.py: y_log = log(market value)), and
// every surface turns a log prediction into euros with exp (src/api/app.py). SHAP is additive on
// that log scale:   predicted_log = base_log + sum(contribution_i)
// so the running estimate after each input is exp(base_log + contributions so far). Nothing here
// approximates or rescales the contributions; it only orders and sums them.

import { featureLabel, FEATURES, type ModelId } from "@/lib/football";

export interface Explanation {
  model: ModelId;
  base_log_value: number;
  predicted_log_value: number;
  contributions: { feature: string; value: number | string | null; contribution: number }[];
}

export type StepKind = "base" | "feature" | "rest" | "final";

export interface JourneyStep {
  kind: StepKind;
  key: string;
  label: string;
  /** The input as the model saw it, formatted ("Serie A", "24.3 yrs"); null for base/rest/final. */
  input: string | null;
  /** Log-scale contribution (0 for base and final). */
  contribution: number;
  /** Running log estimate before and after this step. */
  before: number;
  after: number;
  /** Inputs folded into a "rest" step. */
  count?: number;
}

export interface Journey {
  steps: JourneyStep[];
  base: number;
  final: number;
  /** |base + sum - predicted| on the log scale; the explanation is shown only when this is tiny. */
  additivityError: number;
  ok: boolean;
}

/** Matches the API's own refusal threshold (src/api/explain.py ADDITIVITY_TOLERANCE), plus rounding of published values. */
export const ADDITIVITY_TOLERANCE = 1e-4;

/** Euros from the model's log scale: the exact inverse of the training transform. */
export const toEur = (log: number) => Math.exp(log);

export function formatInput(feature: string, value: number | string | null): string {
  return FEATURES[feature]?.format(value) ?? (value === null ? "not given" : String(value));
}

/**
 * Orders inputs by the size of their effect, keeps the `top` largest as their own steps and folds
 * the rest into one step, so the path stays readable without dropping any part of the sum.
 */
export function buildJourney(e: Explanation, top = 8): Journey {
  const sorted = [...e.contributions].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
  const shown = sorted.slice(0, top);
  const rest = sorted.slice(top);
  const steps: JourneyStep[] = [];
  let run = e.base_log_value;
  steps.push({ kind: "base", key: "base", label: "Starting point", input: null, contribution: 0, before: run, after: run });
  for (const c of shown) {
    steps.push({
      kind: "feature",
      key: c.feature,
      label: featureLabel(c.feature),
      input: formatInput(c.feature, c.value),
      contribution: c.contribution,
      before: run,
      after: run + c.contribution,
    });
    run += c.contribution;
  }
  if (rest.length) {
    const sum = rest.reduce((s, c) => s + c.contribution, 0);
    steps.push({ kind: "rest", key: "rest", label: `${rest.length} smaller inputs`, input: null, contribution: sum, before: run, after: run + sum, count: rest.length });
    run += sum;
  }
  const additivityError = Math.abs(run - e.predicted_log_value);
  steps.push({ kind: "final", key: "final", label: `Model ${e.model} estimate`, input: null, contribution: 0, before: e.predicted_log_value, after: e.predicted_log_value });
  return { steps, base: e.base_log_value, final: e.predicted_log_value, additivityError, ok: additivityError <= ADDITIVITY_TOLERANCE };
}

/** "×1.62" / "×0.71": the multiplicative effect of a log contribution on the euro estimate. */
export function factor(contribution: number): string {
  const f = Math.exp(contribution);
  return `×${f >= 10 ? f.toFixed(1) : f.toFixed(2)}`;
}

/** Log-scale domain covering every running value (and the observed value, if given), padded. */
export function journeyDomain(j: Journey, observed?: number | null): [number, number] {
  const xs = j.steps.flatMap((s) => [s.before, s.after]);
  if (observed && observed > 0) xs.push(Math.log(observed));
  const lo = Math.min(...xs);
  const hi = Math.max(...xs);
  const pad = Math.max(0.15, (hi - lo) * 0.06);
  return [lo - pad, hi + pad];
}

/** Round euro ticks (1, 2, 5 × 10^k) inside a log domain. */
export function euroTicks([lo, hi]: [number, number]): number[] {
  const out: number[] = [];
  for (let k = 3; k <= 9; k++)
    for (const m of [1, 2, 5]) {
      const v = m * 10 ** k;
      const l = Math.log(v);
      if (l >= lo && l <= hi) out.push(v);
    }
  if (out.length <= 7) return out;
  // Too many ticks on a wide domain: keep the 1s and 5s, and if that is still crowded, the 1s.
  const lead = (v: number) => String(v)[0];
  const oneFive = out.filter((v) => lead(v) !== "2");
  return oneFive.length <= 7 ? oneFive : out.filter((v) => lead(v) === "1");
}

/** The largest raising and lowering inputs, for the plain-language summary. */
export function extremes(j: Journey) {
  const features = j.steps.filter((s) => s.kind === "feature");
  const up = features.filter((s) => s.contribution > 0).sort((a, b) => b.contribution - a.contribution)[0] ?? null;
  const down = features.filter((s) => s.contribution < 0).sort((a, b) => a.contribution - b.contribution)[0] ?? null;
  return { up, down };
}

export interface Mover {
  key: string;
  label: string;
  input: string;
  contribution: number;
}

/**
 * The inputs that raise the estimate most and those that lower it most, across every
 * contribution (not only the steps drawn), largest effect first. Display only: SHAP values as given.
 */
export function movers(e: Explanation, n = 3, minAbs = 0.005): { raises: Mover[]; lowers: Mover[] } {
  // Effects smaller than about 0.5% would show as x1.00: listing them as a "mover" says nothing.
  const all = e.contributions
    .filter((c) => Math.abs(c.contribution) >= minAbs)
    .map((c) => ({ key: c.feature, label: featureLabel(c.feature), input: formatInput(c.feature, c.value), contribution: c.contribution }));
  return {
    raises: all.filter((m) => m.contribution > 0).sort((a, b) => b.contribution - a.contribution).slice(0, n),
    lowers: all.filter((m) => m.contribution < 0).sort((a, b) => a.contribution - b.contribution).slice(0, n),
  };
}
