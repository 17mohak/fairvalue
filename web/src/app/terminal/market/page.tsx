import { Diverging, HBars, PairDots, Scatter } from "@/components/terminal/charts/TmCharts";
import { WorkspaceHead } from "@/components/terminal/WorkspaceHead";
import { TIER_NAMES } from "@/lib/football";
import { decimal, formatEur, integer, signed } from "@/lib/format";
import { playerSet } from "@/lib/players.server";
import { heldOutLogMae, research } from "@/lib/research";
import styles from "../landscape.module.css";

export const metadata = { title: "Market Landscape" };
// The player-level panel reads the export from disk at request time, like every player view.
export const dynamic = "force-dynamic";

const POSITION_ORDER = ["Goalkeeper", "Defender", "Midfield", "Attack"];

export default function MarketPage() {
  const m = research.market;
  const total = research.population.funnel.at(-1)!.total;
  const tiers = TIER_NAMES.map((t) => m.tiers.find((r) => r.key === t)!);
  const positions = POSITION_ORDER.map((p) => m.positions.find((r) => r.key === p)!);
  const bands = m.minutes_bands;
  const set = playerSet();
  const showcase = set.source === "showcase";
  const pts = set.players;
  const estimated = pts.filter((p) => (p.estimates.heldout.A ?? p.estimates.served.A) !== null);
  const emerging = tiers[0]!;
  const elite = tiers[2]!;

  return (
    <div className={styles.page}>
      <WorkspaceHead id="market" note="How observed market value is distributed across the modelling population, and where the model's held-out errors grow or lean." />
      <dl className={styles.context}>
        <div>
          <dt>Population</dt>
          <dd>{integer(total)} players · 14 European first divisions</dd>
        </div>
        <div>
          <dt>Selection</dt>
          <dd>≥ 450 club minutes in two years · 2025–26 valuations</dd>
        </div>
        <div>
          <dt>Errors</dt>
          <dd>held-out, 5-fold cross-validation · log scale</dd>
        </div>
        <div>
          <dt>Not</dt>
          <dd>the global market: a selected population</dd>
        </div>
      </dl>

      <div className={styles.grid}>
        <section className={`tm-panel ${styles.s5}`} aria-labelledby="mk-tiers">
          <header className="tm-panel-head">
            <h2 id="mk-tiers" className="tm-title">Observed value, by tier</h2>
            <span className="tm-sub">players · share of {integer(total)}</span>
          </header>
          <div className={styles.body}>
            <HBars
              rows={tiers.map((t, i) => ({
                key: t.key,
                label: (
                  <>
                    {t.key}
                    <small>{["under €2M", "€2M to €10M", "€10M to €30M", "€30M and above"][i]}</small>
                  </>
                ),
                value: t.n,
                display: integer(t.n),
                sub: `${((t.n / total) * 100).toFixed(1)}%`,
                step: i / 3,
              }))}
            />
            <p className="tm-note">
              Nearly half the population is valued under €2M; {integer(tiers[3]!.n)} players ({((tiers[3]!.n / total) * 100).toFixed(1)}%) reach €30M.
              Tier boundaries are the project&apos;s fixed €2M / €10M / €30M cut-offs.
            </p>
          </div>
        </section>

        <section className={`tm-panel ${styles.s7}`} aria-labelledby="mk-drift">
          <header className="tm-panel-head">
            <h2 id="mk-drift" className="tm-title">Where the model leans</h2>
            <span className="tm-sub">mean residual by observed tier · log units</span>
          </header>
          <div className={styles.body}>
            <Diverging
              rows={tiers.map((t) => ({ key: t.key, label: t.key, value: t.A.mean_residual!, ghost: t.B.mean_residual!, n: t.n }))}
              format={(v) => signed(v, 3)}
              ghostLabel="B"
              posLabel="observed above estimate"
              negLabel="observed below estimate"
            />
            <p className={styles.reading}>
              Grouped by observed value, residuals pull toward the middle: Emerging players&apos; values sit below Model A&apos;s estimates on average (
              <b>{signed(emerging.A.mean_residual!, 3)}</b>), Elite players&apos; above them (<b>{signed(elite.A.mean_residual!, 3)}</b>). Any regression
              shows this when results are grouped by the target itself; it describes the model, not mispriced players. Model B (dashed) leans further.
            </p>
          </div>
        </section>

        <section className={`tm-panel ${styles.s6}`} aria-labelledby="mk-pos">
          <header className="tm-panel-head">
            <h2 id="mk-pos" className="tm-title">Positions</h2>
            <span className="tm-sub">composition and held-out error</span>
          </header>
          <div className={`${styles.body} ${styles.split}`}>
            <div>
              <p className={styles.splitTitle}>Players</p>
              <HBars rows={positions.map((p) => ({ key: p.key, label: p.key, value: p.n, display: integer(p.n), sub: `${((p.n / total) * 100).toFixed(0)}%` }))} />
            </div>
            <div>
              <p className={styles.splitTitle}>Mean absolute error, log</p>
              <PairDots rows={positions.map((p) => ({ key: p.key, label: p.key, a: p.A.mae!, b: p.B.mae! }))} format={(v) => decimal(v, 3)} domain={[0, 1]} />
            </div>
          </div>
        </section>

        <section className={`tm-panel ${styles.s6}`} aria-labelledby="mk-min">
          <header className="tm-panel-head">
            <h2 id="mk-min" className="tm-title">Minutes and accuracy</h2>
            <span className="tm-sub">held-out MAE by club minutes in two years · log</span>
          </header>
          <div className={styles.body}>
            <PairDots rows={bands.map((b) => ({ key: b.key, label: `${b.key} min`, a: b.A.mae!, b: b.B.mae!, n: b.n }))} format={(v) => decimal(v, 3)} domain={[0, 1]} />
            <p className="tm-note">
              Less football, wider misses: Model A&apos;s typical error falls from <b>×{Math.exp(bands[0]!.A.mae!).toFixed(2)}</b> for players with under 900
              minutes to <b>×{Math.exp(bands.at(-1)!.A.mae!).toFixed(2)}</b> for regulars. Overall held-out MAE: {decimal(heldOutLogMae("A"), 3)} (A),{" "}
              {decimal(heldOutLogMae("B"), 3)} (B).
            </p>
          </div>
        </section>

        <section className={`tm-panel ${styles.s12}`} aria-labelledby="mk-players">
          <header className="tm-panel-head">
            <h2 id="mk-players" className="tm-title">Player-level views</h2>
            <span className="tm-sub">{showcase ? `showcase export: ${pts.length} players, not a distribution` : `${integer(pts.length)} players in the local export`}</span>
          </header>
          {showcase && (
            <p className={styles.warn} style={{ margin: "0.85rem 0.85rem 0" }}>
              <b>Showcase only.</b> These {pts.length} points are the research showcase (one player per audit group and predicted tier), chosen to illustrate,
              not to sample. The population shape appears with the full local export.
            </p>
          )}
          <div className={`${styles.body} ${styles.split}`}>
            <div>
              <p className={styles.splitTitle}>Observed value against age</p>
              <Scatter
                points={pts.map((p) => ({ key: String(p.id), x: p.age, y: p.market_value_eur, label: `${p.name}: ${Math.floor(p.age)} yrs, ${formatEur(p.market_value_eur)}` }))}
                xLabel="Age, years"
                yLabel="Observed value"
                labelAll={showcase}
              />
            </div>
            <div>
              <p className={styles.splitTitle}>Model A estimate against observed value</p>
              <Scatter
                points={estimated.map((p) => {
                  const a = p.estimates.heldout.A ?? p.estimates.served.A!;
                  return { key: String(p.id), x: p.market_value_eur, y: a, label: `${p.name}: observed ${formatEur(p.market_value_eur)}, Model A ${formatEur(a)}` };
                })}
                xLabel="Observed value"
                yLabel={showcase ? "Model A, served (in-sample)" : "Model A, held-out"}
                xLog
                diagonal
                labelAll={showcase}
              />
              <p className="tm-note">Dashed diagonal: estimate equals observed value. Above it the model is higher than the market.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
