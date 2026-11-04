import type { Metadata } from "next";
import { ViewTransition } from "react";
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
  const moreHref = `/players?${new URLSearchParams({ ...Object.fromEntries(Object.entries(query).filter(([, v]) => v)), show: String(shown + PAGE) })}`;

  return (
    <RoomTransition>
      <div className={styles.board}>
        <header className={styles.head}>
          <div className={styles.headText}>
            <p className="eyebrow">
              <b className="num">{room("players").index}</b> Players
            </p>
            <h1 className={styles.title}>The squad behind the model</h1>
            <p className={styles.lede}>
              {showcase ? (
                <>
                  The eight players the explainability analysis selected, one per audit group and predicted tier. Each profile sets the observed
                  market value against the model&apos;s estimates and explains them.
                </>
              ) : (
                <>
                  All {integer(all.length)} players in the modelling population: clubs in 14 European first divisions, valued June 2025 to June 2026,
                  with at least 450 minutes.
                </>
              )}
            </p>
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
              <dd>{showcase ? "Research showcase" : "Full export"}</dd>
            </div>
          </dl>
        </header>

        <BoardControls query={query} leagues={leagues.map((id) => ({ id, label: leagueName(id) }))} total={results.length} />

        {results.length === 0 ? (
          <div className={styles.empty}>
            <p className={styles.emptyTitle}>No players match these filters.</p>
            <RoomLink href="/players">Clear the filters</RoomLink>
          </div>
        ) : (
          <ol className={styles.grid}>
            {results.slice(0, shown).map((p, i) => (
              <li key={p.id} style={{ "--i": Math.min(i, 12) } as React.CSSProperties}>
                <RoomLink href={`/players/${p.slug}`} className={styles.card}>
                  <span className={styles.cardScene} aria-hidden="true" />
                  <ViewTransition name={`glyph-${p.id}`} share="morph" default="none">
                    <span className={styles.cardGlyph} aria-hidden="true">
                      {p.role_code}
                    </span>
                  </ViewTransition>
                  <span className={styles.cardFigure} aria-hidden="true">
                    <PortraitSlot portrait={portraitFor(p.id)} name={p.name} size="card" />
                  </span>
                  <span className={styles.cardBody}>
                    <span className={styles.cardRole}>
                      <b>{p.role_code}</b> {p.sub_position}
                    </span>
                    <span className={styles.cardName}>
                      {p.first_name && <small>{p.first_name}</small>}
                      <ViewTransition name={`name-${p.id}`} share="morph" default="none">
                        <b>{p.last_name}</b>
                      </ViewTransition>
                    </span>
                    <span className={styles.cardMeta}>
                      {p.club ? `${p.club} · ` : ""}
                      {leagueName(p.league_id).split(",")[0]} · {Math.floor(p.age)} yrs
                    </span>
                    <span className={styles.cardValue}>
                      <span className="num">{formatEur(p.market_value_eur)}</span>
                      {p.market_tier && <span className={styles.cardTier}>{p.market_tier}</span>}
                    </span>
                  </span>
                  <span className={styles.cardArrow} aria-hidden="true">
                    →
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
            <strong>Market value</strong> on these cards is the observed Transfermarkt value, the model&apos;s target. Profiles add the model&apos;s
            estimates. Players are never ranked by model error: a gap between market and model is not a verdict on the player.
          </p>
          {showcase && (
            <p>
              The full board of every player in the research population is built locally with <code>python -m src.product.players</code>{" "}
              (needs the dataset; not committed). Portraits appear only for images listed with a licence in <code>web/src/data/portraits.json</code>.
            </p>
          )}
        </aside>
      </div>
    </RoomTransition>
  );
}
