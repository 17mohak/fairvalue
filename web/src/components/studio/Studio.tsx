"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { SelectField } from "@/components/ui/Field";
import { Segmented } from "@/components/ui/Segmented";
import { ApiError, explain, health, predict } from "@/lib/api/client";
import type { PlayerField } from "@/lib/api/types";
import { MODEL_LABELS, SUB_POSITIONS, type ModelId, type Position } from "@/lib/football";
import {
  DEFAULT_PLAYER,
  FIELD_SPECS,
  PRESETS,
  serverErrorsToForm,
  toDraft,
  validateProfile,
  type FieldErrors,
  type ProfileDraft,
} from "@/lib/profile";
import { ProfileForm } from "./ProfileForm";
import { ResultPanel, type StudioResult } from "./ResultPanel";
import styles from "./Studio.module.css";

type Status = "idle" | "loading" | "done" | "error";
type Service = "checking" | "online" | "offline";

function asApiError(e: unknown): ApiError {
  return e instanceof ApiError ? e : new ApiError("server", "Something went wrong while valuing this profile.", 0);
}

export function Studio() {
  const reduce = useReducedMotion();
  const [draft, setDraft] = useState<ProfileDraft>(() => toDraft(DEFAULT_PLAYER));
  const [presetId, setPresetId] = useState(PRESETS[0]!.id);
  const [model, setModel] = useState<ModelId>("A");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<StudioResult | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [submittedKey, setSubmittedKey] = useState<string | null>(null);
  const [service, setService] = useState<Service>("checking");
  const fieldRefs = useRef<Partial<Record<PlayerField, HTMLElement | null>>>({});
  const resultRef = useRef<HTMLDivElement>(null);
  const runId = useRef(0);

  useEffect(() => {
    let live = true;
    health()
      .then((h) => live && setService(h.status === "ok" ? "online" : "offline"))
      .catch(() => live && setService("offline"));
    return () => {
      live = false;
    };
  }, []);

  const keyOf = (d: ProfileDraft, m: ModelId) => JSON.stringify([d, m]);
  const stale = result !== null && status !== "loading" && submittedKey !== keyOf(draft, model);

  function update(field: PlayerField, value: string) {
    setDraft((d) => {
      const next = { ...d, [field]: value };
      if (field === "position") {
        const subs = SUB_POSITIONS[value as Position] ?? [];
        if (!subs.includes(d.sub_position)) next.sub_position = subs[0] ?? "";
      }
      return next;
    });
    setPresetId("");
    if (errors[field] || (field === "minutes" && (errors.minutes_last_365 || errors.appearances))) {
      setErrors((e) => {
        const rest = { ...e };
        delete rest[field];
        if (field === "minutes") {
          delete rest.minutes_last_365;
          delete rest.appearances;
        }
        return rest;
      });
    }
  }

  function focusFirstError(fieldErrors: FieldErrors) {
    const first = FIELD_SPECS.find((s) => fieldErrors[s.name]);
    if (!first) return;
    const el = fieldRefs.current[first.name];
    const target = el instanceof HTMLInputElement || el instanceof HTMLSelectElement ? el : el?.querySelector("input, select");
    (target as HTMLElement | null | undefined)?.focus();
  }

  async function run(useModel: ModelId = model, useDraft: ProfileDraft = draft) {
    const checked = validateProfile(useDraft);
    if (!checked.ok) {
      setErrors(checked.fieldErrors);
      setFormErrors(checked.formErrors);
      focusFirstError(checked.fieldErrors);
      return;
    }
    setErrors({});
    setFormErrors([]);
    setError(null);
    setStatus("loading");
    const id = ++runId.current;
    const other: ModelId = useModel === "A" ? "B" : "A";
    const req = { player: checked.player, model: useModel };
    const [primary, why, counterpart] = await Promise.allSettled([
      predict(req),
      explain(req),
      predict({ player: checked.player, model: other }),
    ]);
    if (id !== runId.current) return; // a newer run replaced this one

    if (primary.status === "rejected") {
      const err = asApiError(primary.reason);
      if (err.kind === "validation") {
        const mapped = serverErrorsToForm(err.detail);
        setErrors(mapped.fieldErrors);
        setFormErrors(mapped.formErrors);
        focusFirstError(mapped.fieldErrors);
      } else {
        setService("offline");
      }
      setError(err);
      setStatus("error");
      return;
    }
    setService("online");
    setResult({
      primary: primary.value,
      explanation: why.status === "fulfilled" ? why.value : null,
      explanationError: why.status === "rejected" ? asApiError(why.reason).message : null,
      counterpart: counterpart.status === "fulfilled" ? counterpart.value : null,
      player: checked.player,
    });
    setSubmittedKey(keyOf(useDraft, useModel));
    setStatus("done");
    if (window.matchMedia("(max-width: 1023px)").matches) {
      resultRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void run();
  }

  function chooseModel(m: ModelId) {
    setModel(m);
    // Switching models re-values the same profile straight away once there is a result.
    if (result) void run(m);
  }

  function choosePreset(id: string) {
    const preset = PRESETS.find((p) => p.id === id);
    if (!preset) return;
    const next = toDraft(preset.player);
    setPresetId(id);
    setDraft(next);
    setErrors({});
    setFormErrors([]);
    if (result) void run(model, next);
  }

  return (
    <form className={styles.layout} onSubmit={onSubmit} noValidate aria-label="Player profile">
      <div className={styles.controls}>
        <div className={styles.topline}>
          <SelectField label="Start from" name="preset" value={presetId} onChange={choosePreset} hint="Illustrative, not real players">
            {presetId === "" && <option value="">Your edited profile</option>}
            {PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </SelectField>
          <p className={styles.service} data-state={service}>
            <span className={styles.dot} aria-hidden="true" />
            {service === "checking" ? "Checking the model service" : service === "online" ? "Model service online" : "Model service offline"}
          </p>
        </div>

        <Segmented
          legend="Model"
          name="model"
          size="l"
          value={model}
          onChange={chooseModel}
          options={(["A", "B"] as ModelId[]).map((m) => ({ value: m, label: `${MODEL_LABELS[m].name}: ${MODEL_LABELS[m].short}`, hint: MODEL_LABELS[m].description }))}
        />

        <p className={styles.never}>
          There is no nationality field. The model never sees nationality, citizenship, confederation or birthplace, and the API rejects any
          request that includes them.
        </p>

        <ProfileForm draft={draft} errors={errors} model={model} onChange={update} fieldRefs={fieldRefs} />

        {formErrors.length > 0 && (
          <div className={styles.formErrors} role="alert">
            {formErrors.map((m) => (
              <p key={m}>{m}</p>
            ))}
          </div>
        )}

        <div className={styles.submitBar}>
          <Button type="submit" disabled={status === "loading"}>
            {status === "loading" ? "Valuing…" : result ? "Value again" : "Value this player"}
          </Button>
          {Object.keys(errors).length > 0 && (
            <p className={styles.errorCount} role="status">
              {Object.keys(errors).length === 1 ? "1 field needs attention." : `${Object.keys(errors).length} fields need attention.`}
            </p>
          )}
        </div>
      </div>

      <div className={styles.output} ref={resultRef} aria-label="Valuation result" role="region">
        <ResultPanel status={status} result={result} error={error} stale={stale} onRetry={() => void run()} />
      </div>
    </form>
  );
}
