// Baut aktuell-windows.json für Klaus' Update-Server aus dem Auslieferungs-Installer (windows/distribution/quelle.json).
// Unterschrieben wird danach in GitHub (Geheimnis UPDATE_SIGNING_KEY); die App glaubt nur der Unterschrift.
//   node windows/tools/update-feed.mjs <ordner-mit-quelle.json> <ausgabe/aktuell-windows.json>
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const [ordner, aus] = process.argv.slice(2);
const q = JSON.parse(readFileSync(join(ordner, 'quelle.json'), 'utf8'));
if (!/^\d+\.\d+\.\d+$/.test(q.version) || q.datei !== `Workflow-Calculate-Pro-Windows-${q.version}-x64-setup.exe` || !/^[0-9a-f]{64}$/.test(q.sha256) || !(q.groesse > 0)) throw Error('quelle.json ungültig');
const feed = { format: 1, app: 'workflow-calculate', version: q.version, datum: new Date().toISOString().slice(0, 10), quelle: q.quelle || '',
  windows: { datei: q.datei, groesse: q.groesse, sha256: q.sha256 } };
writeFileSync(aus, JSON.stringify(feed, null, 2) + '\n');
console.log('aktuell-windows.json: ' + q.version + ' · ' + q.datei + ' · ' + q.groesse + ' B');
