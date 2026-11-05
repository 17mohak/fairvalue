// Terminal workspaces, in rail order. Groups keep the rail scannable: players, market, models.

export type WorkspaceId = "explorer" | "compare" | "watchlists" | "market" | "leagues" | "discrepancies" | "valuation" | "audit";

export interface Workspace {
  id: WorkspaceId;
  group: "Players" | "Market" | "Models";
  href: string;
  label: string;
  short: string;
  /** Second key of the "g then x" shortcut. */
  key: string;
  summary: string;
}

export const WORKSPACES: Workspace[] = [
  { id: "explorer", group: "Players", href: "/terminal", label: "Player Explorer", short: "Explorer", key: "e", summary: "Search, filter and sort the player export." },
  { id: "compare", group: "Players", href: "/terminal/compare", label: "Comparison Studio", short: "Compare", key: "c", summary: "Two to four players on one scale." },
  { id: "watchlists", group: "Players", href: "/terminal/watchlists", label: "Watchlists", short: "Watchlists", key: "w", summary: "Named collections, kept in this browser." },
  { id: "market", group: "Market", href: "/terminal/market", label: "Market Landscape", short: "Market", key: "m", summary: "How observed value is distributed, and where the model drifts." },
  { id: "leagues", group: "Market", href: "/terminal/leagues", label: "League Landscape", short: "Leagues", key: "l", summary: "The 14 covered leagues: size, value level, model error." },
  { id: "discrepancies", group: "Market", href: "/terminal/discrepancies", label: "Discrepancy Explorer", short: "Discrepancies", key: "d", summary: "Where observed value and the model's estimate part ways." },
  { id: "valuation", group: "Models", href: "/terminal/valuation", label: "Valuation Studio", short: "Valuation", key: "v", summary: "Build a profile and value it with the served model." },
  { id: "audit", group: "Models", href: "/terminal/audit", label: "Fairness Audit", short: "Audit", key: "a", summary: "The UEFA / non-UEFA error gap, with its uncertainty." },
];

export function workspace(id: WorkspaceId): Workspace {
  return WORKSPACES.find((w) => w.id === id)!;
}

export function workspaceForPath(path: string): Workspace | null {
  const p = path.split(/[?#]/)[0] || "/";
  if (p === "/terminal") return WORKSPACES[0]!;
  return WORKSPACES.slice(1).find((w) => p === w.href || p.startsWith(`${w.href}/`)) ?? null;
}

/** Players a comparison can hold. */
export const COMPARE_MAX = 4;
export const COMPARE_MIN = 2;

export function parseIds(value: string | string[] | undefined, max = COMPARE_MAX): number[] {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return [];
  const out: number[] = [];
  for (const part of raw.split(",")) {
    const n = Number(part);
    if (Number.isInteger(n) && n > 0 && !out.includes(n)) out.push(n);
    if (out.length === max) break;
  }
  return out;
}
