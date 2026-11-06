import { EXPECTED_SERVICE as EXPECTED } from "@/lib/api/expected";
import { apiAuthHeaders, apiBaseUrl } from "@/lib/api/upstream";
import { verifyHealth } from "@/lib/api/verify";

export const dynamic = "force-dynamic";

/**
 * Proxies FastAPI GET /health and adds a verdict: "online" only when the loaded models and the
 * dataset fingerprint match the research registry, "unverified" when something else answers,
 * "offline" when nothing usable does. 503 for offline, so clients treat it as unavailable.
 */
export async function GET(): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4_000);
  let status: number | null = null;
  let body: unknown = null;
  try {
    // The API is private on Cloud Run (D-052): without the identity token it answers 403.
    const res = await fetch(`${apiBaseUrl()}/health`, { headers: await apiAuthHeaders(), cache: "no-store", signal: ctrl.signal });
    status = res.status;
    body = await res.json().catch(() => null);
  } catch {
    status = null;
  } finally {
    clearTimeout(timer);
  }
  const service = verifyHealth(status, body, EXPECTED);
  const upstream = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  return new Response(JSON.stringify({ ...upstream, status: upstream.status ?? "unreachable", service }), {
    status: service.state === "offline" ? 503 : 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
