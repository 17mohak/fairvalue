import research from "@/data/research.json";
import { EXPERIENCES } from "@/lib/experiences";
import { DISCLAIMER } from "@/lib/football";
import { STORY_FORMATS } from "@/lib/stories";
import { WORKSPACES } from "@/lib/terminal";
import { ExpLink } from "./ExpLink";
import { FooterGate } from "./FooterGate";
import { Mark } from "./Mark";
import styles from "./SiteFooter.module.css";

/** The site footer for Overview, Stories and the dossier (the Terminal has its status strip instead). */
export function SiteFooter() {
  return (
    <FooterGate>
      <footer className={styles.footer}>
        <div className={styles.inner}>
          <div className={styles.lead}>
            <p className={styles.brand}>
              <Mark size={20} />
              <span>FairValue</span>
            </p>
            <p className={styles.disclaimer}>{DISCLAIMER}</p>
          </div>
          <nav aria-label="Footer" className={styles.rooms}>
            <ol>
              {EXPERIENCES.map((e) => (
                <li key={e.id}>
                  <ExpLink href={e.href}>{e.label}</ExpLink>
                  <ul className={styles.sub}>
                    {e.id === "terminal" &&
                      WORKSPACES.map((w) => (
                        <li key={w.id}>
                          <ExpLink href={w.href}>{w.label}</ExpLink>
                        </li>
                      ))}
                    {e.id === "stories" && (
                      <>
                        {STORY_FORMATS.map((f) => (
                          <li key={f.id}>
                            <ExpLink href={`/stories#${f.id}`}>{f.label}</ExpLink>
                          </li>
                        ))}
                        <li>
                          <ExpLink href="/methods">Methods</ExpLink>
                        </li>
                      </>
                    )}
                  </ul>
                </li>
              ))}
            </ol>
          </nav>
          <dl className={styles.meta}>
            <div>
              <dt>Training snapshot</dt>
              <dd className="num">{research.models.n_training_rows.toLocaleString("en-GB")} players, 2025–26</dd>
            </div>
            <div>
              <dt>Dataset fingerprint</dt>
              <dd className="num">{research.models.dataset_sha256_16}</dd>
            </div>
            <div>
              <dt>Limits</dt>
              <dd>
                <ExpLink href="/methods#limitations">Known limitations</ExpLink>
              </dd>
            </div>
            <div>
              <dt>Images</dt>
              <dd>
                <ExpLink href="/credits">Image credits</ExpLink>
              </dd>
            </div>
          </dl>
        </div>
      </footer>
    </FooterGate>
  );
}
