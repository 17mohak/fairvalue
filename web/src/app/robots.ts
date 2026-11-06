import type { MetadataRoute } from "next";
import { noindex } from "@/lib/gate";

// Read per request, so switching FAIRVALUE_NOINDEX needs a restart, not a rebuild.
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  return noindex(process.env) ? { rules: { userAgent: "*", disallow: "/" } } : { rules: { userAgent: "*", allow: "/" } };
}
