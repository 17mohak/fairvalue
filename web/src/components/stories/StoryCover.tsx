import type { ReactNode } from "react";
import type { Story } from "@/lib/stories";
import styles from "./story.module.css";
import cover from "./cover.module.css";

/** A story's opening spread: format tag, headline, standfirst, what it is built from. */
export function StoryCover({ story, visual, children }: { story: Story; visual?: ReactNode; children?: ReactNode }) {
  return (
    <header className={`${styles.wrap} ${cover.cover}`} data-visual={visual ? true : undefined}>
      <div className={cover.text}>
        <span className={styles.tag}>{story.formatLabel} story</span>
        <h1 className={styles.display}>{story.title}</h1>
        <p className={styles.dek}>{story.dek}</p>
        <p className={styles.basis}>
          <span>
            <b>Built from</b> {story.basis}
          </span>
          <span>
            <b>{story.chapters}</b> chapters
          </span>
        </p>
        {children}
      </div>
      {visual && <div className={cover.visual}>{visual}</div>}
    </header>
  );
}
