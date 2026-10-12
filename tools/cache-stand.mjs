/* Hält fest, zu welchem Inhalt des Vorrats (CORE in sw.js) die CACHE_VERSION gehört.
   Wer eine Datei aus CORE ändert, erhöht CACHE_VERSION in sw.js und ruft dann
   node tools/cache-stand.mjs — sonst wird tests/kern.mjs rot. */
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const W = join(dirname(fileURLToPath(import.meta.url)), "..");
const sw = readFileSync(join(W, "sw.js"), "utf8");
const core = JSON.parse(sw.match(/const CORE = (\[[\s\S]*?\]);/)[1]);
const h = createHash("sha256");
core.filter((u) => u !== "./").sort().forEach((u) => h.update(u + "\0").update(readFileSync(join(W, u.replace(/\?.*$/, "")))));
const version = sw.match(/CACHE_VERSION = "([^"]+)"/)[1];
const alt = (() => { try { return JSON.parse(readFileSync(join(W, "tests/cache-stand.json"), "utf8")); } catch { return null; } })();
const sha = h.digest("hex");
if (alt && alt.sha !== sha && alt.version === version) {
  console.error("Der Vorrat hat sich geändert, aber CACHE_VERSION ist noch " + version + ". Erst in sw.js erhöhen.");
  process.exit(1);
}
writeFileSync(join(W, "tests/cache-stand.json"), JSON.stringify({ version, sha }, null, 1) + "\n");
console.log("cache-stand: " + version + " " + sha.slice(0, 12));
