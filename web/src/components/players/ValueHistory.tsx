"use client";

import { motion, useReducedMotion } from "motion/react";
import { useState, type KeyboardEvent } from "react";
import { useElementWidth } from "@/hooks/useElementWidth";
import { TIER_BOUNDARIES_EUR } from "@/lib/football";
import { formatEur } from "@/lib/format";
import styles from "./ValueHistory.module.css";

interface Point {
  date: string;
  value_eur: number;
  club: string | null;
}

interface Props {
  history: Point[];
  valuationDate: string | null;
  heldout: number | null;
}

const H = 300;
const PAD = { top: 34, right: 18, bottom: 34, left: 58 };
const fmtDate = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });

/** Observed Transfermarkt valuations over time, on the same log scale as the ruler. */
export function ValueHistory({ history, valuationDate, heldout }: Props) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const reduce = useReducedMotion();
  const found = history.findIndex((h) => h.date === valuationDate);
  const target = found >= 0 ? found : history.length - 1;
  const [active, setActive] = useState<number>(target);

  const t = history.map((h) => Date.parse(`${h.date}T00:00:00Z`));
  const v = history.map((h) => h.value_eur);
  const t0 = Math.min(...t);
  const t1 = Math.max(...t, t0 + 86_400_000);
  const vals = heldout ? [...v, heldout] : v;
  const l0 = Math.log(Math.min(...vals) / 1.6);
  const l1 = Math.log(Math.max(...vals) * 1.6);
  const w = Math.max(width, 320);
  const x = (ms: number) => PAD.left + ((ms - t0) / (t1 - t0)) * (w - PAD.left - PAD.right);
  const y = (eur: number) => PAD.top + (1 - (Math.log(eur) - l0) / (l1 - l0)) * (H - PAD.top - PAD.bottom);

  const path = history.map((h, i) => `${i ? "L" : "M"}${x(t[i]!).toFixed(1)},${y(h.value_eur).toFixed(1)}`).join(" ");
  const area = `${path} L${x(t[t.length - 1]!).toFixed(1)},${H - PAD.bottom} L${x(t[0]!).toFixed(1)},${H - PAD.bottom} Z`;
  const ticks = [1e5, 2e5, 5e5, 1e6, 2e6, 5e6, 1e7, 2e7, 5e7, 1e8, 2e8].filter((e) => Math.log(e) > l0 && Math.log(e) < l1);
  const years: number[] = [];
  for (let yr = new Date(t0).getUTCFullYear() + 1; Date.UTC(yr, 0, 1) <= t1; yr++) years.push(yr);
  const changes = history.map((h, i) => (i > 0 && h.club && h.club !== history[i - 1]!.club ? i : -1)).filter((i) => i > 0);
  const a = history[active]!;
  const peak = Math.max(...v);

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowLeft") setActive((i) => Math.max(0, i - 1));
    else if (e.key === "ArrowRight") setActive((i) => Math.min(history.length - 1, i + 1));
    else return;
    e.preventDefault();
  };

  const onPointer = (clientX: number, left: number) => {
    const ms = t0 + ((clientX - left - PAD.left) / (w - PAD.left - PAD.right)) * (t1 - t0);
    let best = 0;
    t.forEach((tt, i) => {
      if (Math.abs(tt - ms) < Math.abs(t[best]! - ms)) best = i;
    });
    setActive(best);
  };

  return (
    <div className={styles.wrap}>
      <dl className={styles.summary}>
        <div>
          <dt>First valuation</dt>
          <dd className="num">{formatEur(v[0]!)}</dd>
          <dd className={styles.when}>{fmtDate(history[0]!.date)}</dd>
        </div>
        <div>
          <dt>Peak</dt>
          <dd className="num">{formatEur(peak)}</dd>
          <dd className={styles.when}>{fmtDate(history[v.indexOf(peak)]!.date)}</dd>
        </div>
        <div>
          <dt>Model target</dt>
          <dd className="num">{formatEur(history[target]!.value_eur)}</dd>
          <dd className={styles.when}>{fmtDate(history[target]!.date)}</dd>
        </div>
        <div>
          <dt>Valuations</dt>
          <dd className="num">{history.length}</dd>
          <dd className={styles.when}>
            {changes.length} club change{changes.length === 1 ? "" : "s"}
          </dd>
        </div>
      </dl>

      <div
        ref={ref}
        className={styles.plot}
        tabIndex={0}
        role="group"
        aria-label={`Valuation history, ${history.length} valuations. Use the arrow keys to step through them.`}
        onKeyDown={onKey}
        onPointerMove={(e) => onPointer(e.clientX, e.currentTarget.getBoundingClientRect().left)}
      >
        {width > 0 && (
          <svg width={w} height={H} className={styles.svg} aria-hidden="true">
            <defs>
              <linearGradient id="vh-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#e9b949" stopOpacity="0.22" />
                <stop offset="1" stopColor="#e9b949" stopOpacity="0" />
              </linearGradient>
            </defs>
            {ticks.map((e) => (
              <g key={e}>
                <line className={styles.grid} x1={PAD.left} x2={w - PAD.right} y1={y(e)} y2={y(e)} />
                <text className={styles.tick} x={PAD.left - 10} y={y(e) + 4} textAnchor="end">
                  {formatEur(e, 0)}
                </text>
              </g>
            ))}
            {TIER_BOUNDARIES_EUR.filter((e) => Math.log(e) > l0 && Math.log(e) < l1).map((e) => (
              <line key={`tier-${e}`} className={styles.tierLine} x1={PAD.left} x2={w - PAD.right} y1={y(e)} y2={y(e)} />
            ))}
            {years.map((yr) => (
              <text key={yr} className={styles.tick} x={x(Date.UTC(yr, 0, 1))} y={H - 10} textAnchor="middle">
                {yr}
              </text>
            ))}
            {changes.map((i) => (
              <g key={`c-${i}`}>
                <line className={styles.change} x1={x(t[i]!)} x2={x(t[i]!)} y1={PAD.top - 12} y2={H - PAD.bottom} />
                <text className={styles.changeLabel} x={x(t[i]!) + 5} y={PAD.top - 16}>
                  {history[i]!.club}
                </text>
              </g>
            ))}
            <path d={area} fill="url(#vh-area)" />
            <motion.path
              d={path}
              className={styles.line}
              initial={reduce ? false : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            />
            {history.map((h, i) => (
              <circle key={h.date + i} className={styles.dot} data-target={i === target || undefined} cx={x(t[i]!)} cy={y(h.value_eur)} r={i === target ? 6 : 3} />
            ))}
            {heldout && (
              <g>
                <rect className={styles.heldout} x={x(t[target]!) - 6} y={y(heldout) - 6} width="12" height="12" transform={`rotate(45 ${x(t[target]!)} ${y(heldout)})`} />
                <text className={styles.heldoutLabel} x={x(t[target]!) - 12} y={y(heldout) + 4} textAnchor="end">
                  held-out A {formatEur(heldout)}
                </text>
              </g>
            )}
            <line className={styles.cursor} x1={x(t[active]!)} x2={x(t[active]!)} y1={PAD.top} y2={H - PAD.bottom} />
            <circle className={styles.cursorDot} cx={x(t[active]!)} cy={y(a.value_eur)} r="7" />
          </svg>
        )}
        {width > 0 && (
          <div
            className={styles.tip}
            style={{
              // Sit beside the point, on whichever side has room, so it never covers the marks.
              // On narrow charts it parks in the top-left corner instead.
              left: w < 560 ? PAD.left : x(t[active]!) > w * 0.62 ? x(t[active]!) - 190 - 16 : x(t[active]!) + 16,
              top: w < 560 ? -6 : Math.min(H - PAD.bottom - 90, Math.max(0, y(a.value_eur) - 40)),
            }}
          >
            <span className={styles.tipDate}>{fmtDate(a.date)}</span>
            <span className={`${styles.tipValue} num`}>{formatEur(a.value_eur)}</span>
            <span className={styles.tipClub}>{a.club ?? "Club not recorded"}</span>
            {active === target && <span className={styles.tipTag}>Valuation the model is trained to reproduce</span>}
          </div>
        )}
      </div>
      <p className={styles.note} aria-live="polite">
        {fmtDate(a.date)}: {formatEur(a.value_eur)}
        {a.club ? `, ${a.club}` : ""}. Dotted lines mark the €2M, €10M and €30M tier boundaries.
      </p>
      <details className={styles.table}>
        <summary>Show as a table</summary>
        <table>
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Market value</th>
              <th scope="col">Club</th>
            </tr>
          </thead>
          <tbody>
            {history.map((h, i) => (
              <tr key={h.date + i}>
                <td>{h.date}</td>
                <td className="num">{formatEur(h.value_eur)}</td>
                <td>{h.club ?? "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
