# Workflow Calculate Pro – die Android-App (Fassung 1.0.0, Klaus 15.11.2026)

Klaus 15.11.2026: „Workflow Needs und Calculate zu einer APK und einer Windows-Version bauen und sie Pro nennen.“
Vorbild in allem: Datei-Organizer Pro (`docs/ANDROID.md` dort) und dahinter BookLedgerPro. Windows: `docs/WINDOWS.md`
(gleiche Verträge, gleicher Update-Schlüssel).

| Fassung | Name | Wo |
|---|---|---|
| Web-App (PWA) | **Workflow Calculate** | GitHub Pages, unverändert |
| Android-App | **Workflow Calculate Pro** | Paket `de.familyprojekt.workflowcalculate`, APK `Workflow-Calculate-Pro-X.Y.Z.apk` |

Speicher-Namen bleiben in beiden gleich (IndexedDB `WorkflowCalculate1`, localStorage `workflowcalculate_*`).

## Aufbau

| Teil | Datei |
|---|---|
| Web-Paket | `tools/native/prepare-web.mjs` → `www/` + Beleg `native-bundle.json`. Nimmt aus `git ls-files` nur Seiten, `assets/`, `modules/`, `vendor/`, `icons/` (ohne `icons/quelle/`), byte-gleich. Drei benannte Abweichungen: kein `sw.js`, die Anmeldung des Service Workers fehlt in der Kopie von `index.html`, und `native/wc-native.js` wird dort direkt nach der SBKIM-Schublade geladen. |
| Die EINE Stelle der App-Unterschiede | `native/wc-native.js` (nur im App-Paket; PWA und die BookLedgerPro-Kopie laden sie nie) |
| Capacitor (8.5.3) | `capacitor.config.json` (`webDir: www`, `https://localhost`, keine WebView-Fehlersuche) |
| Android-Projekt | `android/` (Java in `android/app/src/main/java/de/familyprojekt/workflowcalculate/`) |
| Hülle | `MainActivity.java`: nur `https://localhost` im Fenster, fremde Adressen (BookLedgerPro, WorkFloh, Lieferanten-Links) an den Browser, `mailto:` an das Mailprogramm, Schrift 100 %, Neuaufbau bei Anzeigeausfall |
| Speichern unter, Drucken | `WcDateienPlugin.java` (`WcDateien`: `speichern`, `drucken`, `appInfo`) |
| Updates | `UpdateFeed.java` (Regel, rein) + `WcUpdatesPlugin.java` (`WcUpdates`: `pruefen`, `installieren`) |
| Probe ohne Android | `tools/native/test-native.mjs` (auch das App-Paket im Browser mit gestellter Brücke) |
| JVM-Proben | `UpdateFeedTest.java` (Wegwerf-Schlüssel), `NativeUtilTest.java` |
| Signieren | `tools/signing/` (aus Datei-Organizer, Namen umgestellt; Freigabe `WC_SIGNING_UNLOCK`) |
| Abläufe | `.github/workflows/android.yml` (Prüf-Bau bei PR/main), `signing-identity.yml` (nur von Hand), `android-release.yml` (nur von Hand) |

## Was die App anders macht als die PWA (alles in `native/wc-native.js`)

- **Name** „Workflow Calculate Pro“ in Kopf und Titel, darunter „Pro 1.0.0“ (Tipp sucht nach Updates).
- **Herunterladen** (Auftragsdatei für WorkFloh, Sicherung, CSV, Katalog): die WebView kann kein `<a download>`; die App fängt den Klick ab
  und öffnet Androids „Speichern unter“ (`WcDateien.speichern`, Inhalt vorher im Zwischenspeicher, höchstens 64 MB).
- **Drucken** (Kundenblatt): Androids Druckdienst mit dem Inhalt der WebView (`WcDateien.drucken`, A4; „Als PDF speichern“ geht dort).
- **Dateiwahl** (Bilder, Unterlagen, Anfrage-.eml, Tabelle, Sicherung): Capacitors Standard (Androids Dateiwahl).
- **Spracheingabe aus**: die WebView meldet die Web-Spracherkennung, verweigert sie aber (Befund Private Brain Pro). Das Mikrofon im Suchfeld
  ist gesperrt und sagt „bitte tippen“. Ehrlich ausgeblendet, nicht nachgebaut.
- **Kein Service Worker**, **kein Installieren-Knopf**.
- **An BookLedgerPro / WorkFloh**: öffnet die PWA im Browser (andere App, anderer Speicher).
- **Bedeutungssuche**: lädt das Modell wie die PWA von family-projekt.de (Programm von jsDelivr). Die App hat keine CSP, die das sperrt –
  am Gerät ungeprüft.

### Updates vom eigenen Server

Feed `https://family-projekt.de/updates/workflow-calculate/aktuell-android.json` + `.sig` (Ed25519 über genau die Bytes, Format 1,
`app: "workflow-calculate"`), gebaut von `tools/native/update-feed-android.mjs`. Die App glaubt nur der Unterschrift, nimmt nur eine
**neuere** Fassung, nur `Workflow-Calculate-Pro-X.Y.Z.apk`, prüft Größe, SHA-256, Paket, Zertifikat und versionCode, dann Androids
Installieren-Fenster. Still gefragt beim Start (2,5 s), beim Zurückholen, höchstens einmal je Stunde (`wc_update_still_v1`).
**Solange `UpdateFeed.SCHLUESSEL` leer ist (Platzhalter), meldet die App still „nicht eingerichtet“ und fragt nichts.**

### Fassungsnummern

`package.json` = `versionName` (`android/app/build.gradle`) = `windows/src-tauri/tauri.conf.json` = `Cargo.toml` = `windows/package.json`;
`versionCode` = Haupt × 1000 + Neben × 10 + Flick (1.0.0 → 1000). `test-native.mjs` prüft das.

## Proben

```bash
npm install
node tools/native/test-native.mjs   # Web-Paket, Kennungen, Rechte, Feed; App-Paket im Browser (gestellte Brücke) und PWA unberührt
npm test                            # die Web-App (kern + browser), unverändert
npm run sync:android                # www/ bauen und in android/ legen
cd android && ./gradlew assembleDebug lintDebug testDebugUnitTest   # braucht ein Android-SDK → nur in GitHub (android.yml)
```

## Was Klaus einmalig tun muss (nichts davon tut Claude, nichts wird ohne Klaus' Wort veröffentlicht)

**(a) Eigene Signieridentität** (nur für Workflow Calculate Pro, nie den Schlüssel einer anderen App):

1. Freigabe erzeugen (Termux): `openssl rand -hex 32 > ~/wc-signing-freigabe.txt` – verschlüsselt sichern (`age -p`), die offene Datei
   danach löschen. **Nie in den Chat.**
2. GitHub → Workflow-Calculate → Settings → Environments → **New environment** `android-production` → **Add environment secret**
   Name `WC_SIGNING_UNLOCK`, Wert = Inhalt der Datei.
3. Actions → **„Dauerhafte Workflow-Calculate-Pro-Signieridentität“** → Run workflow auf `main`, Operation **initialize**. Der Lauf legt
   einen PR mit dem verschlüsselten Paket und dem öffentlichen Fingerabdruck an. ⚠ Wer die Freigabe verliert, kann nach der ersten
   Veröffentlichung keine Updates mehr ausliefern.

**(b) Update-Server** (Termux, ein Block; der Hochlade-Schlüssel von BookLedgerPro darf schon in `/srv/family-project/updates` schreiben):

```
A=workflow-calculate; R=lausiklauskn-png/Workflow-Calculate; S=root@167.233.204.72
ssh $S "mkdir -p /srv/family-project/updates/$A && echo '{\"probe\":1}' > /srv/family-project/updates/$A/probe.json"
curl -s https://family-projekt.de/updates/$A/probe.json; echo
mkdir -p ~/$A-update && cd ~/$A-update
[ -f signatur.pem ] || openssl genpkey -algorithm ed25519 -out signatur.pem; chmod 600 signatur.pem
gh secret set UPDATE_SIGNING_KEY -R $R < signatur.pem
gh secret set UPDATE_UPLOAD_KEY -R $R < ~/blp-update/upload
gh secret list -R $R | grep UPDATE_
echo "== öffentlicher Schlüssel:"; openssl pkey -in signatur.pem -pubout | sed -n 2p
```

Danach die **eine Zeile** nach „öffentlicher Schlüssel:“ (beginnt mit `MCowBQYDK2VwAyEA`, öffentlich) an Claude geben; sie kommt in
`UpdateFeed.SCHLUESSEL` (Android) **und** `DesktopUpdates.SCHLUESSEL` (Windows). `signatur.pem` bleibt nur in Termux.

**(c) Veröffentlichen** (erst nach a und b, nur auf Klaus' Wort): Actions → „Workflow Calculate Pro Android veröffentlichen“ auf `main`,
Tag `v1.0.0` (= `versionName`), voller main-Commit (Check „android“ grün), Feld `bestaetigung` = `ja`. Der Lauf baut, signiert, prüft im
Emulator (Angebot anlegen, überinstallieren, Angebot noch da), veröffentlicht, prüft den Download, unterschreibt den Feed und lädt ihn
nach `family-projekt.de/updates/workflow-calculate/`.

## Grenzen (benannt)

- **Kein Gerät, kein Emulator-Lauf, kein Android-Bau in der Bausitzung** (kein Android-SDK im Behälter). Ob Gradle und Lint bestehen, zeigt
  `android.yml`. Lokal geprüft: JVM-Proben, Node-Probe, Browser mit gestellter Brücke.
- Am Gerät ungeprüft: Speichern unter (SD-Karte, Cloud-Anbieter), Drucken/„Als PDF speichern“, Dateiwahl mit Kamera, Bedeutungssuche
  (Modell-Download in der WebView), Sprung nach BookLedgerPro/WorkFloh im Browser.
- Sicherungen über 64 MB (viele Bilder) lassen sich in der App nicht über „Speichern unter“ ablegen (Grenze wie Datei-Organizer).
- Spracheingabe gibt es in der App nicht (siehe oben).
- Kein echter Update-Server, keine echte Unterschrift gemessen (nur Wegwerf-Schlüssel in den Proben).
