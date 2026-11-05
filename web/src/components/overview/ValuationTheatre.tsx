"use client";

import { useId, useMemo, useState } from "react";
import { LeagueFlag } from "@/components/brand/Flag";
import { ModelMark, ObsMark, Residual } from "@/components/brand/Marks";
import { ExpLink } from "@/components/site/ExpLink";
import { leagueName } from "@/lib/football";
import { formatEur } from "@/lib/format";
import { factor } from "@/lib/journey";
import { logScaleFor, pathOf, pitchDrawing, residualOf, shortName, squareToQuad, type CastMember, type Quad } from "@/lib/theatre";
import styles from "./Theatre.module.css";

// The pitch in screen space (viewBox 1200 × 720), seen from a high camera behind the near
// touchline and a little to the left, so it recedes towards the top right.
const W = 1200;
const H = 720;
/** The sky above the far touchline is cropped: the arcs and the light need only part of it. */
const VB_TOP = 128;
const QUAD: Quad = [
  { x: -70, y: 676 },
  { x: 1236, y: 628 },
  { x: 1086, y: 300 },
  { x: 420, y: 318 },
];
const P = squareToQuad(QUAD);

/** Values occupy the middle of the pitch, never the goal lines. */
const U0 = 0.05;
const U1 = 0.95;

const PITCH = pitchDrawing(P);
const { line } = PITCH;
const MARKINGS = PITCH.markings;
const SPOTS = PITCH.spots;
const GOALS = PITCH.goals;
const STRIPES = PITCH.stripes;

interface Props {
  cast: CastMember[];
  /** e.g. "the seven most valuable players in the modelling population". */
  rule: string;
}

/**
 * THE VALUATION THEATRE. The pitch is the instrument: its length is a log value scale fitted to
 * the players shown, each lane across it is one real player, the solid disc is the observed
 * Transfermarkt value and the gold diamond the Model A estimate. The arc between them is the
 * residual, log(observed) − log(estimate), on the research's own definition.
 */
export function ValuationTheatre({ cast, rule }: Props) {
  const [active, setActiveRaw] = useState(0);
  // After the first hover or focus the entrance choreography is over: callouts swap at once.
  const [touched, setTouched] = useState(false);
  const setActive = (i: number) => {
    setActiveRaw(i);
    setTouched(true);
  };
  const uid = useId().replace(/:/g, "");
  const scale = useMemo(() => logScaleFor(cast.flatMap((c) => [c.market_value_eur, c.estimate]), 1.32, 6), [cast]);
  const uOf = (eur: number) => U0 + scale.at(eur) * (U1 - U0);
  const heldout = cast.every((c) => c.basis === "heldout");
  const n = cast.length;

  const lanes = cast.map((c, i) => {
    const v = n === 1 ? 0.3 : 0.16 + (i * 0.7) / (n - 1);
    const s = 1 - 0.42 * v; // nearer lanes are larger
    const obs = P(uOf(c.market_value_eur), v);
    const est = P(uOf(c.estimate), v);
    const r = residualOf(c);
    const dx = obs.x - est.x;
    // Low trajectories: each arc stays inside its own lane band, so it never covers the lanes behind.
    const lift = (10 + Math.min(20, Math.abs(dx) * 0.08)) * s;
    const ctrl = { x: (obs.x + est.x) / 2, y: (obs.y + est.y) / 2 - lift * 2 };
    const apex = { x: (obs.x + est.x) / 2, y: (obs.y + est.y) / 2 - lift };
    const half = n === 1 ? 0.2 : 0.35 / (n - 1);
    return { c, i, v, s, obs, est, r, ctrl, apex, hit: pathOf([P(0, v - half), P(1, v - half), P(1, v + half), P(0, v + half)], true) };
  });

  const a = lanes[active] ?? lanes[0];
  const summary =
    `Valuation theatre: ${rule}. Pitch length is a log value scale from ${formatEur(scale.lo)} to ${formatEur(scale.hi)}. ` +
    lanes.map((l) => `${l.c.name}: observed ${formatEur(l.c.market_value_eur)}, Model A ${formatEur(l.c.estimate)}`).join("; ") +
    ".";

  return (
    <figure className={styles.theatre} aria-labelledby={`${uid}-cap`} data-touched={touched || undefined}>
      <svg className={styles.scene} viewBox={`0 ${VB_TOP} ${W} ${H - VB_TOP + 22}`} role="img" aria-label={summary} preserveAspectRatio="xMidYMid meet">
        <defs>
          <radialGradient id={`${uid}-flood`} cx="0.62" cy="0.55" r="0.62">
            <stop offset="0" stopColor="#e9b949" stopOpacity="0.16" />
            <stop offset="0.45" stopColor="#e9b949" stopOpacity="0.05" />
            <stop offset="1" stopColor="#e9b949" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`${uid}-beam`} x1="0.9" y1="0" x2="0.35" y2="1">
            <stop offset="0" stopColor="#f6e7bf" stopOpacity="0.13" />
            <stop offset="0.55" stopColor="#f6e7bf" stopOpacity="0.035" />
            <stop offset="1" stopColor="#f6e7bf" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`${uid}-turf`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#16241c" />
            <stop offset="1" stopColor="#0d1511" />
          </linearGradient>
          <linearGradient id={`${uid}-arc`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#e9b949" stopOpacity="0.35" />
            <stop offset="1" stopColor="#e9b949" />
          </linearGradient>
          <clipPath id={`${uid}-pitch`}>
            <path d={MARKINGS[0]} />
          </clipPath>
        </defs>

        {/* 1 · the environment: floodlight beams, measurement grid, turf */}
        <g className={styles.env}>
          <path className={styles.beam} d={`M 1086 ${VB_TOP + 22} L 1166 ${VB_TOP + 10} L 1010 ${H} L 120 ${H} Z`} fill={`url(#${uid}-beam)`} />
          <g className={styles.lamps} aria-hidden="true">
            {Array.from({ length: 12 }, (_, i) => (
              <circle key={i} cx={1092 + (i % 6) * 13} cy={VB_TOP + 10 + Math.floor(i / 6) * 12} r={3.2} />
            ))}
          </g>
          <g className={styles.grid} aria-hidden="true">
            {Array.from({ length: 13 }, (_, i) => (
              <path key={`gx${i}`} d={`M ${i * 100} 0 V ${H}`} />
            ))}
            {Array.from({ length: 8 }, (_, i) => (
              <path key={`gy${i}`} d={`M 0 ${i * 100} H ${W}`} />
            ))}
          </g>
          <path d={MARKINGS[0]} fill={`url(#${uid}-turf)`} className={styles.turf} />
          <g clipPath={`url(#${uid}-pitch)`}>
            {STRIPES.map((d, i) => (
              <path key={i} d={d} className={styles.stripe} />
            ))}
            <ellipse cx="800" cy="470" rx="620" ry="260" fill={`url(#${uid}-flood)`} className={styles.pool} />
          </g>
        </g>

        {/* 2 · pitch lines draw into place */}
        <g className={styles.lines} aria-hidden="true">
          {MARKINGS.map((d, i) => (
            <path key={i} d={d} pathLength={1} style={{ animationDelay: `${180 + i * 55}ms` }} />
          ))}
          {GOALS.map((d, i) => (
            <path key={`g${i}`} d={d} pathLength={1} className={styles.goal} style={{ animationDelay: `${700 + i * 60}ms` }} />
          ))}
          {SPOTS.map((p, i) => (
            <circle key={`s${i}`} cx={p.x} cy={p.y} r={2.4} className={styles.spot} />
          ))}
        </g>

        {/* 3 · the instrument: value ticks stencilled along the near touchline */}
        <g className={styles.ruler} aria-hidden="true">
          {scale.ticks.map((t) => {
            const u = uOf(t);
            const a0 = P(u, 0);
            const a1 = P(u, -0.05);
            const lab = P(u, -0.1);
            return (
              <g key={t}>
                <path d={line(u, 0, u, 1)} className={styles.tickLine} />
                <path d={pathOf([a0, a1])} className={styles.tick} />
                <text x={lab.x} y={lab.y} className={styles.tickLabel} textAnchor="middle">
                  {formatEur(t)}
                </text>
              </g>
            );
          })}
          {(() => {
            const q = P(0.86, -0.17);
            return (
              <text x={q.x} y={q.y + 4} className={styles.axisLabel} textAnchor="end">
                Market value · log scale →
              </text>
            );
          })()}
        </g>

        {/* 4 · the cast: one lane per player */}
        <g className={styles.cast}>
          {lanes.map((l) => {
            const on = l.i === active;
            const left = Math.min(l.obs.x, l.est.x);
            const name = { x: left - 16 * l.s - 6, y: (l.obs.y + l.est.y) / 2 + 5 * l.s };
            return (
              <ExpLink
                key={l.c.id}
                href={`/players/${l.c.slug}?from=overview`}
                className={styles.lane}
                data-on={on || undefined}
                aria-label={`${l.c.name}, ${l.c.club ?? leagueName(l.c.league_id)}: observed ${formatEur(l.c.market_value_eur)}, Model A ${formatEur(l.c.estimate)}. Open the dossier.`}
                onMouseEnter={() => setActive(l.i)}
                onFocus={() => setActive(l.i)}
                style={{ ["--d" as string]: `${l.i * 70}ms` }}
              >
                <path d={l.hit} className={styles.hit} />
                <path d={line(U0 - 0.02, l.v, U1 + 0.02, l.v)} className={styles.laneTrack} />
                <path d={pathOf([l.est, l.obs])} className={styles.gapFloor} />
                <path d={`M ${l.est.x} ${l.est.y} Q ${l.ctrl.x} ${l.ctrl.y} ${l.obs.x} ${l.obs.y}`} className={styles.arc} pathLength={1} stroke={`url(#${uid}-arc)`} />
                <ellipse cx={l.est.x} cy={l.est.y + 2} rx={13 * l.s} ry={4 * l.s} className={styles.shadow} />
                <ellipse cx={l.obs.x} cy={l.obs.y + 2} rx={12 * l.s} ry={4 * l.s} className={styles.shadow} />
                <path
                  className={styles.diamond}
                  d={`M ${l.est.x} ${l.est.y - 11 * l.s} L ${l.est.x + 11 * l.s} ${l.est.y} L ${l.est.x} ${l.est.y + 11 * l.s} L ${l.est.x - 11 * l.s} ${l.est.y} Z`}
                  strokeWidth={2.6 * l.s}
                />
                <circle className={styles.disc} cx={l.obs.x} cy={l.obs.y} r={8.5 * l.s} strokeWidth={2 * l.s} />
                <text x={name.x} y={name.y} className={styles.laneName} textAnchor="end" style={{ fontSize: `${(on ? 27 : 20) * l.s}px` }}>
                  {shortName(l.c)}
                </text>
              </ExpLink>
            );
          })}
        </g>

        {/* 5 · the difference resolves: labels for the lit lane */}
        {a && (
          <g className={styles.callout} key={a.c.id} aria-hidden="true">
            {/* A small haloed readout just above the arc: no box, so the lanes behind stay visible. */}
            <text x={a.apex.x} y={a.apex.y - 9 * a.s} textAnchor="middle" className={styles.plateText}>
              <tspan className={styles.plateDir}>{a.r >= 0 ? "▲" : "▼"} </tspan>
              <tspan className={styles.plateNum}>{(a.r >= 0 ? "+" : "−") + Math.abs(a.r).toFixed(3)}</tspan>
              <tspan className={styles.plateUnit}> {factor(a.r)}</tspan>
            </text>
            <text x={a.obs.x + 4} y={a.obs.y + 26 * a.s + 6} className={styles.markLabel} textAnchor="middle">
              {formatEur(a.c.market_value_eur)}
            </text>
            <text x={a.est.x} y={a.est.y + 26 * a.s + 6} className={`${styles.markLabel} ${styles.markLabelModel}`} textAnchor="middle">
              {formatEur(a.c.estimate)}
            </text>
          </g>
        )}

      </svg>

      {a && (
        <figcaption className={styles.caption} id={`${uid}-cap`}>
          <span className={styles.capKicker}>
            <span>
              Lane {active + 1} of {n}
            </span>
            <span className="visually-hidden">: {rule}</span>
            <span className={styles.capMeta}>
              {a.c.club ?? "Club not in this build"} · <LeagueFlag leagueId={a.c.league_id} /> {leagueName(a.c.league_id).split(",")[0]}
            </span>
          </span>
          <span className={styles.capName} key={a.c.id}>
            <span className="fv-role">{a.c.role_code}</span>
            <b>{a.c.name}</b>
          </span>
          <span className={styles.capVals}>
            <span>
              <ObsMark size={11} /> Observed <b className="num">{formatEur(a.c.market_value_eur)}</b>
            </span>
            <span>
              <ModelMark size={12} /> Model A{heldout ? " · held-out" : " · in-sample"} <b className="num">{formatEur(a.c.estimate)}</b>
            </span>
          </span>
          <span className={styles.capFoot}>
            <Residual value={a.r} basis={a.c.basis === "heldout" ? "held-out" : "in-sample"} />
            <ExpLink href={`/players/${a.c.slug}?from=overview`} className={styles.capLink}>
              Dossier <span aria-hidden="true">→</span>
            </ExpLink>
          </span>
        </figcaption>
      )}
    </figure>
  );
}
