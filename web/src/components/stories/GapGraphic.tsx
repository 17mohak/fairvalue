"use client";

import { integer, signed } from "@/lib/format";
import styles from "./graphics.module.css";

interface Interval {
  estimate: number;
  low: number;
  high: number;
}

export interface GapData {
  funnel: { label: string; total: number; uefa: number; non_uefa: number }[];
  mae: { uefa: Interval; non_uefa: Interval; gap: Interval };
  gapA: Interval;
  gapB: Interval;
  leagues: { key: string; name: string; interval: Interval }[];
  pooled: number;
}

const DOMAIN: [number, number] = [-0.2, 0.4];
const gx = (v: number) => ((v - DOMAIN[0]) / (DOMAIN[1] - DOMAIN[0])) * 100;

/** The research story's pinned graphic. Every figure is passed in from research.json. */
export function GapGraphic({ data, step }: { data: GapData; step: number }) {
  if (step <= 1) return <Funnel data={data} highlight={step === 1} />;
  if (step === 2) return <Accuracy data={data} />;
  if (step <= 4) return <Intervals data={data} showB={step === 4} />;
  if (step === 5) return <Leagues data={data} />;
  return <NotMeaning />;
}

function Funnel({ data, highlight }: { data: GapData; highlight: boolean }) {
  const max = data.funnel[0]!.total;
  const last = data.funnel.at(-1)!;
  return (
    <figure className={styles.fig}>
      <figcaption className={styles.cap}>From every player in the dataset to the study population</figcaption>
      <ol className={styles.funnel}>
        {data.funnel.map((f, i) => {
          const isLast = i === data.funnel.length - 1;
          return (
            <li key={f.label} data-last={isLast || undefined}>
              <span className={styles.fLabel}>{f.label}</span>
              <span className={styles.fBar} style={{ width: `${Math.max(4, (f.total / max) * 100)}%` }}>
                {highlight && isLast ? (
                  <>
                    <span data-g="uefa" style={{ flexGrow: f.uefa }} />
                    <span data-g="non" style={{ flexGrow: f.non_uefa }} />
                  </>
                ) : (
                  <span data-g="all" style={{ flexGrow: 1 }} />
                )}
              </span>
              <span className={`${styles.fVal} num`}>{integer(f.total)}</span>
            </li>
          );
        })}
      </ol>
      {highlight ? (
        <p className={styles.legend}>
          <i data-g="uefa" /> UEFA {integer(last.uefa)} <i data-g="non" /> non-UEFA {integer(last.non_uefa)} ({((last.non_uefa / last.total) * 100).toFixed(1)}%)
        </p>
      ) : (
        <p className={styles.legend}>Players per selection stage</p>
      )}
    </figure>
  );
}

function Accuracy({ data }: { data: GapData }) {
  const rows = [
    { k: "UEFA", v: data.mae.uefa, g: "uefa" },
    { k: "Non-UEFA", v: data.mae.non_uefa, g: "non" },
  ];
  const max = 0.5;
  return (
    <figure className={styles.fig}>
      <figcaption className={styles.cap}>How far off the model is, on average: mean absolute error, log scale, Model A</figcaption>
      <div className={styles.acc}>
        {rows.map((r) => (
          <div key={r.k} className={styles.accRow}>
            <span className={styles.accLabel}>{r.k}</span>
            <span className={styles.accTrack}>
              <span data-g={r.g} style={{ width: `${(r.v.estimate / max) * 100}%` }} />
              <i style={{ left: `${(r.v.low / max) * 100}%`, width: `${((r.v.high - r.v.low) / max) * 100}%` }} />
            </span>
            <span className={`${styles.accVal} num`}>{r.v.estimate.toFixed(3)}</span>
          </div>
        ))}
      </div>
      <p className={styles.big}>
        <span className="num">{signed(data.mae.gap.estimate)}</span>
        <small>
          accuracy gap within leagues · 95% CI {signed(data.mae.gap.low)} to {signed(data.mae.gap.high)}
        </small>
      </p>
    </figure>
  );
}

function Intervals({ data, showB }: { data: GapData; showB: boolean }) {
  const rows = [
    { k: "Model A", sub: "with league and club", v: data.gapA, on: true },
    { k: "Model B", sub: "performance only", v: data.gapB, on: showB },
  ];
  return (
    <figure className={styles.fig}>
      <figcaption className={styles.cap}>Signed residual gap, non-UEFA minus UEFA, within leagues · log units · 95% CI</figcaption>
      <div className={styles.axisWrap}>
        <i className={styles.zero} style={{ "--z": gx(0) / 100 } as React.CSSProperties}>
          <span>0 · no gap</span>
        </i>
        {rows.map((r) => (
          <div key={r.k} className={styles.ivRow} data-on={r.on || undefined}>
            <span className={styles.ivLabel}>
              <b>{r.k}</b>
              <small>{r.sub}</small>
            </span>
            <span className={styles.ivTrack}>
              <span className={styles.ivBand} style={{ left: `${gx(r.v.low)}%`, width: `${gx(r.v.high) - gx(r.v.low)}%` }} />
              <span className={styles.ivDot} style={{ left: `${gx(r.v.estimate)}%` }} />
            </span>
            <span className={`${styles.ivVal} num`}>{signed(r.v.estimate)}</span>
          </div>
        ))}
        <div className={styles.ivTicks} aria-hidden="true">
          {[-0.2, -0.1, 0, 0.1, 0.2, 0.3, 0.4].map((t) => (
            <span key={t} style={{ left: `${gx(t)}%` }}>
              {t === 0 ? "0" : signed(t, 1)}
            </span>
          ))}
        </div>
      </div>
      <p className={styles.legend}>Right of zero: relative to the model&apos;s estimates, non-UEFA players&apos; observed values sit higher than UEFA players&apos; in the same leagues.</p>
    </figure>
  );
}

function Leagues({ data }: { data: GapData }) {
  const excl = data.leagues.filter((l) => l.interval.low > 0 || l.interval.high < 0).length;
  return (
    <figure className={styles.fig}>
      <figcaption className={styles.cap}>Model A gap within each league large enough to estimate on its own · 95% CI</figcaption>
      <div className={styles.axisWrap}>
        <i className={styles.zero} style={{ "--z": gx(0) / 100 } as React.CSSProperties} />
        {data.leagues.map((l) => (
          <div key={l.key} className={`${styles.ivRow} ${styles.ivSmall}`} data-on>
            <span className={styles.ivLabel}>
              <b>{l.name}</b>
            </span>
            <span className={styles.ivTrack}>
              <span className={styles.ivBand} style={{ left: `${gx(l.interval.low)}%`, width: `${gx(l.interval.high) - gx(l.interval.low)}%` }} />
              <span className={styles.ivDot} style={{ left: `${gx(l.interval.estimate)}%` }} />
            </span>
            <span className={`${styles.ivVal} num`}>{signed(l.interval.estimate)}</span>
          </div>
        ))}
      </div>
      <p className={styles.legend}>
        {excl} of {data.leagues.length} intervals exclude zero on their own; {data.pooled} smaller leagues enter only the pooled estimate.
      </p>
    </figure>
  );
}

function NotMeaning() {
  return (
    <figure className={styles.fig}>
      <ul className={styles.nots}>
        <li>
          <b>Not discrimination.</b> An observational gap in one model&apos;s errors.
        </li>
        <li>
          <b>Not the true price.</b> The target is Transfermarkt&apos;s valuation, which may itself be biased.
        </li>
        <li>
          <b>Not the whole market.</b> A selected population: 14 European leagues, 450+ minutes.
        </li>
        <li>
          <b>Not causal.</b> Nationality is never a model input; the gap says where errors fall, not why.
        </li>
      </ul>
    </figure>
  );
}
