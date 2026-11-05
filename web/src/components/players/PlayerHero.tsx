import { ViewTransition } from "react";
import { leagueName } from "@/lib/football";
import { formatEur, integer } from "@/lib/format";
import type { PlayerProfile } from "@/lib/players";
import type { Portrait } from "@/lib/portraits";
import { MiniRuler } from "./MiniRuler";
import { PortraitSlot } from "./PortraitSlot";
import styles from "./PlayerHero.module.css";

export interface HeroEstimate {
  model: "A" | "B";
  value: number | null;
  /** held-out (CV, honest) or cached (published served result); null value means "needs the live API". */
  source: "heldout" | "cached" | "live-only";
}

interface Props {
  player: PlayerProfile;
  portrait: Portrait | null;
  valuedLabel: string;
  estimates: HeroEstimate[];
}

const SOURCE_LABEL = { heldout: "Held-out", cached: "Served · cached research result", "live-only": "Live service only" } as const;

/** The dossier header: the player's frame, identity, valuation and two-year record in one card. */
export function PlayerHero({ player: p, portrait, valuedLabel, estimates }: Props) {
  const league = leagueName(p.league_id).split(",")[0]!;
  const w = p.window;
  const shown = estimates.filter((e) => e.value !== null);
  const primary = shown[0];

  return (
    <section className={styles.card} aria-labelledby="player-name">
      <span className={styles.watermark} aria-hidden="true">
        {p.role_code}
      </span>

      <div className={styles.frame}>
        <PortraitSlot portrait={portrait} name={p.name} roleCode={p.role_code} />
      </div>

      <div className={styles.identity}>
        <p className={styles.crumbs}>
          <span className={styles.crumbLabel}>Player dossier</span>
          <span aria-hidden="true">/</span>
          <span>{league}</span>
        </p>
        <h1 id="player-name" className={styles.name}>
          {p.first_name && <span className={styles.first}>{p.first_name}</span>}
          <ViewTransition name={`name-${p.id}`} share="morph" default="none">
            <span className={styles.last}>{p.last_name}</span>
          </ViewTransition>
        </h1>
        <p className={styles.role}>
          <ViewTransition name={`glyph-${p.id}`} share="morph" default="none">
            <span className="fv-role">{p.role_code}</span>
          </ViewTransition>
          <span>{p.sub_position}</span>
          <span className={styles.sep} aria-hidden="true" />
          <span className={styles.group}>{p.position}</span>
        </p>
        <dl className={styles.facts}>
          <div>
            <dt>Club</dt>
            <dd data-muted={!p.club || undefined}>{p.club ?? "Not in this build"}</dd>
          </div>
          <div>
            <dt>League</dt>
            <dd>{league}</dd>
          </div>
          {p.nationality && (
            <div>
              <dt>Nationality</dt>
              <dd>{p.nationality}</dd>
            </div>
          )}
          <div>
            <dt>Age</dt>
            <dd className="num">{Math.floor(p.age)}</dd>
          </div>
          <div>
            <dt>Height</dt>
            <dd className="num" data-muted={!p.height_cm || undefined}>
              {p.height_cm ? `${Math.round(p.height_cm)} cm` : "–"}
            </dd>
          </div>
          <div>
            <dt>Foot</dt>
            <dd>{p.foot ? p.foot[0]!.toUpperCase() + p.foot.slice(1) : "–"}</dd>
          </div>
          <div>
            <dt>Valued</dt>
            <dd>{valuedLabel}</dd>
          </div>
        </dl>
      </div>

      <aside className={styles.value} aria-label="Valuation">
        <p className="fv-label">Market value · observed</p>
        <p className={`${styles.market} num`}>{formatEur(p.market_value_eur)}</p>
        <p className={styles.tierRow}>
          {p.market_tier && <span className="fv-chip" data-tone="flood">{p.market_tier}</span>}
          <span>Transfermarkt, the model&apos;s target</span>
        </p>
        <MiniRuler
          showScale
          marks={[
            { value: p.market_value_eur, kind: "market", label: "Market value" },
            ...(primary ? [{ value: primary.value!, kind: "model" as const, label: `Model ${primary.model}` }] : []),
          ]}
        />
        <ul className={styles.estimates}>
          {estimates.map((e) => (
            <li key={e.model} data-missing={e.value === null || undefined}>
              <span className={styles.estModel}>Model {e.model}</span>
              <span className={styles.estSource}>{SOURCE_LABEL[e.source]}</span>
              <span className={`${styles.estValue} num`}>{e.value !== null ? formatEur(e.value) : "–"}</span>
              <span className={`${styles.estRatio} num`}>{e.value !== null ? `×${(e.value / p.market_value_eur).toFixed(2)}` : ""}</span>
            </li>
          ))}
        </ul>
      </aside>

      <dl className={styles.strip} aria-label="Club football in the two years to the valuation date">
        <div>
          <dt>Apps</dt>
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
          <dt>Min / app</dt>
          <dd className="num">{Math.round(w.minutes / Math.max(1, w.appearances))}</dd>
        </div>
        <div>
          <dt>Cards</dt>
          <dd className="num">
            {w.yellow_cards ?? "–"}
            <small>Y</small> {w.red_cards ?? "–"}
            <small>R</small>
          </dd>
        </div>
        <p className={styles.stripNote}>Club matches, two years to the valuation date</p>
      </dl>
    </section>
  );
}
