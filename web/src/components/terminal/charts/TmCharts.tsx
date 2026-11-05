// Small, server-rendered Terminal charts. Each states its unit in its caption; colour only
// distinguishes Model A from Model B or the two sides of zero, never decoration.

import type { ReactNode } from "react";
import { formatEur } from "@/lib/format";
import { euroTicks } from "@/lib/journey";
import styles from "./TmCharts.module.css";

export interface BarRow {
  key: string;
  label: ReactNode;
  value: number;
  display: string;
  sub?: string;
  /** Ordinal step 0..1 for a one-hue ramp (tiers); omitted for nominal rows. */
  step?: number;
  title?: string;
}

/** Horizontal magnitude bars with direct labels. */
export function HBars({ rows, max }: { rows: BarRow[]; max?: number }) {
  const m = max ?? Math.max(...rows.map((r) => r.value), 1e-9);
  return (
    <ul className={styles.hbars}>
      {rows.map((r) => (
        <li key={r.key} title={r.title}>
          <span className={styles.hLabel}>{r.label}</span>
          <span className={styles.hTrack}>
            <span
              className={styles.hBar}
              style={{ width: `${(r.value / m) * 100}%`, ...(r.step !== undefined ? { opacity: 0.45 + r.step * 0.55 } : {}) }}
            />
          </span>
          <span className={`${styles.hVal} num`}>
            {r.display}
            {r.sub && <small>{r.sub}</small>}
          </span>
        </li>
      ))}
    </ul>
  );
}

export interface PairRow {
  key: string;
  label: ReactNode;
  a: number;
  b: number;
  n?: number;
}

/** Model A and Model B on one shared axis per row (a dumbbell), e.g. error by group of players. */
export function PairDots({ rows, format, domain }: { rows: PairRow[]; format: (v: number) => string; domain?: [number, number] }) {
  const all = rows.flatMap((r) => [r.a, r.b]);
  const [lo, hi] = domain ?? [Math.min(0, ...all), Math.max(...all) * 1.08];
  const x = (v: number) => ((v - lo) / (hi - lo)) * 100;
  return (
    <div className={styles.pairs}>
      <ul>
        {rows.map((r) => (
          <li key={r.key} title={`Model A ${format(r.a)} · Model B ${format(r.b)}${r.n ? ` · n = ${r.n.toLocaleString("en-GB")}` : ""}`}>
            <span className={styles.hLabel}>
              {r.label}
              {r.n !== undefined && <small className="num">n {r.n.toLocaleString("en-GB")}</small>}
            </span>
            <span className={styles.pTrack}>
              <span className={styles.pLink} style={{ left: `${x(Math.min(r.a, r.b))}%`, width: `${Math.abs(x(r.a) - x(r.b))}%` }} />
              <span className={styles.pB} style={{ left: `${x(r.b)}%` }} />
              <span className={styles.pA} style={{ left: `${x(r.a)}%` }} />
            </span>
            <span className={`${styles.hVal} num`}>
              {format(r.a)}
              <small>B {format(r.b)}</small>
            </span>
          </li>
        ))}
      </ul>
      <p className={styles.key}>
        <i data-k="a" /> Model A <i data-k="b" /> Model B
      </p>
    </div>
  );
}

export interface DivRow {
  key: string;
  label: ReactNode;
  value: number;
  ghost?: number;
  n?: number;
}

/** Signed values around zero: bars right of the line are positive. */
export function Diverging({ rows, format, ghostLabel, posLabel, negLabel }: { rows: DivRow[]; format: (v: number) => string; ghostLabel?: string; posLabel: string; negLabel: string }) {
  const m = Math.max(...rows.flatMap((r) => [Math.abs(r.value), Math.abs(r.ghost ?? 0)]), 1e-9) * 1.05;
  const w = (v: number) => (Math.abs(v) / m) * 50;
  return (
    <div className={styles.div}>
      <p className={styles.divAxis} aria-hidden="true">
        <span />
        <span className={styles.divAxisMid}>
          <span>← {negLabel}</span>
          <span>{posLabel} →</span>
        </span>
        <span />
      </p>
      <ul>
        {rows.map((r) => (
          <li key={r.key} title={`${format(r.value)}${r.ghost !== undefined ? ` (${ghostLabel} ${format(r.ghost)})` : ""}`}>
            <span className={styles.hLabel}>
              {r.label}
              {r.n !== undefined && <small className="num">n {r.n.toLocaleString("en-GB")}</small>}
            </span>
            <span className={styles.dTrack}>
              <i className={styles.zero} />
              {r.ghost !== undefined && <span className={styles.dGhost} style={r.ghost >= 0 ? { left: "50%", width: `${w(r.ghost)}%` } : { right: "50%", width: `${w(r.ghost)}%` }} />}
              <span className={styles.dBar} data-sign={r.value >= 0 ? "pos" : "neg"} style={r.value >= 0 ? { left: "50%", width: `${w(r.value)}%` } : { right: "50%", width: `${w(r.value)}%` }} />
            </span>
            <span className={`${styles.hVal} num`}>
              {format(r.value)}
              {r.ghost !== undefined && <small>{ghostLabel} {format(r.ghost)}</small>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export interface Point {
  key: string;
  x: number;
  y: number;
  label: string;
}

/** A scatter with a log-euro y axis (and optionally log-euro x), for player-level views. */
export function Scatter({ points, xLabel, yLabel, xLog = false, diagonal = false, labelAll = false, xFormat }: { points: Point[]; xLabel: string; yLabel: string; xLog?: boolean; diagonal?: boolean; labelAll?: boolean; xFormat?: (v: number) => string }) {
  const W = 520;
  const H = 300;
  const P = { l: 52, r: 16, t: 14, b: 36 };
  const ly = points.map((p) => Math.log(p.y));
  const lx = points.map((p) => (xLog ? Math.log(p.x) : p.x));
  let [y0, y1] = [Math.min(...ly) - 0.3, Math.max(...ly) + 0.3];
  let [x0, x1] = xLog ? [Math.min(...lx) - 0.3, Math.max(...lx) + 0.3] : [Math.floor(Math.min(...lx) - 1), Math.ceil(Math.max(...lx) + 1)];
  if (diagonal) {
    // Same scale on both axes so the diagonal means "estimate = observed".
    const lo = Math.min(x0, y0);
    const hi = Math.max(x1, y1);
    [x0, x1, y0, y1] = [lo, hi, lo, hi];
  }
  const X = (v: number) => P.l + (((xLog ? Math.log(v) : v) - x0) / (x1 - x0)) * (W - P.l - P.r);
  const Y = (v: number) => H - P.b - ((Math.log(v) - y0) / (y1 - y0)) * (H - P.t - P.b);
  const yt = euroTicks([y0, y1]);
  const xt = xLog ? euroTicks([x0, x1]) : Array.from({ length: 6 }, (_, i) => Math.round(x0 + ((x1 - x0) * i) / 5));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={styles.scatter} role="img" aria-label={`${yLabel} against ${xLabel}, ${points.length} players`}>
      {yt.map((t) => (
        <g key={`y${t}`}>
          <line x1={P.l} x2={W - P.r} y1={Y(t)} y2={Y(t)} className={styles.grid} />
          <text x={P.l - 6} y={Y(t) + 3} textAnchor="end" className={styles.tick}>
            {formatEur(t, 0)}
          </text>
        </g>
      ))}
      {xt.map((t) => (
        <g key={`x${t}`}>
          <line y1={P.t} y2={H - P.b} x1={X(t)} x2={X(t)} className={styles.grid} />
          <text y={H - P.b + 14} x={X(t)} textAnchor="middle" className={styles.tick}>
            {xFormat ? xFormat(t) : xLog ? formatEur(t, 0) : t}
          </text>
        </g>
      ))}
      {diagonal && <line x1={X(Math.exp(x0))} y1={Y(Math.exp(x0))} x2={X(Math.exp(x1))} y2={Y(Math.exp(x1))} className={styles.diag} />}
      <text x={W - P.r} y={H - 4} textAnchor="end" className={styles.axisLabel}>
        {xLabel}
      </text>
      <text x={P.l} y={P.t - 2} className={styles.axisLabel}>
        {yLabel}
      </text>
      {points.map((p) => (
        <circle key={p.key} cx={X(p.x)} cy={Y(p.y)} r={points.length > 200 ? 2 : 4.5} className={styles.dot}>
          <title>{p.label}</title>
        </circle>
      ))}
      {labelAll &&
        placeLabels(
          points.map((p) => ({ key: p.key, x: X(p.x), y: Y(p.y), text: p.label.split(":")[0]! })),
          { l: P.l, r: W - P.r, t: P.t, b: H - P.b },
        ).map((l) => (
          <text key={l.key} x={l.x} y={l.y} textAnchor={l.anchor} className={styles.pointLabel}>
            {l.text}
          </text>
        ))}
    </svg>
  );
}

/** Greedy label placement: try a few spots around each point, keep the first that collides with
 *  nothing already placed and stays inside the plot. Approximate text width: 5.4px per character. */
function placeLabels(pts: { key: string; x: number; y: number; text: string }[], box: { l: number; r: number; t: number; b: number }) {
  const placed: { x0: number; x1: number; y0: number; y1: number }[] = pts.map((p) => ({ x0: p.x - 5, x1: p.x + 5, y0: p.y - 5, y1: p.y + 5 }));
  const out: { key: string; x: number; y: number; text: string; anchor: "start" | "end" }[] = [];
  for (const p of [...pts].sort((a, b) => a.y - b.y)) {
    const w = p.text.length * 5.4;
    const spots: [number, number, "start" | "end"][] = [
      [7, 3, "start"],
      [-7, 3, "end"],
      [7, -8, "start"],
      [-7, -8, "end"],
      [7, 14, "start"],
      [-7, 14, "end"],
    ];
    for (const [dx, dy, anchor] of spots) {
      const x0 = anchor === "start" ? p.x + dx : p.x + dx - w;
      const r = { x0, x1: x0 + w, y0: p.y + dy - 9, y1: p.y + dy + 2 };
      const inside = r.x0 >= box.l && r.x1 <= box.r + 12 && r.y0 >= box.t - 4 && r.y1 <= box.b;
      if (inside && !placed.some((q) => r.x0 < q.x1 && r.x1 > q.x0 && r.y0 < q.y1 && r.y1 > q.y0)) {
        placed.push(r);
        out.push({ key: p.key, x: p.x + dx, y: p.y + dy, text: p.text, anchor });
        break;
      }
    }
  }
  return out;
}
