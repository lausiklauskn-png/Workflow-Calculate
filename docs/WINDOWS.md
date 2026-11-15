# Workflow Calculate Pro für Windows (Fassung 1.0.0, Klaus 15.11.2026)

Dieselbe Oberfläche wie die Android-App (`docs/ANDROID.md`), gebaut nach Datei-Organizer Pro / BookLedgerPro: **Tauri 2 / WebView2** mit einer
kleinen **Java-Engine** als privatem Kindprozess (eigene Java-Laufzeit per jlink, beim Empfänger muss kein Java installiert sein).

| Teil | Datei |
|---|---|
| Hülle (Rust) | `windows/src-tauri/` – nur `https://tauri.localhost/` im Fenster (App, Impressum, Datenschutz, Sicherheit), Adressen nach draußen an Browser/Mailprogramm, Sitzungsschlüssel für jeden Aufruf |
| Brücke | `windows/bridge/capacitor-tauri.js` stellt `Capacitor.Plugins.WcDateien` und `WcUpdates` bereit; erlaubt ist nur, was in `windows/bridge/contracts.json` steht (gleiche Methoden wie Android, ohne `drucken`) |
| Engine (Java) | `windows/engine/src/`: `DesktopService` (Speichern unter über den Windows-Dialog der Hülle), `DesktopUpdates` (eigener Server) |
| Oberfläche | `windows/tools/build-web.mjs` = dasselbe Web-Paket wie Android (`tools/native/prepare-web.mjs`) |
| Installer | NSIS, nur für den Benutzer, unsigniert; `windows/tools/distribution.mjs` → `Workflow-Calculate-Pro-Windows-X.Y.Z-x64-setup.exe` + `SHA256SUMS` |
| Abläufe | `.github/workflows/windows.yml` (Prüfbau installiert, zweimal gestartet, dann Auslieferungsbau), `windows-release.yml` (nur von Hand, Feld „ja“) |

**Drucken:** WebView2 kann `window.print()` selbst (Druckvorschau mit „Als PDF speichern“) – darum kein eigener Vertrag. ⚠ Nicht gemessen
(der Prüfrechner hat keinen Bildschirm für das Druckfenster).
**Herunterladen:** wie unter Android über `WcDateien.speichern` (Windows-Dialog „Speichern unter“).
**Kein „Öffnen mit“, kein Teilen** (Calculate braucht keinen Datei-Eingang).

## Proben

```bash
LANG=C.UTF-8 node windows/engine/test.mjs    # Engine mit gestellter Hülle (Speichern, Updates mit Wegwerf-Schlüsseln)
node windows/engine/protocol-test.mjs        # echter Kindprozess über stdio
npm ci --ignore-scripts --prefix windows && NODE_PATH=windows/node_modules node windows/tools/test-bruecke.mjs   # Brücke im Browser
```

In GitHub (`windows.yml`): Prüfbau mit Prüf-Schnittstelle installieren, zweimal starten (`windows/pruefung/installed.mjs`: Name, Fassung,
Zugriffsschutz, Updates still, Angebot anlegen, CSV über „Speichern unter“ byte-gleich, Thema; nach Neustart Angebot und Thema noch da),
deinstallieren; danach der Auslieferungsbau ohne Prüf-Schnittstelle (`production.ps1`).

## Was Klaus einmalig tun muss

Den **Update-Schlüssel** wie in `docs/ANDROID.md` (b) – ein Schlüssel für Android und Windows (`DesktopUpdates.SCHLUESSEL` = `UpdateFeed.SCHLUESSEL`).
Bis dahin meldet die App still „nicht eingerichtet“. Veröffentlichen nur auf Klaus' Wort: Actions → „Workflow Calculate Pro Windows
veröffentlichen“ auf `main`, Feld `bestaetigung` = `ja`.

## Grenzen (benannt)

- Kein Windows-PC und kein Rust-Bau in der Bausitzung; ob es baut, zeigt `windows.yml`.
- Unsigniert (Windows SmartScreen warnt beim ersten Start).
- Drucken und Bedeutungssuche in WebView2 nicht gemessen.
