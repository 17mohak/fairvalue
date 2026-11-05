"use client";

// Small stores kept in this browser's localStorage: watchlists, the comparison tray and recently
// viewed players. Nothing here is sent to a server or synchronised between devices, and the UI
// says so wherever it shows them.

import { useSyncExternalStore } from "react";
import { COMPARE_MAX } from "@/lib/terminal";

export interface LocalStore<T> {
  get(): T;
  set(next: T | ((current: T) => T)): void;
  subscribe(listener: () => void): () => void;
  use(): T;
}

export function createLocalStore<T>(key: string, fallback: T, validate: (raw: unknown) => T | null): LocalStore<T> {
  let value = fallback;
  let loaded = false;
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((l) => l());

  function read() {
    try {
      const raw = window.localStorage.getItem(key);
      const parsed = raw ? validate(JSON.parse(raw)) : null;
      value = parsed ?? fallback;
    } catch {
      value = fallback; // private mode or corrupt JSON: start empty rather than crash
    }
  }

  function load() {
    if (loaded || typeof window === "undefined") return;
    loaded = true;
    read();
    // Another tab changed the same key: follow it.
    window.addEventListener("storage", (e) => {
      if (e.key === key) {
        read();
        emit();
      }
    });
  }

  const store: LocalStore<T> = {
    get() {
      load();
      return value;
    },
    set(next) {
      load();
      value = typeof next === "function" ? (next as (c: T) => T)(value) : next;
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch {
        /* storage full or blocked: the change still applies for this page view */
      }
      emit();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    use() {
      return useSyncExternalStore(store.subscribe, store.get, () => fallback);
    },
  };
  return store;
}

const noop = () => () => {};
/** False during server render and hydration, true afterwards: lets a view wait for local data. */
export function useHydrated(): boolean {
  return useSyncExternalStore(noop, () => true, () => false);
}

// ---------------------------------------------------------------------------
// Watchlists
// ---------------------------------------------------------------------------
export interface Watchlist {
  id: string;
  name: string;
  players: number[];
  created: string;
  updated: string;
}

const isList = (v: unknown): v is Watchlist =>
  !!v && typeof v === "object" && typeof (v as Watchlist).id === "string" && typeof (v as Watchlist).name === "string" &&
  Array.isArray((v as Watchlist).players) && (v as Watchlist).players.every((p) => Number.isInteger(p));

export const MAX_LISTS = 24;
export const MAX_LIST_PLAYERS = 200;

export const watchlists = createLocalStore<Watchlist[]>("fv.watchlists.v1", [], (raw) =>
  Array.isArray(raw) ? raw.filter(isList).slice(0, MAX_LISTS) : null,
);

const now = () => new Date().toISOString();
const newId = () => `wl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
export const cleanName = (name: string) => name.replace(/\s+/g, " ").trim().slice(0, 48);

// Pure updates (tested in localStore.test.ts); the store wrappers below apply them.
export function withList(lists: Watchlist[], name: string, id = newId(), at = now()): Watchlist[] {
  const n = cleanName(name) || "Untitled list";
  if (lists.length >= MAX_LISTS) return lists;
  return [...lists, { id, name: n, players: [], created: at, updated: at }];
}

export function withPlayer(lists: Watchlist[], listId: string, playerId: number, present: boolean, at = now()): Watchlist[] {
  return lists.map((l) => {
    if (l.id !== listId) return l;
    const has = l.players.includes(playerId);
    if (present === has) return l;
    const players = present ? [...l.players, playerId].slice(-MAX_LIST_PLAYERS) : l.players.filter((p) => p !== playerId);
    return { ...l, players, updated: at };
  });
}

export function createList(name: string): string {
  const id = newId();
  watchlists.set((ls) => withList(ls, name, id));
  return id;
}
export function renameList(id: string, name: string) {
  const n = cleanName(name);
  if (n) watchlists.set((ls) => ls.map((l) => (l.id === id ? { ...l, name: n, updated: now() } : l)));
}
export function deleteList(id: string) {
  watchlists.set((ls) => ls.filter((l) => l.id !== id));
}
export function setInList(listId: string, playerId: number, present: boolean) {
  watchlists.set((ls) => withPlayer(ls, listId, playerId, present));
}
/** The quick "watch" action: adds to the first list, creating a "Shortlist" when there is none. */
export function quickWatch(playerId: number, present: boolean) {
  watchlists.set((ls) => {
    const base = ls.length ? ls : withList(ls, "Shortlist");
    return present ? withPlayer(base, base[0]!.id, playerId, true) : base.map((l) => withPlayer([l], l.id, playerId, false)[0]!);
  });
}

// ---------------------------------------------------------------------------
// Comparison tray
// ---------------------------------------------------------------------------
export const compareTray = createLocalStore<number[]>("fv.compare.v1", [], (raw) =>
  Array.isArray(raw) ? raw.filter((v) => Number.isInteger(v)).slice(0, COMPARE_MAX) : null,
);

export function toggleCompare(ids: number[], id: number): number[] {
  if (ids.includes(id)) return ids.filter((x) => x !== id);
  return ids.length >= COMPARE_MAX ? ids : [...ids, id];
}

// ---------------------------------------------------------------------------
// Recently viewed dossiers
// ---------------------------------------------------------------------------
export interface RecentPlayer {
  id: number;
  slug: string;
  name: string;
  role_code: string;
  at: string;
}

export const recentPlayers = createLocalStore<RecentPlayer[]>("fv.recent.v1", [], (raw) =>
  Array.isArray(raw) ? raw.filter((r) => r && Number.isInteger(r.id) && typeof r.slug === "string").slice(0, 8) : null,
);

export function withRecent(list: RecentPlayer[], p: Omit<RecentPlayer, "at">, at = now()): RecentPlayer[] {
  return [{ ...p, at }, ...list.filter((r) => r.id !== p.id)].slice(0, 8);
}

// ---------------------------------------------------------------------------
// Recent searches: the queries that led to an opened player, newest first
// ---------------------------------------------------------------------------
export const recentSearches = createLocalStore<string[]>("fv.searches.v1", [], (raw) =>
  Array.isArray(raw) ? raw.filter((q): q is string => typeof q === "string" && q.trim().length > 0).map((q) => q.slice(0, 60)).slice(0, 5) : null,
);

export function withSearch(list: string[], query: string): string[] {
  const q = query.trim().replace(/\s+/g, " ").slice(0, 60);
  if (!q) return list;
  return [q, ...list.filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, 5);
}
