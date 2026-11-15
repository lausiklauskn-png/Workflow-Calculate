package de.familyprojekt.workflowcalculate.desktop;

import java.io.*;
import java.nio.file.*;
import java.util.Base64;
import org.json.*;

/** Benannte Geräteverträge für dieselbe Oberfläche wie unter Android (native/wc-native.js). Die Seite ruft nur die Methoden aus
 *  windows/bridge/contracts.json; alles, was ein Fenster des Systems braucht (Speichern unter, Setup starten), fragt die Engine bei
 *  der Hülle nach (Host), nie die Seite. Vorbild: Datei-Organizer Pro und BookLedgerPro windows/engine. */
final class DesktopService {
    interface Host { JSONObject call(String method,JSONObject options)throws Exception; }
    /** Größte Datei, die die Seite über „Speichern unter“ ablegen darf (Sicherung mit Bildern, gleiche Grenze wie Android). */
    static final int MAX_SPEICHERN=64*1024*1024;
    final Path directory;
    private final Host host;
    final DesktopUpdates updates;

    DesktopService(Path directory,Host host)throws Exception { this(directory,host,null); }
    /** Für Proben: andere Updates (gestelltes Netz, Wegwerf-Schlüssel). */
    DesktopService(Path directory,Host host,DesktopUpdates updates)throws Exception {
        this.directory=directory.toAbsolutePath().normalize();this.host=host;
        DesktopFiles.noLinks(this.directory);Files.createDirectories(this.directory);
        this.updates=updates!=null?updates:new DesktopUpdates(this.directory.resolve("cache/update"));
    }

    static String code(Throwable e){
        String m=e==null?null:e.getMessage();
        return m!=null&&m.matches("[A-Z0-9_]{3,60}")?m:"APP_FEHLER";
    }

    JSONObject call(String plugin,String method,JSONObject options)throws Exception {
        JSONObject o=options==null?new JSONObject():options;
        return switch(plugin){
            case "WcDateien" -> dateien(method,o);
            case "WcUpdates" -> {
                if(method.equals("pruefen"))yield updates.pruefen();
                if(method.equals("installieren")){Path setup=updates.laden();host.call("installer",new JSONObject().put("path",setup.toString()));yield new JSONObject().put("gestartet",true);}
                throw new IOException("INVALID_INPUT");
            }
            case "DesktopInternal" -> {
                if(method.equals("info"))yield new JSONObject().put("plattform","windows").put("version",DesktopBuild.VERSION);
                throw new IOException("INVALID_INPUT");
            }
            default -> throw new IOException("INVALID_INPUT");
        };
    }

    /** „Speichern unter …“ (Auftragsdatei, Sicherung, CSV, Katalog): die Datei geht dorthin, wo der Mensch im Windows-Dialog hinzeigt. */
    private JSONObject dateien(String method,JSONObject o)throws Exception {
        switch(method){
            case "appInfo": return new JSONObject().put("version",DesktopBuild.VERSION).put("plattform","windows");
            case "speichern": {
                String data=o.optString("data",null);if(data==null||data.length()>MAX_SPEICHERN/3*4+8)throw new IOException("WC_DATEI_UNGUELTIG");
                byte[] bytes;try{bytes=Base64.getDecoder().decode(data);}catch(IllegalArgumentException kaputt){throw new IOException("WC_DATEI_UNGUELTIG");}
                String name=DesktopFiles.filename(o.optString("name",null));
                JSONObject wahl=host.call("saveLocation",new JSONObject().put("name",name));
                if(wahl.optBoolean("cancelled"))return new JSONObject().put("gespeichert",false);
                Path ziel=Path.of(wahl.getString("path")).toAbsolutePath().normalize();
                DesktopFiles.noLinks(ziel);
                try{DesktopFiles.atomic(ziel,bytes);}catch(IOException e){throw new IOException("WC_SPEICHERN_FEHLER");}
                return new JSONObject().put("gespeichert",true).put("name",ziel.getFileName().toString());
            }
            default: throw new IOException("INVALID_INPUT");
        }
    }
}
