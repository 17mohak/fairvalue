"use client";

import { decimal, signed } from "@/lib/format";
import { niceTicks } from "@/lib/scale";
import styles from "./Dumbbell.module.css";

export interface DumbbellRow {
  key: string;
  label: string;
  uefa: number;
  nonUefa: number;
}

/** Two group means per row, joined by a line whose length is the gap. Legend + colour carry identity. */
export function Dumbbell({ rows, axisLabel, caption, tableCaption }: { rows: DumbbellRow[]; axisLabel: string; caption?: string; tableCaption: string }) {
  const values = rows.flatMap((r) => [r.uefa, r.nonUefa]);
  const lo = Math.min(0, ...values);
  const hi = Math.max(0, ...values);
  const pad = (hi - lo) * 0.08;
  const d0 = lo - pad;
  const d1 = hi + pad;
  const pos = (v: number) => ((v - d0) / (d1 - d0)) * 100;
  const ticks = niceTicks(d0, d1, 5);
  return (
    <figure className={styles.figure}>
      <div className={styles.legend}>
        <span>
          <i className={styles.keyUefa} /> UEFA players
        </span>
        <span>
          <i className={styles.keyNon} /> Non-UEFA players
        </span>
        <span className={styles.legendGap}>Gap (right)</span>
      </div>
      <ul className={styles.rows}>
        {rows.map((r) => {
          const left = Math.min(pos(r.uefa), pos(r.nonUefa));
          const width = Math.abs(pos(r.uefa) - pos(r.nonUefa));
          return (
            <li
              key={r.key}
              className={styles.row}
              tabIndex={0}
              aria-label={`${r.label}: UEFA ${signed(r.uefa)}, non-UEFA ${signed(r.nonUefa)}, gap ${signed(r.nonUefa - r.uefa)}`}
            >
              <span className={styles.label}>{r.label}</span>
              <span className={styles.track}>
                <span className={styles.zero} style={{ left: `${pos(0)}%` }} />
                <span className={styles.link} style={{ left: `${left}%`, width: `${width}%` }} />
                <span className={`${styles.dot} ${styles.uefa}`} style={{ left: `${pos(r.uefa)}%` }} />
                <span className={`${styles.dot} ${styles.nonUefa}`} style={{ left: `${pos(r.nonUefa)}%` }} />
              </span>
              <span className={`${styles.value} num`}>{signed(r.nonUefa - r.uefa)}</span>
            </li>
          );
        })}
      </ul>
      <div className={styles.axisRow} aria-hidden="true">
        <span />
        <div className={styles.axis}>
          {ticks.map((t) => (
            <span key={t} className={`${styles.tick} num`} style={{ left: `${pos(t)}%` }}>
              {Math.abs(t) < 1e-12 ? "0" : signed(t, 2)}
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
              <th scope="col">UEFA</th>
              <th scope="col">Non-UEFA</th>
              <th scope="col">Gap</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key}>
                <th scope="row">{r.label}</th>
                <td className="num">{decimal(r.uefa, 4)}</td>
                <td className="num">{decimal(r.nonUefa, 4)}</td>
                <td className="num">{decimal(r.nonUefa - r.uefa, 4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
