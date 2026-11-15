// Prüft die Windows-Engine mit gestellter Hülle (läuft auf Linux und Windows): node windows/engine/test.mjs
import {classpath} from './build.mjs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {join,delimiter} from 'node:path';
import {readFile} from 'node:fs/promises';
const here=fileURLToPath(new URL('.',import.meta.url));
const deps=JSON.parse(await readFile(join(here,'dependencies.json'),'utf8')).dependencies;
const cp=[join(here,'build/classes'),...deps.map(d=>join(here,'build/lib',`${d.name}-${d.version}.jar`))].join(delimiter);
execFileSync('java',['-m','jdk.compiler/com.sun.tools.javac.Main','-source','21','-target','21','-encoding','UTF-8','-Xlint:-options','-cp',cp,'-d',join(here,'build/classes'),join(here,'tests/EngineTests.java')],{stdio:'inherit'});
execFileSync('java',['-Dfile.encoding=UTF-8','-Dsun.jnu.encoding=UTF-8','-cp',classpath,'de.familyprojekt.workflowcalculate.desktop.EngineTests'],{stdio:'inherit'});
