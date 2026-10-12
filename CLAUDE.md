# Workflow Calculate — Sitzungs-Anker

Angebotsplaner als PWA, ohne Build-Schritt, offline. Gebaut 2026-10-12 nach Klaus' Plan
(Angebotsplaner aus BookLedgerPro, Workflow-Needs und Tomys Hub zusammengeführt). Layout und
Vorgehen aus **Workflow-Needs** übernommen, Akzent **Blau/Petrol** statt Messing (auf Anhieb zu
unterscheiden), Violett = intern wie dort.

## Aufbau (klassische Skripte, im Browser `window.WC`, in Node `globalThis.WC`)

| Datei | Aufgabe |
|---|---|
| `assets/kern/geld.js` | Cent-Rechnung, aus Workflow-Needs (dort aus BookLedgerPro `money.js`) |
| `assets/kern/mengen.js` | Mengenregeln `stueck · flaeche · rolle · platte · laenge` (Nesting auf Rolle/Platte), kein `eval` |
| `assets/kern/kalkulation.js` | **Zuschlagskalkulation** (MEK+MGK, FEK+FGK+Maschine, HK, VwGK/VtGK, SK, Gewinn, Skonto/Provision und Rabatt im Hundert), vereinfachter Modus = dieselben Felder · Satz-Ebenen · Farben · Staffel · Rückrechnung · Stundensatz- und Zuschlags-Rechner |
| `assets/kern/versand.js` | Verpackung × Anzahl × Dienst, günstigster passender; Sperrgut; passt nichts → „kein Tarif passt“ |
| `assets/kern/markt.js` | Marktvergleich: drei Klassen mit Mengengrenze, nur eingetragene Preise |
| `assets/kern/angebot.js` | Angebot: Nummer `AN-JJJJ-NNNN`, Positionen, Versandposten, Summen, Einfrieren (`stand`) |
| `assets/kern/aussen.js` | **Whitelist** fürs Kundenblatt (Muster BookLedgerPro `externesAngebot`) |
| `assets/kern/uebergabe.js` | Weiterleitungs-Bündel für Mein WorkFloh / Tomys WorkFloh (Format wie Workflow-Needs) **und** `?uebernahme=` an BookLedgerPro (Datenvertrag v1, `quelle: "workflow-calculate"`), beides nur aus der Whitelist |
| `assets/kern/sicherung.js` | verschlüsselte Sicherung (Angebote, Kunden, Bilder, Katalog, Einstellungen), Zurückholen fügt hinzu |
| `assets/schluesseltresor.js` | **byte-1:1 aus Workflow-Needs** (dort aus kim-hub-company), SHA in `tests/kern.mjs` — nie hier abwandeln |
| `assets/kern/katalog.js` | Katalog prüfen, ex-/importieren, Platzhalter zählen, **Arbeitsgebiet hinzufügen** (`gebietHinzufuegen`: nur Fehlendes, eigene Zahlen bleiben) |
| `assets/kern/nachkalk.js` | **Nachkalkulation** (Stufe 3): Plan gegen Ist am gestellten Angebot, Faktor je Vorlage, Übernahme ins Zeit-Muster (einmal je Befund) |
| `assets/daten/werbetechnik.js` | Startkatalog — **alle Zahlen Platzhalter** (`platzhalter: true`); registriert `WC.STARTKATALOGE` |
| `assets/daten/stickerei.js` · `dienstleistung.js` | weitere Arbeitsgebiete (Stufe 3), Platzhalter; Stickerei rechnet nach **Stichzahl** (`stiche`, Einheit `tsd_stiche`) |
| `assets/daten/beispiel-angebote.js` | 4 Beispiel-Angebote, 15 Positionen, alle drei Gebiete — Kunden erfunden; holt fehlende Gebiete mit |
| `assets/daten/bilder.js` | Beispielbilder als **Zeichnungen** (SVG), mehrere Ansichten je Beispiel |
| `assets/app.js` · `app.css` | Oberfläche (Schrittleiste, Preis nachbessern, Lernen, Markt, Katalog-Editor, Rechner) |
| `assets/installieren.js` | byte-1:1 aus Sage (über Workflow-Needs), SHA in `tests/kern.mjs` |
| `icons/quelle/icon-klaus.png` | Klaus' App-Symbol (2026-10-12, rot: Zahnrad, Rechenzeichen, Pfeil) → `python3 tools/icons-bauen.py`, danach Cache erhöhen |

**Speicher (nie ändern):** IndexedDB `WorkflowCalculate1` mit `angebote`, `kunden`, `bilder` (Blobs) ·
localStorage `workflowcalculate_katalog`, `_einstellungen`, `_thema`, `_aktiv`, `_reiter`, `_sicherung_zuletzt` ·
sessionStorage `workflowcalculate_sicherung_spaeter`. Am Angebot: `fassung`, `vorgaenger`, `ersetztDurch`, `anlass` (Stufe 2) · `ist = {pos:{"P-n":{minuten, materialCent, maschinenH}}, versandCent, datum}`,
`beispiel` (Stufe 3). An der Position: `stiche`. An der Vorlage: `einheitText`, `stiche`, `sticheVorgabe`; im Verlauf `nk` (Schlüssel der Nachkalkulation).

## Was hier leicht kaputtgeht

- **Nichts Internes hinaus.** Kundenblatt und Übergabe nur aus `WC.aussen.angebotExtern`. Ein neues
  Feld erscheint dort erst, wenn es ausdrücklich in die Whitelist kommt. Die Proben setzen Lockwerte
  (EK 7,31 €, Satz 73,00 €, Marktanbieter) und suchen sie im Blatt und in der Auftragsdatei.
- **Satz-Ebenen:** Position → Angebot → [Kundenklasse] → Vorlage → Arbeitsgebiet. Die Klasse wirkt nur,
  wo Position/Angebot nichts setzen.
- **„Nicht kalkuliert“ ist nicht 0:** fehlt ein EK oder Maschinensatz, zählt die Position nicht mit und sagt warum.
- **Gestellt = eingefroren** (`a.stand` = Kopie des Katalogs). Lernen ändert nur den Live-Katalog.
  Ändern heißt **neue Fassung** (`A.neueFassung`): dieselbe Nummer, Kennung `AN-…-F2`, Entwurf mit aktuellem
  Katalog, die alte bleibt gestellt und trägt `ersetztDurch`. Vergleich je Position oben im Angebot.
  ⚠ Tafel-Evolution: „Zurück zum Entwurf“ (Stufe 1) ist durch die Fassungen ersetzt.
- **BookLedgerPro rechnet menge × einzelpreisCent.** Geht der Betrag nicht glatt durch die Menge, geht die
  Position als 1 × Gesamt mit „N Stk.“ im Text — sonst wiche die Summe um Cent ab. Versand ist eine eigene
  Position, höchstens 20 Positionen. BLP kennt die Quelle seit BookLedgerPro #324.
- **Nachkalkulation: leer ist nicht 0.** Ein leeres Ist-Feld zählt mit dem Plan, und die Seite sagt, wie viele.
  Ist-Minuten sind Lohnminuten, Maschinenlaufzeit steht getrennt. Verglichen wird mit dem eingefrorenen Stand.
  Ein Faktor je Vorlage wird nur einmal übernommen (Schlüssel `nk` im Verlauf); unter 2 % gilt „passt“.
- **Mengen-Einheit** (`einheitText`: Stk., Std., km) geht über die Whitelist (`einheit`) aufs Blatt, in WorkFloh und BLP-Texte.
- **Die Gegenprobe gibt Klon-Pfade weiter** (`BLP_KLON`, `WORKFLOH_KLON`, `TOMYS_KLON`) — ohne sie wären Parser- und
  Import-Proben in der Kopie unter /tmp übersprungen und ihre Fälle blind (so gemessen).
- **Rückrechnung** (Gewinn %, Stundensatz, Zeit-Faktor) per Halbierungssuche — trifft den Zielpreis auf
  den Cent oder sagt die Rundungsdifferenz. Jede Übernahme steht im Verlauf der Vorlage, rücknehmbar.
- **Der Preis eines Beispiels wird immer frisch gerechnet**, nie gespeichert.
- **Cache:** wer eine Datei aus `CORE` (`sw.js`) ändert, erhöht `CACHE_VERSION` und ruft
  `node tools/cache-stand.mjs`; `?v=` in `index.html` und `CORE` gleich halten — sonst `kern.mjs` rot.
- **WorkFloh liest die Auftragsdatei mit „📥 Importieren“.** Gleiche Angebotsnummer zweimal → WorkFloh fragt nach.
- Chromium im Behälter versucht bei jedem Start google.com/gvt1 zu erreichen (Proxy weist ab) — das ist
  der Browser, nicht die App.

## Benannte Grenzen

- Alle Startwerte (Sätze, EK, Tarife, Zeiten) sind **Platzhalter**; die App sagt das, bis eigene da sind.
- Versandtarife aus einer eigenen Tabelle, keine Live-Abfrage (Klaus' Wahl).
- Marktpreise trägt man ein; die App liest keine fremden Seiten. „🔎 Bei Mitbewerbern nachsehen“ ist ein Link.
- Nicht gebaut: **KI-Recherche der Marktpreise** — ein Sprachmodell ohne belegte Websuche erfindet Preise, und das bricht
  „nur eingetragene Preise“; Frage an Klaus. **Live-Versandtarife** — Klaus' Wahl: eigene Tabelle.
- Nachkalkulation nur für Arbeitszeit ins Muster übernehmbar; Material- und Maschinen-Ist werden gezeigt, nicht gelernt.
- Die Import-Probe gegen Mein WorkFloh / Tomys WorkFloh läuft nur, wenn die Klone daneben liegen (sonst Hinweis, übersprungen).
- ⚠ Nicht gemessen: Tablet, echtes Drucken/„Als PDF speichern“, Import der Auftragsdatei in WorkFloh am Gerät,
  der Sprung nach BookLedgerPro mit Entsperren, Download/Dateiwahl der Sicherung am Tablet.
- Die Parser-Probe gegen BookLedgerPro läuft nur, wenn der Klon daneben liegt (`BLP_KLON` oder `../BookLedgerPro`).

## Prüfen

```bash
npm install && npm test
NUR_ANKER=1 node tests/gegenprobe.mjs
npm run gegenprobe            # NUR_FALL="BLATT:" für einzelne Fälle
```

## Netzweit

Freibrief · frisch von `origin/main` · Ton · kein PII · Ehrlichkeit:
[Sage-Protokol/docs/NETZWEIT.md](https://github.com/lausiklauskn-png/Sage-Protokol/blob/main/docs/NETZWEIT.md)
