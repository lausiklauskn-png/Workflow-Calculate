// windows/engine/build.mjs — übersetzt die Windows-Engine von Workflow Calculate Pro (Vorbild Datei-Organizer Pro und BookLedgerPro
// windows/engine/build.mjs, ohne Tresor-Paket: Calculate braucht nur „Speichern unter“ und Updates).
import {readFile,writeFile,mkdir,rm,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {join,delimiter} from 'node:path';
const here=fileURLToPath(new URL('.',import.meta.url));
const build=join(here,'build');
const sha=b=>createHash('sha256').update(b).digest('hex');
await mkdir(join(build,'lib'),{recursive:true});
const deps=JSON.parse(await readFile(join(here,'dependencies.json'),'utf8')).dependencies;
for(const dep of deps){
  const path=join(build,'lib',`${dep.name}-${dep.version}.jar`);
  let bytes=await readFile(path).catch(()=>null);
  if(!bytes||sha(bytes)!==dep.sha256){
    const response=await fetch(dep.url);if(!response.ok)throw Error('Abhängigkeit nicht ladbar: '+dep.name);
    bytes=Buffer.from(await response.arrayBuffer());
    if(sha(bytes)!==dep.sha256)throw Error('Abhängigkeit mit falschem Fingerabdruck: '+dep.name);
    await writeFile(path,bytes);
  }
}
const config=JSON.parse(await readFile(join(here,'../src-tauri/tauri.conf.json'),'utf8'));
const gen=join(build,'source');await rm(gen,{recursive:true,force:true});await mkdir(gen,{recursive:true});
await writeFile(join(gen,'DesktopBuild.java'),`package de.familyprojekt.workflowcalculate.desktop; final class DesktopBuild { static final String VERSION=${JSON.stringify(config.version)}; }\n`);
const eigene=(await readdir(join(here,'src'))).filter(n=>n.endsWith('.java')).sort().map(n=>join(here,'src',n));
await rm(join(build,'classes'),{recursive:true,force:true});await mkdir(join(build,'classes'),{recursive:true});
const libs=deps.map(d=>join(build,'lib',`${d.name}-${d.version}.jar`)).join(delimiter);
execFileSync('java',['-m','jdk.compiler/com.sun.tools.javac.Main','-source','21','-target','21','-encoding','UTF-8','-Xlint:-options','-cp',libs,'-d',join(build,'classes'),join(gen,'DesktopBuild.java'),...eigene],{stdio:'inherit'});
await writeFile(join(build,'shared-source.json'),JSON.stringify({abhaengigkeiten:deps,eigene:eigene.length},null,2)+'\n');
console.log(`Windows-Engine übersetzt: ${eigene.length} eigene Dateien.`);
export const classpath=[join(build,'classes'),join(build,'lib','*')].join(delimiter);
