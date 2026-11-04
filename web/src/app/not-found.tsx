import { RoomLink } from "@/components/site/RoomLink";
import { ROOMS } from "@/lib/rooms";
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
      <p className={styles.body}>The address doesn&apos;t match any part of FairValue. These are the four rooms:</p>
      <ol className={styles.rooms}>
        {ROOMS.map((r) => (
          <li key={r.id}>
            <RoomLink href={r.href}>
              <span className="num">{r.index}</span>
              <strong>{r.label}</strong>
              <span>{r.summary}</span>
            </RoomLink>
          </li>
        ))}
      </ol>
    </section>
  );
}
