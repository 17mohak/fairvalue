"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";
import { transitionTypes } from "@/lib/experiences";

/** A Link that tags the navigation with the entrance of the environment it leads to. */
export function ExpLink({ href, ...props }: ComponentProps<typeof Link> & { href: string }) {
  const path = usePathname() ?? "/";
  return <Link href={href} transitionTypes={transitionTypes(path, href)} {...props} />;
}
