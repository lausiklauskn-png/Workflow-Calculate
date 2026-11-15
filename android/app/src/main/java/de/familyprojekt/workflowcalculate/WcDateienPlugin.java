package de.familyprojekt.workflowcalculate;

import android.app.Activity;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.provider.DocumentsContract;
import android.provider.OpenableColumns;
import android.util.Base64;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;

/**
 * „Speichern unter …“ und Drucken für Workflow Calculate Pro. Die WebView kann kein <a download> (Auftragsdatei für WorkFloh,
 * Sicherung, CSV, Katalog) und kein window.print() (Kundenblatt). Die Seite (native/wc-native.js) gibt den Inhalt hierher.
 * Speichern übernommen aus Datei-Organizer Pro DoDateienPlugin bzw. BookLedgerPro BlpFilesPlugin (Befund SD-Karte 03.11.: Inhalt vor dem
 * Dialog in den Zwischenspeicher, sonst bleibt bei einem Abbruch eine leere Datei stehen; schlägt das Schreiben fehl, wird die
 * angelegte Datei wieder gelöscht). Gespeichert wird nur dorthin, wo der Mensch im Android-Dialog hinzeigt. Drucken über Androids
 * Druckdienst mit dem Inhalt der WebView (die Seite hat das Kundenblatt vorher in #druck gelegt, @media print zeigt nur das).
 */
@CapacitorPlugin(name = "WcDateien")
public final class WcDateienPlugin extends Plugin {
    static final int MAX_BYTES = 64 * 1024 * 1024;
    private final PluginWorker worker = new PluginWorker("dateien");
    private File offen() { return new File(new File(getContext().getCacheDir(), "speichern"), "offen.bin"); }

    @PluginMethod public void speichern(PluginCall call) {
        String data = call.getString("data");
        byte[] bytes;
        try { bytes = data == null || data.length() > MAX_BYTES / 3 * 4 + 8 ? null : Base64.decode(data, Base64.DEFAULT); }
        catch (IllegalArgumentException kaputt) { bytes = null; }
        if (bytes == null) { call.reject("WC_DATEI_UNGUELTIG"); return; }
        File datei = offen();
        try {
            File dir = datei.getParentFile();
            if (dir != null && !dir.isDirectory() && !dir.mkdirs()) throw new java.io.IOException();
            try (FileOutputStream out = new FileOutputStream(datei)) { out.write(bytes); out.getFD().sync(); }
        } catch (Exception keinPlatz) { datei.delete(); call.reject("WC_KEIN_PLATZ"); return; }
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE)
            .setType(NativeUtil.mime(call.getString("mime", "application/octet-stream")))
            .putExtra(Intent.EXTRA_TITLE, NativeUtil.name(call.getString("name", "Workflow-Calculate.json")));
        startActivityForResult(call, intent, "gespeichert");
    }

    @ActivityCallback private void gespeichert(PluginCall call, ActivityResult result) {
        File datei = offen();
        Intent data = result.getData();
        if (result.getResultCode() != Activity.RESULT_OK || data == null || data.getData() == null) {
            datei.delete();
            if (call != null) call.resolve(new JSObject().put("gespeichert", false));
            return;
        }
        Uri uri = data.getData();
        Runnable schreiben = () -> {
            if (!datei.isFile()) { loeschen(uri); if (call != null) call.reject("WC_SPEICHERN_FEHLER"); return; }
            long soll = datei.length();
            try {
                OutputStream out;
                try { out = getContext().getContentResolver().openOutputStream(uri, "wt"); }
                catch (Exception keinWt) { out = getContext().getContentResolver().openOutputStream(uri, "w"); } // frisch angelegt, also leer
                if (out == null) throw new java.io.IOException("WC_SPEICHERN_FEHLER");
                try (OutputStream o = out; InputStream in = new FileInputStream(datei)) {
                    byte[] puffer = new byte[65536]; int n;
                    while ((n = in.read(puffer)) != -1) o.write(puffer, 0, n);
                    o.flush();
                }
                if (soll > 0 && groesse(uri) == 0) throw new java.io.IOException("WC_SPEICHERN_FEHLER");
                datei.delete();
                if (call != null) call.resolve(new JSObject().put("gespeichert", true));
            } catch (Exception error) {
                datei.delete(); loeschen(uri);
                if (call != null) call.reject("WC_SPEICHERN_FEHLER");
            }
        };
        if (call == null) worker.execute(schreiben); else worker.submit(call, schreiben);
    }
    private void loeschen(Uri uri) { try { DocumentsContract.deleteDocument(getContext().getContentResolver(), uri); } catch (Exception egal) { /* gemeldet */ } }
    private long groesse(Uri uri) {
        try (Cursor c = getContext().getContentResolver().query(uri, new String[] { OpenableColumns.SIZE }, null, null, null)) {
            if (c != null && c.moveToFirst() && !c.isNull(0)) return c.getLong(0);
        } catch (Exception unbekannt) { /* manche Anbieter nennen keine Größe */ }
        return -1;
    }

    /** Kundenblatt drucken oder als PDF sichern: Androids Druckdienst mit dem Inhalt der WebView (Druck-CSS der Seite gilt). */
    @PluginMethod public void drucken(PluginCall call) {
        String titel = NativeUtil.name(call.getString("titel", "Workflow Calculate"));
        getActivity().runOnUiThread(() -> {
            try {
                android.print.PrintManager pm = (android.print.PrintManager) getActivity().getSystemService(android.content.Context.PRINT_SERVICE);
                if (pm == null || getBridge() == null) throw new IllegalStateException();
                android.print.PrintDocumentAdapter adapter = getBridge().getWebView().createPrintDocumentAdapter(titel);
                pm.print(titel, adapter, new android.print.PrintAttributes.Builder().setMediaSize(android.print.PrintAttributes.MediaSize.ISO_A4).build());
                call.resolve(new JSObject().put("gestartet", true));
            } catch (Exception keinDruck) { call.reject("WC_DRUCKEN_FEHLER"); }
        });
    }

    @PluginMethod public void appInfo(PluginCall call) {
        try {
            android.content.pm.PackageInfo info = getContext().getPackageManager().getPackageInfo(getContext().getPackageName(), 0);
            call.resolve(new JSObject().put("version", info.versionName == null ? "" : info.versionName).put("plattform", "android"));
        } catch (Exception error) { call.reject("APP_INFO_UNAVAILABLE"); }
    }

    @Override protected void handleOnDestroy() { worker.close(() -> { }); }
}
