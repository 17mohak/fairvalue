// Stories: the editorial environment's catalogue (D-038).
//
// Every story is assembled from committed, verified outputs: the research JSON and the
// eight-player showcase (published SHAP explanations). Nothing here is free-written about a
// player beyond what those outputs contain; titles and standfirsts are generated from the data.
// Formats that need material this build does not have (licensed portraits, match data) say so.

import showcase from "@/data/players.json";
import research from "@/data/research.json";
import { leagueName, TIER_BOUNDARIES_EUR } from "@/lib/football";
import { formatEur, signed } from "@/lib/format";
import type { PlayerProfile } from "@/lib/players";

export type StoryFormat = "spotlight" | "valuation" | "head-to-head" | "market" | "research";

export interface FormatInfo {
  id: StoryFormat;
  label: string;
  summary: string;
  /** Set when the format cannot be published honestly with this build's material. */
  needs?: string;
}

export const STORY_FORMATS: FormatInfo[] = [
  { id: "research", label: "Research", summary: "What the fairness audit found, and what it does not mean." },
  { id: "valuation", label: "Valuation", summary: "One estimate, input by input, from the model's starting point to its answer." },
  { id: "head-to-head", label: "Head-to-Head", summary: "Two players on one scale: the market, the model and what separates them." },
  { id: "market", label: "Market", summary: "Patterns across the fourteen covered leagues." },
  {
    id: "spotlight",
    label: "Player Spotlight",
    summary: "Immersive features built around a player's image and season.",
    needs: "Spotlights are built around licensed photography and match-by-match data. Neither is cleared for this build, so none are published.",
  },
];

export interface Story {
  slug: string;
  href: string;
  format: StoryFormat;
  formatLabel: string;
  title: string;
  dek: string;
  /** What the story is built from, shown on every card and in every byline. */
  basis: string;
  players: number[];
  chapters: number;
}

export const SHOWCASE = (showcase as unknown as { players: PlayerProfile[] }).players;
export const showcasePlayer = (id: number) => SHOWCASE.find((p) => p.id === id);

const h = research.headline;
const gapA = h.A.signed_gap_league_stratified;
const gapB = h.B.signed_gap_league_stratified;
const leagues = research.market.leagues;
const emergingLeagues = leagues.filter((l) => (l.median_value_eur ?? 0) < TIER_BOUNDARIES_EUR[0]).length;
const top = [...leagues].sort((a, b) => (b.median_value_eur ?? 0) - (a.median_value_eur ?? 0))[0]!;

const SHAP_BASIS = "Published SHAP output for the served Model A (reports/explainability); the player was in its training data.";

function valuationStory(p: PlayerProfile): Story {
  const est = Math.exp(p.explanation!.predicted_log_value);
  const base = Math.exp(p.explanation!.base_log_value);
  return {
    slug: `valuation-${p.slug}`,
    href: `/stories/valuation/${p.slug}`,
    format: "valuation",
    formatLabel: "Valuation",
    title: `Inside a valuation: ${p.name}`,
    dek: `From the model's ${formatEur(base)} starting point to ${formatEur(est)}, one input at a time, and where that lands against an observed ${formatEur(p.market_value_eur)}.`,
    basis: SHAP_BASIS,
    players: [p.id],
    // Intro, starting point, the five largest inputs, the rest, the estimate, the caveats.
    chapters: Math.min(5, p.explanation!.contributions.length) + (p.explanation!.contributions.length > 5 ? 1 : 0) + 4,
  };
}

/** Head-to-heads pair players in the same position, so their inputs are comparable. */
export const PAIRS: [number, number][] = [
  [849520, 405398],
  [463618, 126665],
];

function pairStory([a, b]: [number, number]): Story | null {
  const pa = showcasePlayer(a);
  const pb = showcasePlayer(b);
  if (!pa || !pb || !pa.explanation || !pb.explanation || pa.position !== pb.position) return null;
  const ra = Math.exp(pa.explanation.predicted_log_value) / pa.market_value_eur;
  const rb = Math.exp(pb.explanation.predicted_log_value) / pb.market_value_eur;
  const relation =
    ra >= 1 !== rb >= 1
      ? "The model reads them in opposite directions against the market."
      : `The model sits ${ra >= 1 ? "above" : "below"} the market for both, by different margins.`;
  return {
    slug: `h2h-${a}-${b}`,
    href: `/stories/head-to-head/${a}-vs-${b}`,
    format: "head-to-head",
    formatLabel: "Head-to-Head",
    title: `${pa.last_name} v ${pb.last_name}`,
    dek: `${pa.sub_position} in ${leagueName(pa.league_id).split(",")[0]} at ${formatEur(pa.market_value_eur)}, ${pb.sub_position.toLowerCase()} in ${leagueName(pb.league_id).split(",")[0]} at ${formatEur(pb.market_value_eur)}. ${relation}`,
    basis: SHAP_BASIS,
    players: [a, b],
    chapters: 4,
  };
}

const RESEARCH: Story = {
  slug: "the-gap-runs-the-other-way",
  href: "/stories/the-gap-runs-the-other-way",
  format: "research",
  formatLabel: "Research",
  title: "The gap runs the other way",
  dek: `A model that never sees nationality still misses one group in one direction: non-UEFA players' market values sit about ${Math.round(Math.expm1(gapA.estimate) * 100)}% above its estimates, relative to UEFA players in the same leagues (${signed(gapA.estimate)} log units). Without league and club, ${signed(gapB.estimate)}.`,
  basis: "Fairness audit outputs (reports/fairness, held-out predictions, league-stratified bootstrap intervals).",
  players: [],
  chapters: 7,
};

const MARKET: Story = {
  slug: "fourteen-leagues",
  href: "/stories/fourteen-leagues",
  format: "market",
  formatLabel: "Market",
  title: "Fourteen leagues, one price scale",
  dek: `The median ${leagueName(top.key).split(",")[0]} player is valued at ${formatEur(top.median_value_eur!)}. In ${emergingLeagues} of the fourteen covered leagues the median player sits below ${formatEur(TIER_BOUNDARIES_EUR[0], 0)}. What one model makes of that spread.`,
  basis: "Coverage and held-out error tables (reports/coverage, reports/models), modelling population of 5,820 players.",
  players: [],
  chapters: 4,
};

const valuations = SHOWCASE.filter((p) => p.explanation).sort((a, b) => b.market_value_eur - a.market_value_eur).map(valuationStory);
const pairs = PAIRS.map(pairStory).filter((s): s is Story => s !== null);

export const STORIES: Story[] = [RESEARCH, ...pairs.slice(0, 1), MARKET, ...valuations, ...pairs.slice(1)];

export function storyBySlug(slug: string): Story | undefined {
  return STORIES.find((s) => s.slug === slug);
}

export function storiesOf(format: StoryFormat): Story[] {
  return STORIES.filter((s) => s.format === format);
}

/** The lead story on the Stories cover and the featured story on the Overview. */
export const LEAD_STORY = RESEARCH;
