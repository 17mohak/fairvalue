"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mark } from "./Mark";
import styles from "./SiteHeader.module.css";

const NAV = [
  { href: "/studio", label: "Valuation studio" },
  { href: "/fairness", label: "Fairness audit" },
  { href: "/methods", label: "Methods" },
];

export function SiteHeader() {
  const path = usePathname();
  return (
    <header className={styles.header}>
      <div className={`page ${styles.inner}`}>
        <Link href="/" className={styles.brand} aria-label="FairValue home">
          <Mark />
          <span>FairValue</span>
        </Link>
        <nav aria-label="Main">
          <ul className={styles.nav}>
            {NAV.map((item) => {
              const active = path === item.href || path.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link href={item.href} className={styles.link} aria-current={active ? "page" : undefined}>
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
