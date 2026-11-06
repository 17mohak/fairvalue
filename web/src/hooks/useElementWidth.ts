"use client";

import { useEffect, useRef, useState } from "react";

/** Width of an element, kept current with ResizeObserver. SSR uses the fallback. */
export function useElementWidth<T extends HTMLElement>(fallback = 960) {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(Math.max(260, Math.round(el.getBoundingClientRect().width)));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}
