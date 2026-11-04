import { RoomLink } from "@/components/site/RoomLink";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./Button.module.css";

type Variant = "primary" | "quiet";

export function Button({ variant = "primary", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button {...props} className={`${styles.button} ${styles[variant]} ${className}`} />;
}

export function ButtonLink({ href, variant = "primary", children }: { href: string; variant?: Variant; children: ReactNode }) {
  return (
    <RoomLink href={href} className={`${styles.button} ${styles[variant]}`}>
      {children}
      <span className={styles.arrow} aria-hidden="true">
        →
      </span>
    </RoomLink>
  );
}
