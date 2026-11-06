import nextConfig from "../../../../next.config";

vi.mock("server-only", () => ({}));

const { GET } = await import("./route");

describe("player index route", () => {
  it("serves the full index as JSON", async () => {
    const res = GET();
    expect(res.headers.get("Content-Type")).toBe("application/json");
    const index = JSON.parse(await res.text());
    expect(index.total).toBe(index.players.length);
  });

  it("has its Content-Type set in next.config, so Next.js compresses it (D-052)", async () => {
    const rules = (await nextConfig.headers!()).filter((r) => r.source === "/api/players");
    expect(rules.flatMap((r) => r.headers)).toContainEqual({ key: "Content-Type", value: "application/json" });
  });
});
