import type { Metadata } from "next";
import { Studio } from "@/components/studio/Studio";
import { WorkspaceHead } from "@/components/terminal/WorkspaceHead";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Valuation Studio",
  description: "Describe a player's last two years of club football and get a market value estimate, its tier and the inputs that moved it.",
};

export default function ValuationPage() {
  return (
    <div className={styles.studio}>
      <WorkspaceHead
        id="valuation"
        note="Build a profile or load a research player. The served model returns a value, its tier, Model A against Model B and the inputs that moved it. Every result says whether it is live, unverified or cached."
      />
      <Studio />
    </div>
  );
}
