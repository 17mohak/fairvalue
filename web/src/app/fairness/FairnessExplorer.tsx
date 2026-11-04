"use client";

import Link from "next/link";
import { useState } from "react";
import { Dumbbell } from "@/components/charts/Dumbbell";
import { IntervalPlot } from "@/components/charts/IntervalPlot";
import { Segmented } from "@/components/ui/Segmented";
import { MODEL_LABELS, type ModelId } from "@/lib/football";
import { decimal, formatEur, integer, logGapAsPercent, percent, percentagePoints, signed } from "@/lib/format";
import type { FairnessData } from "./data";
import styles from "./fairness.module.css";

const SECTIONS = [
  { id: "measure", label: "Measure" },
  { id: "finding", label: "Finding" },
  { id: "level", label: "Value level" },
  { id: "leagues", label: "Leagues" },
  { id: "groups", label: "Subgroups" },
  { id: "tiers", label: "Tiers" },
  { id: "robustness", label: "Robustness" },
  { id: "meaning", label: "Meaning" },
];

const pp = (v: number) => percentagePoints(v, 1);

export function FairnessExplorer({ data }: { data: FairnessData }) {
  const [model, setModel] = useState<ModelId>("A");
  const v = data[model];
  const other = model === "A" ? data.B : data.A;
  const sides: [string, string] = ["UEFA under-predicted", "non-UEFA under-predicted"];

  return (
    <>
      <div className={styles.bar}>
        <div className={`page ${styles.barInner}`}>
          <nav aria-label="Audit sections" className={styles.sectionNav}>
            {SECTIONS.map((s) => (
              <a key={s.id} href={`#${s.id}`}>
                {s.label}
              </a>
            ))}
          </nav>
          <div className={styles.modelSwitch}>
            <Segmented
              legend="Results for"
              hideLegend
              name="audit-model"
              value={model}
              onChange={setModel}
              options={[
                { value: "A", label: "Model A" },
                { value: "B", label: "Model B" },
              ]}
            />
          </div>
        </div>
      </div>

      <div className="page">
        <p className={styles.modelNote} aria-live="polite">
          Showing {MODEL_LABELS[model].name}: {MODEL_LABELS[model].description.toLowerCase()}
        </p>

        <section id="measure" className={styles.section} aria-labelledby="measure-title">
          <h2 id="measure-title" className={styles.h2}>
            What was measured
          </h2>
          <dl className={styles.defs}>
            <div>
              <dt>Residual</dt>
              <dd>
                Actual Transfermarkt value minus the model&apos;s estimate, on the log scale. Positive means the model{" "}
                <strong>under-predicted</strong> the player.
              </dd>
            </div>
            <div>
              <dt>Gap</dt>
              <dd>Mean residual of non-UEFA players minus that of UEFA players. Positive means non-UEFA players are under-predicted more.</dd>
            </div>
            <div>
              <dt>Within leagues</dt>
              <dd>Gaps are computed inside each league, then weighted by where non-UEFA players play, so league mix cannot create the gap.</dd>
            </div>
            <div>
              <dt>Held out</dt>
              <dd>Every residual comes from a model that never saw that player (5-fold cross-validation). Group is never used in training.</dd>
            </div>
            <div>
              <dt>Uncertainty</dt>
              <dd>95% intervals from a 2,000-replicate stratified bootstrap of the held-out predictions. They do not include refit variance.</dd>
            </div>
            <div>
              <dt>Groups</dt>
              <dd>
                UEFA or non-UEFA by the confederation of a player&apos;s first-listed citizenship. Dual nationals are classified by that first
                entry.
              </dd>
            </div>
          </dl>
        </section>

        <section id="finding" className={styles.section} aria-labelledby="finding-title">
          <h2 id="finding-title" className={styles.h2}>
            Non-UEFA players are under-predicted relative to UEFA players
          </h2>
          <div className={styles.twoCol}>
            <div className="prose">
              <p>
                Under {MODEL_LABELS[model].name}, the within-league gap is <strong className="num">{signed(v.gap.estimate)}</strong> (95% CI{" "}
                <span className="num">
                  {signed(v.gap.low)} to {signed(v.gap.high)}
                </span>
                ): non-UEFA players&apos; values sit about {logGapAsPercent(v.gap.estimate)} above the model&apos;s estimate, relative to UEFA players
                in the same leagues. In euros that is about <span className="num">{formatEur(v.gapEur.estimate)}</span> per player (
                <span className="num">
                  {formatEur(v.gapEur.low)} to {formatEur(v.gapEur.high)}
                </span>
                ), a figure dominated by expensive players.
              </p>
              <p>
                Accuracy is close for the two groups: mean absolute error {decimal(v.accuracy.maeUefa, 3)} for UEFA and{" "}
                {decimal(v.accuracy.maeNon, 3)} for non-UEFA players, a within-league difference of {signed(v.accuracy.maeGap.estimate)} (
                {signed(v.accuracy.maeGap.low)} to {signed(v.accuracy.maeGap.high)}). The model misses both groups by similar amounts; it misses
                them in opposite directions.
              </p>
              <p>
                Removing league and club context moves the gap from {signed(data.A.gap.estimate)} (Model A) to {signed(data.B.gap.estimate)}{" "}
                (Model B), a paired difference of {signed(data.aMinusB.estimate)} ({signed(data.aMinusB.low)} to {signed(data.aMinusB.high)}).
                Context accounts for part of the gap; a clear gap remains after it.
              </p>
            </div>
            <IntervalPlot
              rows={v.residuals}
              axisLabel="Mean residual and gap, log scale, 95% CI"
              sides={["over-predicted", "under-predicted"]}
              caption={`For comparison, ${model === "A" ? "Model B" : "Model A"}'s within-league gap is ${signed(other.gap.estimate)}.`}
              tableCaption="Mean residuals and gaps"
            />
          </div>
        </section>

        <section id="level" className={styles.section} aria-labelledby="level-title">
          <h2 id="level-title" className={styles.h2}>
            It is not explained by how valuable players are
          </h2>
          <div className={styles.twoCol}>
            <div className="prose">
              <p>
                Residuals drift with value (estimates are pulled towards the middle), and non-UEFA players in this population are worth more on
                average. So the comparison was repeated inside each tenth of the model&apos;s own predictions. Binning on the prediction, not the
                actual value, avoids conditioning on the outcome.
              </p>
              <p>
                Non-UEFA players are under-predicted relative to UEFA players in every decile. Pooled within deciles the gap is{" "}
                <strong className="num">{signed(v.calibration.byDecile.estimate)}</strong> ({signed(v.calibration.byDecile.low)} to{" "}
                {signed(v.calibration.byDecile.high)}); within league and decile, {signed(v.calibration.byLeagueDecile.estimate)}.
              </p>
            </div>
            <Dumbbell
              rows={v.deciles}
              axisLabel="Mean residual by decile of predicted value (1 = lowest), log scale"
              tableCaption="Mean residual by predicted-value decile"
            />
          </div>
        </section>

        <section id="leagues" className={styles.section} aria-labelledby="leagues-title">
          <h2 id="leagues-title" className={styles.h2}>
            The gap is concentrated in a few leagues
          </h2>
          <div className={styles.twoCol}>
            <div className="prose">
              <p>
                Under Model A the gap is largest in Russia, Türkiye, Greece, Ukraine and Belgium. In England, Italy, France, Portugal and Germany
                it is close to zero, with intervals that include zero.
              </p>
              <p>
                Leagues with fewer than 100 non-UEFA players are shown with hollow markers: the audit reports them only as part of the pooled
                estimate. This is a description of where the gap sits, not an explanation of why.
              </p>
            </div>
            <IntervalPlot
              rows={v.leagues}
              sides={sides}
              axisLabel="Within-league signed gap, log scale, 95% CI"
              tableCaption="Signed gap by league"
            />
          </div>
        </section>

        <section id="groups" className={styles.section} aria-labelledby="groups-title">
          <h2 id="groups-title" className={styles.h2}>
            Which non-UEFA players
          </h2>
          <div className={styles.twoCol}>
            <div className="prose">
              <p>
                The gap is larger for recent arrivals and South American players, and smaller for players born in UEFA countries and for those
                established in these leagues. That pattern fits the idea that migrants reach these leagues through a stricter filter, which the
                model cannot see. It does not prove it, and the intervals overlap.
              </p>
              <p>Subgroups are descriptive. With this many comparisons, some intervals will exclude zero by chance.</p>
            </div>
            <div className={styles.stack}>
              {v.strata.map((g) => (
                <div key={g.title}>
                  <h3 className={styles.h3}>
                    {g.title}
                    {g.note && <span className={styles.h3Note}>{g.note}</span>}
                  </h3>
                  <IntervalPlot rows={g.rows} domain={[-0.15, 0.3]} axisLabel="Within-league signed gap vs UEFA, log scale" tableCaption={g.title} />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="tiers" className={styles.section} aria-labelledby="tiers-title">
          <h2 id="tiers-title" className={styles.h2}>
            Tier errors lean the same way
          </h2>
          <div className={styles.twoCol}>
            <div className="prose">
              <p>
                The separate tier classifier puts {percent(v.tiers.errorUefa)} of UEFA players and {percent(v.tiers.errorNon)} of non-UEFA
                players in the wrong tier. The extra errors for non-UEFA players are mostly placements below their actual tier, consistent with the
                value under-prediction.
              </p>
              <p>
                Per-tier comparisons rest on small groups: only 94 non-UEFA players are World Class and 246 Elite. Those intervals are wide enough
                to fit no gap or a sizeable one, so they are not read as evidence either way. No fairness threshold is claimed to be met.
              </p>
            </div>
            <div className={styles.stack}>
              <IntervalPlot
                rows={v.tiers.summary}
                format={pp}
                axisLabel="Non-UEFA minus UEFA, percentage points, 95% CI"
                sides={["worse for UEFA", "worse for non-UEFA"]}
                tableCaption="Tier classification error gaps"
              />
              <div>
                <h3 className={styles.h3}>Correctly identified, by tier</h3>
                <IntervalPlot
                  rows={v.tiers.perTier}
                  format={pp}
                  domain={[-0.2, 0.15]}
                  axisLabel="True-positive-rate gap, non-UEFA minus UEFA, percentage points"
                  tableCaption="True-positive-rate gap by tier"
                />
              </div>
            </div>
          </div>
        </section>

        <section id="robustness" className={styles.section} aria-labelledby="robustness-title">
          <h2 id="robustness-title" className={styles.h2}>
            Attempts to make it go away
          </h2>
          <div className={styles.twoCol}>
            <div className="prose">
              <p>
                The sign of the gap survives every check the audit ran: resampling whole clubs instead of players, comparing players with the same
                predicted value, raising the minutes threshold to 900, holding out entire clubs, and swapping the algorithm.
              </p>
              <p>
                Players at the same club are not independent (residual intra-club correlation{" "}
                {decimal(data.icc.find((i) => i.model === model)!.icc_residual_within_club, 2)} under {MODEL_LABELS[model].name}), which is why the
                club-clustered interval is shown. Points without whiskers are point estimates only.
              </p>
              <p>
                Among Model A&apos;s largest 5% of under-predictions, {percent(data.worstA.under)} are non-UEFA players, against{" "}
                {percent(data.worstA.overall)} of all players; among the largest over-predictions, {percent(data.worstA.over)}.
              </p>
            </div>
            <IntervalPlot rows={v.robustness} domain={[0, 0.25]} axisLabel="Within-league signed gap, log scale" tableCaption="Robustness checks" />
          </div>
        </section>

        <section id="meaning" className={styles.section} aria-labelledby="meaning-title">
          <h2 id="meaning-title" className={styles.h2}>
            What this can and cannot establish
          </h2>
          <div className={styles.meaning}>
            <div>
              <h3 className={styles.h3}>Supported, within this population</h3>
              <ul>
                <li>
                  A nationality-blind model trained on performance, profile and context under-predicts non-UEFA players&apos; Transfermarkt values
                  relative to UEFA players in the same leagues and at the same predicted value.
                </li>
                <li>Absolute accuracy is similar for both groups.</li>
                <li>
                  League mix, value level, the minutes threshold and familiarity with the club do not explain it. It is concentrated in a subset
                  of leagues.
                </li>
                <li>
                  The original hypothesis, that non-UEFA players would get lower value-tier outcomes than comparable UEFA players, is not
                  supported here.
                </li>
              </ul>
            </div>
            <div>
              <h3 className={styles.h3}>Not established</h3>
              <ul>
                <li>That anyone discriminates, in either direction.</li>
                <li>That nationality causes higher or lower valuations.</li>
                <li>Anything about players outside these 14 leagues or below 450 minutes.</li>
                <li>That the model is &ldquo;fair&rdquo; or &ldquo;compliant&rdquo; by any threshold.</li>
              </ul>
            </div>
            <div>
              <h3 className={styles.h3}>Explanations the study cannot separate</h3>
              <ol>
                <li>Selection: non-UEFA players pass a stricter filter to reach these leagues, on qualities the data does not record.</li>
                <li>Excluded variables: caps were left out as a nationality proxy, and contract and agent data are unavailable.</li>
                <li>League market structure: the gap sits mostly in RU1, TR1, GR1, UKR1 and BE1.</li>
                <li>Valuation practice: how Transfermarkt&apos;s community values imported players. The target itself may be biased.</li>
              </ol>
            </div>
          </div>
          <p className={styles.scope}>
            Population: {integer(data.population.total)} players ({integer(data.population.non_uefa)} non-UEFA) at clubs in 14 European first
            divisions, valued June 2025 to June 2026, with at least 450 club minutes in two years. A selected population, not the global market.
            Full write-up and tables in the repository: <code>docs/reports/FAIRNESS_AUDIT.md</code>. You can also <Link href="/studio">try a profile</Link>.
          </p>
        </section>
      </div>
    </>
  );
}
