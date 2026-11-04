"use client";

import { useId } from "react";
import styles from "./Segmented.module.css";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

interface Props<T extends string> {
  legend: string;
  name: string;
  value: T;
  options: SegmentOption<T>[];
  onChange: (value: T) => void;
  error?: string;
  hideLegend?: boolean;
  size?: "m" | "l";
}

/** A radio group drawn as a segmented control. Native radios keep arrow-key behaviour. */
export function Segmented<T extends string>({ legend, name, value, options, onChange, error, hideLegend, size = "m" }: Props<T>) {
  const id = useId();
  return (
    <fieldset className={styles.fieldset} aria-describedby={error ? `${id}-err` : undefined}>
      <legend className={hideLegend ? "visually-hidden" : styles.legend}>{legend}</legend>
      <div className={`${styles.track} ${size === "l" ? styles.large : ""}`}>
        {options.map((o) => (
          <label key={o.value} className={styles.option} data-checked={o.value === value || undefined}>
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={o.value === value}
              onChange={() => onChange(o.value)}
              className={styles.input}
            />
            <span className={styles.label}>{o.label}</span>
            {o.hint && <span className={styles.hint}>{o.hint}</span>}
          </label>
        ))}
      </div>
      {error && (
        <p id={`${id}-err`} className={styles.error}>
          {error}
        </p>
      )}
    </fieldset>
  );
}
