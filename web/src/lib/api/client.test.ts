import { ApiError, predict } from "./client";
import type { PredictRequest } from "./types";
import { DEFAULT_PLAYER } from "@/lib/profile";

const req: PredictRequest = { player: DEFAULT_PLAYER, model: "A" };
const respond = (status: number, body: unknown) =>
  vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })) as unknown as typeof fetch;

describe("api client", () => {
  it("posts to the app's own proxy route, never the backend directly", async () => {
    const f = respond(200, { predicted_value_eur: 1 });
    await predict(req, f);
    expect(f).toHaveBeenCalledWith("/api/predict", expect.objectContaining({ method: "POST" }));
  });

  it.each([
    [422, "validation"],
    [501, "unsupported"],
    [503, "unavailable"],
    [500, "server"],
  ])("maps HTTP %d to a '%s' error", async (status, kind) => {
    await expect(predict(req, respond(status, { detail: "x" }))).rejects.toMatchObject({ kind, status });
  });

  it("treats a failed connection as a network error", async () => {
    const f = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    }) as unknown as typeof fetch;
    const err = await predict(req, f).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.kind).toBe("network");
  });
});
