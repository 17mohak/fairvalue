"use client";

import { SERVICE_LABEL, useServiceStatus } from "@/lib/api/service";
import styles from "./StatusStrip.module.css";

/** The Terminal's bottom line: what is serving, what it was trained on, how to move. */
export function StatusStrip({ regressor, dataset, rows }: { regressor: string; dataset: string; rows: number }) {
  const { state, reason } = useServiceStatus();
  return (
    <footer className={styles.strip} aria-label="Terminal status">
      <span className={styles.service} data-state={state} title={reason}>
        <i aria-hidden="true" />
        {SERVICE_LABEL[state]}
      </span>
      <span className={styles.item}>
        <b>Registry</b> <span className="num">{regressor}</span>
      </span>
      <span className={styles.item}>
        <b>Trained on</b> <span className="num">{rows.toLocaleString("en-GB")}</span> players · 14 leagues · 2025–26
      </span>
      <span className={styles.item}>
        <b>Data</b> <span className="num">{dataset}</span>
      </span>
      <span className={styles.keys}>
        <kbd>⌘K</kbd> search · <kbd>G</kbd> then a letter to jump
      </span>
    </footer>
  );
}
