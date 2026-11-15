// Legt den Auslieferungs-Installer mit unverwechselbarem Namen und Prüfsummen bereit (Artefakt, keine Veröffentlichung).
import {readdir,readFile,mkdir,writeFile,copyFile,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
const windows=fileURLToPath(new URL('../',import.meta.url)),nsis=join(windows,'src-tauri/target/release/bundle/nsis'),out=join(windows,'distribution');
const version=JSON.parse(await readFile(join(windows,'src-tauri/tauri.conf.json'),'utf8')).version;
const setup=(await readdir(nsis)).filter(n=>n.endsWith('-setup.exe'));if(setup.length!==1)throw Error('Genau ein Installer erwartet');
await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});
const name=`Workflow-Calculate-Pro-Windows-${version}-x64-setup.exe`;await copyFile(join(nsis,setup[0]),join(out,name));
const bytes=await readFile(join(out,name)),sha=createHash('sha256').update(bytes).digest('hex');
await writeFile(join(out,'SHA256SUMS'),`${sha}  ${name}\n`);
await writeFile(join(out,'quelle.json'),JSON.stringify({version,quelle:process.env.WC_SOURCE_COMMIT||'',datei:name,groesse:bytes.length,sha256:sha,signiert:false},null,2)+'\n');
console.log(`${name} · ${bytes.length} B · SHA-256 ${sha}`);
