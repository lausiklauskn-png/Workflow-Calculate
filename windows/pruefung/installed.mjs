// Prüft die mit NSIS installierte Windows-App über die Prüf-Schnittstelle des Prüfbaus (messprobe, Port 9223).
// Phase „erste“: Name, Fassung, Zugriffsschutz, Updates ohne Schlüssel still, ein Angebot anlegen, „⬇ ohne Kundendaten“ über
// „Speichern unter“ (Datei byte-gleich), Hell-Thema wählen. Phase „neustart“: Angebot und Thema aus dem ersten Start sind noch da.
// Nur im Prüfbau; der Auslieferungsbau hat keine Prüf-Schnittstelle. Vorbild Datei-Organizer Pro windows/pruefung/installed.mjs.
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {writeFile,readFile,readdir,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
const phase=process.argv[2]||'erste',out=resolve(process.argv[3]||'windows-bericht.json');
const report={phase,quelle:process.env.WC_SOURCE_COMMIT||'',gruen:[],fehler:[]};
const version=JSON.parse(await readFile(new URL('../src-tauri/tauri.conf.json',import.meta.url),'utf8')).version;
const ok=(name,value)=>{assert.ok(value,name);report.gruen.push(name);console.log('PASS '+name);};
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const SPEICHER=process.env.WC_WINDOWS_TEST_SAVE_FOLDER;
let browser,page;
async function verbinden(){for(let i=0;i<120;i++){try{browser=await chromium.connectOverCDP('http://127.0.0.1:9223');return;}catch{await pause(500);}}throw Error('Die installierte App hat die Prüf-Schnittstelle nicht geöffnet');}
const seiten=()=>browser.contexts().flatMap(c=>c.pages());
const call=(plugin,method,args={})=>page.evaluate(async({plugin,method,args})=>{try{return await Capacitor.Plugins[plugin][method](args);}catch(e){return {fehler:e.code||String(e)};}},{plugin,method,args});
try{
  await verbinden();
  for(let i=0;i<120&&!page;i++){page=seiten().find(p=>/^https:\/\/tauri\.localhost\/(index\.html)?([?#].*)?$/.test(p.url()));if(!page)await pause(250);}
  assert.ok(page,'Hauptfenster gefunden');
  page.on('pageerror',e=>report.fehler.push(String(e.stack||e.message).slice(0,800)));
  await page.waitForFunction(()=>window.Capacitor&&document.body.dataset.bereit==='1'&&!document.getElementById('wc-pro-fassung')?.hidden,null,{timeout:90000});
  ok('Hülle meldet Windows',await page.evaluate(()=>Capacitor.getPlatform()==='windows'&&Capacitor.isNativePlatform()));
  ok('Name „Workflow Calculate Pro“ in Kopf und Titel',await page.evaluate(()=>document.getElementById('app-name').textContent==='Workflow Calculate Pro'&&document.title==='Workflow Calculate Pro'));
  ok('Fassung der App = tauri.conf.json, im Kopf „Pro '+version+'“',(await call('WcDateien','appInfo')).version===version&&(await page.locator('#wc-pro-fassung').textContent())==='Pro '+version);
  ok('kein Service Worker in der App',await page.evaluate(async()=>!(await navigator.serviceWorker?.getRegistration?.())));
  ok('Aufruf ohne Sitzungsschlüssel wird verweigert',await page.evaluate(async()=>{try{await __TAURI_INTERNALS__.invoke('wc_call',{plugin:'WcDateien',method:'appInfo',options:{}});return false;}catch(e){return String(e).includes('NOT_ALLOWED');}}));
  ok('Methode außerhalb der Verträge wird verweigert',(await call('WcDateien','loeschen')).fehler==='NOT_ALLOWED');
  // Vor dem eingetragenen Schlüssel: „nicht eingerichtet“, danach vor der ersten Veröffentlichung ein UPDATE_-Fehler oder „aktuell“ – nie ein Angebot.
  { const u=await call('WcUpdates','pruefen'); report.update=u; console.log('Update-Prüfung meldet: '+JSON.stringify(u));
    ok('Updates: Fehler UPDATE_… oder „aktuell“, nie ein Angebot für einen Prüfbau',(typeof u.fehler==='string'&&/^UPDATE_/.test(u.fehler))||(u.aktuell===true&&!u.neu));
    const i=await call('WcUpdates','installieren'); report.installieren=i;
    ok('Updates: „installieren“ ohne geprüftes Angebot wird verweigert, nie ein Download',typeof i.fehler==='string'&&/^UPDATE_/.test(i.fehler)); }
  if(phase==='erste'){
    await page.locator('[data-reiter="angebote"]').click();
    await page.locator('#neues-angebot').first().click();
    await page.waitForFunction(()=>window.WCApp&&WCApp.S.angebote.length>=1,null,{timeout:30000});
    const nummer=await page.evaluate(()=>WCApp.S.angebote[0].nummer);report.nummer=nummer;
    ok('Angebot angelegt ('+nummer+')',/^AN-\d{4}-\d{4}/.test(nummer));
    await page.evaluate(()=>WCApp.jetztSpeichern());
    await page.locator('[data-reiter="daten"]').click();
    await page.locator('#csv-ohne').click();
    let datei='';
    for(let i=0;i<80&&!datei;i++){datei=(await readdir(SPEICHER).catch(()=>[])).find(n=>/^Angebote-ohne-Kundendaten-.*\.csv$/.test(n))||'';if(!datei)await pause(250);}
    const soll=await page.evaluate(()=>window.__wcCsv);
    // Ein frisches Angebot ohne Position hat keine Zeile in der CSV (eine Zeile je Position): verglichen wird die ganze Datei.
    const ist=datei?await readFile(resolve(SPEICHER,datei)):null;report.csv={datei,bytes:ist?ist.length:0,soll:Buffer.byteLength(soll||'')};
    ok('„⬇ ohne Kundendaten“ geht über „Speichern unter“, Datei byte-gleich',!!ist&&typeof soll==='string'&&soll.length>0&&ist.equals(Buffer.from(soll,'utf8')));
    if((await page.evaluate(()=>document.documentElement.dataset.theme))!=='light')await page.locator('#thema').click();
    ok('Hell-Thema gewählt',await page.evaluate(()=>document.documentElement.dataset.theme==='light'));
    await pause(3000);
  }else{
    const erste=JSON.parse(await readFile(resolve(dirname(out),'erste.json'),'utf8'));
    ok('nach Neustart: Angebot aus dem ersten Start ist da ('+erste.nummer+')',await page.evaluate(n=>WCApp.S.angebote.some(a=>a.nummer===n),erste.nummer));
    ok('nach Neustart: Hell-Thema gemerkt',await page.evaluate(()=>document.documentElement.dataset.theme==='light'));
  }
  ok('keine Skriptfehler in der Seite',report.fehler.length===0);
}catch(error){report.fehler.push(String(error.stack||error.message));process.exitCode=1;console.error(error);}
finally{
  await mkdir(dirname(out),{recursive:true});await writeFile(out,JSON.stringify(report,null,2)+'\n');
  if(browser)await browser.close().catch(()=>{});
}
