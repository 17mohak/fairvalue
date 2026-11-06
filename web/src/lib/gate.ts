// The reviewer-only gate and search-engine opt-out used before a public launch (D-052).
// Pure helpers, so the request proxy stays tiny and everything here is unit-tested.
//
// - FAIRVALUE_REVIEW_PASSWORD set   -> every page and API route needs HTTP Basic auth
//   (user FAIRVALUE_REVIEW_USER, default "fairvalue"). Unset -> no gate (local development).
// - FAIRVALUE_NOINDEX               -> search engines are told not to index, unless it is "0".
//   The default is "noindex": opening the site to search engines is a deliberate step.

import { createHash, timingSafeEqual } from "node:crypto";

export interface GateConfig {
  user: string;
  password: string;
}

type Env = Record<string, string | undefined>;

export function gateConfig(env: Env): GateConfig | null {
  const password = env.FAIRVALUE_REVIEW_PASSWORD ?? "";
  if (!password) return null;
  return { user: env.FAIRVALUE_REVIEW_USER?.trim() || "fairvalue", password };
}

export function noindex(env: Env): boolean {
  return env.FAIRVALUE_NOINDEX?.trim() !== "0";
}

/** Paths that stay open behind the gate: the liveness check only. */
export const OPEN_PATHS = new Set(["/api/ping"]);

const digest = (s: string) => createHash("sha256").update(s, "utf8").digest();

/** Equal-length digests, so the comparison takes the same time whatever was guessed. */
function same(a: string, b: string): boolean {
  return timingSafeEqual(digest(a), digest(b));
}

/** True when an `Authorization: Basic …` header carries the configured user and password. */
export function authorised(header: string | null, cfg: GateConfig): boolean {
  if (!header?.startsWith("Basic ")) return false;
  let decoded: string;
  try {
    decoded = Buffer.from(header.slice(6).trim(), "base64").toString("utf8");
  } catch {
    return false;
  }
  const i = decoded.indexOf(":");
  if (i < 0) return false;
  // Both halves are always compared, so a wrong user and a wrong password take as long.
  const userOk = same(decoded.slice(0, i), cfg.user);
  const passOk = same(decoded.slice(i + 1), cfg.password);
  return userOk && passOk;
}
