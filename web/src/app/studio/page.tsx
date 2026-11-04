import type { Metadata } from "next";
import { RoomTransition } from "@/components/site/RoomTransition";
import { Studio } from "@/components/studio/Studio";
import { room } from "@/lib/rooms";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Valuation studio",
  description: "Describe a player's last two years of club football and get a market value estimate, its tier and the inputs that moved it.",
};

export default function StudioPage() {
  return (
    <RoomTransition>
      <div className={styles.studio}>
        <header className={`fv-pagehead ${styles.head}`}>
          <div>
            <p className="eyebrow">
              <b className="num">{room("studio").index}</b> Valuation workstation
            </p>
            <h1>Valuation studio</h1>
          </div>
          <p>
            Build a profile or load a research player. The served model returns a value, its tier, Model A against Model B, and the SHAP
            breakdown. Every result says whether it is live, unverified or cached.
          </p>
        </header>
        <Studio />
      </div>
    </RoomTransition>
  );
}
