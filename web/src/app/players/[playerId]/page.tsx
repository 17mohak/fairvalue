import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ViewTransition } from "react";
import { PlayerHero } from "@/components/players/PlayerHero";
import { PortraitSlot } from "@/components/players/PortraitSlot";
import { TraitsRadar } from "@/components/players/TraitsRadar";
import { ValuationLab } from "@/components/players/ValuationLab";
import { ValueHistory } from "@/components/players/ValueHistory";
import { RoomLink } from "@/components/site/RoomLink";
import { RoomTransition } from "@/components/site/RoomTransition";
import { leagueName } from "@/lib/football";
import { formatEur, integer, signed } from "@/lib/format";
import { idFromParam, type PlayerProfile } from "@/lib/players";
import { neighbours, playerById, playerSet } from "@/lib/players.server";
import { portraitFor } from "@/lib/portraits";
import { heldOutLogMae, research } from "@/lib/research";
import { room } from "@/lib/rooms";
import styles from "./profile.module.css";

type Params = { params: Promise<{ playerId: string }> };

function load(param: string): PlayerProfile {
  const id = idFromParam(param);
  const p = id === null ? undefined : playerById(id);
  if (!p) notFound();
  return p;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const id = idFromParam((await params).playerId);
  const p = id === null ? undefined : playerById(id);
  return p ? { title: p.name, description: `${p.name}: observed market value, model estimates, explanation and positional traits.` } : { title: "Player not found" };
}

/** "(2025-06-12, 2026-06-12]" -> "between 12 Jun 2025 and 12 Jun 2026" */
function windowLabel(): string {
  const m = /\((\d{4}-\d{2}-\d{2}), (\d{4}-\d{2}-\d{2})\]/.exec(research.monitoring.policy.current_window);
  if (!m) return "2025–26 snapshot";
  const f = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
  return `${f(m[1]!)} – ${f(m[2]!)}`;
}

export default async function PlayerPage({ params }: Params) {
  const p = load((await params).playerId);
  const set = playerSet();
  const peers = set.peers?.[p.position] ?? null;
  const portrait = portraitFor(p.id);
  const valued = p.valuation_date
    ? new Date(`${p.valuation_date}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
    : windowLabel();
  const heroEstimate =
    p.estimates.heldout.A !== null
      ? { label: "Model A · held-out estimate", value: p.estimates.heldout.A }
      : p.estimates.served.A !== null
        ? { label: "Model A · served estimate (in-sample)", value: p.estimates.served.A }
        : null;
  const gap = research.headline.A.signed_gap_league_stratified;
  const residual = p.estimates.heldout.A !== null ? Math.log(p.market_value_eur) - Math.log(p.estimates.heldout.A) : null;
  const w = p.window;
  const more = neighbours(p.id, 4);

  return (
    <RoomTransition>
      <article className={styles.profile}>
        <PlayerHero player={p} portrait={portrait} roomIndex={room("players").index} valuedLabel={valued} estimate={heroEstimate} />

        <section className={styles.strip} aria-label="Club football in the two years to the valuation date">
          <p className={styles.stripLabel}>Two years to the valuation date</p>
          <dl>
            <div>
              <dt>Appearances</dt>
              <dd className="num">{w.appearances}</dd>
            </div>
            <div>
              <dt>Minutes</dt>
              <dd className="num">{integer(w.minutes)}</dd>
            </div>
            {p.position !== "Goalkeeper" && (
              <>
                <div>
                  <dt>Goals</dt>
                  <dd className="num">{w.goals ?? "–"}</dd>
                </div>
                <div>
                  <dt>Assists</dt>
                  <dd className="num">{w.assists ?? "–"}</dd>
                </div>
              </>
            )}
            <div>
              <dt>Started</dt>
              <dd className="num">
                {w.started}
                <small>/{w.appearances}</small>
              </dd>
            </div>
            <div>
              <dt>Cards</dt>
              <dd className="num">
                {w.yellow_cards ?? "–"}
                <small> Y</small> {w.red_cards ?? "–"}
                <small> R</small>
              </dd>
            </div>
          </dl>
        </section>

        <div className={styles.body}>
          <section className={styles.panel} aria-labelledby="sec-value">
            <header className={styles.panelHead}>
              <p className={styles.panelNo}>01</p>
              <h2 id="sec-value" className={styles.h2}>
                Market and model
              </h2>
              <p className={styles.panelLede}>
                The observed value next to what each model estimates from this player&apos;s data. Click a model to put it on the scale and
                explain it.
              </p>
            </header>
            <ValuationLab
              player={p}
              mae={{ A: heldOutLogMae("A"), B: heldOutLogMae("B") }}
              regressorVersion={{ A: research.models.registry.regressor_A.version, B: research.models.registry.regressor_B.version }}
            />
          </section>

          <section className={styles.panel} aria-labelledby="sec-traits">
            <header className={styles.panelHead}>
              <p className={styles.panelNo}>02</p>
              <h2 id="sec-traits" className={styles.h2}>
                Player traits
              </h2>
              <p className={styles.panelLede}>
                Percentiles among positional peers on the model&apos;s own inputs. The dataset has no passing, progression or defensive
                actions, so no trait claims to measure them.
              </p>
            </header>
            <TraitsRadar traits={p.traits} peers={peers} position={p.position} playerName={p.name} />
          </section>

          {p.history && p.history.length > 1 && (
            <section className={styles.panel} aria-labelledby="sec-history">
              <header className={styles.panelHead}>
                <p className={styles.panelNo}>03</p>
                <h2 id="sec-history" className={styles.h2}>
                  Valuation history
                </h2>
                <p className={styles.panelLede}>Every Transfermarkt valuation on record. The highlighted point is the one the model was trained to reproduce.</p>
              </header>
              <ValueHistory history={p.history} valuationDate={p.valuation_date} heldout={p.estimates.heldout.A} />
            </section>
          )}

          <section className={`${styles.panel} ${styles.audit}`} aria-labelledby="sec-audit">
            <header className={styles.panelHead}>
              <p className={styles.panelNo}>{p.history && p.history.length > 1 ? "04" : "03"}</p>
              <h2 id="sec-audit" className={styles.h2}>
                Audit context
              </h2>
            </header>
            <div className={styles.auditGrid}>
              <dl className={styles.auditFacts}>
                <div>
                  <dt>Audit group</dt>
                  <dd>{p.audit.group ?? "Not assigned"}</dd>
                </div>
                <div>
                  <dt>Group-level gap, Model A</dt>
                  <dd className="num">{signed(gap.estimate)}</dd>
                </div>
                <div>
                  <dt>This player, market vs held-out A</dt>
                  <dd className="num">{residual !== null ? signed(residual) : "full export only"}</dd>
                </div>
              </dl>
              <div className="prose">
                <p>
                  The audit group comes from the player&apos;s first-listed citizenship and is used only to compare groups. The model never sees
                  it. Across the population, non-UEFA players&apos; market values sit about {Math.round(Math.expm1(gap.estimate) * 100)}% above
                  Model A&apos;s held-out estimates, relative to UEFA players in the same leagues.
                </p>
                <p>
                  One player&apos;s residual says nothing about that pattern: individual estimates typically miss by a factor of{" "}
                  {Math.exp(heldOutLogMae("A")).toFixed(2)} either way. Nor is any of this evidence of discrimination: the target is
                  Transfermarkt&apos;s own valuation, which may itself be biased. <RoomLink href="/fairness">See the observatory</RoomLink>.
                </p>
              </div>
            </div>
          </section>
        </div>

        <section className={styles.more} aria-labelledby="more-title">
          <div className={styles.moreHead}>
            <h2 id="more-title" className={styles.h2}>
              More players
            </h2>
            <RoomLink href="/players" className={styles.moreAll}>
              All players →
            </RoomLink>
          </div>
          <ul className={styles.moreList}>
            {more.map((q) => (
              <li key={q.id}>
                <RoomLink href={`/players/${q.slug}`} className={styles.moreCard}>
                  <span className={styles.moreFigure} aria-hidden="true">
                    <PortraitSlot portrait={portraitFor(q.id)} name={q.name} size="card" />
                  </span>
                  <ViewTransition name={`glyph-${q.id}`} share="morph" default="none">
                    <span className={styles.moreGlyph} aria-hidden="true">
                      {q.role_code}
                    </span>
                  </ViewTransition>
                  <span className={styles.moreName}>
                    <small>{q.first_name}</small>
                    <ViewTransition name={`name-${q.id}`} share="morph" default="none">
                      <b>{q.last_name}</b>
                    </ViewTransition>
                  </span>
                  <span className={styles.moreMeta}>
                    {q.sub_position} · {q.club ?? leagueName(q.league_id).split(",")[0]}
                  </span>
                  <span className={`${styles.moreValue} num`}>{formatEur(q.market_value_eur)}</span>
                </RoomLink>
              </li>
            ))}
          </ul>
          <p className={styles.provenance}>
            {set.source === "showcase" ? "Research showcase: " : "Full player export: "}
            {set.selection} Generated by <code>{set.generated_by.split(" (")[0]}</code>.
          </p>
        </section>
      </article>
    </RoomTransition>
  );
}
