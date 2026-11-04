"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, ViewTransition } from "react";
import { health } from "@/lib/api/client";
import { ROOMS, roomForPath, transitionTo } from "@/lib/rooms";
import { Mark } from "./Mark";
import styles from "./SiteHeader.module.css";

type Service = "checking" | "online" | "offline";

/** Masthead: brand, the four rooms, and the live state of the model service. */
export function SiteHeader() {
  const path = usePathname() ?? "/";
  const current = roomForPath(path);
  const [open, setOpen] = useState(false);
  const [service, setService] = useState<Service>("checking");
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let live = true;
    health()
      .then((h) => live && setService(h.status === "ok" ? "online" : "offline"))
      .catch(() => live && setService("offline"));
    return () => {
      live = false;
    };
  }, []);

  // Close the mobile menu whenever the route changes.
  const [shownPath, setShownPath] = useState(path);
  if (shownPath !== path) {
    setShownPath(path);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    // Everything behind the sheet is taken out of the tab order and the accessibility tree.
    const behind = [document.getElementById("main"), document.querySelector("body > footer")].filter((el): el is HTMLElement => !!el);
    behind.forEach((el) => (el.inert = true));
    // Widening past the mobile breakpoint hides the toggle, so close the sheet too.
    const wide = window.matchMedia("(min-width: 900px)");
    const onWide = () => wide.matches && setOpen(false);
    wide.addEventListener("change", onWide);
    menuRef.current?.querySelector<HTMLElement>("a")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      behind.forEach((el) => (el.inert = false));
      wide.removeEventListener("change", onWide);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const status = service === "checking" ? "Connecting" : service === "online" ? "Model online" : "Model offline";

  return (
    <header className={styles.header} style={{ viewTransitionName: "site-header" }} data-open={open || undefined}>
      <div className={styles.inner}>
        <Link href="/" className={styles.brand} aria-label="FairValue, overview" transitionTypes={transitionTo(current, ROOMS[0]!)}>
          <Mark />
          <span className={styles.word}>FairValue</span>
        </Link>

        <nav aria-label="Main" className={styles.desktopNav}>
          <ul className={styles.nav}>
            {ROOMS.map((room) => {
              const active = room.id === current.id;
              return (
                <li key={room.id}>
                  <Link
                    href={room.href}
                    className={styles.link}
                    aria-current={active ? "page" : undefined}
                    transitionTypes={transitionTo(current, room)}
                  >
                    <span className={`${styles.index} num`}>{room.index}</span>
                    {room.short}
                    {active && (
                      <ViewTransition name="nav-indicator">
                        <span className={styles.indicator} aria-hidden="true" />
                      </ViewTransition>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <p className={styles.status} data-state={service} title="State of the prediction API behind the studio">
          <span className={styles.dot} aria-hidden="true" />
          <span className={styles.statusText}>{status}</span>
        </p>

        <button
          ref={toggleRef}
          type="button"
          className={styles.toggle}
          aria-expanded={open}
          aria-controls="room-menu"
          onClick={() => setOpen((o) => !o)}
        >
          <span className={styles.toggleRoom}>
            <span className="num">{current.index}</span> {current.short}
          </span>
          <span className={styles.burger} aria-hidden="true">
            <span />
            <span />
          </span>
          <span className="visually-hidden">{open ? "Close menu" : "Open menu"}</span>
        </button>
      </div>

      <div id="room-menu" ref={menuRef} className={styles.sheet} hidden={!open}>
        <nav aria-label="Main, mobile">
          <ol className={styles.sheetList}>
            {ROOMS.map((room, i) => (
              <li key={room.id} style={{ "--i": i } as React.CSSProperties}>
                <Link
                  href={room.href}
                  className={styles.sheetLink}
                  aria-current={room.id === current.id ? "page" : undefined}
                  transitionTypes={transitionTo(current, room)}
                  onClick={() => setOpen(false)}
                >
                  <span className={`${styles.sheetIndex} num`}>{room.index}</span>
                  <span className={styles.sheetName}>{room.label}</span>
                  <span className={styles.sheetSummary}>{room.summary}</span>
                </Link>
              </li>
            ))}
          </ol>
        </nav>
        <p className={styles.sheetStatus} data-state={service}>
          <span className={styles.dot} aria-hidden="true" /> {status}
        </p>
      </div>
    </header>
  );
}
