package de.familyprojekt.workflowcalculate;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.Map;
import net.i2p.crypto.eddsa.EdDSAEngine;
import net.i2p.crypto.eddsa.EdDSAPublicKey;
import net.i2p.crypto.eddsa.spec.EdDSANamedCurveTable;
import net.i2p.crypto.eddsa.spec.EdDSAPublicKeySpec;

/**
 * Reine Regel für Updates vom eigenen Server (Workflow Calculate Pro, Klaus 15.11.2026, Vorbild Datei-Organizer/BookLedgerPro UpdateFeed): nur mit gültiger
 * Ed25519-Unterschrift über genau die Bytes von aktuell-android.json, nur eine neuere Version (Name und versionCode), nur ein
 * Dateiname nach festem Muster „Workflow-Calculate-Pro-X.Y.Z.apk“. Android kann Ed25519 erst ab 13 selbst prüfen, darum die kleine
 * Prüfbibliothek net.i2p.crypto:eddsa (nur Prüfen). Ohne Android-Bezug, in JVM-Proben geprüft (UpdateFeedTest).
 */
final class UpdateFeed {
    static final String BASIS = "https://family-projekt.de/updates/workflow-calculate/";
    static final String FEED = "aktuell-android.json";
    /**
     * Öffentlicher Signatur-Schlüssel (SubjectPublicKeyInfo, Ed25519, Base64). Platzhalter, bis Klaus ihn erzeugt
     * (docs/ANDROID.md, Schritt b): leer heißt „nicht eingerichtet“, die App fragt dann still nichts. Der geheime Teil liegt nur
     * in Termux und als GitHub-Geheimnis UPDATE_SIGNING_KEY. Dieselbe Zeile steht in DesktopUpdates.SCHLUESSEL (Windows).
     */
    static final String SCHLUESSEL = "";
    static final long MAX_APK = 512L * 1024 * 1024;
    private static final byte[] SPKI_KOPF = { 0x30, 0x2a, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x03, 0x21, 0x00 };
    private UpdateFeed() { }

    static final class Angebot {
        final String version, datei, sha256; final long groesse, versionCode;
        Angebot(String version, String datei, String sha256, long groesse, long versionCode) {
            this.version = version; this.datei = datei; this.sha256 = sha256; this.groesse = groesse; this.versionCode = versionCode;
        }
    }

    /** Ist ein gültig geformter öffentlicher Schlüssel eingetragen? */
    static boolean eingerichtet(String schluessel) {
        try { byte[] k = b64(schluessel == null ? "" : schluessel); return k.length == 44 && Arrays.equals(Arrays.copyOf(k, 12), SPKI_KOPF); }
        catch (IllegalArgumentException x) { return false; }
    }

    static int[] teile(String v) {
        if (v == null || !v.matches("\\d{1,4}\\.\\d{1,4}\\.\\d{1,4}")) return null;
        String[] p = v.split("\\.");
        return new int[] { Integer.parseInt(p[0]), Integer.parseInt(p[1]), Integer.parseInt(p[2]) };
    }
    static boolean neuer(String a, String b) {
        int[] x = teile(a), y = teile(b);
        if (x == null || y == null) return false;
        for (int i = 0; i < 3; i++) if (x[i] != y[i]) return x[i] > y[i];
        return false;
    }
    /** „0.4.0-debug“ → „0.4.0“; sonst unverändert. */
    static String ohneZusatz(String name) {
        if (name == null) return "";
        int i = name.indexOf('-');
        return i < 0 ? name : name.substring(0, i);
    }
    static String dateiName(String version) { return "Workflow-Calculate-Pro-" + version + ".apk"; }

    /** Base64 (Standard, mit oder ohne Auffüllung); eigene kleine Fassung wie in BookLedgerPro. */
    static byte[] b64(String s) {
        String abc = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        String t = s.trim();
        while (t.endsWith("=")) t = t.substring(0, t.length() - 1);
        if (t.length() % 4 == 1) throw new IllegalArgumentException("BASE64");
        byte[] out = new byte[t.length() * 3 / 4];
        int bits = 0, n = 0, o = 0;
        for (int i = 0; i < t.length(); i++) {
            int v = abc.indexOf(t.charAt(i));
            if (v < 0) throw new IllegalArgumentException("BASE64");
            bits = (bits << 6) | v; n += 6;
            if (n >= 8) { n -= 8; out[o++] = (byte) (bits >> n); }
        }
        return o == out.length ? out : Arrays.copyOf(out, o);
    }

    static boolean echt(byte[] daten, byte[] sig, String schluessel) {
        try {
            if (!eingerichtet(schluessel) || sig.length != 64) return false;
            byte[] spki = b64(schluessel);
            EdDSAPublicKey k = new EdDSAPublicKey(new EdDSAPublicKeySpec(Arrays.copyOfRange(spki, 12, 44), EdDSANamedCurveTable.getByName(EdDSANamedCurveTable.ED_25519)));
            EdDSAEngine e = new EdDSAEngine(MessageDigest.getInstance("SHA-512"));
            e.initVerify(k);
            e.update(daten);
            return e.verify(sig);
        } catch (Exception x) { return false; }
    }

    /** null = installierte Fassung ist aktuell. Wirft UPDATE_NICHT_EINGERICHTET / UPDATE_UNTERSCHRIFT_FALSCH / UPDATE_UNGUELTIG. */
    static Angebot auswerten(byte[] feed, byte[] sigText, String installiert, long installiertCode, String schluessel) throws IOException {
        if (!eingerichtet(schluessel)) throw new IOException("UPDATE_NICHT_EINGERICHTET");
        byte[] sig;
        try { sig = b64(new String(sigText, StandardCharsets.US_ASCII).trim()); }
        catch (IllegalArgumentException x) { throw new IOException("UPDATE_UNTERSCHRIFT_FALSCH"); }
        if (!echt(feed, sig, schluessel)) throw new IOException("UPDATE_UNTERSCHRIFT_FALSCH");
        Map<String, Object> f = Json.objekt(new String(feed, StandardCharsets.UTF_8));
        if (Json.zahlOder(f, "format", 0) != 1 || !"workflow-calculate".equals(Json.textOder(f, "app", ""))) throw new IOException("UPDATE_UNGUELTIG");
        String v = Json.textOder(f, "version", "");
        Object a = f.get("android");
        if (teile(v) == null || !(a instanceof Map)) throw new IOException("UPDATE_UNGUELTIG");
        @SuppressWarnings("unchecked") Map<String, Object> an = (Map<String, Object>) a;
        long code = Json.zahlOder(an, "versionCode", -1);
        if (!neuer(v, ohneZusatz(installiert)) || code <= installiertCode) return null;
        String datei = Json.textOder(an, "datei", ""), sha = Json.textOder(an, "sha256", "");
        long groesse = Json.zahlOder(an, "groesse", -1);
        if (!datei.equals(dateiName(v)) || !sha.matches("[0-9a-f]{64}") || groesse <= 0 || groesse > MAX_APK) throw new IOException("UPDATE_UNGUELTIG");
        return new Angebot(v, datei, sha, groesse, code);
    }
}
