import Link from "next/link";
import { WorkspaceHead } from "@/components/terminal/WorkspaceHead";
import { leagueCountry, leagueName, POSITIONS } from "@/lib/football";
import { decimal, formatEur, integer, signed } from "@/lib/format";
import { playerSet } from "@/lib/players.server";
import { research } from "@/lib/research";
import styles from "../landscape.module.css";
import board from "./leagues.module.css";

export const metadata = { title: "League Landscape" };

type Sort = "median" | "n" | "mae" | "residual" | "name";
const SORTS: { id: Sort; label: string }[] = [
  { id: "median", label: "Median value" },
  { id: "n", label: "Players" },
  { id: "mae", label: "Model A error" },
  { id: "residual", label: "Mean residual" },
  { id: "name", label: "Name" },
];

export default async function LeaguesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = (await searchParams).sort;
  const sort: Sort = SORTS.some((s) => s.id === raw) ? (raw as Sort) : "median";
  const rows = [...research.market.leagues].sort((a, b) =>
    sort === "name"
      ? leagueName(a.key).localeCompare(leagueName(b.key))
      : sort === "n"
        ? b.total - a.total
        : sort === "mae"
          ? b.A.mae! - a.A.mae!
          : sort === "residual"
            ? b.A.mean_residual! - a.A.mean_residual!
            : b.median_value_eur! - a.median_value_eur!,
  );
  const total = rows.reduce((s, r) => s + r.total, 0);
  const maxN = Math.max(...rows.map((r) => r.total));
  const [vlo, vhi] = [Math.log(250_000), Math.log(25_000_000)];
  const vx = (v: number) => ((Math.log(v) - vlo) / (vhi - vlo)) * 100;
  const maxMae = Math.max(...rows.flatMap((r) => [r.A.mae!, r.B.mae!])) * 1.05;
  const maxRes = Math.max(...rows.map((r) => Math.abs(r.A.mean_residual!))) * 1.1;
  const set = playerSet();
  const full = set.source === "full";
  const composition = full
    ? rows.map((r) => {
        const ps = set.players.filter((p) => p.league_id === r.key);
        return { key: r.key, n: ps.length, counts: POSITIONS.map((pos) => ps.filter((p) => p.position === pos).length) };
      })
    : null;

  return (
    <div className={styles.page}>
      <WorkspaceHead id="leagues" note="The fourteen covered first divisions: how many players each contributes, how they are valued, and how well the model does there." />
      <dl className={styles.context}>
        <div>
          <dt>Leagues</dt>
          <dd>14 European first divisions</dd>
        </div>
        <div>
          <dt>Players</dt>
          <dd className="num">{integer(total)}</dd>
        </div>
        <div>
          <dt>Errors</dt>
          <dd>held-out, log scale; residual = log(observed) − log(estimate)</dd>
        </div>
        <div>
          <dt>Coverage</dt>
          <dd>leagues chosen for data coverage; not the global market</dd>
        </div>
      </dl>

      <section className="tm-panel" aria-labelledby="lg-board">
        <header className="tm-panel-head">
          <h2 id="lg-board" className="tm-title">League board</h2>
          <nav className={styles.sortLinks} aria-label="Sort leagues">
            {SORTS.map((s) => (
              <Link key={s.id} href={s.id === "median" ? "/terminal/leagues" : `/terminal/leagues?sort=${s.id}`} aria-current={s.id === sort ? "true" : undefined} scroll={false}>
                {s.label}
              </Link>
            ))}
          </nav>
        </header>
        <div className={styles.tableWrap}>
          <table className={`tm-table ${board.board}`}>
            <thead>
              <tr>
                <th scope="col">League</th>
                <th scope="col">Players</th>
                <th scope="col">
                  Median observed value <span className={board.scale}>€250k · €2M · €25M, log</span>
                </th>
                <th scope="col">Held-out error (MAE, log)</th>
                <th scope="col">Mean residual, Model A</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key}>
                  <th scope="row">
                    <b>{leagueName(r.key).split(",")[0]}</b>
                    <small>{leagueCountry(r.key)}</small>
                  </th>
                  <td>
                    <span className={board.cell}>
                      <span className={board.bar} style={{ width: `${(r.total / maxN) * 100}%` }} />
                      <span className="num">{integer(r.total)}</span>
                    </span>
                  </td>
                  <td>
                    <span className={board.cell}>
                      <span className={board.track}>
                        <i style={{ left: `${vx(2_000_000)}%` }} />
                        <span className={board.dot} style={{ left: `${vx(r.median_value_eur!)}%` }} />
                      </span>
                      <span className="num">{formatEur(r.median_value_eur!)}</span>
                    </span>
                  </td>
                  <td>
                    <span className={board.cell}>
                      <span className={board.track}>
                        <span className={board.link} style={{ left: `${(r.A.mae! / maxMae) * 100}%`, width: `${((r.B.mae! - r.A.mae!) / maxMae) * 100}%` }} />
                        <span className={board.b} style={{ left: `${(r.B.mae! / maxMae) * 100}%` }} />
                        <span className={board.a} style={{ left: `${(r.A.mae! / maxMae) * 100}%` }} />
                      </span>
                      <span className="num">
                        {decimal(r.A.mae!, 3)} <small>B {decimal(r.B.mae!, 2)}</small>
                      </span>
                    </span>
                  </td>
                  <td>
                    <span className={board.cell}>
                      <span className={board.track}>
                        <i style={{ left: "50%" }} />
                        <span
                          className={board.res}
                          data-sign={r.A.mean_residual! >= 0 ? "pos" : "neg"}
                          style={
                            r.A.mean_residual! >= 0
                              ? { left: "50%", width: `${(r.A.mean_residual! / maxRes) * 50}%` }
                              : { right: "50%", width: `${(-r.A.mean_residual! / maxRes) * 50}%` }
                          }
                        />
                      </span>
                      <span className="num">{signed(r.A.mean_residual!, 3)}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="tm-panel-body">
          <p className="tm-note">
            <b>Reading the board.</b> Median value is the middle observed value of the league&apos;s players in the population (the line marks €2M).
            Error dots: <b>gold</b> Model A, <b>outlined</b> Model B; B leaves league and club out, and misses by more in every covered league. Mean
            residual above zero means observed values sit above Model A&apos;s estimates in that league on average. League-level averages; individual
            players vary widely.
          </p>
        </div>
      </section>

      <section className="tm-panel" aria-labelledby="lg-pos">
        <header className="tm-panel-head">
          <h2 id="lg-pos" className="tm-title">Position composition</h2>
          <span className="tm-sub">{full ? "players by position, from the local export" : "needs the full export"}</span>
        </header>
        <div className="tm-panel-body">
          {composition ? (
            <ul className={board.comp}>
              {composition.map((c) => (
                <li key={c.key}>
                  <span>{leagueName(c.key).split(",")[0]}</span>
                  <span className={board.stack}>
                    {c.counts.map((k, i) => (
                      <span key={POSITIONS[i]} data-pos={POSITIONS[i]} style={{ flexGrow: k }} title={`${POSITIONS[i]}: ${k}`} />
                    ))}
                  </span>
                  <span className="num">{c.n}</span>
                </li>
              ))}
            </ul>
          ) : null}
          {composition ? (
            <p className={board.legend}>
              {POSITIONS.map((pos) => (
                <span key={pos}>
                  <i data-pos={pos} /> {pos}
                </span>
              ))}
            </p>
          ) : (
            <p className="tm-note">
              The published research tables give each league&apos;s size and errors but not its position mix. With the full local export (
              <code>python -m src.product.players</code>) this panel shows goalkeepers, defenders, midfielders and attackers per league.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
