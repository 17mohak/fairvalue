// Server-only: forwards requests to the FastAPI service named by FAIRVALUE_API_URL.
// Keeps the backend address private, avoids CORS, and turns network failures into clean 503s.
//
// On Cloud Run (D-052) the API is private: it accepts only requests carrying a Google identity
// token for its own URL. With FAIRVALUE_API_AUTH=gcp-id-token the web app fetches that token from
// the metadata server and sends it as a Bearer token. Anywhere else (local, compose) no header.

import "server-only";

const DEFAULT_API_URL = "http://127.0.0.1:8000";
const TIMEOUT_MS = 12_000;
const MAX_BODY_BYTES = 16_384; // a player profile is well under 1 KB

export function apiBaseUrl(): string {
  return (process.env.FAIRVALUE_API_URL || DEFAULT_API_URL).replace(/\/+$/, "");
}

const METADATA_IDENTITY = "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity";
let idToken: { value: string; expiresAt: number } | null = null;

/** Seconds since the epoch at which a JWT expires, or null if it cannot be read. */
function jwtExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1] ?? "", "base64url").toString("utf8")) as { exp?: unknown };
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

/** Authorization header for the API: a cached Google identity token on Cloud Run, nothing elsewhere. Throws if the token cannot be fetched. */
export async function apiAuthHeaders(): Promise<Record<string, string>> {
  if (process.env.FAIRVALUE_API_AUTH !== "gcp-id-token") return {};
  const now = Date.now() / 1000;
  // Refresh five minutes early so a request never leaves with a token about to expire.
  if (!idToken || idToken.expiresAt - 300 < now) {
    const res = await fetch(`${METADATA_IDENTITY}?audience=${encodeURIComponent(apiBaseUrl())}`, {
      headers: { "Metadata-Flavor": "Google" },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`identity token: metadata server answered ${res.status}`);
    const value = (await res.text()).trim();
    idToken = { value, expiresAt: jwtExpiry(value) ?? now + 3000 };
  }
  return { Authorization: `Bearer ${idToken.value}` };
}

/** Test hook: forget the cached identity token. */
export function resetApiAuthForTests() {
  idToken = null;
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export async function forward(path: "/predict" | "/explain" | "/health" | "/metadata", init: { method: "GET" | "POST"; body?: string }): Promise<Response> {
  if (init.body && init.body.length > MAX_BODY_BYTES) return json({ detail: "Request too large" }, 413);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const auth = await apiAuthHeaders();
    const res = await fetch(`${apiBaseUrl()}${path}`, {
      method: init.method,
      body: init.body,
      headers: { ...auth, ...(init.body ? { "Content-Type": "application/json" } : {}) },
      signal: ctrl.signal,
      cache: "no-store",
    });
    const text = await res.text();
    return new Response(text, {
      status: res.status,
      headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json", "Cache-Control": "no-store" },
    });
  } catch {
    return json({ detail: "The valuation service is unreachable." }, 503);
  } finally {
    clearTimeout(timer);
  }
}

/** Server-side GET /health with its HTTP status, for verification. Never throws. */
export async function upstreamHealth(timeoutMs = 2_500): Promise<{ status: number | null; body: unknown }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${apiBaseUrl()}/health`, { headers: await apiAuthHeaders(), signal: ctrl.signal, cache: "no-store" });
    return { status: res.status, body: await res.json().catch(() => null) };
  } catch {
    return { status: null, body: null };
  } finally {
    clearTimeout(timer);
  }
}

/** Server-side fetch used by pages (e.g. the landing page's live example). Never throws; null when the API is down. */
export async function fetchUpstream<T>(path: "/predict" | "/health", body?: unknown, timeoutMs = 2_500): Promise<T | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const auth = await apiAuthHeaders();
    const res = await fetch(`${apiBaseUrl()}${path}`, {
      method: body ? "POST" : "GET",
      body: body ? JSON.stringify(body) : undefined,
      headers: { ...auth, ...(body ? { "Content-Type": "application/json" } : {}) },
      signal: ctrl.signal,
      // Never cached: the landing page labels this estimate "live", so it must be one.
      cache: "no-store",
    });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
