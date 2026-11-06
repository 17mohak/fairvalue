// Football vocabulary for display. The *valid values* come from the generated catalog
// (src/data/catalog.json, exported from the API's Python schema); this file only adds names.

import catalog from "@/data/catalog.json";

export type LeagueId = (typeof catalog.leagues)[number];
export type Position = "Attack" | "Midfield" | "Defender" | "Goalkeeper";
export type Foot = "left" | "right" | "both";
export type ModelId = "A" | "B";
export type TierName = "Emerging" | "Established" | "Elite" | "World Class";

export const LEAGUE_IDS = catalog.leagues as LeagueId[];

export const LEAGUES: Record<string, { name: string; country: string }> = {
  GB1: { name: "Premier League", country: "England" },
  ES1: { name: "LaLiga", country: "Spain" },
  IT1: { name: "Serie A", country: "Italy" },
  L1: { name: "Bundesliga", country: "Germany" },
  FR1: { name: "Ligue 1", country: "France" },
  NL1: { name: "Eredivisie", country: "Netherlands" },
  PO1: { name: "Liga Portugal", country: "Portugal" },
  BE1: { name: "Pro League", country: "Belgium" },
  TR1: { name: "Süper Lig", country: "Türkiye" },
  RU1: { name: "Premier Liga", country: "Russia" },
  UKR1: { name: "Premier Liha", country: "Ukraine" },
  GR1: { name: "Super League", country: "Greece" },
  SC1: { name: "Premiership", country: "Scotland" },
  DK1: { name: "Superliga", country: "Denmark" },
};

export function leagueName(id: string): string {
  const l = LEAGUES[id];
  return l ? `${l.name}, ${l.country}` : id;
}

export function leagueCountry(id: string): string {
  return LEAGUES[id]?.country ?? id;
}

export const POSITIONS: Position[] = ["Goalkeeper", "Defender", "Midfield", "Attack"];

export const SUB_POSITIONS = catalog.sub_positions_by_position as Record<Position, string[]>;

export const TIER_NAMES = catalog.tier_names as TierName[];
export const TIER_BOUNDARIES_EUR = catalog.tier_boundaries_eur as [number, number, number];
export const MINUTES_PER_APPEARANCE_RANGE = catalog.minutes_per_appearance_range as [number, number];
export const DISCLAIMER = catalog.disclaimer;

export const MODEL_LABELS: Record<ModelId, { name: string; short: string; description: string }> = {
  A: {
    name: "Model A",
    short: "Full context",
    description: "Performance, age and position, plus the league and the club's strength.",
  },
  B: {
    name: "Model B",
    short: "Performance only",
    description: "Performance, age and position only. League and club are left out.",
  },
};

export interface FeatureMeta {
  label: string;
  /** How an input value is shown in explanations. */
  format: (v: number | string | null) => string;
}

const num = (digits: number, suffix = "") => (v: number | string | null) =>
  v === null ? "not given" : typeof v === "string" ? v : `${v.toFixed(digits)}${suffix}`;
const pct = (v: number | string | null) =>
  v === null ? "not given" : typeof v === "string" ? v : `${Math.round(v * 100)}%`;
const text = (v: number | string | null) => (v === null ? "not given" : String(v));

export const FEATURES: Record<string, FeatureMeta> = {
  age: { label: "Age", format: num(1, " yrs") },
  height_in_cm: { label: "Height", format: num(0, " cm") },
  position: { label: "Position", format: text },
  sub_position: { label: "Role", format: text },
  foot: { label: "Preferred foot", format: text },
  valuation_league_id: { label: "League", format: (v) => (v === null ? "not given" : leagueName(String(v))) },
  club_ppg: { label: "Club points per game", format: num(2) },
  appearances: { label: "Appearances", format: num(0) },
  minutes: { label: "Minutes (2 years)", format: (v) => (typeof v === "number" ? `${Math.round(v).toLocaleString("en-GB")}` : text(v)) },
  minutes_per_appearance: { label: "Minutes per appearance", format: num(0) },
  start_share: { label: "Share of games started", format: pct },
  goals_p90: { label: "Goals per 90", format: num(2) },
  assists_p90: { label: "Assists per 90", format: num(2) },
  goal_contrib_p90: { label: "Goal contributions per 90", format: num(2) },
  yellow_p90: { label: "Yellow cards per 90", format: num(2) },
  red_p90: { label: "Red cards per 90", format: num(3) },
  intl_club_minutes_share: { label: "European-cup minute share", format: pct },
  minutes_last_365: { label: "Minutes (last 365 days)", format: (v) => (typeof v === "number" ? `${Math.round(v).toLocaleString("en-GB")}` : text(v)) },
  days_since_last_match: { label: "Days since last match", format: num(0) },
  valuation_club_minutes_share: { label: "Minutes at current club", format: pct },
};

export function featureLabel(feature: string): string {
  return FEATURES[feature]?.label ?? feature;
}
