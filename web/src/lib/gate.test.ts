import { authorised, gateConfig, noindex, OPEN_PATHS } from "./gate";

const basic = (user: string, pass: string) => `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}`;

describe("reviewer gate", () => {
  it("is off unless a password is set, and defaults the user name", () => {
    expect(gateConfig({})).toBeNull();
    expect(gateConfig({ FAIRVALUE_REVIEW_PASSWORD: "" })).toBeNull();
    expect(gateConfig({ FAIRVALUE_REVIEW_PASSWORD: "s3cret" })).toEqual({ user: "fairvalue", password: "s3cret" });
    expect(gateConfig({ FAIRVALUE_REVIEW_PASSWORD: "s3cret", FAIRVALUE_REVIEW_USER: " jury " })).toEqual({ user: "jury", password: "s3cret" });
  });

  it("accepts only the exact user and password", () => {
    const cfg = { user: "fairvalue", password: "s3cret:with:colons" };
    expect(authorised(basic("fairvalue", "s3cret:with:colons"), cfg)).toBe(true);
    expect(authorised(basic("fairvalue", "wrong"), cfg)).toBe(false);
    expect(authorised(basic("someone", "s3cret:with:colons"), cfg)).toBe(false);
    expect(authorised(null, cfg)).toBe(false);
    expect(authorised("Bearer abc", cfg)).toBe(false);
    expect(authorised("Basic !!!not-base64!!!", cfg)).toBe(false);
    expect(authorised(`Basic ${Buffer.from("no-colon").toString("base64")}`, cfg)).toBe(false);
  });

  it("leaves only the liveness check open", () => {
    expect([...OPEN_PATHS]).toEqual(["/api/ping"]);
  });
});

describe("search engines", () => {
  it("are kept out by default and let in only by FAIRVALUE_NOINDEX=0", () => {
    expect(noindex({})).toBe(true);
    expect(noindex({ FAIRVALUE_NOINDEX: "1" })).toBe(true);
    expect(noindex({ FAIRVALUE_NOINDEX: "0" })).toBe(false);
  });
});
