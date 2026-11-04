"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ExplainResponse } from "@/lib/api/types";
import { FEATURES, featureLabel } from "@/lib/football";
import { decimal, formatEur, multiplier, signed } from "@/lib/format";
import styles from "./ContributionChart.module.css";

interface Step {
  key: string;
  label: string;
  input: string;
  contribution: number;
  from: number; // cumulative ln(EUR) before this step
  to: number;
}

export function buildSteps(e: ExplainResponse, top: number): { steps: Step[]; start: number; end: number } {
  const shown = e.contributions.slice(0, top);
  const rest = e.contributions.slice(top);
  let acc = e.base_log_value;
  const steps: Step[] = shown.map((c) => {
    const from = acc;
    acc += c.contribution;
    const meta = FEATURES[c.feature];
    return {
      key: c.feature,
      label: featureLabel(c.feature),
      input: meta ? meta.format(c.value) : String(c.value ?? "not given"),
      contribution: c.contribution,
      from,
      to: acc,
    };
  });
  if (rest.length > 0) {
    const sum = rest.reduce((s, c) => s + c.contribution, 0);
    steps.push({ key: "rest", label: `${rest.length} smaller effects`, input: rest.map((c) => featureLabel(c.feature)).join(", "), contribution: sum, from: acc, to: acc + sum });
    acc += sum;
  }
  return { steps, start: e.base_log_value, end: acc };
}

function logTicks(lo: number, hi: number): number[] {
  const out: number[] = [];
  for (let p = Math.floor(lo / Math.LN10) - 1; p <= Math.ceil(hi / Math.LN10); p++) {
    for (const m of [1, 2, 5]) {
      const v = m * 10 ** p;
      const lv = Math.log(v);
      if (lv >= lo && lv <= hi) out.push(v);
    }
  }
  return out;
}

export function ContributionChart({ explanation, top = 8 }: { explanation: ExplainResponse; top?: number }) {
  const reduce = useReducedMotion();
  const { steps, start, end } = buildSteps(explanation, top);
  const all = [start, end, ...steps.flatMap((s) => [s.from, s.to])];
  const lo = Math.min(...all) - 0.25;
  const hi = Math.max(...all) + 0.25;
  const pos = (lv: number) => ((lv - lo) / (hi - lo)) * 100;
  const ticks = logTicks(lo, hi);

  return (
    <figure className={styles.figure}>
      <ol className={styles.rows}>
        <li className={`${styles.row} ${styles.anchor}`}>
          <div className={styles.label}>
            <span className={styles.name}>Average training player</span>
            <span className={styles.input}>Where every estimate starts</span>
          </div>
          <div className={styles.track}>
            <span className={styles.pin} style={{ left: `${pos(start)}%` }} />
          </div>
          <div className={`${styles.effect} num`}>{formatEur(Math.exp(start))}</div>
        </li>

        {steps.map((s, i) => {
          const left = pos(Math.min(s.from, s.to));
          const width = Math.max(0.4, Math.abs(pos(s.to) - pos(s.from)));
          const raises = s.contribution >= 0;
          return (
            <li key={s.key} className={styles.row}>
              <div className={styles.label}>
                <span className={styles.name}>{s.label}</span>
                <span className={styles.input} title={s.input}>
                  {s.input}
                </span>
              </div>
              <div className={styles.track}>
                <motion.span
                  className={`${styles.bar} ${raises ? styles.raise : styles.lower}`}
                  style={{ left: `${left}%`, width: `${width}%`, transformOrigin: raises ? "left" : "right" }}
                  initial={reduce ? false : { scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.45, delay: reduce ? 0 : 0.15 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
              <div className={`${styles.effect} num`}>
                <span>{multiplier(s.contribution)}</span>
                <span className={styles.raw}>{signed(s.contribution, 3)} ln</span>
              </div>
            </li>
          );
        })}

        <li className={`${styles.row} ${styles.anchor} ${styles.total}`}>
          <div className={styles.label}>
            <span className={styles.name}>This estimate</span>
            <span className={styles.input}>Baseline × every effect above</span>
          </div>
          <div className={styles.track}>
            <span className={`${styles.pin} ${styles.pinTotal}`} style={{ left: `${pos(end)}%` }} />
          </div>
          <div className={`${styles.effect} num`}>{formatEur(Math.exp(end))}</div>
        </li>
      </ol>

      <div className={styles.axisRow} aria-hidden="true">
        <span />
        <div className={styles.axis}>
          {ticks.map((t) => (
            <span key={t} className={`${styles.tick} num`} style={{ left: `${pos(Math.log(t))}%` }}>
              {formatEur(t)}
            </span>
          ))}
        </div>
        <span />
      </div>

      <figcaption className={styles.caption}>
        <span className={styles.key}>
          <i className={styles.keyRaise} /> raises the estimate
        </span>
        <span className={styles.key}>
          <i className={styles.keyLower} /> lowers it
        </span>
        <span>
          Log scale. Effects multiply: {formatEur(Math.exp(start))} baseline, final ln value {decimal(end, 3)}.
        </span>
      </figcaption>
    </figure>
  );
}
