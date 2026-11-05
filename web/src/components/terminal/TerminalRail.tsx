"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { recentPlayers, useHydrated, watchlists } from "@/lib/localStore";
import { WORKSPACES, workspaceForPath } from "@/lib/terminal";
import styles from "./TerminalRail.module.css";

const GROUPS = ["Players", "Market", "Models"] as const;

interface Props {
  /** The export the whole build reads: the eight-player showcase or the full local export. */
  coverage: { source: "showcase" | "full"; players: number; population: number };
  build: { models: string; dataset: string };
}

/** Workspace navigation, local collections and the build's coverage. "g" then a letter jumps. */
export function TerminalRail({ coverage, build }: Props) {
  const path = usePathname() ?? "/terminal";
  const router = useRouter();
  const current = workspaceForPath(path);
  const hydrated = useHydrated();
  const recent = recentPlayers.use();
  const lists = watchlists.use();

  useEffect(() => {
    let armed = 0;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.metaKey || e.ctrlKey || e.altKey || (t && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)))) return;
      if (document.querySelector("dialog[open]")) return;
      const k = e.key.toLowerCase();
      if (k === "g") {
        armed = Date.now();
        return;
      }
      if (armed && Date.now() - armed < 1200) {
        const w = WORKSPACES.find((x) => x.key === k);
        armed = 0;
        if (w) {
          e.preventDefault();
          router.push(w.href, { transitionTypes: ["ws"] });
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  return (
    <aside className={styles.rail} aria-label="Terminal">
      <nav aria-label="Workspaces" className={styles.nav}>
        {GROUPS.map((g) => (
          <div key={g} className={styles.group}>
            <p className={styles.groupLabel}>{g}</p>
            <ul>
              {WORKSPACES.filter((w) => w.group === g).map((w) => (
                <li key={w.id}>
                  <Link
                    href={w.href}
                    className={styles.link}
                    aria-current={current?.id === w.id ? "page" : undefined}
                    transitionTypes={current?.id === w.id ? [] : ["ws"]}
                    title={w.summary}
                  >
                    <span className={styles.linkLabel}>{w.label}</span>
                    <span className={styles.linkShort}>{w.short}</span>
                    <kbd className={styles.key} aria-hidden="true">
                      G {w.key.toUpperCase()}
                    </kbd>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <section className={styles.local} aria-label="Saved in this browser">
        <p className={styles.groupLabel}>Watchlists</p>
        {!hydrated ? (
          <p className={styles.muted}>…</p>
        ) : lists.length === 0 ? (
          <p className={styles.muted}>None yet. Star a player to start one.</p>
        ) : (
          <ul>
            {lists.slice(0, 5).map((l) => (
              <li key={l.id}>
                <Link href={`/terminal/watchlists?list=${l.id}`} className={styles.mini} transitionTypes={["ws"]}>
                  <span>{l.name}</span>
                  <b className="num">{l.players.length}</b>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <p className={styles.groupLabel}>Recently viewed</p>
        {!hydrated ? (
          <p className={styles.muted}>…</p>
        ) : recent.length === 0 ? (
          <p className={styles.muted}>Dossiers you open appear here.</p>
        ) : (
          <ul>
            {recent.slice(0, 5).map((r) => (
              <li key={r.id}>
                <Link href={`/players/${r.slug}?from=terminal`} className={styles.mini} transitionTypes={["to-dossier"]}>
                  <span>{r.name}</span>
                  <b>{r.role_code}</b>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <p className={styles.localNote}>Stored in this browser only; not synced.</p>
      </section>

      <dl className={styles.coverage}>
        <div>
          <dt>Player export</dt>
          <dd>
            {coverage.source === "full" ? (
              <>Full · {coverage.players.toLocaleString("en-GB")}</>
            ) : (
              <>
                Showcase · <span className="num">{coverage.players}</span> of {coverage.population.toLocaleString("en-GB")}
              </>
            )}
          </dd>
        </div>
        <div>
          <dt>Population</dt>
          <dd>14 leagues · ≥450 min · 2025–26</dd>
        </div>
        <div>
          <dt>Research build</dt>
          <dd className="num" title={`Dataset fingerprint ${build.dataset}`}>
            {build.models} · {build.dataset.slice(0, 8)}
          </dd>
        </div>
      </dl>
    </aside>
  );
}
