// Copies the flag SVGs named in src/data/countries.json from the flag-icons package (MIT) into
// public/flags, so the app ships only the flags it uses and needs no runtime dependency.
// Run after changing countries.json:  node scripts/sync-flags.mjs
import fs from "node:fs";
import path from "node:path";

const root = path.dirname(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")));
const { flags } = JSON.parse(fs.readFileSync(path.join(root, "src/data/countries.json"), "utf8"));
const src = path.join(root, "node_modules/flag-icons/flags/4x3");
const dest = path.join(root, "public/flags");
fs.rmSync(dest, { recursive: true, force: true });
fs.mkdirSync(dest, { recursive: true });
const codes = [...new Set(Object.values(flags).filter(Boolean))];
for (const c of codes) fs.copyFileSync(path.join(src, `${c}.svg`), path.join(dest, `${c}.svg`));
fs.copyFileSync(path.join(root, "node_modules/flag-icons/LICENSE"), path.join(dest, "LICENSE-flag-icons.txt"));
console.log(`Copied ${codes.length} flags to public/flags`);
