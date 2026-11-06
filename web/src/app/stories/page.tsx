import Link from "next/link";
import { PlayerChip } from "@/components/players/PlayerChip";
import { JourneySpark } from "@/components/stories/JourneySpark";
import styles from "@/components/stories/story.module.css";
import { leagueName } from "@/lib/football";
import { formatEur, signed } from "@/lib/format";
import { toEur } from "@/lib/journey";
import { portraitFor } from "@/lib/portraits";
import { research } from "@/lib/research";
import { LEAD_STORY, showcasePlayer, STORY_FORMATS, storiesOf } from "@/lib/stories";
import c from "./cover.module.css";

export const metadata = { title: "Stories" };

const short = (id: string) => leagueName(id).split(",")[0]!;

export default function StoriesCover() {
  const h = research.headline;
  const ia = h.A.signed_gap_league_stratified;
  const ib = h.B.signed_gap_league_stratified;
  const gx = (v: number) => ((v + 0.1) / 0.4) * 100;
  const pairs = storiesOf("head-to-head");
  const valuations = storiesOf("valuation");
  const market = storiesOf("market")[0]!;
  const medians = [...research.market.leagues].sort((a, b) => b.median_value_eur! - a.median_value_eur!);
  const spotlight = STORY_FORMATS.find((f) => f.id === "spotlight")!;

  return (
    <div className={c.page}>
      {/* ---- Lead: research ---- */}
      <section id="research" className={`${styles.wrap} ${c.lead}`} aria-labelledby="lead-title">
        <div className={c.leadText}>
          <span className={styles.tag}>Lead story · Research</span>
          <h1 id="lead-title" className={styles.display}>
            <Link href={LEAD_STORY.href} className={c.titleLink} transitionTypes={["chapter"]}>
              {LEAD_STORY.title}
            </Link>
          </h1>
          <p className={styles.dek}>{LEAD_STORY.dek}</p>
          <Link href={LEAD_STORY.href} className={styles.read} transitionTypes={["chapter"]}>
            Read · {LEAD_STORY.chapters} chapters →
          </Link>
        </div>
        <figure className={c.leadFig}>
          <p className={styles.numeral}>{signed(ia.estimate)}</p>
          <figcaption className={styles.numeralLabel}>signed residual gap, non-UEFA minus UEFA, within leagues, log units</figcaption>
          <div className={c.iv} aria-label={`Model A ${signed(ia.estimate)}, 95% CI ${signed(ia.low)} to ${signed(ia.high)}; Model B ${signed(ib.estimate)}`} role="img">
            {[
              { k: "Model A", v: ia },
              { k: "Model B", v: ib },
            ].map((r) => (
              <div key={r.k} className={c.ivRow}>
                <span>{r.k}</span>
                <span className={c.ivTrack}>
                  <span className={c.ivBand} style={{ left: `${gx(r.v.low)}%`, width: `${gx(r.v.high) - gx(r.v.low)}%` }} />
                  <span className={c.ivDot} style={{ left: `${gx(r.v.estimate)}%` }} />
                </span>
                <span className="num">{signed(r.v.estimate)}</span>
              </div>
            ))}
          </div>
          <p className={styles.basis}>95% intervals · the thin line is zero, no gap · not evidence of discrimination</p>
        </figure>
      </section>

      {/* ---- Head-to-head ---- */}
      <section id="head-to-head" className={styles.wrap} aria-labelledby="h2h-title">
        <header className={styles.sectionHead}>
          <h2 id="h2h-title">Head-to-Head</h2>
          <p>Two players in the same position, on one scale: the market, the model and what separates them.</p>
        </header>
        <ul className={c.pairs}>
          {pairs.map((s) => {
            const [a, b] = s.players.map((id) => showcasePlayer(id)!);
            return (
              <li key={s.slug}>
                <Link href={s.href} className={c.pair} transitionTypes={["chapter"]}>
                  <span className={c.pairSide}>
                    <span className={c.pairChip}>
                      <PlayerChip name={a!.name} tier={a!.market_tier} portrait={portraitFor(a!.id)} />
                    </span>
                    <small>{a!.role_code} · {short(a!.league_id)}</small>
                    <b>{a!.last_name}</b>
                    <span className="num">{formatEur(a!.market_value_eur)}</span>
                  </span>
                  <span className={c.pairV} aria-hidden="true">
                    v
                  </span>
                  <span className={c.pairSide} data-right>
                    <span className={c.pairChip}>
                      <PlayerChip name={b!.name} tier={b!.market_tier} portrait={portraitFor(b!.id)} />
                    </span>
                    <small>{b!.role_code} · {short(b!.league_id)}</small>
                    <b>{b!.last_name}</b>
                    <span className="num">{formatEur(b!.market_value_eur)}</span>
                  </span>
                  <span className={c.pairDek}>{s.dek}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ---- Valuation ---- */}
      <section id="valuation" className={styles.wrap} aria-labelledby="val-title">
        <header className={styles.sectionHead}>
          <h2 id="val-title">Valuation</h2>
          <p>One estimate, input by input. The line is each valuation journey; the dashed line is the observed value.</p>
        </header>
        <ul className={c.vals}>
          {valuations.map((s) => {
            const p = showcasePlayer(s.players[0]!)!;
            return (
              <li key={s.slug}>
                <Link href={s.href} className={c.val} transitionTypes={["chapter"]}>
                  <span className={c.valTop}>
                    <span className={c.valRole}>{p.role_code}</span>
                    <span className={c.valLeague}>{short(p.league_id)}</span>
                  </span>
                  <span className={c.valHead}>
                    <span className={c.valChip}>
                      <PlayerChip name={p.name} tier={p.market_tier} portrait={portraitFor(p.id)} />
                    </span>
                    <b className={c.valName}>{p.last_name}</b>
                  </span>
                  <JourneySpark explanation={p.explanation!} observed={p.market_value_eur} />
                  <span className={`${c.valNums} num`}>
                    <span>
                      {formatEur(toEur(p.explanation!.base_log_value))} → <b>{formatEur(toEur(p.explanation!.predicted_log_value))}</b>
                    </span>
                    <span>observed {formatEur(p.market_value_eur)}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ---- Market ---- */}
      <section id="market" className={styles.wrap} aria-labelledby="mkt-title">
        <header className={styles.sectionHead}>
          <h2 id="mkt-title">Market</h2>
          <p>Patterns across the fourteen covered leagues, from the held-out error tables.</p>
        </header>
        <Link href={market.href} className={c.market} transitionTypes={["chapter"]}>
          <span className={c.marketText}>
            <b>{market.title}</b>
            <span>{market.dek}</span>
          </span>
          <span className={c.marketBars} aria-hidden="true">
            {medians.map((l) => (
              <span key={l.key} style={{ height: `${(Math.log(l.median_value_eur!) - Math.log(200_000)) / (Math.log(20_000_000) - Math.log(200_000)) * 100}%` }} title={`${short(l.key)} ${formatEur(l.median_value_eur!)}`} />
            ))}
          </span>
        </Link>
      </section>

      {/* ---- Spotlight: honest empty state ---- */}
      <section id="spotlight" className={styles.wrap} aria-labelledby="spot-title">
        <header className={styles.sectionHead}>
          <h2 id="spot-title">Player Spotlight</h2>
          <p>{spotlight.summary}</p>
        </header>
        <div className={c.empty}>
          <span className={styles.tag} data-quiet>
            Not published
          </span>
          <p className={c.emptyText}>{spotlight.needs}</p>
          <ul className={c.needs}>
            <li>Licensed cutout photography, cleared for each player (the asset pipeline accepts CC0, public-domain and CC BY / BY-SA images).</li>
            <li>Match-by-match data for a season narrative, beyond the two-year totals the model uses.</li>
            <li>Valuation history, which arrives with the full local player export.</li>
          </ul>
        </div>
      </section>

      {/* ---- Methods ---- */}
      <section className={styles.wrap} aria-labelledby="methods-title">
        <Link href="/methods" className={c.methods} transitionTypes={["chapter"]}>
          <span className={styles.tag} data-quiet>
            Long read · Research
          </span>
          <b id="methods-title">How FairValue works</b>
          <span>Data, models, validation, explainability and limits: the technical account, printed on paper.</span>
        </Link>
      </section>
    </div>
  );
}
