import fs from "node:fs";
import path from "node:path";

// Global utility classes used inside CSS modules must be wrapped in :global(), or the module
// hashes them and the rule silently never matches (this happened three times).
const GLOBAL_CLASSES = ["num", "prose", "eyebrow", "fv-role", "fv-chip", "fv-label", "fv-source"];

function moduleFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? moduleFiles(p) : p.endsWith(".module.css") ? [p] : [];
  });
}

describe("CSS modules", () => {
  it("never reference global utility classes without :global()", () => {
    const offenders: string[] = [];
    for (const file of moduleFiles(path.join(process.cwd(), "src"))) {
      const css = fs.readFileSync(file, "utf8").replace(/:global\([^)]*\)/g, "");
      for (const cls of GLOBAL_CLASSES) {
        const re = new RegExp(`\\.${cls.replace("-", "\\-")}(?![\\w-])`, "g");
        if (re.test(css)) offenders.push(`${path.relative(process.cwd(), file)}: .${cls}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
