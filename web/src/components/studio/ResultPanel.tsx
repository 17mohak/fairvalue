"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { BarList } from "@/components/charts/BarList";
import { ContributionChart } from "@/components/charts/ContributionChart";
import { ValueRuler } from "@/components/charts/ValueRuler";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import type { ApiError } from "@/lib/api/client";
import type { ExplainResponse, PlayerFeatures, PredictResponse } from "@/lib/api/types";
import { MODEL_LABELS, TIER_NAMES, featureLabel, leagueName, type ModelId } from "@/lib/football";
import { decimal, formatEur, formatEurExact, percent } from "@/lib/format";
import { heldOutLogMae, research, shapGlobal } from "@/lib/research";
import { AnimatedEur } from "./AnimatedEur";
import styles from "./ResultPanel.module.css";

export interface StudioResult {
  primary: PredictResponse;
  explanation: ExplainResponse | null;
  explanationError: string | null;
  counterpart: PredictResponse | null;
  player: PlayerFeatures;
}

interface Props {
  status: "idle" | "loading" | "done" | "error";
  result: StudioResult | null;
  error: ApiError | null;
  stale: boolean;
  onRetry: () => void;
}

export function ResultPanel({ status, result, error, stale, onRetry }: Props) {
  const reduce = useReducedMotion();
  const loading = status === "loading";

  if (!result) {
    return (
      <div className={styles.panel}>
        {status === "error" && error ? (
          <ErrorNotice error={error} onRetry={onRetry} />
        ) : (
          <div className={styles.empty} data-loading={loading || undefined}>
            <p className={styles.eyebrowless}>{loading ? "Valuing this profile…" : "Your estimate will land on this scale."}</p>
            <ValueRuler ariaLabel="Market value scale from €20k to €250M with tier boundaries at €2M, €10M and €30M" />
            {loading && <span className={styles.scan} aria-hidden="true" />}
            <p className={styles.emptyNote}>
              Tiers are fixed definitions, not model outputs: under €2M is Emerging, €2–10M Established, €10–30M Elite and €30M or more
              World Class. They are the 50th, 80th and 95th percentiles of values in the training population.
            </p>
          </div>
        )}
        <div role="status" aria-live="polite" className="visually-hidden">
          {loading ? "Valuing profile" : ""}
        </div>
      </div>
    );
  }

  const { primary, explanation, explanationError, counterpart, player } = result;
  const model = primary.model;
  const other: ModelId = model === "A" ? "B" : "A";
  const mae = heldOutLogMae(model);
  const value = primary.predicted_value_eur;
  const band: [number, number] = [value / Math.exp(mae), value * Math.exp(mae)];
  const classifierAgrees = primary.classifier_tier === primary.predicted_tier;

  return (
    <div className={styles.panel}>
      <div role="status" aria-live="polite" className="visually-hidden">
        {loading ? "Updating estimate" : `Estimated market value ${formatEur(value)}, ${primary.predicted_tier} tier, from ${MODEL_LABELS[model].name}.`}
      </div>

      {status === "error" && error && <ErrorNotice error={error} onRetry={onRetry} compact />}

      <AnimatePresence>
        {(stale || loading) && (
          <motion.p
            className={styles.staleChip}
            initial={reduce ? false : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {loading ? "Updating…" : "Profile edited. Value it again to update."}
          </motion.p>
        )}
      </AnimatePresence>

      <div className={styles.result} data-dim={loading || undefined}>
        <header className={styles.head}>
          <p className={styles.kicker}>
            Estimated market value, {MODEL_LABELS[model].name} ({MODEL_LABELS[model].short.toLowerCase()})
          </p>
          <p className={styles.value}>
            <AnimatedEur key={model} value={value} />
          </p>
          <p className={styles.sub}>
            <span className="num">{formatEurExact(value)}</span>
            <span className={styles.tierPill}>{primary.predicted_tier} tier</span>
          </p>
        </header>

        <ValueRuler
          ariaLabel={`Estimate ${formatEur(value)} on a log scale of market values, in the ${primary.predicted_tier} tier`}
          marker={{ value, label: formatEur(value), variant: "primary" }}
          ghost={counterpart ? { value: counterpart.predicted_value_eur, label: `Model ${other} ${formatEur(counterpart.predicted_value_eur)}`, variant: "ghost" } : null}
          band={band}
        />

        <div className={styles.facts}>
          <p>
            <strong>Typical miss.</strong> On players it never saw in training, {MODEL_LABELS[model].name}&apos;s estimates were off by a factor of
            about <span className="num">{Math.exp(mae).toFixed(2)}</span> either way (log MAE <span className="num">{decimal(mae, 3)}</span>). The
            shaded band shows that range around this estimate. It is a guide to scale, not a confidence interval.
          </p>
          {counterpart && (
            <p>
              <strong>{other === "B" ? "Without league and club." : "With league and club."}</strong> {MODEL_LABELS[other].name}
              {other === "B" ? ", which sees only performance, age and position," : ", which also sees the league and club strength,"} puts this
              profile at <span className="num">{formatEur(counterpart.predicted_value_eur)}</span>.
            </p>
          )}
        </div>

        <section className={styles.section} aria-labelledby="tier-heading">
          <h3 id="tier-heading" className={styles.h3}>
            Tier classifier
          </h3>
          <p className={styles.sectionNote}>
            A separate model trained to predict the tier directly.{" "}
            {classifierAgrees
              ? `It agrees: ${primary.classifier_tier}.`
              : `It leans ${primary.classifier_tier}, while the value estimate falls in ${primary.predicted_tier}. Profiles near a boundary often split like this.`}
          </p>
          <ol className={styles.tiers}>
            {TIER_NAMES.map((t) => {
              const p = primary.tier_probabilities[t] ?? 0;
              return (
                <li key={t} className={styles.tier} data-top={t === primary.classifier_tier || undefined}>
                  <span className={styles.tierName}>{t}</span>
                  <span className={styles.tierTrack}>
                    <motion.span
                      className={styles.tierBar}
                      initial={reduce ? false : { scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      style={{ height: `${Math.max(2, p * 100)}%` }}
                      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </span>
                  <span className={`${styles.tierP} num`}>{percent(p, 0)}</span>
                </li>
              );
            })}
          </ol>
        </section>

        <section className={styles.section} aria-labelledby="why-heading">
          <h3 id="why-heading" className={styles.h3}>
            Why this number
          </h3>
          <Tabs
            label="Explanation views"
            tabs={[
              {
                id: "local",
                label: "This estimate",
                content: explanation ? (
                  <>
                    <p className={styles.sectionNote}>
                      How each input moved this estimate away from the average training player, computed for this profile with SHAP on the served
                      model. Effects multiply. They describe the model&apos;s arithmetic, not what causes market value.
                    </p>
                    <ContributionChart explanation={explanation} />
                  </>
                ) : (
                  <p className={styles.unavailable}>
                    {explanationError ?? "No explanation was returned."} The estimate above is unaffected; only the breakdown is missing.
                  </p>
                ),
              },
              {
                id: "global",
                label: "Across all players",
                content: (
                  <>
                    <p className={styles.sectionNote}>
                      Not about this profile. The average size of each input&apos;s effect over all {research.models.n_training_rows.toLocaleString("en-GB")}{" "}
                      training players (mean |SHAP|, log scale). Large means the input usually moves estimates a lot, in either direction.
                    </p>
                    <BarList
                      items={shapGlobal(model)
                        .slice(0, 10)
                        .map((r) => ({ key: r.feature, label: featureLabel(r.feature), value: r.mean_abs }))}
                      format={(v) => decimal(v, 2)}
                      highlight={explanation?.contributions[0]?.feature}
                      caption={
                        explanation?.contributions[0]
                          ? `Highlighted: ${featureLabel(explanation.contributions[0].feature).toLowerCase()}, the largest effect on this estimate.`
                          : undefined
                      }
                    />
                  </>
                ),
              },
            ]}
          />
        </section>

        <section className={styles.section} aria-labelledby="read-heading">
          <h3 id="read-heading" className={styles.h3}>
            Reading this estimate
          </h3>
          <ul className={styles.caveats}>
            <li>
              It reproduces Transfermarkt&apos;s community valuations, which may carry their own biases. It is not a fee, a wage or a judgement
              of the player.
            </li>
            <li>
              It only applies to players like those in training: at clubs in 14 European first divisions, with at least 450 minutes in two
              years. This profile was valued as playing in {leagueName(player.valuation_league_id)}.
            </li>
            <li>
              The model never sees nationality. Even so, the{" "}
              <Link href="/fairness">fairness audit</Link> found it under-predicts non-UEFA players relative to UEFA players in the same leagues, by
              about {Math.round(Math.expm1(research.headline.A.signed_gap_league_stratified.estimate) * 100)}% on average.
            </li>
          </ul>
          <dl className={styles.versions}>
            <div>
              <dt>Regressor</dt>
              <dd className="num">{primary.model_version.regressor}</dd>
            </div>
            <div>
              <dt>Classifier</dt>
              <dd className="num">{primary.model_version.classifier}</dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}


function ErrorNotice({ error, onRetry, compact = false }: { error: ApiError; onRetry: () => void; compact?: boolean }) {
  const title =
    error.kind === "validation"
      ? "The model can't value this profile"
      : error.kind === "unavailable" || error.kind === "network"
        ? "The valuation service is offline"
        : "Valuation failed";
  const body =
    error.kind === "validation"
      ? "Some inputs are outside the range the model was trained on. The fields that need changing are marked."
      : error.message;
  return (
    <div className={`${styles.error} ${compact ? styles.errorCompact : ""}`} role="alert">
      <p className={styles.errorTitle}>{title}</p>
      <p className={styles.errorBody}>{body}</p>
      {error.kind !== "validation" && (
        <Button type="button" variant="quiet" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
