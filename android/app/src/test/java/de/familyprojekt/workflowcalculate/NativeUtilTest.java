package de.familyprojekt.workflowcalculate;

import static org.junit.Assert.*;

import org.junit.Test;

public class NativeUtilTest {
    @Test public void zahlNimmtAuchInteger() {
        // Familienakte, Gerätetest 11.11.2026: kleine Zahlen kommen als Integer – getLong gab den Ersatzwert.
        assertEquals(0L, NativeUtil.zahl(Integer.valueOf(0), -1));
        assertEquals(1048576L, NativeUtil.zahl(Integer.valueOf(1048576), -1));
        assertEquals(5000000000L, NativeUtil.zahl(Long.valueOf(5000000000L), -1));
        assertEquals(7L, NativeUtil.zahl(Double.valueOf(7.0), -1));
        assertEquals(-1L, NativeUtil.zahl(Double.valueOf(7.5), -1));
        assertEquals(-1L, NativeUtil.zahl("7", -1));
        assertEquals(-1L, NativeUtil.zahl(null, -1));
    }
    @Test public void dateinamen() {
        assertEquals("Angebote-intern-2026-11-15.csv", NativeUtil.name("Angebote-intern-2026-11-15.csv"));
        assertEquals("x.json", NativeUtil.name("../../x.json"));
        assertEquals("a_b.json", NativeUtil.name("a:b.json"));
        assertEquals("env", NativeUtil.name(".env"));
        assertEquals("Datei", NativeUtil.name(null));
        assertEquals("Datei", NativeUtil.name(" "));
        assertEquals(180, NativeUtil.name(new String(new char[300]).replace('\0', 'a')).length());
    }
    @Test public void arten() {
        assertEquals("text/csv", NativeUtil.mime("text/csv;charset=utf-8"));
        assertEquals("application/json", NativeUtil.mime("application/json"));
        assertEquals("application/octet-stream", NativeUtil.mime("<script>"));
        assertEquals("application/octet-stream", NativeUtil.mime(null));
    }
    @Test public void hexUndAdressen() {
        assertEquals("00ff10", NativeUtil.hex(new byte[] { 0, (byte) 255, 16 }));
        assertTrue(NativeUtil.eigeneAdresse("https", "lausiklauskn-png.github.io"));
        assertFalse(NativeUtil.eigeneAdresse("http", "lausiklauskn-png.github.io"));
        assertFalse(NativeUtil.eigeneAdresse("https", "example.com"));
    }
}
