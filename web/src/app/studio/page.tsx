import type { Metadata } from "next";
import { Studio } from "@/components/studio/Studio";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Valuation studio",
  description: "Describe a player's last two years of club football and get a market value estimate, its tier and the inputs that moved it.",
};

export default function StudioPage() {
  return (
    <div className="page">
      <header className={styles.intro}>
        <h1 className={styles.title}>Valuation studio</h1>
        <p className={styles.lede}>
          Describe a player&apos;s last two years of club football. The model returns a market value in euros, the tier it falls in, and the
          inputs that moved it most.
        </p>
      </header>
      <Studio />
    </div>
  );
}
