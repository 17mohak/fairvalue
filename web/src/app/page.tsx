import { Suspense } from "react";
import { LeagueFlag } from "@/components/brand/Flag";
import { MarkKey, ModelMark, ObsMark, Residual, TierMark } from "@/components/brand/Marks";
import { GapGlyph } from "@/components/charts/GapGlyph";
import { CountUp } from "@/components/overview/CountUp";
import { DiscrepancyAxis } from "@/components/overview/DiscrepancyAxis";
import { Reveal } from "@/components/overview/Reveal";
import { ServiceLine } from "@/components/overview/ServiceLine";
import { ValuationTheatre } from "@/components/overview/ValuationTheatre";
import { MiniRuler } from "@/components/players/MiniRuler";
import { PortraitSlot } from "@/components/players/PortraitSlot";
import { ExpLink } from "@/components/site/ExpLink";
import { PageTransition } from "@/components/site/PageTransition";
import { SearchTrigger, ShortcutKbd } from "@/components/site/SearchTrigger";
import { leagueCountry, leagueName, TIER_BOUNDARIES_EUR, TIER_NAMES } from "@/lib/football";
import { decimal, formatEur, integer, logGapAsPercent, signed } from "@/lib/format";
import { factor } from "@/lib/journey";
import { playerSet } from "@/lib/players.server";
import { portraitFor } from "@/lib/portraits";
import { heldOutLogMae, heldOutLogR2, research } from "@/lib/research";
import { LEAD_STORY, storiesOf } from "@/lib/stories";
import { leadersByLeague, leadersByPosition, residualOf, shortName, topCast } from "@/lib/theatre";
import { LiveSpecimen, SpecimenSkeleton } from "./home/LiveSpecimen";
import styles from "./overview.module.css";

// Rendered per request so the live example reflects the API as it is now.
export const dynamic = "force-dynamic";

const h = research.headline;
const funnel = research.population.funnel;
const population = funnel.at(-1)!;
const gapA = h.A.signed_gap_league_stratified;
const gapB = h.B.signed_gap_league_stratified;
const short = (id: string) => leagueName(id).split(",")[0]!;
/** "4 + >= 450 club minutes in 2y window" -> "+ ≥ 450 club minutes in 2y window" (the pipeline's own wording). */
const stageLabel = (s: string) => s.replace(/^\d+\s+/, "").replace(">=", "≥");

const CHAPTERS = [
  { id: "theatre", no: "01", label: "The Theatre" },
  { id: "market", no: "02", label: "The Market" },
  { id: "discrepancy", no: "03", label: "The Discrepancy" },
  { id: "players", no: "04", label: "The Players" },
  { id: "research", no: "05", label: "The Research" },
];

function ChapterMark({ no, label }: { no: string; label: string }) {
  return (
    <p className={styles.chapterMark}>
      <span className={styles.chapterNo}>{no}</span>
      <span className={styles.chapterRule} aria-hidden="true" />
      <span>{label}</span>
    </p>
  );
}

export default function Overview() {
  const set = playerSet();
  const showcase = set.source === "showcase";
  const cast = topCast(set.players, showcase ? 8 : 7);
  const castRule = showcase ? "the eight research showcase players" : "the seven most valuable players in the population";
  const castBasis = cast.every((c) => c.basis === "heldout") ? "held-out" : "served, in-sample";
  // Say so when the cut-off falls inside a tie, so the selection rule stays visible.
  const nextInLine = showcase ? undefined : topCast(set.players, cast.length + 1)[cast.length];
  const tieAtCut = !!nextInLine && nextInLine.market_value_eur === cast.at(-1)?.market_value_eur;
  const spotlights = leadersByPosition(set.players);
  const leagueLeaders = leadersByLeague(set.players);

  const tiers = TIER_NAMES.map((t) => research.market.tiers.find((r) => r.key === t)!);
  const leagues = [...research.market.leagues].sort((a, b) => b.median_value_eur! - a.median_value_eur!);
  const LLO = Math.log(250_000);
  const LHI = Math.log(25_000_000);
  const lx = (eur: number) => Math.max(0, Math.min(100, ((Math.log(eur) - LLO) / (LHI - LLO)) * 100));
  const valuations = storiesOf("valuation");

  return (
    <PageTransition>
      <div className={styles.home}>
        {/* ======================================================= 01 · THE THEATRE */}
        <section id="theatre" className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.heroCopy}>
            <p className={styles.kicker}>
              <span className={styles.kickerPlate}>FairValue</span>
              <span>2025–26 snapshot</span>
              <span aria-hidden="true">·</span>
              <span>{leagues.length} leagues</span>
              <span aria-hidden="true">·</span>
              <span>{integer(population.total)} players</span>
            </p>
            <h1 id="hero-title" className={styles.title}>
              <span className={styles.solid}>Price the player.</span>
              <span className={styles.outline}>Audit the price.</span>
            </h1>
            <p className={styles.lede}>
              FairValue estimates footballers&apos; Transfermarkt market values, makes model predictions inspectable and investigates how prediction
              errors differ across groups.
            </p>
            <div className={styles.ctas}>
              <ExpLink href="/terminal" className={styles.ctaPrimary}>
                Open the Terminal <span aria-hidden="true">→</span>
              </ExpLink>
              <SearchTrigger className={styles.ctaSearch}>
                <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                  <circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
                <span>Find a player</span>
                <ShortcutKbd className={styles.ctaKbd} />
              </SearchTrigger>
            </div>
            <p className={styles.grammar}>
              <span>
                <ObsMark size={12} /> <b>Solid</b> what the market says
              </span>
              <span>
                <ModelMark size={13} /> <b>Outline</b> what the model says
              </span>
            </p>
          </div>

          <div className={styles.stage}>
            <ValuationTheatre cast={cast} rule={castRule} />
          </div>

          <nav className={styles.chapters} aria-label="Chapters on this page">
            <ol>
              {CHAPTERS.map((c) => (
                <li key={c.id}>
                  <a href={`#${c.id}`}>
                    <span className="num">{c.no}</span> {c.label}
                  </a>
                </li>
              ))}
            </ol>
            <p className={styles.heroNote}>
              Lanes: {castRule}. Pitch length is a log value scale fitted to them; Model A estimates are {castBasis}.
              {tieAtCut && ` Players tied at ${formatEur(nextInLine!.market_value_eur)} are taken in surname order.`} Hover or tab through the lanes.
            </p>
          </nav>
        </section>

        {/* ======================================================= 02 · THE MARKET */}
        <Reveal as="section" id="market" className={styles.chapter} aria-labelledby="market-title">
          <ChapterMark no="02" label="The Market" />
          <div className={styles.marketHead}>
            <h2 id="market-title" className={styles.h2}>
              <span className={styles.figure}>
                <CountUp value={population.total} />
              </span>{" "}
              players.{" "}
              <span className={styles.figure}>
                <CountUp value={leagues.length} duration={0.8} />
              </span>{" "}
              leagues. One season&apos;s snapshot.
            </h2>
            <p className={styles.copy}>
              The model learns from, and is audited on, a <strong>selected population</strong>: players with a Transfermarkt valuation in the last
              twelve months, valued while playing in one of fourteen covered leagues, with at least 450 club minutes in the two years before. It is
              not the global transfer market, and nothing here should be read as if it were.
            </p>
          </div>

          <div className={styles.marketGrid}>
            <figure className={styles.funnel} aria-labelledby="funnel-cap">
              <figcaption id="funnel-cap" className={styles.figLabel}>
                From dataset to modelling population
              </figcaption>
              <ol>
                {funnel.map((s, i) => (
                  <li key={s.stage} data-stagger style={{ ["--i" as string]: i }} data-final={i === funnel.length - 1 || undefined}>
                    <span className={styles.funnelBar} style={{ width: `${(s.total / funnel[0]!.total) * 100}%` }} />
                    <span className={styles.funnelText}>
                      <b className="num">{integer(s.total)}</b>
                      <span>{stageLabel(s.stage)}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </figure>

            <figure className={styles.tiers} aria-labelledby="tiers-cap">
              <figcaption id="tiers-cap" className={styles.figLabel}>
                Observed value tiers
              </figcaption>
              <div className={styles.tierBand} role="img" aria-label={tiers.map((t) => `${t.key}: ${integer(t.n)} players`).join(", ")}>
                {tiers.map((t, i) => (
                  <span key={t.key} data-stagger style={{ flexGrow: t.n, ["--i" as string]: i }} data-tier={i}>
                    <b className="num">{integer(t.n)}</b>
                  </span>
                ))}
              </div>
              <ol className={styles.tierKey}>
                {tiers.map((t, i) => (
                  <li key={t.key}>
                    <TierMark tier={t.key as (typeof TIER_NAMES)[number]} />
                    <span className="num">
                      {i === 0
                        ? `under ${formatEur(TIER_BOUNDARIES_EUR[0])}`
                        : i === 3
                          ? `${formatEur(TIER_BOUNDARIES_EUR[2])} and above`
                          : `${formatEur(TIER_BOUNDARIES_EUR[i - 1]!)}–${formatEur(TIER_BOUNDARIES_EUR[i]!)}`}
                    </span>
                    <span className="num">{((t.n / population.total) * 100).toFixed(0)}%</span>
                  </li>
                ))}
              </ol>
            </figure>

            <figure className={styles.leagues} aria-labelledby="leagues-cap">
              <figcaption id="leagues-cap" className={styles.figLabel}>
                Median observed value by league <small>log scale · held-out typical error, Model A</small>
              </figcaption>
              <ol className={styles.ladder}>
                {leagues.map((l, i) => (
                  <li key={l.key} data-stagger style={{ ["--i" as string]: Math.min(i, 8) }}>
                    <span className={styles.ladderName}>
                      <LeagueFlag leagueId={l.key} />
                      <b>{short(l.key)}</b>
                      <small>{leagueCountry(l.key)}</small>
                    </span>
                    <span className={styles.ladderTrack} aria-hidden="true">
                      {TIER_BOUNDARIES_EUR.slice(0, 2).map((b) => (
                        <i key={b} style={{ left: `${lx(b)}%` }} />
                      ))}
                      <span className={styles.ladderStem} style={{ width: `${lx(l.median_value_eur!)}%` }} />
                      <span className={styles.ladderDot} style={{ left: `${lx(l.median_value_eur!)}%` }} />
                    </span>
                    <span className={`${styles.ladderVal} num`}>{formatEur(l.median_value_eur!)}</span>
                    <span className={`${styles.ladderN} num`} title="Players in the modelling population">
                      {integer(l.total)}
                    </span>
                    <span className={`${styles.ladderErr} num`} title="Held-out mean absolute error, log scale, Model A">
                      {decimal(l.A.mae!, 2)}
                    </span>
                  </li>
                ))}
              </ol>
              <p className={styles.ladderScale} aria-hidden="true">
                <span />
                <span className={styles.ladderTicks}>
                  {[500_000, 2_000_000, 10_000_000].map((t) => (
                    <i key={t} style={{ left: `${lx(t)}%` }}>
                      {formatEur(t)}
                    </i>
                  ))}
                </span>
                <span>median</span>
                <span>players</span>
                <span>error</span>
              </p>
            </figure>
          </div>
          <p className={styles.chapterLinks}>
            <ExpLink href="/terminal/market">Market Landscape →</ExpLink>
            <ExpLink href="/terminal/leagues">League Landscape →</ExpLink>
            <ExpLink href="/stories/fourteen-leagues">The fourteen-leagues story →</ExpLink>
          </p>
        </Reveal>

        {/* ======================================================= 03 · THE DISCREPANCY */}
        <Reveal as="section" id="discrepancy" className={`${styles.chapter} ${styles.discrepancy}`} aria-labelledby="disc-title">
          <ChapterMark no="03" label="The Discrepancy" />
          <div className={styles.discGrid}>
            <div className={styles.discLead}>
              <h2 id="disc-title" className={styles.h2}>
                A model that never sees nationality still misses one group in one direction.
              </h2>
              <p className={styles.copy}>
                We expected the market to value non-UEFA players below comparable UEFA players. The audit found the reverse. Compared with UEFA players
                in the same leagues, non-UEFA players&apos; Transfermarkt values sit about <strong>{logGapAsPercent(gapA.estimate)}</strong> above
                what Model A predicts for them. How far off the model is, on average, is about the same for both groups. What differs is the
                direction of the miss.
              </p>
              <div className={styles.bigGap}>
                <p className={`${styles.bigNum} num`}>{signed(gapA.estimate)}</p>
                <p className={styles.bigCap}>
                  Headline: signed residual gap, non-UEFA minus UEFA, compared within leagues, Model A, log scale.
                  <span className="num">
                    {" "}
                    95% CI {signed(gapA.low)} to {signed(gapA.high)}.
                  </span>
                </p>
              </div>
            </div>

            <div className={styles.discFigure}>
              <DiscrepancyAxis
                uefa={h.A.mean_residual_uefa}
                nonUefa={h.A.mean_residual_non_uefa}
                rawGap={h.A.signed_gap_raw.estimate}
                stratified={gapA.estimate}
                mae={heldOutLogMae("A")}
              />
              <dl className={styles.terms}>
                <div>
                  <dt>Residual</dt>
                  <dd>One player: log(observed) − log(held-out Model A estimate). Positive means the market value is above the estimate.</dd>
                </div>
                <div>
                  <dt>Signed gap</dt>
                  <dd>
                    Average residual of non-UEFA players minus that of UEFA players. Raw <span className="num">{signed(h.A.signed_gap_raw.estimate)}</span>;
                    within leagues <span className="num">{signed(gapA.estimate)}</span>, the headline.
                  </dd>
                </div>
                <div>
                  <dt>Accuracy gap</dt>
                  <dd>
                    Difference in average <em>size</em> of the miss (MAE): <span className="num">{signed(h.A.mae_gap_league_stratified.estimate)}</span>, 95% CI{" "}
                    <span className="num">
                      {signed(h.A.mae_gap_league_stratified.low)} to {signed(h.A.mae_gap_league_stratified.high)}
                    </span>
                    , which includes zero.
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          <div className={styles.discFoot}>
            <div className={styles.modelsGap}>
              <p className={styles.figLabel}>Same gap, two models</p>
              <GapGlyph
                rows={[
                  { key: "A", label: "Model A", sublabel: "with league and club", interval: gapA, emphasis: true },
                  { key: "B", label: "Model B", sublabel: "performance only", interval: gapB },
                ]}
                domain={[-0.05, 0.25]}
              />
            </div>
            <aside className={styles.caveat} aria-label="What this does not mean">
              <p className={styles.figLabel}>What it does not mean</p>
              <ul>
                <li>It is not evidence of discrimination. The target is Transfermarkt&apos;s own valuation, which may itself be biased.</li>
                <li>It is observational, not causal, and holds for this selected population only.</li>
                <li>The model never sees nationality, citizenship, confederation or birthplace. The group label is used only for the audit.</li>
              </ul>
              <p className={styles.chapterLinks}>
                <ExpLink href={LEAD_STORY.href}>Read “{LEAD_STORY.title}” →</ExpLink>
                <ExpLink href="/terminal/audit">Open the Fairness Audit →</ExpLink>
              </p>
            </aside>
          </div>
        </Reveal>

        {/* ======================================================= 04 · THE PLAYERS */}
        <Reveal as="section" id="players" className={styles.chapter} aria-labelledby="players-title">
          <ChapterMark no="04" label="The Players" />
          <div className={styles.playersHead}>
            <h2 id="players-title" className={styles.h2}>
              Every player has a dossier.
            </h2>
            <p className={styles.copy}>
              One record per player, the same from every corner of FairValue: observed value, both model estimates, the inputs behind them, the
              valuation history and the audit context. Below, the most valuable player in each position
              {showcase ? " among the eight research showcase players" : ""}.
            </p>
            <SearchTrigger className={styles.searchWide}>
              <svg width="18" height="18" viewBox="0 0 16 16" aria-hidden="true">
                <circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                <path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span>Search {showcase ? `${set.players.length} showcase` : integer(set.players.length)} players by name, club or league</span>
              <ShortcutKbd className={styles.ctaKbd} />
            </SearchTrigger>
          </div>

          <ol className={styles.spotlights}>
            {spotlights.map((c, i) => {
              const r = residualOf(c);
              return (
                <li key={c.id} data-stagger style={{ ["--i" as string]: i }}>
                  <ExpLink href={`/players/${c.slug}?from=overview`} className={styles.spot}>
                    <span className={styles.spotPos}>{c.position}</span>
                    <span className={styles.spotFrame}>
                      <PortraitSlot portrait={portraitFor(c.id)} name={c.name} roleCode={c.role_code} size="card" />
                    </span>
                    <span className={styles.spotName}>
                      <small>{c.first_name}</small>
                      <b>{c.last_name}</b>
                    </span>
                    <span className={styles.spotMeta}>
                      <span className="fv-role">{c.role_code}</span>
                      <span>{c.club ?? short(c.league_id)}</span>
                    </span>
                    <span className={styles.spotFlags}>
                      <span>
                        <LeagueFlag leagueId={c.league_id} /> {short(c.league_id)}
                      </span>
                    </span>
                    <span className={styles.spotVals}>
                      <span>
                        <small>
                          <ObsMark /> Observed
                        </small>
                        <b className="num">{formatEur(c.market_value_eur)}</b>
                      </span>
                      <span data-k="model">
                        <small>
                          <ModelMark /> Model A
                        </small>
                        <b className="num">{formatEur(c.estimate)}</b>
                      </span>
                    </span>
                    <MiniRuler
                      marks={[
                        { value: c.market_value_eur, kind: "market", label: "Observed" },
                        { value: c.estimate, kind: "model", label: "Model A" },
                      ]}
                    />
                    <span className={styles.spotFoot}>
                      <Residual value={r} compact basis={c.basis === "heldout" ? "held-out" : "in-sample"} />
                      <span className={styles.spotGo}>Dossier →</span>
                    </span>
                  </ExpLink>
                </li>
              );
            })}
          </ol>

          {leagueLeaders.length >= 6 && (
            <div className={styles.leaders}>
              <p className={styles.figLabel}>
                Fourteen leagues, fourteen front-runners <small>the most valuable player in each covered league</small>
              </p>
              <ol className={styles.leaderGrid}>
                {leagueLeaders.map((c, i) => (
                  <li key={c.id} data-stagger style={{ ["--i" as string]: Math.min(i, 10) }}>
                    <ExpLink href={`/players/${c.slug}?from=overview`} className={styles.leader}>
                      <span className={styles.leaderLeague}>
                        <LeagueFlag leagueId={c.league_id} /> {short(c.league_id)}
                      </span>
                      <span className={styles.leaderName}>
                        <span className="fv-role">{c.role_code}</span>
                        <b>{shortName(c)}</b>
                      </span>
                      <span className={styles.leaderVals}>
                        <span className="num">
                          <ObsMark /> {formatEur(c.market_value_eur)}
                        </span>
                        <span className="num" data-k="model">
                          <ModelMark /> {formatEur(c.estimate)}
                        </span>
                        <span className="num" data-dir={residualOf(c) >= 0 ? "up" : "down"}>
                          {factor(residualOf(c))}
                        </span>
                      </span>
                    </ExpLink>
                  </li>
                ))}
              </ol>
              <p className={styles.smallNote}>
                <MarkKey /> Ratio = observed ÷ Model A estimate ({castBasis}). A ratio above ×1.00 means the market value is above the estimate. It is
                not a verdict that a player is over- or under-priced.
              </p>
            </div>
          )}
        </Reveal>

        {/* ======================================================= 05 · THE RESEARCH */}
        <Reveal as="section" id="research" className={styles.chapter} aria-labelledby="research-title">
          <ChapterMark no="05" label="The Research" />
          <div className={styles.researchHead}>
            <h2 id="research-title" className={styles.h2}>
              How the price is made, and how it is checked.
            </h2>
            <p className={styles.copy}>
              Two gradient-boosted models, evaluated only on players they did not see in training (five-fold, out-of-fold). Every estimate can be
              taken apart input by input, and the errors are audited by group.
            </p>
          </div>

          <div className={styles.research}>
            <article className={styles.rCard} data-stagger style={{ ["--i" as string]: 0 }} data-wide>
              <p className={styles.rNo}>Models</p>
              <h3>Model A and Model B</h3>
              <div className={styles.r2} role="img" aria-label={`Held-out R squared on the log scale: Model A ${decimal(heldOutLogR2("A"), 3)}, Model B ${decimal(heldOutLogR2("B"), 3)}`}>
                {(["A", "B"] as const).map((m) => (
                  <p key={m}>
                    <span className={styles.r2Label}>
                      <ModelMark model={m} size={12} /> Model {m}
                      <small>{m === "A" ? "performance, age, position + league and club" : "performance, age and position only"}</small>
                    </span>
                    <span className={styles.r2Track}>
                      <span style={{ width: `${heldOutLogR2(m) * 100}%` }} data-model={m} />
                    </span>
                    <b className="num">{decimal(heldOutLogR2(m), 3)}</b>
                  </p>
                ))}
              </div>
              <p className={styles.rText}>
                Held-out R² on the log scale. Context dominates: league and club explain a large share of the market&apos;s pricing. Typical miss for Model
                A is {factor(heldOutLogMae("A"))}.
              </p>
              <ExpLink href="/terminal/valuation" className={styles.rGo}>
                Value a profile in the Valuation Studio →
              </ExpLink>
            </article>

            <article className={styles.rCard} data-stagger style={{ ["--i" as string]: 1 }}>
              <p className={styles.rNo}>Explainability</p>
              <h3>Why this number?</h3>
              <p className={styles.rText}>
                SHAP contributions break each estimate into multipliers, one per input, that add up exactly to the served prediction. Global importance
                is shown separately and labelled as such.
              </p>
              <ExpLink href={cast[0] ? `/players/${cast[0].slug}?from=overview#explain` : "/terminal"} className={styles.rGo}>
                See an explanation{cast[0] ? ` for ${shortName(cast[0])}` : ""} →
              </ExpLink>
            </article>

            <article className={styles.rCard} data-stagger style={{ ["--i" as string]: 2 }}>
              <p className={styles.rNo}>Valuation Journey</p>
              <h3>From a starting point to an estimate</h3>
              <p className={styles.rText}>
                The journey walks from the model&apos;s average starting value through each input that raised or lowered it, to the final estimate.
              </p>
              <ExpLink href={valuations[0]?.href ?? "/stories"} className={styles.rGo}>
                {valuations[0] ? `Follow ${valuations[0].title}` : "Valuation stories"} →
              </ExpLink>
            </article>

            <article className={styles.rCard} data-stagger style={{ ["--i" as string]: 3 }}>
              <p className={styles.rNo}>Fairness</p>
              <h3>Who the errors fall on</h3>
              <p className={styles.rText}>
                Signed and absolute error gaps, tier error rates, league strata, a calibration check and club-clustered intervals, at two minute
                thresholds.
              </p>
              <ExpLink href="/terminal/audit" className={styles.rGo}>
                Open the Fairness Audit →
              </ExpLink>
            </article>

            <article className={styles.rCard} data-stagger style={{ ["--i" as string]: 4 }}>
              <p className={styles.rNo}>Methods</p>
              <h3>Methodology and limitations</h3>
              <p className={styles.rText}>Data, population, validation, explainability and what the study cannot say, on one page.</p>
              <ExpLink href="/methods" className={styles.rGo}>
                Read the Methods →
              </ExpLink>
            </article>
          </div>

          <div className={styles.doors}>
            <ExpLink href="/terminal" className={styles.door} data-tone="terminal">
              <span className={styles.doorTag}>Environment</span>
              <span className={styles.doorTitle}>Terminal</span>
              <span className={styles.doorText}>Explore, compare and track all players; market, league and model workspaces.</span>
              <span className={styles.doorGo} aria-hidden="true">
                →
              </span>
            </ExpLink>
            <ExpLink href="/stories" className={styles.door} data-tone="stories">
              <span className={styles.doorTag}>Environment</span>
              <span className={styles.doorTitle}>Stories</span>
              <span className={styles.doorText}>The research finding, valuation journeys and head-to-heads, told chapter by chapter.</span>
              <span className={styles.doorGo} aria-hidden="true">
                →
              </span>
            </ExpLink>
            <div className={styles.live}>
              <p className={styles.figLabel}>Live model check</p>
              <ServiceLine />
              <Suspense fallback={<SpecimenSkeleton />}>
                <LiveSpecimen />
              </Suspense>
            </div>
          </div>
        </Reveal>
      </div>
    </PageTransition>
  );
}
