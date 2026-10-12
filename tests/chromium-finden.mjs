/*
 * Wo liegt der Browser? — EINE Stelle für alle Browser-Proben.
 *
 * ⚠ HIER STANDEN BIS ZUM 2026-09-25 ZEHN KOPIEN DIESER FUNKTION, und zwei davon
 * waren schon auseinandergelaufen: `smoke_buehne` und `smoke_zettelknopf_seite`
 * lasen `PLAYWRIGHT_BROWSERS_PATH` gar nicht, die übrigen acht nahmen den
 * Headless-Shell nicht als Rückfall. Zehn Fassungen derselben Frage.
 *
 * ⚠ UND ALLE ZEHN SUCHTEN NUR `chrome-linux/chrome`. Das ist die Ablage der
 * alten Chromium-Builds (hier im Sitzungs-Behälter: `chromium-1194`).
 * `playwright-core 1.62.1` — die Fassung, die `package.json` festnagelt —
 * installiert auf linux-x64 **Chrome for Testing** und legt es unter
 * `chromium-1234/chrome-linux64/chrome` ab (nachgesehen in `coreBundle.js`,
 * `EXECUTABLE_PATHS`, nicht geraten). Auf einer frisch eingerichteten Maschine
 * — Klaus' Hetzner-Server — hätte keine der zehn den Browser gefunden: jede
 * Browser-Probe „nicht lauffähig", jeder `fallb`-Fall der Gegenprobe
 * „NICHT GEFANGEN", obwohl sein Wächter tadellos ist. Ein ganzer
 * Neun-Stunden-Lauf voller falscher Befunde.
 *
 * Gesucht wird deshalb in dieser Reihenfolge, jeweils die höchste Build-Nummer
 * zuerst:
 *   1. `chromium-<n>/chrome-linux64/chrome`   (Chrome for Testing, ab 1.57)
 *   2. `chromium-<n>/chrome-linux/chrome`     (alte Builds, arm64)
 *   3. `chromium_headless_shell-<n>/chrome-headless-shell-linux64/…`
 *
 * Die Build-Nummer wird GELESEN, nicht geraten: eine feste Nummer wäre beim
 * nächsten Container-Bau lautlos falsch.
 */
import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

export const WEGE = [
  { muster: /^chromium-(\d+)$/, teile: ["chrome-linux64", "chrome"] },
  { muster: /^chromium-(\d+)$/, teile: ["chrome-linux", "chrome"] },
  { muster: /^chromium_headless_shell-(\d+)$/, teile: ["chrome-headless-shell-linux64", "chrome-headless-shell"] },
];

export function findeChromium(heim = process.env.PLAYWRIGHT_BROWSERS_PATH || "/opt/pw-browsers") {
  let eintraege = [];
  try { eintraege = readdirSync(heim); } catch { return null; }
  for (const w of WEGE) {
    const ordner = eintraege
      .map((n) => { const m = w.muster.exec(n); return m ? { n, nr: Number(m[1]) } : null; })
      .filter(Boolean)
      .sort((a, b) => b.nr - a.nr);
    for (const o of ordner) {
      const weg = join(heim, o.n, ...w.teile);
      if (existsSync(weg)) return weg;
    }
  }
  return null;
}
