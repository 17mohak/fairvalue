"use client";

import { useId, useMemo, useRef, useState, type ReactNode } from "react";
import { formatEur, signed } from "@/lib/format";
import { buildJourney, euroTicks, extremes, factor, journeyDomain, toEur, type Explanation, type JourneyStep } from "@/lib/journey";
import styles from "./ValuationJourney.module.css";

interface Props {
  explanation: Explanation;
  /** Observed market value, drawn as a reference line and compared with the estimate. */
  observed?: number | null;
  /** Where this explanation comes from, shown under the chart (always shown: provenance is part of the answer). */
  provenance: ReactNode;
  /** Name used in the plain-language reading ("this player" if omitted). */
  subject?: string;
  variant?: "full" | "compact" | "story";
  /** Individual steps before the rest are folded together. */
  top?: number;
  /** Story variant: steps up to this index are revealed. */
  revealed?: number;
  /** Story variant: the step the narrative is on. */
  focus?: number;
}

/**
 * The Valuation Journey (D-038): from the model's starting point, input by input, to its estimate.
 * Each bar is one input's SHAP contribution on the model's log scale, so bars of equal length are
 * equal multiplications of the euro value. The running value is exp(base + contributions so far).
 */
export function ValuationJourney({ explanation, observed = null, provenance, subject, variant = "full", top, revealed, focus }: Props) {
  const j = useMemo(() => buildJourney(explanation, top ?? (variant === "compact" ? 5 : 8)), [explanation, top, variant]);
  const [active, setActive] = useState<number | null>(null);
  const list = useRef<HTMLOListElement>(null);
  const detailId = useId();

  if (!j.ok) {
    return (
      <div className={styles.refused} role="status">
        <b>Explanation withheld.</b> Its contributions do not add up to the model&apos;s output (error {j.additivityError.toExponential(1)} on
        the log scale), so drawing it would misattribute the estimate.
      </div>
    );
  }

  const [lo, hi] = journeyDomain(j, observed);
  const x = (log: number) => ((log - lo) / (hi - lo)) * 100;
  // Narrow variants keep fewer, rounder ticks so the axis labels never collide.
  const allTicks = euroTicks([lo, hi]);
  const ticks = variant === "compact" ? (allTicks.filter((t) => String(t)[0] === "1").length >= 2 ? allTicks.filter((t) => String(t)[0] === "1") : allTicks).slice(0, 4) : allTicks;
  const obsLog = observed && observed > 0 ? Math.log(observed) : null;
  const { up, down } = extremes(j);
  const n = explanation.contributions.length;
  const shownStep = focus ?? active ?? j.steps.length - 1;
  const who = subject ?? "this player";

  const sentence = (s: JourneyStep): ReactNode => {
    if (s.kind === "base")
      return (
        <>
          Every Model {explanation.model} valuation starts at <b>{formatEur(toEur(s.after))}</b>, the model&apos;s average output over the
          players it was trained on (log {s.after.toFixed(3)}).
        </>
      );
    if (s.kind === "final") {
      const res = obsLog !== null ? obsLog - j.final : null;
      return (
        <>
          After all {n} inputs Model {explanation.model} arrives at <b>{formatEur(toEur(j.final))}</b> (exp {j.final.toFixed(3)}).
          {res !== null && (
            <>
              {" "}
              The observed market value is {formatEur(observed!)}: residual {signed(res, 3)}, so the observed value is{" "}
              {res >= 0 ? "above the estimate (the model under-predicts)" : "below the estimate (the model over-predicts)"}.
            </>
          )}
        </>
      );
    }
    const verb = s.contribution >= 0 ? "raises" : "lowers";
    return (
      <>
        <b>{s.label}</b>
        {s.input ? ` (${s.input})` : ""} {verb} the estimate <b>{factor(s.contribution)}</b>, from {formatEur(toEur(s.before))} to{" "}
        {formatEur(toEur(s.after))}: {signed(s.contribution, 3)} on the log scale.
      </>
    );
  };

  const onKeyDown = (e: React.KeyboardEvent, i: number) => {
    const next = e.key === "ArrowDown" ? i + 1 : e.key === "ArrowUp" ? i - 1 : null;
    if (next === null || next < 0 || next >= j.steps.length) return;
    e.preventDefault();
    list.current?.querySelectorAll<HTMLButtonElement>("button")[next]?.focus();
  };

  return (
    <figure className={styles.journey} data-variant={variant}>
      {variant !== "story" && (
        <p className={styles.reading}>
          Model {explanation.model} starts {who} at {formatEur(toEur(j.base))} and moves the estimate input by input.
          {up && (
            <>
              {" "}
              {up.label} raises it most ({factor(up.contribution)})
            </>
          )}
          {down && (
            <>
              {up ? "; " : " "}
              {down.label.toLowerCase()} lowers it most ({factor(down.contribution)})
            </>
          )}
          {up || down ? "." : ""} It ends at <b>{formatEur(toEur(j.final))}</b>
          {observed ? <> against an observed {formatEur(observed)}.</> : "."}
        </p>
      )}

      <div className={styles.head} aria-hidden="true">
        <span>Input</span>
        <span className={styles.ticks}>
          {ticks.map((t) => (
            <i key={t} style={{ left: `${x(Math.log(t))}%` }}>
              {formatEur(t, 0)}
            </i>
          ))}
        </span>
        <span>Effect</span>
        <span>Running</span>
      </div>

      <ol ref={list} className={styles.steps} onMouseLeave={() => setActive(null)}>
        {j.steps.map((s, i) => {
          const hidden = revealed !== undefined && i > revealed;
          const dir = s.contribution >= 0 ? "up" : "down";
          const a = x(Math.min(s.before, s.after));
          const w = Math.abs(x(s.after) - x(s.before));
          return (
            <li
              key={s.key}
              data-kind={s.kind}
              data-dir={dir}
              data-active={shownStep === i || undefined}
              data-hidden={hidden || undefined}
              style={{ "--i": i } as React.CSSProperties}
            >
              <button
                type="button"
                className={styles.row}
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onKeyDown={(e) => onKeyDown(e, i)}
                aria-describedby={shownStep === i ? detailId : undefined}
                tabIndex={hidden ? -1 : 0}
              >
                <span className={styles.label}>
                  <b>{s.label}</b>
                  {s.input && <small>{s.input}</small>}
                  {s.kind === "base" && <small>average output</small>}
                  {s.kind === "rest" && <small>combined</small>}
                </span>
                <span className={styles.track} aria-hidden="true">
                  {ticks.map((t) => (
                    <i key={t} className={styles.grid} style={{ left: `${x(Math.log(t))}%` }} />
                  ))}
                  {obsLog !== null && <i className={styles.observedLine} style={{ left: `${x(obsLog)}%` }} />}
                  {s.kind === "base" && <span className={styles.origin} style={{ left: `${x(s.after)}%` }} />}
                  {(s.kind === "feature" || s.kind === "rest") && (
                    <>
                      <span className={styles.bar} data-dir={dir} style={{ left: `${a}%`, width: `max(${w}%, 2px)` }} />
                      {i < j.steps.length - 2 && <span className={styles.connector} style={{ left: `${x(s.after)}%` }} />}
                    </>
                  )}
                  {s.kind === "final" && (
                    <>
                      <span className={styles.net} style={{ left: `${x(Math.min(j.base, j.final))}%`, width: `${Math.abs(x(j.final) - x(j.base))}%` }} />
                      <span className={styles.estimate} style={{ left: `${x(j.final)}%` }} />
                      {obsLog !== null && (
                        <span className={styles.observed} style={{ left: `${x(obsLog)}%` }}>
                          <span>Observed {formatEur(observed!)}</span>
                        </span>
                      )}
                    </>
                  )}
                </span>
                <span className={`${styles.effect} num`}>
                  {s.kind === "feature" || s.kind === "rest" ? (
                    <>
                      {factor(s.contribution)}
                      <small>{signed(s.contribution, 2)}</small>
                    </>
                  ) : (
                    <small>{s.kind === "base" ? `log ${s.after.toFixed(2)}` : `log ${j.final.toFixed(2)}`}</small>
                  )}
                </span>
                <span className={`${styles.running} num`}>{formatEur(toEur(s.after))}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <p id={detailId} className={styles.detail} aria-live="polite">
        {sentence(j.steps[shownStep]!)}
      </p>

      <figcaption className={styles.caption}>
        <span className={styles.key}>
          <i data-dir="up" /> raises the estimate <i data-dir="down" /> lowers it
          {obsLog !== null && (
            <>
              <i data-k="obs" /> observed value
            </>
          )}
        </span>
        <span>
          Log scale: equal lengths are equal multiplications. Inputs are ordered by size of effect, not in any causal sequence. {provenance}
        </span>
      </figcaption>
    </figure>
  );
}
