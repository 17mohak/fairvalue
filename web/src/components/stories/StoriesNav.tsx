"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { STORY_FORMATS } from "@/lib/stories";
import styles from "./story.module.css";

/** The Stories masthead: the publication's name and its sections. */
export function StoriesNav() {
  const path = usePathname() ?? "/stories";
  const onCover = path === "/stories";
  return (
    <nav className={styles.nav} aria-label="Stories sections">
      <Link href="/stories" className={styles.navMast} aria-current={onCover ? "page" : undefined} transitionTypes={onCover ? [] : ["chapter"]}>
        FairValue <b>Stories</b>
      </Link>
      <ul className={styles.navList}>
        {STORY_FORMATS.map((f) => (
          <li key={f.id}>
            <Link href={`/stories#${f.id}`} transitionTypes={onCover ? [] : ["chapter"]}>
              {f.label}
            </Link>
          </li>
        ))}
        <li>
          <Link href="/methods" transitionTypes={["chapter"]}>
            Methods
          </Link>
        </li>
      </ul>
    </nav>
  );
}
