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
| `assets/kern/uebergabe.js` | Weiterleitungs-Bündel für Mein WorkFloh / Tomys WorkFloh (Format wie Workflow-Needs), nur aus der Whitelist |
| `assets/kern/katalog.js` | Katalog prüfen, ex-/importieren, Platzhalter zählen |
| `assets/daten/werbetechnik.js` | Startkatalog — **alle Zahlen Platzhalter** (`platzhalter: true`) |
| `assets/daten/bilder.js` | Beispielbilder als **Zeichnungen** (SVG), mehrere Ansichten je Beispiel |
| `assets/app.js` · `app.css` | Oberfläche (Schrittleiste, Preis nachbessern, Lernen, Markt, Katalog-Editor, Rechner) |
| `assets/installieren.js` | byte-1:1 aus Sage (über Workflow-Needs), SHA in `tests/kern.mjs` |

**Speicher (nie ändern):** IndexedDB `WorkflowCalculate1` mit `angebote`, `kunden`, `bilder` (Blobs) ·
localStorage `workflowcalculate_katalog`, `_einstellungen`, `_thema`, `_aktiv`, `_reiter`.

## Was hier leicht kaputtgeht

- **Nichts Internes hinaus.** Kundenblatt und Übergabe nur aus `WC.aussen.angebotExtern`. Ein neues
  Feld erscheint dort erst, wenn es ausdrücklich in die Whitelist kommt. Die Proben setzen Lockwerte
  (EK 7,31 €, Satz 73,00 €, Marktanbieter) und suchen sie im Blatt und in der Auftragsdatei.
- **Satz-Ebenen:** Position → Angebot → [Kundenklasse] → Vorlage → Arbeitsgebiet. Die Klasse wirkt nur,
  wo Position/Angebot nichts setzen.
- **„Nicht kalkuliert“ ist nicht 0:** fehlt ein EK oder Maschinensatz, zählt die Position nicht mit und sagt warum.
- **Gestellt = eingefroren** (`a.stand` = Kopie des Katalogs). Lernen ändert nur den Live-Katalog.
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
- Nicht gebaut (Stufe 2/3 laut Plan): Übergabe an BookLedgerPro (`?uebernahme=`), verschlüsselte
  Sicherung, Nachkalkulation, weitere Arbeitsgebiete mit eigenem Startkatalog, KI-Recherche.
- ⚠ Nicht gemessen: Tablet, echtes Drucken/„Als PDF speichern“, Import der Auftragsdatei in WorkFloh am Gerät.

## Prüfen

```bash
npm install && npm test
NUR_ANKER=1 node tests/gegenprobe.mjs
npm run gegenprobe            # NUR_FALL="BLATT:" für einzelne Fälle
```

## Netzweit

Freibrief · frisch von `origin/main` · Ton · kein PII · Ehrlichkeit:
[Sage-Protokol/docs/NETZWEIT.md](https://github.com/lausiklauskn-png/Sage-Protokol/blob/main/docs/NETZWEIT.md)
