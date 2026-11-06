import { ViewTransition } from "react";
import { leagueName } from "@/lib/football";
import { formatEur, integer } from "@/lib/format";
import type { PlayerProfile } from "@/lib/players";
import type { Portrait } from "@/lib/portraits";
import { ModelMark, ObsMark, Residual, TierMark } from "@/components/brand/Marks";
import type { Reading } from "@/lib/reading";
import { DossierLane } from "./DossierLane";
import { PortraitSlot } from "./PortraitSlot";
import styles from "./PlayerHero.module.css";
import { Flag, LeagueFlag } from "@/components/brand/Flag";

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
  /** Plain-language reading of the valuation (lib/reading.ts). */
  reading: Reading;
}

const SOURCE_LABEL = { heldout: "Held-out", cached: "Served · cached research result", "live-only": "Live service only" } as const;

/**
 * The dossier's opening: identity and valuation, then the valuation lane (the Overview's theatre
 * narrowed to this player) beside a plain-language reading, then the two-year record. A licensed
 * portrait gets its own column; without one, a small monogram badge sits by the name instead of
 * a large empty frame.
 */
export function PlayerHero({ player: p, portrait, valuedLabel, estimates, reading }: Props) {
  const league = leagueName(p.league_id).split(",")[0]!;
  const w = p.window;

  return (
    <section className={styles.card} aria-labelledby="player-name" data-portrait={portrait ? "" : undefined}>
      <span className={styles.watermark} aria-hidden="true">
        {p.role_code}
      </span>

      {portrait && (
        <div className={styles.frame}>
          <PortraitSlot portrait={portrait} name={p.name} roleCode={p.role_code} />
        </div>
      )}

      <div className={styles.identity}>
        <p className={styles.crumbs}>
          <span className={styles.crumbLabel}>Player dossier</span>
          <span aria-hidden="true">/</span>
          <span>{league}</span>
        </p>
        <div className={styles.nameRow}>
          {!portrait && (
            <span className={styles.badge} title="No licensed portrait yet">
              <PortraitSlot portrait={null} name={p.name} roleCode={p.role_code} size="card" />
            </span>
          )}
          <h1 id="player-name" className={styles.name}>
            {p.first_name && <span className={styles.first}>{p.first_name}</span>}
            <ViewTransition name={`name-${p.id}`} share="morph" default="none">
              <span className={styles.last}>{p.last_name}</span>
            </ViewTransition>
          </h1>
        </div>
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
            <dd>
              <LeagueFlag leagueId={p.league_id} />
              {league}
            </dd>
          </div>
          {p.nationality && (
            <div>
              <dt>Nationality</dt>
              <dd>
                <Flag country={p.nationality} />
                {p.nationality}
              </dd>
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
        <p className={`fv-label ${styles.valueLabel}`}>
          <ObsMark /> Market value · observed
        </p>
        <p className={`${styles.market} num`}>{formatEur(p.market_value_eur)}</p>
        <p className={styles.tierRow}>
          <TierMark tier={p.market_tier} />
          <span>Transfermarkt, the model&apos;s target</span>
        </p>
        <ul className={styles.estimates}>
          {estimates.map((e) => (
            <li key={e.model} data-missing={e.value === null || undefined}>
              <span className={styles.estModel}>
                <ModelMark model={e.model} /> Model {e.model}
              </span>
              <span className={styles.estSource}>{SOURCE_LABEL[e.source]}</span>
              <span className={`${styles.estValue} num`}>{e.value !== null ? formatEur(e.value) : "–"}</span>
              <span className={`${styles.estRatio} num`}>
                {e.value !== null ? <Residual value={Math.log(p.market_value_eur) - Math.log(e.value)} compact basis={e.source === "heldout" ? "held-out" : "in-sample"} /> : ""}
              </span>
            </li>
          ))}
        </ul>
      </aside>

      <div className={styles.read}>
        <div className={styles.reading}>
          <p className={styles.readLabel}>Reading the valuation</p>
          <p className={styles.readLead}>{reading.lead}</p>
          {reading.gap && <p>{reading.gap}</p>}
          {reading.context && <p>{reading.context}</p>}
          <p className={styles.readCaveat}>{reading.caveat}</p>
        </div>
        <figure className={styles.laneFig}>
          <DossierLane observed={p.market_value_eur} estimates={estimates} name={p.name} />
          <figcaption className={styles.laneCap}>
            Pitch length is a log value scale fitted to this player&apos;s figures. ● observed · ◇ Model A · dashed ◇ Model B · each arc is a
            residual, log(observed) − log(estimate).
          </figcaption>
        </figure>
      </div>

      <div className={styles.strip}>
      <dl className={styles.stripList} aria-label="Club football in the two years to the valuation date">
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
      </dl>
        <p className={styles.stripNote}>Club matches, two years to the valuation date</p>
      </div>
    </section>
  );
}
