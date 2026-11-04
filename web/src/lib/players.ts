// Player profiles: types and pure helpers shared by server and client (see src/product/players.py).
// The server-side loader that reads the files lives in lib/players.server.ts.

import type { PlayerFeatures } from "@/lib/api/types";
import type { ModelId, Position, TierName } from "@/lib/football";

export interface TraitValue {
  key: TraitKey;
  value: number | null;
  /** Mid-rank percentile among players in the same position, 0-100. */
  percentile: number;
}

export interface PlayerProfile {
  id: number;
  slug: string;
  name: string;
  first_name: string;
  last_name: string;
  position: Position;
  sub_position: string;
  role_code: string;
  foot: string | null;
  height_cm: number | null;
  age: number;
  league_id: string;
  club: string | null;
  valuation_date: string | null;
  /** Observed Transfermarkt value at the valuation date: the model's target, not an estimate. */
  market_value_eur: number;
  market_tier: TierName | null;
  features: PlayerFeatures;
  window: { appearances: number; minutes: number; goals: number | null; assists: number | null; started: number; yellow_cards: number | null; red_cards: number | null };
  estimates: {
    /** Served (full-data refit) models: the player was in their training data, so these are in-sample. */
    served: Record<ModelId, number | null>;
    /** Out-of-fold cross-validation predictions: the honest comparison with the market value. */
    heldout: Record<ModelId, number | null>;
  };
  explanation: {
    model: ModelId;
    source: string;
    base_log_value: number;
    predicted_log_value: number;
    contributions: { feature: string; value: number | string | null; contribution: number }[];
  } | null;
  traits: TraitValue[] | null;
  history: { date: string; value_eur: number; club: string | null }[] | null;
  /** Audit label for the audit-context panel only. Never a model input. */
  audit: { group: "UEFA" | "non-UEFA" | null };
}

export interface PeerStats {
  n: number;
  traits: Partial<Record<TraitKey, { deciles: number[]; median: number }>>;
}

export interface PlayerSet {
  source: "showcase" | "full";
  generated_by: string;
  selection: string;
  heldout_algorithm?: string | null;
  peers: Partial<Record<Position, PeerStats>> | null;
  players: PlayerProfile[];
}

export type PlayerSummary = Pick<
  PlayerProfile,
  "id" | "slug" | "name" | "first_name" | "last_name" | "position" | "sub_position" | "role_code" | "age" | "league_id" | "club" | "market_value_eur" | "market_tier"
>;

export function summary(p: PlayerProfile): PlayerSummary {
  const { id, slug, name, first_name, last_name, position, sub_position, role_code, age, league_id, club, market_value_eur, market_tier } = p;
  return { id, slug, name, first_name, last_name, position, sub_position, role_code, age, league_id, club, market_value_eur, market_tier };
}

/** "605184-jean-clair-todibo" or "605184" -> 605184 */
export function idFromParam(param: string): number | null {
  const m = /^(\d+)(?:-[a-z0-9-]*)?$/.exec(param);
  return m ? Number(m[1]) : null;
}

// ---- Board filtering (URL state: ?q=&position=&league=&tier=&sort=) ----
export type BoardSort = "value" | "name" | "age";
export interface BoardQuery {
  q: string;
  position: Position | "";
  league: string;
  tier: TierName | "";
  sort: BoardSort;
}

const POSITIONS: Position[] = ["Goalkeeper", "Defender", "Midfield", "Attack"];
const TIERS: TierName[] = ["Emerging", "Established", "Elite", "World Class"];

export function parseBoardQuery(sp: Record<string, string | string[] | undefined>): BoardQuery {
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k]![0] : sp[k]) ?? "";
  const position = one("position") as Position;
  const tier = one("tier") as TierName;
  const sort = one("sort") as BoardSort;
  return {
    q: one("q").slice(0, 60),
    position: POSITIONS.includes(position) ? position : "",
    league: /^[A-Z0-9]{2,5}$/.test(one("league")) ? one("league") : "",
    tier: TIERS.includes(tier) ? tier : "",
    sort: ["value", "name", "age"].includes(sort) ? sort : "value",
  };
}

const fold = (s: string) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function filterPlayers<T extends PlayerSummary>(players: T[], q: BoardQuery): T[] {
  const needle = fold(q.q.trim());
  const out = players.filter(
    (p) =>
      (!needle || fold(`${p.name} ${p.club ?? ""}`).includes(needle)) &&
      (!q.position || p.position === q.position) &&
      (!q.league || p.league_id === q.league) &&
      (!q.tier || p.market_tier === q.tier),
  );
  // Sorting is by observed value, name or age only. Ranking players by the model's error would
  // invite reading residuals as "undervalued", which the model card rules out.
  return out.sort((a, b) =>
    q.sort === "name" ? a.last_name.localeCompare(b.last_name) : q.sort === "age" ? a.age - b.age : b.market_value_eur - a.market_value_eur,
  );
}

// ---- Traits ----
export type TraitKey = "goals_p90" | "assists_p90" | "minutes" | "start_share" | "minutes_last_365" | "intl_club_minutes_share";

export const TRAITS: Record<TraitKey, { label: string; short: string; definition: string; format: (v: number) => string }> = {
  goals_p90: { label: "Goals per 90", short: "Goals", definition: "Club goals per 90 minutes played in the two years to the valuation date.", format: (v) => v.toFixed(2) },
  assists_p90: { label: "Assists per 90", short: "Assists", definition: "Club assists per 90 minutes in the same window.", format: (v) => v.toFixed(2) },
  minutes: { label: "Minutes, two years", short: "Minutes", definition: "Total club minutes in the two-year window: how much the player was used.", format: (v) => Math.round(v).toLocaleString("en-GB") },
  start_share: { label: "Starts", short: "Starts", definition: "Share of appearances started rather than entered from the bench.", format: (v) => `${Math.round(v * 100)}%` },
  minutes_last_365: { label: "Minutes, last 365 days", short: "Recent", definition: "Club minutes in the final year of the window: recent involvement, or the absence of it.", format: (v) => Math.round(v).toLocaleString("en-GB") },
  intl_club_minutes_share: { label: "European club minutes", short: "Europe", definition: "Share of minutes played in UEFA club competitions.", format: (v) => `${Math.round(v * 100)}%` },
};

export const POSITION_PLURAL: Record<Position, string> = { Goalkeeper: "goalkeepers", Defender: "defenders", Midfield: "midfielders", Attack: "attackers" };
