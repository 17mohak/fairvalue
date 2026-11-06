import type { ReactNode } from "react";
import { workspace, type WorkspaceId } from "@/lib/terminal";
import styles from "./WorkspaceHead.module.css";

/** The compact header every Terminal workspace shares: where you are, what it is, its controls. */
export function WorkspaceHead({ id, children, note }: { id: WorkspaceId; children?: ReactNode; note?: ReactNode }) {
  const w = workspace(id);
  return (
    <header className={styles.head}>
      <div className={styles.title}>
        <p className={styles.crumbs}>
          Terminal <span aria-hidden="true">/</span> {w.group}
        </p>
        <h1>{w.label}</h1>
        <p className={styles.summary}>{note ?? w.summary}</p>
      </div>
      {children && <div className={styles.actions}>{children}</div>}
    </header>
  );
}
