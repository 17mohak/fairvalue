// Liveness check for the container (Docker HEALTHCHECK). Stays outside the reviewer gate,
// says nothing about the data or the model, and never calls the API.
export const dynamic = "force-dynamic";

export function GET() {
  return new Response("ok", { headers: { "Content-Type": "text/plain", "Cache-Control": "no-store" } });
}
