export {};

vi.mock("server-only", () => ({}));

const { GET } = await import("./route");

// A fake API that answers after `ms`, and gives up like a real fetch when the caller aborts.
function slowApi(ms: number) {
  return vi.fn(
    (_url: string, init: RequestInit) =>
      new Promise<Response>((resolve, reject) => {
        const t = setTimeout(() => resolve(new Response(JSON.stringify({ status: "ok" }))), ms);
        init.signal?.addEventListener("abort", () => (clearTimeout(t), reject(new DOMException("aborted", "AbortError"))));
      }),
  );
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("GET /api/health", () => {
  it("waits for a cold-starting API (11.5 s on Cloud Run) instead of calling it unreachable", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", slowApi(11_500));
    const pending = GET();
    await vi.advanceTimersByTimeAsync(11_500);
    const body = await (await pending).json();
    expect(body.status).toBe("ok");
  });

  it("still gives up on an API that never answers", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", slowApi(60_000));
    const pending = GET();
    await vi.advanceTimersByTimeAsync(20_000);
    const res = await pending;
    expect(res.status).toBe(503);
    expect((await res.json()).status).toBe("unreachable");
  });
});
