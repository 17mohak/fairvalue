import research from "@/data/research.json";
import { DISCLAIMER } from "@/lib/football";
import { ROOMS } from "@/lib/rooms";
import { Mark } from "./Mark";
import { RoomLink } from "./RoomLink";
import styles from "./SiteFooter.module.css";

export function SiteFooter() {
  return (
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
            {ROOMS.map((r) => (
              <li key={r.id}>
                <RoomLink href={r.href}>
                  <span className="num">{r.index}</span> {r.label}
                </RoomLink>
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
              <RoomLink href="/methods#limitations">Known limitations</RoomLink>
            </dd>
          </div>
        </dl>
      </div>
    </footer>
  );
}
