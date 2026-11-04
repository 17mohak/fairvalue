import Link from "next/link";
import research from "@/data/research.json";
import { DISCLAIMER } from "@/lib/football";
import { Mark } from "./Mark";
import styles from "./SiteFooter.module.css";

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={`page ${styles.inner}`}>
        <div className={styles.brand}>
          <Mark size={18} />
          <span>FairValue</span>
        </div>
        <p className={styles.disclaimer}>{DISCLAIMER}</p>
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
            <dt>Read more</dt>
            <dd>
              <Link href="/methods#limitations">Known limitations</Link>
            </dd>
          </div>
        </dl>
      </div>
    </footer>
  );
}
