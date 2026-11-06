"use client";

import { useEffect, useState } from "react";
import { ValuationJourney } from "@/components/journey/ValuationJourney";
import { ValueRuler } from "@/components/charts/ValueRuler";
import { explain, predict } from "@/lib/api/client";
import { useServiceStatus } from "@/lib/api/service";
import type { ExplainResponse, PredictResponse } from "@/lib/api/types";
import { MODEL_LABELS, type ModelId } from "@/lib/football";
import { formatEur } from "@/lib/format";
import { factor, movers, toEur } from "@/lib/journey";
import { shortName } from "@/lib/theatre";
import { publishedExplanation, type PlayerProfile } from "@/lib/players";
import styles from "./ValuationLab.module.css";

type Live = { status: "loading" | "online" | "offline"; predict: Partial<Record<ModelId, PredictResponse>>; explain: Partial<Record<ModelId, ExplainResponse>> };

interface Props {
  /** Grid placement for the two panels this component renders. */
  areas?: { compare?: string; explain?: string };
  player: PlayerProfile;
  /** Held-out log MAE per model (registry), for the typical-miss band. */
  mae: Record<ModelId, number>;
  regressorVersion: Record<ModelId, string>;
}

const ratio = (a: number, b: number) => `×${(a / b).toFixed(2)}`;

export function ValuationLab({ player: p, mae, regressorVersion, areas = {} }: Props) {
  const service = useServiceStatus();
  const [model, setModel] = useState<ModelId>("A");
  const [live, setLive] = useState<Live>({ status: "loading", predict: {}, explain: {} });

  // One call per model to the same served endpoints the studio uses; no second prediction system.
  useEffect(() => {
    let alive = true;
    const req = (m: ModelId) => ({ player: p.features, model: m });
    Promise.allSettled([predict(req("A")), predict(req("B")), explain(req("A"))]).then(([a, b, ea]) => {
      if (!alive) return;
      const ok = a.status === "fulfilled" || b.status === "fulfilled";
      setLive({
        status: ok ? "online" : "offline",
        predict: { ...(a.status === "fulfilled" && { A: a.value }), ...(b.status === "fulfilled" && { B: b.value }) },
        explain: ea.status === "fulfilled" ? { A: ea.value } : {},
      });
    });
    return () => {
      alive = false;
    };
  }, [p.features]);

  // Model B's explanation is fetched only when someone asks for it.
  useEffect(() => {
    if (model !== "B" || live.status !== "online" || live.explain.B) return;
    let alive = true;
    explain({ player: p.features, model: "B" })
      .then((e) => alive && setLive((l) => ({ ...l, explain: { ...l.explain, B: e } })))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [model, live.status, live.explain.B, p.features]);

  const served = (m: ModelId) => live.predict[m]?.predicted_value_eur ?? p.estimates.served[m];
  // Where a served figure came from: a live answer from the verified service, a live answer from a
  // service that does not match the research registry, or the published research result (cached).
  const verified = service.state === "online";
  const liveLabel = verified ? "live" : "live, unverified";
  const servedSource = (m: ModelId) => (live.predict[m] ? liveLabel : p.estimates.served[m] ? "cached" : null);
  const best = (m: ModelId) => p.estimates.heldout[m] ?? served(m);
  const selected = best(model);
  const explanation = live.explain[model] ?? (model === "A" ? publishedExplanation(p, regressorVersion.A) : null);
  const anyHeldout = p.estimates.heldout.A !== null || p.estimates.heldout.B !== null;

  const source: "live" | "unverified" | "cached" | "offline" | "checking" =
    live.status === "loading" ? "checking" : live.status === "online" ? (verified ? "live" : "unverified") : p.estimates.served.A !== null ? "cached" : "offline";
  const SOURCE_TEXT = { checking: "Checking API", live: "Live API", unverified: "Unverified API", cached: "Cached research result", offline: "API offline" };

  // The journey explains the served model only: SHAP runs on the regressor the API serves.
  // Say so up front, and why it differs from the held-out estimate in the hero.
  const who = shortName(p);
  const explained = explanation ? toEur(explanation.predicted_log_value) : null;
  const moved = explanation ? movers(explanation, 3) : null;
  const moverMax = moved ? Math.max(1e-9, ...[...moved.raises, ...moved.lowers].map((m) => Math.abs(m.contribution))) : 1;
  const heldoutSel = p.estimates.heldout[model];
  const which =
    explained === null
      ? live.status === "loading"
        ? `Asking the prediction API to explain ${MODEL_LABELS[model].name} for ${who}…`
        : `Explanations come from the served model through the live service.`
      : `This explains the served ${MODEL_LABELS[model].name} estimate, ${formatEur(explained)} (${live.explain[model] ? (verified ? "live" : "live, unverified") : "cached research result"}). ` +
        `The served model was refitted on every player, ${who} included${
          heldoutSel !== null ? `; the held-out ${formatEur(heldoutSel)} in the header comes from a model that never saw this player` : ""
        }. Explanations exist only for the served model.`;

  return (
    <>
      <section id="explain" className={`fv-panel ${styles.journeyPanel} ${areas.explain ?? ""}`} aria-labelledby="why-title">
        <header className={styles.jHead}>
          <div className={styles.jTitles}>
            <p className={styles.jKicker}>The Valuation Journey</p>
            <h2 id="why-title" className={styles.jTitle}>
              {explained !== null ? `Why ${MODEL_LABELS[model].name} says ${formatEur(explained)}` : `What moves ${MODEL_LABELS[model].name}`}
            </h2>
            <p className={styles.jWhich}>{which}</p>
          </div>
          <div className={styles.toggle} role="radiogroup" aria-label="Explain model">
            {(["A", "B"] as const).map((m) => {
              // Model B has no published explanation; it can only be explained by the live service.
              const possible = m === "A" ? true : !!live.explain.B || live.status === "online";
              return (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={model === m}
                  aria-disabled={!possible || undefined}
                  title={possible ? undefined : "Model B explanations come from the live service only, which is not available"}
                  onClick={() => possible && setModel(m)}
                >
                  {MODEL_LABELS[m].name}
                </button>
              );
            })}
          </div>
        </header>
        <div className={`fv-panel-body ${styles.jBody}`}>
          {explanation && moved ? (
            <>
              <div className={styles.movers} aria-label="Inputs that moved this estimate most">
                {(["raises", "lowers"] as const).map((dir) => (
                  <div key={dir} className={styles.moverCol} data-dir={dir}>
                    <p className={styles.moverHead}>{dir === "raises" ? "Raised it most" : "Lowered it most"}</p>
                    {moved[dir].length ? (
                      <ol>
                        {moved[dir].map((m) => (
                          <li key={m.key}>
                            <span className={styles.moverLabel}>
                              <b>{m.label}</b>
                              <small>{m.input}</small>
                            </span>
                            <span className={styles.moverBar} aria-hidden="true">
                              <i style={{ width: `${Math.min(100, (Math.abs(m.contribution) / moverMax) * 100)}%` }} />
                            </span>
                            <span className={`${styles.moverFactor} num`}>{factor(m.contribution)}</span>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p className={styles.moverNone}>No input {dir === "raises" ? "raised" : "lowered"} this estimate.</p>
                    )}
                  </div>
                ))}
              </div>
              <ValuationJourney
                explanation={explanation}
                observed={p.market_value_eur}
                subject={who}
                provenance={
                  live.explain[model]
                    ? `${verified ? "Live explanation endpoint" : "Live but unverified explanation endpoint"}, served Model ${model} ${
                        verified ? `(${regressorVersion[model]})` : ""
                      }; the served model was fitted on all players, including this one.`
                    : `Published SHAP run for the served Model A (${regressorVersion.A}); this player was in its training data, so the estimate is in-sample.`
                }
              />
            </>
          ) : live.status === "loading" ? (
            <div className={styles.jSkeleton} role="status" aria-label="Loading the explanation">
              <span />
              <span />
              <span />
              <span />
            </div>
          ) : (
            <p className={styles.unavailable}>No {MODEL_LABELS[model].name} explanation is available while the prediction API is offline.</p>
          )}
          <p className={styles.whyNote}>
            SHAP describes the model&apos;s arithmetic for this player&apos;s inputs, not what causes market value. Model B can be explained only by the live
            service; Model A also has a published explanation for the research players.
          </p>
        </div>
      </section>

      <section id="estimates" className={`fv-panel ${areas.compare ?? ""}`} aria-labelledby="mm-title">
        <header className="fv-panel-head">
          <h2 id="mm-title" className="fv-panel-title">
            Model A vs Model B <small>against the observed {formatEur(p.market_value_eur)}</small>
          </h2>
          <span className="fv-source" data-source={source}>
            {SOURCE_TEXT[source]}
          </span>
        </header>
        <div className={`fv-panel-body ${styles.lab}`}>
          <div className={styles.columns} role="radiogroup" aria-label="Model shown on the scale and in the explanation">
            {(["A", "B"] as const).map((m) => {
              const h = p.estimates.heldout[m];
              const s = served(m);
              return (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={model === m}
                  className={styles.modelCol}
                  data-active={model === m || undefined}
                  onClick={() => setModel(m)}
                >
                  <span className={styles.colLabel}>{MODEL_LABELS[m].name}</span>
                  <span className={styles.colHint}>{m === "A" ? "with league and club" : "performance only"}</span>
                  <span className={styles.estimateRow} data-primary={h !== null || undefined}>
                    <span className={styles.estimateKind}>Held-out</span>
                    {h !== null ? (
                      <>
                        <span className={`${styles.estimateValue} num`}>{formatEur(h)}</span>
                        <span className={`${styles.estimateRatio} num`}>{ratio(h, p.market_value_eur)}</span>
                      </>
                    ) : (
                      <span className={styles.estimateMissing}>full export only</span>
                    )}
                  </span>
                  <span className={styles.estimateRow} data-primary={h === null || undefined}>
                    <span className={styles.estimateKind}>Served{servedSource(m) ? ` · ${servedSource(m)}` : ""}</span>
                    {s !== null && s !== undefined ? (
                      <>
                        <span className={`${styles.estimateValue} num`}>{formatEur(s)}</span>
                        <span className={`${styles.estimateRatio} num`}>{ratio(s, p.market_value_eur)}</span>
                      </>
                    ) : (
                      <span className={styles.estimateMissing}>{live.status === "loading" ? "asking the model…" : "needs the live service"}</span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          {selected !== null && selected !== undefined && (
            <div className={styles.ruler}>
              <ValueRuler
                ariaLabel={`${MODEL_LABELS[model].name} estimate ${formatEur(selected)} against the observed market value ${formatEur(p.market_value_eur)}`}
                marker={{ value: selected, label: `${MODEL_LABELS[model].name} ${formatEur(selected)}`, variant: "primary" }}
                ghost={{ value: p.market_value_eur, label: `Market ${formatEur(p.market_value_eur)}`, variant: "ghost" }}
                band={[selected / Math.exp(mae[model]), selected * Math.exp(mae[model])]}
              />
            </div>
          )}

          <p className={styles.status} data-state={live.status === "online" && !verified ? "unverified" : live.status} aria-live="polite">
            <i aria-hidden="true" />
            {live.status === "loading"
              ? "Asking the prediction API…"
              : live.status === "online"
                ? verified
                  ? `Live: served estimates from the prediction API (${[live.predict.A, live.predict.B]
                      .filter((r) => r)
                      .map((r) => r!.model_version.regressor)
                      .join(", ")}).`
                  : `Live, but unverified: ${service.reason} Treat these served figures with caution.`
                : p.estimates.served.A !== null
                  ? "Prediction API offline. The served Model A figure and its explanation are the published research results (cached), not a live answer. Model B needs the live service."
                  : "Prediction API offline. No served estimates are available; held-out estimates come from the export."}
          </p>
          <p className={styles.integrity}>
            <strong>Held-out</strong> estimates come from cross-validation, with this player outside the training data: the honest comparison.{" "}
            <strong>Served</strong> models were refitted on every player, this one included, so they sit closer to the market.
            Shaded band: {MODEL_LABELS[model].name}&apos;s typical miss (×{Math.exp(mae[model]).toFixed(2)} either way).
          </p>
        </div>
      </section>
    </>
  );
}
