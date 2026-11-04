"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";
import { roomForPath, transitionTo } from "@/lib/rooms";

/** A Link that tags the navigation forward or back depending on the room order. */
export function RoomLink({ href, ...props }: ComponentProps<typeof Link> & { href: string }) {
  const path = usePathname() ?? "/";
  const target = href.split(/[?#]/)[0] || "/";
  return <Link href={href} transitionTypes={transitionTo(roomForPath(path), roomForPath(target))} {...props} />;
}
