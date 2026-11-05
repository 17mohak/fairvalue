// The dossier's plain-language reading of a valuation. It only restates figures the export
// already holds (observed value, stored estimates) against the registry's held-out typical miss.
// It never calls a player under- or over-priced: a gap describes the model, not the player.

import { formatEur } from "@/lib/format";

export interface StoredEstimate {
  value: number | null;
  /** heldout: out-of-fold CV prediction; cached: published served (in-sample) result. */
  source: "heldout" | "cached" | "live-only";
}

export interface ReadingInput {
  lastName: string;
  observed: number;
  A: StoredEstimate;
  B: StoredEstimate;
  /** Held-out mean absolute error on the log scale, from the model registry. */
  maeA: number;
  maeB: number;
}

export interface Reading {
  /** One or two sentences: what the market says and what Model A says. */
  lead: string;
  /** How big the gap is, against the model's usual error. */
  gap: string | null;
  /** What Model B adds, if the build holds its estimate. */
  context: string | null;
  /** The standing caveat. */
  caveat: string;
  /** log(observed) − log(Model A estimate), when there is one. */
  residualA: number | null;
}

const pct = (x: number) => Math.round(Math.abs(x) * 100);
const times = (logGap: number) => `×${Math.exp(Math.abs(logGap)).toFixed(2)}`;

/** "26% above" / "21% below": the market value against an estimate, in plain percent. */
export function relativeTo(observed: number, estimate: number): string {
  const ratio = observed / estimate - 1;
  if (pct(ratio) === 0) return "level with";
  return `${pct(ratio)}% ${ratio > 0 ? "above" : "below"}`;
}

export function valuationReading(i: ReadingInput): Reading {
  const caveat = "A gap describes the model's arithmetic for this player's inputs, not what the player is worth.";
  const market = `The market values ${i.lastName} at ${formatEur(i.observed)}.`;
  const a = i.A.value;
  if (a === null || !(a > 0)) {
    return {
      lead: `${market} No Model A estimate is stored for ${i.lastName} in this build; the live service can compute one below.`,
      gap: null,
      context: null,
      caveat,
      residualA: null,
    };
  }

  const rA = Math.log(i.observed) - Math.log(a);
  const heldout = i.A.source === "heldout";
  const lead = heldout
    ? `${market} Model A, which never saw ${i.lastName} during training, estimates ${formatEur(a)}: the market value is ${relativeTo(i.observed, a)} that estimate.`
    : `${market} The served Model A estimates ${formatEur(a)}: the market value is ${relativeTo(i.observed, a)} that estimate. The served model was refitted on every player, ${i.lastName} included, so this is an in-sample figure and tends to sit closer to the market than a held-out one.`;

  const usual = times(i.maeA);
  const within = Math.abs(rA) <= i.maeA;
  const gap = `That is a factor of ${times(rA)}. Model A's typical held-out miss is ${usual} either way, so this gap is ${within ? "within" : "larger than"} its usual error.`;

  let context: string | null = null;
  const b = i.B.value;
  if (b !== null && b > 0) {
    const rB = Math.log(i.observed) - Math.log(b);
    const further = Math.abs(rB) > Math.abs(rA);
    context =
      `Without league and club, Model B estimates ${formatEur(b)}` +
      (further
        ? `, further from the market. Model B is usually further off (typical miss ${times(i.maeB)}): league and club explain much of how the market prices players.`
        : `, closer to the market here, although it is usually further off (typical miss ${times(i.maeB)}).`);
  }

  return { lead, gap, context, caveat, residualA: rA };
}
