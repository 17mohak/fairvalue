import { ExpLink } from "@/components/site/ExpLink";
import { Scrolly, type StoryStep } from "@/components/stories/Scrolly";
import { StoryCover } from "@/components/stories/StoryCover";
import { StoryEnd } from "@/components/stories/StoryEnd";
import styles from "@/components/stories/story.module.css";
import { integer, signed } from "@/lib/format";
import { research } from "@/lib/research";
import { gapData } from "@/lib/storyData";
import { LEAD_STORY } from "@/lib/stories";

export const metadata = { title: LEAD_STORY.title, description: LEAD_STORY.dek };

export default function GapStory() {
  const d = gapData();
  const h = research.headline;
  const all = research.population.funnel[0]!;
  const pop = research.population.funnel.at(-1)!;
  const excl = d.leagues.filter((l) => l.interval.low > 0 || l.interval.high < 0).length;
  const ci = (i: { low: number; high: number }) => `${signed(i.low)} to ${signed(i.high)}`;

  const steps: StoryStep[] = [
    {
      no: "01",
      title: "The question",
      body: (
        <>
          <p>
            FairValue&apos;s models estimate a footballer&apos;s Transfermarkt market value from two years of club football: minutes, goals,
            assists, age, position, and for Model A the league and the club&apos;s strength. <strong>They never see nationality.</strong>
          </p>
          <p>The audit asks something narrower than “is the model fair?”: do its errors fall differently on players from inside and outside UEFA?</p>
        </>
      ),
    },
    {
      no: "02",
      title: "Who is in the study",
      body: (
        <p>
          Of {integer(all.total)} players in the dataset, <strong>{integer(pop.total)}</strong> meet the study&apos;s rules: a current valuation, a
          covered league and at least 450 club minutes in two years. {integer(pop.non_uefa)} of them ({pop.non_uefa_share_pct}%) hold a non-UEFA
          first citizenship. It is a selected population, not the global market.
        </p>
      ),
    },
    {
      no: "03",
      title: "Equally accurate",
      body: (
        <p>
          On accuracy the groups are close. Model A misses UEFA players by {h.A.mae_uefa.estimate.toFixed(3)} log units on average and non-UEFA players
          by {h.A.mae_non_uefa.estimate.toFixed(3)}. Within leagues the difference is <strong>{signed(h.A.mae_gap_league_stratified.estimate)}</strong>,
          and its interval, {ci(h.A.mae_gap_league_stratified)}, includes zero.
        </p>
      ),
    },
    {
      no: "04",
      title: "One direction",
      body: (
        <>
          <p>
            The difference is in direction. Relative to the model&apos;s estimates, non-UEFA players&apos; observed values sit higher than UEFA
            players&apos; in the same leagues: a signed gap of <strong>{signed(h.A.signed_gap_league_stratified.estimate)}</strong> log units, about{" "}
            {Math.round(Math.expm1(h.A.signed_gap_league_stratified.estimate) * 100)}%, with a 95% interval of {ci(h.A.signed_gap_league_stratified)}.
          </p>
          <p>The study expected the reverse: market values below those of comparable UEFA players.</p>
        </>
      ),
    },
    {
      no: "05",
      title: "Without league and club",
      body: (
        <p>
          Model B keeps only performance, age and position. Its gap is larger, <strong>{signed(h.B.signed_gap_league_stratified.estimate)}</strong> (
          {ci(h.B.signed_gap_league_stratified)}). Adding league and club narrows the gap; it does not close it.
        </p>
      ),
    },
    {
      no: "06",
      title: "League by league",
      body: (
        <p>
          In the {d.leagues.length} leagues large enough to estimate on their own, the intervals are wide and {excl} exclude zero. The other {d.pooled}{" "}
          contribute only to the pooled figure. The headline is an average across leagues, not a rule that holds in each of them.
        </p>
      ),
    },
    {
      no: "07",
      title: "What it does not mean",
      body: (
        <>
          <p>
            This is an observational pattern in one model&apos;s errors, on a selected population. The target is Transfermarkt&apos;s community
            valuation, which may itself be biased, so a gap measured against it is <strong>not evidence of discrimination</strong> by anyone, and
            nothing here claims the model meets or fails a fairness threshold.
          </p>
          <p>
            Every number above, with its robustness checks, is in the <ExpLink href="/terminal/audit">Fairness Audit</ExpLink>; the method is in{" "}
            <ExpLink href="/methods">Methods</ExpLink>.
          </p>
        </>
      ),
    },
  ];

  return (
    <article>
      <StoryCover
        story={LEAD_STORY}
        visual={
          <div style={{ display: "grid", gap: "0.75rem" }}>
            <p className={styles.numeral}>{signed(h.A.signed_gap_league_stratified.estimate)}</p>
            <p className={styles.numeralLabel}>
              signed residual gap, non-UEFA minus UEFA, within leagues · Model A · 95% CI {ci(h.A.signed_gap_league_stratified)}
            </p>
          </div>
        }
      />
      <div className={styles.wrap}>
        <Scrolly steps={steps} graphic={{ kind: "gap", data: d }} />
      </div>
      <StoryEnd current={LEAD_STORY.slug} />
    </article>
  );
}
