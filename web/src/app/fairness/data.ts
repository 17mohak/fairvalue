// Server-side view model for the fairness explorer: picks and labels the audit outputs per model.
// Only reshaping happens here; every number is read from src/data/research.json.

import type { DumbbellRow } from "@/components/charts/Dumbbell";
import type { IntervalRow } from "@/components/charts/IntervalPlot";
import { leagueCountry, LEAGUES, type ModelId } from "@/lib/football";
import { integer } from "@/lib/format";
import { research, type Interval } from "@/lib/research";

const point = (v: number): Interval => ({ estimate: v, low: v, high: v });

const STRATA_GROUPS: { title: string; note?: string; rows: { key: string; label: string }[] }[] = [
  {
    title: "Time in these leagues",
    rows: [
      { key: "recent arrivals", label: "Recent arrivals" },
      { key: "established (not recent arrivals)", label: "Established players" },
    ],
  },
  {
    title: "Background",
    rows: [
      { key: "CONMEBOL vs UEFA", label: "South American (CONMEBOL)" },
      { key: "CAF vs UEFA", label: "African (CAF)" },
      { key: "diaspora-born non-UEFA vs UEFA", label: "Born in a UEFA country" },
      { key: "other non-UEFA vs UEFA", label: "Born outside UEFA countries" },
    ],
  },
  {
    title: "Position",
    rows: [
      { key: "position: Attack", label: "Attack" },
      { key: "position: Midfield", label: "Midfield" },
      { key: "position: Defender", label: "Defence" },
      { key: "position: Goalkeeper", label: "Goalkeeper" },
    ],
  },
  {
    title: "Different UEFA comparison group",
    note: "Exploratory",
    rows: [
      { key: "non-UEFA vs EU-mobile UEFA (exploratory)", label: "vs EU-mobile UEFA players" },
      { key: "non-UEFA vs other UEFA (exploratory)", label: "vs other UEFA players" },
    ],
  },
];

const ALGORITHMS: Record<string, string> = {
  ridge: "Ridge regression",
  random_forest: "Random forest",
  hgb: "Gradient boosting, default",
  hgb_tuned: "Gradient boosting, tuned (primary)",
};

export interface ModelView {
  residuals: IntervalRow[];
  accuracy: { maeUefa: number; maeNon: number; maeGap: Interval; rmseGap: Interval };
  gap: Interval;
  gapEur: Interval;
  deciles: DumbbellRow[];
  calibration: { byDecile: Interval; byLeagueDecile: Interval };
  leagues: IntervalRow[];
  strata: { title: string; note?: string; rows: IntervalRow[] }[];
  tiers: {
    errorUefa: number;
    errorNon: number;
    summary: IntervalRow[];
    perTier: IntervalRow[];
  };
  robustness: IntervalRow[];
}

function modelView(m: ModelId): ModelView {
  const h = research.headline[m];
  const cal = research.calibration[m];
  const tiers = research.tiers.classifier[m];
  const strata = Object.fromEntries(research.strata.map((s) => [s.stratum, s]));
  const clustered = research.robustness.clustered.find((c) => c.metric === `${m}_signed_gap_league_stratified`)!;
  const grouped = research.robustness.grouped_cv.find((g) => g.model === m && g.cv_scheme === "grouped by club")!;
  const power = research.tiers.power.filter((p) => p.model === m && p.rate === "TPR");

  return {
    gap: h.signed_gap_league_stratified,
    gapEur: h.signed_gap_eur_league_stratified,
    residuals: [
      { key: "uefa", label: "UEFA players", sublabel: "mean residual", interval: h.mean_residual_uefa, tone: "uefa" },
      { key: "non", label: "Non-UEFA players", sublabel: "mean residual", interval: h.mean_residual_non_uefa, tone: "non-uefa" },
      { key: "raw", label: "Gap, raw", sublabel: "non-UEFA minus UEFA", interval: h.signed_gap_raw },
      { key: "strat", label: "Gap, within leagues", sublabel: "primary measure", interval: h.signed_gap_league_stratified, emphasis: true },
    ],
    accuracy: { maeUefa: h.mae_uefa.estimate, maeNon: h.mae_non_uefa.estimate, maeGap: h.mae_gap_league_stratified, rmseGap: h.rmse_gap_raw },
    deciles: cal.deciles.map((d) => ({ key: String(d.decile), label: `Decile ${d.decile}`, uefa: d.mean_residual_uefa, nonUefa: d.mean_residual_non_uefa })),
    calibration: { byDecile: cal.stratified_by_decile, byLeagueDecile: cal.stratified_by_league_and_decile },
    leagues: [...research.leagues]
      .sort((a, b) => b[m].estimate - a[m].estimate)
      .map((l) => ({
        key: l.league,
        label: LEAGUES[l.league] ? `${LEAGUES[l.league]!.name}` : l.league,
        sublabel: `${leagueCountry(l.league)}, ${l.n_non_uefa} non-UEFA${l.league_level_estimate ? "" : " (pooled only)"}`,
        interval: l[m],
        hollow: !l.league_level_estimate,
        n: l.n_non_uefa,
      })),
    strata: STRATA_GROUPS.map((g) => ({
      title: g.title,
      note: g.note,
      rows: g.rows.map((r) => {
        const s = strata[r.key]!;
        return { key: r.key, label: r.label, sublabel: `${integer(s.n_non_uefa)} non-UEFA`, interval: s[m] };
      }),
    })),
    tiers: {
      errorUefa: tiers.error_rate_uefa.estimate,
      errorNon: tiers.error_rate_non_uefa.estimate,
      summary: [
        { key: "er1a", label: "Wrong tier", sublabel: "error-rate gap (ER1a)", interval: tiers.er1a_error_rate_gap, emphasis: true },
        { key: "under", label: "Placed below true tier", sublabel: "under-tier gap", interval: tiers.under_tier_gap },
        { key: "over", label: "Placed above true tier", sublabel: "over-tier gap", interval: tiers.over_tier_gap },
      ],
      perTier: tiers.per_tier.map((t) => {
        const p = power.find((x) => x.tier === t.tier)!;
        return {
          key: t.tier,
          label: t.tier,
          sublabel: `${p.n_non_uefa} non-UEFA; detectable gap ≈ ${p.min_detectable_difference_pp} pp`,
          interval: t.tpr_gap,
        };
      }),
    },
    robustness: [
      { key: "primary", label: "Primary estimate", sublabel: "player-level bootstrap", interval: h.signed_gap_league_stratified, emphasis: true },
      { key: "club", label: "Club-clustered interval", sublabel: "resampling whole clubs", interval: { estimate: clustered.estimate, low: clustered.club.low, high: clustered.club.high } },
      { key: "decile", label: "Within predicted-value deciles", sublabel: "same predicted value", interval: cal.stratified_by_decile },
      { key: "league-decile", label: "Within league and decile", interval: cal.stratified_by_league_and_decile },
      { key: "900", label: "900-minute threshold", sublabel: "sensitivity population", interval: strata["minutes >= 900 (sensitivity)"]![m] },
      { key: "unseen", label: "Clubs the model never saw", sublabel: "club-grouped CV, point estimate", interval: point(grouped.signed_gap_league_stratified), pointOnly: true },
      ...research.robustness.algorithms
        .filter((a) => a.model === m)
        .map((a) => ({
          key: `alg-${a.algorithm}`,
          label: ALGORITHMS[a.algorithm] ?? a.algorithm,
          sublabel: "point estimate",
          interval: point(a.signed_gap_league_stratified),
          pointOnly: true,
        })),
    ],
  };
}

export function fairnessData() {
  const worst = research.robustness.worst_errors.filter((w) => w.model === "Model A");
  const funnel = research.population.funnel;
  return {
    A: modelView("A"),
    B: modelView("B"),
    aMinusB: research.headline.A_minus_B.signed_gap_league_stratified,
    population: funnel[funnel.length - 1]!,
    worstA: {
      under: worst.find((w) => w.set.startsWith("largest under"))!.nonUEFA_share_in_set,
      over: worst.find((w) => w.set.startsWith("largest over"))!.nonUEFA_share_in_set,
      overall: worst[0]!.nonUEFA_share_overall,
    },
    proxyAuc: research.population.proxy_auc,
    icc: research.robustness.residual_icc,
  };
}

export type FairnessData = ReturnType<typeof fairnessData>;
