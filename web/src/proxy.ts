// Runs before every page and API route (Next.js "proxy", formerly middleware; Node.js runtime).
// Reviewer-only gate and search-engine opt-out for the pre-launch deployment (src/lib/gate.ts, D-052).

import { NextResponse, type NextRequest } from "next/server";
import { authorised, gateConfig, noindex, OPEN_PATHS } from "@/lib/gate";

export function proxy(request: NextRequest) {
  const cfg = gateConfig(process.env);
  if (cfg && !OPEN_PATHS.has(request.nextUrl.pathname) && !authorised(request.headers.get("authorization"), cfg)) {
    return new NextResponse("FairValue is in private review. Sign in with the reviewer credentials.", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="FairValue review", charset="UTF-8"',
        "Cache-Control": "no-store",
        "Content-Type": "text/plain; charset=utf-8",
        ...(noindex(process.env) ? { "X-Robots-Tag": "noindex, nofollow" } : {}),
      },
    });
  }
  const res = NextResponse.next();
  if (noindex(process.env)) res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}

export const config = {
  // Everything except build assets and the public flag and icon files, which carry no data.
  matcher: ["/((?!_next/static|_next/image|flags/|icon\\.svg|favicon\\.ico).*)"],
};
