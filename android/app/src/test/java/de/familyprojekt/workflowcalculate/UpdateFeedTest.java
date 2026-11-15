package de.familyprojekt.workflowcalculate;

import static org.junit.Assert.*;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import org.junit.Test;

/** Updates vom eigenen Server: Unterschriften wie aus dem Veröffentlichungs-Lauf (openssl pkeyutl -sign -rawin, Base64), erzeugt mit
 *  Wegwerf-Schlüsseln nur für diese Probe (nicht Klaus' Schlüssel; dessen öffentlicher Teil steht in UpdateFeed.SCHLUESSEL). */
public class UpdateFeedTest {
    static final String PUB = "MCowBQYDK2VwAyEAOYXAfbKUL6iptEpZgMk2WBQPEDs22tCn/PdUvy4fSYc=";
    static final String SHA = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    static byte[] feed(String app, String datei, int code) {
        return ("{\"format\":1,\"app\":\"" + app + "\",\"version\":\"0.4.1\",\"android\":{\"datei\":\"" + datei + "\",\"groesse\":1234,\"sha256\":\"" + SHA + "\",\"versionCode\":" + code + "}}").getBytes(StandardCharsets.UTF_8);
    }
    static final byte[] NEU = feed("workflow-calculate", "Workflow-Calculate-Pro-0.4.1.apk", 41), BOESE = feed("workflow-calculate", "../evil.apk", 41),
        CODE = feed("workflow-calculate", "Workflow-Calculate-Pro-0.4.1.apk", 40), FREMDAPP = feed("bookledgerpro", "Workflow-Calculate-Pro-0.4.1.apk", 41);
    static final byte[] NEU_SIG = "27iHmrxjOHvV5swTLoHNjV55kgl2hjS1RzxunfRkq5eX/QtK9+ugZtmfk+bA/1+3XbnyUcEC4+U2w2xg4E14AQ==\n".getBytes(StandardCharsets.US_ASCII);
    static final byte[] BOESE_SIG = "SwHNbQMbcZI8LoiPle9NLVDtVHwCAeWd/8UWXt9iDwHJciGZ66Nr6+Pe5g/9IOzmI/f6IqYvuXiw+bPoRfYgCg==".getBytes(StandardCharsets.US_ASCII);
    static final byte[] CODE_SIG = "FCmhkghEoXOjYCkjy7Qmbk0SDFrrdm7A5mj06gwH/ryJu7icEg1yfbZxGwI2l4O49JjMFW569evdE6J2d5K8Bw==".getBytes(StandardCharsets.US_ASCII);
    static final byte[] FREMDAPP_SIG = "+pMfgfVoO4hkIjr2bLkbTq3ietZpk7DCGwKcQtuGkowXJ2os1BJEKeLD2Cl5htX60rQCFdr/jJ0eKWKGhntACw==".getBytes(StandardCharsets.US_ASCII);
    static final byte[] FREMD_SIG = "Sr2s/3SkgY0Jf83ZQ3pmxE87xfPFQCAsz22xqnZKJRflP/Jjm+6SOLK5vjv3eRzz1StNSH6bJz0E/xgdckSRAQ==".getBytes(StandardCharsets.US_ASCII);
    static String fehler(byte[] f, byte[] s, String v, long c, String k) {
        try { UpdateFeed.auswerten(f, s, v, c, k); return ""; } catch (IOException e) { return e.getMessage(); }
    }

    @Test public void neuereVersionMitEchterUnterschrift() throws Exception {
        UpdateFeed.Angebot a = UpdateFeed.auswerten(NEU, NEU_SIG, "0.4.0", 40, PUB);
        assertNotNull(a);
        assertEquals("0.4.1", a.version); assertEquals("Workflow-Calculate-Pro-0.4.1.apk", a.datei); assertEquals(1234, a.groesse); assertEquals(41, a.versionCode);
    }
    @Test public void debugZusatzWirdIgnoriert() throws Exception { assertNotNull(UpdateFeed.auswerten(NEU, NEU_SIG, "0.4.0-debug", 40, PUB)); }
    @Test public void gleicheOderAeltereVersionIstAktuell() throws Exception {
        assertNull(UpdateFeed.auswerten(NEU, NEU_SIG, "0.4.1", 41, PUB));
        assertNull(UpdateFeed.auswerten(NEU, NEU_SIG, "0.5.0", 50, PUB));
    }
    @Test public void versionCodeMussSteigen() throws Exception { assertNull(UpdateFeed.auswerten(CODE, CODE_SIG, "0.4.0", 40, PUB)); }
    @Test public void fremdeUnterschrift() { assertEquals("UPDATE_UNTERSCHRIFT_FALSCH", fehler(NEU, FREMD_SIG, "0.4.0", 40, PUB)); }
    @Test public void veraenderteAngaben() {
        byte[] f = NEU.clone(); f[f.length - 3] = '9';
        assertEquals("UPDATE_UNTERSCHRIFT_FALSCH", fehler(f, NEU_SIG, "0.4.0", 40, PUB));
    }
    @Test public void kaputteUnterschrift() { assertEquals("UPDATE_UNTERSCHRIFT_FALSCH", fehler(NEU, "@@@".getBytes(), "0.4.0", 40, PUB)); }
    @Test public void fremderDateinameAuchUnterschrieben() { assertEquals("UPDATE_UNGUELTIG", fehler(BOESE, BOESE_SIG, "0.4.0", 40, PUB)); }
    @Test public void feedEinerAnderenAppAuchUnterschrieben() { assertEquals("UPDATE_UNGUELTIG", fehler(FREMDAPP, FREMDAPP_SIG, "0.4.0", 40, PUB)); }
    @Test public void ohneSchluesselNichtEingerichtet() {
        assertEquals("UPDATE_NICHT_EINGERICHTET", fehler(NEU, NEU_SIG, "0.4.0", 40, ""));
        assertEquals("UPDATE_NICHT_EINGERICHTET", fehler(NEU, NEU_SIG, "0.4.0", 40, "kein-schluessel"));
        assertFalse(UpdateFeed.echt(NEU, UpdateFeed.b64(new String(NEU_SIG, StandardCharsets.US_ASCII)), ""));
    }
    @Test public void eingebauterSchluesselLeerOderGueltig() {
        // Platzhalter bis Klaus den Schlüssel erzeugt: leer heißt „nicht eingerichtet“; ein eingetragener muss gültig sein.
        assertTrue(UpdateFeed.SCHLUESSEL.isEmpty() || UpdateFeed.eingerichtet(UpdateFeed.SCHLUESSEL));
        assertTrue(UpdateFeed.eingerichtet(PUB));
    }
    @Test public void base64() {
        assertArrayEquals("ab".getBytes(), UpdateFeed.b64("YWI="));
        assertArrayEquals("abc".getBytes(), UpdateFeed.b64("YWJj"));
        assertArrayEquals("abcd".getBytes(), UpdateFeed.b64("YWJjZA"));
    }
    @Test public void versionsvergleich() {
        assertTrue(UpdateFeed.neuer("0.10.0", "0.9.9")); assertFalse(UpdateFeed.neuer("0.4.0", "0.4.0")); assertFalse(UpdateFeed.neuer("1.0.0-x", "0.1.0"));
        assertEquals("Workflow-Calculate-Pro-0.4.0.apk", UpdateFeed.dateiName("0.4.0"));
    }
}
