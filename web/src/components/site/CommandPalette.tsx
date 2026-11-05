"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { EXPERIENCES, transitionTypes } from "@/lib/experiences";
import { leagueName } from "@/lib/football";
import { formatEur } from "@/lib/format";
import { compareTray, recentPlayers, useHydrated } from "@/lib/localStore";
import { matchesQuery, type PlayerIndex } from "@/lib/players";
import { STORIES } from "@/lib/stories";
import { WORKSPACES } from "@/lib/terminal";
import styles from "./CommandPalette.module.css";

// ---- open state, shared with the search button in the bar ----
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

// ---- the player index is fetched once, on first open ----
let index: PlayerIndex | null = null;
let indexPromise: Promise<PlayerIndex | null> | null = null;
function loadIndex(): Promise<PlayerIndex | null> {
  indexPromise ??= fetch("/api/players")
    .then((r) => (r.ok ? (r.json() as Promise<PlayerIndex>) : null))
    .then((d) => (index = d))
    .catch(() => null);
  return indexPromise;
}

interface Item {
  id: string;
  group: string;
  label: string;
  hint?: string;
  chip?: string;
  href: string;
}

const DESTINATIONS: Item[] = [
  ...EXPERIENCES.map((e) => ({ id: `exp-${e.id}`, group: "Go to", label: e.label, hint: e.summary, chip: "Experience", href: e.href })),
  ...WORKSPACES.map((w) => ({ id: `ws-${w.id}`, group: "Go to", label: w.label, hint: w.summary, chip: "Terminal", href: w.href })),
  ...STORIES.map((s) => ({ id: `story-${s.slug}`, group: "Go to", label: s.title, hint: s.dek, chip: s.formatLabel, href: s.href })),
  { id: "methods", group: "Go to", label: "Methods", hint: "Data, models, validation, explainability and limits.", chip: "Stories", href: "/methods" },
];

const editable = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName));

/** ⌘K / Ctrl+K or "/" anywhere: find a player, a workspace or a story. */
export function CommandPalette() {
  const open = useSyncExternalStore(subscribe, () => isOpen, () => false);
  const router = useRouter();
  const path = usePathname() ?? "/";
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [players, setPlayers] = useState<PlayerIndex | null>(index);
  const [loadFailed, setLoadFailed] = useState(false);
  const hydrated = useHydrated();
  const recent = recentPlayers.use();
  const tray = compareTray.use();
  const listId = useId();

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
      setQuery("");
      setActive(0);
      input.current?.focus();
      if (!index) void loadIndex().then((r) => (r ? setPlayers(r) : setLoadFailed(true)));
    } else if (!open && d.open) d.close();
  }, [open]);

  const items = useMemo<Item[]>(() => {
    const q = query.trim();
    const out: Item[] = [];
    if (!q) {
      if (tray.length >= 2)
        out.push({ id: "compare-tray", group: "Actions", label: `Compare ${tray.length} selected players`, chip: "Terminal", href: `/terminal/compare?ids=${tray.join(",")}` });
      if (hydrated)
        for (const r of recent.slice(0, 5))
          out.push({ id: `recent-${r.id}`, group: "Recently viewed", label: r.name, chip: r.role_code, href: `/players/${r.slug}` });
      return [...out, ...DESTINATIONS.slice(0, EXPERIENCES.length + 6)];
    }
    // Players match on name, club, role and league ("serie a" finds Serie A players).
    const found = (players?.players ?? []).filter((p) => matchesQuery({ ...p, sub_position: `${p.sub_position} ${leagueName(p.league_id)}` }, q)).slice(0, 8);
    for (const p of found)
      out.push({
        id: `p-${p.id}`,
        group: "Players",
        label: p.name,
        chip: p.role_code,
        hint: `${p.club ?? leagueName(p.league_id)} · ${formatEur(p.market_value_eur)}`,
        href: `/players/${p.slug}`,
      });
    const needle = q.toLowerCase();
    return [...out, ...DESTINATIONS.filter((d) => `${d.label} ${d.hint ?? ""}`.toLowerCase().includes(needle)).slice(0, 8)];
  }, [query, players, recent, tray, hydrated]);

  const go = (item: Item | undefined) => {
    if (!item) return;
    setOpen(false);
    router.push(item.href, { transitionTypes: transitionTypes(path, item.href) });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(items.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(items[active]);
    }
  };

  // Keep the highlighted option in view while arrowing through a long list.
  useEffect(() => {
    dialog.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  let lastGroup = "";
  const coverage = players ? (players.source === "full" ? `${players.total.toLocaleString("en-GB")} players` : `Showcase export · ${players.total} players`) : null;

  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-label="Search FairValue"
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
            placeholder="Player, club, league, workspace or story"
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={items[active] ? `${listId}-${active}` : undefined}
            aria-autocomplete="list"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className={styles.esc}>Esc</kbd>
        </div>
        <ul id={listId} role="listbox" className={styles.list} aria-label="Results">
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
                  className={styles.item}
                  onMouseMove={() => setActive(i)}
                  onClick={() => go(item)}
                >
                  {item.chip && <span className={styles.chip}>{item.chip}</span>}
                  <span className={styles.label}>{item.label}</span>
                  {item.hint && <span className={styles.hint}>{item.hint}</span>}
                </div>
              </li>
            );
          })}
          {query.trim() && items.length === 0 && (
            <li className={styles.empty} role="presentation">
              Nothing matches “{query.trim()}”{players?.source === "showcase" ? " in the eight-player showcase export." : "."}
            </li>
          )}
        </ul>
        <p className={styles.foot}>
          <span>
            <kbd>↑</kbd> <kbd>↓</kbd> to move · <kbd>Enter</kbd> to open
          </span>
          <span>{loadFailed ? "Player index unavailable" : coverage ?? "Loading player index…"}</span>
        </p>
      </div>
    </dialog>
  );
}
