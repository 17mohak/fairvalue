import { forward } from "@/lib/api/upstream";

export const dynamic = "force-dynamic";

// Proxies to FastAPI GET /health so the UI can show whether the models are loaded.
export async function GET(): Promise<Response> {
  return forward("/health", { method: "GET" });
}
