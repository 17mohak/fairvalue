import Link from "next/link";
import { STORIES } from "@/lib/stories";
import styles from "./story.module.css";
import end from "./end.module.css";

/** End matter: where the data lives, and what to read next. */
export function StoryEnd({ current, terminal }: { current: string; terminal?: { href: string; label: string } }) {
  const next = STORIES.filter((s) => s.slug !== current).slice(0, 3);
  return (
    <footer className={`${styles.wrap} ${end.end}`}>
      {terminal && (
        <p className={end.data}>
          The figures behind this story are live in the Terminal.{" "}
          <Link href={terminal.href} className={styles.read} transitionTypes={["to-terminal"]}>
            {terminal.label} →
          </Link>
        </p>
      )}
      <h2 className={end.head}>Keep reading</h2>
      <ul className={end.list}>
        {next.map((s) => (
          <li key={s.slug}>
            <Link href={s.href} className={end.card} transitionTypes={["chapter"]}>
              <span className={styles.tag} data-quiet>
                {s.formatLabel}
              </span>
              <b>{s.title}</b>
              <span>{s.dek}</span>
            </Link>
          </li>
        ))}
      </ul>
    </footer>
  );
}
