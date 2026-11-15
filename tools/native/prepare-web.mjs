// tools/native/prepare-web.mjs — baut das Web-Paket für „Workflow Calculate Pro“ (Android und Windows, Klaus 15.11.2026).
//
// Vorbild Datei-Organizer Pro / BookLedgerPro: kein rekursives Kopieren des Repos, sondern nur die Laufzeit-Dateien aus
// `git ls-files` (Seiten, assets/, modules/, vendor/, icons/). Die Web-App bleibt byte-gleich, mit drei benannten Abweichungen:
//   · sw.js kommt nicht ins Paket, die Anmeldung des Service Workers wird aus der Kopie von index.html genommen
//     (in der App lädt alles aus dem Paket; ein Offline-Vorrat wäre doppelt und könnte alte Stände festhalten),
//   · native/wc-native.js wird ins Paket gelegt und in der Kopie von index.html früh geladen (die EINE Stelle der App-Unterschiede),
//   · nichts aus tests/, tools/, docs/, android/, windows/, .github/, keine Punktdateien, keine Quellbilder (icons/quelle/).
// Jede Abweichung, die nicht genau passt, bricht ab, statt zu raten.

import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join, dirname, resolve } from 'node:path';

export const root = fileURLToPath(new URL('../../', import.meta.url));
export const sha256 = (b) => createHash('sha256').update(b).digest('hex');

/** Was ins App-Paket darf: die Seiten und die Ordner, aus denen die Seiten laden. */
const SEITEN = ['index.html', 'impressum.html', 'datenschutz.html', 'sicherheit.html', 'manifest.json'];
const ORDNER = ['assets/', 'modules/', 'vendor/', 'icons/'];
/** Was nie hinein darf, auch wenn es in einem der Ordner liegt. */
export const NIE = [/(^|\/)\.[^/]+$/, /\.map$/, /^icons\/quelle\//, /\.md$/i];

export function istLaufzeit(p) {
  if (NIE.some((re) => re.test(p))) return false;
  return SEITEN.includes(p) || ORDNER.some((o) => p.startsWith(o));
}

/** Absolute Pfade in src/href würden unter https://localhost/ ins Leere zeigen. Rein, in Node prüfbar. */
export function absolutePfade(html) {
  return [...html.matchAll(/\s(?:src|href)="(\/[^"]*)"/g)].map((m) => m[1]);
}

export const GLUE_ZIEL = 'native/wc-native.js';
const ANKER_SUFFIX = '<script>window.SBKIM_DB_SUFFIX = "workflowcalculate";</script>';
const SW_BLOCK = /\n<script>\n  if \("serviceWorker" in navigator && location\.protocol !== "file:"\) \{\n    navigator\.serviceWorker\.register\("sw\.js"\)\.catch\(function \(\) \{\}\);\n  \}\n<\/script>/;

/** index.html für die App: Glue direkt nach der SBKIM-Schublade (vor jedem App-Skript), ohne Service-Worker-Anmeldung. Rein. */
export function appIndex(html) {
  if (html.split(ANKER_SUFFIX).length !== 2) throw new Error('index.html: SBKIM-Schublade nicht genau einmal gefunden');
  if (!SW_BLOCK.test(html)) throw new Error('index.html: Anmeldung des Service Workers nicht gefunden');
  return html.replace(SW_BLOCK, '').replace(ANKER_SUFFIX, ANKER_SUFFIX + '\n<script src="' + GLUE_ZIEL + '"></script>');
}

export async function prepareWeb({ wurzel = root } = {}) {
  const w = resolve(wurzel), aus = join(w, 'www');
  const alle = execFileSync('git', ['-C', w, 'ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
  const auswahl = alle.filter(istLaufzeit).sort();
  if (!auswahl.includes('index.html') || !auswahl.includes('assets/app.js')) throw new Error('Laufzeit-Dateien fehlen (index.html, assets/app.js)');
  const html = (await readFile(join(w, 'index.html'))).toString('utf8');
  const absolut = absolutePfade(html);
  if (absolut.length) throw new Error('index.html nutzt absolute Pfade: ' + absolut.join(', '));
  for (const m of html.matchAll(/\s(?:src|href)="([^"?#:]+)(?:\?[^"]*)?"/g)) {
    if (!auswahl.includes(m[1])) throw new Error('index.html verweist auf eine Datei, die nicht ins Paket kommt: ' + m[1]);
  }
  await rm(aus, { recursive: true, force: true });
  await mkdir(aus, { recursive: true });
  const beleg = {
    quelle: 'Workflow-Calculate', app: 'Workflow Calculate Pro',
    abweichungen: ['sw.js nicht im App-Paket, Anmeldung aus index.html genommen (kein Offline-Vorrat in der App)',
      'index.html lädt ' + GLUE_ZIEL + ' (App-Unterschiede: Name, Speichern unter, Drucken, Updates)'],
    dateien: [],
  };
  for (const p of auswahl) {
    let b = await readFile(join(w, p));
    if (p === 'index.html') b = Buffer.from(appIndex(b.toString('utf8')), 'utf8');
    await mkdir(dirname(join(aus, p)), { recursive: true });
    await writeFile(join(aus, p), b);
    beleg.dateien.push({ pfad: p, sha256: sha256(b) });
  }
  const glue = await readFile(join(w, 'native', 'wc-native.js'));
  await mkdir(join(aus, 'native'), { recursive: true });
  await writeFile(join(aus, GLUE_ZIEL), glue);
  beleg.dateien.push({ pfad: GLUE_ZIEL, sha256: sha256(glue) });
  try { beleg.commit = execFileSync('git', ['-C', w, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(); } catch { /* ohne Git-Kopf */ }
  await writeFile(join(aus, 'native-bundle.json'), JSON.stringify(beleg, null, 2) + '\n');
  console.log('Natives Web-Paket: ' + beleg.dateien.length + ' Dateien nach www/');
  return beleg;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await prepareWeb();
