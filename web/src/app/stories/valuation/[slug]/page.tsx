import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExpLink } from "@/components/site/ExpLink";
import { Scrolly, type StoryStep } from "@/components/stories/Scrolly";
import { StoryCover } from "@/components/stories/StoryCover";
import { StoryEnd } from "@/components/stories/StoryEnd";
import styles from "@/components/stories/story.module.css";
import { leagueName } from "@/lib/football";
import { formatEur, signed } from "@/lib/format";
import { buildJourney, factor, toEur } from "@/lib/journey";
import { research } from "@/lib/research";
import { SHOWCASE, storyBySlug } from "@/lib/stories";

const TOP = 5;

export function generateStaticParams() {
  return SHOWCASE.filter((p) => p.explanation).map((p) => ({ slug: p.slug }));
}

type Params = { params: Promise<{ slug: string }> };

function load(slug: string) {
  const p = SHOWCASE.find((x) => x.slug === slug);
  const story = storyBySlug(`valuation-${slug}`);
  if (!p || !p.explanation || !story) notFound();
  return { p, story, e: p.explanation };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const slug = (await params).slug;
  const s = storyBySlug(`valuation-${slug}`);
  return s ? { title: s.title, description: s.dek } : { title: "Story not found" };
}

export default async function ValuationStory({ params }: Params) {
  const { p, story, e } = load((await params).slug);
  const j = buildJourney(e, TOP);
  const features = j.steps.filter((s) => s.kind === "feature");
  const rest = j.steps.find((s) => s.kind === "rest");
  const global = new Map(research.shap_global.A.map((g) => [g.feature, g.mean_abs]));
  const residual = Math.log(p.market_value_eur) - e.predicted_log_value;
  const league = leagueName(p.league_id).split(",")[0];
  const n = e.contributions.length;

  const steps: StoryStep[] = [
    {
      no: "01",
      title: "The valuation",
      body: (
        <p>
          {p.name}: {Math.floor(p.age)}, {p.sub_position.toLowerCase()} in {league}. Transfermarkt&apos;s valuation is{" "}
          <strong>{formatEur(p.market_value_eur)}</strong>
          {p.market_tier ? `, in the ${p.market_tier} tier` : ""}. This story follows how Model A arrives at its own figure, one input at a time.
        </p>
      ),
    },
    {
      no: "02",
      title: "Where every estimate starts",
      body: (
        <p>
          Before it looks at this player, Model A sits at <strong>{formatEur(toEur(j.base))}</strong>: its average output across the players it was
          trained on. Every player&apos;s journey starts here. Each input then multiplies the estimate up or down.
        </p>
      ),
    },
    ...features.map((s, i) => {
      const g = global.get(s.key);
      return {
        no: String(i + 3).padStart(2, "0"),
        title: s.label,
        body: (
          <>
            <p>
              {s.label}
              {s.input ? ` (${s.input})` : ""} {s.contribution >= 0 ? "raises" : "lowers"} the estimate <strong>{factor(s.contribution)}</strong>: from{" "}
              {formatEur(toEur(s.before))} to {formatEur(toEur(s.after))}.
            </p>
            {g !== undefined && (
              <p>
                Across all modelled players this input moves Model A&apos;s estimate by {factor(g)} on average, in one direction or the other. Here it
                moves it {Math.abs(s.contribution) > g ? "more" : "less"} than usual.
              </p>
            )}
          </>
        ),
      };
    }),
    ...(rest
      ? [
          {
            no: String(features.length + 3).padStart(2, "0"),
            title: "Everything else",
            body: (
              <p>
                The remaining {rest.count} inputs are individually small. Together they {rest.contribution >= 0 ? "raise" : "lower"} the estimate{" "}
                <strong>{factor(rest.contribution)}</strong>, to {formatEur(toEur(rest.after))}.
              </p>
            ),
          },
        ]
      : []),
    {
      no: String(features.length + 4).padStart(2, "0"),
      title: "The estimate",
      body: (
        <>
          <p>
            After all {n} inputs, Model A says <strong>{formatEur(toEur(e.predicted_log_value))}</strong>. Transfermarkt says{" "}
            {formatEur(p.market_value_eur)}. The residual, log(observed) − log(estimate), is <strong>{signed(residual, 3)}</strong>: the observed value
            is {residual >= 0 ? "above the estimate, so the model under-predicts" : "below the estimate, so the model over-predicts"} by{" "}
            {factor(Math.abs(residual))}.
          </p>
          <p>
            The served model was trained on this player, so this is an in-sample figure; on unseen players a typical miss is{" "}
            {factor(research.models.registry.regressor_A.cv_heldout_metrics.log_mae)}.
          </p>
        </>
      ),
    },
    {
      no: String(features.length + 5).padStart(2, "0"),
      title: "What this is not",
      body: (
        <>
          <p>
            SHAP describes the model&apos;s arithmetic for these inputs. It is not a price, a scouting judgement or a statement about what causes value,
            and the order of the steps is by size, not sequence.
          </p>
          <p>
            The same record, with Model B and the player&apos;s traits, is in the <ExpLink href={`/players/${p.slug}?from=stories`}>dossier</ExpLink>.
          </p>
        </>
      ),
    },
  ];

  const reveal = [0, 0, ...features.map((_, i) => i + 1), ...(rest ? [features.length + 1] : []), j.steps.length - 1, j.steps.length - 1];

  return (
    <article>
      <StoryCover
        story={story}
        visual={
          <div className={styles.typeface} role="img" aria-label={`${p.name}: typographic cover; no licensed photograph`}>
            <span className={styles.typefaceRole}>{p.role_code}</span>
            <span className={styles.typefaceNote}>No licensed photograph</span>
            <span className={styles.typefaceName} aria-hidden="true">
              {p.last_name}
            </span>
          </div>
        }
      >
        <p className={styles.basis}>
          <span>
            <b>Observed</b> {formatEur(p.market_value_eur)}
          </span>
          <span>
            <b>Model A</b> {formatEur(toEur(e.predicted_log_value))} (served, in-sample)
          </span>
          <span>
            <b>{league}</b> · {p.sub_position}
          </span>
        </p>
      </StoryCover>
      <div className={styles.wrap}>
        <Scrolly steps={steps} graphic={{ kind: "journey", data: { explanation: e, observed: p.market_value_eur, subject: p.last_name, reveal, top: TOP } }} />
      </div>
      <StoryEnd current={story.slug} terminal={{ href: `/terminal?focus=${p.id}`, label: `Inspect ${p.last_name} in the Terminal` }} />
    </article>
  );
}
