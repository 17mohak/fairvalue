"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { contextForPath } from "@/lib/experiences";

/** The Terminal is a workstation: no page footer, its status strip takes that role. */
export function FooterGate({ children }: { children: ReactNode }) {
  const path = usePathname() ?? "/";
  return contextForPath(path) === "terminal" ? null : <>{children}</>;
}
