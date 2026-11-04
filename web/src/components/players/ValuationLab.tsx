"use client";

import { useEffect, useState } from "react";
import { ContributionChart } from "@/components/charts/ContributionChart";
import { ValueRuler } from "@/components/charts/ValueRuler";
import { explain, predict } from "@/lib/api/client";
import type { ExplainResponse, PredictResponse } from "@/lib/api/types";
import { MODEL_LABELS, type ModelId } from "@/lib/football";
import { formatEur } from "@/lib/format";
import type { PlayerProfile } from "@/lib/players";
import styles from "./ValuationLab.module.css";

type Live = { status: "loading" | "online" | "offline"; predict: Partial<Record<ModelId, PredictResponse>>; explain: Partial<Record<ModelId, ExplainResponse>> };

interface Props {
  player: PlayerProfile;
  /** Held-out log MAE per model (registry), for the typical-miss band. */
  mae: Record<ModelId, number>;
  regressorVersion: Record<ModelId, string>;
}

const ratio = (a: number, b: number) => `×${(a / b).toFixed(2)}`;

/** The committed research explanation, in the shape the live endpoint returns. */
function offlineExplanation(p: PlayerProfile, version: string): ExplainResponse | null {
  const e = p.explanation;
  if (!e) return null;
  return {
    model: e.model,
    model_version: version,
    base_log_value: e.base_log_value,
    base_value_eur: Math.exp(e.base_log_value),
    predicted_log_value: e.predicted_log_value,
    predicted_value_eur: Math.exp(e.predicted_log_value),
    contributions: e.contributions,
    method: "SHAP TreeExplainer, from the published research run",
    disclaimer: "",
  };
}

export function ValuationLab({ player: p, mae, regressorVersion }: Props) {
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
  const servedSource = (m: ModelId) => (live.predict[m] ? "live" : p.estimates.served[m] ? "research run" : null);
  const best = (m: ModelId) => p.estimates.heldout[m] ?? served(m);
  const selected = best(model);
  const explanation = live.explain[model] ?? (model === "A" ? offlineExplanation(p, regressorVersion.A) : null);
  const anyHeldout = p.estimates.heldout.A !== null || p.estimates.heldout.B !== null;

  return (
    <div className={styles.lab}>
      <div className={styles.columns} role="radiogroup" aria-label="Model shown on the scale and in the explanation">
        <div className={styles.market}>
          <p className={styles.colLabel}>Market value</p>
          <p className={styles.colHint}>Observed · Transfermarkt</p>
          <p className={`${styles.big} num`}>{formatEur(p.market_value_eur)}</p>
          <p className={styles.colFoot}>{p.market_tier} tier · the target, not an estimate</p>
        </div>
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
                  <span className={styles.estimateMissing}>{live.status === "loading" ? "asking the model…" : "service offline"}</span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <p className={styles.status} data-state={live.status} aria-live="polite">
        <i aria-hidden="true" />
        {live.status === "loading"
          ? "Asking the served models…"
          : live.status === "online"
            ? "Served estimates are live from the prediction API."
            : "The prediction API is offline: served Model A figures come from the published research run, Model B needs the live service."}
      </p>

      {selected !== null && selected !== undefined && (
        <div className={styles.ruler}>
          <ValueRuler
            ariaLabel={`${MODEL_LABELS[model].name} estimate ${formatEur(selected)} against the observed market value ${formatEur(p.market_value_eur)}`}
            marker={{ value: selected, label: `${MODEL_LABELS[model].name} ${formatEur(selected)}`, variant: "primary" }}
            ghost={{ value: p.market_value_eur, label: `Market ${formatEur(p.market_value_eur)}`, variant: "ghost" }}
            band={[selected / Math.exp(mae[model]), selected * Math.exp(mae[model])]}
          />
          <p className={styles.rulerNote}>
            Shaded: {MODEL_LABELS[model].name}&apos;s typical miss on unseen players (a factor of {Math.exp(mae[model]).toFixed(2)} either way). Hollow
            marker: the observed market value.
          </p>
        </div>
      )}

      <div className={styles.integrity}>
        <p>
          <strong>Held-out</strong> estimates come from cross-validation, where this player was not in the training data. They are the honest
          comparison with the market value.{" "}
          <strong>Served</strong> estimates come from the deployed models, which were refitted on every player, this one included, so they sit
          closer to the market value than a genuine prediction would.
          {!anyHeldout && " This build has no held-out estimates: they are added by the full player export."}
        </p>
      </div>

      <section className={styles.why} aria-labelledby="why-title">
        <div className={styles.whyHead}>
          <h3 id="why-title" className={styles.h3}>
            {served(model) ? `Why the served ${MODEL_LABELS[model].name} says ${formatEur(served(model)!)}` : `What moves the served ${MODEL_LABELS[model].name}`}
          </h3>
          <p>
            SHAP contributions for this player&apos;s own inputs, from{" "}
            {live.explain[model] ? "the live explanation endpoint" : explanation ? "the published research run" : "the live endpoint"}. Effects multiply;
            they describe the model&apos;s arithmetic, not what causes market value.
          </p>
        </div>
        {explanation ? (
          <ContributionChart explanation={explanation} top={8} />
        ) : (
          <p className={styles.unavailable}>
            {live.status === "loading" ? "Loading the explanation…" : `No ${MODEL_LABELS[model].name} explanation is available while the prediction API is offline.`}
          </p>
        )}
      </section>
    </div>
  );
}
