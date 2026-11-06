// Browser-side API client. It only talks to this app's own /api/* routes, which proxy to the
// FastAPI service on the server; the API's address never reaches the browser.

import { checkService, getServiceStatus, setServiceStatus } from "./service";
import type { ExplainResponse, HealthResponse, PredictRequest, PredictResponse } from "./types";

export type ApiErrorKind = "validation" | "unavailable" | "unsupported" | "server" | "network";

export class ApiError extends Error {
  constructor(
    public kind: ApiErrorKind,
    message: string,
    public status: number,
    public detail?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const TIMEOUT_MS = 15_000;

async function request<T>(path: string, init?: RequestInit, fetchImpl: typeof fetch = fetch): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetchImpl(path, { ...init, signal: ctrl.signal, headers: { "Content-Type": "application/json", ...init?.headers } });
  } catch {
    setServiceStatus({ state: "offline", reason: "Couldn't reach FairValue." });
    throw new ApiError("network", "Couldn't reach FairValue. Check your connection and try again.", 0);
  } finally {
    clearTimeout(timer);
  }
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (res.ok) {
    // A prediction succeeded after an outage: ask the health check again rather than assume.
    if (path !== "/api/health" && getServiceStatus().state === "offline") void checkService(fetchImpl);
    return body as T;
  }

  const detail = (body as { detail?: unknown } | null)?.detail;
  if (res.status === 422) throw new ApiError("validation", "Some inputs are outside what the model supports.", 422, detail);
  if (res.status === 501) throw new ApiError("unsupported", typeof detail === "string" ? detail : "Not supported by this server.", 501, detail);
  if (res.status === 503 || res.status === 502 || res.status === 504) {
    if (path !== "/api/health") setServiceStatus({ state: "offline", reason: "The prediction API stopped answering." });
    throw new ApiError("unavailable", "The valuation service isn't responding right now. Try again in a minute.", res.status, detail);
  }
  throw new ApiError("server", typeof detail === "string" ? detail : "The valuation service hit an error.", res.status, detail);
}

export function predict(req: PredictRequest, fetchImpl?: typeof fetch): Promise<PredictResponse> {
  return request<PredictResponse>("/api/predict", { method: "POST", body: JSON.stringify(req) }, fetchImpl);
}

export function explain(req: PredictRequest, fetchImpl?: typeof fetch): Promise<ExplainResponse> {
  return request<ExplainResponse>("/api/explain", { method: "POST", body: JSON.stringify(req) }, fetchImpl);
}

export function health(fetchImpl?: typeof fetch): Promise<HealthResponse> {
  return request<HealthResponse>("/api/health", { method: "GET" }, fetchImpl);
}
