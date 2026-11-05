// Player Explorer: URL state, filtering, sorting and paging (pure; used by the server page).
// Filters exist only for fields the player export actually carries (D-038).

import type { Position, TierName } from "@/lib/football";
import { matchesQuery, summary, type PlayerProfile, type PlayerSummary } from "@/lib/players";

export type ExplorerSort = "value" | "model" | "name" | "age" | "minutes" | "g90" | "a90";
export type SortDir = "asc" | "desc";

export interface ExplorerQuery {
  q: string;
  position: Position | "";
  league: string;
  tier: TierName | "";
  sort: ExplorerSort;
  dir: SortDir;
  view: "table" | "cards";
  ageMin: number | null;
  ageMax: number | null;
  minMinutes: number | null;
  /** Observed value bounds in euros. */
  valueMin: number | null;
  valueMax: number | null;
  page: number;
  focus: number | null;
}

export const PAGE_SIZE = 50;
const POSITIONS: Position[] = ["Goalkeeper", "Defender", "Midfield", "Attack"];
const TIERS: TierName[] = ["Emerging", "Established", "Elite", "World Class"];
const SORTS: ExplorerSort[] = ["value", "model", "name", "age", "minutes", "g90", "a90"];
/** Natural direction when a column is first sorted: biggest first, names A to Z, youngest first. */
export const DEFAULT_DIR: Record<ExplorerSort, SortDir> = { value: "desc", model: "desc", name: "asc", age: "asc", minutes: "desc", g90: "desc", a90: "desc" };

type SP = Record<string, string | string[] | undefined>;
const one = (sp: SP, k: string) => (Array.isArray(sp[k]) ? sp[k]![0] : sp[k]) ?? "";
function num(sp: SP, k: string, lo: number, hi: number): number | null {
  const raw = one(sp, k);
  if (raw === "") return null;
  const v = Number(raw);
  return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : null;
}

export function parseExplorerQuery(sp: SP): ExplorerQuery {
  const position = one(sp, "position") as Position;
  const tier = one(sp, "tier") as TierName;
  const sort = (SORTS.includes(one(sp, "sort") as ExplorerSort) ? one(sp, "sort") : "value") as ExplorerSort;
  const dir = one(sp, "dir") === "asc" || one(sp, "dir") === "desc" ? (one(sp, "dir") as SortDir) : DEFAULT_DIR[sort];
  const focus = Number(one(sp, "focus"));
  return {
    q: one(sp, "q").slice(0, 60),
    position: POSITIONS.includes(position) ? position : "",
    league: /^[A-Z0-9]{2,5}$/.test(one(sp, "league")) ? one(sp, "league") : "",
    tier: TIERS.includes(tier) ? tier : "",
    sort,
    dir,
    view: one(sp, "view") === "cards" ? "cards" : "table",
    ageMin: num(sp, "age_min", 15, 45),
    ageMax: num(sp, "age_max", 15, 45),
    minMinutes: num(sp, "min_minutes", 0, 10_000),
    valueMin: num(sp, "value_min", 0, 300) !== null ? num(sp, "value_min", 0, 300)! * 1e6 : null,
    valueMax: num(sp, "value_max", 0, 300) !== null ? num(sp, "value_max", 0, 300)! * 1e6 : null,
    page: Math.max(1, Math.floor(num(sp, "page", 1, 10_000) ?? 1)),
    focus: Number.isInteger(focus) && focus > 0 ? focus : null,
  };
}

/** The query as URL parameters, leaving defaults out so links stay short. */
export function explorerParams(q: ExplorerQuery): URLSearchParams {
  const p = new URLSearchParams();
  if (q.q) p.set("q", q.q);
  if (q.position) p.set("position", q.position);
  if (q.league) p.set("league", q.league);
  if (q.tier) p.set("tier", q.tier);
  if (q.sort !== "value") p.set("sort", q.sort);
  if (q.dir !== DEFAULT_DIR[q.sort]) p.set("dir", q.dir);
  if (q.view !== "table") p.set("view", q.view);
  if (q.ageMin !== null) p.set("age_min", String(q.ageMin));
  if (q.ageMax !== null) p.set("age_max", String(q.ageMax));
  if (q.minMinutes !== null) p.set("min_minutes", String(q.minMinutes));
  if (q.valueMin !== null) p.set("value_min", String(q.valueMin / 1e6));
  if (q.valueMax !== null) p.set("value_max", String(q.valueMax / 1e6));
  if (q.page > 1) p.set("page", String(q.page));
  if (q.focus !== null) p.set("focus", String(q.focus));
  return p;
}

export type ExplorerRow = PlayerSummary & {
  height_cm: number | null;
  foot: string | null;
  goals_p90: number;
  assists_p90: number;
  has_explanation: boolean;
};

export function explorerRow(p: PlayerProfile): ExplorerRow {
  return {
    ...summary(p),
    height_cm: p.height_cm,
    foot: p.foot,
    goals_p90: p.features.goals_p90,
    assists_p90: p.features.assists_p90,
    has_explanation: !!p.explanation,
  };
}

const key: Record<ExplorerSort, (r: ExplorerRow) => number | string> = {
  value: (r) => r.market_value_eur,
  model: (r) => r.estimate?.value ?? -1,
  name: (r) => r.last_name,
  age: (r) => r.age,
  minutes: (r) => r.window.minutes,
  g90: (r) => r.goals_p90,
  a90: (r) => r.assists_p90,
};

export function filterSort(rows: ExplorerRow[], q: ExplorerQuery): ExplorerRow[] {
  const out = rows.filter(
    (r) =>
      matchesQuery(r, q.q) &&
      (!q.position || r.position === q.position) &&
      (!q.league || r.league_id === q.league) &&
      (!q.tier || r.market_tier === q.tier) &&
      (q.ageMin === null || r.age >= q.ageMin) &&
      (q.ageMax === null || r.age <= q.ageMax) &&
      (q.minMinutes === null || r.window.minutes >= q.minMinutes) &&
      (q.valueMin === null || r.market_value_eur >= q.valueMin) &&
      (q.valueMax === null || r.market_value_eur <= q.valueMax),
  );
  const k = key[q.sort];
  const sign = q.dir === "asc" ? 1 : -1;
  // Ties fall back to observed value, then id, so the order is stable across requests.
  return out.sort((a, b) => {
    const x = k(a);
    const y = k(b);
    const c = typeof x === "string" ? x.localeCompare(y as string) : x - (y as number);
    return sign * c || b.market_value_eur - a.market_value_eur || a.id - b.id;
  });
}

export function paginate<T>(rows: T[], page: number, size = PAGE_SIZE) {
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const p = Math.min(page, pages);
  return { rows: rows.slice((p - 1) * size, p * size), page: p, pages };
}
