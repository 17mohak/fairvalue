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

  const ratio = counterpart ? value / counterpart.predicted_value_eur : null;
  const modelAValue = model === "A" ? value : counterpart?.predicted_value_eur;
  const modelBValue = model === "B" ? value : counterpart?.predicted_value_eur;

  return (
    <div className={styles.panel}>
      <div role="status" aria-live="polite" className="visually-hidden">
        {loading ? "Updating estimate" : `Estimated market value ${formatEur(value)}, ${primary.predicted_tier} tier, from ${MODEL_LABELS[model].name}.`}
      </div>

      {status === "error" && error && <ErrorNotice error={error} onRetry={onRetry} compact />}

      <div className={styles.result} data-dim={loading || undefined}>
        {/* ---- Scoreboard ---- */}
        <header className={styles.board}>
          <div className={styles.boardTop}>
            <p className={styles.kicker}>
              <span className={styles.modelTag}>{MODEL_LABELS[model].name}</span> Estimated market value · {MODEL_LABELS[model].short.toLowerCase()}
            </p>
            <AnimatePresence>
              {(stale || loading) && (
                <motion.p
                  className={styles.staleChip}
                  data-loading={loading || undefined}
                  initial={reduce ? false : { opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {loading ? "Updating…" : "Profile edited · value again to update"}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
          <p className={styles.value}>
            <AnimatedEur key={model} value={value} />
          </p>
          <p className={styles.sub}>
            <span className={styles.tierPill}>{primary.predicted_tier}</span>
            <span className="num">{formatEurExact(value)}</span>
          </p>
        </header>

        {/* ---- Model A vs Model B ---- */}
        {counterpart && modelAValue !== undefined && modelBValue !== undefined && ratio !== null && (
          <section className={styles.duel} aria-label="Model A compared with Model B for this profile">
            <div data-active={model === "A" || undefined}>
              <span className={styles.duelName}>Model A</span>
              <span className={styles.duelHint}>with league and club</span>
              <span className={`${styles.duelValue} num`}>{formatEur(modelAValue)}</span>
            </div>
            <div className={styles.duelDelta}>
              <span className={`${styles.duelRatio} num`}>×{decimal(modelAValue / modelBValue, 2)}</span>
              <span className={styles.duelHint}>{modelAValue >= modelBValue ? "context raises this estimate" : "context lowers this estimate"}</span>
            </div>
            <div data-active={model === "B" || undefined}>
              <span className={styles.duelName}>Model B</span>
              <span className={styles.duelHint}>performance only</span>
              <span className={`${styles.duelValue} num`}>{formatEur(modelBValue)}</span>
            </div>
          </section>
        )}

        <div className={styles.rulerWrap}>
          <ValueRuler
            ariaLabel={`Estimate ${formatEur(value)} on a log scale of market values, in the ${primary.predicted_tier} tier`}
            marker={{ value, label: formatEur(value), variant: "primary" }}
            ghost={counterpart ? { value: counterpart.predicted_value_eur, label: `Model ${other} ${formatEur(counterpart.predicted_value_eur)}`, variant: "ghost" } : null}
            band={band}
          />
          <p className={styles.rulerNote}>
            <span className={styles.bandKey} aria-hidden="true" /> Typical miss: on unseen players {MODEL_LABELS[model].name} was off by a factor of
            about <span className="num">{Math.exp(mae).toFixed(2)}</span> either way (log MAE <span className="num">{decimal(mae, 3)}</span>). A guide to
            scale, not a confidence interval.
          </p>
        </div>

        {/* ---- Tier classifier ---- */}
        <section className={styles.section} aria-labelledby="tier-heading">
          <div className={styles.sectionHead}>
            <h3 id="tier-heading" className={styles.h3}>
              Tier classifier
            </h3>
            <p className={styles.sectionNote}>
              A separate model trained to predict the tier directly.{" "}
              {classifierAgrees
                ? `It agrees: ${primary.classifier_tier}.`
                : `It leans ${primary.classifier_tier}, while the value estimate falls in ${primary.predicted_tier}. Profiles near a boundary often split like this.`}
            </p>
          </div>
          <ol className={styles.tiers}>
            {TIER_NAMES.map((t, i) => {
              const p = primary.tier_probabilities[t] ?? 0;
              return (
                <li key={t} className={styles.tier} data-top={t === primary.classifier_tier || undefined}>
                  <span className={styles.tierName}>{t}</span>
                  <span className={styles.tierTrack}>
                    <motion.span
                      className={styles.tierBar}
                      initial={reduce ? false : { scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      style={{ width: `${Math.max(1, p * 100)}%` }}
                      transition={{ duration: 0.55, delay: reduce ? 0 : i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </span>
                  <span className={`${styles.tierP} num`}>{percent(p, 0)}</span>
                </li>
              );
            })}
          </ol>
        </section>

        {/* ---- Explanation ---- */}
        <section className={styles.section} aria-labelledby="why-heading">
          <div className={styles.sectionHead}>
            <h3 id="why-heading" className={styles.h3}>
              Why this number
            </h3>
          </div>
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
                      digits={2}
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

        {/* ---- Reading ---- */}
        <section className={`${styles.section} ${styles.reading}`} aria-labelledby="read-heading">
          <h3 id="read-heading" className={styles.h3}>
            Reading this estimate
          </h3>
          <ul className={styles.caveats}>
            <li>
              It reproduces Transfermarkt&apos;s community valuations, which may carry their own biases. It is not a fee, a wage or a judgement of the
              player.
            </li>
            <li>
              It only applies to players like those in training: at clubs in 14 European first divisions, with at least 450 minutes in two years.
              This profile was valued as playing in {leagueName(player.valuation_league_id)}.
            </li>
            <li>
              The model never sees nationality. Even so, the <Link href="/fairness">fairness audit</Link> found it under-predicts non-UEFA players
              relative to UEFA players in the same leagues, by about{" "}
              {Math.round(Math.expm1(research.headline.A.signed_gap_league_stratified.estimate) * 100)}% on average.
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
