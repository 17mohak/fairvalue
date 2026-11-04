import type { Metadata } from "next";
import { room } from "@/lib/rooms";
import { RoomTransition } from "@/components/site/RoomTransition";
import { Studio } from "@/components/studio/Studio";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Valuation studio",
  description: "Describe a player's last two years of club football and get a market value estimate, its tier and the inputs that moved it.",
};

export default function StudioPage() {
  return (
    <RoomTransition>
      <div className={styles.studio}>
        <header className={styles.head}>
          <p className="eyebrow">
            <b className="num">{room("studio").index}</b> Valuation studio
          </p>
          <h1 className={styles.title}>Value a player</h1>
          <p className={styles.lede}>
            Describe two seasons of club football. The live model returns a value in euros, its tier, and the inputs that moved it.
          </p>
        </header>
        <Studio />
      </div>
    </RoomTransition>
  );
}
