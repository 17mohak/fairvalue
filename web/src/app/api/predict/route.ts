import { forward } from "@/lib/api/upstream";

// Proxies to FastAPI POST /predict. Validation happens there (and in the form beforehand).
export async function POST(req: Request): Promise<Response> {
  return forward("/predict", { method: "POST", body: await req.text() });
}
