import Link from "next/link";
import { Suspense } from "react";
import { GapGlyph } from "@/components/charts/GapGlyph";
import { JourneyRibbon } from "@/components/overview/JourneyRibbon";
import { MarkKey, ModelMark, ObsMark, Residual } from "@/components/brand/Marks";
import { ServiceLine } from "@/components/overview/ServiceLine";
import { Mark } from "@/components/site/Mark";
import { ExpLink } from "@/components/site/ExpLink";
import { PageTransition } from "@/components/site/PageTransition";
import { leagueCountry, leagueName, TIER_BOUNDARIES_EUR, TIER_NAMES } from "@/lib/football";
import { decimal, formatEur, integer, signed } from "@/lib/format";
import { buildJourney, extremes, factor, toEur } from "@/lib/journey";
import { summary } from "@/lib/players";
import { playerSet } from "@/lib/players.server";
import { heldOutLogMae, heldOutLogR2, research } from "@/lib/research";
import { LEAD_STORY, STORY_FORMATS, STORIES, storyBySlug } from "@/lib/stories";
import { WORKSPACES } from "@/lib/terminal";
import { LiveSpecimen, SpecimenSkeleton } from "./home/LiveSpecimen";
import styles from "./page.module.css";

// Rendered per request so the live example reflects the API as it is now.
export const dynamic = "force-dynamic";

const h = research.headline;
const population = research.population.funnel.at(-1)!;
const gapA = h.A.signed_gap_league_stratified;
const gapB = h.B.signed_gap_league_stratified;
const short = (id: string) => leagueName(id).split(",")[0]!;

// Spectrum axis: log scale, €200k to €80M, wide enough for every showcase player.
const LO = Math.log(200_000);
const HI = Math.log(80_000_000);
const sx = (eur: number) => Math.min(100, Math.max(0, ((Math.log(eur) - LO) / (HI - LO)) * 100));

export default function Overview() {
  const set = playerSet();
  const showcase = set.source === "showcase";
  // Featured valuation: the most valuable player the build can explain. A rule, not a pick.
  const featured = [...set.players].filter((p) => p.explanation).sort((a, b) => b.market_value_eur - a.market_value_eur)[0] ?? null;
  const fj = featured?.explanation ? buildJourney(featured.explanation, 7) : null;
  const fx = fj ? extremes(fj) : null;
  const featuredStory = featured ? storyBySlug(`valuation-${featured.slug}`) : undefined;
  const tiers = TIER_NAMES.map((t) => research.market.tiers.find((r) => r.key === t)!);
  const medians = [...research.market.leagues].sort((a, b) => b.median_value_eur! - a.median_value_eur!);
  const rows = set.players
    .map(summary)
    .filter((p) => p.estimate)
    .sort((a, b) => b.market_value_eur - a.market_value_eur)
    .slice(0, 10);
  const bounds = TIER_BOUNDARIES_EUR.map(sx);
  const pair = storyBySlug("h2h-849520-405398");
  const pairPlayers = pair ? pair.players.map((id) => set.players.find((p) => p.id === id)).filter((p) => !!p) : [];

  return (
    <PageTransition>
      <div className={styles.home}>
        {/* ================= The cover ================= */}
        <section className={styles.cover} aria-labelledby="cover-title">
          <dl className={styles.bug} aria-label="This edition">
            <div className={styles.bugPlate}>
              <dt className="visually-hidden">Publication</dt>
              <dd>
                <Mark size={18} /> FairValue
              </dd>
            </div>
            <div>
              <dt>Season</dt>
              <dd className="num">2025–26</dd>
            </div>
            <div>
              <dt>Leagues</dt>
              <dd className="num">14</dd>
            </div>
            <div>
              <dt>Players</dt>
              <dd className="num">{integer(population.total)}</dd>
            </div>
            <div>
              <dt>Held-out R²</dt>
              <dd className="num">{decimal(heldOutLogR2("A"), 3)}</dd>
            </div>
            <div>
              <dt>Typical miss</dt>
              <dd className="num">{factor(heldOutLogMae("A"))}</dd>
            </div>
            <div className={styles.bugGap}>
              <dt>Audit gap</dt>
              <dd className="num">
                <ExpLink href={LEAD_STORY.href}>{signed(gapA.estimate)} →</ExpLink>
              </dd>
            </div>
          </dl>

          <div className={styles.coverGrid}>
            <div className={styles.headline}>
              <h1 id="cover-title" className={styles.title}>
                <span className={styles.solid}>Price the player.</span>
                <span className={styles.outline}>Audit the price.</span>
              </h1>
              <p className={styles.duality}>
                <span>
                  <ObsMark size={12} /> <b>Solid</b> what the market says
                </span>
                <span>
                  <ModelMark size={13} /> <b>Outline</b> what the model says
                </span>
              </p>
              <p className={styles.lede}>
                FairValue estimates a footballer&apos;s Transfermarkt market value from two years of club data, shows every input that moved the
                estimate, and audits whom its errors fall on.
              </p>
              <p className={styles.ctas}>
                <ExpLink href="/terminal" className={styles.ctaTerminal}>
                  Open the Terminal <span aria-hidden="true">→</span>
                </ExpLink>
                <ExpLink href="/stories" className={styles.ctaStories}>
                  Read the Stories <span aria-hidden="true">→</span>
                </ExpLink>
              </p>
            </div>

            {featured && fj && (
              <article className={styles.star} aria-labelledby="star-title">
                <p className={styles.starTag}>Cover valuation</p>
                <header className={styles.starHead}>
                  <span className="fv-role">{featured.role_code}</span>
                  <span className={styles.starMeta}>
                    {featured.sub_position} · {featured.club ?? short(featured.league_id)} · {Math.floor(featured.age)}
                  </span>
                </header>
                <h2 id="star-title" className={styles.starName}>
                  <small>{featured.first_name}</small>
                  {featured.last_name}
                </h2>
                <dl className={styles.starVals}>
                  <div>
                    <dt>
                      <ObsMark /> Observed
                    </dt>
                    <dd className="num">{formatEur(featured.market_value_eur)}</dd>
                  </div>
                  <div data-k="model">
                    <dt>
                      <ModelMark /> Model A
                    </dt>
                    <dd className="num">{formatEur(toEur(fj.final))}</dd>
                  </div>
                  <div>
                    <dt>Residual</dt>
                    <dd>
                      <Residual value={Math.log(featured.market_value_eur) - fj.final} basis="in-sample" />
                    </dd>
                  </div>
                </dl>
                <JourneyRibbon explanation={featured.explanation!} observed={featured.market_value_eur} />
                <p className={styles.starRead}>
                  From a {formatEur(toEur(fj.base))} starting point,
                  {fx?.up ? ` ${fx.up.label.toLowerCase()} raises the estimate most (${factor(fx.up.contribution)})` : ""}
                  {fx?.down ? `; ${fx.down.label.toLowerCase()} lowers it most (${factor(fx.down.contribution)})` : ""}. Served Model A, published
                  SHAP values, in-sample.
                </p>
                <p className={styles.starLinks}>
                  {featuredStory && (
                    <ExpLink href={featuredStory.href} className={styles.more}>
                      Follow the journey →
                    </ExpLink>
                  )}
                  <ExpLink href={`/players/${featured.slug}?from=overview`} className={styles.more}>
                    Open the dossier →
                  </ExpLink>
                </p>
              </article>
            )}
          </div>

          <aside className={styles.band} aria-labelledby="band-title">
            <h2 id="band-title" className={styles.bandTitle}>
              Market snapshot <small>modelling population · held-out results</small>
            </h2>
            <div className={styles.bandCell}>
              <p className={styles.cellLabel}>Observed value by tier</p>
              <div className={styles.tierBar} role="img" aria-label={tiers.map((t) => `${t.key} ${t.n}`).join(", ")}>
                {tiers.map((t, i) => (
                  <span key={t.key} style={{ flexGrow: t.n, opacity: 0.4 + i * 0.2 }} />
                ))}
              </div>
              <ol className={styles.tierKey}>
                {tiers.map((t) => (
                  <li key={t.key}>
                    <b>{t.key}</b>
                    <span className="num">
                      {integer(t.n)} · {((t.n / population.total) * 100).toFixed(0)}%
                    </span>
                  </li>
                ))}
              </ol>
            </div>
            <div className={styles.bandCell}>
              <p className={styles.cellLabel}>Median observed value by league</p>
              <div className={styles.leagueBars} aria-hidden="true">
                {medians.map((l) => (
                  <span key={l.key} style={{ height: `${((Math.log(l.median_value_eur!) - Math.log(200_000)) / (Math.log(20_000_000) - Math.log(200_000))) * 100}%` }} title={`${short(l.key)} ${formatEur(l.median_value_eur!)}`} />
                ))}
              </div>
              <p className={styles.leagueEnds}>
                <span>
                  {short(medians[0]!.key)} <b className="num">{formatEur(medians[0]!.median_value_eur!)}</b>
                </span>
                <span>
                  {short(medians.at(-1)!.key)}, {leagueCountry(medians.at(-1)!.key)} <b className="num">{formatEur(medians.at(-1)!.median_value_eur!)}</b>
                </span>
              </p>
            </div>
            <div className={`${styles.bandCell} ${styles.bandWide}`}>
              <p className={styles.cellLabel}>League board · top five by median value</p>
              <table className={styles.snapTable}>
                <thead>
                  <tr>
                    <th scope="col">League</th>
                    <th scope="col">Players</th>
                    <th scope="col">Median</th>
                    <th scope="col" title="Held-out mean absolute error, log scale">Error A</th>
                  </tr>
                </thead>
                <tbody>
                  {medians.slice(0, 5).map((l) => (
                    <tr key={l.key}>
                      <th scope="row">{short(l.key)}</th>
                      <td className="num">{integer(l.total)}</td>
                      <td className="num">{formatEur(l.median_value_eur!)}</td>
                      <td className="num">{decimal(l.A.mae!, 3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={styles.bandCell}>
              <ServiceLine />
              <ExpLink href="/terminal/market" className={styles.snapLink}>
                Market Landscape →
              </ExpLink>
              <ExpLink href="/terminal/leagues" className={styles.snapLink}>
                League Landscape →
              </ExpLink>
            </div>
          </aside>
        </section>

        {/* ================= Doors ================= */}
        <section className={styles.doors} aria-label="Go deeper">
          <ExpLink href={LEAD_STORY.href} className={styles.doorStory}>
            <span className={styles.doorTag}>Stories · Research</span>
            <span className={styles.doorTitle}>{LEAD_STORY.title}</span>
            <span className={`${styles.doorNum} num`}>{signed(gapA.estimate)}</span>
            <span className={styles.doorText}>The audit&apos;s headline, chapter by chapter, with what it does not mean.</span>
            <span className={styles.doorGo}>Read the story →</span>
          </ExpLink>
          <ExpLink href={pairPlayers.length === 2 ? `/terminal/compare?ids=${pairPlayers.map((p) => p.id).join(",")}` : "/terminal"} className={styles.doorTerminal}>
            <span className={styles.doorTag}>Terminal · Comparison Studio</span>
            <span className={styles.doorTitle}>{pairPlayers.length === 2 ? `${pairPlayers.map((p) => p.last_name).join(" v ")}, one scale` : "Explore the players"}</span>
            <span className={styles.doorRows} aria-hidden="true">
              {pairPlayers.map((p) => {
                const a = p.estimates.heldout.A ?? p.estimates.served.A!;
                return (
                  <span key={p.id} className={styles.doorRow}>
                    <b>{p.last_name}</b>
                    <span className={styles.doorTrack}>
                      <span className={styles.doorLink} style={{ left: `${Math.min(sx(p.market_value_eur), sx(a))}%`, width: `${Math.abs(sx(p.market_value_eur) - sx(a))}%` }} />
                      <span className={styles.doorMk} style={{ left: `${sx(a)}%` }}>
                        <ModelMark />
                      </span>
                      <span className={styles.doorMk} style={{ left: `${sx(p.market_value_eur)}%` }}>
                        <ObsMark />
                      </span>
                    </span>
                  </span>
                );
              })}
            </span>
            <span className={styles.doorGo}>Open in the Terminal →</span>
          </ExpLink>
        </section>

        {/* ================= The market and the model ================= */}
        <section className={styles.spectrum} aria-labelledby="spectrum-title">
          <header className={styles.sectionHead}>
            <span className={styles.sectionNo} aria-hidden="true">01</span>
            <h2 id="spectrum-title" className={styles.sectionTitle}>
              The market and the model
              <small>
                {showcase
                  ? "the eight research players: observed value against the served Model A (published results, in-sample)"
                  : "the ten most valuable players: observed value against the held-out Model A estimate"}
              </small>
            </h2>
            <MarkKey />
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
                const m = sx(p.market_value_eur);
                const e = sx(p.estimate!.value);
                return (
                  <li key={p.id}>
                    <ExpLink href={`/players/${p.slug}?from=overview`} className={styles.row} aria-label={`${p.name}: observed ${formatEur(p.market_value_eur)}, Model A ${formatEur(p.estimate!.value)}`}>
                      <span className={styles.who}>
                        <span className="fv-role">{p.role_code}</span>
                        <b>{p.last_name}</b>
                        <small>{p.club ?? short(p.league_id)}</small>
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
                    </ExpLink>
                  </li>
                );
              })}
            </ol>
            <div className={styles.scaleFoot} aria-hidden="true">
              <span />
              <span className={styles.ticks}>
                {[500_000, 2_000_000, 10_000_000, 30_000_000].map((t) => (
                  <i key={t} style={{ left: `${sx(t)}%` }}>
                    {formatEur(t, 0)}
                  </i>
                ))}
              </span>
              <span />
            </div>
          </div>
        </section>

        {/* ================= The finding ================= */}
        <section className={styles.finding} aria-labelledby="finding-title">
          <div className={styles.findingFigure}>
            <p className={styles.findingTag}>The audit</p>
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
              sit about <strong>{Math.round(Math.expm1(gapA.estimate) * 100)}%</strong> above the model&apos;s estimates, relative to UEFA players in the
              same leagues. Accuracy is similar for both groups; the direction differs. Without league and club the gap grows to {signed(gapB.estimate)}.
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

        {/* ================= Directory + live check ================= */}
        <section className={styles.directory} aria-label="Where to go next">
          <div className={styles.dirCol}>
            <h2 className={styles.dirHead}>
              <ExpLink href="/terminal">Terminal</ExpLink>
              <small>the analytical workstation</small>
            </h2>
            <ul>
              {WORKSPACES.map((w) => (
                <li key={w.id}>
                  <ExpLink href={w.href}>
                    <b>{w.label}</b>
                    <span>{w.summary}</span>
                  </ExpLink>
                </li>
              ))}
            </ul>
          </div>
          <div className={styles.dirCol} data-tone="stories">
            <h2 className={styles.dirHead}>
              <ExpLink href="/stories">Stories</ExpLink>
              <small>the editorial side</small>
            </h2>
            <ul>
              {STORY_FORMATS.map((f) => {
                const n = STORIES.filter((s) => s.format === f.id).length;
                return (
                  <li key={f.id}>
                    <ExpLink href={`/stories#${f.id}`}>
                      <b>
                        {f.label} <em className="num">{n ? n : "not published"}</em>
                      </b>
                      <span>{f.summary}</span>
                    </ExpLink>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className={styles.dirLive}>
            <p className="fv-label">Live model check</p>
            <Suspense fallback={<SpecimenSkeleton />}>
              <LiveSpecimen />
            </Suspense>
          </div>
        </section>
      </div>
    </PageTransition>
  );
}
