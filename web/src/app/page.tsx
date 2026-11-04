import { Suspense } from "react";
import { room } from "@/lib/rooms";
import { GapGlyph } from "@/components/charts/GapGlyph";
import { RoomLink } from "@/components/site/RoomLink";
import { RoomTransition } from "@/components/site/RoomTransition";
import { ButtonLink } from "@/components/ui/Button";
import { decimal, integer, logGapAsPercent, signed } from "@/lib/format";
import { heldOutLogR2, research } from "@/lib/research";
import { LiveSpecimen, SpecimenSkeleton } from "./home/LiveSpecimen";
import styles from "./page.module.css";

// Rendered per request so the live example reflects the API as it is now; the shell streams
// immediately and the specimen fills in when the model answers (or reports that it can't).
export const dynamic = "force-dynamic";

const h = research.headline;
const funnel = research.population.funnel;
const population = funnel[funnel.length - 1]!;
const proxyAuc = research.population.proxy_auc.find((p) => p.feature_set === "Model A features") ?? research.population.proxy_auc[0]!;
const gapA = h.A.signed_gap_league_stratified;
const gapB = h.B.signed_gap_league_stratified;

export default function Home() {
  return (
    <RoomTransition>
      <div className={styles.home}>
        {/* ---- Front door ---- */}
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.heroText}>
            <p className="eyebrow">
              <b className="num">{room("overview").index}</b> Football market intelligence
            </p>
            <h1 id="hero-title" className={styles.title}>
              Price the player.
              <span> Then audit the price.</span>
            </h1>
            <p className={styles.lede}>
              FairValue estimates a footballer&apos;s market value from two seasons of club data, shows which inputs moved the number, and
              publishes an audit of whom its errors fall on: players from inside and outside UEFA, across 14 European leagues.
            </p>
            <div className={styles.actions}>
              <ButtonLink href="/studio">Value a player</ButtonLink>
              <ButtonLink href="/fairness" variant="quiet">
                See the audit
              </ButtonLink>
            </div>
          </div>
          <div className={styles.heroSpecimen}>
            <Suspense fallback={<SpecimenSkeleton />}>
              <LiveSpecimen />
            </Suspense>
          </div>
        </section>

        {/* ---- Ledger: the scale of the work ---- */}
        <section className={styles.ledger} aria-label="FairValue in figures">
          <dl>
            <div>
              <dt>Players modelled</dt>
              <dd className="num">{integer(population.total)}</dd>
              <p>{integer(population.non_uefa)} of them from outside UEFA, valued June 2025 to June 2026.</p>
            </div>
            <div>
              <dt>Leagues covered</dt>
              <dd className="num">14</dd>
              <p>European first divisions with match-level data. A selected population, not the global market.</p>
            </div>
            <div>
              <dt>Variance explained</dt>
              <dd className="num">{decimal(heldOutLogR2("A"), 3)}</dd>
              <p>Held-out R² on log value, Model A. Without league and club: {decimal(heldOutLogR2("B"), 3)}.</p>
            </div>
            <div>
              <dt>Nationality inputs</dt>
              <dd className="num">0</dd>
              <p>The models never see nationality, citizenship, confederation or birthplace.</p>
            </div>
          </dl>
        </section>

        {/* ---- The finding ---- */}
        <section className={styles.finding} aria-labelledby="finding-title">
          <div className={styles.findingInner}>
            <div className={styles.findingFigure}>
              <p className={styles.kicker}>The headline finding</p>
              <p className={`${styles.bigNumber} num`} aria-describedby="finding-unit">
                {signed(gapA.estimate)}
              </p>
              <p id="finding-unit" className={styles.bigUnit}>
                signed residual gap, non-UEFA minus UEFA, log units, within leagues
                <span className="num">
                  95% CI {signed(gapA.low)} to {signed(gapA.high)}
                </span>
              </p>
            </div>
            <div className={styles.findingText}>
              <h2 id="finding-title" className={styles.h2}>
                A model that never sees nationality still misses one group in one direction.
              </h2>
              <div className="prose">
                <p>
                  The study expected the market to value non-UEFA players below comparable UEFA players. It found the reverse. Their
                  Transfermarkt values sit about <strong>{logGapAsPercent(gapA.estimate)}</strong> above what the model predicts, relative to UEFA
                  players in the same leagues. Used as a valuation tool, the model would under-price them.
                </p>
                <p>
                  Overall accuracy is close for both groups. What differs is the direction of the errors. Remove league and club from the
                  inputs and the gap grows to <span className="num">{signed(gapB.estimate)}</span>.
                </p>
              </div>
              <GapGlyph
                rows={[
                  { key: "A", label: "Model A", sublabel: "with league and club", interval: gapA, emphasis: true },
                  { key: "B", label: "Model B", sublabel: "performance only", interval: gapB },
                ]}
                domain={[-0.05, 0.25]}
              />
              <p className={styles.observational}>
                Observational, not causal. The target is Transfermarkt&apos;s own valuation, which may itself be biased. This is not evidence of
                discrimination.
              </p>
            </div>
          </div>
        </section>

        {/* ---- Why it matters ---- */}
        <section className={styles.why} aria-labelledby="why-title">
          <h2 id="why-title" className="visually-hidden">
            Why this is worth studying
          </h2>
          <article>
            <p className={styles.kicker}>Why value footballers</p>
            <h3 className={styles.h3}>How a player plays sets most of the price. Where they play moves it a long way.</h3>
            <p className="prose">
              Market values anchor how clubs, media and fans talk about what a player is worth. FairValue learns to reproduce
              Transfermarkt&apos;s community valuations from appearances, minutes, goal output, age and role. With the league and the
              club&apos;s strength added, it explains {Math.round(heldOutLogR2("A") * 100)}% of the variation in log value on unseen players.
              Without them, {Math.round(heldOutLogR2("B") * 100)}%: context is worth a great deal.
            </p>
          </article>
          <article>
            <p className={styles.kicker}>Why audit nationality</p>
            <h3 className={styles.h3}>Leaving nationality out does not make a model group-blind.</h3>
            <p className="prose">
              The permitted inputs still predict whether a player is from a UEFA country with an AUC of{" "}
              <span className="num">{decimal(proxyAuc.auc, 2)}</span>. Players from outside Europe also reach these leagues through a stricter
              filter. So the audit asks a direct question of held-out predictions: does the model err differently for UEFA and non-UEFA players
              in the same leagues?
            </p>
          </article>
          <article className={styles.never}>
            <p className={styles.kicker}>Never a model input</p>
            <ul>
              <li>Nationality and citizenship</li>
              <li>Confederation</li>
              <li>Place of birth</li>
              <li>National-team caps and goals</li>
              <li>Earlier valuations</li>
            </ul>
            <p className={styles.neverNote}>Group labels live in a separate audit table that training code never reads.</p>
          </article>
        </section>

        {/* ---- Directory of rooms ---- */}
        <section className={styles.rooms} aria-labelledby="rooms-title">
          <div className={styles.roomsHead}>
            <h2 id="rooms-title" className={styles.h2}>
              Four ways in
            </h2>
            <p>Each part of FairValue is its own workspace.</p>
          </div>
          <ol className={styles.roomList}>
            <li>
              <RoomLink href="/players" className={styles.room}>
                <span className={`${styles.roomIndex} num`}>{room("players").index}</span>
                <span className={styles.roomName}>Players</span>
                <span className={styles.roomSummary}>
                  Real players from the research population: observed market value next to the model&apos;s estimates, what moved them, and how
                  each player ranks among positional peers.
                </span>
                <span className={styles.roomGlyph} aria-hidden="true">
                  <RadarGlyph />
                </span>
                <span className={styles.roomArrow} aria-hidden="true">
                  →
                </span>
              </RoomLink>
            </li>
            <li>
              <RoomLink href="/studio" className={styles.room}>
                <span className={`${styles.roomIndex} num`}>{room("studio").index}</span>
                <span className={styles.roomName}>Valuation studio</span>
                <span className={styles.roomSummary}>
                  Build a profile, value it with the live model, compare Model A with Model B and see the SHAP breakdown of that one estimate.
                </span>
                <span className={styles.roomGlyph} aria-hidden="true">
                  <RulerGlyph />
                </span>
                <span className={styles.roomArrow} aria-hidden="true">
                  →
                </span>
              </RoomLink>
            </li>
            <li>
              <RoomLink href="/fairness" className={styles.room}>
                <span className={`${styles.roomIndex} num`}>{room("observatory").index}</span>
                <span className={styles.roomName}>Fairness observatory</span>
                <span className={styles.roomSummary}>
                  Gaps by league, value level, subgroup and tier, every robustness check, and what the audit cannot establish.
                </span>
                <span className={styles.roomGlyph} aria-hidden="true">
                  <ForestGlyph />
                </span>
                <span className={styles.roomArrow} aria-hidden="true">
                  →
                </span>
              </RoomLink>
            </li>
            <li>
              <RoomLink href="/methods" className={styles.room}>
                <span className={`${styles.roomIndex} num`}>{room("methods").index}</span>
                <span className={styles.roomName}>Methods</span>
                <span className={styles.roomSummary}>
                  Provenance, population, features, nested cross-validation, model selection, explainability, monitoring and limitations.
                </span>
                <span className={styles.roomGlyph} aria-hidden="true">
                  <PageGlyph />
                </span>
                <span className={styles.roomArrow} aria-hidden="true">
                  →
                </span>
              </RoomLink>
            </li>
          </ol>
        </section>
      </div>
    </RoomTransition>
  );
}

function RadarGlyph() {
  const pts = [0, 1, 2, 3, 4, 5].map((i) => {
    const a = (Math.PI * 2 * i) / 6 - Math.PI / 2;
    const r = [15, 11, 17, 9, 14, 12][i]!;
    return `${60 + Math.cos(a) * r},${20 + Math.sin(a) * r}`;
  });
  return (
    <svg viewBox="0 0 120 40" width="120" height="40">
      <polygon points="60,2 75.6,11 75.6,29 60,38 44.4,29 44.4,11" fill="none" stroke="currentColor" strokeWidth="1" />
      <polygon points={pts.join(" ")} fill="rgb(233 185 73 / 0.25)" stroke="var(--flood)" strokeWidth="1.25" />
    </svg>
  );
}

/* Small line drawings for the room directory. Purely decorative; each echoes the room's main instrument. */
function RulerGlyph() {
  return (
    <svg viewBox="0 0 120 40" width="120" height="40">
      <line x1="4" y1="28" x2="116" y2="28" stroke="currentColor" strokeWidth="1.25" />
      {[10, 22, 34, 46, 58, 70, 82, 94, 106].map((x) => (
        <line key={x} x1={x} y1="28" x2={x} y2={x % 24 === 10 ? 21 : 24} stroke="currentColor" strokeWidth="1" />
      ))}
      <line x1="74" y1="8" x2="74" y2="28" stroke="var(--flood)" strokeWidth="2" />
      <circle cx="74" cy="8" r="3" fill="var(--flood)" />
    </svg>
  );
}

function ForestGlyph() {
  const rows = [
    [40, 70, 55],
    [52, 96, 74],
    [30, 62, 46],
    [58, 88, 72],
  ];
  return (
    <svg viewBox="0 0 120 40" width="120" height="40">
      <line x1="34" y1="2" x2="34" y2="38" stroke="currentColor" strokeWidth="1" strokeDasharray="2 3" />
      {rows.map(([a, b, c], i) => (
        <g key={i}>
          <line x1={a} y1={6 + i * 9.5} x2={b} y2={6 + i * 9.5} stroke="currentColor" strokeWidth="1.25" />
          <circle cx={c} cy={6 + i * 9.5} r="2.6" fill={i === 1 ? "var(--flood)" : "currentColor"} />
        </g>
      ))}
    </svg>
  );
}

function PageGlyph() {
  return (
    <svg viewBox="0 0 120 40" width="120" height="40">
      <rect x="30" y="3" width="28" height="34" fill="none" stroke="currentColor" strokeWidth="1.25" />
      <rect x="62" y="3" width="28" height="34" fill="none" stroke="currentColor" strokeWidth="1.25" />
      {[10, 15, 20, 25, 30].map((y) => (
        <g key={y}>
          <line x1="34" y1={y} x2={y === 30 ? 46 : 54} y2={y} stroke="currentColor" strokeWidth="1" />
          <line x1="66" y1={y} x2={y === 10 ? 80 : 86} y2={y} stroke="currentColor" strokeWidth="1" />
        </g>
      ))}
      <line x1="34" y1="10" x2="44" y2="10" stroke="var(--flood)" strokeWidth="1.5" />
    </svg>
  );
}
