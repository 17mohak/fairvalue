// Data for the research story's graphic, read straight from research.json.
import { leagueName } from "@/lib/football";
import { research } from "@/lib/research";
import type { GapData } from "@/components/stories/GapGraphic";

const STAGE_LABELS = ["Every player in the dataset", "With a current valuation", "Valued while in a covered league", "With 450+ club minutes in two years"];

export function gapData(): GapData {
  const h = research.headline;
  const funnel = research.population.funnel.slice(0, 4).map((f, i) => ({ label: STAGE_LABELS[i]!, total: f.total, uefa: f.uefa, non_uefa: f.non_uefa }));
  const est = research.leagues.filter((l) => l.league_level_estimate);
  return {
    funnel,
    mae: { uefa: h.A.mae_uefa, non_uefa: h.A.mae_non_uefa, gap: h.A.mae_gap_league_stratified },
    gapA: h.A.signed_gap_league_stratified,
    gapB: h.B.signed_gap_league_stratified,
    leagues: [...est].sort((a, b) => b.A.estimate - a.A.estimate).map((l) => ({ key: l.league, name: leagueName(l.league).split(",")[0]!, interval: l.A })),
    pooled: research.leagues.length - est.length,
  };
}
