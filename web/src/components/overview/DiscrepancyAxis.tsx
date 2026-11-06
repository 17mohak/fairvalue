"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { factor } from "@/lib/journey";
import { signed } from "@/lib/format";
import type { Interval } from "@/lib/research";
import { useSeen } from "./Reveal";
import styles from "./DiscrepancyAxis.module.css";

const LO = -0.1;
const HI = 0.15;
const x = (v: number) => ((v - LO) / (HI - LO)) * 100;

/**
 * Mean held-out residual per audit group on one axis, centred on zero (the model right on
 * average). The markers travel out from zero when the chart is first seen: that movement is the
 * finding, the distance each group's average sits from "no systematic miss". The bracket is the
 * raw gap; the league-stratified headline is named separately so the two are never conflated.
 */
export function DiscrepancyAxis({ uefa, nonUefa, rawGap, stratified, mae }: { uefa: Interval; nonUefa: Interval; rawGap: number; stratified: number; mae: number }) {
  const [ref, seen] = useSeen<HTMLDivElement>();
  const reduce = useReducedMotion();
  // Server HTML shows the true positions. Only after hydration, and only if the chart is still
  // below the fold, are the markers pulled back to zero so they can travel out when it is seen.
  const [out, setOut] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!reduce && el && el.getBoundingClientRect().top > window.innerHeight) setOut(false);
  }, [ref, reduce]);
  useEffect(() => {
    if (seen || reduce) setOut(true);
  }, [seen, reduce]);
  const rows = [
    { key: "uefa", label: "UEFA", sub: "players from UEFA nations", v: uefa },
    { key: "non", label: "non-UEFA", sub: "players from elsewhere", v: nonUefa },
  ];
  const ticks = [-0.1, -0.05, 0, 0.05, 0.1, 0.15];

  return (
    <figure className={styles.fig} ref={ref} data-out={out || undefined}>
      <figcaption className={styles.cap}>
        Average residual by audit group <small>Model A, held-out, log scale, 95% CI</small>
      </figcaption>
      <div
        className={styles.plot}
        role="img"
        aria-label={`Mean residual: UEFA ${signed(uefa.estimate)} (95% CI ${signed(uefa.low)} to ${signed(uefa.high)}); non-UEFA ${signed(nonUefa.estimate)} (95% CI ${signed(nonUefa.low)} to ${signed(nonUefa.high)}). Raw gap ${signed(rawGap)}.`}
      >
        <div className={styles.sides} aria-hidden="true">
          <span>◂ observed below estimate</span>
          <span>observed above estimate ▸</span>
        </div>
        <div className={styles.field}>
          <div className={styles.overlay} aria-hidden="true">
            <span className={styles.zero} style={{ left: `${x(0)}%` }}>
              <small>0 · on target</small>
            </span>
            <span className={styles.bracket} style={{ left: `${x(uefa.estimate)}%`, width: `${x(nonUefa.estimate) - x(uefa.estimate)}%` }}>
              <span className="num">raw gap {signed(rawGap)}</span>
            </span>
          </div>
          {rows.map((r) => (
            <div key={r.key} className={styles.row} data-g={r.key}>
              <span className={styles.label}>
                <b>{r.label}</b>
                <small>{r.sub}</small>
              </span>
              <span className={styles.track}>
                <span className={styles.ci} style={{ left: `${x(r.v.low)}%`, width: `${x(r.v.high) - x(r.v.low)}%` }} />
                <span className={styles.dot} style={{ left: `${out ? x(r.v.estimate) : x(0)}%` }}>
                  <b className="num">{signed(r.v.estimate)}</b>
                </span>
              </span>
            </div>
          ))}
        </div>
        <div className={styles.ticks} aria-hidden="true">
          {ticks.map((t) => (
            <i key={t} style={{ left: `${x(t)}%` }}>
              {t === 0 ? "0" : signed(t, 2)}
            </i>
          ))}
        </div>
      </div>
      <p className={styles.note}>
        Compared within each league the gap is <b className="num">{signed(stratified)}</b>, the headline figure. For scale, a single player&apos;s
        typical miss is <span className="num">±{mae.toFixed(2)}</span> ({factor(mae)}): the group difference is small next to individual error,
        and consistent.
      </p>
    </figure>
  );
}
