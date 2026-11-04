"use client";

import { motion, useReducedMotion } from "motion/react";
import { useId, useState } from "react";
import type { Position } from "@/lib/football";
import { integer } from "@/lib/format";
import { POSITION_PLURAL, TRAITS, type PeerStats, type TraitKey, type TraitValue } from "@/lib/players";
import styles from "./TraitsRadar.module.css";

const SIZE = 440;
const C = SIZE / 2;
const R = 150;
const RINGS = [25, 50, 75, 100];

/** Axes used when no percentiles exist yet (showcase build): same layout, no values. */
const OUTFIELD: TraitKey[] = ["goals_p90", "assists_p90", "minutes", "start_share", "minutes_last_365", "intl_club_minutes_share"];
const KEEPER: TraitKey[] = ["minutes", "start_share", "minutes_last_365", "intl_club_minutes_share"];

const ordinal = (n: number) => {
  const r = Math.round(n);
  const s = r % 100 >= 11 && r % 100 <= 13 ? "th" : (["th", "st", "nd", "rd"][r % 10] ?? "th");
  return `${r}${s}`;
};

function point(i: number, n: number, radius: number): [number, number] {
  const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
  return [C + Math.cos(a) * radius, C + Math.sin(a) * radius];
}

interface Props {
  traits: TraitValue[] | null;
  peers: PeerStats | null;
  position: Position;
  playerName: string;
}

export function TraitsRadar({ traits, peers, position, playerName }: Props) {
  const reduce = useReducedMotion();
  const id = useId();
  const keys = traits ? traits.map((t) => t.key) : position === "Goalkeeper" ? KEEPER : OUTFIELD;
  const byKey = new Map(traits?.map((t) => [t.key, t]) ?? []);
  const strongest = traits ? [...traits].sort((a, b) => b.percentile - a.percentile)[0]!.key : keys[0]!;
  const [pinned, setPinned] = useState<TraitKey>(strongest);
  const [hover, setHover] = useState<TraitKey | null>(null);
  const active = hover ?? pinned;
  const n = keys.length;
  const ready = !!traits && !!peers;

  const polygon = keys.map((k, i) => point(i, n, ((byKey.get(k)?.percentile ?? 0) / 100) * R).join(",")).join(" ");
  const peerPlural = POSITION_PLURAL[position];

  return (
    <div className={styles.radar} data-ready={ready || undefined}>
      <div className={styles.chart}>
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className={styles.svg} role="img" aria-labelledby={`${id}-desc`}>
          <desc id={`${id}-desc`}>
            {ready
              ? `${playerName}'s percentiles among ${peerPlural}: ` + traits!.map((t) => `${TRAITS[t.key].label} ${ordinal(t.percentile)}`).join(", ")
              : `Radar axes for ${peerPlural}. Percentiles are not available in this build.`}
          </desc>
          {/* Rings: the 50th percentile ring is the positional median. */}
          {RINGS.map((q) => (
            <polygon
              key={q}
              className={styles.ring}
              data-median={q === 50 || undefined}
              points={keys.map((_, i) => point(i, n, (q / 100) * R).join(",")).join(" ")}
            />
          ))}
          {keys.map((k, i) => {
            const [x, y] = point(i, n, R);
            return <line key={k} className={styles.spoke} data-active={k === active || undefined} x1={C} y1={C} x2={x} y2={y} />;
          })}
          <text className={styles.ringLabel} x={C + 4} y={C - R / 2 - 4}>
            peer median
          </text>

          {ready && (
            <motion.g
              style={{ transformOrigin: `${C}px ${C}px` }}
              initial={reduce ? false : { scale: 0.2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            >
              <polygon className={styles.shape} points={polygon} />
              {keys.map((k, i) => {
                const [x, y] = point(i, n, ((byKey.get(k)?.percentile ?? 0) / 100) * R);
                return <circle key={k} className={styles.vertex} data-active={k === active || undefined} cx={x} cy={y} r={k === active ? 6 : 4} />;
              })}
            </motion.g>
          )}

          {keys.map((k, i) => {
            const [x, y] = point(i, n, R + 34);
            const t = byKey.get(k);
            const anchor = Math.abs(x - C) < 8 ? "middle" : x > C ? "start" : "end";
            return (
              <g key={k} className={styles.axisLabel} data-active={k === active || undefined}>
                {t && (
                  <text x={x} y={y - 8} textAnchor={anchor} className={styles.axisValue}>
                    {ordinal(t.percentile)}
                  </text>
                )}
                <text x={x} y={t ? y + 12 : y + 4} textAnchor={anchor} className={styles.axisName}>
                  {TRAITS[k].short}
                </text>
              </g>
            );
          })}
        </svg>

        {!ready && (
          <div className={styles.pending}>
            <p className={styles.pendingTitle}>Peer percentiles are not in this build</p>
            <p>
              They are computed from the full population by <code>python -m src.product.players</code>, which needs the dataset. The
              committed showcase carries no peer distribution, so no value is drawn rather than an invented one.
            </p>
          </div>
        )}
      </div>

      <div className={styles.side}>
        <p className={styles.peerNote}>
          Compared with {peers ? <span className="num">{integer(peers.n)}</span> : "all"} {peerPlural} in the modelling population, on the
          features the model uses.
        </p>
        <ul className={styles.axes} aria-label="Traits">
          {keys.map((k) => {
            const t = byKey.get(k);
            return (
              <li key={k}>
                <button
                  type="button"
                  className={styles.axisButton}
                  aria-pressed={k === pinned}
                  data-active={k === active || undefined}
                  onClick={() => setPinned(k)}
                  onPointerEnter={() => setHover(k)}
                  onPointerLeave={() => setHover(null)}
                  onFocus={() => setHover(k)}
                  onBlur={() => setHover(null)}
                >
                  <span className={styles.axisButtonName}>{TRAITS[k].label}</span>
                  <span className={styles.bar} aria-hidden="true">
                    <span style={{ width: `${t?.percentile ?? 0}%` }} />
                  </span>
                  <span className={`${styles.axisButtonValue} num`}>{t ? ordinal(t.percentile) : "–"}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <Detail traitKey={active} trait={byKey.get(active) ?? null} peers={peers} peerPlural={peerPlural} />
      </div>
    </div>
  );
}

function Detail({ traitKey, trait, peers, peerPlural }: { traitKey: TraitKey; trait: TraitValue | null; peers: PeerStats | null; peerPlural: string }) {
  const meta = TRAITS[traitKey];
  const dist = peers?.traits[traitKey];
  return (
    <div className={styles.detail} aria-live="polite">
      <p className={styles.detailName}>{meta.label}</p>
      <p className={styles.detailDef}>{meta.definition}</p>
      {trait && trait.value !== null && dist ? (
        <>
          <p className={styles.detailFigures}>
            <span>
              <b className="num">{meta.format(trait.value)}</b> this player
            </span>
            <span>
              <b className="num">{meta.format(dist.median)}</b> {peerPlural.replace(/s$/, "")} median
            </span>
            <span>
              <b className="num">{ordinal(trait.percentile)}</b> percentile
            </span>
          </p>
          <DecileStrip deciles={dist.deciles} value={trait.value} format={meta.format} />
        </>
      ) : (
        <p className={styles.detailMissing}>No peer comparison in this build.</p>
      )}
    </div>
  );
}

/** The peer distribution as ten decile bands, with this player's value marked on it. */
function DecileStrip({ deciles, value, format }: { deciles: number[]; value: number; format: (v: number) => string }) {
  const lo = deciles[0]!;
  const hi = deciles[deciles.length - 1]!;
  const span = hi - lo || 1;
  const pos = (v: number) => Math.min(100, Math.max(0, ((v - lo) / span) * 100));
  return (
    <figure className={styles.strip}>
      <div className={styles.stripTrack} aria-hidden="true">
        {deciles.slice(0, -1).map((d, i) => (
          <span key={i} className={styles.band} data-mid={i === 4 || i === 5 || undefined} style={{ left: `${pos(d)}%`, width: `${pos(deciles[i + 1]!) - pos(d)}%` }} />
        ))}
        <span className={styles.median} style={{ left: `${pos(deciles[5]!)}%` }} />
        <span className={styles.marker} style={{ left: `${pos(value)}%` }} />
      </div>
      <figcaption className={styles.stripAxis}>
        <span className="num">{format(lo)}</span>
        <span>peer deciles · median line · this player ●</span>
        <span className="num">{format(hi)}</span>
      </figcaption>
    </figure>
  );
}
