import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PageTransition } from "@/components/site/PageTransition";
import { StoriesNav } from "@/components/stories/StoriesNav";
import styles from "@/components/stories/story.module.css";

export const metadata: Metadata = {
  title: { default: "Stories", template: "%s · Stories · FairValue" },
  description: "Valuations, head-to-heads, market patterns and research findings from FairValue, told as stories built from verified outputs.",
};

/** Stories: black stage, broadcast-scale type, serif reading text. Chapters swap inside it. */
export default function StoriesLayout({ children }: { children: ReactNode }) {
  return (
    <PageTransition>
      <div className={styles.stories}>
        <StoriesNav />
        <PageTransition scope="chapter">
          <div>{children}</div>
        </PageTransition>
      </div>
    </PageTransition>
  );
}
