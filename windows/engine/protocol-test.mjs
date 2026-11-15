// Echter Kindprozess über stdio, mit Rückfragen an eine gestellte Hülle (Speichern-Dialog).
// node windows/engine/protocol-test.mjs [java] [runtime]  — mit runtime: die tatsächlich gebündelte Laufzeit.
import {spawn} from 'node:child_process';
import {mkdtemp,mkdir,rm,readFile,writeFile} from 'node:fs/promises';
import {createInterface} from 'node:readline';
import {tmpdir} from 'node:os';
import {join,resolve,delimiter} from 'node:path';
import assert from 'node:assert/strict';
const root=resolve(import.meta.dirname,'../..'),test=await mkdtemp(join(tmpdir(),'wc-protokoll-'));
const java=process.argv[2]||'java',runtime=process.argv[3];
const classes=runtime?join(runtime,'engine/classes'):join(root,'windows/engine/build/classes'),lib=runtime?join(runtime,'engine/lib/*'):join(root,'windows/engine/build/lib/*');
const ziel=join(test,'Downloads');await mkdir(ziel,{recursive:true});
const env={...process.env};delete env.JAVA_TOOL_OPTIONS;delete env._JAVA_OPTIONS;delete env.JDK_JAVA_OPTIONS;
const child=spawn(java,['-Dfile.encoding=UTF-8','-Dsun.jnu.encoding=UTF-8','-cp',[classes,lib].join(delimiter),'de.familyprojekt.workflowcalculate.desktop.EngineMain',join(test,'daten')],{stdio:['pipe','pipe','pipe'],windowsHide:true,env});
const exited=new Promise(r=>child.once('exit',r));
const pending=new Map(),events=[],hostCalls=[];let next=0;
const send=v=>child.stdin.write(JSON.stringify(v)+'\n');
let diag='';child.stderr.on('data',b=>{diag=(diag+b).slice(-8192);});
createInterface({input:child.stdout}).on('line',line=>{
  const v=JSON.parse(line);
  if(v.host){
    hostCalls.push(v.method);
    if(v.method==='saveLocation'){send({replyTo:v.host,result:{path:join(ziel,v.options.name)}});return;}
    send({replyTo:v.host,error:'NOT_ALLOWED'});
  }else if(v.id){const p=pending.get(v.id);pending.delete(v.id);v.error?p.reject(Object.assign(Error(v.error),{code:v.error})):p.resolve(v.result);}
  else if(v.event){events.push(v.event);if(v.event==='Desktop:startupFailure')console.error('Startfehler: '+JSON.stringify(v.data));}
});
const call=(plugin,method,options={})=>new Promise((res,rej)=>{const id=String(++next);pending.set(id,{resolve:res,reject:rej});send({id,plugin,method,options});});
const frist=setTimeout(()=>{console.error('Zeitüberschreitung. '+diag);child.kill();process.exitCode=1;for(const p of pending.values())p.reject(Error('timeout'));},60000);
try{
  const info=await call('DesktopInternal','info');
  assert.equal(info.plattform,'windows');
  assert.equal(info.version,JSON.parse(await readFile(join(root,'windows/src-tauri/tauri.conf.json'),'utf8')).version);
  const sp=await call('WcDateien','speichern',{name:'Angebot AN-2026-0001.json',mime:'application/json',data:Buffer.from('{"probe":"ä"}').toString('base64')});
  assert.equal(sp.gespeichert,true);
  assert.ok(hostCalls.includes('saveLocation'),'Speichern-Dialog über die Hülle');
  assert.equal(await readFile(join(ziel,'Angebot AN-2026-0001.json'),'utf8'),'{"probe":"ä"}');
  // Ohne eingetragenen Schlüssel UPDATE_NICHT_EINGERICHTET; mit Schlüssel „aktuell“ oder ohne Netz ein UPDATE_-Fehler – nie ein Angebot
  // für die Fassung, die gerade läuft.
  const u=await call('WcUpdates','pruefen').then((r)=>r,(e)=>({fehler:String(e&&e.message||e)}));
  assert.ok((u.aktuell===true&&!u.neu)||/UPDATE_/.test(u.fehler||''),'Updates: aktuell oder UPDATE_-Fehler, nie ein Angebot – '+JSON.stringify(u));
  await assert.rejects(call('Unbekannt','x'),/INVALID_INPUT/);
  console.log('PASS echter Kindprozess: Start, Speichern-Dialog über die Hülle, Datei byte-gleich, Updates nur mit Schlüssel');
}finally{clearTimeout(frist);child.stdin.end();await exited;await rm(test,{recursive:true,force:true});}
