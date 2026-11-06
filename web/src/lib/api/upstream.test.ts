export {};

vi.mock("server-only", () => ({}));

const { forward, resetApiAuthForTests } = await import("./upstream");

const jwt = (exp: number) => `h.${Buffer.from(JSON.stringify({ exp })).toString("base64url")}.s`;

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  resetApiAuthForTests();
});

describe("upstream API calls", () => {
  it("send no Authorization header outside Cloud Run", async () => {
    const calls: [string, RequestInit][] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => (calls.push([url, init]), new Response("{}"))));
    await forward("/health", { method: "GET" });
    expect(calls).toHaveLength(1);
    expect((calls[0]![1].headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it("on Cloud Run, fetch an identity token for the API's URL once, cache it and send it", async () => {
    vi.stubEnv("FAIRVALUE_API_AUTH", "gcp-id-token");
    vi.stubEnv("FAIRVALUE_API_URL", "https://fairvalue-api-123.asia-south1.run.app/");
    const token = jwt(Math.floor(Date.now() / 1000) + 3600);
    const calls: [string, RequestInit][] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: RequestInit) => {
        calls.push([url, init]);
        return url.startsWith("http://metadata.google.internal") ? new Response(token) : new Response("{}");
      }),
    );
    await forward("/health", { method: "GET" });
    await forward("/predict", { method: "POST", body: "{}" });
    const meta = calls.filter(([u]) => u.startsWith("http://metadata.google.internal"));
    expect(meta).toHaveLength(1); // cached for the second call
    expect(meta[0]![0]).toContain(`audience=${encodeURIComponent("https://fairvalue-api-123.asia-south1.run.app")}`);
    expect((meta[0]![1].headers as Record<string, string>)["Metadata-Flavor"]).toBe("Google");
    const api = calls.filter(([u]) => u.startsWith("https://fairvalue-api"));
    expect(api.map(([, i]) => (i.headers as Record<string, string>).Authorization)).toEqual([`Bearer ${token}`, `Bearer ${token}`]);
    expect((api[1]![1].headers as Record<string, string>)["Content-Type"]).toBe("application/json");
  });

  it("refreshes a token that is about to expire", async () => {
    vi.stubEnv("FAIRVALUE_API_AUTH", "gcp-id-token");
    let n = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => (url.startsWith("http://metadata") ? new Response(jwt(Math.floor(Date.now() / 1000) + 60 + n++)) : new Response("{}"))),
    );
    await forward("/health", { method: "GET" });
    await forward("/health", { method: "GET" });
    expect(n).toBe(2); // expiring within five minutes, so fetched again
  });

  it("turns a failed token fetch into a clean 503, never a call without credentials", async () => {
    vi.stubEnv("FAIRVALUE_API_AUTH", "gcp-id-token");
    const apiCalls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => (url.startsWith("http://metadata") ? new Response("no", { status: 500 }) : (apiCalls.push(url), new Response("{}")))),
    );
    const res = await forward("/predict", { method: "POST", body: "{}" });
    expect(res.status).toBe(503);
    expect(apiCalls).toHaveLength(0);
  });
});
