import { StoryCover } from "@/components/stories/StoryCover";
import { StoryEnd } from "@/components/stories/StoryEnd";
import styles from "@/components/stories/story.module.css";
import { leagueCountry, leagueName, TIER_BOUNDARIES_EUR } from "@/lib/football";
import { decimal, formatEur, integer, signed } from "@/lib/format";
import { factor } from "@/lib/journey";
import { research } from "@/lib/research";
import { storyBySlug } from "@/lib/stories";
import m from "./market.module.css";

const story = storyBySlug("fourteen-leagues")!;
export const metadata = { title: story.title, description: story.dek };

const short = (id: string) => leagueName(id).split(",")[0]!;

export default function MarketStory() {
  const L = research.market.leagues;
  const byMedian = [...L].sort((a, b) => b.median_value_eur! - a.median_value_eur!);
  const [top, second] = byMedian;
  const below = L.filter((l) => l.median_value_eur! < TIER_BOUNDARIES_EUR[0]).length;
  const bySize = [...L].sort((a, b) => b.total - a.total);
  const gapAB = [...L].sort((a, b) => b.B.mae! - b.A.mae! - (a.B.mae! - a.A.mae!));
  const widest = gapAB[0]!;
  const pos = L.filter((l) => l.A.mean_residual! > 0);
  const byRes = [...L].sort((a, b) => b.A.mean_residual! - a.A.mean_residual!);
  const typical = research.models.registry.regressor_A.cv_heldout_metrics.log_mae;
  const leagueShap = research.shap_global.A.find((g) => g.feature === "valuation_league_id")?.mean_abs;

  const [lo, hi] = [Math.log(250_000), Math.log(25_000_000)];
  const vx = (v: number) => ((Math.log(v) - lo) / (hi - lo)) * 100;
  const maxN = bySize[0]!.total;
  const maxMae = Math.max(...L.map((l) => l.B.mae!)) * 1.05;
  const maxRes = Math.max(...L.map((l) => Math.abs(l.A.mean_residual!))) * 1.15;

  return (
    <article>
      <StoryCover
        story={story}
        visual={
          <div style={{ display: "grid", gap: "0.75rem" }}>
            <p className={styles.numeral}>{formatEur(top!.median_value_eur!)}</p>
            <p className={styles.numeralLabel}>median observed value, {short(top!.key)} players in the population</p>
          </div>
        }
      />
      <div className={styles.wrap}>
        <section className={m.chapter} aria-labelledby="mk-1">
          <div className={m.text}>
            <p className={styles.stepNo}>01</p>
            <h2 id="mk-1" className={styles.stepTitle}>
              One scale, fourteen levels
            </h2>
            <div className={styles.copy}>
              <p>
                The median {short(top!.key)} player in the study is valued at <strong>{formatEur(top!.median_value_eur!)}</strong>,{" "}
                {(top!.median_value_eur! / second!.median_value_eur!).toFixed(1)} times the next league, {short(second!.key)} (
                {formatEur(second!.median_value_eur!)}). In <strong>{below}</strong> of the fourteen covered leagues the median player sits below{" "}
                {formatEur(TIER_BOUNDARIES_EUR[0], 0)}, the edge of the Emerging tier.
              </p>
              {leagueShap !== undefined && (
                <p>
                  League is Model A&apos;s largest single input on average across all players: it moves an estimate by <strong>{factor(leagueShap)}</strong>,
                  up or down.
                </p>
              )}
            </div>
          </div>
          <ol className={m.board} aria-label="Median observed value by league, log scale">
            {byMedian.map((l) => (
              <li key={l.key}>
                <span className={m.name}>
                  {short(l.key)}
                  <small>{leagueCountry(l.key)}</small>
                </span>
                <span className={m.track}>
                  <i style={{ left: `${vx(TIER_BOUNDARIES_EUR[0])}%` }} />
                  <span className={m.bar} style={{ width: `${vx(l.median_value_eur!)}%` }} data-top={l.key === top!.key || undefined} />
                </span>
                <span className={`${m.val} num`}>{formatEur(l.median_value_eur!)}</span>
              </li>
            ))}
            <li className={m.axis} aria-hidden="true">
              <span />
              <span className={m.track}>
                {[250_000, 1_000_000, 2_000_000, 5_000_000, 10_000_000, 25_000_000].map((t) => (
                  <b key={t} style={{ left: `${vx(t)}%` }}>
                    {formatEur(t, 0)}
                  </b>
                ))}
              </span>
              <span />
            </li>
          </ol>
        </section>

        <section className={m.chapter} aria-labelledby="mk-2">
          <div className={m.text}>
            <p className={styles.stepNo}>02</p>
            <h2 id="mk-2" className={styles.stepTitle}>
              Who is counted
            </h2>
            <div className={styles.copy}>
              <p>
                Each league contributes between <strong>{integer(bySize.at(-1)!.total)}</strong> players ({short(bySize.at(-1)!.key)}) and{" "}
                <strong>{integer(bySize[0]!.total)}</strong> ({short(bySize[0]!.key)}): those valued while at a club in the league, with at least 450
                minutes in two years. Leagues outside these fourteen are not modelled at all.
              </p>
            </div>
          </div>
          <ol className={m.board} aria-label="Players per league">
            {bySize.map((l) => (
              <li key={l.key}>
                <span className={m.name}>
                  {short(l.key)}
                  <small>{leagueCountry(l.key)}</small>
                </span>
                <span className={m.track}>
                  <span className={m.bar} data-quiet style={{ width: `${(l.total / maxN) * 100}%` }} />
                </span>
                <span className={`${m.val} num`}>{integer(l.total)}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className={m.chapter} aria-labelledby="mk-3">
          <div className={m.text}>
            <p className={styles.stepNo}>03</p>
            <h2 id="mk-3" className={styles.stepTitle}>
              What knowing the league buys
            </h2>
            <div className={styles.copy}>
              <p>
                Model B leaves league and club out. On held-out players it misses by more in <strong>every one</strong> of the fourteen leagues. The
                difference is widest in {short(widest.key)}: a mean absolute error of {decimal(widest.B.mae!, 3)} log units without league and club,{" "}
                {decimal(widest.A.mae!, 3)} with them.
              </p>
            </div>
          </div>
          <ol className={m.board} aria-label="Held-out mean absolute error by league, Model A and Model B">
            {gapAB.map((l) => (
              <li key={l.key}>
                <span className={m.name}>
                  {short(l.key)}
                  <small>{leagueCountry(l.key)}</small>
                </span>
                <span className={m.track}>
                  <span className={m.link} style={{ left: `${(l.A.mae! / maxMae) * 100}%`, width: `${((l.B.mae! - l.A.mae!) / maxMae) * 100}%` }} />
                  <span className={m.dotB} style={{ left: `${(l.B.mae! / maxMae) * 100}%` }} />
                  <span className={m.dotA} style={{ left: `${(l.A.mae! / maxMae) * 100}%` }} />
                </span>
                <span className={`${m.val} num`}>
                  {decimal(l.A.mae!, 2)} <small>· {decimal(l.B.mae!, 2)}</small>
                </span>
              </li>
            ))}
            <li className={m.legendRow}>
              <span />
              <span>
                <i data-k="a" /> Model A, with league and club <i data-k="b" /> Model B, performance only · mean absolute error, log
              </span>
              <span />
            </li>
          </ol>
        </section>

        <section className={m.chapter} aria-labelledby="mk-4">
          <div className={m.text}>
            <p className={styles.stepNo}>04</p>
            <h2 id="mk-4" className={styles.stepTitle}>
              Above and below the line
            </h2>
            <div className={styles.copy}>
              <p>
                In {pos.length} leagues, observed values sit above Model A&apos;s held-out estimates on average; in {L.length - pos.length} they sit below.
                The spread runs from {signed(byRes[0]!.A.mean_residual!, 3)} ({short(byRes[0]!.key)}) to {signed(byRes.at(-1)!.A.mean_residual!, 3)} (
                {short(byRes.at(-1)!.key)}).
              </p>
              <p>
                These are averages over hundreds of players. A single player&apos;s residual is far noisier: a typical held-out miss is{" "}
                <strong>{factor(typical)}</strong> either way.
              </p>
              <p className={styles.caveat}>
                A selected population: fourteen European first divisions, chosen for data coverage, valued by Transfermarkt in one season. Not the
                global market, and not evidence about how any league prices players.
              </p>
            </div>
          </div>
          <ol className={m.board} aria-label="Mean residual by league, Model A">
            {byRes.map((l) => (
              <li key={l.key}>
                <span className={m.name}>
                  {short(l.key)}
                  <small>{leagueCountry(l.key)}</small>
                </span>
                <span className={m.track}>
                  <i style={{ left: "50%" }} />
                  <span
                    className={m.res}
                    data-sign={l.A.mean_residual! >= 0 ? "pos" : "neg"}
                    style={
                      l.A.mean_residual! >= 0
                        ? { left: "50%", width: `${(l.A.mean_residual! / maxRes) * 50}%` }
                        : { right: "50%", width: `${(-l.A.mean_residual! / maxRes) * 50}%` }
                    }
                  />
                </span>
                <span className={`${m.val} num`}>{signed(l.A.mean_residual!, 3)}</span>
              </li>
            ))}
            <li className={m.legendRow}>
              <span />
              <span>← observed below the estimate · observed above the estimate →</span>
              <span />
            </li>
          </ol>
        </section>
      </div>
      <StoryEnd current={story.slug} terminal={{ href: "/terminal/leagues", label: "Open the League Landscape" }} />
    </article>
  );
}
