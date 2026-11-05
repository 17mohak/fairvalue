// Comparison Studio helpers: identity encoding and the cross-player explanation matrix.

import { featureLabel } from "@/lib/football";
import { formatInput } from "@/lib/journey";
import type { PlayerProfile, TraitKey } from "@/lib/players";

/**
 * Player identity: colour slots validated for a dark surface (dataviz validator, all-pairs for the
 * first three), always paired with a distinct marker shape and a text label, so colour is never
 * the only cue. Charts put each player on their own labelled row where marks could overlap.
 */
export const SLOTS = [
  { color: "#3987e5", shape: "circle" },
  { color: "#d95926", shape: "square" },
  { color: "#199e70", shape: "triangle" },
  { color: "#c98500", shape: "diamond" },
] as const;

export type Shape = (typeof SLOTS)[number]["shape"];

export interface MatrixRow {
  feature: string;
  label: string;
  /** One cell per player, in player order; null when that player has no published explanation. */
  cells: ({ contribution: number; input: string } | null)[];
  /** Largest minus smallest contribution across players: how much this input separates them. */
  spread: number;
}

/** Features ordered by their average absolute effect across the compared players. */
export function explanationMatrix(players: PlayerProfile[], limit = 10): MatrixRow[] {
  const features = new Map<string, number>();
  for (const p of players)
    for (const c of p.explanation?.contributions ?? []) features.set(c.feature, (features.get(c.feature) ?? 0) + Math.abs(c.contribution));
  const rows: MatrixRow[] = [...features.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([feature]) => {
      const cells = players.map((p) => {
        const c = p.explanation?.contributions.find((x) => x.feature === feature);
        return c ? { contribution: c.contribution, input: formatInput(c.feature, c.value) } : null;
      });
      const vals = cells.filter((c): c is NonNullable<typeof c> => c !== null).map((c) => c.contribution);
      return { feature, label: featureLabel(feature), cells, spread: vals.length > 1 ? Math.max(...vals) - Math.min(...vals) : 0 };
    });
  return rows.slice(0, limit);
}

/** The input that separates the compared players most (for the reading line above the matrix). */
export function biggestSeparator(rows: MatrixRow[]): MatrixRow | null {
  return rows.reduce<MatrixRow | null>((best, r) => (!best || r.spread > best.spread ? r : best), null);
}

/** Goals and assists per 90 are not defined as goalkeeper performance measures here. */
export function traitApplies(p: PlayerProfile, key: TraitKey): boolean {
  return !(p.position === "Goalkeeper" && (key === "goals_p90" || key === "assists_p90"));
}

export function traitValue(p: PlayerProfile, key: TraitKey): number | null {
  if (!traitApplies(p, key)) return null;
  const v = p.features[key as keyof PlayerProfile["features"]];
  return typeof v === "number" ? v : null;
}
