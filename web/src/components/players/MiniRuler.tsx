import { TIER_BOUNDARIES_EUR } from "@/lib/football";
import { formatEur } from "@/lib/format";
import styles from "./MiniRuler.module.css";

const LO = Math.log(50_000);
const HI = Math.log(200_000_000);
const pos = (eur: number) => Math.min(100, Math.max(0, ((Math.log(eur) - LO) / (HI - LO)) * 100));

interface Mark {
  value: number;
  kind: "market" | "model";
  label: string;
}

/**
 * Compact log-scale value ruler (€50k–€200M) with the €2M / €10M / €30M tier boundaries.
 * Market value is the filled marker, a model estimate the hollow one.
 */
export function MiniRuler({ marks, showScale = false }: { marks: Mark[]; showScale?: boolean }) {
  const [b1, b2, b3] = TIER_BOUNDARIES_EUR.map(pos) as [number, number, number];
  return (
    <div className={styles.ruler} role="img" aria-label={marks.map((m) => `${m.label} ${formatEur(m.value)}`).join(", ")}>
      <div className={styles.track}>
        <span className={styles.zone} style={{ left: 0, width: `${b1}%` }} />
        <span className={styles.zone} data-alt style={{ left: `${b1}%`, width: `${b2 - b1}%` }} />
        <span className={styles.zone} style={{ left: `${b2}%`, width: `${b3 - b2}%` }} />
        <span className={styles.zone} data-alt style={{ left: `${b3}%`, right: 0 }} />
        {[b1, b2, b3].map((b) => (
          <span key={b} className={styles.boundary} style={{ left: `${b}%` }} />
        ))}
        {marks.map((m) => (
          <span key={m.kind + m.value} className={styles.mark} data-kind={m.kind} style={{ left: `${pos(m.value)}%` }} />
        ))}
      </div>
      {showScale && (
        <div className={styles.scale} aria-hidden="true">
          <span style={{ left: `${b1}%` }}>€2M</span>
          <span style={{ left: `${b2}%` }}>€10M</span>
          <span style={{ left: `${b3}%` }}>€30M</span>
        </div>
      )}
    </div>
  );
}
