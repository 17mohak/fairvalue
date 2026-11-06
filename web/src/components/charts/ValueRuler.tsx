"use client";

import { motion, useReducedMotion } from "motion/react";
import { useElementWidth } from "@/hooks/useElementWidth";
import { formatEur } from "@/lib/format";
import { TIER_BOUNDARIES_EUR, TIER_NAMES } from "@/lib/football";
import { logScale } from "@/lib/scale";
import styles from "./ValueRuler.module.css";

// Market values in the training population run from €25k to €200M.
export const RULER_DOMAIN: [number, number] = [20_000, 250_000_000];

export interface RulerMarker {
  value: number;
  label: string;
  /** Primary = floodlight; ghost = hollow comparison marker. */
  variant: "primary" | "ghost";
}

interface Props {
  marker?: RulerMarker | null;
  ghost?: RulerMarker | null;
  /** Typical-error band around the primary marker, in EUR. */
  band?: [number, number] | null;
  /** Play the one-off draw-in sequence (landing hero). */
  intro?: boolean;
  ariaLabel: string;
}

// Layout lanes, top to bottom: primary label, ghost label, tier band, axis, tick labels.
const LANE_PRIMARY = 18;
const LANE_GHOST = 38;
const BAND_TOP = 48;
const AXIS_Y = 84;
const LABEL_Y = 112;
const HEIGHT = 122;

function minorTicks(): number[] {
  const out: number[] = [];
  for (let decade = 10_000; decade < RULER_DOMAIN[1]; decade *= 10) {
    for (let k = 2; k <= 9; k++) {
      const v = decade * k;
      if (v > RULER_DOMAIN[0] && v < RULER_DOMAIN[1]) out.push(v);
    }
  }
  return out;
}

const MINOR = minorTicks();
const DECADES = [100_000, 1_000_000, 10_000_000, 100_000_000];

/** Rough label width in px for collision checks (condensed face). */
const textWidth = (s: string, size: number) => s.length * size * 0.52;

export function ValueRuler({ marker, ghost, band, intro = false, ariaLabel }: Props) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const reduce = useReducedMotion();
  const animate = !reduce;
  const padX = 16;
  const x = logScale(RULER_DOMAIN, [padX, width - padX]);
  const bounds = [RULER_DOMAIN[0], ...TIER_BOUNDARIES_EUR, RULER_DOMAIN[1]];
  const narrow = width < 520;
  // Tick labels: tier boundaries always; decades only where they don't crowd a boundary.
  const labelled = [...TIER_BOUNDARIES_EUR, ...DECADES.filter((d) => TIER_BOUNDARIES_EUR.every((b) => Math.abs(x(d) - x(b)) > 40))];

  // If the ghost label would overlap the primary label, push it to the far side of its marker.
  let ghostAnchor: "start" | "middle" | "end" = "middle";
  if (marker && ghost) {
    const px = x(marker.value);
    const gx = x(ghost.value);
    const half = (textWidth(marker.label, 17) + textWidth(ghost.label, 13)) / 2 + 8;
    if (Math.abs(px - gx) < half) ghostAnchor = gx < px ? "end" : "start";
  }

  return (
    <div ref={ref} className={styles.wrap}>
      <svg width={width} height={HEIGHT} role="img" aria-label={ariaLabel} className={styles.svg}>
        {TIER_NAMES.map((tier, i) => {
          const x0 = x(bounds[i]!);
          const x1 = x(bounds[i + 1]!);
          const name = narrow && tier === "Established" ? "Estab." : tier;
          return (
            <g key={tier}>
              <rect x={x0} y={BAND_TOP} width={x1 - x0} height={AXIS_Y - BAND_TOP} className={i % 2 ? styles.zoneAlt : styles.zone} />
              <text x={(x0 + x1) / 2} y={(BAND_TOP + AXIS_Y) / 2 + 5} textAnchor="middle" className={`${styles.zoneLabel} ${narrow ? styles.zoneLabelSmall : ""}`}>
                {name}
              </text>
            </g>
          );
        })}

        {TIER_BOUNDARIES_EUR.map((b) => (
          <line key={b} x1={x(b)} x2={x(b)} y1={BAND_TOP - 4} y2={AXIS_Y + 16} className={styles.boundary} />
        ))}

        {band && marker && (
          <motion.rect
            x={x(band[0])}
            width={Math.max(0, x(band[1]) - x(band[0]))}
            y={AXIS_Y - 10}
            height={10}
            className={styles.band}
            initial={animate ? { opacity: 0 } : false}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: animate ? 0.55 : 0 }}
          />
        )}

        <motion.line
          x1={padX}
          x2={width - padX}
          y1={AXIS_Y}
          y2={AXIS_Y}
          className={styles.axis}
          initial={intro && animate ? { pathLength: 0 } : false}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.1, ease: [0.65, 0, 0.35, 1] }}
        />
        {MINOR.map((v, i) => (
          <motion.line
            key={v}
            x1={x(v)}
            x2={x(v)}
            y1={AXIS_Y}
            y2={AXIS_Y + (String(v).startsWith("5") ? 9 : 6)}
            className={styles.minor}
            initial={intro && animate ? { opacity: 0 } : false}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: intro && animate ? 0.25 + i * 0.012 : 0 }}
          />
        ))}
        {DECADES.map((v) => (
          <line key={v} x1={x(v)} x2={x(v)} y1={AXIS_Y} y2={AXIS_Y + 14} className={styles.major} />
        ))}
        {labelled.map((v) => (
          <text key={v} x={x(v)} y={LABEL_Y} textAnchor="middle" className={TIER_BOUNDARIES_EUR.includes(v) ? styles.boundaryLabel : styles.majorLabel}>
            {formatEur(v)}
          </text>
        ))}

        {ghost && <Marker m={ghost} x={x(ghost.value)} animate={animate} width={width} delay={0.2} anchor={ghostAnchor} />}
        {marker && <Marker m={marker} x={x(marker.value)} animate={animate} width={width} delay={intro ? 1.05 : 0} anchor="middle" />}
      </svg>
    </div>
  );
}

function Marker({
  m,
  x,
  animate,
  width,
  delay,
  anchor,
}: {
  m: RulerMarker;
  x: number;
  animate: boolean;
  width: number;
  delay: number;
  anchor: "start" | "middle" | "end";
}) {
  const primary = m.variant === "primary";
  const lane = primary ? LANE_PRIMARY : LANE_GHOST;
  const size = primary ? 17 : 13;
  // Keep labels inside the frame near either end.
  const w = textWidth(m.label, size);
  let a = anchor;
  if (a === "middle" && x - w / 2 < 4) a = "start";
  if (a === "middle" && x + w / 2 > width - 4) a = "end";
  const lx = a === "start" ? -4 : a === "end" ? 4 : 0;
  return (
    <motion.g
      initial={animate ? { x: 16, opacity: 0 } : false}
      animate={{ x, opacity: 1 }}
      transition={animate ? { x: { type: "spring", stiffness: 140, damping: 22, delay }, opacity: { duration: 0.25, delay } } : { duration: 0 }}
      className={primary ? styles.markerPrimary : styles.markerGhost}
    >
      <line x1={0} x2={0} y1={lane + 5} y2={AXIS_Y} className={styles.markerStem} />
      <circle cx={0} cy={AXIS_Y} r={primary ? 6 : 5} className={styles.markerDot} />
      <text x={lx} y={lane} textAnchor={a} className={styles.markerLabel}>
        {m.label}
      </text>
    </motion.g>
  );
}
