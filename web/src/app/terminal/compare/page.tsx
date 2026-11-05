import Link from "next/link";
import { ExpLink } from "@/components/site/ExpLink";
import { FactsTable, HistoryCompare, TraitStrips, ValueLadder } from "@/components/terminal/compare/CompareCharts";
import { CompareExplanations } from "@/components/terminal/compare/CompareExplanations";
import { ComparePicker } from "@/components/terminal/compare/ComparePicker";
import { WorkspaceHead } from "@/components/terminal/WorkspaceHead";
import type { PlayerProfile } from "@/lib/players";
import { playerById, playerSet } from "@/lib/players.server";
import { COMPARE_MIN, parseIds } from "@/lib/terminal";
import styles from "@/components/terminal/compare/Compare.module.css";

export const metadata = { title: "Comparison Studio" };

/** Suggested comparisons built from the export itself: players who share a position. */
function suggestions(players: PlayerProfile[]) {
  const byPos = new Map<string, PlayerProfile[]>();
  for (const p of [...players].sort((a, b) => b.market_value_eur - a.market_value_eur)) byPos.set(p.position, [...(byPos.get(p.position) ?? []), p]);
  return [...byPos.entries()]
    .filter(([, ps]) => ps.length >= 2)
    .map(([pos, ps]) => ({ pos, players: ps.slice(0, 4) }));
}

export default async function ComparePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const ids = parseIds((await searchParams).ids);
  const players = ids.map(playerById).filter((p): p is PlayerProfile => !!p);
  const missing = ids.length - players.length;
  const chips = players.map((p) => ({ id: p.id, name: p.name, role_code: p.role_code }));
  const set = playerSet();

  return (
    <div className={styles.compare}>
      <WorkspaceHead id="compare" note="Two to four players on one scale: observed value, both models, what moves each estimate, and the record behind it." />
      <ComparePicker players={chips} />
      {missing > 0 && <p className="tm-note">{missing === 1 ? "One requested player is" : `${missing} requested players are`} not in this build&apos;s export and were left out.</p>}

      {players.length < COMPARE_MIN ? (
        <div className={`tm-panel ${styles.start}`}>
          <div className="tm-empty">
            <b>{players.length === 1 ? "Add one more player to compare" : "Choose players to compare"}</b>
            <span>Tick players in the Explorer, add them above, or start from a group that shares a position.</span>
          </div>
          <ul className={styles.suggest}>
            {suggestions(set.players).map((s) => (
              <li key={s.pos}>
                <Link href={`/terminal/compare?ids=${s.players.map((p) => p.id).join(",")}`} className={styles.suggestLink}>
                  <span className="tm-title">{s.players.length === 2 ? "Both" : `${s.players.length}`} {s.pos === "Attack" ? "attackers" : s.pos === "Midfield" ? "midfielders" : s.pos === "Defender" ? "defenders" : "goalkeepers"}</span>
                  <span>{s.players.map((p) => p.last_name).join(" · ")}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className={styles.grid}>
          <section className={`tm-panel ${styles.areaLadder}`} aria-labelledby="cmp-ladder">
            <header className="tm-panel-head">
              <h2 id="cmp-ladder" className="tm-title">Value ladder</h2>
              <span className="tm-sub">observed value against Model A and Model B, one row per player</span>
            </header>
            <div className="tm-panel-body">
              <ValueLadder players={players} />
            </div>
          </section>
          <section className={`tm-panel ${styles.areaMatrix}`} aria-labelledby="cmp-matrix">
            <header className="tm-panel-head">
              <h2 id="cmp-matrix" className="tm-title">What moves each estimate</h2>
              <span className="tm-sub">Model A, input by input</span>
            </header>
            <div className="tm-panel-body">
              <CompareExplanations players={players} />
            </div>
          </section>
          <section className={`tm-panel ${styles.areaTraits}`} aria-labelledby="cmp-traits">
            <header className="tm-panel-head">
              <h2 id="cmp-traits" className="tm-title">Performance profile</h2>
              <span className="tm-sub">model inputs, two years to the valuation date</span>
            </header>
            <div className="tm-panel-body">
              <TraitStrips players={players} peers={set.peers} />
            </div>
          </section>
          <section className={`tm-panel ${styles.areaFacts}`} aria-labelledby="cmp-facts">
            <header className="tm-panel-head">
              <h2 id="cmp-facts" className="tm-title">The record</h2>
              <span className="tm-sub">
                {players.map((p, i) => (
                  <span key={p.id}>
                    {i > 0 && " · "}
                    <ExpLink href={`/players/${p.slug}?from=terminal`}>{p.last_name} dossier</ExpLink>
                  </span>
                ))}
              </span>
            </header>
            <FactsTable players={players} />
          </section>
          <section className={`tm-panel ${styles.areaHistory}`} aria-labelledby="cmp-history">
            <header className="tm-panel-head">
              <h2 id="cmp-history" className="tm-title">Valuation history</h2>
            </header>
            <div className="tm-panel-body">
              <HistoryCompare players={players} />
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
