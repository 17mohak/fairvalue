"use client";

import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { decimal, signed } from "@/lib/format";
import type { Interval } from "@/lib/research";
import { niceTicks } from "@/lib/scale";
import styles from "./IntervalPlot.module.css";

export interface IntervalRow {
  key: string;
  label: string;
  sublabel?: string;
  interval: Interval;
  /** Hollow marker = descriptive only (e.g. leagues with fewer than 100 non-UEFA players). */
  hollow?: boolean;
  emphasis?: boolean;
  /** Group identity colour for the point; defaults to the floodlight accent. */
  tone?: "uefa" | "non-uefa";
  /** True when only a point estimate exists (no interval was computed). */
  pointOnly?: boolean;
  /** The same row under a comparison model, drawn as a thin hollow mark beneath. */
  ghost?: Interval & { pointOnly?: boolean };
  /** Sample size, when callers want to sort by it. */
  n?: number;
}

interface Props {
  rows: IntervalRow[];
  domain?: [number, number];
  /** Tick/value formatter; defaults to signed 3 decimals. */
  format?: (v: number) => string;
  axisLabel: string;
  /** Text for each side of zero, e.g. ["UEFA under-predicted more", "non-UEFA under-predicted more"]. */
  sides?: [string, string];
  caption?: string;
  tableCaption: string;
  /** Legend text for ghost rows, e.g. "Model B". */
  ghostLabel?: string;
  primaryLabel?: string;
}

/** Forest plot: point estimate with 95% CI per row, zero reference line, exact values on hover/focus. */
export function IntervalPlot({ rows, domain, format = (v) => signed(v, 3), axisLabel, sides, caption, tableCaption, ghostLabel, primaryLabel }: Props) {
  const reduce = useReducedMotion();
  const [active, setActive] = useState<string | null>(null);
  const hasGhost = rows.some((r) => r.ghost);
  const lo = domain?.[0] ?? Math.min(0, ...rows.flatMap((r) => [r.interval.low, r.ghost?.low ?? 0]));
  const hi = domain?.[1] ?? Math.max(0, ...rows.flatMap((r) => [r.interval.high, r.ghost?.high ?? 0]));
  const pad = (hi - lo) * 0.06;
  const d0 = domain ? lo : lo - pad;
  const d1 = domain ? hi : hi + pad;
  const pos = (v: number) => ((v - d0) / (d1 - d0)) * 100;
  const ticks = niceTicks(d0, d1, 5);

  return (
    <figure className={styles.figure} data-ghost={hasGhost || undefined}>
      {hasGhost && ghostLabel && (
        <p className={styles.legend} aria-hidden="true">
          <span>
            <i className={styles.legendPrimary} /> {primaryLabel ?? "Selected model"}
          </span>
          <span>
            <i className={styles.legendGhost} /> {ghostLabel}
          </span>
        </p>
      )}
      {sides && (
        <div className={styles.sides} aria-hidden="true">
          <span />
          <div className={styles.sideTrack}>
            <span className={styles.sideLeft} style={{ right: `${100 - pos(0)}%` }}>
              {sides[0]}
            </span>
            <span className={styles.sideRight} style={{ left: `${pos(0)}%` }}>
              {sides[1]}
            </span>
          </div>
          <span />
        </div>
      )}
      <ul className={styles.rows}>
        {rows.map((r, i) => {
          const { estimate, low, high } = r.interval;
          const crossesZero = low <= 0 && high >= 0;
          return (
            <li
              key={r.key}
              className={styles.row}
              data-active={active === r.key || undefined}
              data-emphasis={r.emphasis || undefined}
              tabIndex={0}
              aria-label={`${r.label}${r.sublabel ? `, ${r.sublabel}` : ""}: ${format(estimate)}${r.pointOnly ? ", point estimate only" : `, 95% interval ${decimal(low, 3)} to ${decimal(high, 3)}${crossesZero ? ", includes zero" : ""}`}${r.ghost && ghostLabel ? `; ${ghostLabel} ${format(r.ghost.estimate)}` : ""}`}
              onMouseEnter={() => setActive(r.key)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(r.key)}
              onBlur={() => setActive(null)}
            >
              <span className={styles.label}>
                <span className={styles.name}>{r.label}</span>
                {r.sublabel && <span className={styles.sub}>{r.sublabel}</span>}
              </span>
              <span className={styles.track}>
                <span className={styles.zero} style={{ left: `${pos(0)}%` }} />
                <motion.span
                  className={styles.whisker}
                  style={{ left: `${pos(low)}%`, width: `${pos(high) - pos(low)}%` }}
                  initial={reduce ? false : { scaleX: 0, opacity: 0 }}
                  whileInView={{ scaleX: 1, opacity: 1 }}
                  viewport={{ once: true, margin: "-30px" }}
                  transition={{ duration: 0.5, delay: reduce ? 0 : i * 0.04, ease: [0.22, 1, 0.36, 1] }}
                />
                <span
                  className={`${styles.dot} ${r.hollow ? styles.hollow : ""} ${r.tone ? styles[r.tone] : ""}`}
                  style={{ left: `${pos(estimate)}%` }}
                />
                {r.ghost && (
                  <>
                    {!r.ghost.pointOnly && (
                      <span className={styles.ghostWhisker} style={{ left: `${pos(r.ghost.low)}%`, width: `${pos(r.ghost.high) - pos(r.ghost.low)}%` }} />
                    )}
                    <span className={styles.ghostDot} style={{ left: `${pos(r.ghost.estimate)}%` }} />
                  </>
                )}
                {active === r.key && (
                  <span className={`${styles.tip} num`} style={{ left: `${Math.min(80, Math.max(20, pos(estimate)))}%` }} role="presentation">
                    {format(estimate)} <span className={styles.tipCi}>{r.pointOnly ? "(no interval)" : `(${decimal(low, 3)} to ${decimal(high, 3)})`}</span>
                  </span>
                )}
              </span>
              <span className={`${styles.value} num`}>{format(estimate)}</span>
            </li>
          );
        })}
      </ul>
      <div className={styles.axisRow} aria-hidden="true">
        <span />
        <div className={styles.axis}>
          {ticks.map((t) => (
            <span key={t} className={`${styles.tick} num`} style={{ left: `${pos(t)}%` }}>
              {Math.abs(t) < 1e-12 ? "0" : format(t)}
            </span>
          ))}
        </div>
        <span />
      </div>
      <p className={styles.axisLabel}>{axisLabel}</p>
      {caption && <figcaption className={styles.caption}>{caption}</figcaption>}
      <details className={styles.table}>
        <summary>Show as a table</summary>
        <table>
          <caption className="visually-hidden">{tableCaption}</caption>
          <thead>
            <tr>
              <th scope="col">Row</th>
              <th scope="col">Estimate</th>
              <th scope="col">95% CI low</th>
              <th scope="col">95% CI high</th>
              {hasGhost && <th scope="col">{ghostLabel ?? "Comparison"} estimate</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key}>
                <th scope="row">
                  {r.label}
                  {r.sublabel ? ` (${r.sublabel})` : ""}
                </th>
                <td className="num">{decimal(r.interval.estimate, 4)}</td>
                <td className="num">{r.pointOnly ? "n/a" : decimal(r.interval.low, 4)}</td>
                <td className="num">{r.pointOnly ? "n/a" : decimal(r.interval.high, 4)}</td>
                {hasGhost && <td className="num">{r.ghost ? decimal(r.ghost.estimate, 4) : "n/a"}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
