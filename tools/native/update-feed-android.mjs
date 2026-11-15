// Baut aktuell-android.json für Klaus' Update-Server aus der signierten APK (Lauf android-release.yml). Vorbild BookLedgerPro.
//   node tools/native/update-feed-android.mjs <apk> <ausgabe/aktuell-android.json>
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { basename } from 'node:path';
const [apk, aus] = process.argv.slice(2);
const gradle = readFileSync(new URL('../../android/app/build.gradle', import.meta.url), 'utf8');
const version = (/^\s*versionName "([^"]+)"/m.exec(gradle) || [])[1], code = Number((/^\s*versionCode (\d+)/m.exec(gradle) || [])[1]);
const datei = basename(apk);
if (!/^\d+\.\d+\.\d+$/.test(version || '') || !(code > 0) || datei !== `Workflow-Calculate-Pro-${version}.apk`) throw Error('APK oder build.gradle passt nicht: ' + datei + ' / ' + version + ' / ' + code);
const bytes = readFileSync(apk);
const feed = { format: 1, app: 'workflow-calculate', version, datum: new Date().toISOString().slice(0, 10), quelle: process.env.GITHUB_SHA || '',
  android: { datei, groesse: statSync(apk).size, sha256: createHash('sha256').update(bytes).digest('hex'), versionCode: code } };
writeFileSync(aus, JSON.stringify(feed, null, 2) + '\n');
console.log('aktuell-android.json: ' + version + ' (Code ' + code + ') · ' + datei + ' · ' + feed.android.groesse + ' B');
