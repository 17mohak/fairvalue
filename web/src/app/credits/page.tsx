import type { Metadata } from "next";
import { PageTransition } from "@/components/site/PageTransition";
import cards from "@/data/portrait_cards.json";
import fl from "@/data/generated/portrait_cards_fl.json";
import { footylogosEnabled } from "@/lib/portraits";
import styles from "./credits.module.css";

export const metadata: Metadata = {
  title: "Image credits",
  description: "Where the player portraits on FairValue come from, under what terms, and how to ask for one to be removed.",
};

export default function CreditsPage() {
  const nFl = footylogosEnabled() ? fl.footylogos.length : 0;
  return (
    <PageTransition>
      <article className={styles.page}>
        <p className={styles.kicker}>FairValue · Image credits</p>
        <h1 className={styles.title}>Where the portraits come from</h1>
        <p className={styles.lede}>
          FairValue is a non-commercial university research and portfolio project. It carries no advertising and earns no money. Portraits are a
          presentation layer: they say nothing about the model or the fairness audit, and a player without one gets an engraved monogram.
        </p>

        <section aria-labelledby="berlin">
          <h2 id="berlin">Bryan Berlin / WikiPortraits · {cards.berlin.length} players</h2>
          <p>
            Photographs by Bryan Berlin, published on Wikimedia Commons under{" "}
            <a href="https://creativecommons.org/licenses/by-sa/4.0/">Creative Commons Attribution-ShareAlike 4.0</a>. FairValue cropped each photograph and
            removed its background. The edited versions are shared under the same licence. Commons marks these files with a personality-rights
            notice; the licence covers the photograph, not a player&apos;s image rights. Each card links to its source file on the player&apos;s page.
          </p>
        </section>

        <section aria-labelledby="footylogos">
          <h2 id="footylogos">FootyLogos · {nFl.toLocaleString("en-GB")} players</h2>
          <p>
            Player images from <a href="https://www.footylogos.com/player-pngs">FootyLogos</a>. FootyLogos publishes no licence for them and they
            may derive from league or club image libraries, so FairValue does not claim any right to them. They are used here, unaltered apart from
            cropping and scaling, for a non-commercial research portfolio. Club crests and sponsor marks visible on kits belong to their owners. The
            kit in an image is often from an earlier season than the player&apos;s current club.
          </p>
        </section>

        <section aria-labelledby="takedown">
          <h2 id="takedown">Ask for an image to be removed</h2>
          <p>
            If you own a photograph or are a player or club and want an image taken down, open an issue at{" "}
            <a href="https://github.com/17mohak/fairvalue/issues">github.com/17mohak/fairvalue/issues</a> naming the player. The image will be
            removed promptly, with no argument.
          </p>
        </section>

        <p className={styles.small}>Nothing here is legal advice, and nothing on this page means any rights holder has endorsed FairValue.</p>
      </article>
    </PageTransition>
  );
}
