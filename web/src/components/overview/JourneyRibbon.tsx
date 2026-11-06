import { formatEur } from "@/lib/format";
import { buildJourney, euroTicks, factor, type Explanation } from "@/lib/journey";
import styles from "./JourneyRibbon.module.css";

/**
 * The Valuation Journey as a front-page graphic: a staircase on one log-euro axis, one lane per
 * input, from the model's starting point to its estimate, with the observed value marked.
 * Same SHAP values and arithmetic as the full journey (lib/journey.ts).
 */
export function JourneyRibbon({ explanation, observed, labels = 3 }: { explanation: Explanation; observed: number; labels?: number }) {
  const j = buildJourney(explanation, 7);
  const moves = j.steps.filter((s) => s.kind === "feature" || s.kind === "rest");
  const all = j.steps.flatMap((s) => [s.before, s.after]).concat(Math.log(observed));
  const lo = Math.min(...all) - 0.25;
  const hi = Math.max(...all) + 0.25;
  const x = (v: number) => ((v - lo) / (hi - lo)) * 100;
  const named = new Set(moves.filter((s) => s.kind === "feature").slice(0, labels).map((s) => s.key));
  const obs = Math.log(observed);

  return (
    <figure className={styles.ribbon} aria-label={`Valuation journey: from ${formatEur(Math.exp(j.base))} to ${formatEur(Math.exp(j.final))}; observed ${formatEur(observed)}`}>
      <div className={styles.plot} style={{ "--lanes": moves.length + 2 } as React.CSSProperties}>
        {euroTicks([lo, hi]).map((t) => (
          <i key={t} className={styles.grid} style={{ left: `${x(Math.log(t))}%` }}>
            <span>{formatEur(t, 0)}</span>
          </i>
        ))}
        <i className={styles.obsLine} style={{ left: `${x(obs)}%` }} />
        <span className={styles.origin} style={{ left: `${x(j.base)}%`, top: 0 }} title={`Starting point ${formatEur(Math.exp(j.base))}`} />
        {moves.map((s, i) => (
          <span key={s.key} className={styles.lane} style={{ top: `calc(var(--lane) * ${i + 1})` }}>
            <span
              className={styles.seg}
              data-dir={s.contribution >= 0 ? "up" : "down"}
              style={{ left: `${x(Math.min(s.before, s.after))}%`, width: `max(${Math.abs(x(s.after) - x(s.before))}%, 2px)`, animationDelay: `${i * 70}ms` }}
              title={`${s.label}${s.input ? ` (${s.input})` : ""}: ${factor(s.contribution)}`}
            />
            {named.has(s.key) && (
              <span className={styles.label} style={{ left: `calc(${x(Math.max(s.before, s.after))}% + 0.4rem)` }}>
                {s.label} <b>{factor(s.contribution)}</b>
              </span>
            )}
          </span>
        ))}
        <span className={styles.final} style={{ left: `${x(j.final)}%`, top: `calc(var(--lane) * ${moves.length + 1})` }} />
        <span className={styles.obs} style={{ left: `${x(obs)}%`, top: `calc(var(--lane) * ${moves.length + 1})` }} />
      </div>
      <figcaption className={styles.cap}>
        <span>
          <i data-k="origin" /> start {formatEur(Math.exp(j.base))}
        </span>
        <span>
          <i data-k="up" /> raises <i data-k="down" /> lowers
        </span>
        <span>
          <i data-k="final" /> Model A {formatEur(Math.exp(j.final))}
        </span>
        <span>
          <i data-k="obs" /> observed {formatEur(observed)}
        </span>
      </figcaption>
    </figure>
  );
}
