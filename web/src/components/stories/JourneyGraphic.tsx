"use client";

import { Residual } from "@/components/brand/Marks";
import { ValuationJourney } from "@/components/journey/ValuationJourney";
import { formatEur } from "@/lib/format";
import { buildJourney, toEur, type Explanation } from "@/lib/journey";
import styles from "./graphics.module.css";

export interface JourneyData {
  explanation: Explanation;
  observed: number;
  subject: string;
  /** Story step -> index of the last journey step revealed. */
  reveal: number[];
  top: number;
}

/** The valuation story's pinned graphic: the running estimate and the journey revealed step by step. */
export function JourneyGraphic({ data, step }: { data: JourneyData; step: number }) {
  const j = buildJourney(data.explanation, data.top);
  const shown = Math.min(data.reveal[step] ?? 0, j.steps.length - 1);
  const s = j.steps[shown]!;
  const final = s.kind === "final";
  return (
    <figure className={styles.fig}>
      <div className={styles.running}>
        <span className={styles.runLabel}>{final ? `Model ${data.explanation.model} estimate` : shown === 0 ? "Starting point" : `After ${s.label.toLowerCase()}`}</span>
        <span className={`${styles.runValue} num`}>{formatEur(toEur(s.after))}</span>
        <span className={styles.runObs}>observed {formatEur(data.observed)}</span>
        {final && (
          <span className={styles.verdict}>
            <Residual value={Math.log(data.observed) - j.final} basis="in-sample" />
            <span>{Math.log(data.observed) >= j.final ? "observed above the estimate: the model under-predicts" : "observed below the estimate: the model over-predicts"}</span>
          </span>
        )}
      </div>
      <ValuationJourney
        variant="story"
        explanation={data.explanation}
        observed={data.observed}
        subject={data.subject}
        top={data.top}
        revealed={shown}
        focus={shown}
        provenance="Published SHAP run for the served Model A; this player was in its training data."
      />
    </figure>
  );
}
