"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import styles from "./Tabs.module.css";

export interface TabDef {
  id: string;
  label: string;
  content: ReactNode;
}

/** WAI-ARIA tabs: arrow keys move between tabs, panels are labelled by their tab. */
export function Tabs({ tabs, label }: { tabs: TabDef[]; label: string }) {
  const base = useId();
  const [active, setActive] = useState(tabs[0]?.id);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: React.KeyboardEvent, i: number) => {
    const dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const next = (i + dir + tabs.length) % tabs.length;
    setActive(tabs[next]!.id);
    refs.current[next]?.focus();
  };
  return (
    <div>
      <div role="tablist" aria-label={label} className={styles.list}>
        {tabs.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            role="tab"
            type="button"
            id={`${base}-${t.id}-tab`}
            aria-controls={`${base}-${t.id}-panel`}
            aria-selected={active === t.id}
            tabIndex={active === t.id ? 0 : -1}
            className={styles.tab}
            onClick={() => setActive(t.id)}
            onKeyDown={(e) => onKey(e, i)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t) => (
        <div
          key={t.id}
          role="tabpanel"
          id={`${base}-${t.id}-panel`}
          aria-labelledby={`${base}-${t.id}-tab`}
          hidden={active !== t.id}
          className={styles.panel}
          tabIndex={0}
        >
          {active === t.id && t.content}
        </div>
      ))}
    </div>
  );
}
