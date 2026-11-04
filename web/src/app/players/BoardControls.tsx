"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import type { BoardQuery } from "@/lib/players";
import styles from "./players.module.css";

const POSITIONS = [
  { value: "", label: "All" },
  { value: "Goalkeeper", label: "Keepers" },
  { value: "Defender", label: "Defenders" },
  { value: "Midfield", label: "Midfield" },
  { value: "Attack", label: "Attack" },
] as const;

/** Board filters. Every control writes to the URL, so a filtered board is linkable and survives refresh. */
export function BoardControls({ query, leagues, total }: { query: BoardQuery; leagues: { id: string; label: string }[]; total: number }) {
  const router = useRouter();
  const path = usePathname();
  const [pending, start] = useTransition();
  const [q, setQ] = useState(query.q);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const go = (patch: Partial<BoardQuery>) => {
    const next = { ...query, ...patch };
    const params = new URLSearchParams();
    if (next.q) params.set("q", next.q);
    if (next.position) params.set("position", next.position);
    if (next.league) params.set("league", next.league);
    if (next.tier) params.set("tier", next.tier);
    if (next.sort !== "value") params.set("sort", next.sort);
    if (next.view !== "cards") params.set("view", next.view);
    const s = params.toString();
    start(() => router.replace(s ? `${path}?${s}` : path, { scroll: false }));
  };

  // Typing filters after a short pause; the URL then carries the search.
  useEffect(() => () => clearTimeout(timer.current), []);
  const onSearch = (v: string) => {
    setQ(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => go({ q: v.trim() }), 220);
  };

  return (
    <div className={styles.controls} data-pending={pending || undefined}>
      <label className={styles.search}>
        <span className="visually-hidden">Search players by name or club</span>
        <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
          <circle cx="8.5" cy="8.5" r="6" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <line x1="13" y1="13" x2="18" y2="18" stroke="currentColor" strokeWidth="1.6" />
        </svg>
        <input type="search" value={q} onChange={(e) => onSearch(e.target.value)} placeholder="Search name or club" />
      </label>

      <div className={styles.chips} role="group" aria-label="Position">
        {POSITIONS.map((p) => (
          <button key={p.value} type="button" aria-pressed={query.position === p.value} onClick={() => go({ position: p.value })}>
            {p.label}
          </button>
        ))}
      </div>

      <label className={styles.select}>
        <span>League</span>
        <select value={query.league} onChange={(e) => go({ league: e.target.value })}>
          <option value="">All leagues</option>
          {leagues.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.select}>
        <span>Tier</span>
        <select value={query.tier} onChange={(e) => go({ tier: e.target.value as BoardQuery["tier"] })}>
          <option value="">All tiers</option>
          {["Emerging", "Established", "Elite", "World Class"].map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.select}>
        <span>Sort</span>
        <select value={query.sort} onChange={(e) => go({ sort: e.target.value as BoardQuery["sort"] })}>
          <option value="value">Market value</option>
          <option value="name">Surname</option>
          <option value="age">Age</option>
        </select>
      </label>

      <div className={styles.views} role="group" aria-label="View">
        {(["cards", "table"] as const).map((v) => (
          <button key={v} type="button" aria-pressed={query.view === v} onClick={() => go({ view: v })}>
            {v === "cards" ? "Cards" : "Table"}
          </button>
        ))}
      </div>

      <p className={styles.total} aria-live="polite">
        <span className="num">{total}</span> {total === 1 ? "player" : "players"}
      </p>
    </div>
  );
}
