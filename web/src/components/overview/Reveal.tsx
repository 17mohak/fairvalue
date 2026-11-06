"use client";

import { useEffect, useRef, useState, type CSSProperties, type ElementType, type ReactNode } from "react";

/**
 * Reveals its content once, when it first scrolls into view. Server HTML is fully visible: the
 * element is only hidden after hydration, and only if it is still below the fold, so content
 * never depends on JavaScript and nothing above the fold flashes. Reduced motion: CSS in
 * globals.css (.fv-reveal) skips the transition.
 */
export function Reveal({
  as: Tag = "div",
  children,
  className,
  delay = 0,
  style,
  ...rest
}: {
  as?: ElementType;
  children: ReactNode;
  className?: string;
  delay?: number;
  style?: CSSProperties;
  id?: string;
  "aria-labelledby"?: string;
  "aria-label"?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const [state, setState] = useState<"static" | "waiting" | "in">("static");

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.92) return; // already visible: leave it alone
    setState("waiting");
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setState("in");
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={`fv-reveal ${className ?? ""}`}
      data-reveal={state}
      style={{ ...style, ["--reveal-delay" as string]: `${delay}ms` }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/** True once the element has scrolled into view (or immediately when it starts visible). */
export function useSeen<T extends Element>(): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -15% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, seen];
}
