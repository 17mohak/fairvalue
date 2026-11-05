import { biggestSeparator, explanationMatrix, SLOTS, traitValue } from "@/lib/compare";
import { leagueName, TIER_BOUNDARIES_EUR, TIER_NAMES } from "@/lib/football";
import { formatEur, integer } from "@/lib/format";
import { euroTicks, factor, toEur } from "@/lib/journey";
import { TRAITS, type PeerStats, type PlayerProfile, type TraitKey } from "@/lib/players";
import { MarkKey, ModelMark, ObsMark } from "@/components/brand/Marks";
import { Marker } from "./Marker";
import styles from "./Compare.module.css";

const bestA = (p: PlayerProfile) => p.estimates.heldout.A ?? p.estimates.served.A;
const bestB = (p: PlayerProfile) => p.estimates.heldout.B ?? p.estimates.served.B;
const srcLabel = (p: PlayerProfile, m: "A" | "B") =>
  p.estimates.heldout[m] !== null ? "held-out" : p.estimates.served[m] !== null ? "served · cached · in-sample" : null;

// ---------------------------------------------------------------------------
// Value ladder: every player on one log-euro scale, one row each.
// ---------------------------------------------------------------------------
export function ValueLadder({ players }: { players: PlayerProfile[] }) {
  const vals = players.flatMap((p) => [p.market_value_eur, bestA(p), bestB(p)].filter((v): v is number => v !== null && v > 0));
  const lo = Math.log(Math.min(...vals, TIER_BOUNDARIES_EUR[0])) - 0.45;
  const hi = Math.log(Math.max(...vals, TIER_BOUNDARIES_EUR[2])) + 0.45;
  const x = (eur: number) => ((Math.log(eur) - lo) / (hi - lo)) * 100;
  const bounds = TIER_BOUNDARIES_EUR.map(x);
  const ticks = euroTicks([lo, hi]);

  return (
    <figure className={styles.ladder}>
      <div className={styles.ladderHead} aria-hidden="true">
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
      <ol className={styles.ladderRows}>
        {players.map((p, i) => {
          const a = bestA(p);
          const b = bestB(p);
          const xs = [p.market_value_eur, a, b].filter((v): v is number => v !== null).map(x);
          return (
            <li key={p.id} className={styles.ladderRow} style={{ "--player": SLOTS[i]!.color } as React.CSSProperties}>
              <span className={styles.ladderWho}>
                <Marker shape={SLOTS[i]!.shape} color={SLOTS[i]!.color} />
                <b>{p.last_name}</b>
              </span>
              <span className={styles.ladderTrack}>
                {bounds.map((bx) => (
                  <i key={bx} className={styles.bound} style={{ left: `${bx}%` }} />
                ))}
                <span className={styles.span} style={{ left: `${Math.min(...xs)}%`, width: `${Math.max(...xs) - Math.min(...xs)}%`, background: SLOTS[i]!.color }} />
                {b !== null && (
                  <span className={styles.mark} style={{ left: `${x(b)}%` }} title={`Model B ${formatEur(b)}`}>
                    <ModelMark model="B" size={13} />
                  </span>
                )}
                {a !== null && (
                  <span className={styles.mark} style={{ left: `${x(a)}%` }} title={`Model A ${formatEur(a)}`}>
                    <ModelMark size={14} />
                  </span>
                )}
                <span className={styles.mark} style={{ left: `${x(p.market_value_eur)}%` }} title={`Observed ${formatEur(p.market_value_eur)}`}>
                  <ObsMark size={13} />
                </span>
              </span>
              <span className={`${styles.ladderVals} num`}>
                <b>{formatEur(p.market_value_eur)}</b>
                <small>
                  A {a !== null ? formatEur(a) : "–"}
                  {b !== null ? ` · B ${formatEur(b)}` : ""}
                </small>
              </span>
            </li>
          );
        })}
      </ol>
      <div className={styles.ladderFoot} aria-hidden="true">
        <span />
        <span className={styles.ticks}>
          {ticks.map((t) => (
            <i key={t} style={{ left: `${x(t)}%` }}>
              {formatEur(t, 0)}
            </i>
          ))}
        </span>
        <span />
      </div>
      <figcaption className={styles.legend}>
        <MarkKey models={["A", "B"]} />
        <span>Each row is one player (their marker and colour on the left). Log scale, euros; dashed lines: the €2M / €10M / €30M tier boundaries.</span>
      </figcaption>
    </figure>
  );
}

// ---------------------------------------------------------------------------
// Explanation matrix: the same inputs, side by side, on one diverging scale.
// ---------------------------------------------------------------------------
export function ExplanationMatrix({ players }: { players: PlayerProfile[] }) {
  const rows = explanationMatrix(players, 10);
  const max = Math.max(0.05, ...rows.flatMap((r) => r.cells.map((c) => Math.abs(c?.contribution ?? 0))));
  const sep = biggestSeparator(rows);
  const withExpl = players.filter((p) => p.explanation);
  const base = withExpl[0]?.explanation?.base_log_value;
  const sameBase = withExpl.every((p) => Math.abs(p.explanation!.base_log_value - (base ?? 0)) < 1e-6);
  const sepCells = sep ? sep.cells.map((c, i) => ({ c, p: players[i]! })).filter((x) => x.c) : [];
  const hiCell = sepCells.reduce((a, b) => (b.c!.contribution > a.c!.contribution ? b : a), sepCells[0]!);
  const loCell = sepCells.reduce((a, b) => (b.c!.contribution < a.c!.contribution ? b : a), sepCells[0]!);

  if (withExpl.length < 2)
    return <p className="tm-note">Side-by-side explanations need a published explanation for at least two of these players.</p>;

  return (
    <div className={styles.matrixWrap}>
      {sep && hiCell && loCell && hiCell.p.id !== loCell.p.id && (
        <p className={styles.reading}>
          <b>{sep.label}</b> separates them most: {factor(hiCell.c!.contribution)} for {hiCell.p.last_name} ({hiCell.c!.input}) against{" "}
          {factor(loCell.c!.contribution)} for {loCell.p.last_name} ({loCell.c!.input}).
        </p>
      )}
      <table className={`tm-table ${styles.matrix}`}>
        <caption className="visually-hidden">Model A SHAP contributions by input, for each player</caption>
        <thead>
          <tr>
            <th scope="col">Input</th>
            {players.map((p, i) => (
              <th key={p.id} scope="col">
                <span className={styles.colHead}>
                  <Marker shape={SLOTS[i]!.shape} color={SLOTS[i]!.color} size={10} />
                  {p.last_name}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {base !== undefined && sameBase && (
            <tr className={styles.baseRow}>
              <th scope="row">Starting point</th>
              <td colSpan={players.length}>
                <span className="num">{formatEur(toEur(base))}</span> for every player: Model A&apos;s average output over its training data.
              </td>
            </tr>
          )}
          {rows.map((r) => (
            <tr key={r.feature} data-sep={r === sep || undefined}>
              <th scope="row">{r.label}</th>
              {r.cells.map((c, i) => (
                <td key={players[i]!.id}>
                  {c ? (
                    <span className={styles.cell} title={`${players[i]!.name}: ${r.label} ${c.input}, ${factor(c.contribution)}`}>
                      <span className={styles.cellBar}>
                        <i className={styles.zero} />
                        <span
                          data-dir={c.contribution >= 0 ? "up" : "down"}
                          style={{
                            left: c.contribution >= 0 ? "50%" : `${50 - (Math.abs(c.contribution) / max) * 50}%`,
                            width: `${(Math.abs(c.contribution) / max) * 50}%`,
                          }}
                        />
                      </span>
                      <span className={`${styles.cellVal} num`}>{factor(c.contribution)}</span>
                      <small>{c.input}</small>
                    </span>
                  ) : (
                    <span className={styles.na}>no explanation</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
          <tr className={styles.finalRow}>
            <th scope="row">Model A estimate</th>
            {players.map((p) => (
              <td key={p.id} className="num">
                {p.explanation ? formatEur(toEur(p.explanation.predicted_log_value)) : "–"}
                <small> vs observed {formatEur(p.market_value_eur)}</small>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
      <p className="tm-note">
        Top ten inputs by average effect across these players; the rest are smaller and appear in each dossier&apos;s full journey. Bars share one
        scale: right raises the estimate, left lowers it. Published SHAP values for the served Model A; these players were in its training data.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Trait strips: one axis per trait, one lane per player.
// ---------------------------------------------------------------------------
const TRAIT_ORDER: TraitKey[] = ["goals_p90", "assists_p90", "minutes", "start_share", "minutes_last_365", "intl_club_minutes_share"];
const SHARE: TraitKey[] = ["start_share", "intl_club_minutes_share"];

export function TraitStrips({ players, peers }: { players: PlayerProfile[]; peers: Partial<Record<string, PeerStats>> | null }) {
  const hasKeeper = players.some((p) => p.position === "Goalkeeper");
  return (
    <div className={styles.traits}>
      {TRAIT_ORDER.map((key) => {
        const t = TRAITS[key];
        const values = players.map((p) => traitValue(p, key));
        const peerTops = players.flatMap((p) => peers?.[p.position]?.traits[key]?.deciles.at(-1) ?? []);
        const max = SHARE.includes(key) ? 1 : Math.max(...values.filter((v): v is number => v !== null), ...peerTops, 0.001) * 1.12;
        const x = (v: number) => Math.min(100, (v / max) * 100);
        return (
          <div key={key} className={styles.trait}>
            <div className={styles.traitHead}>
              <b>{t.label}</b>
              <small>{t.definition}</small>
            </div>
            <div className={styles.lanes}>
              {players.map((p, i) => {
                const v = values[i] ?? null;
                const d = peers?.[p.position]?.traits[key]?.deciles;
                return (
                  <div key={p.id} className={styles.lane}>
                    <span className={styles.laneTrack}>
                      {d && d.length >= 9 && <span className={styles.peerBand} style={{ left: `${x(d[0]!)}%`, width: `${x(d.at(-1)!) - x(d[0]!)}%` }} title={`${p.position} peers, 10th to 90th percentile`} />}
                      {v !== null ? (
                        <span className={styles.laneMark} style={{ left: `${x(v)}%` }}>
                          <Marker shape={SLOTS[i]!.shape} color={SLOTS[i]!.color} size={11} />
                          <span className="num">{t.format(v)}</span>
                        </span>
                      ) : (
                        <span className={styles.laneNa}>not a goalkeeper measure</span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      <p className="tm-note">
        Raw values from the two years to each valuation date, on an axis from zero.
        {peers ? " Shaded bands: the 10th to 90th percentile of each player's positional peers." : " Positional peer percentiles need the full export; this build carries the showcase only."}
        {hasKeeper && " Goalkeepers are not placed on the goals and assists axes."}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// History: only real observations, never interpolated between them.
// ---------------------------------------------------------------------------
export function HistoryCompare({ players }: { players: PlayerProfile[] }) {
  const series = players.map((p, i) => ({ p, i, h: (p.history ?? []).filter((r) => r.value_eur > 0) }));
  const any = series.some((s) => s.h.length > 0);
  if (!any)
    return (
      <div className="tm-empty">
        <b>No valuation history in this build</b>
        <span>The showcase export carries each player&apos;s current valuation only. Histories come with the full local export.</span>
      </div>
    );
  const times = series.flatMap((s) => s.h.map((r) => Date.parse(r.date)));
  const vals = series.flatMap((s) => s.h.map((r) => Math.log(r.value_eur)));
  const [t0, t1] = [Math.min(...times), Math.max(...times)];
  const [v0, v1] = [Math.min(...vals) - 0.2, Math.max(...vals) + 0.2];
  const X = (t: number) => 40 + ((t - t0) / Math.max(1, t1 - t0)) * 620;
  const Y = (v: number) => 190 - ((v - v0) / (v1 - v0)) * 170;
  const ticks = euroTicks([v0, v1]);
  return (
    <figure className={styles.history}>
      <svg viewBox="0 0 680 210" role="img" aria-label="Observed valuation history of the compared players, log scale">
        {ticks.map((t) => (
          <g key={t}>
            <line x1="40" x2="660" y1={Y(Math.log(t))} y2={Y(Math.log(t))} stroke="rgb(237 239 230 / 0.08)" />
            <text x="34" y={Y(Math.log(t)) + 3} textAnchor="end" fontSize="9" fill="#8f9b93">
              {formatEur(t, 0)}
            </text>
          </g>
        ))}
        {series.map(({ p, i, h }) =>
          h.length ? (
            <g key={p.id}>
              {/* Steps, not slopes: a valuation holds until the next one is published. */}
              <path
                d={h
                  .map((r, k) => {
                    const xx = X(Date.parse(r.date));
                    const yy = Y(Math.log(r.value_eur));
                    return k === 0 ? `M${xx},${yy}` : `H${xx}V${yy}`;
                  })
                  .join("")}
                fill="none"
                stroke={SLOTS[i]!.color}
                strokeWidth="2"
              />
              {h.map((r) => (
                <circle key={r.date} cx={X(Date.parse(r.date))} cy={Y(Math.log(r.value_eur))} r="2.5" fill={SLOTS[i]!.color}>
                  <title>{`${p.name}, ${r.date}: ${formatEur(r.value_eur)}`}</title>
                </circle>
              ))}
            </g>
          ) : null,
        )}
      </svg>
      <figcaption className="tm-note">Published Transfermarkt valuations only, drawn as steps; nothing is interpolated between observations.</figcaption>
    </figure>
  );
}

// ---------------------------------------------------------------------------
// Facts: the record, aligned.
// ---------------------------------------------------------------------------
export function FactsTable({ players }: { players: PlayerProfile[] }) {
  const rows: [string, (p: PlayerProfile) => string][] = [
    ["Role", (p) => `${p.sub_position} (${p.position})`],
    ["League", (p) => leagueName(p.league_id).split(",")[0]!],
    ["Club", (p) => p.club ?? "not in this build"],
    ["Age", (p) => `${Math.floor(p.age)}`],
    ["Height", (p) => (p.height_cm ? `${Math.round(p.height_cm)} cm` : "–")],
    ["Foot", (p) => (p.foot ? p.foot[0]!.toUpperCase() + p.foot.slice(1) : "–")],
    ["Appearances", (p) => `${p.window.appearances}`],
    ["Minutes", (p) => integer(p.window.minutes)],
    ["Started", (p) => `${p.window.started} of ${p.window.appearances}`],
    ["Goals / assists", (p) => (p.position === "Goalkeeper" ? "–" : `${p.window.goals ?? "–"} / ${p.window.assists ?? "–"}`)],
    ["Observed value", (p) => `${formatEur(p.market_value_eur)}${p.market_tier ? ` · ${p.market_tier}` : ""}`],
    ["Model A", (p) => (bestA(p) !== null ? `${formatEur(bestA(p)!)} · ${srcLabel(p, "A")}` : "needs the live service")],
    ["Model B", (p) => (bestB(p) !== null ? `${formatEur(bestB(p)!)} · ${srcLabel(p, "B")}` : "live service or full export")],
  ];
  return (
    <div className={styles.factsWrap}>
      <table className="tm-table">
        <thead>
          <tr>
            <th scope="col">
              <span className="visually-hidden">Fact</span>
            </th>
            {players.map((p, i) => (
              <th key={p.id} scope="col">
                <span className={styles.colHead}>
                  <Marker shape={SLOTS[i]!.shape} color={SLOTS[i]!.color} size={10} />
                  {p.last_name}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, f]) => (
            <tr key={label}>
              <th scope="row">{label}</th>
              {players.map((p) => (
                <td key={p.id}>{f(p)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

