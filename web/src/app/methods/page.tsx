import type { Metadata } from "next";
import { room } from "@/lib/rooms";
import Link from "next/link";
import { RoomTransition } from "@/components/site/RoomTransition";
import { BarList } from "@/components/charts/BarList";
import { featureLabel } from "@/lib/football";
import { decimal, formatEur, integer, percent, signed } from "@/lib/format";
import { research } from "@/lib/research";
import { MethodsToc } from "./MethodsToc";
import styles from "./methods.module.css";

export const metadata: Metadata = {
  title: "Methods",
  description: "Data provenance, population, features, validation, model selection, evaluation, explainability, monitoring and limitations behind FairValue.",
};

const TOC = [
  { id: "data", label: "Data and provenance" },
  { id: "population", label: "Population" },
  { id: "features", label: "Features" },
  { id: "validation", label: "Training and validation" },
  { id: "selection", label: "Model selection" },
  { id: "evaluation", label: "Evaluation" },
  { id: "explainability", label: "Explainability" },
  { id: "fairness", label: "Fairness definitions" },
  { id: "monitoring", label: "Monitoring" },
  { id: "limitations", label: "Limitations" },
  { id: "reproduce", label: "Reproduce" },
];

const FEATURE_ROWS: { feature: string; definition: string; b: boolean }[] = [
  { feature: "age", definition: "Years at the valuation date; the linear baseline also gets age²", b: true },
  { feature: "height_in_cm", definition: "As recorded; missing values imputed", b: true },
  { feature: "position", definition: "Position, role (sub-position) and preferred foot, one-hot encoded", b: true },
  { feature: "appearances", definition: "Club matches in the 730 days up to the valuation date", b: true },
  { feature: "minutes", definition: "Club minutes in the same window, and minutes per appearance", b: true },
  { feature: "start_share", definition: "Share of appearances started rather than entered as a substitute", b: true },
  { feature: "goals_p90", definition: "Goals, assists, their sum, yellow and red cards per 90 minutes", b: true },
  { feature: "intl_club_minutes_share", definition: "Share of minutes in European club competitions", b: true },
  { feature: "minutes_last_365", definition: "Club minutes in the last 365 days: recent form or injury signal", b: true },
  { feature: "days_since_last_match", definition: "Days from the last club match to the valuation date", b: true },
  { feature: "valuation_club_minutes_share", definition: "Share of window minutes played for the club at valuation", b: true },
  { feature: "club_ppg", definition: "Valuation club's league points per game over 365 days", b: false },
  { feature: "valuation_league_id", definition: "League of the club at valuation time", b: false },
];

const FUNNEL_LABELS = [
  "Every player in the dataset",
  "With a valuation in the last 12 months",
  "Valued while at a club in a covered league",
  "With at least 450 club minutes in two years",
];

const ALG: Record<string, string> = {
  ridge: "Ridge (baseline)",
  random_forest: "Random forest",
  hgb: "Gradient boosting",
  hgb_tuned: "Gradient boosting, Optuna",
};

// Limitation figures are read from research.json where it carries them; the wording follows
// docs/KNOWN_LIMITATIONS.md.
function limitations(): [string, string][] {
  const groups = research.population.value_by_group;
  const median = (g: string) => formatEur(groups.find((x) => x.group === g)!.median, 1);
  const auc = research.population.proxy_auc.find((a) => a.feature_set === "Model A features")!.auc;
  const cv = (scheme: string) =>
    research.models.grouped_cv.find((g) => g.model === "A" && g.algorithm === "hgb (median tuned params)" && g.cv_scheme === scheme)!.log_rmse_mean_fold;
  const unseen = (cv("grouped by club") / cv("standard (players)") - 1) * 100;
  const tierN = (t: string) => research.tiers.power.find((x) => x.model === "A" && x.rate === "TPR" && x.tier === t)!.n_non_uefa;
  return [
    ["Coverage", "Match data exists only for 14 European leagues; 79% of currently valued non-UEFA players play in leagues without it and are excluded."],
    ["Survivorship", `Non-UEFA players who reach these leagues are positively selected (median value ${median("non-UEFA")} vs ${median("UEFA")} for UEFA).`],
    ["The target", "Transfermarkt values are crowd estimates. The model can reproduce any bias in them; the audit measures model against target only."],
    ["Proxies remain", `Allowed features still predict UEFA membership (AUC ${decimal(auc, 2)}). Nationality-blind is not group-blind.`],
    ["Context", "League and club strength are reputation proxies. Model B exists to measure their effect."],
    ["Thin defensive data", "No tackles or passes: defenders and goalkeepers are described mostly by minutes and context."],
    ["Frozen snapshot", "Upstream updates paused in 2026; drift is simulated from history, not observed live."],
    ["Unseen clubs", `Error rises ${unseen.toFixed(1)}% for clubs absent from training; headline metrics describe known clubs.`],
    ["Small tiers", `Only ${tierN("World Class")} World Class and ${tierN("Elite")} Elite non-UEFA players; per-tier fairness metrics are imprecise.`],
    ["Intervals", "Bootstrap intervals ignore refit variance and are somewhat too narrow."],
  ];
}

export default function MethodsPage() {
  const funnel = research.population.funnel;
  const maxTotal = Math.max(...funnel.map((f) => f.total));
  const reg = research.models.regression;
  const cls = research.models.classification;
  const primary = research.models.primary;
  const psi = research.monitoring.psi;
  const decay = research.monitoring.decay;
  const policy = research.monitoring.policy;
  const dice = research.dice.run;

  const gap = research.headline.A.signed_gap_league_stratified;
  const pop = funnel[funnel.length - 1]!;

  return (
    <RoomTransition>
    <div className="paper">
    <article className={styles.layout}>
      <header className={styles.masthead}>
        <p className={styles.eyebrow}>
          <b className="num">{room("methods").index}</b> Methods · technical account
        </p>
        <h1 className={styles.title}>How FairValue works</h1>
        <p className={styles.lede}>
          How the data was chosen, how the models were trained and judged, and where the results stop applying. Figures come from the generated
          research outputs; method details follow the repository&apos;s research design and reports.
        </p>
        <dl className={styles.meta}>
          <div>
            <dt>Population</dt>
            <dd className="num">{integer(pop.total)} players · 14 leagues</dd>
          </div>
          <div>
            <dt>Design locked</dt>
            <dd>4 November 2026 (D-011)</dd>
          </div>
          <div>
            <dt>Primary model</dt>
            <dd>Gradient boosting, tuned</dd>
          </div>
          <div>
            <dt>Dataset fingerprint</dt>
            <dd className="num">{research.models.dataset_sha256_16}</dd>
          </div>
        </dl>
      </header>

      <section className={styles.abstract} aria-labelledby="abstract-title">
        <h2 id="abstract-title" className={styles.abstractTitle}>
          Abstract
        </h2>
        <p>
          FairValue estimates the Transfermarkt market value of {integer(pop.total)} players at clubs in 14 European first divisions from two
          seasons of club match data. Two tuned gradient-boosting models are compared: Model A sees league and club context, Model B does not.
          Neither sees nationality. Every metric uses out-of-fold predictions. Comparing signed residuals within leagues, non-UEFA players are
          under-predicted relative to UEFA players by <span className="num">{signed(gap.estimate)}</span> log units under Model A (95% CI{" "}
          <span className="num">
            {signed(gap.low)} to {signed(gap.high)}
          </span>
          ). The finding is observational, specific to this selected population, and not evidence of discrimination.
        </p>
      </section>

      <MethodsToc items={TOC} />

      <div className={styles.body} id="methods-body">
        <section id="data" className={styles.section}>
          <h2 className={styles.h2}>
            <span className={`${styles.secNo} num`}>01</span>
            Data and provenance
          </h2>
          <aside className={styles.margin}>Source: the open <em>transfermarkt-datasets</em> project. Raw files are checksummed against <code>data/raw/MANIFEST.json</code>.</aside>
          <div className="prose">
            <p>
              Valuations and match records come from Transfermarkt, compiled by the open <em>transfermarkt-datasets</em> project and downloaded
              from its public bucket, with each file checksummed. The snapshot is frozen: upstream updates paused in 2026, with valuations ending
              on 12 June 2026.
            </p>
            <p>
              Citizenship is used only to label players for the audit. It is stored in a separate table that the training code never reads,
              and a test fails if any demographic column reaches a feature matrix.
            </p>
          </div>
        </section>

        <section id="population" className={styles.section}>
          <h2 className={styles.h2}>
            <span className={`${styles.secNo} num`}>02</span>
            Population
          </h2>
          <aside className={styles.margin}>Results describe this population only. 79% of currently valued non-UEFA players play in leagues without match data and are outside it.</aside>
          <p className={styles.note}>From every player in the dataset to the modelling population. Each bar splits UEFA and non-UEFA players.</p>
          <ol className={styles.funnel}>
            {funnel.slice(0, 4).map((f, i) => (
              <li key={f.stage} className={styles.funnelRow}>
                <span className={styles.funnelLabel}>{FUNNEL_LABELS[i] ?? f.stage}</span>
                <span className={styles.funnelBar} style={{ width: `${(f.total / maxTotal) * 100}%` }}>
                  <span className={styles.funnelUefa} style={{ flexGrow: f.uefa }} title={`UEFA ${integer(f.uefa)}`} />
                  <span className={styles.funnelNon} style={{ flexGrow: f.non_uefa }} title={`non-UEFA ${integer(f.non_uefa)}`} />
                </span>
                <span className={`${styles.funnelValue} num`}>
                  {integer(f.total)}
                  <span>{f.non_uefa_share_pct}% non-UEFA</span>
                </span>
              </li>
            ))}
          </ol>
          <p className={styles.legend}>
            <span>
              <i className={styles.keyUefa} /> UEFA
            </span>
            <span>
              <i className={styles.keyNon} /> Non-UEFA
            </span>
          </p>
          <div className="prose">
            <p>
              The final population is {integer(funnel[funnel.length - 1]!.total)} players valued between June 2025 and June 2026 while at a club in
              one of 14 European first divisions, with at least 450 club minutes in the previous two years. It is a selected population: results
              describe these players, not the global transfer market. A 900-minute threshold is checked as a sensitivity analysis.
            </p>
          </div>
        </section>

        <section id="features" className={styles.section}>
          <h2 className={styles.h2}>
            <span className={`${styles.secNo} num`}>03</span>
            Features
          </h2>
          <aside className={styles.margin}>Guard: <code>assert_no_demographic_columns</code> runs before every fit.</aside>
          <p className={styles.note}>All computed as of each player&apos;s own valuation date, from matches up to that date only.</p>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Input</th>
                  <th scope="col">Definition</th>
                  <th scope="col">Model A</th>
                  <th scope="col">Model B</th>
                </tr>
              </thead>
              <tbody>
                {FEATURE_ROWS.map((r) => (
                  <tr key={r.feature}>
                    <th scope="row">{featureLabel(r.feature)}</th>
                    <td>{r.definition}</td>
                    <td>Yes</td>
                    <td>{r.b ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={styles.note}>
            Never features: citizenship, confederation, audit group, birthplace, national-team identifiers, caps and international goals, the
            player&apos;s highest past value, and earlier valuations.
          </p>
        </section>

        <section id="validation" className={styles.section}>
          <h2 className={styles.h2}>
            <span className={`${styles.secNo} num`}>04</span>
            Training and validation
          </h2>
          <aside className={styles.margin}>Residual = actual − predicted. Positive means the model under-predicted.</aside>
          <div className="prose">
            <p>
              The target is the natural log of market value. Models are compared with five-fold cross-validation, stratified on value tier.
              Hyperparameters are tuned with Optuna <strong>inside</strong> each outer fold (inner three-fold CV, 25 trials), so no score is computed
              on data used for tuning.
            </p>
            <p>
              Every reported metric, and every number in the fairness audit, uses out-of-fold predictions: each player is scored by a model that
              never saw them. Audit group is never used for splitting, training or tuning. The served models are refits on the full population,
              with versions recorded in a registry.
            </p>
          </div>
        </section>

        <section id="selection" className={styles.section}>
          <h2 className={styles.h2}>
            <span className={`${styles.secNo} num`}>05</span>
            Model selection
          </h2>
          <p className={styles.note}>Rule fixed in advance: {primary.rule}.</p>
          <BarList
            items={primary.candidates.map((c) => ({ key: c.algorithm, label: ALG[c.algorithm] ?? c.algorithm, value: c.cv_log_rmse_mean, detail: `SD ${c.cv_log_rmse_sd}` }))}
            digits={3}
            highlight={primary.algorithm}
            caption="Mean fold log RMSE under Model A (lower is better). Highlighted: the selected primary model."
          />
        </section>

        <section id="evaluation" className={styles.section}>
          <h2 className={styles.h2}>
            <span className={`${styles.secNo} num`}>06</span>
            Evaluation
          </h2>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <caption className={styles.caption}>Regression on held-out players</caption>
              <thead>
                <tr>
                  <th scope="col">Model</th>
                  <th scope="col">Algorithm</th>
                  <th scope="col">Log RMSE</th>
                  <th scope="col">Log MAE</th>
                  <th scope="col">Log R²</th>
                  <th scope="col">Median abs. error</th>
                </tr>
              </thead>
              <tbody>
                {reg.map((r) => (
                  <tr key={`${r.model}-${r.algorithm}`} data-primary={r.algorithm === "hgb_tuned" || undefined}>
                    <th scope="row">{r.model}</th>
                    <td>{ALG[r.algorithm] ?? r.algorithm}</td>
                    <td className="num">{decimal(r.log_rmse, 3)}</td>
                    <td className="num">{decimal(r.log_mae, 3)}</td>
                    <td className="num">{decimal(r.log_r2, 3)}</td>
                    <td className="num">{formatEur(r.eur_median_abs_error, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="prose">
            <p>
              A log MAE of {decimal(reg.find((r) => r.model === "Model A" && r.algorithm === "hgb_tuned")!.log_mae, 3)} means the typical estimate is
              off by a factor of about {Math.exp(reg.find((r) => r.model === "Model A" && r.algorithm === "hgb_tuned")!.log_mae).toFixed(1)}. Errors
              shrink as minutes grow, are largest for goalkeepers and in Scotland, and pull estimates towards the middle: cheap players are
              over-predicted and expensive ones under-predicted.
            </p>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <caption className={styles.caption}>Tier classification (€2M / €10M / €30M)</caption>
              <thead>
                <tr>
                  <th scope="col">Model</th>
                  <th scope="col">Accuracy</th>
                  <th scope="col">Balanced accuracy</th>
                  <th scope="col">Macro F1</th>
                  <th scope="col">Within one tier</th>
                  <th scope="col">ROC AUC</th>
                </tr>
              </thead>
              <tbody>
                {cls.map((c) => (
                  <tr key={c.model}>
                    <th scope="row">{c.model}</th>
                    <td className="num">{percent(c.accuracy)}</td>
                    <td className="num">{percent(c.balanced_accuracy)}</td>
                    <td className="num">{decimal(c.macro_f1, 3)}</td>
                    <td className="num">{percent(c.adjacent_accuracy)}</td>
                    <td className="num">{decimal(c.roc_auc_ovr_macro, 3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section id="explainability" className={styles.section}>
          <h2 className={styles.h2}>
            <span className={`${styles.secNo} num`}>07</span>
            Explainability
          </h2>
          <div className="prose">
            <p>
              SHAP values are computed with TreeExplainer on the served gradient-boosting regressors, on the log scale, with one-hot columns summed
              back to their input. They add up exactly to each prediction. The studio computes them live for any profile; the bars below are
              averages over the training population and say nothing about a single player.
            </p>
          </div>
          <div className={styles.shapGrid}>
            {(["A", "B"] as const).map((m) => (
              <div key={m}>
                <h3 className={styles.h3}>Model {m}</h3>
                <BarList
                  items={research.shap_global[m].slice(0, 8).map((s) => ({ key: s.feature, label: featureLabel(s.feature), value: s.mean_abs }))}
                  digits={2}
                  caption="Mean |SHAP| on ln(value), all training players."
                />
              </div>
            ))}
          </div>
          <div className="prose">
            <p>
              Counterfactuals (DiCE) asked how much match output would need to change to move a player up one tier, holding age, position,
              league and club fixed. Across {dice.n_queries} queries, {dice.n_found} found a valid counterfactual. No consistent difference
              between UEFA and non-UEFA players emerged. These are counterfactuals on match statistics, never on nationality, which the model
              cannot see.
            </p>
          </div>
        </section>

        <section id="fairness" className={styles.section}>
          <h2 className={styles.h2}>
            <span className={`${styles.secNo} num`}>08</span>
            Fairness definitions
          </h2>
          <aside className={styles.margin}>No metric is used as a pass/fail test, and no compliance is claimed.</aside>
          <div className="prose">
            <p>
              The primary measure is the signed residual gap: mean (actual − predicted) log value for non-UEFA players minus that for UEFA players,
              computed within leagues. Accuracy gaps (MAE, RMSE), tier error-rate gaps (ER1a), per-tier true-positive-rate gaps (equalised-odds
              components, ER1b) and selection rates are reported alongside. All use held-out predictions with 2,000-replicate bootstrap intervals.
            </p>
            <p>
              None of these is treated as a pass/fail test. The full results are in the <Link href="/fairness">fairness audit</Link>.
            </p>
          </div>
        </section>

        <section id="monitoring" className={styles.section}>
          <h2 className={styles.h2}>
            <span className={`${styles.secNo} num`}>09</span>
            Monitoring
          </h2>
          <aside className={styles.margin}>The source is frozen, so drift is simulated from history rather than observed live.</aside>
          <div className="prose">
            <p>
              With no live traffic and a frozen source, drift is simulated: the previous year&apos;s snapshot ({policy.reference_window}) is compared
              with the training year ({policy.current_window}). The retraining policy returned <strong>{policy.decision}</strong>.
            </p>
          </div>
          <div className={styles.twoTables}>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <caption className={styles.caption}>Population stability (PSI)</caption>
                <thead>
                  <tr>
                    <th scope="col">Feature</th>
                    <th scope="col">PSI</th>
                    <th scope="col">Median, before → after</th>
                  </tr>
                </thead>
                <tbody>
                  {psi.map((p) => (
                    <tr key={p.feature}>
                      <th scope="row">{p.feature === "log_value" ? "ln(value)" : featureLabel(p.feature)}</th>
                      <td className="num">{decimal(p.psi, 3)}</td>
                      <td className="num">
                        {decimal(p.reference_median, 2)} → {decimal(p.current_median, 2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <caption className={styles.caption}>A last-year model scored on this year</caption>
                <thead>
                  <tr>
                    <th scope="col">Model</th>
                    <th scope="col">CV log RMSE</th>
                    <th scope="col">Next year</th>
                    <th scope="col">Change</th>
                  </tr>
                </thead>
                <tbody>
                  {decay.map((d) => (
                    <tr key={d.model}>
                      <th scope="row">Model {d.model}</th>
                      <td className="num">{decimal(d.reference_cv_log_rmse, 3)}</td>
                      <td className="num">{decimal(d.next_year_log_rmse, 3)}</td>
                      <td className="num">+{d.degradation_pct.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section id="limitations" className={styles.section}>
          <h2 className={styles.h2}>
            <span className={`${styles.secNo} num`}>10</span>
            Limitations
          </h2>
          <dl className={styles.limits}>
            {limitations().map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          <p className={styles.note}>
            Not suitable for scouting, recruitment, contracts or any decision about a person. The full list is in{" "}
            <code>docs/KNOWN_LIMITATIONS.md</code>, with the model card and data card alongside it.
          </p>
        </section>

        <section id="reproduce" className={styles.section}>
          <h2 className={styles.h2}>
            <span className={`${styles.secNo} num`}>11</span>
            Reproduce
          </h2>
          <p className={styles.note}>From the repository root, with Python 3.12 and Node 20 or later.</p>
          <pre className={styles.code}>
            <code>{`python -m src.data.acquire          # download raw tables, verify checksums
python -m src.data.build_dataset    # processed tables
python -m src.models.train          # 5-fold CV, MLflow, held-out predictions
python -m src.fairness.audit        # fairness audit on held-out predictions
python -m src.models.final          # refit the served models
python -m src.product.export        # research JSON for this site
uvicorn src.api.app:app --port 8000 # the API
cd web && npm ci && npm run dev     # this site`}</code>
          </pre>
        </section>
      </div>
    </article>
    </div>
    </RoomTransition>
  );
}
