import { ValueRuler } from "@/components/charts/ValueRuler";
import { RoomLink } from "@/components/site/RoomLink";
import type { PredictResponse } from "@/lib/api/types";
import { fetchUpstream } from "@/lib/api/upstream";
import { leagueName, TIER_NAMES } from "@/lib/football";
import { decimal, formatEur, integer, percent } from "@/lib/format";
import { DEFAULT_PLAYER } from "@/lib/profile";
import styles from "./LiveSpecimen.module.css";

const p = DEFAULT_PLAYER;
const league = leagueName(p.valuation_league_id).split(",")[0];

function Profile() {
  return (
    <>
      <p className={styles.profile}>
        {p.sub_position} · {league} · age {Math.floor(p.age)}
      </p>
      <dl className={styles.spec}>
        <div>
          <dt>Minutes</dt>
          <dd className="num">{integer(p.minutes)}</dd>
        </div>
        <div>
          <dt>Apps</dt>
          <dd className="num">{p.appearances}</dd>
        </div>
        <div>
          <dt>G+A / 90</dt>
          <dd className="num">{decimal(p.goals_p90 + p.assists_p90, 2)}</dd>
        </div>
        <div>
          <dt>Started</dt>
          <dd className="num">{percent(p.start_share, 0)}</dd>
        </div>
      </dl>
    </>
  );
}

/** The landing page's live example: one real call to POST /predict for an illustrative profile. */
export async function LiveSpecimen() {
  const res = await fetchUpstream<PredictResponse>("/predict", { player: DEFAULT_PLAYER, model: "A" });

  if (!res) {
    return (
      <article className={styles.card} data-state="offline" aria-label="Live valuation unavailable">
        <header className={styles.head}>
          <span className={styles.live}>
            <i aria-hidden="true" /> Live valuation
          </span>
          <span className={styles.model}>Model A</span>
        </header>
        <Profile />
        <p className={styles.offlineTitle}>The model service isn&apos;t answering.</p>
        <p className={styles.offlineBody}>
          No estimate is shown rather than a made-up one. The scale and tiers below are fixed definitions.
        </p>
        <ValueRuler ariaLabel="Market value scale with tier boundaries at €2M, €10M and €30M" />
        <footer className={styles.foot}>
          <span>Illustrative profile, not a real player</span>
          <RoomLink href="/studio">Open the studio →</RoomLink>
        </footer>
      </article>
    );
  }

  const value = res.predicted_value_eur;
  return (
    <article className={styles.card} aria-label={`Live valuation: ${formatEur(value)}, ${res.predicted_tier} tier`}>
      <header className={styles.head}>
        <span className={styles.live}>
          <i aria-hidden="true" /> Live valuation
        </span>
        <span className={styles.model}>Model A</span>
      </header>
      <Profile />
      <div className={styles.valueRow}>
        <p className={`${styles.value} num`}>{formatEur(value)}</p>
        <p className={styles.tier}>{res.predicted_tier}</p>
      </div>
      <ValueRuler
        intro
        ariaLabel={`${formatEur(value)} on a log scale of market values, ${res.predicted_tier} tier`}
        marker={{ value, label: formatEur(value), variant: "primary" }}
      />
      <ol className={styles.probs} aria-label="Tier classifier probabilities">
        {TIER_NAMES.map((t) => {
          const prob = res.tier_probabilities[t] ?? 0;
          return (
            <li key={t} data-top={t === res.classifier_tier || undefined}>
              <span className={styles.probBar} style={{ "--p": prob } as React.CSSProperties} />
              <span className={styles.probName}>{t}</span>
              <span className={`${styles.probValue} num`}>{percent(prob, 0)}</span>
            </li>
          );
        })}
      </ol>
      <footer className={styles.foot}>
        <span className="num" title="Served regressor version">
          {res.model_version.regressor}
        </span>
        <RoomLink href="/studio">Change the profile →</RoomLink>
      </footer>
    </article>
  );
}

export function SpecimenSkeleton() {
  return (
    <article className={styles.card} data-state="loading" aria-busy="true" aria-label="Loading live valuation">
      <header className={styles.head}>
        <span className={styles.live}>
          <i aria-hidden="true" /> Live valuation
        </span>
        <span className={styles.model}>Model A</span>
      </header>
      <Profile />
      <div className={styles.valueRow}>
        <p className={`${styles.value} ${styles.shimmer}`}>€00.0M</p>
      </div>
      <ValueRuler ariaLabel="Market value scale with tier boundaries at €2M, €10M and €30M" />
      <footer className={styles.foot}>
        <span>Asking the model…</span>
      </footer>
    </article>
  );
}
