package de.familyprojekt.workflowcalculate;

import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.net.Uri;
import android.os.Build;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;

/**
 * Updates vom eigenen Server für Workflow Calculate Pro (Klaus 15.11.2026), übernommen aus Datei-Organizer Pro bzw. BookLedgerPro BlpUpdatesPlugin: von Klaus'
 * Server, nur mit gültiger Unterschrift (UpdateFeed). Ohne eingetragenen öffentlichen Schlüssel: UPDATE_NICHT_EINGERICHTET. Laden: Größe und SHA-256 wie im unterschriebenen Feed, dann muss die APK dasselbe Paket und dasselbe
 * Signier-Zertifikat tragen wie die installierte App und einen höheren versionCode — erst dann öffnet Android sein
 * Installieren-Fenster. Ohne Erlaubnis „Apps installieren“ führt die App zuerst in diese Einstellung.
 */
@CapacitorPlugin(name = "WcUpdates")
public final class WcUpdatesPlugin extends Plugin {
    private final PluginWorker worker = new PluginWorker("updates");
    private UpdateFeed.Angebot geprueft;

    private static String code(Exception e) {
        String m = e.getMessage();
        return m != null && m.matches("[A-Z_]{3,60}") ? m : "UPDATE_NICHT_ERREICHBAR";
    }
    private static HttpURLConnection oeffnen(String url) throws IOException {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setInstanceFollowRedirects(false); c.setConnectTimeout(15000); c.setReadTimeout(30000); c.setUseCaches(false);
        if (c.getResponseCode() != 200) { c.disconnect(); throw new IOException("UPDATE_NICHT_ERREICHBAR"); }
        return c;
    }
    private static byte[] holen(String url, int grenze) throws IOException {
        HttpURLConnection c = oeffnen(url);
        try (InputStream in = c.getInputStream()) {
            ByteArrayOutputStream out = new ByteArrayOutputStream(); byte[] b = new byte[8192]; int n;
            while ((n = in.read(b)) != -1) { out.write(b, 0, n); if (out.size() > grenze) throw new IOException("UPDATE_UNGUELTIG"); }
            return out.toByteArray();
        } finally { c.disconnect(); }
    }
    private PackageInfo installiert() throws Exception {
        Context ctx = getContext();
        return ctx.getPackageManager().getPackageInfo(ctx.getPackageName(), Build.VERSION.SDK_INT >= 28 ? PackageManager.GET_SIGNING_CERTIFICATES : PackageManager.GET_SIGNATURES);
    }
    @SuppressWarnings("deprecation")
    private static long code(PackageInfo p) { return Build.VERSION.SDK_INT >= 28 ? p.getLongVersionCode() : p.versionCode; }
    @SuppressWarnings("deprecation")
    private static String zertifikat(PackageInfo p) throws Exception {
        Signature[] s = Build.VERSION.SDK_INT >= 28 && p.signingInfo != null ? p.signingInfo.getApkContentsSigners() : p.signatures;
        if (s == null || s.length != 1) throw new IOException("UPDATE_ZERTIFIKAT");
        return NativeUtil.hex(MessageDigest.getInstance("SHA-256").digest(s[0].toByteArray()));
    }

    @PluginMethod public void pruefen(PluginCall call) {
        worker.submit(call, () -> {
            try {
                geprueft = null;
                if (!UpdateFeed.eingerichtet(UpdateFeed.SCHLUESSEL)) throw new IOException("UPDATE_NICHT_EINGERICHTET");
                PackageInfo ich = installiert();
                byte[] feed = holen(UpdateFeed.BASIS + UpdateFeed.FEED, 65536), sig = holen(UpdateFeed.BASIS + UpdateFeed.FEED + ".sig", 1024);
                String version = UpdateFeed.ohneZusatz(ich.versionName);
                UpdateFeed.Angebot a = UpdateFeed.auswerten(feed, sig, version, code(ich), UpdateFeed.SCHLUESSEL);
                if (a == null) { call.resolve(new JSObject().put("aktuell", true).put("version", version).put("installiert", version)); return; }
                geprueft = a;
                call.resolve(new JSObject().put("neu", a.version).put("installiert", version).put("groesse", a.groesse));
            } catch (Exception e) { call.reject(code(e), code(e)); }
        });
    }

    @PluginMethod public void installieren(PluginCall call) {
        worker.submit(call, () -> {
            UpdateFeed.Angebot a = geprueft;
            File ordner = new File(getContext().getCacheDir(), "update");
            try {
                if (a == null) throw new IOException("UPDATE_NICHT_GEPRUEFT");
                if (Build.VERSION.SDK_INT >= 26 && !getContext().getPackageManager().canRequestPackageInstalls()) {
                    Intent erlaubnis = new Intent(android.provider.Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getContext().getPackageName())).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    getActivity().startActivity(erlaubnis);
                    call.resolve(new JSObject().put("erlaubnis", true));
                    return;
                }
                if (!ordner.isDirectory() && !ordner.mkdirs()) throw new IOException("UPDATE_NICHT_ERREICHBAR");
                File[] alt = ordner.listFiles(); if (alt != null) for (File f : alt) f.delete();
                File apk = new File(ordner, a.datei), teil = new File(ordner, a.datei + ".teil");
                MessageDigest h = MessageDigest.getInstance("SHA-256");
                long n = 0, gemeldet = 0;
                HttpURLConnection c = oeffnen(UpdateFeed.BASIS + a.datei);
                try (InputStream in = c.getInputStream(); OutputStream out = new FileOutputStream(teil)) {
                    byte[] b = new byte[1 << 16]; int r;
                    while ((r = in.read(b)) != -1) {
                        n += r; if (n > a.groesse) throw new IOException("UPDATE_UNGUELTIG");
                        out.write(b, 0, r); h.update(b, 0, r);
                        if (n - gemeldet > (1 << 20)) { gemeldet = n; notifyListeners("stand", new JSObject().put("geladen", n).put("groesse", a.groesse)); }
                    }
                } finally { c.disconnect(); }
                if (n != a.groesse || !NativeUtil.hex(h.digest()).equals(a.sha256)) { teil.delete(); throw new IOException("UPDATE_BESCHAEDIGT"); }
                if (!teil.renameTo(apk)) throw new IOException("UPDATE_NICHT_ERREICHBAR");
                // Dasselbe Paket, dasselbe Zertifikat, höherer versionCode — sonst nichts installieren.
                PackageInfo ich = installiert();
                PackageInfo neu = getContext().getPackageManager().getPackageArchiveInfo(apk.getPath(), Build.VERSION.SDK_INT >= 28 ? PackageManager.GET_SIGNING_CERTIFICATES : PackageManager.GET_SIGNATURES);
                if (neu == null || !ich.packageName.equals(neu.packageName) || code(neu) != a.versionCode || code(neu) <= code(ich)
                    || !zertifikat(ich).equals(zertifikat(neu))) { apk.delete(); throw new IOException("UPDATE_ZERTIFIKAT"); }
                Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", apk);
                Intent installieren = new Intent(Intent.ACTION_VIEW).setDataAndType(uri, "application/vnd.android.package-archive")
                    .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                getActivity().startActivity(installieren);
                call.resolve(new JSObject().put("gestartet", true));
            } catch (Exception e) {
                File[] reste = ordner.listFiles(); if (reste != null) for (File f : reste) if (f.getName().endsWith(".teil")) f.delete();
                call.reject(code(e), code(e));
            }
        });
    }

    @Override protected void handleOnDestroy() { worker.close(() -> { }); }
}
