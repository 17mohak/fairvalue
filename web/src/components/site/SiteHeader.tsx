"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, ViewTransition } from "react";
import { checkService, SERVICE_LABEL, useServiceStatus } from "@/lib/api/service";
import { contextForPath, EXPERIENCES, transitionTypes } from "@/lib/experiences";
import { recordNavigation } from "@/lib/navHistory";
import { CommandPalette } from "./CommandPalette";
import { Mark } from "./Mark";
import { SearchTrigger, ShortcutKbd } from "./SearchTrigger";
import styles from "./SiteHeader.module.css";

/**
 * The global bar: brand, the experience switcher (Overview / Terminal / Stories), search and the
 * verified state of the model service. It is the same bar everywhere; each environment restyles
 * it through data-exp so the switch between them is felt, not just read.
 */
export function SiteHeader() {
  const path = usePathname() ?? "/";
  const context = contextForPath(path);
  const { state: service, reason } = useServiceStatus();

  useEffect(() => {
    void checkService();
  }, []);
  useEffect(() => {
    recordNavigation(path);
  }, [path]);

  return (
    <header className={styles.bar} data-exp={context} style={{ viewTransitionName: "site-header" }}>
      <div className={styles.inner}>
        <Link href="/" className={styles.brand} aria-label="FairValue, overview" transitionTypes={transitionTypes(path, "/")}>
          <Mark />
          <span className={styles.word}>FairValue</span>
        </Link>

        <nav aria-label="Experiences" className={styles.switcher}>
          {EXPERIENCES.map((e) => {
            const active = e.id === context;
            return (
              <Link
                key={e.id}
                href={e.href}
                className={styles.option}
                aria-current={active ? "page" : undefined}
                transitionTypes={transitionTypes(path, e.href)}
                title={e.summary}
              >
                {active && (
                  <ViewTransition name="exp-indicator">
                    <span className={styles.indicator} aria-hidden="true" />
                  </ViewTransition>
                )}
                <span className={styles.optionLabel}>{e.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className={styles.tools}>
          <SearchTrigger className={styles.search} label="Search players">
            <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
              <circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span className={styles.searchText}>Search players</span>
            <ShortcutKbd className={styles.kbd} />
          </SearchTrigger>
          <p className={styles.status} data-state={service} title={reason}>
            <span className={styles.dot} aria-hidden="true" />
            <span className={styles.statusText}>{SERVICE_LABEL[service]}</span>
          </p>
        </div>
      </div>
      <CommandPalette />
    </header>
  );
}
