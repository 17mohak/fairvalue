// FairValue's marker grammar (D-039), used by every chart and table:
//   solid chalk disc      = observed value (Transfermarkt, the model's target)
//   gold outline diamond  = Model A estimate
//   dashed outline diamond = Model B estimate
// The same duality runs through the type: solid for what the market says, outline for the model.
import type { TierName } from "@/lib/football";
import { TIER_NAMES } from "@/lib/football";
import { factor } from "@/lib/journey";
import { signed } from "@/lib/format";
import styles from "./Marks.module.css";

export function ObsMark({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" aria-hidden="true" className={styles.mark}>
      <circle cx="5" cy="5" r="4.2" fill="#edefe6" stroke="#0b100d" strokeWidth="1.2" />
    </svg>
  );
}

export function ModelMark({ model = "A", size = 11 }: { model?: "A" | "B"; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" aria-hidden="true" className={styles.mark}>
      <path d="M6 1 11 6 6 11 1 6Z" fill="#0b100d" stroke={model === "A" ? "#e9b949" : "#c3cbc3"} strokeWidth="1.8" strokeDasharray={model === "B" ? "2.2 1.6" : undefined} />
    </svg>
  );
}

/** The legend that goes with any chart using the marks. */
export function MarkKey({ models = ["A"], className }: { models?: ("A" | "B")[]; className?: string }) {
  return (
    <span className={`${styles.key} ${className ?? ""}`}>
      <span>
        <ObsMark /> Observed
      </span>
      {models.map((m) => (
        <span key={m}>
          <ModelMark model={m} /> Model {m}
        </span>
      ))}
    </span>
  );
}

/**
 * Residual = log(observed) − log(estimate). ▲ gold: observed above the estimate (the model
 * under-predicts); ▼ slate: observed below it (the model over-predicts).
 */
export function Residual({ value, compact = false, basis }: { value: number; compact?: boolean; basis?: "held-out" | "in-sample" }) {
  const up = value >= 0;
  const text = `${up ? "Observed above" : "Observed below"} the estimate: residual ${signed(value, 3)} (${factor(value)})${basis ? `, ${basis}` : ""}`;
  return (
    <span className={styles.residual} data-dir={up ? "up" : "down"} title={text} aria-label={text}>
      <span aria-hidden="true">{up ? "▲" : "▼"}</span>
      <b className="num">{signed(value, compact ? 2 : 3)}</b>
      {!compact && <small className="num">{factor(value)}</small>}
    </span>
  );
}

/** Tier gauge: four steps, lit up to the player's tier, with its name. */
export function TierMark({ tier, showName = true }: { tier: TierName | null; showName?: boolean }) {
  if (!tier) return <span className={styles.tierNone}>–</span>;
  const i = TIER_NAMES.indexOf(tier);
  return (
    <span className={styles.tier} data-tier={i} title={`${tier} tier`}>
      <span className={styles.steps} aria-hidden="true">
        {TIER_NAMES.map((t, k) => (
          <i key={t} data-on={k <= i || undefined} />
        ))}
      </span>
      {showName ? <span>{tier}</span> : <span className="visually-hidden">{tier}</span>}
    </span>
  );
}
