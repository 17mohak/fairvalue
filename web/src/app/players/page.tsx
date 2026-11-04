import type { Metadata } from "next";
import { ViewTransition } from "react";
import { MiniRuler } from "@/components/players/MiniRuler";
import { PortraitSlot } from "@/components/players/PortraitSlot";
import { RoomLink } from "@/components/site/RoomLink";
import { RoomTransition } from "@/components/site/RoomTransition";
import { LEAGUES, leagueName } from "@/lib/football";
import { formatEur, integer } from "@/lib/format";
import { filterPlayers, parseBoardQuery, summary } from "@/lib/players";
import { playerSet } from "@/lib/players.server";
import { portraitFor } from "@/lib/portraits";
import { room } from "@/lib/rooms";
import { BoardControls } from "./BoardControls";
import styles from "./players.module.css";

export const metadata: Metadata = {
  title: "Players",
  description: "Players from FairValue's research population: observed market value, model estimates and positional traits.",
};

const PAGE = 48;

export default async function PlayersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const query = parseBoardQuery(sp);
  const set = playerSet();
  const all = set.players.map(summary);
  const results = filterPlayers(all, query);
  const shown = Math.min(results.length, Math.max(PAGE, Number(sp.show) || PAGE));
  const leagues = [...new Set(all.map((p) => p.league_id))].sort((a, b) => (LEAGUES[a]?.country ?? a).localeCompare(LEAGUES[b]?.country ?? b));
  const showcase = set.source === "showcase";
  const moreHref = `/players?${new URLSearchParams({ ...Object.fromEntries(Object.entries(query).filter(([k, v]) => v && !(k === "view" && v === "cards") && !(k === "sort" && v === "value"))), show: String(shown + PAGE) })}`;

  const SOURCE = { heldout: "held-out", cached: "served · cached" } as const;
  const per90 = (n: number | null, mins: number) => (n === null ? "–" : ((n * 90) / mins).toFixed(2));

  return (
    <RoomTransition>
      <div className={styles.board}>
        <header className="fv-pagehead">
          <div>
            <p className="eyebrow">
              <b className="num">{room("players").index}</b> Player database
            </p>
            <h1>Players</h1>
          </div>
          <dl className={styles.counts}>
            <div>
              <dt>Players</dt>
              <dd className="num">{integer(all.length)}</dd>
            </div>
            <div>
              <dt>Leagues</dt>
              <dd className="num">{leagues.length}</dd>
            </div>
            <div>
              <dt>Source</dt>
              <dd>
                <span className="fv-chip" data-tone="flood">
                  {showcase ? "Research showcase" : "Full export"}
                </span>
              </dd>
            </div>
          </dl>
          <p className={styles.lede}>
            {showcase
              ? "The eight players the explainability analysis selected, one per audit group and predicted tier: observed market value, the model's estimate, and their record."
              : `Every player in the modelling population: clubs in 14 European first divisions, valued June 2025 to June 2026, with at least 450 minutes.`}
          </p>
        </header>

        <BoardControls query={query} leagues={leagues.map((id) => ({ id, label: leagueName(id) }))} total={results.length} />

        {results.length === 0 ? (
          <div className={styles.empty}>
            <p className={styles.emptyTitle}>No players match these filters.</p>
            <RoomLink href="/players">Clear the filters</RoomLink>
          </div>
        ) : query.view === "table" ? (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Player</th>
                  <th scope="col">Club · league</th>
                  <th scope="col" className={styles.n}>Age</th>
                  <th scope="col" className={styles.n}>Apps</th>
                  <th scope="col" className={styles.n}>Minutes</th>
                  <th scope="col" className={styles.n}>G / 90</th>
                  <th scope="col" className={styles.n}>A / 90</th>
                  <th scope="col" className={styles.n}>Market value</th>
                  <th scope="col" className={styles.n}>Model A</th>
                  <th scope="col">Tier</th>
                </tr>
              </thead>
              <tbody>
                {results.slice(0, shown).map((p) => (
                  <tr key={p.id}>
                    <th scope="row">
                      <RoomLink href={`/players/${p.slug}`} className={styles.rowLink}>
                        <span className="fv-role">{p.role_code}</span>
                        <span>
                          <b>{p.last_name}</b> {p.first_name}
                        </span>
                      </RoomLink>
                    </th>
                    <td>
                      {p.club ? `${p.club} · ` : ""}
                      {leagueName(p.league_id).split(",")[0]}
                    </td>
                    <td className={`${styles.n} num`}>{Math.floor(p.age)}</td>
                    <td className={`${styles.n} num`}>{p.window.appearances}</td>
                    <td className={`${styles.n} num`}>{integer(p.window.minutes)}</td>
                    <td className={`${styles.n} num`}>{per90(p.window.goals, p.window.minutes)}</td>
                    <td className={`${styles.n} num`}>{per90(p.window.assists, p.window.minutes)}</td>
                    <td className={`${styles.n} ${styles.value} num`}>{formatEur(p.market_value_eur)}</td>
                    <td className={`${styles.n} num`}>
                      {p.estimate ? (
                        <>
                          {formatEur(p.estimate.value)} <small>{SOURCE[p.estimate.source]}</small>
                        </>
                      ) : (
                        "–"
                      )}
                    </td>
                    <td>{p.market_tier}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <ol className={styles.grid}>
            {results.slice(0, shown).map((p, i) => (
              <li key={p.id} style={{ "--i": Math.min(i, 12) } as React.CSSProperties}>
                <RoomLink href={`/players/${p.slug}`} className={styles.card}>
                  <span className={styles.cardTop}>
                    <span className={styles.thumb} aria-hidden="true">
                      <PortraitSlot portrait={portraitFor(p.id)} name={p.name} roleCode={p.role_code} size="card" />
                    </span>
                    <span className={styles.ident}>
                      <span className={styles.cardName}>
                        <ViewTransition name={`name-${p.id}`} share="morph" default="none">
                          <b>{p.last_name}</b>
                        </ViewTransition>
                        {p.first_name && <small>{p.first_name}</small>}
                      </span>
                      <span className={styles.cardRole}>
                        <ViewTransition name={`glyph-${p.id}`} share="morph" default="none">
                          <span className="fv-role">{p.role_code}</span>
                        </ViewTransition>
                        {p.sub_position}
                      </span>
                      <span className={styles.cardMeta}>
                        {p.club ? `${p.club} · ` : ""}
                        {leagueName(p.league_id).split(",")[0]} · {Math.floor(p.age)} yrs
                        {p.nationality ? ` · ${p.nationality}` : ""}
                      </span>
                    </span>
                  </span>
                  <dl className={styles.stats}>
                    <div>
                      <dt>Apps</dt>
                      <dd className="num">{p.window.appearances}</dd>
                    </div>
                    <div>
                      <dt>Min</dt>
                      <dd className="num">{integer(p.window.minutes)}</dd>
                    </div>
                    {p.position === "Goalkeeper" ? (
                      <div>
                        <dt>Started</dt>
                        <dd className="num">{Math.round((p.window.started / Math.max(1, p.window.appearances)) * 100)}%</dd>
                      </div>
                    ) : (
                      <>
                        <div>
                          <dt>G</dt>
                          <dd className="num">{p.window.goals ?? "–"}</dd>
                        </div>
                        <div>
                          <dt>A</dt>
                          <dd className="num">{p.window.assists ?? "–"}</dd>
                        </div>
                      </>
                    )}
                  </dl>
                  <span className={styles.valueRow}>
                    <span className={styles.valueMain}>
                      <span className="fv-label">Market</span>
                      <span className={`${styles.market} num`}>{formatEur(p.market_value_eur)}</span>
                    </span>
                    {p.estimate && (
                      <span className={styles.valueModel}>
                        <span className="fv-label">Model A · {SOURCE[p.estimate.source]}</span>
                        <span className="num">
                          {formatEur(p.estimate.value)} <small>×{(p.estimate.value / p.market_value_eur).toFixed(2)}</small>
                        </span>
                      </span>
                    )}
                  </span>
                  <MiniRuler
                    marks={[
                      { value: p.market_value_eur, kind: "market", label: "Market value" },
                      ...(p.estimate ? [{ value: p.estimate.value, kind: "model" as const, label: "Model A" }] : []),
                    ]}
                  />
                  <span className={styles.cardFoot}>
                    <span className="fv-chip">{p.market_tier}</span>
                    <span className={styles.open} aria-hidden="true">
                      Dossier →
                    </span>
                  </span>
                </RoomLink>
              </li>
            ))}
          </ol>
        )}

        {shown < results.length && (
          <p className={styles.moreWrap}>
            <RoomLink href={moreHref} className={styles.moreButton} scroll={false}>
              Show more ({integer(results.length - shown)} left)
            </RoomLink>
          </p>
        )}

        <aside className={styles.note}>
          <p>
            Market value is the observed Transfermarkt value, the model&apos;s target; the hollow marker is Model A&apos;s estimate
            {showcase ? " (the served model's published result, cached)" : " (held-out, from cross-validation)"}. Players are never ranked by model
            error: a gap between market and model is not a verdict on the player.
          </p>
          {showcase && (
            <p>
              The full database is built locally with <code>python -m src.product.players</code> (needs the dataset). Portraits appear only for
              licensed images listed in <code>web/src/data/portraits.json</code>.
            </p>
          )}
        </aside>
      </div>
    </RoomTransition>
  );
}
