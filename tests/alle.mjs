/* npm test — beide Proben nacheinander. Rückgabe: 0 grün · 1 rot · 2 nicht lauffähig.
   „nicht lauffähig" (kein Browser) ist nie grün. */
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const H = dirname(fileURLToPath(import.meta.url));
let schlimmst = 0;
for (const p of ["kern.mjs", "browser.mjs"]) {
  const r = spawnSync(process.execPath, [join(H, p)], { stdio: "inherit" });
  const c = r.status == null ? 1 : r.status;
  if (c === 2 && schlimmst === 0) schlimmst = 2;
  if (c === 1) schlimmst = 1;
}
console.log(schlimmst === 0 ? "ALLE GRÜN" : schlimmst === 2 ? "NICHT LAUFFÄHIG (kein Browser) — das ist nicht grün" : "ROT");
process.exit(schlimmst);
