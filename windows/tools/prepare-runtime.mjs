// windows/tools/prepare-runtime.mjs — eigene Java-Laufzeit für die Engine (jlink), kein Java beim Empfänger nötig.
import {cp,mkdir,readFile,rm,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
const windows=fileURLToPath(new URL('../',import.meta.url)),root=join(windows,'..'),runtime=join(windows,'runtime');
if(process.platform!=='win32')throw Error('Die Windows-Laufzeit wird nur unter Windows gebaut.');
execFileSync(process.execPath,[join(windows,'engine/build.mjs')],{stdio:'inherit'});
await rm(runtime,{recursive:true,force:true});await mkdir(join(runtime,'engine'),{recursive:true});
for(const name of ['classes','lib','shared-source.json'])await cp(join(windows,'engine/build',name),join(runtime,'engine',name),{recursive:true});
execFileSync(join(process.env.JAVA_HOME,'bin/jlink.exe'),['--add-modules','java.base,java.logging,java.net.http,jdk.crypto.ec','--strip-debug','--no-header-files','--no-man-pages','--compress=2','--output',join(runtime,'jre')],{stdio:'inherit'});
// ICO mit unverändertem PNG darin (192 px, wie Private Brain Pro).
const png=await readFile(join(root,'icons/icon-192.png'));
if(png.readUInt32BE(16)!==192||png.readUInt32BE(20)!==192)throw Error('Symbol nicht 192 px.');
const header=Buffer.alloc(22);header.writeUInt16LE(1,2);header.writeUInt16LE(1,4);header[6]=192;header[7]=192;header.writeUInt16LE(1,10);header.writeUInt16LE(32,12);header.writeUInt32LE(png.length,14);header.writeUInt32LE(22,18);
await mkdir(join(windows,'src-tauri/icons'),{recursive:true});await writeFile(join(windows,'src-tauri/icons/icon.ico'),Buffer.concat([header,png]));
console.log('Windows-Laufzeit vorbereitet; beim Empfänger muss kein Java installiert sein.');
