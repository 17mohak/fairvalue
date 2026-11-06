"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { BarList } from "@/components/charts/BarList";
import { ContributionChart } from "@/components/charts/ContributionChart";
import { ValueRuler } from "@/components/charts/ValueRuler";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import type { ApiError } from "@/lib/api/client";
import { useServiceStatus } from "@/lib/api/service";
import type { ExplainResponse, PlayerFeatures, PredictResponse } from "@/lib/api/types";
import { MODEL_LABELS, TIER_BOUNDARIES_EUR, TIER_NAMES, featureLabel, leagueName, type ModelId } from "@/lib/football";
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

/** A published research result for one of the eight showcase players: shown only as cached. */
export interface CachedResult {
  name: string;
  slug: string;
  value: number;
  tier: string;
  explanation: ExplainResponse | null;
}

export interface ResearchOption {
  id: string;
  name: string;
  detail: string;
}

interface Props {
  status: "idle" | "loading" | "done" | "error" | "cached";
  result: StudioResult | null;
  cached: CachedResult | null;
  error: ApiError | null;
  stale: boolean;
  onRetry: () => void;
  /** Summary of the profile that will be submitted, for the ready state. */
  profile: { label: string; value: string }[];
  research: ResearchOption[];
  onLoadResearch: (id: string) => void;
}

const TIER_RANGES = ["under €2M", "€2M – €10M", "€10M – €30M", "€30M and above"];

export function ResultPanel({ status, result, cached, error, stale, onRetry, profile, research: options, onLoadResearch }: Props) {
  const loading = status === "loading";
  const live = (
    <div role="status" aria-live="polite" className="visually-hidden">
      {loading
        ? "Valuing profile"
        : result
          ? `Estimated market value ${formatEur(result.primary.predicted_value_eur)}, ${result.primary.predicted_tier} tier, from ${MODEL_LABELS[result.primary.model].name}.`
          : cached
            ? `Cached research result for ${cached.name}: ${formatEur(cached.value)}, not a live prediction.`
            : ""}
    </div>
  );

  if (result) return <>{live}<Live result={result} loading={loading} stale={stale} error={status === "error" ? error : null} onRetry={onRetry} /></>;
  if (cached && status === "cached") return <>{live}<Cached cached={cached} /></>;
  if (loading) return <>{live}<Loading /></>;
  if (status === "error" && error) return <>{live}<Offline error={error} onRetry={onRetry} options={options} onLoadResearch={onLoadResearch} /></>;
  return <>{live}<Ready profile={profile} /></>;
}

/* ------------------------------------------------------------------ ready */
function Ready({ profile }: { profile: { label: string; value: string }[] }) {
  return (
    <div className={styles.console}>
      <section className={`fv-panel ${styles.span}`} aria-labelledby="ready-title">
        <header className="fv-panel-head">
          <h2 id="ready-title" className="fv-panel-title">
            Ready to value <small>this profile goes to the served model</small>
          </h2>
        </header>
        <div className="fv-panel-body">
          <dl className={styles.summary}>
            {profile.map((f) => (
              <div key={f.label}>
                <dt>{f.label}</dt>
                <dd>{f.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className={`fv-panel ${styles.span}`} aria-labelledby="scale-title">
        <header className="fv-panel-head">
          <h2 id="scale-title" className="fv-panel-title">
            The value scale <small>log scale, €20k to €250M</small>
          </h2>
        </header>
        <div className="fv-panel-body">
          <ValueRuler ariaLabel="Market value scale from €20k to €250M with tier boundaries at €2M, €10M and €30M" />
          <ol className={styles.tierTable}>
            {TIER_NAMES.map((t, i) => (
              <li key={t}>
                <span className={styles.tierSwatch} data-i={i} />
                <b>{t}</b>
                <span className="num">{TIER_RANGES[i]}</span>
              </li>
            ))}
          </ol>
          <p className={styles.note}>
            Boundaries at €{TIER_BOUNDARIES_EUR.map((b) => b / 1e6).join("M, €")}M: the 50th, 80th and 95th percentiles of market value in the
            training population. Fixed definitions, not model outputs.
          </p>
        </div>
      </section>

      <section className={`fv-panel ${styles.span}`} aria-labelledby="get-title">
        <header className="fv-panel-head">
          <h2 id="get-title" className="fv-panel-title">
            What comes back
          </h2>
        </header>
        <ul className={styles.gets}>
          <li>
            <b>Estimate</b> in euros from the selected model, with its typical miss on unseen players
          </li>
          <li>
            <b>Tier</b> from the value, and a separate classifier&apos;s probabilities
          </li>
          <li>
            <b>Model A vs B</b> the same profile with and without league and club
          </li>
          <li>
            <b>Why</b> SHAP contributions of each input to this estimate
          </li>
        </ul>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ loading */
function Loading() {
  return (
    <div className={styles.console} aria-busy="true">
      <div className={`fv-panel ${styles.headline}`}>
        <div className="fv-panel-body">
          <span className={`fv-skeleton ${styles.skLine}`} style={{ width: "40%" }} />
          <span className={`fv-skeleton ${styles.skValue}`} />
          <span className={`fv-skeleton ${styles.skLine}`} style={{ width: "55%" }} />
        </div>
      </div>
      <div className={`fv-panel ${styles.duelPanel}`}>
        <div className="fv-panel-body">
          <span className={`fv-skeleton ${styles.skBlock}`} />
        </div>
      </div>
      <div className={`fv-panel ${styles.span}`}>
        <div className="fv-panel-body">
          <span className={`fv-skeleton ${styles.skRuler}`} />
          <p className={styles.note}>Asking the served models for an estimate, its tier and its explanation…</p>
        </div>
      </div>
      <div className={`fv-panel ${styles.span}`}>
        <div className="fv-panel-body">
          {[80, 64, 52, 40, 30].map((w) => (
            <span key={w} className={`fv-skeleton ${styles.skLine}`} style={{ width: `${w}%`, marginBottom: "0.6rem" }} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ offline */
function Offline({ error, onRetry, options, onLoadResearch }: { error: ApiError; onRetry: () => void; options: ResearchOption[]; onLoadResearch: (id: string) => void }) {
  const validation = error.kind === "validation";
  return (
    <div className={styles.console}>
      <section className={`fv-panel ${styles.span} ${styles.errorPanel}`} role="alert" aria-labelledby="err-title">
        <header className="fv-panel-head">
          <h2 id="err-title" className="fv-panel-title">
            {validation ? "The model can't value this profile" : error.kind === "unavailable" || error.kind === "network" ? "The valuation service is offline" : "Valuation failed"}
          </h2>
          <span className="fv-source" data-source="offline">
            {validation ? "Input rejected" : "No live prediction"}
          </span>
        </header>
        <div className="fv-panel-body">
          <p className={styles.errorBody}>
            {validation ? "Some inputs are outside the range the model was trained on. The fields that need changing are marked." : error.message}
          </p>
          {!validation && (
            <Button type="button" variant="quiet" onClick={onRetry}>
              Try again
            </Button>
          )}
        </div>
      </section>
      {!validation && options.length > 0 && (
        <section className={`fv-panel ${styles.span}`} aria-labelledby="cached-title">
          <header className="fv-panel-head">
            <h2 id="cached-title" className="fv-panel-title">
              Published results you can open now <small>cached, not live</small>
            </h2>
            <span className="fv-source" data-source="cached">
              Cached research results
            </span>
          </header>
          <div className="fv-panel-body">
            <p className={styles.note}>
              The research run valued these eight real players with the served Model A and published the estimate and its SHAP breakdown. They
              can be shown without the live service, labelled as cached.
            </p>
            <ul className={styles.researchList}>
              {options.map((o) => (
                <li key={o.id}>
                  <button type="button" onClick={() => onLoadResearch(o.id)}>
                    <b>{o.name}</b>
                    <span>{o.detail}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ cached */
function Cached({ cached }: { cached: CachedResult }) {
  const mae = heldOutLogMae("A");
  return (
    <div className={styles.console}>
      <section className={`fv-panel ${styles.span} ${styles.headline}`} aria-labelledby="cached-head">
        <header className="fv-panel-head">
          <h2 id="cached-head" className="fv-panel-title">
            {cached.name} <small>Model A, served</small>
          </h2>
          <span className="fv-source" data-source="cached">
            Cached research result · not live
          </span>
        </header>
        <div className={`fv-panel-body ${styles.headBody}`}>
          <div>
            <p className={`${styles.value} num`}>{formatEur(cached.value)}</p>
            <p className={styles.sub}>
              <span className="fv-chip" data-tone="flood">
                {cached.tier}
              </span>
              <span className="num">{formatEurExact(cached.value)}</span>
            </p>
          </div>
          <p className={styles.note}>
            Published in <code>reports/explainability/</code> by the research run, for the same served model version. It was not computed now,
            Model B and the tier classifier need the live service, and the served model saw this player in training (in-sample).{" "}
            <Link href={`/players/${cached.slug}`}>Open the player dossier</Link>
          </p>
        </div>
      </section>
      <section className={`fv-panel ${styles.span}`}>
        <div className="fv-panel-body">
          <ValueRuler
            ariaLabel={`Cached estimate ${formatEur(cached.value)} on a log scale of market values`}
            marker={{ value: cached.value, label: formatEur(cached.value), variant: "primary" }}
            band={[cached.value / Math.exp(mae), cached.value * Math.exp(mae)]}
          />
        </div>
      </section>
      {cached.explanation && (
        <section className={`fv-panel ${styles.span}`} aria-labelledby="cached-why">
          <header className="fv-panel-head">
            <h2 id="cached-why" className="fv-panel-title">
              Why this number <small>SHAP, published with the result</small>
            </h2>
          </header>
          <div className="fv-panel-body">
            <ContributionChart explanation={cached.explanation} />
          </div>
        </section>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ live */
function Live({ result, loading, stale, error, onRetry }: { result: StudioResult; loading: boolean; stale: boolean; error: ApiError | null; onRetry: () => void }) {
  const reduce = useReducedMotion();
  const service = useServiceStatus();
  const { primary, explanation, explanationError, counterpart, player } = result;
  const model = primary.model;
  const other: ModelId = model === "A" ? "B" : "A";
  const mae = heldOutLogMae(model);
  const value = primary.predicted_value_eur;
  const band: [number, number] = [value / Math.exp(mae), value * Math.exp(mae)];
  const classifierAgrees = primary.classifier_tier === primary.predicted_tier;
  const a = model === "A" ? value : counterpart?.predicted_value_eur;
  const b = model === "B" ? value : counterpart?.predicted_value_eur;
  const source = service.state === "online" ? "live" : "unverified";

  return (
    <div className={styles.console} data-dim={loading || undefined} data-stale={(stale && !loading) || undefined}>
      {error && (
        <p className={styles.inlineError} role="alert">
          <b>{error.kind === "unavailable" || error.kind === "network" ? "The valuation service is offline" : "Valuation failed"}.</b> {error.message}{" "}
          <button type="button" onClick={onRetry}>
            Try again
          </button>
        </p>
      )}

      <section className={`fv-panel ${styles.headline}`} aria-labelledby="est-title">
        <header className="fv-panel-head">
          <h2 id="est-title" className="fv-panel-title">
            <span className={styles.modelTag}>{MODEL_LABELS[model].name}</span> Estimated market value
          </h2>
          <AnimatePresence mode="wait" initial={false}>
            {stale || loading ? (
              <motion.span key="chip" className={styles.staleChip} data-loading={loading || undefined} initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {loading ? "Updating…" : "Profile edited · value again"}
              </motion.span>
            ) : (
              <motion.span key="src" className="fv-source" data-source={source} initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {source === "live" ? "Live prediction" : "Live · unverified service"}
              </motion.span>
            )}
          </AnimatePresence>
        </header>
        <div className={`fv-panel-body ${styles.headBody}`}>
          <div>
            <p className={styles.value}>
              <AnimatedEur key={model} value={value} />
            </p>
            <p className={styles.sub}>
              <span className="fv-chip" data-tone="flood">
                {primary.predicted_tier}
              </span>
              <span className="num">{formatEurExact(value)}</span>
            </p>
          </div>
          <dl className={styles.versions}>
            <div>
              <dt>Regressor</dt>
              <dd className="num">{primary.model_version.regressor}</dd>
            </div>
            <div>
              <dt>Typical miss</dt>
              <dd className="num">
                ×{Math.exp(mae).toFixed(2)} <small>(log MAE {decimal(mae, 3)})</small>
              </dd>
            </div>
          </dl>
          {service.state === "unverified" && (
            <p className={styles.unverified} role="note">
              <strong>Unverified service.</strong> {service.reason} This answer may not come from the models the research describes.
            </p>
          )}
        </div>
      </section>

      {a !== undefined && b !== undefined && (
        <section className={`fv-panel ${styles.duelPanel}`} aria-label="Model A compared with Model B for this profile">
          <header className="fv-panel-head">
            <h2 className="fv-panel-title">A vs B</h2>
          </header>
          <div className={styles.duel}>
            <div data-active={model === "A" || undefined}>
              <span className={styles.duelName}>Model A</span>
              <span className={styles.duelHint}>with league and club</span>
              <span className={`${styles.duelValue} num`}>{formatEur(a)}</span>
            </div>
            <div data-active={model === "B" || undefined}>
              <span className={styles.duelName}>Model B</span>
              <span className={styles.duelHint}>performance only</span>
              <span className={`${styles.duelValue} num`}>{formatEur(b)}</span>
            </div>
            <p className={styles.duelDelta}>
              <span className="num">×{decimal(a / b, 2)}</span> {a >= b ? "league and club context raises this estimate" : "league and club context lowers this estimate"}
            </p>
          </div>
        </section>
      )}

      <section className={`fv-panel ${styles.span}`} aria-label="Estimate on the value scale">
        <div className="fv-panel-body">
          <ValueRuler
            ariaLabel={`Estimate ${formatEur(value)} on a log scale of market values, in the ${primary.predicted_tier} tier`}
            marker={{ value, label: formatEur(value), variant: "primary" }}
            ghost={counterpart ? { value: counterpart.predicted_value_eur, label: `Model ${other} ${formatEur(counterpart.predicted_value_eur)}`, variant: "ghost" } : null}
            band={band}
          />
          <p className={styles.note}>
            <span className={styles.bandKey} aria-hidden="true" /> Typical miss on unseen players; a guide to scale, not a confidence interval.
          </p>
        </div>
      </section>

      <section className={`fv-panel ${styles.tierPanel}`} aria-labelledby="tier-heading">
        <header className="fv-panel-head">
          <h2 id="tier-heading" className="fv-panel-title">
            Tier classifier <small>{classifierAgrees ? `agrees: ${primary.classifier_tier}` : `leans ${primary.classifier_tier}`}</small>
          </h2>
        </header>
        <div className="fv-panel-body">
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
          <p className={styles.note}>
            A separate model trained to predict the tier directly.
            {classifierAgrees ? "" : ` The value estimate falls in ${primary.predicted_tier}; profiles near a boundary often split like this.`}
          </p>
        </div>
      </section>

      <section className={`fv-panel ${styles.readPanel}`} aria-labelledby="read-heading">
        <header className="fv-panel-head">
          <h2 id="read-heading" className="fv-panel-title">
            Reading this estimate
          </h2>
        </header>
        <ul className={`fv-panel-body ${styles.caveats}`}>
          <li>It reproduces Transfermarkt&apos;s community valuations, which may carry their own biases. Not a fee, a wage or a judgement of a player.</li>
          <li>Applies to players like those in training: 14 European first divisions, 450+ minutes. Valued as playing in {leagueName(player.valuation_league_id)}.</li>
          <li>
            The model never sees nationality, yet the <Link href="/fairness">audit</Link> found it under-predicts non-UEFA players by about{" "}
            {Math.round(Math.expm1(research.headline.A.signed_gap_league_stratified.estimate) * 100)}% on average.
          </li>
        </ul>
      </section>

      <section className={`fv-panel ${styles.span}`} aria-labelledby="why-heading">
        <header className="fv-panel-head">
          <h2 id="why-heading" className="fv-panel-title">
            Why this number <small>SHAP on the served model</small>
          </h2>
        </header>
        <div className="fv-panel-body">
          <Tabs
            label="Explanation views"
            tabs={[
              {
                id: "local",
                label: "This estimate",
                content: explanation ? (
                  <>
                    <p className={styles.note}>
                      How each input moved this estimate away from the average training player. Effects multiply; they describe the model&apos;s
                      arithmetic, not what causes market value.
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
                    <p className={styles.note}>
                      Not about this profile: the average size of each input&apos;s effect over all{" "}
                      {research.models.n_training_rows.toLocaleString("en-GB")} training players (mean |SHAP|, log scale).
                    </p>
                    <BarList
                      items={shapGlobal(model)
                        .slice(0, 10)
                        .map((r) => ({ key: r.feature, label: featureLabel(r.feature), value: r.mean_abs }))}
                      digits={2}
                      highlight={explanation?.contributions[0]?.feature}
                    />
                  </>
                ),
              },
            ]}
          />
        </div>
      </section>
    </div>
  );
}
