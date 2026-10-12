# Brief — Workflow Calculate: Suchseite Stufe 2 (nach Klaus' Tablet-Sichttest)

Für die nächste Sitzung. Depot `lausiklauskn-png/workflow-calculate`, Pages
https://lausiklauskn-png.github.io/workflow-calculate/. Zuerst `CLAUDE.md` lesen, frisch von `origin/main`.
Stand bei Übergabe: `main` nach dem PR „🔎 Suche als Startseite, 10 Beispiel-Fragen, ⇅ Daten“, Cache v29.
Abschluss der Sitzung davor: `docs/sessions/2026-10-12_suchseite.md`.

## Was es gibt (nicht neu bauen)

- **🔎 Suche ist die Startseite** (`zSuche` in `assets/app.js`, Rechnung in `assets/kern/suche.js`): Füllwörter weg und
  benannt, Karten Produkt · Menge · Preis (netto/brutto/je Stück, über `WC.angebot.rechne`), Menge auf der Karte,
  „Zusammensetzung“ auf derselben Seite, „＋ Angebot“ nur auf Tipp, Kunde versteckt als Kürzel `◦n/k`, 🎤 im Suchfeld
  (`assets/wfpdf/sprechen.js`, byte-1:1), Lernen aus ✓/✕/Menge/Zusammensetzung, Rückrichtung Produkt → Fragen/Angebote,
  🧠 Bedeutung auf Knopfdruck (Sage 03/04 + `assets/wfpdf/bedeutung.js`), `?q=` für Tomys Hub / WorkFloh.
- **10 Beispiel-Fragen** (`assets/daten/beispiel-fragen.js`), „▶ Durchspielen“ 1/10 … 10/10 mit je einem Lernsatz,
  holt fehlende Arbeitsgebiete dazu; einzeln ✕, „Beispiele wiederherstellen“ in Einstellungen → Suche.
- **⇅ Daten** (`zDaten`, Rechnung in `assets/kern/tabelle.js`): Sicherung, CSV intern / ohne Kundendaten, CSV-Import mit
  Vorschau, Personenspalten (Kopf UND Inhalt) nicht übernommen, KI-Zuordnung über `ki-anfrage.js`.

## Zu tun

1. **Klaus' Sichttest am Tablet** einholen und seine Befunde zuerst bauen (Startseite hoch/quer, Mikrofon in Chrome am
   Tablet, Kürzel, Durchspielen, CSV aus seinem echten Programm).
2. **Echte Tabelle:** Klaus' (oder eines Käufers) Angebots-CSV einlesen — Spaltennamen, die die Erkennung nicht kennt,
   in `ART`/`PERSON` (`assets/kern/tabelle.js`) ergänzen; jede neue Regel mit Gegenprobe-Fall.
3. **Bedeutung am echten Modell** messen (im Behälter nicht ladbar): trennt e5 die 30+ Vorlagen? Schwelle `NAEHE_MIN`
   0,80 und `ABSTAND` 0,04 stammen aus Workflow PDF und sind nicht an Produkten gemessen.
4. Offen von früher: Lieferanten prüfen · Laser-Daten · Zwischenmengen-Regel · Vorgabe-Sätze Handelsware.

## Klaus fragen, nicht raten

- Soll „gelernt“ zwischen Geräten wandern (heute nur über die verschlüsselte Sicherung)?
- Soll die Suche auch **Positionen alter Angebote** als Karte zeigen (heute nur Liste „Frühere Angebote“)?
- Knopf „💶 Preis nachsehen“ in Tomys Hub / Mein WorkFloh, der `…/workflow-calculate/?q=<Auftragstitel>` öffnet?

## Leitplanken

Whitelist `aussen.js` · Speicher-Namen nie ändern · Cache-Bump + `node tools/cache-stand.mjs` · byte-1:1-Module
SHA-pinnen · nur erfundene Daten · jede Zusicherung mit Gegenprobe-Fall (`NUR_ANKER=1` zuerst) · am Ende Abschlussbrief
mit gemessenem Stundennachweis, Forschungseintrag in Kimhub (`node tools/sitzung-eintragen.mjs`, `arm: "voll"`, `ende`
NACH dem letzten Merge), neuer Brief.
