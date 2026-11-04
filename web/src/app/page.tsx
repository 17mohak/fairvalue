import { Suspense } from "react";
import { GapGlyph } from "@/components/charts/GapGlyph";
import { RoomLink } from "@/components/site/RoomLink";
import { RoomTransition } from "@/components/site/RoomTransition";
import { ButtonLink } from "@/components/ui/Button";
import { leagueName, TIER_BOUNDARIES_EUR, TIER_NAMES } from "@/lib/football";
import { decimal, formatEur, integer, logGapAsPercent, signed } from "@/lib/format";
import { summary } from "@/lib/players";
import { playerSet } from "@/lib/players.server";
import { heldOutLogR2, research } from "@/lib/research";
import { room } from "@/lib/rooms";
import { LiveSpecimen, SpecimenSkeleton } from "./home/LiveSpecimen";
import styles from "./page.module.css";

// Rendered per request so the live example reflects the API as it is now; the shell streams
// immediately and the specimen fills in when the model answers (or reports that it can't).
export const dynamic = "force-dynamic";

const h = research.headline;
const funnel = research.population.funnel;
const population = funnel[funnel.length - 1]!;
const gapA = h.A.signed_gap_league_stratified;
const gapB = h.B.signed_gap_league_stratified;

// Spectrum axis: log scale, €200k to €80M, wide enough for every showcase player.
const LO = Math.log(200_000);
const HI = Math.log(80_000_000);
const x = (eur: number) => Math.min(100, Math.max(0, ((Math.log(eur) - LO) / (HI - LO)) * 100));

export default function Home() {
  const set = playerSet();
  const showcase = set.source === "showcase";
  const rows = set.players
    .map(summary)
    .filter((p) => p.estimate)
    .sort((a, b) => b.market_value_eur - a.market_value_eur)
    .slice(0, 10);
  const bounds = TIER_BOUNDARIES_EUR.map(x);
  const steps = funnel.slice(0, 4);

  return (
    <RoomTransition>
      <div className={styles.home}>
        {/* ---- Front door ---- */}
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.heroText}>
            <p className="eyebrow">
              <b className="num">{room("overview").index}</b> Football valuation intelligence
            </p>
            <h1 id="hero-title" className={styles.title}>
              Price the player. <span>Then audit the price.</span>
            </h1>
            <p className={styles.lede}>
              FairValue estimates footballers&apos; market values from two years of club data, explains every estimate, and audits whom its
              errors fall on: players from inside and outside UEFA, across 14 European leagues.
            </p>
            <div className={styles.actions}>
              <ButtonLink href="/players">Explore players</ButtonLink>
              <ButtonLink href="/studio" variant="quiet">
                Value a player
              </ButtonLink>
              <ButtonLink href="/fairness" variant="quiet">
                See the audit
              </ButtonLink>
            </div>
            <dl className={styles.kpis}>
              <div>
                <dt>Players modelled</dt>
                <dd className="num">{integer(population.total)}</dd>
              </div>
              <div>
                <dt>Leagues</dt>
                <dd className="num">14</dd>
              </div>
              <div>
                <dt>Held-out R²</dt>
                <dd className="num">{decimal(heldOutLogR2("A"), 3)}</dd>
              </div>
              <div>
                <dt>Audit gap, Model A</dt>
                <dd className="num">{signed(gapA.estimate)}</dd>
              </div>
            </dl>
          </div>
          <div className={styles.heroSpecimen}>
            <Suspense fallback={<SpecimenSkeleton />}>
              <LiveSpecimen />
            </Suspense>
          </div>
        </section>

        {/* ---- The market and the model, on one scale ---- */}
        <section className={`fv-panel ${styles.spectrum}`} aria-labelledby="spectrum-title">
          <header className="fv-panel-head">
            <h2 id="spectrum-title" className="fv-panel-title">
              The market and the model
              <small>
                {showcase
                  ? "the eight research players: observed value against the served Model A (published results, cached)"
                  : "the ten most valuable players: observed value against the held-out Model A estimate"}
              </small>
            </h2>
            <span className={styles.legend} aria-hidden="true">
              <i data-k="market" /> Market value <i data-k="model" /> Model A
            </span>
          </header>
          <div className={styles.spectrumBody}>
            <div className={styles.scaleHead} aria-hidden="true">
              <span />
              <span className={styles.zones}>
                {TIER_NAMES.map((t, i) => (
                  <b key={t} style={{ left: `${i === 0 ? 0 : bounds[i - 1]}%`, right: `${i === 3 ? 0 : 100 - bounds[i]!}%` }}>
                    {t}
                  </b>
                ))}
              </span>
              <span />
            </div>
            <ol className={styles.rows}>
              {rows.map((p) => {
                const m = x(p.market_value_eur);
                const e = x(p.estimate!.value);
                return (
                  <li key={p.id}>
                    <RoomLink href={`/players/${p.slug}`} className={styles.row} aria-label={`${p.name}: market ${formatEur(p.market_value_eur)}, Model A ${formatEur(p.estimate!.value)}`}>
                      <span className={styles.who}>
                        <span className="fv-role">{p.role_code}</span>
                        <b>{p.last_name}</b>
                        <small>{p.club ?? leagueName(p.league_id).split(",")[0]}</small>
                      </span>
                      <span className={styles.track} aria-hidden="true">
                        {bounds.map((b) => (
                          <i key={b} className={styles.bound} style={{ left: `${b}%` }} />
                        ))}
                        <span className={styles.link} style={{ left: `${Math.min(m, e)}%`, width: `${Math.abs(m - e)}%` }} />
                        <span className={styles.model} style={{ left: `${e}%` }} />
                        <span className={styles.market} style={{ left: `${m}%` }} />
                      </span>
                      <span className={`${styles.vals} num`}>
                        <b>{formatEur(p.market_value_eur)}</b>
                        <small>×{(p.estimate!.value / p.market_value_eur).toFixed(2)}</small>
                      </span>
                    </RoomLink>
                  </li>
                );
              })}
            </ol>
            <div className={styles.scaleFoot} aria-hidden="true">
              <span />
              <span className={styles.ticks}>
                {[500_000, 2_000_000, 10_000_000, 30_000_000].map((t) => (
                  <i key={t} style={{ left: `${x(t)}%` }}>
                    {formatEur(t, 0)}
                  </i>
                ))}
              </span>
              <span />
            </div>
          </div>
        </section>

        {/* ---- Rooms ---- */}
        <section className={styles.rooms} aria-label="Inside FairValue">
          <RoomLink href="/players" className={styles.tile}>
            <span className={styles.tileHead}>
              <span className="num">{room("players").index}</span> Players
            </span>
            <span className={styles.tileTitle}>Scouting dossiers</span>
            <ul className={styles.tileList} aria-hidden="true">
              {rows.slice(0, 3).map((p) => (
                <li key={p.id}>
                  <span className="fv-role">{p.role_code}</span> {p.last_name}
                  <b className="num">{formatEur(p.market_value_eur)}</b>
                </li>
              ))}
            </ul>
            <span className={styles.tileText}>Identity, record, market vs both models, traits and SHAP for each player.</span>
          </RoomLink>
          <RoomLink href="/studio" className={styles.tile}>
            <span className={styles.tileHead}>
              <span className="num">{room("studio").index}</span> Studio
            </span>
            <span className={styles.tileTitle}>Valuation workstation</span>
            <span className={styles.ladder} aria-hidden="true">
              {TIER_NAMES.map((t, i) => (
                <span key={t} data-i={i}>
                  <b>{t}</b>
                  <small>{["< €2M", "€2–10M", "€10–30M", "≥ €30M"][i]}</small>
                </span>
              ))}
            </span>
            <span className={styles.tileText}>Build a profile, get a live estimate, its tier, Model A vs B and the inputs that moved it.</span>
          </RoomLink>
          <RoomLink href="/fairness" className={styles.tile}>
            <span className={styles.tileHead}>
              <span className="num">{room("observatory").index}</span> Observatory
            </span>
            <span className={styles.tileTitle}>The fairness audit</span>
            <span className={styles.mini} aria-hidden="true">
              {[
                { k: "A", g: gapA },
                { k: "B", g: gapB },
              ].map((r) => (
                <span key={r.k} className={styles.miniRow}>
                  <b>Model {r.k}</b>
                  <span className={styles.miniTrack}>
                    <i className={styles.miniZero} style={{ left: `${((0 + 0.05) / 0.3) * 100}%` }} />
                    <i className={styles.miniCi} data-k={r.k} style={{ left: `${((r.g.low + 0.05) / 0.3) * 100}%`, width: `${((r.g.high - r.g.low) / 0.3) * 100}%` }} />
                  </span>
                  <span className="num">{signed(r.g.estimate)}</span>
                </span>
              ))}
            </span>
            <span className={styles.tileText}>Gaps by league, value level, subgroup and tier, with every robustness check.</span>
          </RoomLink>
          <RoomLink href="/methods" className={styles.tile}>
            <span className={styles.tileHead}>
              <span className="num">{room("methods").index}</span> Methods
            </span>
            <span className={styles.tileTitle}>How it was built</span>
            <span className={styles.funnel} aria-hidden="true">
              {steps.map((s) => (
                <span key={s.stage} style={{ width: `${Math.max(18, (Math.log(s.total) / Math.log(steps[0]!.total)) * 100)}%` }}>
                  <b className="num">{integer(s.total)}</b>
                </span>
              ))}
            </span>
            <span className={styles.tileText}>From {integer(steps[0]!.total)} players to the modelling population; validation, explainability and limits.</span>
          </RoomLink>
        </section>

        {/* ---- The finding ---- */}
        <section className={styles.finding} aria-labelledby="finding-title">
          <div className={styles.findingFigure}>
            <p className="fv-label">The headline finding</p>
            <p className={`${styles.bigNumber} num`}>{signed(gapA.estimate)}</p>
            <p className={styles.bigUnit}>
              signed residual gap, non-UEFA minus UEFA, log units, within leagues ·{" "}
              <span className="num">
                95% CI {signed(gapA.low)} to {signed(gapA.high)}
              </span>
            </p>
          </div>
          <div className={styles.findingText}>
            <h2 id="finding-title" className={styles.h2}>
              A model that never sees nationality still misses one group in one direction.
            </h2>
            <p>
              The study expected the market to value non-UEFA players below comparable UEFA players. It found the reverse: their Transfermarkt values
              sit about <strong>{logGapAsPercent(gapA.estimate)}</strong> above the model&apos;s estimates, relative to UEFA players in the same
              leagues. Accuracy is similar for both groups; the direction differs. Without league and club the gap grows to {signed(gapB.estimate)}.
            </p>
            <GapGlyph
              rows={[
                { key: "A", label: "Model A", sublabel: "with league and club", interval: gapA, emphasis: true },
                { key: "B", label: "Model B", sublabel: "performance only", interval: gapB },
              ]}
              domain={[-0.05, 0.25]}
            />
            <p className={styles.observational}>
              Observational, not causal, on a selected population. The target is Transfermarkt&apos;s own valuation, which may itself be biased. Not
              evidence of discrimination. The model never sees nationality, citizenship, confederation or birthplace.
            </p>
          </div>
        </section>
      </div>
    </RoomTransition>
  );
}
