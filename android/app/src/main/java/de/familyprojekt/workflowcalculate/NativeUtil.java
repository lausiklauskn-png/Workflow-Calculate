package de.familyprojekt.workflowcalculate;

import java.util.Locale;

/** Kleine Helfer der Hülle. Rein, ohne Android, in JVM-Proben geprüft (NativeUtilTest). */
final class NativeUtil {
    private NativeUtil() { }

    static String hex(byte[] value) {
        StringBuilder out = new StringBuilder(value.length * 2);
        for (byte b : value) out.append(String.format(Locale.ROOT, "%02x", b & 255));
        return out.toString();
    }

    /**
     * Zahl aus einem Brücken-Aufruf. Nie Capacitors getLong für kleine Zahlen: die kommen aus dem JSON als Integer an, getLong
     * gibt dann den Ersatzwert zurück (Familienakte, Gerätetest 11.11.2026: „Größe -1 statt 0“). Darum jede Zahl annehmen.
     */
    static long zahl(Object wert, long ersatz) {
        if (!(wert instanceof Number)) return ersatz;
        double d = ((Number) wert).doubleValue();
        if (!Double.isFinite(d) || d != Math.rint(d)) return ersatz;
        return ((Number) wert).longValue();
    }

    /** Dateiname für „Speichern unter …“: nur der letzte Teil, ohne Steuer- und Sonderzeichen, nicht mit Punkt beginnend. */
    static String name(String roh) {
        String n = roh == null ? "" : roh;
        int i = Math.max(n.lastIndexOf('/'), n.lastIndexOf('\\')); if (i >= 0) n = n.substring(i + 1);
        n = n.replaceAll("[\\p{Cntrl}:*?\"<>|]", "_").trim();
        while (n.startsWith(".")) n = n.substring(1);
        if (n.isEmpty()) n = "Datei";
        return n.length() > 180 ? n.substring(0, 180) : n;
    }

    /** Art für Androids Speichern-Fenster: nur eine gültig geformte Angabe, sonst allgemein. */
    static String mime(String roh) {
        String m = roh == null ? "" : roh.split(";", 2)[0].trim().toLowerCase(Locale.ROOT);
        return m.matches("[a-z0-9.+-]+/[a-z0-9.+-]+") ? m : "application/octet-stream";
    }

    /** Klaus' eigene Apps unter lausiklauskn-png.github.io (BookLedgerPro, WorkFloh) dürfen auch ohne Tipp im Browser geöffnet werden:
     *  „An BookLedgerPro“ springt nach dem Speichern, also nicht mehr im Tipp. */
    static boolean eigeneAdresse(String scheme, String host) {
        return "https".equals(scheme) && "lausiklauskn-png.github.io".equals(host);
    }
}
