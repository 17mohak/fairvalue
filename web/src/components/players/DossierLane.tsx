import { TIER_BOUNDARIES_EUR, TIER_NAMES } from "@/lib/football";
import { formatEur, signed } from "@/lib/format";
import { logScaleFor, pathOf, pitchDrawing, squareToQuad, type Quad } from "@/lib/theatre";
import styles from "./DossierLane.module.css";

export interface LaneEstimate {
  model: "A" | "B";
  value: number | null;
  source: "heldout" | "cached" | "live-only";
}

// A shallow strip of pitch, seen from the stand: wide enough for two lanes and a value scale.
const W = 760;
const H = 272;
const QUAD: Quad = [
  { x: 10, y: 236 },
  { x: 750, y: 222 },
  { x: 684, y: 58 },
  { x: 108, y: 66 },
];
const P = squareToQuad(QUAD);
const PITCH = pitchDrawing(P, { stripes: 10 });
const U0 = 0.07;
const U1 = 0.93;
const LANE_V: Record<"A" | "B", number> = { A: 0.3, B: 0.72 };
const BASIS = { heldout: "held-out", cached: "in-sample", "live-only": "live service only" } as const;

/**
 * The dossier's valuation lane: the Overview's theatre narrowed to one player. Pitch length is a
 * log value scale fitted to this player's figures; a chalk line marks the observed value; each
 * model sits on its own lane as a diamond, joined to the observed value by its residual arc.
 * Server-rendered SVG; the entrance is CSS only.
 */
export function DossierLane({ observed, estimates, name }: { observed: number; estimates: LaneEstimate[]; name: string }) {
  const shown = estimates.filter((e) => e.value !== null && e.value > 0);
  const scale = logScaleFor([observed, ...shown.map((e) => e.value!)], 1.45, 5);
  const uOf = (eur: number) => U0 + scale.at(eur) * (U1 - U0);
  const uObs = uOf(observed);
  const marketTop = P(uObs, 1.06);
  const boundaries = TIER_BOUNDARIES_EUR.map((b, i) => ({ b, tier: TIER_NAMES[i + 1]! })).filter(({ b }) => b > scale.lo && b < scale.hi);
  const label =
    `${name}: observed ${formatEur(observed)}` +
    estimates.map((e) => (e.value ? `; Model ${e.model} ${formatEur(e.value)} (${BASIS[e.source]})` : `; Model ${e.model} needs the live service`)).join("") +
    `. Log value scale from ${formatEur(scale.lo)} to ${formatEur(scale.hi)}.`;

  return (
    <svg className={styles.lane} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      <defs>
        <linearGradient id="dl-turf" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#16241c" />
          <stop offset="1" stopColor="#0d1511" />
        </linearGradient>
        <radialGradient id="dl-pool" cx="0.6" cy="0.4" r="0.7">
          <stop offset="0" stopColor="#e9b949" stopOpacity="0.13" />
          <stop offset="1" stopColor="#e9b949" stopOpacity="0" />
        </radialGradient>
        <clipPath id="dl-clip">
          <path d={PITCH.outline} />
        </clipPath>
      </defs>

      <g className={styles.env}>
        <path d={PITCH.outline} fill="url(#dl-turf)" />
        <g clipPath="url(#dl-clip)">
          {PITCH.stripes.map((d, i) => (
            <path key={i} d={d} className={styles.stripe} />
          ))}
          <ellipse cx={W * 0.6} cy={H * 0.5} rx={W * 0.55} ry={H * 0.6} fill="url(#dl-pool)" />
        </g>
      </g>

      <g className={styles.lines} aria-hidden="true">
        {PITCH.markings.map((d, i) => (
          <path key={i} d={d} pathLength={1} style={{ animationDelay: `${80 + i * 40}ms` }} />
        ))}
        {PITCH.goals.map((d, i) => (
          <path key={`g${i}`} d={d} pathLength={1} className={styles.goal} />
        ))}
      </g>

      <g className={styles.ruler} aria-hidden="true">
        {scale.ticks.map((t) => {
          const u = uOf(t);
          const lab = P(u, -0.17);
          return (
            <g key={t}>
              <path d={PITCH.line(u, 0, u, -0.07)} className={styles.tick} />
              <text x={lab.x} y={lab.y} textAnchor="middle" className={styles.tickLabel}>
                {formatEur(t)}
              </text>
            </g>
          );
        })}
        {boundaries.map(({ b, tier }) => {
          const u = uOf(b);
          const top = P(u, 1.05);
          return (
            <g key={b}>
              <path d={PITCH.line(u, 0, u, 1)} className={styles.tier} />
              {/* The observed label sits on the same far touchline: skip a tier label that would overprint it. */}
              {Math.abs(u - uObs) > 0.16 && (
                <text x={top.x + 4} y={top.y} className={styles.tierLabel}>
                  {tier} from {formatEur(b)} ›
                </text>
              )}
            </g>
          );
        })}
      </g>

      {/* The market's line: the observed value, across both lanes. */}
      <g className={styles.market} aria-hidden="true">
        <path d={PITCH.line(uObs, -0.02, uObs, 1.02)} className={styles.marketLine} />
        <text x={marketTop.x} y={marketTop.y - 4} textAnchor="middle" className={styles.marketLabel}>
          ● Observed {formatEur(observed)}
        </text>
      </g>

      {estimates.map((e, i) => {
        const v = LANE_V[e.model];
        const s = 1 - 0.35 * v;
        const left = P(0.015, v);
        const name = (
          <text x={left.x + 4} y={left.y - 7 * s} className={styles.laneName} style={{ ["--s" as string]: s }}>
            Model {e.model}
            <tspan className={styles.laneBasis}> · {BASIS[e.source]}</tspan>
          </text>
        );
        if (e.value === null || !(e.value > 0)) {
          return (
            <g key={e.model} className={styles.model} data-model={e.model} style={{ ["--d" as string]: `${i * 140}ms` }}>
              <path d={PITCH.line(0.01, v, 0.99, v)} className={styles.track} />
              {name}
            </g>
          );
        }
        const obs = P(uObs, v);
        const est = P(uOf(e.value), v);
        // Low estimates sit at the left end, where a lane name would collide: the tag carries the letter.
        const tagBelow = est.y + 26 * s;
        const r = Math.log(observed) - Math.log(e.value);
        const lift = (9 + Math.min(18, Math.abs(obs.x - est.x) * 0.1)) * s;
        const mid = { x: (obs.x + est.x) / 2, y: (obs.y + est.y) / 2 };
        const d = 10 * s;
        return (
          <g key={e.model} className={styles.model} data-model={e.model} style={{ ["--d" as string]: `${i * 140}ms` }}>
            <path d={PITCH.line(0.01, v, 0.99, v)} className={styles.track} />
            <path d={pathOf([est, obs])} className={styles.floor} />
            <path d={`M ${est.x} ${est.y} Q ${mid.x} ${mid.y - lift * 2} ${obs.x} ${obs.y}`} className={styles.arc} pathLength={1} />
            <text x={mid.x} y={mid.y - lift - 6 * s} textAnchor="middle" className={styles.resid} style={{ ["--s" as string]: s }}>
              {r >= 0 ? "▲" : "▼"} {signed(r, 2)}
            </text>
            <path
              className={styles.diamond}
              d={`M ${est.x} ${est.y - d} L ${est.x + d} ${est.y} L ${est.x} ${est.y + d} L ${est.x - d} ${est.y} Z`}
              strokeWidth={2.4 * s}
              strokeDasharray={e.model === "B" ? "3 2.4" : undefined}
            />
            <circle className={styles.disc} cx={obs.x} cy={obs.y} r={7.5 * s} strokeWidth={1.8 * s} />
            <text x={est.x} y={tagBelow} textAnchor="middle" className={styles.estLabel} style={{ ["--s" as string]: s }}>
              <tspan className={styles.estModel}>{e.model} </tspan>
              {formatEur(e.value)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
