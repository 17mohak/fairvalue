"use client";

import { useEffect, useState } from "react";
import { ContributionChart } from "@/components/charts/ContributionChart";
import { ValueRuler } from "@/components/charts/ValueRuler";
import { explain, predict } from "@/lib/api/client";
import { useServiceStatus } from "@/lib/api/service";
import type { ExplainResponse, PredictResponse } from "@/lib/api/types";
import { MODEL_LABELS, type ModelId } from "@/lib/football";
import { formatEur } from "@/lib/format";
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

  return (
    <>
      <section className={`fv-panel ${areas.compare ?? ""}`} aria-labelledby="mm-title">
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
                  ? `Live: served estimates from the prediction API (${live.predict.A?.model_version.regressor ?? live.predict.B?.model_version.regressor}).`
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

      <section className={`fv-panel ${areas.explain ?? ""}`} aria-labelledby="why-title">
        <header className="fv-panel-head">
          <h2 id="why-title" className="fv-panel-title">
            {served(model) ? `Why ${MODEL_LABELS[model].name} says ${formatEur(served(model)!)}` : `What moves ${MODEL_LABELS[model].name}`}
            <small>SHAP, this player&apos;s own inputs</small>
          </h2>
          <div className={styles.toggle} role="radiogroup" aria-label="Explain model">
            {(["A", "B"] as const).map((m) => (
              <button key={m} type="button" role="radio" aria-checked={model === m} onClick={() => setModel(m)}>
                {MODEL_LABELS[m].name}
              </button>
            ))}
          </div>
        </header>
        <div className="fv-panel-body">
          <p className={styles.whyNote}>
            From {live.explain[model] ? (verified ? "the live explanation endpoint" : "the live but unverified explanation endpoint") : explanation ? "the published research results (cached)" : "the live endpoint"}.
            Effects multiply from the average training player; they describe the model&apos;s arithmetic, not what causes market value.
          </p>
          {explanation ? (
            <ContributionChart explanation={explanation} top={8} />
          ) : (
            <p className={styles.unavailable}>
              {live.status === "loading" ? "Loading the explanation…" : `No ${MODEL_LABELS[model].name} explanation is available while the prediction API is offline.`}
            </p>
          )}
        </div>
      </section>
    </>
  );
}
