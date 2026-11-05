import { formatEur } from "@/lib/format";
import { logHistogram } from "@/lib/peers";
import { niceTicks } from "@/lib/theatre";
import styles from "./ValueSilhouette.module.css";

// Narrow and tall, so labels stay legible at the half-column width it is shown in.
const W = 420;
const H = 96;
const TOP = 20;
const BASE = 70;
const BINS = 36;

/**
 * The shape of a group's observed values on a log scale (a histogram drawn as a silhouette), with
 * this player's value marked and the group median ticked. Server-rendered and light: one bar per
 * bin, not one mark per player.
 */
export function ValueSilhouette({ values, value, median, label }: { values: number[]; value: number; median: number; label: string }) {
  const finite = values.filter((v) => v > 0);
  const lo = Math.min(...finite, value) / 1.25;
  const hi = Math.max(...finite, value) * 1.25;
  const counts = logHistogram(finite, lo, hi, BINS);
  const peak = Math.max(1, ...counts);
  const x = (v: number) => ((Math.log(v) - Math.log(lo)) / (Math.log(hi) - Math.log(lo))) * W;
  const bw = W / BINS;
  const mine = Math.min(BINS - 1, Math.max(0, Math.floor((x(value) / W) * BINS)));
  const ticks = niceTicks(lo, hi, 4);
  const px = x(value);
  const anchor = px > W * 0.85 ? "end" : px < W * 0.15 ? "start" : "middle";

  return (
    <svg className={styles.svg} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      {counts.map((c, i) =>
        c ? (
          <rect
            key={i}
            x={i * bw + 0.6}
            width={bw - 1.2}
            y={BASE - (c / peak) * (BASE - TOP)}
            height={(c / peak) * (BASE - TOP)}
            className={styles.bar}
            data-mine={i === mine || undefined}
            style={{ ["--i" as string]: i }}
          />
        ) : null,
      )}
      <line x1={0} x2={W} y1={BASE} y2={BASE} className={styles.base} />
      <line x1={x(median)} x2={x(median)} y1={TOP - 4} y2={BASE} className={styles.median} />
      {ticks.map((t) => (
        <text key={t} x={x(t)} y={H - 4} textAnchor="middle" className={styles.tick}>
          {formatEur(t)}
        </text>
      ))}
      <line x1={px} x2={px} y1={4} y2={BASE} className={styles.mark} />
      <circle cx={px} cy={BASE} r={4.5} className={styles.disc} />
      <text x={px + (anchor === "end" ? -6 : anchor === "start" ? 6 : 0)} y={12} textAnchor={anchor} className={styles.markLabel}>
        {formatEur(value)}
      </text>
    </svg>
  );
}
