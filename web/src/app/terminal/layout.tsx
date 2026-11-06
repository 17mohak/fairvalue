import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PageTransition } from "@/components/site/PageTransition";
import { StatusStrip } from "@/components/terminal/StatusStrip";
import { TerminalRail } from "@/components/terminal/TerminalRail";
import { playerSet } from "@/lib/players.server";
import { research } from "@/lib/research";
import styles from "./terminal.module.css";

export const metadata: Metadata = {
  title: { default: "Terminal", template: "%s · Terminal · FairValue" },
  description: "The FairValue Terminal: explore, compare and track players, and read the market, leagues and model behaviour.",
};

/**
 * The Terminal shell persists across its workspaces: rail, status strip and the workspace area.
 * Entering it from another environment plays its entrance; moving between workspaces swaps only
 * the workspace area (PageTransition scope="workspace").
 */
export default function TerminalLayout({ children }: { children: ReactNode }) {
  const set = playerSet();
  const m = research.models;
  const population = research.population.funnel.at(-1)!.total;
  return (
    <PageTransition>
      <div className={styles.terminal}>
        <TerminalRail
          coverage={{ source: set.source, players: set.players.length, population }}
          build={{ models: m.created_utc.slice(0, 10), dataset: m.dataset_sha256_16 }}
        />
        <div className={styles.main}>
          <PageTransition scope="workspace">
            <div className={styles.workspace}>{children}</div>
          </PageTransition>
          <StatusStrip regressor={m.registry.regressor_A.version} dataset={m.dataset_sha256_16} rows={m.n_training_rows} />
        </div>
      </div>
    </PageTransition>
  );
}
