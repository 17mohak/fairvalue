"use client";

import { AnimatePresence, animate, motion, useReducedMotion } from "motion/react";
import { room } from "@/lib/rooms";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Dumbbell } from "@/components/charts/Dumbbell";
import { IntervalPlot, type IntervalRow } from "@/components/charts/IntervalPlot";
import { RoomLink } from "@/components/site/RoomLink";
import { Segmented } from "@/components/ui/Segmented";
import { featureLabel, leagueCountry, MODEL_LABELS, type ModelId } from "@/lib/football";
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

  const lastView = useRef(view);
  useEffect(() => {
    if (lastView.current === view) return;
    lastView.current = view;
    const el = stageRef.current;
    if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }, [view, reduce]);

  const ghostLabel = compare ? MODEL_LABELS[other].name : undefined;
  const primaryLabel = MODEL_LABELS[model].name;
  const vp = { v, o, compare, ghostLabel, primaryLabel };

  return (
    <div className={styles.observatory}>
      <header className={`fv-pagehead ${styles.head}`}>
        <div>
          <p className="eyebrow">
            <b className="num">{room("observatory").index}</b> Research instrument
          </p>
          <h1>Fairness observatory</h1>
        </div>
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
      </header>

      {/* ---- Headline gaps: the result the whole observatory is about ---- */}
      <section className={`fv-panel ${styles.strip}`} aria-label="Headline result">
        <div className={styles.stripMain} aria-live="polite" aria-atomic="true">
          <p className="fv-label">Within-league signed gap · {MODEL_LABELS[model].name}</p>
          <p className={`${styles.stripValue} num`}>
            <AnimatedSigned value={v.gap.estimate} />
            <span className="visually-hidden">{signed(v.gap.estimate)}</span>
          </p>
          <p className={`${styles.stripCi} num`}>
            95% CI {signed(v.gap.low)} to {signed(v.gap.high)} · about {logGapAsPercent(v.gap.estimate)}
          </p>
        </div>
        <div className={styles.stripChart}>
          <GapAxis data={data} model={model} />
        </div>
        <dl className={styles.stripFacts}>
          <div>
            <dt>Model A − Model B</dt>
            <dd className="num">{signed(data.aMinusB.estimate)}</dd>
            <span className="num">
              {signed(data.aMinusB.low)} to {signed(data.aMinusB.high)}
            </span>
          </div>
          <div>
            <dt>Accuracy gap (MAE)</dt>
            <dd className="num">{signed(v.accuracy.maeGap.estimate)}</dd>
            <span className="num">
              {signed(v.accuracy.maeGap.low)} to {signed(v.accuracy.maeGap.high)}
            </span>
          </div>
          <div>
            <dt>Held-out players</dt>
            <dd className="num">{integer(data.population.total)}</dd>
            <span>{integer(data.population.non_uefa)} non-UEFA</span>
          </div>
        </dl>
      </section>

      <div className={styles.bench}>
        <nav className={styles.rail} aria-label="Instruments">
          <ol>
            {VIEWS.map((x) => (
              <li key={x.id}>
                <Link href={href({ view: x.id })} scroll={false} className={styles.railLink} aria-current={x.id === view ? "page" : undefined}>
                  <span className={`${styles.railIndex} num`}>{x.index}</span>
                  <span className={styles.railLabel}>{x.label}</span>
                </Link>
              </li>
            ))}
          </ol>
          <p className={styles.railNote}>Observational, on a selected population. Not evidence of discrimination; no fairness threshold is claimed to be met.</p>
        </nav>

        <div className={styles.stage} ref={stageRef}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.section
              key={view}
              className={styles.view}
              aria-labelledby={`view-${view}`}
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -6 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              <header className={styles.viewHead}>
                <p className={`${styles.viewIndex} num`}>
                  {meta.index} / 07 · {meta.label}
                </p>
                <h2 id={`view-${view}`} className={styles.h2}>
                  {meta.question}
                </h2>
              </header>
              {view === "gap" && <GapView {...vp} model={model} data={data} />}
              {view === "value" && <ValueView v={v} />}
              {view === "leagues" && <LeaguesView {...vp} />}
              {view === "subgroups" && <SubgroupsView {...vp} />}
              {view === "tiers" && <TiersView {...vp} />}
              {view === "robustness" && <RobustnessView {...vp} model={model} data={data} />}
              {view === "limits" && <LimitsView data={data} />}
              <footer className={styles.viewFoot}>
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

/* ------------------------------------------------------------------ pieces */

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

/** Both models' gaps and the paired difference on one axis, the selected model lit. */
function GapAxis({ data, model }: { data: FairnessData; model: ModelId }) {
  const d0 = -0.12;
  const d1 = 0.25;
  const pos = (x: number) => ((x - d0) / (d1 - d0)) * 100;
  const rows = [
    { key: "A", label: "Model A", i: data.A.gap, on: model === "A" },
    { key: "B", label: "Model B", i: data.B.gap, on: model === "B" },
    { key: "AB", label: "A − B", i: data.aMinusB, on: false, diff: true },
  ];
  return (
    <div className={styles.axis} role="img" aria-label={rows.map((r) => `${r.label} ${signed(r.i.estimate)} (${signed(r.i.low)} to ${signed(r.i.high)})`).join("; ")}>
      {rows.map((r) => (
        <div key={r.key} className={styles.axisRow} data-on={r.on || undefined} data-diff={r.diff || undefined}>
          <span className={styles.axisLabel}>{r.label}</span>
          <span className={styles.axisTrack}>
            <span className={styles.axisZero} style={{ left: `${pos(0)}%` }} />
            <span className={styles.axisCi} style={{ left: `${pos(r.i.low)}%`, width: `${pos(r.i.high) - pos(r.i.low)}%` }} />
            <span className={styles.axisDot} style={{ left: `${pos(r.i.estimate)}%` }} />
          </span>
          <span className={`${styles.axisValue} num`}>{signed(r.i.estimate)}</span>
        </div>
      ))}
      <div className={styles.axisTicks} aria-hidden="true">
        <span />
        <span className={styles.axisTickTrack}>
          {[-0.1, 0, 0.1, 0.2].map((t) => (
            <i key={t} style={{ left: `${pos(t)}%` }}>
              {t === 0 ? "0" : signed(t, 1)}
            </i>
          ))}
        </span>
        <span />
      </div>
    </div>
  );
}

function Panel({ title, note, aside, wide, children }: { title: string; note?: string; aside?: ReactNode; wide?: boolean; children: ReactNode }) {
  return (
    <section className={`fv-panel ${wide ? styles.wide : ""}`}>
      <header className="fv-panel-head">
        <h3 className="fv-panel-title">
          {title}
          {note && <small>{note}</small>}
        </h3>
        {aside}
      </header>
      <div className="fv-panel-body">{children}</div>
    </section>
  );
}

function Notes({ children }: { children: ReactNode }) {
  return <div className={`${styles.notes} ${styles.wide}`}>{children}</div>;
}

/** Horizontal bars diverging from zero; used for the SHAP group gap. */
function Diverging({ rows, format }: { rows: { key: string; label: string; value: number }[]; format: (v: number) => string }) {
  const max = Math.max(...rows.map((r) => Math.abs(r.value)), 1e-9);
  return (
    <ul className={styles.div}>
      {rows.map((r) => (
        <li key={r.key} aria-label={`${r.label}: ${format(r.value)}`}>
          <span className={styles.divLabel}>{r.label}</span>
          <span className={styles.divTrack}>
            <span className={styles.divBar} data-neg={r.value < 0 || undefined} style={{ width: `${(Math.abs(r.value) / max) * 50}%` }} />
          </span>
          <span className={`${styles.divValue} num`}>{format(r.value)}</span>
        </li>
      ))}
    </ul>
  );
}

interface ViewProps {
  v: ModelView;
  o: ModelView;
  compare: boolean;
  ghostLabel?: string;
  primaryLabel: string;
}

/* ------------------------------------------------------------------ views */

function GapView({ v, o, model, data, compare, ghostLabel, primaryLabel }: ViewProps & { model: ModelId; data: FairnessData }) {
  const shap = data.shapGap[model];
  const predGap = shap.reduce((s, r) => s + r.gap, 0);
  return (
    <div className={styles.grid}>
      <Panel title="Residuals by group" note="mean residual and gaps, log scale, 95% CI">
        <IntervalPlot
          rows={withGhost(v.residuals, o.residuals, compare)}
          axisLabel="Residual = actual − predicted. Right of zero: under-predicted"
          sides={["over-predicted", "under-predicted"]}
          tableCaption="Mean residuals and gaps"
          ghostLabel={ghostLabel}
          primaryLabel={primaryLabel}
        />
      </Panel>
      <Panel title="Same accuracy, opposite direction" note="held-out, by group">
        <div className={styles.pair}>
          <p className="fv-label">Mean absolute error</p>
          <Bars
            rows={[
              { key: "u", label: "UEFA", value: v.accuracy.maeUefa, tone: "uefa" },
              { key: "n", label: "Non-UEFA", value: v.accuracy.maeNon, tone: "non-uefa" },
            ]}
            max={Math.max(v.accuracy.maeUefa, v.accuracy.maeNon) * 1.15}
            format={(x) => decimal(x, 3)}
          />
          <p className="fv-label">Mean signed residual</p>
          <Diverging
            rows={[
              { key: "u", label: "UEFA", value: v.residuals[0]!.interval.estimate },
              { key: "n", label: "Non-UEFA", value: v.residuals[1]!.interval.estimate },
            ]}
            format={(x) => signed(x)}
          />
        </div>
        <p className={styles.caption}>
          Both groups are missed by about the same amount (MAE gap {signed(v.accuracy.maeGap.estimate)}, interval includes zero), but in opposite
          directions: UEFA players slightly over-predicted, non-UEFA players under-predicted.
        </p>
      </Panel>
      <Panel
        wide
        title="What moves the groups' predictions apart"
        note={`mean SHAP, non-UEFA minus UEFA, served ${MODEL_LABELS[model].name}`}
        aside={<span className="fv-chip">sums to {signed(predGap)} log units</span>}
      >
        <Diverging rows={shap.slice(0, 10).map((r) => ({ key: r.feature, label: featureLabel(r.feature), value: r.gap }))} format={(x) => signed(x)} />
        <p className={styles.caption}>
          The served model predicts non-UEFA players {signed(predGap)} log units higher on average; these are the inputs that account for that
          difference. They describe the model&apos;s arithmetic, not causes, and they are about predictions, not about the gap in errors above.
        </p>
      </Panel>
      <Notes>
        <p>
          Under {MODEL_LABELS[model].name}, non-UEFA players&apos; market values sit about {logGapAsPercent(v.gap.estimate)} above the model&apos;s
          estimate relative to UEFA players in the same leagues (about <span className="num">{formatEur(v.gapEur.estimate)}</span> per player, a
          figure dominated by expensive players). Removing league and club moves the gap from {signed(data.A.gap.estimate)} to{" "}
          {signed(data.B.gap.estimate)}: context explains part of it; a clear gap remains.
        </p>
      </Notes>
    </div>
  );
}

function Bars({ rows, max, format }: { rows: { key: string; label: string; value: number; tone: "uefa" | "non-uefa" }[]; max: number; format: (v: number) => string }) {
  return (
    <ul className={styles.bars}>
      {rows.map((r) => (
        <li key={r.key}>
          <span className={styles.divLabel}>{r.label}</span>
          <span className={styles.barTrack}>
            <span className={styles.barFill} data-tone={r.tone} style={{ width: `${(r.value / max) * 100}%` }} />
          </span>
          <span className={`${styles.divValue} num`}>{format(r.value)}</span>
        </li>
      ))}
    </ul>
  );
}

function ValueView({ v }: { v: ModelView }) {
  return (
    <div className={styles.grid}>
      <Panel wide title="Residual by decile of predicted value" note="1 = lowest predicted value, log scale">
        <Dumbbell rows={v.deciles} axisLabel="Mean residual by decile of predicted value (1 = lowest), log scale" tableCaption="Mean residual by predicted-value decile" />
      </Panel>
      <Panel title="Gap holding value level fixed" note="pooled within deciles">
        <IntervalPlot
          rows={[
            { key: "primary", label: "Within leagues", sublabel: "primary measure", interval: v.gap, emphasis: true },
            { key: "dec", label: "Within deciles", sublabel: "same predicted value", interval: v.calibration.byDecile },
            { key: "ld", label: "Within league and decile", interval: v.calibration.byLeagueDecile },
          ]}
          domain={[0, 0.3]}
          axisLabel="Signed gap, log scale, 95% CI"
          tableCaption="Gap within deciles"
        />
      </Panel>
      <Notes>
        <p>
          Estimates are pulled towards the middle, and non-UEFA players here are worth more on average, so the comparison is repeated inside each
          tenth of the model&apos;s own predictions. Binning on the prediction, not the actual value, avoids conditioning on the outcome. Non-UEFA
          players are under-predicted relative to UEFA players in every decile.
        </p>
      </Notes>
    </div>
  );
}

/** "a, b and c" */
function listOf(items: string[]): string {
  return items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function LeaguesView({ v, o, compare, ghostLabel, primaryLabel }: ViewProps) {
  const [sort, setSort] = useState<LeagueSort>("gap");
  const rows = [...withGhost(v.leagues, o.leagues, compare)].sort((a, b) =>
    sort === "gap" ? b.interval.estimate - a.interval.estimate : sort === "n" ? (b.n ?? 0) - (a.n ?? 0) : a.label.localeCompare(b.label),
  );
  const reported = v.leagues.filter((l) => !l.hollow);
  const largest = [...reported].sort((a, b) => b.interval.estimate - a.interval.estimate).filter((l) => l.interval.low > 0).slice(0, 5);
  const nearZero = reported.filter((l) => l.interval.low <= 0 && l.interval.high >= 0);
  const maxN = Math.max(...v.leagues.map((l) => l.n ?? 0));
  return (
    <div className={styles.grid} data-layout="leagues">
      <Panel
        title="Signed gap by league"
        note="within-league, log scale, 95% CI"
        aside={
          <span className={styles.sort}>
          <Segmented
            legend="Sort leagues by"
            hideLegend
            name="league-sort"
            value={sort}
            onChange={setSort}
            options={[
              { value: "gap", label: "Gap" },
              { value: "n", label: "Sample" },
              { value: "name", label: "A–Z" },
            ]}
          />
          </span>
        }
      >
        <IntervalPlot rows={rows} sides={SIDES} axisLabel="Within-league signed gap, log scale, 95% CI" tableCaption="Signed gap by league" ghostLabel={ghostLabel} primaryLabel={primaryLabel} />
      </Panel>
      <Panel title="Non-UEFA players per league" note="hollow markers: under 100, pooled only">
        <ul className={styles.bars}>
          {rows.map((l) => (
            <li key={l.key} data-hollow={l.hollow || undefined}>
              <span className={styles.divLabel}>{l.label}</span>
              <span className={styles.barTrack}>
                <span className={styles.barFill} data-tone="non-uefa" style={{ width: `${((l.n ?? 0) / maxN) * 100}%` }} />
              </span>
              <span className={`${styles.divValue} num`}>{l.n}</span>
            </li>
          ))}
        </ul>
      </Panel>
      <Notes>
        <p>
          Among leagues with a league-level estimate, under {primaryLabel} the gap is clearly above zero in {listOf(largest.map((l) => leagueCountry(l.key)))}.
          {nearZero.length > 0 && <> In {listOf(nearZero.map((l) => leagueCountry(l.key)))} the interval includes zero.</>} Leagues with fewer than 100
          non-UEFA players are descriptive only. This shows where the gap sits, not why.
        </p>
      </Notes>
    </div>
  );
}

function SubgroupsView({ v, o, compare, ghostLabel, primaryLabel }: ViewProps) {
  return (
    <div className={styles.grid} data-layout="quad">
      {v.strata.map((g, i) => (
        <Panel key={g.title} title={g.title} note={g.note ? `${g.note} · vs UEFA, log scale` : "vs UEFA, log scale"}>
          <IntervalPlot
            rows={withGhost(g.rows, o.strata[i]!.rows, compare)}
            domain={[-0.15, 0.3]}
            axisLabel="Within-league signed gap vs UEFA"
            tableCaption={g.title}
            ghostLabel={i === 0 ? ghostLabel : undefined}
            primaryLabel={primaryLabel}
          />
        </Panel>
      ))}
      <Notes>
        <p>
          The gap is larger for recent arrivals and South American players, smaller for players born in UEFA countries and for those established in
          these leagues: consistent with migrants passing a stricter filter the model cannot see, but not proof of it. Subgroups are descriptive;
          with this many comparisons some intervals exclude zero by chance.
        </p>
      </Notes>
    </div>
  );
}

function TiersView({ v, o, compare, ghostLabel, primaryLabel }: ViewProps) {
  return (
    <div className={styles.grid}>
      <Panel title="Wrong-tier rate" note="separate tier classifier, held-out">
        <Bars
          rows={[
            { key: "u", label: "UEFA", value: v.tiers.errorUefa, tone: "uefa" },
            { key: "n", label: "Non-UEFA", value: v.tiers.errorNon, tone: "non-uefa" },
          ]}
          max={0.4}
          format={(x) => percent(x)}
        />
        <IntervalPlot
          rows={withGhost(v.tiers.summary, o.tiers.summary, compare)}
          format={pp}
          axisLabel="Non-UEFA minus UEFA, percentage points, 95% CI"
          sides={["worse for UEFA", "worse for non-UEFA"]}
          tableCaption="Tier classification error gaps"
          ghostLabel={ghostLabel}
          primaryLabel={primaryLabel}
        />
      </Panel>
      <Panel title="Correctly identified, by tier" note="true-positive-rate gap, pp">
        <IntervalPlot
          rows={withGhost(v.tiers.perTier, o.tiers.perTier, compare)}
          format={pp}
          domain={[-0.2, 0.15]}
          axisLabel="Non-UEFA minus UEFA, percentage points"
          tableCaption="True-positive-rate gap by tier"
        />
      </Panel>
      <Notes>
        <p>
          The extra tier errors for non-UEFA players are mostly placements below their actual tier, consistent with the value under-prediction.
          Per-tier comparisons rest on small groups (94 non-UEFA World Class, 246 Elite): intervals wide enough to fit no gap or a sizeable one, so
          they are not read as evidence either way.
        </p>
      </Notes>
    </div>
  );
}

function RobustnessView({ v, o, model, data, compare, ghostLabel, primaryLabel }: ViewProps & { model: ModelId; data: FairnessData }) {
  return (
    <div className={styles.grid}>
      <Panel title="The gap under every check" note="within-league signed gap, log scale">
        <IntervalPlot rows={withGhost(v.robustness, o.robustness, compare)} domain={[0, 0.25]} axisLabel="Points without whiskers are point estimates" tableCaption="Robustness checks" ghostLabel={ghostLabel} primaryLabel={primaryLabel} />
      </Panel>
      <Panel title="Where the largest errors fall" note="Model A, share of non-UEFA players">
        <Bars
          rows={[
            { key: "all", label: "All players", value: data.worstA.overall, tone: "uefa" },
            { key: "under", label: "Top 5% under-predicted", value: data.worstA.under, tone: "non-uefa" },
            { key: "over", label: "Top 5% over-predicted", value: data.worstA.over, tone: "non-uefa" },
          ]}
          max={0.5}
          format={(x) => percent(x)}
        />
        <dl className={styles.facts}>
          <div>
            <dt>Residual correlation within clubs</dt>
            <dd className="num">{decimal(data.icc.find((i) => i.model === model)!.icc_residual_within_club, 2)}</dd>
          </div>
        </dl>
        <p className={styles.caption}>
          Players at the same club are not independent, which is why the club-clustered interval is shown alongside the player bootstrap.
        </p>
      </Panel>
      <Notes>
        <p>
          The sign of the gap survives resampling whole clubs, comparing players with the same predicted value, a 900-minute threshold, clubs the
          model never saw, and every algorithm tried.
        </p>
      </Notes>
    </div>
  );
}

function LimitsView({ data }: { data: FairnessData }) {
  return (
    <div className={styles.limits}>
      <div>
        <h3 className="fv-panel-title">Supported, within this population</h3>
        <ul>
          <li>
            A nationality-blind model trained on performance, profile and context under-predicts non-UEFA players&apos; Transfermarkt values relative
            to UEFA players in the same leagues and at the same predicted value.
          </li>
          <li>Absolute accuracy is similar for both groups.</li>
          <li>League mix, value level, the minutes threshold and familiarity with the club do not explain it. It is concentrated in a subset of leagues.</li>
          <li>The original hypothesis, that non-UEFA players would get lower value-tier outcomes than comparable UEFA players, is not supported.</li>
        </ul>
      </div>
      <div>
        <h3 className="fv-panel-title">Not established</h3>
        <ul data-kind="no">
          <li>That anyone discriminates, in either direction.</li>
          <li>That nationality causes higher or lower valuations.</li>
          <li>Anything about players outside these 14 leagues or below 450 minutes.</li>
          <li>That the model is &ldquo;fair&rdquo; or &ldquo;compliant&rdquo; by any threshold.</li>
        </ul>
      </div>
      <div>
        <h3 className="fv-panel-title">Explanations it cannot separate</h3>
        <ol>
          <li>Selection: non-UEFA players pass a stricter filter to reach these leagues, on qualities the data does not record.</li>
          <li>Excluded variables: caps were left out as a nationality proxy; contract and agent data are unavailable.</li>
          <li>League market structure: the gap sits mostly in RU1, TR1, GR1, UKR1 and BE1.</li>
          <li>Valuation practice: how Transfermarkt&apos;s community values imported players. The target itself may be biased.</li>
        </ol>
      </div>
      <p className={styles.scope}>
        Population: {integer(data.population.total)} players ({integer(data.population.non_uefa)} non-UEFA) at clubs in 14 European first divisions,
        valued June 2025 to June 2026, with at least 450 club minutes in two years. Full write-up: <code>docs/reports/FAIRNESS_AUDIT.md</code>.
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
