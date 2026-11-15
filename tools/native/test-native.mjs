// Probe der Hüllen ohne Android und ohne Windows (Workflow Calculate Pro, Klaus 15.11.2026): Web-Paket, Kennungen, Fassungen,
// Rechte, Plugins und Verträge, Update-Feed, und das App-Paket im echten Browser mit gestellter Brücke (Name Pro, Speichern unter
// statt <a download>, Drucken, keine Spracheingabe, kein Installieren-Knopf, Update-Fähnchen) — und die PWA bleibt davon unberührt.
//   node tools/native/test-native.mjs      Rückgabe 0 grün · 1 rot · 2 nicht lauffähig (kein Browser)
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, extname } from 'node:path';
import { createServer } from 'node:http';
import { prepareWeb, absolutePfade, istLaufzeit, appIndex, root, GLUE_ZIEL } from './prepare-web.mjs';
import { findeChromium } from '../../tests/chromium-finden.mjs';

let gruen = 0, rot = 0;
const soll = (name, bed, mehr = '') => { if (bed) { gruen++; console.log('  ✓ ' + name); } else { rot++; console.log('  ✗ ROT: ' + name + (mehr ? ' – ' + mehr : '')); } };
const lies = (p) => readFile(join(root, p), 'utf8');
const JAVA = 'android/app/src/main/java/de/familyprojekt/workflowcalculate/';

console.log('Web-Paket');
const beleg = await prepareWeb();
const www = join(root, 'www');
soll('index.html im Paket', existsSync(join(www, 'index.html')));
soll('Service Worker nicht im Paket', !existsSync(join(www, 'sw.js')));
soll('Glue im Paket', existsSync(join(www, GLUE_ZIEL)));
soll('SBKIM-Module, Bedeutungssuche (vendor/sbkim) und Symbole im Paket', ['modules/23_rendezvous.js', 'vendor/sbkim/03_embedding.js', 'icons/icon-192.png', 'assets/wfpdf/sprechen.js'].every((p) => existsSync(join(www, p))));
soll('nichts aus tests/, tools/, docs/, android/, windows/, keine Quellbilder', !['tests', 'tools', 'docs', 'android', 'windows', 'icons/quelle', 'node_modules', 'package.json'].some((p) => existsSync(join(www, p))));
soll('Beleg nennt jede Datei mit Prüfsumme', beleg.dateien.length > 40 && beleg.dateien.every((d) => /^[a-f0-9]{64}$/.test(d.sha256)));
{
  let gleich = true, n = 0;
  for (const d of beleg.dateien) {
    if (d.pfad === 'index.html' || d.pfad === GLUE_ZIEL) continue;
    n++; if (!(await readFile(join(root, d.pfad))).equals(await readFile(join(www, d.pfad)))) { gleich = false; console.log('    weicht ab: ' + d.pfad); }
  }
  soll('alle übrigen Dateien byte-gleich mit dem Repo (PWA-Stand)', gleich && n > 40, String(n));
  const html = await lies('index.html'), app = await readFile(join(www, 'index.html'), 'utf8');
  soll('index.html der App = index.html der PWA + Glue − Service-Worker-Anmeldung', app === appIndex(html) && app.includes('<script src="native/wc-native.js"></script>') && !app.includes('serviceWorker'));
  soll('Glue lädt vor jedem App-Skript (gleich nach der SBKIM-Schublade)', app.indexOf('native/wc-native.js') < app.indexOf('assets/kern/geld.js') && app.indexOf('SBKIM_DB_SUFFIX') < app.indexOf('native/wc-native.js'));
  let ab = false; try { appIndex(html.replace('navigator.serviceWorker.register', 'navigator.serviceWorker.x')); } catch { ab = true; }
  soll('fehlt die Service-Worker-Anmeldung, bricht der Bau ab (nicht raten)', ab);
}
soll('absolute Pfade werden erkannt', absolutePfade('<script src="/assets/x.js"></script><link href="./a.css">').join() === '/assets/x.js');
soll('index.html im Paket nutzt nur relative Pfade', absolutePfade(await readFile(join(www, 'index.html'), 'utf8')).length === 0);
soll('Punktdateien, Quellkarten, sw.js, Doku nie im Paket', !istLaufzeit('.gitignore') && !istLaufzeit('assets/a.js.map') && !istLaufzeit('sw.js') && !istLaufzeit('docs/x.md') && !istLaufzeit('icons/quelle/a.png') && istLaufzeit('assets/app.js'));
soll('die PWA (index.html im Repo) lädt den Glue nicht', !(await lies('index.html')).includes('wc-native') && !(await lies('sw.js')).includes('wc-native'));

console.log('Kennungen und Namen');
const cap = JSON.parse(await lies('capacitor.config.json'));
const gradle = await lies('android/app/build.gradle'), strings = await lies('android/app/src/main/res/values/strings.xml');
soll('Paket de.familyprojekt.workflowcalculate überall', cap.appId === 'de.familyprojekt.workflowcalculate' && gradle.includes('applicationId "de.familyprojekt.workflowcalculate"') && gradle.includes('namespace = "de.familyprojekt.workflowcalculate"'));
soll('App heißt „Workflow Calculate Pro“', cap.appName === 'Workflow Calculate Pro' && strings.includes('<string name="app_name">Workflow Calculate Pro</string>') && (await lies('native/wc-native.js')).includes('var NAME = "Workflow Calculate Pro"'));
soll('PWA heißt weiter „Workflow Calculate“ (manifest.json, index.html)', JSON.parse(await lies('manifest.json')).name === 'Workflow Calculate' && (await lies('index.html')).includes('<b id="app-name">Workflow Calculate</b>'));
soll('webDir www, keine Fehlersuche in der WebView', cap.webDir === 'www' && cap.android?.webContentsDebuggingEnabled === false && cap.android?.allowMixedContent === false);

console.log('Fassung');
const pkg = JSON.parse(await lies('package.json'));
const vName = (/versionName "([^"]+)"/.exec(gradle) || [])[1], vCode = Number((/versionCode (\d+)/.exec(gradle) || [])[1]);
soll('package.json = versionName', pkg.version === vName, [pkg.version, vName].join(' / '));
{ const [a, b, c] = vName.split('.').map(Number); soll('versionCode passt zur Fassung (Haupt×1000 + Neben×10 + Flick)', vCode === a * 1000 + b * 10 + c, String(vCode)); }

console.log('Rechte und Freigaben');
const manifest = await lies('android/app/src/main/AndroidManifest.xml');
const rechte = [...manifest.matchAll(/uses-permission android:name="([^"]+)"/g)].map((m) => m[1]).sort();
soll('nur INTERNET und REQUEST_INSTALL_PACKAGES', JSON.stringify(rechte) === JSON.stringify(['android.permission.INTERNET', 'android.permission.REQUEST_INSTALL_PACKAGES']), rechte.join());
soll('keine Android-Sicherung des App-Speichers, kein Klartext-Netz', manifest.includes('android:allowBackup="false"') && manifest.includes('android:usesCleartextTraffic="false"'));
soll('kein Teilen/„Öffnen mit“ (Calculate braucht keinen Eingang)', !manifest.includes('action.SEND"') && !manifest.includes('SEND_MULTIPLE'));
const pfade = await lies('android/app/src/main/res/xml/file_paths.xml');
soll('FileProvider gibt nur update/ frei', [...pfade.matchAll(/<(\w+-path)/g)].length === 1 && pfade.includes('<cache-path name="update" path="update/" />'));

console.log('Plugins');
const main = await lies(JAVA + 'MainActivity.java'), upd = await lies(JAVA + 'WcUpdatesPlugin.java'), feed = await lies(JAVA + 'UpdateFeed.java'), dat = await lies(JAVA + 'WcDateienPlugin.java');
const glue = await lies('native/wc-native.js');
soll('MainActivity meldet genau WcUpdates und WcDateien an', main.includes('registerPlugin(WcUpdatesPlugin.class)') && main.includes('registerPlugin(WcDateienPlugin.class)') && [...main.matchAll(/registerPlugin\(/g)].length === 2);
soll('MainActivity: nur https://localhost im Fenster, Schrift 100 %', main.includes('"localhost".equals(uri.getHost())') && main.includes('setTextZoom(100)') && main.includes('"mailto"'));
soll('Speichern-Plugin „WcDateien“: speichern (Zwischenspeicher vor dem Dialog), drucken (PrintManager), appInfo', dat.includes('@CapacitorPlugin(name = "WcDateien")') && ['speichern', 'drucken', 'appInfo'].every((m) => dat.includes('public void ' + m + '(PluginCall call)')) && dat.includes('ACTION_CREATE_DOCUMENT') && dat.includes('getCacheDir()') && dat.includes('createPrintDocumentAdapter'));
soll('Update-Plugin heißt „WcUpdates“ (pruefen, installieren) wie im Glue', upd.includes('@CapacitorPlugin(name = "WcUpdates")') && ['pruefen', 'installieren'].every((m) => upd.includes('public void ' + m + '(PluginCall call)')) && glue.includes('P.WcUpdates'));
soll('nie call.getLong (kleine Zahlen kommen als Integer)', ![upd, dat, main].some((t) => /call\.getLong\(/.test(t)));
soll('Feed-Adresse family-projekt.de/updates/workflow-calculate/', feed.includes('"https://family-projekt.de/updates/workflow-calculate/"') && feed.includes('"workflow-calculate".equals'));
const schluessel = (/static final String SCHLUESSEL = "([^"]*)"/.exec(feed) || [])[1];
soll('Update-Schlüssel: Platzhalter leer oder gültiger Ed25519-Schlüssel', schluessel === '' || /^MCowBQYDK2VwAyEA[A-Za-z0-9+/]{43}=$/.test(schluessel));
if (schluessel === '') console.log('  · Hinweis: öffentlicher Update-Schlüssel fehlt noch (Klaus, docs/ANDROID.md Schritt b) – Updates melden still „nicht eingerichtet“.');

console.log('Windows (gleiche Verträge wie Android)');
{
  const vertr = JSON.parse(await lies('windows/bridge/contracts.json'));
  const tauri = JSON.parse(await lies('windows/src-tauri/tauri.conf.json')), cargo = await lies('windows/src-tauri/Cargo.toml'), wpkg = JSON.parse(await lies('windows/package.json'));
  soll('Windows-Fassung = Fassung (tauri.conf, Cargo.toml, windows/package.json)', tauri.version === vName && cargo.includes(`version = "${vName}"`) && wpkg.version === vName, [tauri.version, wpkg.version].join(' / '));
  soll('Windows heißt „Workflow Calculate Pro“, Kennung wie Android', tauri.productName === 'Workflow Calculate Pro' && tauri.identifier === 'de.familyprojekt.workflowcalculate');
  const java = { WcUpdates: upd, WcDateien: dat };
  for (const [plugin, methoden] of Object.entries(vertr)) for (const m of methoden)
    soll(`Windows-Vertrag ${plugin}.${m} gibt es auch unter Android`, (java[plugin] || '').includes('public void ' + m + '(PluginCall call)'));
  for (const m of [...glue.matchAll(/P\.(Wc\w+)\.(\w+)\(/g)]) if (m[2] !== 'drucken')
    soll(`Glue ruft ${m[1]}.${m[2]} – steht im Windows-Vertrag`, (vertr[m[1]] || []).includes(m[2]));
  soll('Glue ruft WcUpdates.pruefen/installieren – stehen im Windows-Vertrag', ['pruefen', 'installieren'].every((m) => (vertr.WcUpdates || []).includes(m) && glue.includes('u.' + m + '()')));
  const wSchl = (/static final String SCHLUESSEL = "([^"]*)"/.exec(await lies('windows/engine/src/DesktopUpdates.java')) || [])[1];
  soll('Update-Schlüssel unter Windows = Android (ein Schlüssel für beide)', wSchl === schluessel);
  soll('Windows-Updates aus dem eigenen Ordner', (await lies('windows/engine/src/DesktopUpdates.java')).includes('"https://family-projekt.de/updates/workflow-calculate/"'));
}

console.log('Update-Feed');
{
  const t = await mkdtemp(join(tmpdir(), 'wc-feed-'));
  try {
    const apk = join(t, `Workflow-Calculate-Pro-${vName}.apk`); await writeFile(apk, Buffer.from('probe'));
    execFileSync(process.execPath, [join(root, 'tools/native/update-feed-android.mjs'), apk, join(t, 'aktuell-android.json')], { stdio: 'pipe' });
    const f = JSON.parse(await readFile(join(t, 'aktuell-android.json'), 'utf8'));
    soll('Feed: app, Version, Dateiname, versionCode, Prüfsumme', f.format === 1 && f.app === 'workflow-calculate' && f.version === vName && f.android.datei === `Workflow-Calculate-Pro-${vName}.apk` && f.android.versionCode === vCode && f.android.groesse === 5 && /^[a-f0-9]{64}$/.test(f.android.sha256));
    const falsch = join(t, 'BookLedgerPro-' + vName + '.apk'); await writeFile(falsch, 'x');
    let ab = false; try { execFileSync(process.execPath, [join(root, 'tools/native/update-feed-android.mjs'), falsch, join(t, 'x.json')], { stdio: 'pipe' }); } catch { ab = true; }
    soll('Feed: fremder Dateiname wird abgewiesen', ab);
  } finally { await rm(t, { recursive: true, force: true }); }
}

console.log('App-Paket im Browser (Wurzel wie https://localhost/, Capacitor gestellt)');
let chromium = null; const pfad = findeChromium();
try { ({ chromium } = await import('playwright-core')); } catch { /* unten */ }
if (!chromium || !pfad) { console.log('nicht lauffähig: playwright-core oder Chromium fehlt'); console.log(`Native: ${gruen} grün · ${rot} ROT`); process.exit(rot ? 1 : 2); }
{
  const TYP = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp' };
  const dienst = (basis) => createServer(async (q, r) => {
    try { let p = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'; if (p.includes('..') || p.includes('node_modules')) throw 0;
      const b = await readFile(join(basis, p)); r.writeHead(200, { 'content-type': TYP[extname(p)] || 'application/octet-stream' }); r.end(b); }
    catch { r.writeHead(404); r.end(); }
  });
  const srv = dienst(www), pwa = dienst(root);
  await new Promise((ok) => srv.listen(0, '127.0.0.1', ok)); await new Promise((ok) => pwa.listen(0, '127.0.0.1', ok));
  const browser = await chromium.launch({ executablePath: pfad });
  try {
    const ctx = await browser.newContext({ viewport: { width: 420, height: 860 } });
    // Fremde Adressen (Relais, Modell) sperren: die Probe misst nur die App.
    await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
    await ctx.addInitScript(() => {
      window.__aufrufe = [];
      const rufe = (plugin, method, o) => { window.__aufrufe.push({ plugin, method, o }); };
      let neu = '1.0.1';
      window.__setzeNeu = (v) => { neu = v; };
      const hoerer = {};
      window.Capacitor = { isNativePlatform: () => true, getPlatform: () => 'android', Plugins: {
        WcDateien: {
          appInfo: async () => { rufe('WcDateien', 'appInfo'); return { version: '1.0.0', plattform: 'android' }; },
          speichern: async (o) => { rufe('WcDateien', 'speichern', o); return { gespeichert: true, name: o.name }; },
          drucken: async (o) => { rufe('WcDateien', 'drucken', o); return { gestartet: true }; },
        },
        WcUpdates: {
          pruefen: async () => { rufe('WcUpdates', 'pruefen'); return neu ? { neu, installiert: '1.0.0', groesse: 10 } : { aktuell: true, version: '1.0.0', installiert: '1.0.0' }; },
          installieren: async () => { rufe('WcUpdates', 'installieren'); (hoerer.stand || []).forEach((f) => f({ geladen: 5, groesse: 10 })); return { gestartet: true }; },
          addListener: async (n, f) => { (hoerer[n] = hoerer[n] || []).push(f); return { remove: async () => { hoerer[n] = (hoerer[n] || []).filter((x) => x !== f); } }; },
        },
      } };
    });
    const page = await ctx.newPage(); const fehler = []; page.on('pageerror', (e) => fehler.push(String(e)));
    let downloads = 0; page.on('download', () => { downloads++; });
    await page.goto(`http://127.0.0.1:${srv.address().port}/`);
    await page.waitForFunction(() => document.body.dataset.bereit === '1', null, { timeout: 30000 }).catch(() => {});
    soll('App startet aus dem Paket an der Wurzel und heißt „Workflow Calculate Pro“ (Kopf und Titel)', (await page.locator('#app-name').innerText().catch(() => '')) === 'Workflow Calculate Pro' && (await page.title()) === 'Workflow Calculate Pro');
    soll('kein Service Worker in der App', await page.evaluate(async () => !(await navigator.serviceWorker?.getRegistration?.())));
    await page.waitForFunction(() => !document.getElementById('wc-pro-fassung')?.hidden, null, { timeout: 10000 }).catch(() => {});
    soll('Fassung „Pro 1.0.0“ im Kopf (aus WcDateien.appInfo)', (await page.locator('#wc-pro-fassung').innerText().catch(() => '')) === 'Pro 1.0.0');
    soll('kein Installieren-Knopf in der App', await page.evaluate(() => [...document.querySelectorAll('#installieren,[data-install-knopf]')].every((e) => !e.checkVisibility())));
    soll('Spracheingabe aus: Mikrofon gesperrt, sagt „bitte tippen“', await page.evaluate(() => { const m = document.getElementById('suche-mic'); return !window.webkitSpeechRecognition && !window.SpeechRecognition && !!m && m.disabled && /tippen/.test(m.title); }));
    await page.waitForFunction(() => !document.getElementById('wc-pro-fahne')?.hidden, null, { timeout: 8000 }).catch(() => {});
    soll('Update-Fähnchen „Update 1.0.1“ nach der stillen Prüfung', (await page.locator('#wc-pro-fahne').innerText().catch(() => '')) === 'Update 1.0.1');
    await page.locator('#wc-pro-fahne').click();
    await page.waitForFunction(() => window.__aufrufe.some((a) => a.method === 'installieren'), null, { timeout: 5000 }).catch(() => {});
    soll('Tipp auf das Fähnchen lädt und öffnet das Installieren (WcUpdates.installieren)', await page.evaluate(() => window.__aufrufe.some((a) => a.method === 'installieren')));
    // Herunterladen: der Weg der App (herunterladen() in assets/app.js, <a download> mit Blob) landet bei „Speichern unter“.
    await page.evaluate(() => { const u = URL.createObjectURL(new Blob(['ä;1\n'], { type: 'text/csv' })); const a = document.createElement('a'); a.href = u; a.download = 'Probe.csv'; document.body.append(a); a.click(); a.remove(); });
    await page.waitForFunction(() => window.__aufrufe.some((a) => a.method === 'speichern'), null, { timeout: 5000 }).catch(() => {});
    const sp = await page.evaluate(() => window.__aufrufe.find((a) => a.method === 'speichern'));
    soll('<a download> geht an WcDateien.speichern (Name, Art, Inhalt byte-gleich)', !!sp && sp.o.name === 'Probe.csv' && sp.o.mime === 'text/csv' && Buffer.from(sp.o.data, 'base64').toString('utf8') === 'ä;1\n', JSON.stringify(sp && sp.o));
    // Echter Knopf der App: Reiter Daten → CSV „ohne Kundendaten“.
    await page.evaluate(() => { window.__aufrufe = []; });
    await page.locator('[data-reiter="daten"]').click().catch(() => {});
    await page.locator('#csv-ohne').click({ timeout: 10000 }).catch(() => {});
    await page.waitForFunction(() => window.__aufrufe.some((a) => a.method === 'speichern'), null, { timeout: 5000 }).catch(() => {});
    const csv = await page.evaluate(() => window.__aufrufe.find((a) => a.method === 'speichern'));
    soll('Knopf „⬇ ohne Kundendaten“ der App speichert über „Speichern unter“', !!csv && /^Angebote-ohne-Kundendaten-.*\.csv$/.test(csv.o.name) && Buffer.from(csv.o.data, 'base64').toString('utf8') === await page.evaluate(() => window.__wcCsv), csv ? csv.o.name : 'kein Aufruf');
    await page.waitForTimeout(800);
    soll('kein Browser-Download daneben (das <a download> wird abgefangen)', downloads === 0, String(downloads));
    await page.evaluate(() => window.print());
    soll('window.print() geht an WcDateien.drucken (Android)', await page.evaluate(() => window.__aufrufe.some((a) => a.method === 'drucken')));
    soll('keine Fehler in der Seite', fehler.length === 0, fehler.slice(0, 2).join(' | '));

    // Die PWA (Repo-Stand, ohne Capacitor) bleibt, wie sie ist — und auch mit Capacitor ändert der Repo-Stand nichts (Glue fehlt dort).
    const p2 = await (await browser.newContext({ viewport: { width: 420, height: 860 } })).newPage();
    await p2.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
    await p2.goto(`http://127.0.0.1:${pwa.address().port}/index.html`);
    await p2.waitForFunction(() => document.body.dataset.bereit === '1', null, { timeout: 30000 }).catch(() => {});
    soll('PWA heißt weiter „Workflow Calculate“, ohne Pro-Zeile', (await p2.locator('#app-name').innerText()) === 'Workflow Calculate' && (await p2.locator('.wc-pro-zeile').count()) === 0 && !(await p2.evaluate(() => window.WCNativ)));
  } finally { await browser.close(); srv.close(); pwa.close(); }
}
console.log(`Native: ${gruen} grün · ${rot} ROT`);
process.exit(rot ? 1 : 0);
