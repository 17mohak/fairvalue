"use client";

import { SERVICE_LABEL, useServiceStatus } from "@/lib/api/service";
import styles from "./ServiceLine.module.css";

/** One line of truth about the model service, from the shared verified status. */
export function ServiceLine() {
  const { state, reason } = useServiceStatus();
  return (
    <p className={styles.line} data-state={state}>
      <i aria-hidden="true" />
      <b>{SERVICE_LABEL[state]}</b>
      <span>{state === "online" ? "Live estimates are available." : state === "checking" ? "Checking the registered models…" : reason || "Figures here are published research results."}</span>
    </p>
  );
}
