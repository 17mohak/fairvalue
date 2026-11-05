"use client";

import { usePathname, useRouter } from "next/navigation";
import { useDeferredValue, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Flag, LeagueFlag } from "@/components/brand/Flag";
import { contextForPath, EXPERIENCES, transitionTypes } from "@/lib/experiences";
import { leagueName } from "@/lib/football";
import { formatEur } from "@/lib/format";
import { compareTray, recentPlayers, recentSearches, useHydrated, withSearch } from "@/lib/localStore";
import { searchPlayers, type IndexRow, type PlayerIndex } from "@/lib/players";
import { STORIES } from "@/lib/stories";
import { WORKSPACES } from "@/lib/terminal";
import styles from "./CommandPalette.module.css";

// ---- open state, shared with every search control ----
let isOpen = false;
const listeners = new Set<() => void>();
function setOpen(v: boolean) {
  isOpen = v;
  listeners.forEach((l) => l());
}
export const openPalette = () => setOpen(true);
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

// ---- the player index: one request per page load, shared by every open ----
// The existing /api/players endpoint serves the compact index from the same export the dossiers
// read, so there is no second search backend and no duplicate index to keep in step.
type IndexState = { status: "idle" | "loading" | "ready" | "error"; data: PlayerIndex | null };
let indexState: IndexState = { status: "idle", data: null };
const indexListeners = new Set<() => void>();
function setIndex(next: IndexState) {
  indexState = next;
  indexListeners.forEach((l) => l());
}
function loadIndex() {
  if (indexState.status === "loading" || indexState.status === "ready") return;
  setIndex({ status: "loading", data: null });
  fetch("/api/players")
    .then((r) => (r.ok ? (r.json() as Promise<PlayerIndex>) : Promise.reject(new Error(String(r.status)))))
    .then((data) => setIndex({ status: "ready", data }))
    .catch(() => setIndex({ status: "error", data: null }));
}
/** Start loading the index early (hover or focus on a search control). Safe to call repeatedly. */
export function prefetchPlayerIndex() {
  loadIndex();
}
function useIndex(): IndexState {
  return useSyncExternalStore(
    (l) => {
      indexListeners.add(l);
      return () => indexListeners.delete(l);
    },
    () => indexState,
    () => indexState,
  );
}

type Item =
  | { kind: "player"; id: string; group: string; row: Pick<IndexRow, "id" | "slug" | "name" | "role_code"> & Partial<IndexRow> }
  | { kind: "link"; id: string; group: string; label: string; hint?: string; chip?: string; href: string }
  | { kind: "query"; id: string; group: string; query: string };

const DESTINATIONS: Item[] = [
  ...EXPERIENCES.map((e) => ({ kind: "link" as const, id: `exp-${e.id}`, group: "Go to", label: e.label, hint: e.summary, chip: "Environment", href: e.href })),
  ...WORKSPACES.map((w) => ({ kind: "link" as const, id: `ws-${w.id}`, group: "Go to", label: w.label, hint: w.summary, chip: "Terminal", href: w.href })),
  ...STORIES.map((s) => ({ kind: "link" as const, id: `story-${s.slug}`, group: "Go to", label: s.title, hint: s.dek, chip: s.formatLabel, href: s.href })),
  { kind: "link", id: "methods", group: "Go to", label: "Methods", hint: "Data, models, validation, explainability and limits.", chip: "Stories", href: "/methods" },
];

const editable = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName));

/** Bold the first place the query's first word appears in the name (plain-letter match only). */
function Highlight({ text, query }: { text: string; query: string }) {
  const w = query.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  const i = w ? text.toLowerCase().indexOf(w) : -1;
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark>{text.slice(i, i + w.length)}</mark>
      {text.slice(i + w.length)}
    </>
  );
}

/**
 * Global player search: ⌘K / Ctrl+K or "/" anywhere, or any search control. Finds players by
 * name (and club, league or nationality), plus workspaces and stories. Every player result opens
 * the canonical dossier at /players/[id].
 */
export function CommandPalette() {
  const open = useSyncExternalStore(subscribe, () => isOpen, () => false);
  const router = useRouter();
  const path = usePathname() ?? "/";
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  // Filtering 5,820 rows is cheap, but deferring it keeps typing smooth on slow devices.
  const deferred = useDeferredValue(query);
  const [active, setActive] = useState(0);
  const idx = useIndex();
  const hydrated = useHydrated();
  const recent = recentPlayers.use();
  const searches = recentSearches.use();
  const tray = compareTray.use();
  const listId = useId();
  // Browsers fire mousemove when results re-render under a resting pointer; only real movement
  // may change the highlighted row, or Enter would open whatever happens to sit under the cursor.
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const hover = (e: React.MouseEvent, i: number) => {
    const last = pointer.current;
    pointer.current = { x: e.clientX, y: e.clientY };
    if (last && last.x === e.clientX && last.y === e.clientY) return;
    if (!last) return; // the first event only records where the pointer rests
    setActive(i);
  };
  const context = contextForPath(path);
  const from = context === "dossier" ? "" : `?from=${context}`;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!isOpen);
      } else if (e.key === "/" && !isOpen && !editable(e.target)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      pointer.current = null;
      setQuery("");
      setActive(0);
      input.current?.focus();
      loadIndex();
    } else if (!open && d.open) d.close();
  }, [open]);

  const q = deferred.trim();
  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];
    if (!q) {
      if (tray.length >= 2)
        out.push({ kind: "link", id: "compare-tray", group: "Actions", label: `Compare ${tray.length} selected players`, chip: "Terminal", href: `/terminal/compare?ids=${tray.join(",")}` });
      if (hydrated) {
        for (const s of searches.slice(0, 4)) out.push({ kind: "query", id: `q-${s}`, group: "Recent searches", query: s });
        const byId = new Map((idx.data?.players ?? []).map((p) => [p.id, p]));
        for (const r of recent.slice(0, 5)) out.push({ kind: "player", id: `recent-${r.id}`, group: "Recently viewed", row: byId.get(r.id) ?? r });
      }
      return [...out, ...DESTINATIONS.slice(0, EXPERIENCES.length + 4)];
    }
    const rows = (idx.data?.players ?? []).map((p) => ({ ...p, league: leagueName(p.league_id) }));
    for (const h of searchPlayers(rows, q, 8)) out.push({ kind: "player", id: `p-${h.row.id}`, group: "Players", row: h.row });
    const needle = q.toLowerCase();
    return [...out, ...DESTINATIONS.filter((d) => d.kind === "link" && `${d.label} ${d.hint ?? ""}`.toLowerCase().includes(needle)).slice(0, 5)];
  }, [q, idx.data, recent, searches, tray, hydrated]);

  const playerCount = items.filter((i) => i.kind === "player" && i.group === "Players").length;

  const go = (item: Item | undefined) => {
    if (!item) return;
    if (item.kind === "query") {
      setQuery(item.query);
      setActive(0);
      input.current?.focus();
      return;
    }
    // From a typed search, the dossier steps through the same ranked results.
    const seq = item.kind === "player" && item.group === "Players" && query.trim() ? `seq=${encodeURIComponent(`search:${query.trim().slice(0, 60)}`)}` : "";
    const qs = [from.replace(/^\?/, ""), seq].filter(Boolean).join("&");
    const href = item.kind === "player" ? `/players/${item.row.slug}${qs ? `?${qs}` : ""}` : item.href;
    if (item.kind === "player" && query.trim()) recentSearches.set((l) => withSearch(l, query));
    setOpen(false);
    router.push(href, { transitionTypes: transitionTypes(path, href) });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(items.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Home" && !query) {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End" && !query) {
      e.preventDefault();
      setActive(items.length - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(items[Math.min(active, items.length - 1)]);
    }
  };

  // Keep the highlighted option in view while arrowing through a long list.
  useEffect(() => {
    dialog.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const waiting = !!q && (idx.status === "loading" || idx.status === "idle");
  const failed = idx.status === "error";
  let lastGroup = "";
  const coverage = idx.data
    ? idx.data.source === "full"
      ? `${idx.data.total.toLocaleString("en-GB")} players`
      : `Showcase export · ${idx.data.total} players`
    : failed
      ? "Player index unavailable"
      : "Loading player index…";
  const announce = !q ? "" : waiting ? "Loading players" : failed ? "Player search is unavailable" : `${playerCount} ${playerCount === 1 ? "player" : "players"} found`;

  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-label="Search players"
      onClose={() => setOpen(false)}
      onClick={(e) => e.target === dialog.current && setOpen(false)}
    >
      <div className={styles.panel}>
        <div className={styles.field}>
          <svg width="18" height="18" viewBox="0 0 16 16" aria-hidden="true">
            <circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            ref={input}
            className={styles.input}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Search players by name, club or league"
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={items[active] ? `${listId}-${active}` : undefined}
            aria-autocomplete="list"
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="go"
          />
          {query && (
            <button type="button" className={styles.clear} onClick={() => (setQuery(""), input.current?.focus())} aria-label="Clear search">
              ×
            </button>
          )}
          <kbd className={styles.esc}>Esc</kbd>
        </div>
        <p className="visually-hidden" aria-live="polite">
          {announce}
        </p>
        <ul id={listId} role="listbox" className={styles.list} aria-label="Results" aria-busy={waiting || undefined}>
          {waiting && (
            <li role="presentation" className={styles.loading}>
              <p className={styles.group}>Players</p>
              {[0, 1, 2].map((i) => (
                <span key={i} className={styles.skeleton} aria-hidden="true" />
              ))}
            </li>
          )}
          {q && failed && (
            <li role="presentation" className={styles.error}>
              <span>The player index could not be loaded. Workspaces and stories still work.</span>
              <button
                type="button"
                className={styles.retry}
                onClick={() => {
                  setIndex({ status: "idle", data: null });
                  loadIndex();
                  input.current?.focus();
                }}
              >
                Retry
              </button>
            </li>
          )}
          {items.map((item, i) => {
            const head = item.group !== lastGroup ? item.group : null;
            lastGroup = item.group;
            return (
              <li key={item.id} role="presentation">
                {head && (
                  <p className={styles.group} aria-hidden="true">
                    {head}
                  </p>
                )}
                <div
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  data-index={i}
                  data-kind={item.kind}
                  className={styles.item}
                  onMouseMove={(e) => hover(e, i)}
                  onClick={() => go(item)}
                >
                  {item.kind === "player" ? (
                    <>
                      <span className={styles.role}>{item.row.role_code}</span>
                      <span className={styles.who}>
                        <span className={styles.label}>
                          <Highlight text={item.row.name} query={q} />
                        </span>
                        {item.row.league_id && (
                          <span className={styles.sub}>
                            {item.row.club ?? "Club not in this build"}
                            <span aria-hidden="true"> · </span>
                            <LeagueFlag leagueId={item.row.league_id} /> {leagueName(item.row.league_id).split(",")[0]}
                            {item.row.sub_position && <span className={styles.pos}> · {item.row.sub_position}</span>}
                          </span>
                        )}
                      </span>
                      <span className={styles.nat}>
                        {item.row.nationality && (
                          <>
                            <Flag country={item.row.nationality} /> {item.row.nationality}
                          </>
                        )}
                      </span>
                      <span className={`${styles.value} num`}>
                        {item.row.market_value_eur !== undefined && (
                          <>
                            <i aria-hidden="true" />
                            {formatEur(item.row.market_value_eur)}
                            <span className="visually-hidden"> observed market value</span>
                          </>
                        )}
                      </span>
                    </>
                  ) : item.kind === "query" ? (
                    <>
                      <span className={styles.chip} aria-hidden="true">
                        ↺
                      </span>
                      <span className={styles.label}>{item.query}</span>
                    </>
                  ) : (
                    <>
                      {item.chip && <span className={styles.chip}>{item.chip}</span>}
                      <span className={styles.label}>{item.label}</span>
                      {item.hint && <span className={styles.hint}>{item.hint}</span>}
                    </>
                  )}
                </div>
              </li>
            );
          })}
          {q && !waiting && !failed && playerCount === 0 && (
            <li className={styles.empty} role="presentation">
              No player matches “{q}”{idx.data?.source === "showcase" ? " in the eight-player showcase export" : ""}. Try a surname, a club or a
              league.
            </li>
          )}
        </ul>
        <p className={styles.foot}>
          <span>
            <kbd>↑</kbd> <kbd>↓</kbd> to move · <kbd>Enter</kbd> to open · <kbd>Esc</kbd> to close
          </span>
          <span>{coverage}</span>
        </p>
      </div>
    </dialog>
  );
}
