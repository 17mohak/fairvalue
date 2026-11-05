import { describe, expect, it } from "vitest";
import research from "@/data/research.json";
import { traitApplies, traitValue } from "./compare";
import type { PlayerProfile } from "./players";
import { PAIRS, SHOWCASE, showcasePlayer, STORIES, STORY_FORMATS } from "./stories";

describe("stories registry", () => {
  it("only tells stories about players in the committed showcase, with published explanations", () => {
    for (const s of STORIES) for (const id of s.players) expect(showcasePlayer(id)?.explanation, `${s.slug} -> ${id}`).toBeTruthy();
  });

  it("pairs head-to-heads within one position, so their inputs are comparable", () => {
    for (const [a, b] of PAIRS) expect(showcasePlayer(a)!.position).toBe(showcasePlayer(b)!.position);
  });

  it("takes the research headline from research.json, not from hand-typed text", () => {
    const lead = STORIES.find((s) => s.format === "research")!;
    const gap = research.headline.A.signed_gap_league_stratified.estimate;
    expect(lead.dek).toContain(`+${gap.toFixed(3)}`);
    expect(lead.dek).toContain(`${Math.round(Math.expm1(gap) * 100)}%`);
  });

  it("publishes no spotlight while licensed imagery is missing, and says why", () => {
    const f = STORY_FORMATS.find((x) => x.id === "spotlight")!;
    expect(f.needs).toMatch(/licensed/);
    expect(STORIES.some((s) => s.format === "spotlight")).toBe(false);
  });

  it("has unique slugs and hrefs", () => {
    expect(new Set(STORIES.map((s) => s.slug)).size).toBe(STORIES.length);
    expect(new Set(STORIES.map((s) => s.href)).size).toBe(STORIES.length);
  });
});

describe("comparison traits", () => {
  it("never places a goalkeeper on goals or assists axes", () => {
    const keeper = { ...SHOWCASE[0]!, position: "Goalkeeper" } as PlayerProfile;
    expect(traitApplies(keeper, "goals_p90")).toBe(false);
    expect(traitValue(keeper, "assists_p90")).toBeNull();
    expect(traitValue(keeper, "minutes")).toBe(keeper.features.minutes);
  });
});
