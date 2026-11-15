package de.familyprojekt.workflowcalculate.desktop;

import java.io.*;
import java.net.URI;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.security.*;
import java.security.spec.X509EncodedKeySpec;
import java.time.Duration;
import java.util.Base64;
import org.json.JSONObject;

/**
 * Updates von Klaus' eigenem Server (Klaus 2026-10-28: „Update auf den Server legen … alte weg, neue drauf“). Wie BookLedgerPro;
 * GitHub-Releases sind von außen nicht lesbar. Auf dem Server liegen je Plattform: aktuell-<plattform>.json, .sig (Ed25519 über genau diese
 * Bytes, Schlüssel nur in GitHub) und das Setup. Die App glaubt nur der Unterschrift: ein geknackter Server kann kein fremdes
 * Programm unterschieben, ein alter (echter) Stand gilt nie als neu. Die Adresse des Setups setzt die App selbst zusammen
 * (feste Basis + geprüfter Dateiname), nie aus einer Angabe des Servers.
 */
final class DesktopUpdates {
    static final String BASIS = "https://family-projekt.de/updates/workflow-calculate/";
    /** Je Plattform eine eigene Datei: eine Veröffentlichung überschreibt nie die der anderen Plattform. */
    static final String FEED = "aktuell-windows.json";
    /** Öffentlicher Signatur-Schlüssel (Ed25519, SubjectPublicKeyInfo, Base64 – dieselbe Zeile wie UpdateFeed.SCHLUESSEL unter
     *  Android). Platzhalter, bis Klaus ihn erzeugt (docs/WINDOWS.md): leer heißt „nicht eingerichtet“, kein Netzabruf. */
    static final String SCHLUESSEL = "";
    static final long MAX_SETUP = 1024L * 1024 * 1024;
    interface Netz { byte[] holen(String url, long grenze) throws Exception; InputStream strom(String url) throws Exception; }
    private final Path ordner;
    private final Netz netz;
    private final String installiert, schluessel;
    private JSONObject geprueft;

    DesktopUpdates(Path ordner) { this(ordner, standardNetz(), DesktopBuild.VERSION, SCHLUESSEL); }
    /** Für Proben: anderes Netz, andere Version, anderer (Wegwerf-)Schlüssel. */
    DesktopUpdates(Path ordner, Netz netz, String installiert, String schluessel) { this.ordner = ordner; this.netz = netz; this.installiert = installiert; this.schluessel = schluessel; }

    static Netz standardNetz() {
        HttpClient c = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(15)).followRedirects(HttpClient.Redirect.NEVER).build();
        return new Netz() {
            public byte[] holen(String url, long grenze) throws Exception {
                HttpResponse<InputStream> r = c.send(HttpRequest.newBuilder(URI.create(url)).timeout(Duration.ofSeconds(30)).header("Cache-Control", "no-cache").build(), HttpResponse.BodyHandlers.ofInputStream());
                if (r.statusCode() != 200) { r.body().close(); throw new IOException("UPDATE_NICHT_ERREICHBAR"); }
                try (InputStream in = r.body()) { byte[] b = in.readNBytes((int) grenze + 1); if (b.length > grenze) throw new IOException("UPDATE_UNGUELTIG"); return b; }
            }
            public InputStream strom(String url) throws Exception {
                HttpResponse<InputStream> r = c.send(HttpRequest.newBuilder(URI.create(url)).timeout(Duration.ofMinutes(30)).build(), HttpResponse.BodyHandlers.ofInputStream());
                if (r.statusCode() != 200) { r.body().close(); throw new IOException("UPDATE_NICHT_ERREICHBAR"); }
                return r.body();
            }
        };
    }

    static int[] teile(String v) {
        if (v == null || !v.matches("\\d{1,4}\\.\\d{1,4}\\.\\d{1,4}")) return null;
        String[] p = v.split("\\."); return new int[] { Integer.parseInt(p[0]), Integer.parseInt(p[1]), Integer.parseInt(p[2]) };
    }
    static boolean neuer(String a, String b) {
        int[] x = teile(a), y = teile(b); if (x == null || y == null) return false;
        for (int i = 0; i < 3; i++) if (x[i] != y[i]) return x[i] > y[i];
        return false;
    }
    static boolean echt(byte[] daten, byte[] sig, String schluessel) {
        try {
            PublicKey k = KeyFactory.getInstance("Ed25519").generatePublic(new X509EncodedKeySpec(Base64.getDecoder().decode(schluessel)));
            Signature s = Signature.getInstance("Ed25519"); s.initVerify(k); s.update(daten); return s.verify(sig);
        } catch (Exception e) { return false; }
    }

    /** → {aktuell:true, version} oder {neu, installiert, groesse}. */
    synchronized JSONObject pruefen() throws Exception {
        geprueft = null;
        // Bis Klaus den öffentlichen Schlüssel erzeugt hat (docs/WINDOWS.md), wird nichts gefragt und nie etwas installiert.
        if (schluessel == null || schluessel.isEmpty()) throw new IOException("UPDATE_NICHT_EINGERICHTET");
        byte[] feed, sig;
        try { feed = netz.holen(BASIS + FEED, 65536); sig = netz.holen(BASIS + FEED + ".sig", 1024); }
        catch (IOException e) { throw DesktopService.code(e).startsWith("UPDATE_") ? e : new IOException("UPDATE_NICHT_ERREICHBAR"); }
        byte[] roh;
        try { roh = Base64.getDecoder().decode(new String(sig, StandardCharsets.US_ASCII).trim()); } catch (IllegalArgumentException x) { throw new IOException("UPDATE_UNTERSCHRIFT_FALSCH"); }
        if (!echt(feed, roh, schluessel)) throw new IOException("UPDATE_UNTERSCHRIFT_FALSCH");
        JSONObject f = new JSONObject(new String(feed, StandardCharsets.UTF_8));
        if (f.optInt("format") != 1 || !"workflow-calculate".equals(f.optString("app"))) throw new IOException("UPDATE_UNGUELTIG");
        String v = f.optString("version");
        JSONObject w = f.optJSONObject("windows");
        if (teile(v) == null || w == null) throw new IOException("UPDATE_UNGUELTIG");
        if (!neuer(v, installiert)) return new JSONObject().put("aktuell", true).put("version", installiert);
        String datei = w.optString("datei"), sha = w.optString("sha256");
        long groesse = w.optLong("groesse", -1);
        if (!datei.equals("Workflow-Calculate-Pro-Windows-" + v + "-x64-setup.exe") || !sha.matches("[0-9a-f]{64}") || groesse <= 0 || groesse > MAX_SETUP) throw new IOException("UPDATE_UNGUELTIG");
        geprueft = new JSONObject().put("version", v).put("datei", datei).put("sha256", sha).put("groesse", groesse);
        return new JSONObject().put("neu", v).put("installiert", installiert).put("groesse", groesse);
    }

    /** Lädt das zuletzt geprüfte Setup, prüft Größe und SHA-256, gibt den Pfad zurück. Meldet den Stand als Ereignis. */
    synchronized Path laden() throws Exception {
        JSONObject g = geprueft; if (g == null) throw new IOException("UPDATE_NICHT_GEPRUEFT");
        Files.createDirectories(ordner); DesktopFiles.noLinks(ordner);
        try (DirectoryStream<Path> alt = Files.newDirectoryStream(ordner)) { for (Path p : alt) Files.deleteIfExists(p); }
        Path ziel = ordner.resolve(g.getString("datei")), teil = ordner.resolve(g.getString("datei") + ".teil");
        long groesse = g.getLong("groesse"), n = 0, gemeldet = 0;
        MessageDigest h = MessageDigest.getInstance("SHA-256");
        try (InputStream in = netz.strom(BASIS + g.getString("datei")); OutputStream out = Files.newOutputStream(teil)) {
            byte[] b = new byte[1 << 16]; int r;
            while ((r = in.read(b)) != -1) {
                n += r; if (n > groesse) throw new IOException("UPDATE_UNGUELTIG");
                out.write(b, 0, r); h.update(b, 0, r);
                if (n - gemeldet > (1 << 20)) { gemeldet = n; EngineMain.event("WcUpdates:stand", new JSONObject().put("geladen", n).put("groesse", groesse)); }
            }
        } catch (IOException e) { Files.deleteIfExists(teil); throw DesktopService.code(e).startsWith("UPDATE_") ? e : new IOException("UPDATE_NICHT_ERREICHBAR"); }
        if (n != groesse || !DesktopFiles.hex(h.digest()).equals(g.getString("sha256"))) { Files.deleteIfExists(teil); throw new IOException("UPDATE_BESCHAEDIGT"); }
        Files.move(teil, ziel, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
        return ziel;
    }
}
