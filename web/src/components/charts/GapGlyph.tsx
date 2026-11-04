import { decimal, signed } from "@/lib/format";
import type { Interval } from "@/lib/research";
import { niceTicks } from "@/lib/scale";
import styles from "./GapGlyph.module.css";

interface Row {
  key: string;
  label: string;
  sublabel?: string;
  interval: Interval;
  emphasis?: boolean;
}

/** A large, quiet forest plot for editorial use: estimate, 95% CI and the zero line. */
export function GapGlyph({ rows, domain }: { rows: Row[]; domain: [number, number] }) {
  const [d0, d1] = domain;
  const pos = (v: number) => ((v - d0) / (d1 - d0)) * 100;
  const ticks = niceTicks(d0, d1, 4);
  return (
    <figure className={styles.figure}>
      <ul className={styles.rows}>
        {rows.map((r, i) => (
          <li
            key={r.key}
            className={styles.row}
            data-emphasis={r.emphasis || undefined}
            aria-label={`${r.label}: ${signed(r.interval.estimate)}, 95% interval ${decimal(r.interval.low, 3)} to ${decimal(r.interval.high, 3)}`}
          >
            <span className={styles.label}>
              {r.label}
              {r.sublabel && <small>{r.sublabel}</small>}
            </span>
            <span className={styles.track} aria-hidden="true">
              <span className={styles.zero} style={{ left: `${pos(0)}%` }} />
              <span
                className={styles.ci}
                style={{ left: `${pos(r.interval.low)}%`, width: `${pos(r.interval.high) - pos(r.interval.low)}%`, animationDelay: `${i * 120}ms` }}
              />
              <span className={styles.dot} style={{ left: `${pos(r.interval.estimate)}%`, animationDelay: `${i * 120 + 260}ms` }} />
            </span>
            <span className={`${styles.value} num`}>{signed(r.interval.estimate)}</span>
          </li>
        ))}
      </ul>
      <div className={styles.axis} aria-hidden="true">
        <span />
        <span className={styles.ticks}>
          {ticks.map((t) => (
            <span key={t} className="num" style={{ left: `${pos(t)}%` }}>
              {Math.abs(t) < 1e-12 ? "0" : signed(t, 2)}
            </span>
          ))}
        </span>
        <span />
      </div>
      <figcaption className={styles.caption}>
        <span>← UEFA under-predicted</span>
        <span>non-UEFA under-predicted →</span>
      </figcaption>
    </figure>
  );
}
