import type { Metadata } from "next";
import { integer } from "@/lib/format";
import { fairnessData } from "./data";
import { FairnessExplorer } from "./FairnessExplorer";
import styles from "./fairness.module.css";

export const metadata: Metadata = {
  title: "Fairness audit",
  description:
    "Does a nationality-blind football valuation model err differently for players from inside and outside UEFA? Gaps, intervals, leagues, tiers and robustness checks.",
};

export default function FairnessPage() {
  const data = fairnessData();
  return (
    <>
      <header className={`page ${styles.intro}`}>
        <h1 className={styles.title}>Fairness audit</h1>
        <p className={styles.lede}>
          Does a valuation model that never sees nationality still err differently for players from inside and outside UEFA? This is what the
          audit of {integer(data.population.total)} held-out predictions found, with its uncertainty and its limits.
        </p>
      </header>
      <FairnessExplorer data={data} />
    </>
  );
}
