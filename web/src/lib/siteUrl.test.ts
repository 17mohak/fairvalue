import { LOCAL_SITE_URL, siteUrl } from "./siteUrl";

describe("site URL (FAIRVALUE_SITE_URL)", () => {
  it("falls back to the local compose address when unset or blank", () => {
    expect(siteUrl(undefined).href).toBe(`${LOCAL_SITE_URL}/`);
    // Docker passes an empty build argument as an empty string, not undefined.
    expect(siteUrl("").href).toBe(`${LOCAL_SITE_URL}/`);
    expect(siteUrl("   ").href).toBe(`${LOCAL_SITE_URL}/`);
  });

  it("uses a valid deployment address", () => {
    expect(siteUrl("https://fairvalue.example").origin).toBe("https://fairvalue.example");
    expect(siteUrl(" https://fairvalue.example/ ").origin).toBe("https://fairvalue.example");
  });

  it("fails loudly on a malformed or non-web value instead of shipping localhost links", () => {
    expect(() => siteUrl("fairvalue.example")).toThrow(/not a valid URL/);
    expect(() => siteUrl("ftp://fairvalue.example")).toThrow(/http or https/);
  });
});
