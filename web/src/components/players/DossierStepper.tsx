"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import styles from "./DossierStepper.module.css";

export interface StepLink {
  href: string;
  name: string;
  role: string;
}

const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName));

/**
 * Previous / next player in the list the dossier was opened from. J or ] moves on, K or [ moves
 * back; ignored while typing or while a dialog (search) is open.
 */
export function DossierStepper({ label, index, total, prev, next }: { label: string; index: number; total: number; prev: StepLink | null; next: StepLink | null }) {
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || typing(e.target) || document.querySelector("dialog[open]")) return;
      const k = e.key.toLowerCase();
      if ((k === "j" || k === "]") && next) router.push(next.href, { scroll: true });
      else if ((k === "k" || k === "[") && prev) router.push(prev.href, { scroll: true });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, prev, next]);

  if (total <= 1) return null;

  return (
    <nav className={styles.stepper} aria-label="Step through players">
      {prev ? (
        <Link href={prev.href} className={styles.step} data-dir="prev" aria-keyshortcuts="K [" title="Previous player (K or [)">
          <span aria-hidden="true">←</span>
          <span className={styles.stepText}>
            <small>Previous</small>
            <b>{prev.name}</b>
          </span>
        </Link>
      ) : (
        <span className={styles.step} data-dir="prev" data-empty />
      )}
      <p className={styles.where}>
        <b className="num">
          {index.toLocaleString("en-GB")} <span>of</span> {total.toLocaleString("en-GB")}
        </b>
        <span>{label}</span>
        <kbd className={styles.keys} aria-hidden="true">
          J / K
        </kbd>
      </p>
      {next ? (
        <Link href={next.href} className={styles.step} data-dir="next" aria-keyshortcuts="J ]" title="Next player (J or ])">
          <span className={styles.stepText}>
            <small>Next</small>
            <b>{next.name}</b>
          </span>
          <span aria-hidden="true">→</span>
        </Link>
      ) : (
        <span className={styles.step} data-dir="next" data-empty />
      )}
    </nav>
  );
}
