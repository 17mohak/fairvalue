// Geometry and selection rules for the Overview's Valuation Theatre and player chapters.
// Pure functions only, shared by server pages and client components, and unit-tested.
// Nothing here computes a research figure: it picks players by stated rules and places the
// values the export already holds on a scale.

import type { ModelId, Position, TierName } from "@/lib/football";
import type { PlayerProfile } from "@/lib/players";

// ---------------------------------------------------------------- perspective

export interface Pt {
  x: number;
  y: number;
}

/** The pitch as four screen corners: near-left, near-right, far-right, far-left. */
export type Quad = [Pt, Pt, Pt, Pt];

/**
 * Projective map from the unit square to a quadrilateral (Heckbert's square-to-quad).
 * u runs along the pitch (goal line to goal line), v across it (near touchline to far).
 * Straight pitch lines stay straight and the far half recedes, like a broadcast camera.
 */
export function squareToQuad(q: Quad): (u: number, v: number) => Pt {
  const [p0, p1, p2, p3] = q;
  const dx1 = p1.x - p2.x;
  const dx2 = p3.x - p2.x;
  const dx3 = p0.x - p1.x + p2.x - p3.x;
  const dy1 = p1.y - p2.y;
  const dy2 = p3.y - p2.y;
  const dy3 = p0.y - p1.y + p2.y - p3.y;
  let g = 0;
  let h = 0;
  if (Math.abs(dx3) > 1e-9 || Math.abs(dy3) > 1e-9) {
    const den = dx1 * dy2 - dx2 * dy1;
    g = (dx3 * dy2 - dx2 * dy3) / den;
    h = (dx1 * dy3 - dx3 * dy1) / den;
  }
  const a = p1.x - p0.x + g * p1.x;
  const b = p3.x - p0.x + h * p3.x;
  const d = p1.y - p0.y + g * p1.y;
  const e = p3.y - p0.y + h * p3.y;
  return (u, v) => {
    const w = g * u + h * v + 1;
    return { x: (a * u + b * v + p0.x) / w, y: (d * u + e * v + p0.y) / w };
  };
}

/** An SVG path through projected pitch points; `close` joins the last point to the first. */
export function pathOf(points: Pt[], close = false): string {
  return points.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ") + (close ? " Z" : "");
}

// ---------------------------------------------------------------- pitch drawing

/** Everything needed to draw a pitch in one perspective: markings, spots, goals, mown stripes. */
export interface PitchDrawing {
  outline: string;
  markings: string[];
  spots: Pt[];
  goals: string[];
  stripes: string[];
  /** A straight line between two pitch points. */
  line: (u0: number, v0: number, u1: number, v1: number) => string;
}

/**
 * The pitch markings at real proportions (105 × 68 m) for a given projection. Shared by the
 * Overview's theatre and the dossier's lane, so both draw the same pitch.
 */
export function pitchDrawing(P: (u: number, v: number) => Pt, { stripes = 12 } = {}): PitchDrawing {
  const fu = (m: number) => m / 105;
  const fv = (m: number) => m / 68;
  const line = (u0: number, v0: number, u1: number, v1: number) => pathOf([P(u0, v0), P(u1, v1)]);
  const rect = (u0: number, v0: number, u1: number, v1: number) => pathOf([P(u0, v0), P(u1, v0), P(u1, v1), P(u0, v1)], true);
  const arc = (cu: number, cv: number, r: number, from = 0, to = Math.PI * 2, steps = 64) => {
    const pts: Pt[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = from + ((to - from) * i) / steps;
      pts.push(P(cu + fu(r) * Math.cos(t), cv + fv(r) * Math.sin(t)));
    }
    return pathOf(pts);
  };
  const box = fv(40.32) / 2;
  const six = fv(18.32) / 2;
  const pen = fu(16.5);
  const gArea = fu(5.5);
  const spot = fu(11);
  // Penalty arc: the part of the 9.15 m circle around the spot that lies outside the box.
  const a = Math.acos((16.5 - 11) / 9.15);
  const outline = rect(0, 0, 1, 1);
  const goal = fv(7.32) / 2;
  return {
    outline,
    markings: [
      outline,
      line(0.5, 0, 0.5, 1),
      arc(0.5, 0.5, 9.15),
      rect(0, 0.5 - box, pen, 0.5 + box),
      rect(1 - pen, 0.5 - box, 1, 0.5 + box),
      rect(0, 0.5 - six, gArea, 0.5 + six),
      rect(1 - gArea, 0.5 - six, 1, 0.5 + six),
      arc(spot, 0.5, 9.15, -a, a, 24),
      arc(1 - spot, 0.5, 9.15, Math.PI - a, Math.PI + a, 24),
      arc(0, 0, 1, 0, Math.PI / 2, 8),
      arc(1, 0, 1, Math.PI / 2, Math.PI, 8),
      arc(1, 1, 1, Math.PI, Math.PI * 1.5, 8),
      arc(0, 1, 1, Math.PI * 1.5, Math.PI * 2, 8),
    ],
    spots: [P(0.5, 0.5), P(spot, 0.5), P(1 - spot, 0.5)],
    goals: [rect(-0.018, 0.5 - goal, 0, 0.5 + goal), rect(1, 0.5 - goal, 1.018, 0.5 + goal)],
    stripes: Array.from({ length: stripes }, (_, i) => i)
      .filter((i) => i % 2 === 0)
      .map((i) => rect(i / stripes, 0, (i + 1) / stripes, 1)),
    line,
  };
}

// ---------------------------------------------------------------- value scale

export interface LogScale {
  lo: number;
  hi: number;
  /** EUR -> 0..1 along the scale. */
  at: (eur: number) => number;
  ticks: number[];
}

const NICE = [1, 1.5, 2, 3, 5, 7.5];

/** "Nice" EUR ticks (1, 1.5, 2, 3, 5, 7.5 × 10^k) inside [lo, hi], thinned to at most `max`. */
export function niceTicks(lo: number, hi: number, max = 6): number[] {
  const out: number[] = [];
  for (let k = Math.floor(Math.log10(lo)) - 1; k <= Math.ceil(Math.log10(hi)); k++)
    for (const m of NICE) {
      const t = m * 10 ** k;
      if (t >= lo && t <= hi) out.push(t);
    }
  if (out.length <= max) return out;
  // Keep powers-of-ten-friendly steps first, then thin evenly.
  const step = Math.ceil(out.length / max);
  return out.filter((_, i) => i % step === 0);
}

/**
 * A log scale whose domain comes from the values it must show, padded on both sides, so every
 * plotted marker lies inside it (ROADMAP S2-02: a fixed axis clamped the top players to one edge).
 */
export function logScaleFor(values: number[], pad = 1.3, maxTicks = 6): LogScale {
  const finite = values.filter((v) => Number.isFinite(v) && v > 0);
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  const lo = min / pad;
  const hi = max * pad;
  const L = Math.log(lo);
  const H = Math.log(hi);
  return { lo, hi, at: (eur) => (Math.log(eur) - L) / (H - L), ticks: niceTicks(lo, hi, maxTicks) };
}

// ---------------------------------------------------------------- the cast

export interface CastMember {
  id: number;
  slug: string;
  name: string;
  first_name: string;
  last_name: string;
  role_code: string;
  position: Position;
  sub_position: string;
  club: string | null;
  league_id: string;
  nationality: string | null;
  age: number;
  market_value_eur: number;
  market_tier: TierName | null;
  estimate: number;
  model: ModelId;
  /** heldout: out-of-fold CV prediction (honest); served: the full-data refit, in-sample. */
  basis: "heldout" | "served";
}

/** The best Model A estimate the build holds for a player: held-out first, then the cached served result. */
export function castMember(p: PlayerProfile): CastMember | null {
  const h = p.estimates.heldout.A;
  const s = p.estimates.served.A;
  const estimate = h ?? s;
  if (estimate === null || !(estimate > 0) || !(p.market_value_eur > 0)) return null;
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    first_name: p.first_name,
    last_name: p.last_name,
    role_code: p.role_code,
    position: p.position,
    sub_position: p.sub_position,
    club: p.club,
    league_id: p.league_id,
    nationality: p.nationality,
    age: p.age,
    market_value_eur: p.market_value_eur,
    market_tier: p.market_tier,
    estimate,
    model: "A",
    basis: h !== null ? "heldout" : "served",
  };
}

/** Residual on the research's definition: log(observed) − log(estimate); positive = under-predicted. */
export const residualOf = (c: Pick<CastMember, "market_value_eur" | "estimate">) => Math.log(c.market_value_eur) - Math.log(c.estimate);

/** Observed value, highest first; ties broken by surname so the order never depends on file order. */
const byValue = (a: CastMember, b: CastMember) => b.market_value_eur - a.market_value_eur || a.last_name.localeCompare(b.last_name) || a.id - b.id;

/** Rule for the theatre: the N most valuable players that have a Model A estimate. */
export function topCast(players: PlayerProfile[], n = 7): CastMember[] {
  return players.map(castMember).filter((c): c is CastMember => c !== null).sort(byValue).slice(0, n);
}

/** Rule for the spotlights: the most valuable player in each position, in pitch order. */
export function leadersByPosition(players: PlayerProfile[]): CastMember[] {
  const order: Position[] = ["Goalkeeper", "Defender", "Midfield", "Attack"];
  const all = players.map(castMember).filter((c): c is CastMember => c !== null).sort(byValue);
  return order.map((pos) => all.find((c) => c.position === pos)).filter((c): c is CastMember => !!c);
}

/** Rule for the league strip: the most valuable player in each league, most valuable league leader first. */
export function leadersByLeague(players: PlayerProfile[]): CastMember[] {
  const seen = new Set<string>();
  const out: CastMember[] = [];
  for (const c of players.map(castMember).filter((c): c is CastMember => c !== null).sort(byValue)) {
    if (seen.has(c.league_id)) continue;
    seen.add(c.league_id);
    out.push(c);
  }
  return out;
}

// ---------------------------------------------------------------- display labels

/** Short on-pitch labels chosen by the owner (2026-11-05). The record's own name is unchanged. */
const SHORT_LABELS: Record<number, string> = { 371998: "Vini Jr." };

/**
 * The short label for a player on the pitch and in compact rows: usually the surname, but a
 * surname that is only a generational suffix ("Junior") says nothing on its own.
 */
export function shortName(c: Pick<CastMember, "id" | "first_name" | "last_name">): string {
  if (SHORT_LABELS[c.id]) return SHORT_LABELS[c.id]!;
  if (/^(junior|júnior|jr\.?)$/i.test(c.last_name.trim()) && c.first_name) return `${c.first_name} Jr.`;
  return c.last_name;
}
