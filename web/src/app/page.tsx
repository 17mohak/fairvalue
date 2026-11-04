import Link from "next/link";
import { IntervalPlot } from "@/components/charts/IntervalPlot";
import { ValueRuler } from "@/components/charts/ValueRuler";
import { ButtonLink } from "@/components/ui/Button";
import type { PredictResponse } from "@/lib/api/types";
import { fetchUpstream } from "@/lib/api/upstream";
import { leagueName } from "@/lib/football";
import { decimal, formatEur, integer, logGapAsPercent, signed } from "@/lib/format";
import { DEFAULT_PLAYER } from "@/lib/profile";
import { heldOutLogR2, research } from "@/lib/research";
import styles from "./page.module.css";

// Rendered per request so the hero's live estimate works even when the API was down at build
// time; the upstream fetch itself is cached for an hour (lib/api/upstream.ts).
export const dynamic = "force-dynamic";

const h = research.headline;
const proxyAuc = research.population.proxy_auc[0]!.auc;
const funnel = research.population.funnel;
const population = funnel[funnel.length - 1]!;
const topShap = research.shap_global.A.slice(0, 3);

export default async function Home() {
  const example = await fetchUpstream<PredictResponse>("/predict", { player: DEFAULT_PLAYER, model: "A" });
  const p = DEFAULT_PLAYER;
  const profile = `a ${Math.floor(p.age)}-year-old ${p.sub_position.toLowerCase()} in ${leagueName(p.valuation_league_id).split(",")[0]}, ${decimal(p.goals_p90 + p.assists_p90, 2)} goal contributions per 90`;

  return (
    <>
      <section className={`page ${styles.hero}`} aria-labelledby="hero-title">
        <h1 id="hero-title" className={styles.title}>
          Price the player.
          <br />
          Then audit the price.
        </h1>
        <div className={styles.heroCols}>
          <p className={styles.lede}>
            FairValue estimates a footballer&apos;s market value from two years of club data, shows why it landed where it did, and publishes an
            audit of whom its errors fall on: players from inside and outside UEFA, across 14 European leagues.
          </p>
          <div className={styles.actions}>
            <ButtonLink href="/studio">Value a player</ButtonLink>
            <ButtonLink href="/fairness" variant="quiet">
              Read the audit
            </ButtonLink>
          </div>
        </div>
        <div className={styles.heroRuler}>
          <ValueRuler
            intro
            ariaLabel={
              example
                ? `Live example: ${profile} is valued at ${formatEur(example.predicted_value_eur)}, ${example.predicted_tier} tier`
                : "Market value scale with tier boundaries at €2M, €10M and €30M"
            }
            marker={example ? { value: example.predicted_value_eur, label: formatEur(example.predicted_value_eur), variant: "primary" } : null}
          />
          <p className={styles.rulerNote}>
            {example ? (
              <>
                Live from the model: {profile}, valued at <span className="num">{formatEur(example.predicted_value_eur)}</span> (
                {example.predicted_tier}). <Link href="/studio">Change the profile</Link>
              </>
            ) : (
              <>The model service isn&apos;t answering right now, so there is no live example. The scale and tiers above are fixed definitions.</>
            )}
          </p>
        </div>
      </section>

      <section className={`page ${styles.section}`} aria-labelledby="context-title">
        <div className={styles.split}>
          <div>
            <h2 id="context-title" className={styles.h2}>
              Where a player plays explains more than how they play
            </h2>
            <div className="prose">
              <p>
                Two models learn from the same {integer(population.total)} players. Model A sees performance, age and position, plus the
                league and the club&apos;s strength. Model B sees only performance, age and position.
              </p>
              <p>
                On players held out of training, Model A explains <strong>{Math.round(heldOutLogR2("A") * 100)}%</strong> of the variation in
                (log) market value. Model B explains <strong>{Math.round(heldOutLogR2("B") * 100)}%</strong>. In Model A the three most
                influential inputs are the {topShap.map((s) => labelFor(s.feature)).join(", the ")}.
              </p>
            </div>
          </div>
          <figure className={styles.r2} aria-label="Held-out R squared for Model A and Model B">
            {(["A", "B"] as const).map((m) => (
              <div key={m} className={styles.r2Row}>
                <span className={styles.r2Name}>Model {m}</span>
                <span className={styles.r2Track}>
                  <span className={styles.r2Bar} data-model={m} style={{ width: `${heldOutLogR2(m) * 100}%` }} />
                </span>
                <span className={`${styles.r2Value} num`}>{decimal(heldOutLogR2(m), 3)}</span>
              </div>
            ))}
            <figcaption className={styles.r2Caption}>Held-out R² on log market value, 5-fold cross-validation.</figcaption>
          </figure>
        </div>
      </section>

      <section className={`page ${styles.section}`} aria-labelledby="audit-title">
        <h2 id="audit-title" className={styles.h2}>
          A nationality-blind model still errs by group
        </h2>
        <div className={styles.auditGrid}>
          <div className="prose">
            <p>
              Neither model ever sees nationality. Yet compared with UEFA players in the same leagues, non-UEFA players&apos; Transfermarkt values
              sit about <strong>{logGapAsPercent(h.A.signed_gap_league_stratified.estimate)}</strong> above what Model A predicts: a log gap of{" "}
              <strong className="num">{signed(h.A.signed_gap_league_stratified.estimate)}</strong> (95% CI{" "}
              <span className="num">
                {signed(h.A.signed_gap_league_stratified.low)} to {signed(h.A.signed_gap_league_stratified.high)}
              </span>
              ). Remove league and club, and the gap grows to <span className="num">{signed(h.B.signed_gap_league_stratified.estimate)}</span>.
            </p>
            <p>
              In plain terms, the model under-predicts non-UEFA players. The study set out expecting the opposite. Overall accuracy is similar for
              both groups; what differs is the direction of the errors.
            </p>
          </div>
          <div>
            <IntervalPlot
              rows={[
                { key: "A", label: "Model A", sublabel: "with league and club", interval: h.A.signed_gap_league_stratified, emphasis: true },
                { key: "B", label: "Model B", sublabel: "performance only", interval: h.B.signed_gap_league_stratified },
              ]}
              domain={[-0.05, 0.25]}
              axisLabel="Signed residual gap, non-UEFA minus UEFA (log scale, league-stratified, 95% CI)"
              sides={["UEFA under-predicted", "non-UEFA under-predicted"]}
              tableCaption="Signed residual gap by model"
            />
          </div>
        </div>
        <ul className={styles.cannot}>
          <li>
            <strong>Not evidence of discrimination.</strong> The target is Transfermarkt&apos;s own valuation, which may itself carry patterns
            that have nothing to do with ability.
          </li>
          <li>
            <strong>Not causal.</strong> Non-UEFA players reach these leagues through a stricter filter, and some value-relevant data (contracts,
            caps) was deliberately left out.
          </li>
          <li>
            <strong>Not the whole market.</strong> It covers {integer(population.total)} players at clubs in 14 European first divisions with at
            least 450 minutes in two years.
          </li>
        </ul>
        <p className={styles.more}>
          <Link href="/fairness">Explore the audit by league, tier and subgroup</Link>
        </p>
      </section>

      <section className={`page ${styles.section}`} aria-labelledby="sees-title">
        <h2 id="sees-title" className={styles.h2}>
          What the model sees, and what it never sees
        </h2>
        <div className={styles.sees}>
          <div>
            <h3 className={styles.h3}>Inputs</h3>
            <ul className={styles.list}>
              <li>Age, height, position, role and preferred foot</li>
              <li>Appearances, minutes, starts and how recently they played</li>
              <li>Goals, assists and cards per 90 minutes</li>
              <li>Share of minutes in European club competitions</li>
              <li>League and club strength (Model A only)</li>
            </ul>
          </div>
          <div>
            <h3 className={styles.h3}>Never inputs</h3>
            <ul className={`${styles.list} ${styles.never}`}>
              <li>Nationality and citizenship</li>
              <li>Confederation</li>
              <li>Place of birth</li>
              <li>National-team appearances and goals</li>
              <li>Earlier valuations</li>
            </ul>
          </div>
          <p className={styles.seesNote}>
            Leaving them out does not make the inputs group-blind. The allowed features still predict UEFA membership with an AUC of{" "}
            <span className="num">{proxyAuc.toFixed(2)}</span>, which is why the audit is needed at all.
          </p>
        </div>
      </section>

      <section className={`page ${styles.section}`} aria-labelledby="how-title">
        <h2 id="how-title" className={styles.h2}>
          How the numbers were made
        </h2>
        <ol className={styles.steps}>
          <li>
            <h3 className={styles.h3}>Fix the population first</h3>
            <p>
              {integer(population.total)} players ({integer(population.non_uefa)} non-UEFA) valued between June 2025 and June 2026, at clubs in 14
              leagues with match data, with at least 450 minutes. Population, questions and metrics are locked in the research design.
            </p>
          </li>
          <li>
            <h3 className={styles.h3}>Score only unseen players</h3>
            <p>
              Five-fold cross-validation, tuning nested inside each fold. Every metric and every audit number uses predictions for players the
              model was not trained on.
            </p>
          </li>
          <li>
            <h3 className={styles.h3}>Measure direction, not just size</h3>
            <p>
              Residual = actual − predicted. Gaps are compared within leagues and given 2,000-replicate bootstrap intervals, then rechecked
              with club-clustered intervals.
            </p>
          </li>
          <li>
            <h3 className={styles.h3}>Try to break it</h3>
            <p>
              The gap holds within predicted-value deciles, for every algorithm tried, at a 900-minute threshold, and for clubs the model never
              saw.
            </p>
          </li>
        </ol>
        <p className={styles.more}>
          <Link href="/methods">Read the methods</Link>
        </p>
      </section>

      <section className={`page ${styles.closing}`} aria-labelledby="try-title">
        <h2 id="try-title" className={styles.closingTitle}>
          Build a profile and see where it lands.
        </h2>
        <ButtonLink href="/studio">Open the valuation studio</ButtonLink>
      </section>
    </>
  );
}

function labelFor(feature: string): string {
  const names: Record<string, string> = {
    valuation_league_id: "league",
    age: "player's age",
    club_ppg: "club's points per game",
  };
  return names[feature] ?? feature.replace(/_/g, " ");
}
