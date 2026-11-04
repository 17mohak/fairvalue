"use client";

import { forwardRef, useId, type ReactNode } from "react";
import styles from "./Field.module.css";

interface FieldShellProps {
  label: string;
  hint?: string;
  error?: string;
  children: (ids: { inputId: string; describedBy: string | undefined }) => ReactNode;
}

/** Label, hint and error wiring shared by every input. */
export function FieldShell({ label, hint, error, children }: FieldShellProps) {
  const id = useId();
  const inputId = `${id}-input`;
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-err` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className={styles.field} data-invalid={error ? true : undefined}>
      <div className={styles.head}>
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
        {hint && (
          <span id={`${id}-hint`} className={styles.hint}>
            {hint}
          </span>
        )}
      </div>
      {children({ inputId, describedBy })}
      {error && (
        <p id={`${id}-err`} className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

interface NumberFieldProps {
  label: string;
  hint?: string;
  error?: string;
  value: string;
  unit?: string;
  min: number;
  max: number;
  step: number;
  onChange: (value: string) => void;
  name: string;
}

/** Typed number entry with a coupled slider for quick, tactile adjustment. */
export const NumberField = forwardRef<HTMLInputElement, NumberFieldProps>(function NumberField(
  { label, hint, error, value, unit, min, max, step, onChange, name },
  ref,
) {
  const numeric = Number(value);
  const sliderValue = value.trim() !== "" && Number.isFinite(numeric) ? Math.min(max, Math.max(min, numeric)) : min;
  const fill = ((sliderValue - min) / (max - min || 1)) * 100;
  return (
    <FieldShell label={label} hint={hint} error={error}>
      {({ inputId, describedBy }) => (
        <div className={styles.numberRow}>
          <div className={styles.inputWrap}>
            <input
              ref={ref}
              id={inputId}
              name={name}
              className={`${styles.input} num`}
              inputMode="decimal"
              autoComplete="off"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              aria-invalid={error ? true : undefined}
              aria-describedby={describedBy}
            />
            {unit && <span className={styles.unit}>{unit}</span>}
          </div>
          <input
            type="range"
            className={styles.slider}
            min={min}
            max={max}
            step={step}
            value={sliderValue}
            onChange={(e) => onChange(e.target.value)}
            aria-hidden="true"
            tabIndex={-1}
            style={{ ["--fill" as string]: `${fill}%` }}
          />
        </div>
      )}
    </FieldShell>
  );
});

interface SelectFieldProps {
  label: string;
  hint?: string;
  error?: string;
  value: string;
  name: string;
  onChange: (value: string) => void;
  children: ReactNode;
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  { label, hint, error, value, name, onChange, children },
  ref,
) {
  return (
    <FieldShell label={label} hint={hint} error={error}>
      {({ inputId, describedBy }) => (
        <div className={styles.selectWrap}>
          <select
            ref={ref}
            id={inputId}
            name={name}
            className={styles.select}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
          >
            {children}
          </select>
        </div>
      )}
    </FieldShell>
  );
});
