package de.familyprojekt.workflowcalculate.desktop;

import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.security.PrivateKey;
import java.security.SecureRandom;
import java.util.*;
import org.json.*;

/** Prüft die Windows-Engine ohne Windows: echte Verträge von DesktopService mit einer gestellten Hülle (Speichern-Dialog → feste Antworten). Gezählt wird jede Zeile; ein Fehler bricht ab. */
public final class EngineTests {
    static int ok=0;
    static void check(String name,boolean value){if(!value)throw new AssertionError("ROT: "+name);ok++;System.out.println("PASS "+name);}
    static String fehler(java.util.concurrent.Callable<?> c){try{c.call();return "";}catch(Exception e){return DesktopService.code(e);}}

    static final class Fake implements DesktopService.Host {
        Path save;final List<String> calls=new ArrayList<>();
        public JSONObject call(String method,JSONObject o)throws Exception {
            calls.add(method);
            switch(method){
                                case "saveLocation": return save==null?new JSONObject().put("cancelled",true):new JSONObject().put("path",save.resolve(o.getString("name")).toString());
                default: throw new java.io.IOException("NOT_ALLOWED");
            }
        }
    }
    static JSONObject call(DesktopService s,String plugin,String method,JSONObject o)throws Exception{return s.call(plugin,method,o);}
    static JSONObject o(Object... kv){JSONObject j=new JSONObject();for(int i=0;i<kv.length;i+=2)j.put((String)kv[i],kv[i+1]);return j;}
    static String b64(byte[] b){return Base64.getEncoder().encodeToString(b);}
    static byte[] unb64(String s){return Base64.getDecoder().decode(s);}

    public static void main(String[] args)throws Exception {
        Path tmp=Files.createTempDirectory("wc-engine-");
        try{run(tmp);updates(tmp);}finally{
            try(var w=Files.walk(tmp)){w.sorted(Comparator.reverseOrder()).forEach(p->p.toFile().delete());}
        }
        System.out.println(ok+" grün, 0 rot");
    }

    static void run(Path tmp)throws Exception {
        Fake host=new Fake();Path data=tmp.resolve("app");
        DesktopService s=new DesktopService(data,host);

        // ---------- Speichern unter (Auftragsdatei, Sicherung, CSV, Katalog) ----------
        check("Speichern: Abbrechen → nicht gespeichert, Dialog gefragt",!call(s,"WcDateien","speichern",o("name","Angebote.csv","data",b64("a;b".getBytes()))).getBoolean("gespeichert")&&host.calls.contains("saveLocation"));
        host.save=tmp.resolve("Downloads Ä");Files.createDirectories(host.save);
        byte[] csv="Nummer;Kunde\nAN-2026-0001;Muster GmbH\n".getBytes(StandardCharsets.UTF_8);
        JSONObject sp=call(s,"WcDateien","speichern",o("name","Angebote:intern?.csv","mime","text/csv","data",b64(csv)));
        check("Speichern: dorthin, wo der Mensch zeigt, Name ohne verbotene Zeichen, Inhalt byte-gleich",sp.getBoolean("gespeichert")&&Arrays.equals(Files.readAllBytes(host.save.resolve("Angebote_intern_.csv")),csv));
        call(s,"WcDateien","speichern",o("name","Angebote_intern_.csv","data",b64("x".getBytes())));
        check("Speichern: gleicher Name ersetzt ganz (keine alten Bytes am Ende)",Files.readString(host.save.resolve("Angebote_intern_.csv")).equals("x"));
        check("Speichern: keine Zwischendatei bleibt liegen",Files.list(host.save).noneMatch(x->x.getFileName().toString().endsWith(".tmp")));
        check("Speichern: kaputtes Base64 → abgelehnt",fehler(()->call(s,"WcDateien","speichern",o("name","x.json","data","%%%"))).equals("WC_DATEI_UNGUELTIG"));
        check("Speichern: ohne Inhalt → abgelehnt",fehler(()->call(s,"WcDateien","speichern",o("name","x.json"))).equals("WC_DATEI_UNGUELTIG"));
        check("Dateinamen ohne Windows-Sonderzeichen und reservierte Namen",DesktopFiles.filename("a:b.txt").equals("a_b.txt")&&DesktopFiles.filename("CON.json").equals("_CON.json")&&DesktopFiles.filename(null).equals("Dokument"));
        check("Info: Plattform und Fassung",call(s,"DesktopInternal","info",o()).getString("plattform").equals("windows")&&call(s,"WcDateien","appInfo",o()).getString("version").equals(DesktopBuild.VERSION));
        check("Unbekannter Vertrag → abgewiesen",fehler(()->call(s,"Unbekannt","x",o())).equals("INVALID_INPUT")&&fehler(()->call(s,"FamilyFolders","ordnerWaehlen",o())).equals("INVALID_INPUT")&&fehler(()->call(s,"WcDateien","loeschen",o())).equals("INVALID_INPUT"));
    }

    // ---------- Updates von Klaus' Server (Wegwerf-Schlüssel, gestelltes Netz) ----------
    static final Map<String,byte[]> SERVER=new HashMap<>();
    static String sig(PrivateKey k,byte[] d)throws Exception{java.security.Signature s=java.security.Signature.getInstance("Ed25519");s.initSign(k);s.update(d);return Base64.getEncoder().encodeToString(s.sign());}
    static String datei(String v){return "Workflow-Calculate-Pro-Windows-"+v+"-x64-setup.exe";}
    static byte[] feed(String v,byte[] setup,String datei,String app)throws Exception{
        return new JSONObject().put("format",1).put("app",app).put("version",v).put("windows",new JSONObject().put("datei",datei).put("groesse",setup.length)
            .put("sha256",DesktopFiles.hex(java.security.MessageDigest.getInstance("SHA-256").digest(setup)))).toString().getBytes(StandardCharsets.UTF_8);
    }
    static byte[] feed(String v,byte[] setup,String datei)throws Exception{return feed(v,setup,datei,"workflow-calculate");}
    static void updates(Path tmp)throws Exception{
        java.security.KeyPairGenerator g=java.security.KeyPairGenerator.getInstance("Ed25519");
        java.security.KeyPair echt=g.generateKeyPair(),fremd=g.generateKeyPair();
        String pub=Base64.getEncoder().encodeToString(echt.getPublic().getEncoded());
        List<String> geholt=new ArrayList<>();
        DesktopUpdates.Netz netz=new DesktopUpdates.Netz(){
            public byte[] holen(String url,long grenze)throws Exception{geholt.add(url);byte[] b=SERVER.get(url);if(b==null)throw new java.io.IOException("UPDATE_NICHT_ERREICHBAR");if(b.length>grenze)throw new java.io.IOException("UPDATE_UNGUELTIG");return b;}
            public java.io.InputStream strom(String url)throws Exception{geholt.add(url);byte[] b=SERVER.get(url);if(b==null)throw new java.io.IOException("UPDATE_NICHT_ERREICHBAR");return new java.io.ByteArrayInputStream(b);}
        };
        String B=DesktopUpdates.BASIS;Path ordner=tmp.resolve("update");
        check("Update: Basis ist der eigene Ordner von Workflow Calculate",B.equals("https://family-projekt.de/updates/workflow-calculate/")&&DesktopUpdates.FEED.equals("aktuell-windows.json"));
        if(DesktopUpdates.SCHLUESSEL.isEmpty()){
            DesktopUpdates leer=new DesktopUpdates(ordner,netz,"0.4.0",DesktopUpdates.SCHLUESSEL);
            check("Update: ohne eingetragenen Schlüssel → nicht eingerichtet, kein Netzabruf",fehler(leer::pruefen).equals("UPDATE_NICHT_EINGERICHTET")&&geholt.isEmpty());
        }else check("Update: der eingebaute Schlüssel ist ein gültiger Ed25519-Schlüssel",java.security.KeyFactory.getInstance("Ed25519").generatePublic(new java.security.spec.X509EncodedKeySpec(Base64.getDecoder().decode(DesktopUpdates.SCHLUESSEL)))!=null);
        DesktopUpdates u=new DesktopUpdates(ordner,netz,"0.4.0",pub);
        check("Update: Server nicht erreichbar → klare Meldung",fehler(u::pruefen).equals("UPDATE_NICHT_ERREICHBAR"));
        byte[] setup=new byte[3_000_000];new SecureRandom().nextBytes(setup);String datei=datei("0.4.1");
        byte[] f=feed("0.4.1",setup,datei);
        SERVER.put(B+DesktopUpdates.FEED,f);SERVER.put(B+DesktopUpdates.FEED+".sig",sig(fremd.getPrivate(),f).getBytes());SERVER.put(B+datei,setup);
        check("Update: fremde Unterschrift wird abgelehnt",fehler(u::pruefen).equals("UPDATE_UNTERSCHRIFT_FALSCH"));
        SERVER.put(B+DesktopUpdates.FEED+".sig",sig(echt.getPrivate(),f).getBytes());
        byte[] f2=f.clone();f2[f2.length-3]^=1;SERVER.put(B+DesktopUpdates.FEED,f2);
        check("Update: veränderte Angaben mit alter Unterschrift → abgelehnt",fehler(u::pruefen).equals("UPDATE_UNTERSCHRIFT_FALSCH"));
        byte[] andere=feed("0.4.1",setup,"BookLedgerPro-Windows-0.4.1-x64-setup.exe","bookledgerpro");SERVER.put(B+DesktopUpdates.FEED,andere);SERVER.put(B+DesktopUpdates.FEED+".sig",sig(echt.getPrivate(),andere).getBytes());
        check("Update: Feed einer anderen App (auch unterschrieben) → abgelehnt",fehler(u::pruefen).equals("UPDATE_UNGUELTIG"));
        SERVER.put(B+DesktopUpdates.FEED,f);SERVER.put(B+DesktopUpdates.FEED+".sig",sig(echt.getPrivate(),f).getBytes());
        JSONObject r=u.pruefen();
        check("Update: Neu 0.4.1 (installiert 0.4.0) mit Größe",r.optString("neu").equals("0.4.1")&&r.optString("installiert").equals("0.4.0")&&r.optLong("groesse")==setup.length);
        Path p=u.laden();
        check("Update: Setup geladen, Größe und SHA-256 stimmen, nur im Update-Ordner",Files.size(p)==setup.length&&p.startsWith(ordner)&&p.getFileName().toString().equals(datei));
        check("Update: Setup-Adresse = feste Basis + Name (nichts aus fremder Quelle)",geholt.stream().allMatch(x->x.startsWith(B)));
        SERVER.put(B+datei,Arrays.copyOf(setup,setup.length-1));u.pruefen();
        check("Update: abgeschnittenes Setup → beschädigt, nichts bleibt liegen",fehler(u::laden).equals("UPDATE_BESCHAEDIGT")&&!Files.exists(ordner.resolve(datei+".teil"))&&!Files.exists(ordner.resolve(datei)));
        byte[] alt=feed("0.3.4",setup,datei("0.3.4"));SERVER.put(B+DesktopUpdates.FEED,alt);SERVER.put(B+DesktopUpdates.FEED+".sig",sig(echt.getPrivate(),alt).getBytes());
        check("Update: alter echter Stand gilt nicht als neu",u.pruefen().optBoolean("aktuell"));
        byte[] gleich=feed("0.4.0",setup,datei("0.4.0"));SERVER.put(B+DesktopUpdates.FEED,gleich);SERVER.put(B+DesktopUpdates.FEED+".sig",sig(echt.getPrivate(),gleich).getBytes());
        check("Update: gleiche Version → „aktuell“",u.pruefen().optBoolean("aktuell")&&u.pruefen().optString("version").equals("0.4.0"));
        byte[] boese=feed("0.4.2",setup,"..\\..\\evil.exe");SERVER.put(B+DesktopUpdates.FEED,boese);SERVER.put(B+DesktopUpdates.FEED+".sig",sig(echt.getPrivate(),boese).getBytes());
        check("Update: fremder Dateiname (auch unterschrieben) → abgelehnt",fehler(u::pruefen).equals("UPDATE_UNGUELTIG"));
        check("Update: ohne Prüfung kein Laden",fehler(u::laden).equals("UPDATE_NICHT_GEPRUEFT"));
        check("Update: Versionsvergleich",DesktopUpdates.neuer("0.10.0","0.9.9")&&!DesktopUpdates.neuer("0.4.0","0.4.0")&&!DesktopUpdates.neuer("1.0.0-x","0.1.0"));
        // Gleiche Unterschrift wie im Veröffentlichungs-Lauf (openssl pkeyutl -sign -rawin, Base64 mit Zeilenende).
        Path k=tmp.resolve("k.pem"),dd=tmp.resolve("d.json"),sb=tmp.resolve("s.bin");
        if(new ProcessBuilder("openssl","genpkey","-algorithm","ed25519","-out",k.toString()).inheritIO().start().waitFor()==0){
            Files.write(dd,f);
            new ProcessBuilder("openssl","pkeyutl","-sign","-rawin","-inkey",k.toString(),"-in",dd.toString(),"-out",sb.toString()).inheritIO().start().waitFor();
            Process pp=new ProcessBuilder("openssl","pkey","-in",k.toString(),"-pubout","-outform","DER").start();byte[] der=pp.getInputStream().readAllBytes();pp.waitFor();
            String opub=Base64.getEncoder().encodeToString(der);
            SERVER.put(B+DesktopUpdates.FEED,f);SERVER.put(B+DesktopUpdates.FEED+".sig",(Base64.getEncoder().encodeToString(Files.readAllBytes(sb))+"\n").getBytes());
            check("Update: Unterschrift von openssl (wie in GitHub) wird erkannt",new DesktopUpdates(ordner,netz,"0.4.0",opub).pruefen().optString("neu").equals("0.4.1"));
        } else System.out.println("(openssl fehlt: Gegenprobe mit openssl übersprungen)");
    }
}
