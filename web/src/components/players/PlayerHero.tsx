"use client";

import { useReducedMotion } from "motion/react";
import Link from "next/link";
import { ViewTransition, useRef, type CSSProperties, type PointerEvent } from "react";
import { formatEur } from "@/lib/format";
import { leagueName } from "@/lib/football";
import type { PlayerProfile } from "@/lib/players";
import type { Portrait } from "@/lib/portraits";
import { PortraitSlot } from "./PortraitSlot";
import { StadiumBackdrop } from "./StadiumBackdrop";
import styles from "./PlayerHero.module.css";

interface Props {
  player: PlayerProfile;
  portrait: Portrait | null;
  roomIndex: string;
  valuedLabel: string;
  /** The estimate shown beside the market value: held-out when available, else served. */
  estimate: { label: string; value: number } | null;
}

/** Cinematic identity block: backdrop, oversized role code, figure, and the player's facts around it. */
export function PlayerHero({ player: p, portrait, roomIndex, valuedLabel, estimate }: Props) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const league = leagueName(p.league_id);

  // Pointer parallax: layers drift a few pixels against each other, which gives the scene depth.
  const onMove = (e: PointerEvent<HTMLElement>) => {
    if (reduce || e.pointerType === "touch" || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    ref.current.style.setProperty("--px", ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
    ref.current.style.setProperty("--py", ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
  };
  const onLeave = () => {
    ref.current?.style.setProperty("--px", "0");
    ref.current?.style.setProperty("--py", "0");
  };

  const facts: [string, string][] = [
    ["Club", p.club ?? "Not in this export"],
    ["League", league.split(",")[0]!],
    ["Age at valuation", `${Math.floor(p.age)}`],
    ["Height", p.height_cm ? `${Math.round(p.height_cm)} cm` : "Not recorded"],
    ["Preferred foot", p.foot ? p.foot[0]!.toUpperCase() + p.foot.slice(1) : "Not recorded"],
    ["Valued", valuedLabel],
  ];

  return (
    <section ref={ref} className={styles.hero} onPointerMove={onMove} onPointerLeave={onLeave} aria-labelledby="player-name" style={{ "--px": 0, "--py": 0 } as CSSProperties}>
      <StadiumBackdrop />

      <ViewTransition name={`glyph-${p.id}`} share="morph" default="none">
        <span className={styles.glyph} aria-hidden="true">
          {p.role_code}
        </span>
      </ViewTransition>

      <div className={styles.inner}>
        <div className={styles.identity}>
          <Link href="/players" className={styles.back}>
            <span aria-hidden="true">←</span> All players
          </Link>
          <p className="eyebrow">
            <b className="num">{roomIndex}</b> Player profile
          </p>
          <h1 id="player-name" className={styles.name}>
            {p.first_name && <span className={styles.first}>{p.first_name}</span>}
            <ViewTransition name={`name-${p.id}`} share="morph" default="none">
              <span className={styles.last}>{p.last_name}</span>
            </ViewTransition>
          </h1>
          <p className={styles.role}>
            <span className={styles.roleCode}>{p.role_code}</span>
            {p.sub_position} · {p.position}
          </p>
          <dl className={styles.facts}>
            {facts.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd data-muted={v.startsWith("Not ") || undefined}>{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className={styles.stage}>
          <PortraitSlot portrait={portrait} name={p.name} />
        </div>
      </div>

      <div className={styles.dock}>
        <div className={styles.market}>
          <p className={styles.dockLabel}>Market value · observed</p>
          <p className={`${styles.marketValue} num`}>{formatEur(p.market_value_eur)}</p>
          <p className={styles.dockSub}>
            {p.market_tier && <span className={styles.tier}>{p.market_tier}</span>}
            Transfermarkt, the value the model learns to reproduce
          </p>
        </div>
        {estimate && (
          <div className={styles.model}>
            <p className={styles.dockLabel}>{estimate.label}</p>
            <p className={`${styles.modelValue} num`}>{formatEur(estimate.value)}</p>
            <p className={styles.dockSub}>
              <span className="num">×{(estimate.value / p.market_value_eur).toFixed(2)}</span> of the market value
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
