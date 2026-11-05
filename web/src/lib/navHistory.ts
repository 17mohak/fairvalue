"use client";

// How many pages this tab has shown since it loaded FairValue. A dossier opened from inside the
// app can offer "Back" (browser history); one opened from a shared link cannot, so it shows a
// breadcrumb into the product instead.

import { useEffect, useState } from "react";

let depth = 0;
let last: string | null = null;

/** Called by the global header on every route change; repeated calls for one path count once. */
export function recordNavigation(path: string) {
  if (path === last) return;
  last = path;
  depth += 1;
}

/** True after hydration when the previous page in this tab was a FairValue page. */
export function useCanGoBack(): boolean {
  const [can, setCan] = useState(false);
  useEffect(() => setCan(depth > 1), []);
  return can;
}
