// windows/tools/build-web.mjs — Oberfläche der Windows-Hülle: dasselbe native Web-Paket wie Android (tools/native/prepare-web.mjs:
// gebauter Stand app/ byte-gleich, ohne sw.js, dazu der erfundene Testordner). Die Web-App selbst bleibt unverändert.
import {cp,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
const root=fileURLToPath(new URL('../../',import.meta.url)),dist=join(root,'windows','dist');
execFileSync(process.execPath,[join(root,'tools/native/prepare-web.mjs')],{cwd:root,stdio:'inherit'});
await rm(dist,{recursive:true,force:true});await cp(join(root,'www'),dist,{recursive:true});
console.log('Windows-Oberfläche aus dem gemeinsamen nativen Web-Paket vorbereitet.');
