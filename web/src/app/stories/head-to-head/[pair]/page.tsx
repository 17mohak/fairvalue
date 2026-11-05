import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ValuationJourney } from "@/components/journey/ValuationJourney";
import { ExpLink } from "@/components/site/ExpLink";
import { StoryEnd } from "@/components/stories/StoryEnd";
import styles from "@/components/stories/story.module.css";
import { biggestSeparator, explanationMatrix } from "@/lib/compare";
import { leagueName, TIER_BOUNDARIES_EUR } from "@/lib/football";
import { formatEur, integer, signed } from "@/lib/format";
import { euroTicks, factor, toEur } from "@/lib/journey";
import type { PlayerProfile } from "@/lib/players";
import { PAIRS, showcasePlayer, storyBySlug } from "@/lib/stories";
import h from "./h2h.module.css";

type Params = { params: Promise<{ pair: string }> };

export function generateStaticParams() {
  return PAIRS.map(([a, b]) => ({ pair: `${a}-vs-${b}` }));
}

function load(pair: string) {
  const m = /^(\d+)-vs-(\d+)$/.exec(pair);
  const story = m ? storyBySlug(`h2h-${m[1]}-${m[2]}`) : undefined;
  const a = m ? showcasePlayer(Number(m[1])) : undefined;
  const b = m ? showcasePlayer(Number(m[2])) : undefined;
  if (!story || !a || !b || !a.explanation || !b.explanation) notFound();
  return { story, a, b };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const m = /^(\d+)-vs-(\d+)$/.exec((await params).pair);
  const s = m ? storyBySlug(`h2h-${m[1]}-${m[2]}`) : undefined;
  return s ? { title: s.title, description: s.dek } : { title: "Story not found" };
}

const est = (p: PlayerProfile) => toEur(p.explanation!.predicted_log_value);

export default async function HeadToHead({ params }: Params) {
  const { story, a, b } = load((await params).pair);
  const players = [a, b];
  const vals = players.flatMap((p) => [p.market_value_eur, est(p)]);
  const lo = Math.log(Math.min(...vals, TIER_BOUNDARIES_EUR[0])) - 0.5;
  const hi = Math.log(Math.max(...vals, TIER_BOUNDARIES_EUR[2])) + 0.5;
  const x = (v: number) => ((Math.log(v) - lo) / (hi - lo)) * 100;
  const keeper = a.position === "Goalkeeper";
  const tape: { label: string; a: number; b: number; fmt: (v: number) => string }[] = [
    { label: "Age", a: a.age, b: b.age, fmt: (v) => String(Math.floor(v)) },
    { label: "Appearances", a: a.window.appearances, b: b.window.appearances, fmt: (v) => String(v) },
    { label: "Minutes, two years", a: a.window.minutes, b: b.window.minutes, fmt: integer },
    { label: "Minutes, last 365 days", a: a.features.minutes_last_365, b: b.features.minutes_last_365, fmt: integer },
    { label: "Share of games started", a: a.features.start_share, b: b.features.start_share, fmt: (v) => `${Math.round(v * 100)}%` },
    ...(keeper
      ? []
      : [
          { label: "Goals per 90", a: a.features.goals_p90, b: b.features.goals_p90, fmt: (v: number) => v.toFixed(2) },
          { label: "Assists per 90", a: a.features.assists_p90, b: b.features.assists_p90, fmt: (v: number) => v.toFixed(2) },
        ]),
    { label: "European club minutes", a: a.features.intl_club_minutes_share, b: b.features.intl_club_minutes_share, fmt: (v) => `${Math.round(v * 100)}%` },
  ];
  const sep = biggestSeparator(explanationMatrix(players, 20));
  const ra = Math.log(a.market_value_eur) - a.explanation!.predicted_log_value;
  const rb = Math.log(b.market_value_eur) - b.explanation!.predicted_log_value;
  const verdict = (p: PlayerProfile, r: number) =>
    `${p.last_name}: observed ${formatEur(p.market_value_eur)} against ${formatEur(est(p))}, residual ${signed(r, 3)}, so the observed value is ${r >= 0 ? "above the estimate (the model under-predicts)" : "below the estimate (the model over-predicts)"}.`;

  return (
    <article>
      <header className={h.cover}>
        {players.map((p, i) => (
          <div key={p.id} className={h.side} data-side={i === 0 ? "left" : "right"}>
            <span className={styles.tag} data-quiet={i === 1 || undefined}>
              {p.role_code} · {p.sub_position}
            </span>
            <p className={h.first}>{p.first_name}</p>
            <h2 className={h.last}>{p.last_name}</h2>
            <p className={h.meta}>
              {leagueName(p.league_id).split(",")[0]} · {Math.floor(p.age)} · <span className="num">{formatEur(p.market_value_eur)}</span> observed
            </p>
          </div>
        ))}
        <span className={h.v} aria-hidden="true">
          v
        </span>
        <div className={h.coverFoot}>
          <span className={styles.tag}>Head-to-Head story</span>
          <h1 className={h.title}>{story.title}</h1>
          <p className={styles.dek}>{story.dek}</p>
          <p className={styles.basis}>
            <span>
              <b>Built from</b> {story.basis}
            </span>
            <span>No licensed photographs: typographic covers only.</span>
          </p>
        </div>
      </header>

      <div className={`${styles.wrap} ${h.body}`}>
        <section className={h.chapter} aria-labelledby="h2h-scale">
          <p className={styles.stepNo}>01</p>
          <h2 id="h2h-scale" className={styles.stepTitle}>
            On one scale
          </h2>
          <div className={h.scale}>
            {players.map((p, i) => (
              <div key={p.id} className={h.scaleRow} data-side={i === 0 ? "left" : "right"}>
                <span className={h.scaleName}>{p.last_name}</span>
                <span className={h.scaleTrack}>
                  {TIER_BOUNDARIES_EUR.map((t) => (
                    <i key={t} style={{ left: `${x(t)}%` }} />
                  ))}
                  <span className={h.scaleLink} style={{ left: `${Math.min(x(p.market_value_eur), x(est(p)))}%`, width: `${Math.abs(x(p.market_value_eur) - x(est(p)))}%` }} />
                  <span className={h.obs} style={{ left: `${x(p.market_value_eur)}%` }}>
                    <span>{formatEur(p.market_value_eur)}</span>
                  </span>
                  <span className={h.model} style={{ left: `${x(est(p))}%` }}>
                    <span>A {formatEur(est(p))}</span>
                  </span>
                </span>
              </div>
            ))}
            <div className={h.scaleTicks} aria-hidden="true">
              {euroTicks([lo, hi]).map((t) => (
                <span key={t} style={{ left: `${x(t)}%` }}>
                  {formatEur(t, 0)}
                </span>
              ))}
            </div>
            <p className={h.key}>
              <i data-k="obs" /> observed value <i data-k="model" /> Model A (served, in-sample) · dashed lines: €2M, €10M, €30M tier boundaries · log scale
            </p>
          </div>
        </section>

        <section className={h.chapter} aria-labelledby="h2h-tape">
          <p className={styles.stepNo}>02</p>
          <h2 id="h2h-tape" className={styles.stepTitle}>
            The tale of the tape
          </h2>
          <ol className={h.tape}>
            <li className={h.tapeHead} aria-hidden="true">
              <span>{a.last_name}</span>
              <span />
              <span>{b.last_name}</span>
            </li>
            {tape.map((t) => {
              const m = Math.max(Math.abs(t.a), Math.abs(t.b), 1e-9);
              return (
                <li key={t.label} className={h.tapeRow}>
                  <span className={h.tapeVal} data-lead={t.a > t.b || undefined}>
                    {t.fmt(t.a)}
                  </span>
                  <span className={h.tapeBars}>
                    <span className={h.barL}>
                      <span style={{ width: `${(t.a / m) * 100}%` }} />
                    </span>
                    <span className={h.tapeLabel}>{t.label}</span>
                    <span className={h.barR}>
                      <span style={{ width: `${(t.b / m) * 100}%` }} />
                    </span>
                  </span>
                  <span className={h.tapeVal} data-lead={t.b > t.a || undefined}>
                    {t.fmt(t.b)}
                  </span>
                </li>
              );
            })}
          </ol>
          <p className={h.note}>Club football in the two years to each valuation date. Longer bar = larger value, not better player.</p>
        </section>

        <section className={h.chapter} aria-labelledby="h2h-moves">
          <p className={styles.stepNo}>03</p>
          <h2 id="h2h-moves" className={styles.stepTitle}>
            What moves each estimate
          </h2>
          {sep && sep.cells[0] && sep.cells[1] && (
            <div className={`${styles.copy} ${h.lead}`}>
              <p>
                The input that separates them most is <strong>{sep.label.toLowerCase()}</strong>: {factor(sep.cells[0].contribution)} for {a.last_name} (
                {sep.cells[0].input}) against {factor(sep.cells[1].contribution)} for {b.last_name} ({sep.cells[1].input}).
              </p>
            </div>
          )}
          <div className={h.journeys}>
            {players.map((p) => (
              <div key={p.id} className={h.journey}>
                <p className={h.journeyName}>{p.last_name}</p>
                <ValuationJourney
                  variant="compact"
                  explanation={p.explanation!}
                  observed={p.market_value_eur}
                  subject={p.last_name}
                  top={6}
                  provenance="Published SHAP run, served Model A; in-sample."
                />
              </div>
            ))}
          </div>
        </section>

        <section className={h.chapter} aria-labelledby="h2h-verdict">
          <p className={styles.stepNo}>04</p>
          <h2 id="h2h-verdict" className={styles.stepTitle}>
            Against the market
          </h2>
          <div className={styles.copy}>
            <p>{verdict(a, ra)}</p>
            <p>{verdict(b, rb)}</p>
            <p className={styles.caveat}>
              Both estimates come from the served model, which was trained on these players: in-sample figures that sit closer to the market than an
              honest held-out estimate would. A residual is a disagreement between a model and Transfermarkt, not a finding that either player is
              over- or under-priced. Full records: <ExpLink href={`/players/${a.slug}?from=stories`}>{a.last_name}</ExpLink>,{" "}
              <ExpLink href={`/players/${b.slug}?from=stories`}>{b.last_name}</ExpLink>.
            </p>
          </div>
        </section>
      </div>
      <StoryEnd current={story.slug} terminal={{ href: `/terminal/compare?ids=${a.id},${b.id}`, label: "Open this pair in the Comparison Studio" }} />
    </article>
  );
}
