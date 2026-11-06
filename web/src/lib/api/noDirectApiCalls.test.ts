import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// On Cloud Run the API is private (D-052): every call needs apiAuthHeaders(). A route that
// fetches the API by itself would be refused with 403, which the 2026-11-06 deploy showed for
// /api/health. So any file that calls the API must also send the token.
function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f) ? [p] : [];
  });
}

describe("calls to the private API", () => {
  it("always send the identity token", () => {
    const offenders = files(join(__dirname, "..", ".."))
      .filter((p) => /fetch\(`\$\{apiBaseUrl\(\)\}/.test(readFileSync(p, "utf8")))
      .filter((p) => {
        const src = readFileSync(p, "utf8");
        const calls = src.match(/fetch\(`\$\{apiBaseUrl\(\)\}[^;]*;/g) ?? [];
        return calls.some((c) => !/apiAuthHeaders\(\)|\.\.\.auth/.test(c));
      });
    expect(offenders).toEqual([]);
  });
});
