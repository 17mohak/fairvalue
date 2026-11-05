import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ViewTransition } from "react";
import { PlayerHero, type HeroEstimate } from "@/components/players/PlayerHero";
import { PortraitSlot } from "@/components/players/PortraitSlot";
import { TraitsRadar } from "@/components/players/TraitsRadar";
import { ValuationLab } from "@/components/players/ValuationLab";
import { ValueHistory } from "@/components/players/ValueHistory";
import { LeagueFlag } from "@/components/brand/Flag";
import { ExpLink } from "@/components/site/ExpLink";
import { DossierBar } from "@/components/players/DossierBar";
import { PageTransition } from "@/components/site/PageTransition";
import { parseFrom } from "@/lib/experiences";
import { storyBySlug } from "@/lib/stories";
import { leagueName } from "@/lib/football";
import { formatEur, integer, signed } from "@/lib/format";
import { idFromParam, POSITION_PLURAL, type PlayerProfile, type TraitKey } from "@/lib/players";
import { playerById, playerSet } from "@/lib/players.server";
import { portraitFor } from "@/lib/portraits";
import { nearestByValue, standingText, valueStanding } from "@/lib/peers";
import { valuationReading } from "@/lib/reading";
import { PlayerAppearances, type AppearanceLink } from "@/components/players/PlayerAppearances";
import { ValueSilhouette } from "@/components/players/ValueSilhouette";
import { STORIES } from "@/lib/stories";
import { shortName } from "@/lib/theatre";
import { heldOutLogMae, research } from "@/lib/research";

import styles from "./profile.module.css";

type Params = { params: Promise<{ playerId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

function load(param: string): PlayerProfile {
  const id = idFromParam(param);
  const p = id === null ? undefined : playerById(id);
  if (!p) notFound();
  return p;
}

export async function generateMetadata({ params }: Pick<Params, "params">): Promise<Metadata> {
  const id = idFromParam((await params).playerId);
  const p = id === null ? undefined : playerById(id);
  // One canonical address per player, whichever form (id or id-slug, any ?from=) was opened.
  return p
    ? {
        title: p.name,
        description: `${p.name}: observed market value, model estimates, explanation and positional traits.`,
        alternates: { canonical: `/players/${p.slug}` },
      }
    : { title: "Player not found" };
}

/** "(2025-06-12, 2026-06-12]" -> "between 12 Jun 2025 and 12 Jun 2026" */
function windowLabel(): string {
  const m = /\((\d{4}-\d{2}-\d{2}), (\d{4}-\d{2}-\d{2})\]/.exec(research.monitoring.policy.current_window);
  if (!m) return "2025–26 snapshot";
  const f = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
  return `${f(m[1]!)} – ${f(m[2]!)}`;
}

export default async function PlayerPage({ params, searchParams }: Params) {
  const p = load((await params).playerId);
  const from = parseFrom((await searchParams).from);
  const story = storyBySlug(`valuation-${p.slug}`)?.href ?? null;
  const set = playerSet();
  const peers = set.peers?.[p.position] ?? null;
  const portrait = portraitFor(p.id);
  const valued = p.valuation_date
    ? new Date(`${p.valuation_date}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
    : windowLabel();
  const heroEstimates: HeroEstimate[] = (["A", "B"] as const).map((m) =>
    p.estimates.heldout[m] !== null
      ? { model: m, value: p.estimates.heldout[m], source: "heldout" }
      : p.estimates.served[m] !== null
        ? { model: m, value: p.estimates.served[m], source: "cached" }
        : { model: m, value: null, source: "live-only" },
  );
  const gap = research.headline.A.signed_gap_league_stratified;
  const residual = p.estimates.heldout.A !== null ? Math.log(p.market_value_eur) - Math.log(p.estimates.heldout.A) : null;
  // In context: where the observed value sits among comparable players in this build.
  const leagueShort = leagueName(p.league_id).split(",")[0]!;
  const leaguePool = set.players.filter((q) => q.league_id === p.league_id);
  const positionPool = set.players.filter((q) => q.position === p.position);
  const groups = [
    {
      key: "league",
      title: leagueShort,
      noun: `${leagueShort} players`,
      values: leaguePool.map((q) => q.market_value_eur),
      explorer: `/terminal?league=${p.league_id}&focus=${p.id}`,
    },
    {
      key: "position",
      title: `${POSITION_PLURAL[p.position][0]!.toUpperCase()}${POSITION_PLURAL[p.position].slice(1)}, all leagues`,
      noun: POSITION_PLURAL[p.position],
      values: positionPool.map((q) => q.market_value_eur),
      explorer: `/terminal?position=${p.position}&focus=${p.id}`,
    },
  ].map((g) => ({ ...g, standing: valueStanding(g.values, p.market_value_eur) }));
  const nearLeague = nearestByValue(leaguePool, p, 4);
  const nearPosition = nearestByValue(positionPool.filter((q) => !nearLeague.some((n) => n.id === q.id)), p, 4);
  const near = [...nearLeague.map((q) => ({ q, why: leagueShort })), ...nearPosition.map((q) => ({ q, why: POSITION_PLURAL[p.position] }))];
  const appearances: AppearanceLink[] = [
    ...STORIES.filter((s) => s.players.includes(p.id)).map((s) => ({ href: s.href, label: s.title, kind: `Story · ${s.formatLabel}` })),
    { href: `/terminal?league=${p.league_id}&focus=${p.id}`, label: `${leagueShort} in the Player Explorer`, kind: "Terminal" },
    { href: "/terminal/leagues", label: `${leagueShort} on the League Landscape`, kind: "Terminal" },
  ];
  const hasHistory = !!p.history && p.history.length > 1;
  const raw = Object.fromEntries(
    (["goals_p90", "assists_p90", "minutes", "start_share", "minutes_last_365", "intl_club_minutes_share"] as TraitKey[]).map((k) => [k, p.features[k] as number]),
  ) as Partial<Record<TraitKey, number>>;

  return (
    <PageTransition>
      <article className={styles.profile} data-from={from ?? undefined}>
        <DossierBar from={from} player={{ id: p.id, slug: p.slug, name: p.name, role_code: p.role_code }} story={story} />
        <PlayerHero
          player={p}
          portrait={portrait}
          valuedLabel={valued}
          estimates={heroEstimates}
          reading={valuationReading({
            lastName: shortName(p),
            observed: p.market_value_eur,
            A: heroEstimates[0]!,
            B: heroEstimates[1]!,
            maeA: heldOutLogMae("A"),
            maeB: heldOutLogMae("B"),
          })}
        />

        <nav className={styles.sections} aria-label="Sections of this dossier">
          <ol>
            {[
              { id: "explain", label: "Valuation Journey" },
              { id: "estimates", label: "Model A vs B" },
              { id: "traits", label: "Traits" },
              ...(hasHistory ? [{ id: "history", label: "History" }] : []),
              { id: "audit", label: "Audit context" },
              { id: "context", label: "In context" },
            ].map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.id}`}>
                  <span className="num">{String(i + 1).padStart(2, "0")}</span> {s.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className={styles.grid} data-history={hasHistory || undefined}>
          <ValuationLab
            areas={{ compare: styles.compare, explain: styles.explain }}
            player={p}
            mae={{ A: heldOutLogMae("A"), B: heldOutLogMae("B") }}
            regressorVersion={{ A: research.models.registry.regressor_A.version, B: research.models.registry.regressor_B.version }}
          />

          <section id="traits" className={`fv-panel ${styles.traits}`} aria-labelledby="traits-title">
            <header className="fv-panel-head">
              <h2 id="traits-title" className="fv-panel-title">
                Player traits
                <small>{peers ? `percentiles vs ${integer(peers.n)} ${POSITION_PLURAL[p.position]}` : "model inputs, two years"}</small>
              </h2>
              {!peers && <span className="fv-chip">No peer data in this build</span>}
            </header>
            <div className="fv-panel-body">
              <TraitsRadar traits={p.traits} peers={peers} position={p.position} playerName={p.name} raw={raw} />
              <p className={styles.panelFoot}>No passing, progression or defensive actions exist in the dataset, so no trait claims to measure them.</p>
            </div>
          </section>

          {hasHistory && (
            <section id="history" className={`fv-panel ${styles.history}`} aria-labelledby="history-title">
              <header className="fv-panel-head">
                <h2 id="history-title" className="fv-panel-title">
                  Valuation history <small>every Transfermarkt valuation on record</small>
                </h2>
              </header>
              <div className="fv-panel-body">
                <ValueHistory history={p.history!} valuationDate={p.valuation_date} heldout={p.estimates.heldout.A} />
              </div>
            </section>
          )}

          <section id="audit" className={`fv-panel ${styles.audit}`} aria-labelledby="audit-title">
            <header className="fv-panel-head">
              <h2 id="audit-title" className="fv-panel-title">
                Audit context <small>group-level, not about this player</small>
              </h2>
            </header>
            <div className="fv-panel-body">
              <dl className={styles.auditFacts}>
                <div>
                  <dt>Audit group</dt>
                  <dd>{p.audit.group ?? "Not assigned"}</dd>
                </div>
                <div>
                  <dt>Population gap, Model A</dt>
                  <dd className="num">
                    {signed(gap.estimate)} <small>95% CI {signed(gap.low)} to {signed(gap.high)}</small>
                  </dd>
                </div>
                <div>
                  <dt>This player, market vs held-out A</dt>
                  <dd className="num">{residual !== null ? signed(residual) : <small>full export only</small>}</dd>
                </div>
              </dl>
              <p className={styles.auditNote}>
                The group comes from first-listed citizenship and is never a model input. Across the population, non-UEFA players&apos; market values
                sit about {Math.round(Math.expm1(gap.estimate) * 100)}% above Model A&apos;s held-out estimates, relative to UEFA players in the same
                leagues. One player&apos;s residual says nothing about that pattern (typical miss ×{Math.exp(heldOutLogMae("A")).toFixed(2)}), and none
                of it is evidence of discrimination: the target may itself be biased. <ExpLink href="/terminal/audit">Open the Fairness Audit</ExpLink>
              </p>
            </div>
          </section>
        </div>

        <section id="context" className={styles.more} aria-labelledby="context-title">
          <header className={styles.moreHead}>
            <h2 id="context-title" className="fv-panel-title">
              In context <small>observed value among comparable players in this build</small>
            </h2>
            <ExpLink href="/terminal" className={styles.moreAll}>
              All players in the Terminal →
            </ExpLink>
          </header>

          <div className={styles.contextGrid}>
            <div className={styles.standings}>
              {groups.map((g) => (
                <div key={g.key} className={styles.standing}>
                  <p className={styles.standingHead}>
                    <b>
                      {g.key === "league" && <LeagueFlag leagueId={p.league_id} />} {g.title}
                    </b>
                    <span className="num">
                      {integer(g.standing.n)} players · median {formatEur(g.standing.median)}
                    </span>
                  </p>
                  <p className={styles.standingText}>{standingText(g.standing, g.noun)}</p>
                  {g.standing.n >= 12 && (
                    <ValueSilhouette
                      values={g.values}
                      value={p.market_value_eur}
                      median={g.standing.median}
                      label={`Observed values of ${integer(g.standing.n)} ${g.noun}, log scale; ${p.name} at ${formatEur(p.market_value_eur)}, median ${formatEur(g.standing.median)}.`}
                    />
                  )}
                  <ExpLink href={g.explorer} className={styles.standingLink}>
                    See them in the Explorer →
                  </ExpLink>
                </div>
              ))}
            </div>
            <PlayerAppearances playerId={p.id} name={shortName(p)} links={appearances} />
          </div>

          {near.length > 0 && (
            <>
              <h3 className={styles.nearHead}>
                Near this valuation <small>closest observed values: same league, then same position</small>
              </h3>
              <ul className={styles.moreList}>
                {near.map(({ q, why }) => (
                  <li key={q.id}>
                    <ExpLink href={from ? `/players/${q.slug}?from=${from}` : `/players/${q.slug}`} className={styles.moreCard}>
                      <span className={styles.moreThumb}>
                        <PortraitSlot portrait={portraitFor(q.id)} name={q.name} roleCode={q.role_code} size="thumb" />
                      </span>
                      <span className={styles.moreText}>
                        <span className={styles.moreName}>
                          <ViewTransition name={`name-${q.id}`} share="morph" default="none">
                            <b>{shortName(q)}</b>
                          </ViewTransition>
                          <ViewTransition name={`glyph-${q.id}`} share="morph" default="none">
                            <span className="fv-role">{q.role_code}</span>
                          </ViewTransition>
                        </span>
                        <span className={styles.moreMeta}>
                          {q.club ?? leagueName(q.league_id).split(",")[0]} · {why}
                        </span>
                      </span>
                      <span className={`${styles.moreValue} num`}>{formatEur(q.market_value_eur)}</span>
                    </ExpLink>
                  </li>
                ))}
              </ul>
            </>
          )}
          <p className={styles.provenance}>
            Counts and ranks of observed Transfermarkt values only; model errors are never ranked here.{" "}
            {set.source === "showcase" ? "Research showcase: " : "Full player export: "}
            {set.selection}
          </p>
        </section>
      </article>
    </PageTransition>
  );
}
