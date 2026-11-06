import { forward } from "@/lib/api/upstream";

// Proxies to FastAPI POST /explain (per-prediction SHAP contributions).
export async function POST(req: Request): Promise<Response> {
  return forward("/explain", { method: "POST", body: await req.text() });
}
