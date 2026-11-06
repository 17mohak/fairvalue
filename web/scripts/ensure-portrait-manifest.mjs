// The FootyLogos card manifest (src/data/generated/portrait_cards_fl.json) is git-ignored because the
// images it lists are unlicensed (D-044). The app imports it statically, so a clean checkout (CI, a
// fresh deploy worktree) would not compile. This writes an empty manifest when the file is missing:
// the site then shows monograms instead of FootyLogos portraits. An existing file is never touched.
// Runs automatically before dev, build, typecheck and test (see package.json "pre" scripts).
import fs from "node:fs";
import path from "node:path";

const root = path.dirname(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")));
const file = path.join(root, "src/data/generated/portrait_cards_fl.json");

if (!fs.existsSync(file)) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ footylogos: [] }) + "\n");
  console.warn(
    "portrait_cards_fl.json was missing: wrote an empty one, so no FootyLogos portraits will show. " +
      "Build the real one with scripts/portraits/build_card_assets.py or copy it in.",
  );
}
