// Veröffentlicht die signierte, im Emulator geprüfte APK (Vorbild Workflow PDF Pro publish-release.mjs).
// Der Download wird mit Anmeldung (gh) geprüft; der Weg geht für öffentliche und private Repos.
//   node publish-release.mjs <tag> <commit> <ordner>   → neu anlegen (Entwurf → öffentlich → Download prüfen)
//   node publish-release.mjs <tag> <commit> --entwurf  → vorhandenen Entwurf dieses Tags freigeben, nachdem seine
//                                                         eigenen Dateien (APK, Nachweis, Installationsprobe) geprüft sind
import { spawnSync } from 'node:child_process';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { stableTag, compareTags, validateReceipt, validateUpdate } from './release-policy.mjs';

const repo = 'lausiklauskn-png/Workflow-Calculate';
const [tag, commit, folder] = process.argv.slice(2);
const entwurf = folder === '--entwurf';
const run = args => {
  const r = spawnSync('gh', args, { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  if (r.status !== 0) throw new Error('GitHub-Vorgang fehlgeschlagen: ' + args.slice(0, 2).join(' '));
  return r.stdout;
};
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
// Datei eines Releases über die REST-Schnittstelle laden (geht auch für Entwürfe und private Repos).
async function asset(release, name, ziel) {
  const a = (release.assets || []).find(x => x.name === name);
  if (!a) throw new Error('Datei fehlt im Release: ' + name);
  const r = spawnSync('gh', ['api', '-H', 'Accept: application/octet-stream', 'repos/' + repo + '/releases/assets/' + a.id], { maxBuffer: 256 * 1024 * 1024 });
  if (r.status !== 0) throw new Error('Download fehlgeschlagen: ' + name);
  const { mkdir, writeFile } = await import('node:fs/promises');
  await mkdir(ziel, { recursive: true }); await writeFile(path.join(ziel, name), r.stdout);
  return path.join(ziel, name);
}
const releaseZu = t => JSON.parse(run(['api', '--paginate', '--slurp', 'repos/' + repo + '/releases?per_page=100'])).flat().find(r => r.tag_name === t);
function pruefeInstallation(installation, receipt) {
  if (installation.applicationId !== receipt.applicationId || installation.commit !== commit || installation.apkSha256 !== receipt.apkSha256 ||
      installation.versionCode !== receipt.versionCode || installation.firstInstall !== true || installation.reinstallPreservesData !== true ||
      installation.developmentProbe !== false || !(installation.api >= 31))
    throw new Error('Tatsächliche signierte Erstinstallation mit Datenerhalt ist nicht vollständig belegt.');
}
// Mit Anmeldung laden (privates Repo) und mit dem Nachweis vergleichen.
async function downloadPruefen(dir, filename, erwartet) {
  const rel = releaseZu(tag);
  if (!rel || rel.draft) throw new Error('Release ist nicht öffentlich.');
  const datei = await asset(rel, filename, path.join(dir, 'pruefung'));
  if (sha(await readFile(datei)) !== erwartet) throw new Error('Download weicht von der geprüften APK ab.');
}
let dir, created = false;
try {
  if (!stableTag.test(tag || '') || !/^[a-f0-9]{40}$/.test(commit || '') || !folder) throw new Error('Regulärer Tag, Quellcommit und Ausgabeordner (oder --entwurf) erforderlich.');
  const filename = 'Workflow-Calculate-Pro-' + tag.slice(1) + '.apk';
  dir = await mkdtemp(path.join(tmpdir(), 'do-release-'));
  const releases = JSON.parse(run(['api', '--paginate', '--slurp', 'repos/' + repo + '/releases?per_page=100'])).flat();
  const stable = releases.filter(r => !r.draft && !r.prerelease && stableTag.test(r.tag_name) && r.tag_name !== tag);
  const latest = stable.sort((a, b) => compareTags(b.tag_name, a.tag_name))[0];
  async function updateFolgePruefen(receipt) {
    if (!latest) return;
    if (compareTags(tag, latest.tag_name) <= 0) throw new Error('Release-Version steigt nicht.');
    const nachweise = (latest.assets || []).filter(a => a.name.endsWith('.apk.json'));
    if (nachweise.length !== 1) throw new Error('Vorheriger Update-Nachweis fehlt oder ist uneindeutig.');
    const previous = JSON.parse(await readFile(await asset(latest, nachweise[0].name, path.join(dir, 'vorher')), 'utf8'));
    validateReceipt(previous, latest.tag_name, previous.commit);
    validateUpdate(receipt, previous);
  }

  if (entwurf) {
    const draft = releases.find(r => r.tag_name === tag);
    if (!draft || !draft.draft) throw new Error('Kein Entwurf für diesen Tag; nichts freizugeben.');
    const tagRef = JSON.parse(run(['api', 'repos/' + repo + '/git/ref/tags/' + tag]));
    if (tagRef.object?.type !== 'commit' || tagRef.object.sha !== commit) throw new Error('Tag zeigt nicht auf den geprüften Commit.');
    const eigene = path.join(dir, 'entwurf');
    for (const n of [filename, filename + '.json', filename + '.installation.json', filename + '.sha256']) await asset(draft, n, eigene);
    const apk = path.join(eigene, filename), receipt = JSON.parse(await readFile(apk + '.json', 'utf8'));
    validateReceipt(receipt, tag, commit);
    pruefeInstallation(JSON.parse(await readFile(apk + '.installation.json', 'utf8')), receipt);
    if (sha(await readFile(apk)) !== receipt.apkSha256) throw new Error('APK im Entwurf weicht vom Nachweis ab.');
    if (!(await readFile(apk + '.sha256', 'utf8')).startsWith(receipt.apkSha256 + '  ' + filename)) throw new Error('Prüfsummen-Datei passt nicht.');
    await updateFolgePruefen(receipt);
    run(['release', 'edit', tag, '--repo', repo, '--draft=false', '--latest']); created = true;
    await downloadPruefen(dir, filename, receipt.apkSha256);
    console.log('Entwurf freigegeben, Download (mit Anmeldung) bytegleich geprüft: https://github.com/' + repo + '/releases/tag/' + tag);
  } else {
    const apk = path.resolve(folder, filename), receipt = JSON.parse(await readFile(apk + '.json', 'utf8'));
    validateReceipt(receipt, tag, commit);
    pruefeInstallation(JSON.parse(await readFile(apk + '.installation.json', 'utf8')), receipt);
    if (sha(await readFile(apk)) !== receipt.apkSha256) throw new Error('APK wurde nach der Signaturprüfung verändert.');
    const remoteTag = spawnSync('git', ['ls-remote', '--tags', 'origin', 'refs/tags/' + tag], { encoding: 'utf8' });
    if (remoteTag.status !== 0) throw new Error('Vorhandene Tags nicht prüfbar.');
    if (remoteTag.stdout.trim() || releases.some(r => r.tag_name === tag)) throw new Error('Tag bereits vorhanden; bestehende Version nie ersetzen (Entwurf ggf. mit --entwurf freigeben).');
    await updateFolgePruefen(receipt);
    run(['release', 'create', tag, apk, apk + '.sha256', apk + '.json', apk + '.installation.json', '--repo', repo, '--target', commit, '--title', 'Workflow Calculate Pro ' + receipt.versionName, '--generate-notes', '--draft']); created = true;
    run(['release', 'edit', tag, '--repo', repo, '--draft=false', '--latest']);
    await downloadPruefen(dir, filename, receipt.apkSha256);
    console.log('Veröffentlicht, Download (mit Anmeldung) bytegleich geprüft: https://github.com/' + repo + '/releases/tag/' + tag);
  }
} catch (error) {
  if (created) {
    const rollback = spawnSync('gh', ['release', 'edit', tag, '--repo', repo, '--draft=true'], { encoding: 'utf8' });
    if (rollback.status !== 0) console.error('Rücknahme als Entwurf nicht bestätigt; Release von Hand prüfen.');
  }
  console.error(error.message); process.exitCode = 1;
} finally { if (dir) await rm(dir, { recursive: true, force: true }); }
