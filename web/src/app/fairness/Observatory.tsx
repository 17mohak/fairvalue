"use client";

import { AnimatePresence, animate, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Dumbbell } from "@/components/charts/Dumbbell";
import { IntervalPlot, type IntervalRow } from "@/components/charts/IntervalPlot";
import { RoomLink } from "@/components/site/RoomLink";
import { Segmented } from "@/components/ui/Segmented";
import { leagueCountry, MODEL_LABELS, type ModelId } from "@/lib/football";
import { decimal, formatEur, integer, logGapAsPercent, percent, percentagePoints, signed } from "@/lib/format";
import type { FairnessData, ModelView } from "./data";
import styles from "./fairness.module.css";

const VIEWS = [
  { id: "gap", index: "01", label: "The gap", question: "Are non-UEFA players' errors different from UEFA players'?" },
  { id: "value", index: "02", label: "Value level", question: "Is it just that non-UEFA players are worth more?" },
  { id: "leagues", index: "03", label: "Leagues", question: "Where does the gap sit?" },
  { id: "subgroups", index: "04", label: "Subgroups", question: "Which non-UEFA players?" },
  { id: "tiers", index: "05", label: "Tier errors", question: "Does the tier classifier lean the same way?" },
  { id: "robustness", index: "06", label: "Robustness", question: "Does it survive attempts to make it go away?" },
  { id: "limits", index: "07", label: "Limits", question: "What can this audit establish, and what not?" },
] as const;

type ViewId = (typeof VIEWS)[number]["id"];

const isView = (v: string | null): v is ViewId => VIEWS.some((x) => x.id === v);
const isModel = (v: string | null): v is ModelId => v === "A" || v === "B";

type LeagueSort = "gap" | "n" | "name";

const pp = (v: number) => percentagePoints(v, 1);
const SIDES: [string, string] = ["UEFA under-predicted", "non-UEFA under-predicted"];

/** Attach the comparison model's interval to each row with the same key. */
function withGhost(rows: IntervalRow[], other: IntervalRow[], on: boolean): IntervalRow[] {
  if (!on) return rows;
  const byKey = new Map(other.map((r) => [r.key, r]));
  return rows.map((r) => {
    const o = byKey.get(r.key);
    return o ? { ...r, ghost: { ...o.interval, pointOnly: o.pointOnly } } : r;
  });
}

export function Observatory({ data }: { data: FairnessData }) {
  const params = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const reduce = useReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);
  const defsRef = useRef<HTMLDialogElement>(null);

  const view: ViewId = isView(params.get("view")) ? (params.get("view") as ViewId) : "gap";
  const urlModel: ModelId = isModel(params.get("model")) ? (params.get("model") as ModelId) : "A";
  const urlCompare = params.get("compare") === "1";

  // The URL is the source of truth; local copies let the controls respond on the click itself
  // instead of after the navigation round-trip, and follow the URL on back/forward.
  const [model, setModelLocal] = useState(urlModel);
  const [compare, setCompareLocal] = useState(urlCompare);
  const [synced, setSynced] = useState({ urlModel, urlCompare });
  if (synced.urlModel !== urlModel || synced.urlCompare !== urlCompare) {
    setSynced({ urlModel, urlCompare });
    setModelLocal(urlModel);
    setCompareLocal(urlCompare);
  }
  const other: ModelId = model === "A" ? "B" : "A";
  const v = data[model];
  const o = data[other];
  const meta = VIEWS.find((x) => x.id === view)!;
  const at = VIEWS.indexOf(meta);

  const href = (next: Partial<{ view: ViewId; model: ModelId; compare: boolean }>) => {
    const q = new URLSearchParams();
    const nv = next.view ?? view;
    const nm = next.model ?? model;
    const nc = next.compare ?? compare;
    if (nv !== "gap") q.set("view", nv);
    if (nm !== "A") q.set("model", nm);
    if (nc) q.set("compare", "1");
    const s = q.toString();
    return s ? `${path}?${s}` : path;
  };

  // Model and overlay are settings of the instrument, so they replace the history entry;
  // switching views pushes one, so back and forward step through views.
  const setModel = (m: ModelId) => {
    setModelLocal(m);
    router.replace(href({ model: m }), { scroll: false });
  };
  const setCompare = (c: boolean) => {
    setCompareLocal(c);
    router.replace(href({ compare: c }), { scroll: false });
  };

  // On narrow screens, bring the stage into view after choosing a view further down.
  const lastView = useRef(view);
  useEffect(() => {
    if (lastView.current === view) return;
    lastView.current = view;
    const el = stageRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top;
    if (top < 0) el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }, [view, reduce]);

  const ghostLabel = compare ? MODEL_LABELS[other].name : undefined;
  const primaryLabel = MODEL_LABELS[model].name;

  return (
    <div className={styles.observatory}>
      {/* ---- Readout ---- */}
      <header className={styles.readout}>
        <div className={styles.readoutText}>
          <p className="eyebrow">
            <b className="num">03</b> Fairness observatory
          </p>
          <h1 className={styles.title}>Does the model miss everyone the same way?</h1>
          <p className={styles.lede}>
            {integer(data.population.total)} held-out predictions, {integer(data.population.non_uefa)} of them for players from outside UEFA.
            Choose an instrument, switch models, and overlay one on the other.
          </p>
        </div>

        <div className={styles.dial}>
          <div aria-live="polite" aria-atomic="true">
            <p className={styles.dialLabel}>Within-league signed gap · {MODEL_LABELS[model].name}</p>
            <p className={`${styles.dialValue} num`}>
              <AnimatedSigned value={v.gap.estimate} />
              <span className="visually-hidden">{signed(v.gap.estimate)}</span>
            </p>
            <p className={`${styles.dialCi} num`}>
              95% CI {signed(v.gap.low)} to {signed(v.gap.high)} · about {logGapAsPercent(v.gap.estimate)} relative
            </p>
          </div>
          <DialGauge model={model} data={data} />
          <div className={styles.controls}>
            <Segmented
              legend="Model"
              hideLegend
              name="obs-model"
              value={model}
              onChange={setModel}
              options={[
                { value: "A", label: "Model A" },
                { value: "B", label: "Model B" },
              ]}
            />
            <label className={styles.overlay}>
              <input type="checkbox" checked={compare} onChange={(e) => setCompare(e.target.checked)} />
              <span className={styles.switch} aria-hidden="true" />
              Overlay {MODEL_LABELS[other].name}
            </label>
            <button type="button" className={styles.defsButton} onClick={() => defsRef.current?.showModal()}>
              Definitions
            </button>
          </div>
        </div>
      </header>

      {/* ---- Instrument rail + stage ---- */}
      <div className={styles.bench}>
        <nav className={styles.rail} aria-label="Instruments">
          <ol>
            {VIEWS.map((x) => (
              <li key={x.id}>
                <Link href={href({ view: x.id })} scroll={false} className={styles.railLink} aria-current={x.id === view ? "page" : undefined}>
                  <span className={`${styles.railIndex} num`}>{x.index}</span>
                  <span className={styles.railLabel}>{x.label}</span>
                  <span className={styles.railQ}>{x.question}</span>
                </Link>
              </li>
            ))}
          </ol>
          <p className={styles.railNote}>
            Observational results on a selected population. Not evidence of discrimination, and no fairness threshold is claimed to be met.
          </p>
        </nav>

        <div className={styles.stage} ref={stageRef}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.section
              key={view}
              className={styles.panel}
              aria-labelledby={`view-${view}`}
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <header className={styles.panelHead}>
                <p className={`${styles.panelIndex} num`}>
                  {meta.index} <span>/ 07</span> · {meta.label}
                </p>
                <h2 id={`view-${view}`} className={styles.h2}>
                  {meta.question}
                </h2>
              </header>
              {view === "gap" && <GapView v={v} o={o} model={model} other={other} data={data} compare={compare} ghostLabel={ghostLabel} primaryLabel={primaryLabel} />}
              {view === "value" && <ValueView v={v} />}
              {view === "leagues" && <LeaguesView v={v} o={o} compare={compare} ghostLabel={ghostLabel} primaryLabel={primaryLabel} />}
              {view === "subgroups" && <SubgroupsView v={v} o={o} compare={compare} ghostLabel={ghostLabel} primaryLabel={primaryLabel} />}
              {view === "tiers" && <TiersView v={v} o={o} compare={compare} ghostLabel={ghostLabel} primaryLabel={primaryLabel} />}
              {view === "robustness" && <RobustnessView v={v} o={o} model={model} data={data} compare={compare} ghostLabel={ghostLabel} primaryLabel={primaryLabel} />}
              {view === "limits" && <LimitsView data={data} />}

              <footer className={styles.panelFoot}>
                {at > 0 ? (
                  <Link href={href({ view: VIEWS[at - 1]!.id })} scroll={false} className={styles.step}>
                    ← {VIEWS[at - 1]!.label}
                  </Link>
                ) : (
                  <span />
                )}
                {at < VIEWS.length - 1 ? (
                  <Link href={href({ view: VIEWS[at + 1]!.id })} scroll={false} className={`${styles.step} ${styles.stepNext}`}>
                    Next: {VIEWS[at + 1]!.label} →
                  </Link>
                ) : (
                  <RoomLink href="/methods" className={`${styles.step} ${styles.stepNext}`}>
                    How it was measured: Methods →
                  </RoomLink>
                )}
              </footer>
            </motion.section>
          </AnimatePresence>
        </div>
      </div>

      <Definitions ref={defsRef} />
    </div>
  );
}

/* ------------------------------------------------------------------ readout */

function AnimatedSigned({ value }: { value: number }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    const from = prev.current;
    prev.current = value;
    if (reduce || from === value) {
      setShown(value);
      return;
    }
    const c = animate(from, value, { duration: 0.6, ease: [0.22, 1, 0.36, 1], onUpdate: setShown });
    return () => c.stop();
  }, [value, reduce]);
  return <span aria-hidden="true">{signed(shown)}</span>;
}

/** Both models on one axis; the selected one is lit. */
function DialGauge({ model, data }: { model: ModelId; data: FairnessData }) {
  const d0 = -0.05;
  const d1 = 0.25;
  const pos = (x: number) => ((x - d0) / (d1 - d0)) * 100;
  return (
    <div className={styles.gauge} aria-hidden="true">
      <span className={styles.gaugeZero} style={{ left: `${pos(0)}%` }}>
        <i>0</i>
      </span>
      {(["A", "B"] as const).map((m) => {
        const g = data[m].gap;
        return (
          <span key={m} className={styles.gaugeRow} data-on={m === model || undefined} data-m={m}>
            <span className={styles.gaugeCi} style={{ left: `${pos(g.low)}%`, width: `${pos(g.high) - pos(g.low)}%` }} />
            <span className={styles.gaugeDot} style={{ left: `${pos(g.estimate)}%` }} />
            <span className={styles.gaugeTag} style={{ left: `${pos(g.high)}%` }}>
              {m}
            </span>
          </span>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ views */

interface ViewProps {
  v: ModelView;
  o: ModelView;
  compare: boolean;
  ghostLabel?: string;
  primaryLabel: string;
}

function Reading({ children, chart }: { children: ReactNode; chart: ReactNode }) {
  return (
    <div className={styles.reading}>
      <div className={styles.chart}>{chart}</div>
      <aside className={`prose ${styles.notes}`}>{children}</aside>
    </div>
  );
}

function GapView({ v, o, model, other, data, compare, ghostLabel, primaryLabel }: ViewProps & { model: ModelId; other: ModelId; data: FairnessData }) {
  return (
    <>
      <Reading
        chart={
          <IntervalPlot
            rows={withGhost(v.residuals, o.residuals, compare)}
            axisLabel="Mean residual and gap, log scale, 95% CI"
            sides={["over-predicted", "under-predicted"]}
            tableCaption="Mean residuals and gaps"
            ghostLabel={ghostLabel}
            primaryLabel={primaryLabel}
          />
        }
      >
        <p>
          Under {MODEL_LABELS[model].name} the within-league gap is <strong className="num">{signed(v.gap.estimate)}</strong> (95% CI{" "}
          <span className="num">
            {signed(v.gap.low)} to {signed(v.gap.high)}
          </span>
          ). Non-UEFA players&apos; Transfermarkt values sit about {logGapAsPercent(v.gap.estimate)} above the model&apos;s estimate, relative to
          UEFA players in the same leagues. In euros, about <span className="num">{formatEur(v.gapEur.estimate)}</span> per player (
          <span className="num">
            {formatEur(v.gapEur.low)} to {formatEur(v.gapEur.high)}
          </span>
          ), a figure dominated by expensive players.
        </p>
        <p>
          Accuracy is close: mean absolute error <span className="num">{decimal(v.accuracy.maeUefa, 3)}</span> for UEFA and{" "}
          <span className="num">{decimal(v.accuracy.maeNon, 3)}</span> for non-UEFA players, a within-league difference of{" "}
          <span className="num">{signed(v.accuracy.maeGap.estimate)}</span> ({signed(v.accuracy.maeGap.low)} to {signed(v.accuracy.maeGap.high)}).
          The model misses both groups by similar amounts, in opposite directions.
        </p>
        <p>
          Removing league and club moves the gap from {signed(data.A.gap.estimate)} to {signed(data.B.gap.estimate)}, a paired difference of{" "}
          {signed(data.aMinusB.estimate)} ({signed(data.aMinusB.low)} to {signed(data.aMinusB.high)}). Context accounts for part of the gap; a
          clear gap remains. {MODEL_LABELS[other].name}&apos;s gap is {signed(o.gap.estimate)}.
        </p>
      </Reading>
      <dl className={styles.keyFigures}>
        <div>
          <dt>UEFA mean residual</dt>
          <dd className="num" data-tone="uefa">
            {signed(v.residuals[0]!.interval.estimate)}
          </dd>
        </div>
        <div>
          <dt>Non-UEFA mean residual</dt>
          <dd className="num" data-tone="non-uefa">
            {signed(v.residuals[1]!.interval.estimate)}
          </dd>
        </div>
        <div>
          <dt>MAE gap</dt>
          <dd className="num">{signed(v.accuracy.maeGap.estimate)}</dd>
        </div>
        <div>
          <dt>RMSE gap (raw)</dt>
          <dd className="num">{signed(v.accuracy.rmseGap.estimate)}</dd>
        </div>
      </dl>
    </>
  );
}

function ValueView({ v }: { v: ModelView }) {
  return (
    <Reading
      chart={<Dumbbell rows={v.deciles} axisLabel="Mean residual by decile of predicted value (1 = lowest), log scale" tableCaption="Mean residual by predicted-value decile" />}
    >
      <p>
        Residuals drift with value (estimates are pulled towards the middle), and non-UEFA players in this population are worth more on average.
        So the comparison is repeated inside each tenth of the model&apos;s own predictions. Binning on the prediction, not the actual value, avoids
        conditioning on the outcome.
      </p>
      <p>
        Non-UEFA players are under-predicted relative to UEFA players in every decile. Pooled within deciles the gap is{" "}
        <strong className="num">{signed(v.calibration.byDecile.estimate)}</strong> ({signed(v.calibration.byDecile.low)} to{" "}
        {signed(v.calibration.byDecile.high)}); within league and decile, {signed(v.calibration.byLeagueDecile.estimate)}.
      </p>
      <p className={styles.howTo}>Each line joins the two groups&apos; mean residual in one decile. Hover or focus a row for exact values.</p>
    </Reading>
  );
}

/** "a, b and c" */
function listOf(items: string[]): string {
  return items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function LeaguesView({ v, o, compare, ghostLabel, primaryLabel }: ViewProps) {
  const [sort, setSort] = useState<LeagueSort>("gap");
  // Narrative is read from the selected model's league-level estimates (leagues with >= 100 non-UEFA players).
  const reported = v.leagues.filter((l) => !l.hollow);
  const largest = [...reported].sort((a, b) => b.interval.estimate - a.interval.estimate).filter((l) => l.interval.low > 0).slice(0, 5);
  const nearZero = reported.filter((l) => l.interval.low <= 0 && l.interval.high >= 0);
  const rows = [...withGhost(v.leagues, o.leagues, compare)].sort((a, b) =>
    sort === "gap" ? b.interval.estimate - a.interval.estimate : sort === "n" ? (b.n ?? 0) - (a.n ?? 0) : a.label.localeCompare(b.label),
  );
  return (
    <Reading
      chart={
        <>
          <div className={styles.chartTools}>
            <Segmented
              legend="Sort leagues by"
              name="league-sort"
              value={sort}
              onChange={setSort}
              options={[
                { value: "gap", label: "Gap" },
                { value: "n", label: "Non-UEFA players" },
                { value: "name", label: "Name" },
              ]}
            />
          </div>
          <IntervalPlot
            rows={rows}
            sides={SIDES}
            axisLabel="Within-league signed gap, log scale, 95% CI"
            tableCaption="Signed gap by league"
            ghostLabel={ghostLabel}
            primaryLabel={primaryLabel}
          />
        </>
      }
    >
      <p>
        Among leagues with a league-level estimate, under {primaryLabel} the gap is clearly above zero in{" "}
        {listOf(largest.map((l) => leagueCountry(l.key)))}.
        {nearZero.length > 0 && <> In {listOf(nearZero.map((l) => leagueCountry(l.key)))} the interval includes zero.</>}
      </p>
      <p>
        Leagues with fewer than 100 non-UEFA players have hollow markers: the audit reports them only as part of the pooled estimate, so read
        them as descriptive. This shows where the gap sits, not why.
      </p>
    </Reading>
  );
}

function SubgroupsView({ v, o, compare, ghostLabel, primaryLabel }: ViewProps) {
  return (
    <Reading
      chart={
        <div className={styles.stack}>
          {v.strata.map((g, i) => (
            <div key={g.title}>
              <h3 className={styles.h3}>
                {g.title}
                {g.note && <span className={styles.h3Note}>{g.note}</span>}
              </h3>
              <IntervalPlot
                rows={withGhost(g.rows, o.strata[i]!.rows, compare)}
                domain={[-0.15, 0.3]}
                axisLabel="Within-league signed gap vs UEFA, log scale"
                tableCaption={g.title}
                ghostLabel={i === 0 ? ghostLabel : undefined}
                primaryLabel={primaryLabel}
              />
            </div>
          ))}
        </div>
      }
    >
      <p>
        The gap is larger for recent arrivals and South American players, and smaller for players born in UEFA countries and for those established
        in these leagues. That fits the idea that migrants reach these leagues through a stricter filter the model cannot see. It does not prove
        it, and the intervals overlap.
      </p>
      <p>Subgroups are descriptive. With this many comparisons, some intervals will exclude zero by chance.</p>
    </Reading>
  );
}

function TiersView({ v, o, compare, ghostLabel, primaryLabel }: ViewProps) {
  return (
    <Reading
      chart={
        <div className={styles.stack}>
          <div className={styles.rates}>
            <p>
              <span className={styles.rateLabel}>Wrong tier, UEFA</span>
              <span className={`${styles.rateValue} num`} data-tone="uefa">
                {percent(v.tiers.errorUefa)}
              </span>
            </p>
            <p>
              <span className={styles.rateLabel}>Wrong tier, non-UEFA</span>
              <span className={`${styles.rateValue} num`} data-tone="non-uefa">
                {percent(v.tiers.errorNon)}
              </span>
            </p>
          </div>
          <IntervalPlot
            rows={withGhost(v.tiers.summary, o.tiers.summary, compare)}
            format={pp}
            axisLabel="Non-UEFA minus UEFA, percentage points, 95% CI"
            sides={["worse for UEFA", "worse for non-UEFA"]}
            tableCaption="Tier classification error gaps"
            ghostLabel={ghostLabel}
            primaryLabel={primaryLabel}
          />
          <div>
            <h3 className={styles.h3}>Correctly identified, by tier</h3>
            <IntervalPlot
              rows={withGhost(v.tiers.perTier, o.tiers.perTier, compare)}
              format={pp}
              domain={[-0.2, 0.15]}
              axisLabel="True-positive-rate gap, non-UEFA minus UEFA, percentage points"
              tableCaption="True-positive-rate gap by tier"
            />
          </div>
        </div>
      }
    >
      <p>
        The separate tier classifier puts {percent(v.tiers.errorUefa)} of UEFA players and {percent(v.tiers.errorNon)} of non-UEFA players in the
        wrong tier. The extra errors for non-UEFA players are mostly placements below their actual tier, consistent with the value
        under-prediction.
      </p>
      <p>
        Per-tier comparisons rest on small groups: only 94 non-UEFA players are World Class and 246 Elite. Those intervals are wide enough to fit
        no gap or a sizeable one, so they are not read as evidence either way.
      </p>
    </Reading>
  );
}

function RobustnessView({ v, o, model, data, compare, ghostLabel, primaryLabel }: ViewProps & { model: ModelId; data: FairnessData }) {
  return (
    <Reading
      chart={
        <IntervalPlot
          rows={withGhost(v.robustness, o.robustness, compare)}
          domain={[0, 0.25]}
          axisLabel="Within-league signed gap, log scale"
          tableCaption="Robustness checks"
          ghostLabel={ghostLabel}
          primaryLabel={primaryLabel}
        />
      }
    >
      <p>
        The sign of the gap survives every check the audit ran: resampling whole clubs instead of players, comparing players with the same
        predicted value, raising the minutes threshold to 900, holding out entire clubs, and swapping the algorithm.
      </p>
      <p>
        Players at the same club are not independent (residual intra-club correlation{" "}
        <span className="num">{decimal(data.icc.find((i) => i.model === model)!.icc_residual_within_club, 2)}</span> under{" "}
        {MODEL_LABELS[model].name}), which is why the club-clustered interval is shown. Points without whiskers are point estimates.
      </p>
      <p>
        Among Model A&apos;s largest 5% of under-predictions, {percent(data.worstA.under)} are non-UEFA players, against{" "}
        {percent(data.worstA.overall)} of all players; among the largest over-predictions, {percent(data.worstA.over)}.
      </p>
    </Reading>
  );
}

function LimitsView({ data }: { data: FairnessData }) {
  return (
    <div className={styles.limits}>
      <div>
        <h3 className={styles.h3}>Supported, within this population</h3>
        <ul>
          <li>
            A nationality-blind model trained on performance, profile and context under-predicts non-UEFA players&apos; Transfermarkt values
            relative to UEFA players in the same leagues and at the same predicted value.
          </li>
          <li>Absolute accuracy is similar for both groups.</li>
          <li>League mix, value level, the minutes threshold and familiarity with the club do not explain it. It is concentrated in a subset of leagues.</li>
          <li>The original hypothesis, that non-UEFA players would get lower value-tier outcomes than comparable UEFA players, is not supported.</li>
        </ul>
      </div>
      <div>
        <h3 className={styles.h3}>Not established</h3>
        <ul data-kind="no">
          <li>That anyone discriminates, in either direction.</li>
          <li>That nationality causes higher or lower valuations.</li>
          <li>Anything about players outside these 14 leagues or below 450 minutes.</li>
          <li>That the model is &ldquo;fair&rdquo; or &ldquo;compliant&rdquo; by any threshold.</li>
        </ul>
      </div>
      <div>
        <h3 className={styles.h3}>Explanations the study cannot separate</h3>
        <ol>
          <li>Selection: non-UEFA players pass a stricter filter to reach these leagues, on qualities the data does not record.</li>
          <li>Excluded variables: caps were left out as a nationality proxy; contract and agent data are unavailable.</li>
          <li>League market structure: the gap sits mostly in RU1, TR1, GR1, UKR1 and BE1.</li>
          <li>Valuation practice: how Transfermarkt&apos;s community values imported players. The target itself may be biased.</li>
        </ol>
      </div>
      <p className={styles.scope}>
        Population: {integer(data.population.total)} players ({integer(data.population.non_uefa)} non-UEFA) at clubs in 14 European first
        divisions, valued June 2025 to June 2026, with at least 450 club minutes in two years. A selected population, not the global market. Full
        write-up: <code>docs/reports/FAIRNESS_AUDIT.md</code>.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ definitions */

function Definitions({ ref }: { ref: React.Ref<HTMLDialogElement> }) {
  return (
    <dialog
      ref={ref}
      className={styles.defs}
      aria-labelledby="defs-title"
      onClick={(e) => {
        // A click on the backdrop (the dialog element itself) closes it.
        if (e.target === e.currentTarget) e.currentTarget.close();
      }}
    >
      <div className={styles.defsInner}>
        <header className={styles.defsHead}>
          <h2 id="defs-title" className={styles.h3}>
            How to read the observatory
          </h2>
          <form method="dialog">
            <button type="submit" className={styles.defsClose} aria-label="Close definitions">
              ×
            </button>
          </form>
        </header>
        <dl>
          <div>
            <dt>Residual</dt>
            <dd>
              Actual Transfermarkt value minus the model&apos;s estimate, on the log scale. Positive means the model <strong>under-predicted</strong>{" "}
              the player.
            </dd>
          </div>
          <div>
            <dt>Gap</dt>
            <dd>Mean residual of non-UEFA players minus that of UEFA players. Positive means non-UEFA players are under-predicted more.</dd>
          </div>
          <div>
            <dt>Within leagues</dt>
            <dd>Gaps are computed inside each league, then weighted by where non-UEFA players play, so league mix cannot create the gap.</dd>
          </div>
          <div>
            <dt>Held out</dt>
            <dd>Every residual comes from a model that never saw that player (5-fold cross-validation). Group is never used in training.</dd>
          </div>
          <div>
            <dt>Uncertainty</dt>
            <dd>95% intervals from a 2,000-replicate stratified bootstrap of the held-out predictions. They do not include refit variance.</dd>
          </div>
          <div>
            <dt>Groups</dt>
            <dd>UEFA or non-UEFA by the confederation of a player&apos;s first-listed citizenship. Dual nationals are classified by that first entry.</dd>
          </div>
          <div>
            <dt>Model A and Model B</dt>
            <dd>
              {MODEL_LABELS.A.name}: {MODEL_LABELS.A.description} {MODEL_LABELS.B.name}: {MODEL_LABELS.B.description}
            </dd>
          </div>
        </dl>
      </div>
    </dialog>
  );
}
