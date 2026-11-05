import { ExpLink } from "@/components/site/ExpLink";
import { EXPERIENCES } from "@/lib/experiences";
import styles from "./status.module.css";

export default function NotFound() {
  return (
    <section className={styles.wrap} aria-labelledby="nf-title">
      <p className="eyebrow">
        <b className="num">404</b> Out of play
      </p>
      <h1 id="nf-title" className={styles.title}>
        This page isn&apos;t on the pitch.
      </h1>
      <p className={styles.body}>The address doesn&apos;t match any part of FairValue. FairValue has three environments:</p>
      <ol className={styles.rooms}>
        {EXPERIENCES.map((r) => (
          <li key={r.id}>
            <ExpLink href={r.href}>
              <span className="num">0{r.key}</span>
              <strong>{r.label}</strong>
              <span>{r.summary}</span>
            </ExpLink>
          </li>
        ))}
      </ol>
    </section>
  );
}
