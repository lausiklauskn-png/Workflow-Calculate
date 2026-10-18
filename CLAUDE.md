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
| `assets/kern/recherche.js` | **KI-Recherche** der Marktpreise: Claude-API (`claude-opus-5-5`) mit eigenem Schlüssel und Websuche (`web_search_20260209`, direkt, ≤ 5 Suchen); übernimmt nur Preise, deren Quelle die Suche lieferte UND deren Zahl wörtlich im Zitat (`cited_text`) steht; Funde `ungeprueft: true` |
| `assets/kern/anfrage.js` | **Anfrage lesen** (2026-10-12): E-Mail-Text oder `.eml` → Absender, Kundennummer, Mengen, Maße, Farben, Produkte; Kunde finden (Nr. > E-Mail > Firmen-Domain > Name); alte Angebote nach **Ähnlichkeit** (gleicher Kunde 45 · gleiche Produkte 30 · Wörter 20 · Menge 5), Suche; **Entwurf** aus dem nächstliegenden (≥ 40 %) oder aus den erkannten Produkten. Offline, ohne KI |
| `assets/kern/mail.js` | **byte-1:1 aus Workflow-Needs** (`c46c753`), SHA in `tests/kern.mjs` — `.eml` lesen (RFC 2047, multipart, base64, QP; HTML nur als Text). Nie hier abwandeln |
| `assets/kern/ki-anfrage.js` | **Anfrage mit KI lesen** (freiwillig, eigener Schlüssel): prüfen (`PrueferMail`) → einmal anhalten bei Anweisung an eine KI / verstecktem Text → verdecken (Modul 25 + eigene Muster: Kundennummer, Telefon, Straße, PLZ+Ort, „600 €“) → `findLeak` → senden (nur verdeckter Text + Vorlagen ohne Preise) → nur übernehmen, was als Zitat wörtlich im Text steht und die Menge trägt. Der Kunde kommt nie von der KI |
| `modules/25_pseudonym.js` | **Sage-Modul 25 byte-1:1** (über Workflow-Needs, Sage `df54f0c`), SHA in `tests/kern.mjs`. Nie hier abwandeln |
| `assets/kern/pruefer-mail.js` | **byte-1:1 aus Workflow-PDF** (dort aus dem Auslieferungsprüfer, gleich in Mein-WorkFloh), SHA in `tests/kern.mjs`. Nie hier abwandeln |
| `assets/kern/unterlagen.js` | **Unterlagen am Angebot** (2026-10-12): je Position Entwurf / fertiges Produkt (Bilder, Ansichten), Dateien (Corel, PSD, AI, PDF …, ≤ 50 MB, Byte für Byte) und Links; „angenommen“ am gestellten Angebot; an WorkFloh mit (Klaus' Ja), nie aufs Kundenblatt; „★ als Beispiel in die Vorlage“ |
| `assets/kern/nachkalk.js` | **Nachkalkulation** (Stufe 3): Plan gegen Ist am gestellten Angebot, Faktor je Vorlage, Übernahme ins Zeit-Muster (einmal je Befund) |
| `assets/kern/suche.js` | **🔎 Suche — die Startseite** (2026-10-12): Füllwörter weg und benennen, Frage über `anfrage.lesen`, Vorlagen nach Wörtern (+ Gelerntes) ordnen, **Preis über `WC.angebot.rechne`** (ein Angebot mit einer Position — keine zweite Rechnung), Lernen aus jeder bestätigten Antwort, Rückrichtung Produkt → Fragen/Angebote |
| `assets/kern/tabelle.js` | **⇅ Daten** (2026-10-12): CSV lesen (Trenner selbst erkannt), Spalten einordnen — **Personendaten nach Kopf UND Inhalt weg** —, Zeilen offline zuordnen, Angebote bauen (Entwurf, `import`, alter Preis als `pos.eigen`), CSV hinaus (intern / ohne Kundendaten), Text und Rückweg für die KI-Zuordnung |
| `assets/wfpdf/suche.js` · `bedeutung.js` · `sprechen.js` | **byte-1:1 aus Workflow-PDF** (Wortsuche-Angleichung, Rangfolge der Bedeutungssuche, Spracheingabe mit Laufbalken), SHA in `tests/kern.mjs`. Nie hier abwandeln |
| `vendor/sbkim/03_embedding.js` · `04_match.js` | **Sage-Module 03/04 byte-1:1** (03 direkt aus Sage #1071, 04 über Workflow-PDF), SHA in `tests/kern.mjs`; geladen erst auf „🧠 Auch nach Bedeutung suchen“, nicht im Vorrat. **Modell vom eigenen Server** (Klaus 2026-10-13): `app.js` setzt vorher `window.SBKIM_MODEL_ROOT = "https://family-projekt.de/models/"` — gemessen in Termux: config.json als JSON, ONNX 118 308 185 Bytes, `access-control-allow-origin: *`; am Tablet lädt der Balken insgesamt **135 MB** (ONNX + Wortliste u. a.), darum heißt es in der Frage und im Datenschutz „rund 135 MB“. Antwortet der Server nicht, nimmt Modul 03 Hugging Face. Die Leiste steht **direkt unter dem Suchfeld**, auch ohne Frage, mit Ladebalken wie sonst in der App (`.fortschritt`: Prozent · „64 / 118 MB“, danach „ordnet ein … i von n“; Klaus 2026-10-13). Sie sagt danach, woher es kam („🧠 Bedeutung an · 19 Produkte · Modell von family-projekt.de“ / „von Hugging Face“; ohne Angabe von Modul 03 steht nichts da). ⚠ Workflow-PDF trägt 03 noch in der alten Fassung (dort lädt es weiter von Hugging Face) |
| `assets/daten/beispiel-fragen.js` | **10 Beispiel-Fragen** (10 Produkte, 10 Mengen, alle fünf Gebiete, Klaus' Tassen-Frage wörtlich); `vorlage`/`menge` sind die Erwartung, die die Probe nachrechnet; `lehre` = der Satz beim „▶ Durchspielen“ |
| `assets/daten/werbetechnik.js` | Startkatalog — **alle Zahlen Platzhalter** (`platzhalter: true`); registriert `WC.STARTKATALOGE` |
| `assets/daten/stickerei.js` · `dienstleistung.js` | weitere Arbeitsgebiete (Stufe 3), Platzhalter; Stickerei rechnet nach **Stichzahl** (`stiche`, Einheit `tsd_stiche`) |
| `assets/daten/handelsware.js` | **Handelsware** (2026-10-12): Arbeitsgebiet mit Einkaufsprodukten (Kulis 500, Visitenkarten 250/500/1000, Preise Platzhalter), **keine** Lieferanten eingetragen; `WC.LIEFERANTEN_VORSCHLAEGE` = per Websuche gefundene Kandidaten, erst Klaus' „✓ geprüft“ trägt sie ein |
| `assets/daten/laser.js` | **Lasergravur** (2026-10-12): Einzelstücke mit Namen, drei Laser-Stufen (Diode 10 W · CO2 60 W · Faser 30 W) mit der **technischen Regel**, welches Material welcher Laser kann (`verfahrenWahl`); `vorhanden` = Gerät in der Werkstatt (Annahme: nur CO2); zu jeder Vorlage ein Zwilling „— Lohngravur (Zukauf)“ (`fremdVorlage`) |
| `assets/daten/beispiel-angebote.js` | 5 Beispiel-Angebote (Verein, Firmenstart, Fahrzeug, Firmenjubiläum, Hochzeit), 15 Positionen, alle drei Gebiete — Kunden erfunden; holt fehlende Gebiete mit |
| `assets/daten/bilder.js` | Beispielbilder als **Zeichnungen** (SVG), mehrere Ansichten je Beispiel |
| `assets/app.js` · `app.css` | Oberfläche (Schrittleiste, Preis nachbessern, Lernen, Markt, Katalog-Editor, Rechner) |
| `assets/installieren.js` | byte-1:1 aus Sage (über Workflow-Needs), SHA in `tests/kern.mjs` |
| `modules/*.js` | **SBKIM-Module 01 02 05 05b 07 15 16 16b 23 23-UI noble byte-1:1 aus Sage** (origin/main 2026-10-13), SHA in `tests/kern.mjs` (`KNOTEN_PINS`). Nie hier abwandeln. 03/04 liegen weiter in `vendor/sbkim/` |
| `assets/sbkim-init.js` | app-eigener Klebstoff des Knotens: Kette, Lampen, Leiste, Gerätename, gemeinsamer Lader `WC_skriptEinmal` |
| `assets/siegel-inhalt.js` | Identität des Knotens (`SBKIM_SIEGEL_WIZ`) — wird nie verteilt |
| `icons/quelle/icon-klaus.png` | Klaus' App-Symbol (2026-10-12, rot: Zahnrad, Rechenzeichen, Pfeil) → `python3 tools/icons-bauen.py`, danach Cache erhöhen |

**Speicher (nie ändern):** IndexedDB `WorkflowCalculate1` mit `angebote`, `kunden`, `bilder` (Blobs) ·
localStorage `workflowcalculate_katalog`, `_einstellungen`, `_thema`, `_aktiv`, `_reiter`, `_sicherung_zuletzt`, `_ki_<FACH>` (KI-Schlüssel, nur verschlüsselt über `WERKSTATT_SCHLUESSEL.einlegen`) ·
sessionStorage `workflowcalculate_sicherung_spaeter`. Am Angebot: `fassung`, `vorgaenger`, `ersetztDurch`, `anlass` (Stufe 2) · `ist = {pos:{"P-n":{minuten, materialCent, maschinenH}}, versandCent, datum}`,
`beispiel` (Stufe 3). An der Position: `stiche`. An der Vorlage: `einheitText`, `stiche`, `sticheVorgabe`; im Verlauf `nk` (Schlüssel der Nachkalkulation).
Handelsware (2026-10-12): im Katalog `lieferanten = [{id, name, url, fuer: wiederverkaeufer|privat|beides, anmeldung, notiz, geprueftAm}]` (darf fehlen),
an der Vorlage `einkaufsprodukt: true` und `einkauf = [{menge, gesamtCent, lieferant, url, datum}]` (Komplettpreis je Menge **inkl. Versand**),
im Ist `pos["P-n"].einkaufCent`. Die Seite hat die Adresse `#handel` (kein eigener Speicher).
Unterlagen (2026-10-12): an der Position `unterlagen = [{id "U-n", art entwurf|fertig|datei|link, name, typ, groesse, datei "D-…", url, datum, notiz}]`
(Blob unverändert im Store `bilder`, also in der Sicherung), am Angebot `angenommen = {datum}`, am Vorlagen-Beispiel `quelle = "AN-…:P-n"`.
Anfrage (2026-10-12): am Kunden `nr` (Kundennummer), `email`; am Angebot `anfrage = {von, betreff, datum, kundennr}` (nur intern, nie hinaus).
Kleinmengenzuschlag (2026-10-12): im Katalog `kleinmenge = {grenze, cent, text}` (fehlt er, ergänzt die App die Vorgabe 10 Stk. / 12,00 € —
Klaus' Wert, bestätigt 2026-10-12 — nur im LIVE-Katalog), am Angebot `kleinmengeAus` (für dieses Angebot weggelassen).
Suche (2026-10-12): in den Einstellungen `suche = {fuellwoerter: [...], beispieleWeg: ["f01"…], gelernt: [{w, vorlage, gut, n, zuletzt, frage}]}`
(reist mit der Sicherung, höchstens 300 Einträge), am Angebot `import = {datei, zeilen, nummer}` (aus einer Tabelle eingelesen).
Fremdfertigung (2026-10-12): am Verfahren `vorhanden` (fehlt = da), an der Vorlage `fremdVorlage`, `titelVorgabe` (was der Kunde liest), `herstellung` (intern).

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
- **KI-Recherche rät nicht.** Ein Fund braucht Quelle aus der Websuche UND die Zahl im Zitat — sonst verworfen, mit Grund.
  Funde stehen `ungeprueft` in `vorlage.markt` (mit `quelle`, `zitat`, `notiz`) und zählen im Vergleich erst nach ✓.
  Hinaus geht nur `auftragsInfo` (Produkt, Menge, Maße, Farben, Stiche, Verfahren, Material) — nie Kunde/Titel/Beschreibung/Preise.
  Der Schlüssel liegt nur im Speicher der Sitzung, gemerkt nur verschlüsselt. Die Proben stellen die Gegenseite (`tests/daten/ki-antwort.mjs`).
- **🛒 Handelsware** (Klaus 2026-10-12): eigene Seite `#handel` (Kopfknopf 🛒, auch als Lesezeichen/neuer Tab). Eine Vorlage mit
  `einkaufsprodukt` steht **nur** dort — nicht in der Produktwahl und nicht unter Katalog → Produktvorlagen (Löschen/Kopieren dort
  arbeitet trotzdem auf der GANZEN Liste). Rechnung: `WC.kalk.position` → `handelPosition` = `handel()` auf den Einkauf (Handlungskosten,
  Gewinn, Kundenklasse); **kein Versandposten** (`angebot.rechne` überspringt Einkaufsprodukte), Skonto/Rabatt wirken hier nicht.
  **Staffel** (Klaus 2026-10-13, Tablet: „innerhalb der Staffelung steht der Preis ja fest“): ein Einkauf gilt AB seiner Menge; dazwischen
  zählt der Stückpreis der nächstkleineren Staffel × Menge (20 Tassen = 89,90 €/10 × 20 = 179,80 €; der Versand im Einkauf wächst dabei
  mit). Gerechnet, nicht geschätzt — der Rechenweg nennt die Staffel. Unter der kleinsten Staffel bleibt die Position offen; steht für die
  Menge selbst eine Zeile OHNE Preis da, auch („Einkaufspreis fehlt“, nie still aus der kleineren Staffel).
  ⚠ Tafel-Evolution: bis dahin war jede Zwischenmenge offen („Zwischenmengen werden nicht geschätzt“). Mehrere Einkäufe je Menge:
  der günstigste zählt. Lieferant, Link, Einkaufspreis gehen nie hinaus (Prüfwert `LIEFERANT-PRUEFWORT`, 123,45 €).
  ⚠ **Halbe Einkaufszeilen gehören in `katalog.hinweise`, nie in `pruefe`**: ein Katalog, der `pruefe` nicht besteht, wird beim Laden
  still durch den Startkatalog ersetzt. Links nur über `katalog.sichereAdresse` (nur https).
  **Fremdfertigung** (Klaus 2026-10-12: „alles, was wir anbieten … entweder von uns selber oder von anderen“): steht ein Verfahren
  mit `vorhanden: false`, rechnet die Eigenfertigung nicht (offen, nie geschätzt) und nennt den Zwilling; „→ Fremdfertigung nehmen“
  tauscht die Vorlage, **die Menge bleibt** (fehlt dafür ein Einkauf, sagt die Position das). **Kunden-Titel** kommt aus `titelVorgabe` —
  der interne Name („… (Zukauf)“, „Lohngravur“) geht nie aufs Blatt (Probe sucht Zukauf/Lohngravur/Laser/Hersteller).
  **📎 Unterlagen** (Klaus 2026-10-12): ändern keinen Preis, darum auch am GESTELLTEN Angebot erlaubt. Dateien werden nie verkleinert
  (anders als „📷 Bild dazu“); Dateityp aus der Endung, wenn der Browser `application/octet-stream` meldet (Corel!). Gehen nicht über
  die Whitelist, also nie aufs Blatt; an WorkFloh hängt `uebergeben` sie an (Links als Text). „⧉ für anderen Kunden“ nimmt sie mit.
  Ein Beispiel aus Unterlagen trägt keinen Preis — die Galerie rechnet ihn frisch.
  **📥 Anfrage → Entwurf** (Klaus 2026-10-12): offline, nichts geraten — was nicht erkannt ist, steht als „Nicht erkannt“ da; ein Mengenwort
  ohne passende Vorlage wird benannt. Eine Zahl ist nur eine **Menge**, wenn ein Stück-Wort oder ein Warenwort (Katalog + `WARENWORT`)
  dahinter steht — „in 2 Wochen“ nicht; Datum, PLZ, Telefon, Preis, Jahr werden vorher entfernt. Der Entwurf ist IMMER ein Entwurf
  (nie gestellt), das alte Angebot bleibt unberührt. Freemail-Domains zählen nicht als Firma. Proben nur mit erfundenen Mails
  (`tests/daten/anfragen/`). ⚠ Gewichte 45/30/20/5 und Schwelle 40 % sind gewählt, nicht gemessen.
  **Kleinmengenzuschlag** (Klaus 2026-10-12: „als eigene Zeile, unter 10 Stück“): `angebot.rechne` → `r.kleinmenge`; EINE Zeile je
  Angebot, sobald eine kalkulierte Stück-Position unter der Grenze liegt; Std./km/Montage (Dienstleistung ohne Versand) zählen nicht.
  Er geht über die Whitelist (`kleinmenge`) aufs Blatt, in WorkFloh und als Position an BookLedgerPro. Ein eingefrorener Stand ohne
  `kleinmenge` bleibt ohne Zuschlag — gestellte Angebote ändern sich nicht.
  **Vollbild auch hier** (Klaus 2026-10-12): Seite so breit wie das Fenster auf Handy hoch/quer, Tablet, großem Schirm; die Spalten
  „Menge + ins Angebot“ und „Verkauf“ stehen vorn, damit sie am Handy ohne Wischen da sind; ab 1024 px passt die ganze Tabelle.
- **🔎 Suche ist die Startseite** (Klaus 2026-10-12): die App öffnet IMMER auf der Suche; nur ⟳ Neu laden (`?frisch=`) bleibt auf dem
  Reiter von vorher, `#handel` öffnet die Handelsware, `?q=…` belegt die Frage vor (Link aus Tomys Hub / WorkFloh — Klaus: „reicht“).
  ⚠ Tafel-Evolution: bis dahin öffnete sie auf dem zuletzt gewählten Reiter (`workflowcalculate_reiter`, Vorgabe „Angebote“).
  Karte = **Produkt · Menge · Preis** (netto, brutto, je Stück — inkl. Versand und Kleinmengenzuschlag, genau wie im Angebot);
  Kalkulation nur nach Tipp auf „Zusammensetzung“, **auf derselben Seite**. Nichts springt von selbst; „＋ Angebot“ legt ein NEUES
  Angebot an (mit dem versteckt gewählten Kunden). Das Suchfeld ist EIN bleibendes Element (`SU.kopf`), weil die Spracheingabe
  ihren Laufbalken hineinhängt — beim Tippen wird nur `#suche-ergebnis` neu gezeichnet.
  **Kunde versteckt** (Klaus: „Kürzel gut“): zugeklappt nur `◦<frühere Angebote>/<1|2|3>`, Klartext erst auf Tipp; „Kunde Becker
  wünscht“ findet Becker im Kundenstamm still. **Lernen** (Klaus: „soll sich selbst verbessern mit jeder Frage“): Menge ändern,
  Zusammensetzung öffnen, „＋ Angebot“, ✓ = passt; ✕ = passt nicht. Je Frage und Produkt einmal je Sitzung. **Bidirektional**
  (Klaus: „beides“): Frage → Produkt, und an der Zusammensetzung Produkt → gelernte Fragen, Beispiel-Fragen, Angebote; die Bedeutungs-
  suche ordnet jede Vorlage MIT ihren gelernten Fragen ein. Ein Zukauf unter der kleinsten Staffel bekommt halbe Punkte
  (sonst stünde „Kugelschreiber (Zukauf, nur 500)“ vor dem eigenen Kuli). Gezeigt: bis 4 Karten ab halber Punktzahl des besten;
  Produkte aus noch nicht geholten Gebieten klein als „Auch möglich: … ＋ Gebiet“.
  ⚠ Punkte (1 je Wort, 0,6 Teilwort, +0,5 erkannt, Lernen bis 3, „passt nicht“ × 1,5) sind **gewählt, nicht gemessen**.
- **⇅ Daten** (Klaus: „eigener Reiter“, „zwei Knöpfe“): Sicherung (dieselbe Karte wie in den Einstellungen), CSV „intern, mit Kunde“
  und „ohne Kundendaten“ (ohne Titel und Positions-Text — dort stehen oft Namen), Tabelle einlesen mit Vorschau. XLSX wird nicht
  gelesen und das gesagt. KI-Zuordnung nur über `ki-anfrage.js` (prüfen, verdecken, `findLeak`, einmal anhalten); gilt nur, wenn
  Zeilennummer UND Menge im Zitat stehen.
- **← Zurück** (Klaus 2026-10-12: „die App schließt automatisch … einen Button wie bei meinem Rezeptbuch, mehrmals zurück“):
  jeder Wechsel der Ansicht (Reiter, Katalog-Reiter, aufgeklappter Katalog-Eintrag, offenes Angebot) legt EINEN Eintrag in den
  Verlauf (`verlaufMerken`, nur am Ende von `zeichne` — nirgends sonst `pushState`). Der Knopf `#seite-zurueck` oben und die
  Zurück-Taste von Android gehen dieselben Schritte zurück (`popstate` → `verlaufZurueck`, Rolllage wird mitgenommen); am Anfang
  ist der Knopf grau. ⚠ `#zurueck` ist vergeben (↶ Rückgängig im Angebot). ⚠ Die Zurück-Taste schließt die App am Anfang des
  Verlaufs weiter — das bestimmt Android, nicht die App.
- **Vollbild** (Klaus 2026-10-12): `main` hat keine Höchstbreite, die Vorschau füllt den Schirm; nur das Papier-Blatt bleibt A4-breit.
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

## SBKIM-Knoten mit Netz-Einstellung (2026-10-13)

Workflow Calculate ist ein eigener SBKIM-Knoten, nach der Bauart des Sende-Prüfers: feste Leiste in der Kopfzeile
(`#netzleiste`: Lampen `#lamp-alive` · `#lamp-traffic` · `#lamp-fremd`, `#siegel-platz`, `[data-sbkim-mycel-platz]`),
**kein Modul 17**. Breit stehen Lampen-Namen, Siegel und Mycel-Knopf in der Leiste; bis 1100 px nur drei Punkte, ein
Tipp klappt Siegel und Mycel-Knopf darunter auf. In der Mycel-Blase steht die Box **„Netz“** (`[data-sbkim-netz-box]`,
aus Modul 23-UI): öffentlich ist die Vorgabe, ein eigenes Firmennetz kommt über einen Beitritts-Link oder von Hand.
**Der Netz-Code steht nie im Depot.**

- **Schublade `workflowcalculate`** steht im `<head>` VOR jedem Skript (Modul 01 liest sie beim Laden) und im Klebstoff. Nie ändern.
- **Modul 03/04 sind dieselben Dateien wie für die Bedeutungs-Suche** (`vendor/sbkim/`, gleiche `?v=`). Ein gemeinsamer
  Lader (`WC_skriptEinmal`, Schlüssel = Pfad ohne `?`) holt jede Datei höchstens einmal; die Suche (`skriptLaden` in
  `app.js`) delegiert an ihn, und die Kette überspringt ein Modul, dessen Global schon steht. `SBKIM_MODEL_ROOT`
  setzt der Klebstoff vor der Kette — das Modell kommt also auch hier vom eigenen Server.
  ⚠ **Preis:** Modul 03 (der Code, nicht das Modell) wird jetzt nach dem Laden in der Leerlauf-Pause mitgeholt, auch
  wenn niemand nach Bedeutung sucht. Das Modell (135 MB) lädt weiter erst auf „🧠 Auch nach Bedeutung suchen“.
- **Die Module stehen nicht im Installations-Vorrat**; der Worker (Netz zuerst, legt 200er ab) nimmt sie beim ersten Abruf.
- Siegel-Band „WORKFLOW CALCULATE“, `allowedOrigins: []`, Gerätename vom Klebstoff ins Verbinden-Panel (`data-sbkim-geraetename`).
- Die Beschreibung (`siegel-inhalt.js`) beginnt mit „Workflow Calculate“ und trägt **keinen Preis, keinen Satz, keine
  Kundendaten** — ein Wächter sucht €, Prozent, Beträge und @.
- Im Druck (Kundenblatt) ist die Leiste verborgen; beim Laden geht kein Websocket und keine Anfrage an einen fremden Rechner hinaus.
- Die Probe zur Bedeutungs-Suche wartet jetzt auf `WC_KNOTEN_BEREIT`, bevor sie ihr gestelltes Modul 03 setzt — sonst
  überschriebe das echte aus der Kette den Stub.

Gemessen (2026-10-13): kern **306 grün · 0 ROT** (28 neue `KNOTEN:`) · browser **214 grün · 0 ROT** · Kopfleiste bei
320 · 360 · 380 px ohne Querlaufen, ← Zurück und 🛒 erreichbar, Box „Netz“ über die Lampen erreichbar · Modul 03 genau
einmal angefordert. Gegenprobe `KNOTEN:` **9 gefangen · 0 blind · 0 aus falschem Grund · 0 tote Anker**, `NUR_ANKER` 201 · 0 tot.
⚠ Nicht gemessen: das Tablet, der Beitritt über einen echten Link, das interne Relais (steht noch nicht), Zeit/Speicher
der zusätzlich geladenen Module.

## Benannte Grenzen

- Alle Startwerte (Sätze, EK, Tarife, Zeiten) sind **Platzhalter**; die App sagt das, bis eigene da sind.
- Versandtarife aus einer eigenen Tabelle, keine Live-Abfrage (Klaus' Wahl).
- Marktpreise trägt man ein oder holt sie mit der KI-Recherche (die Suche läuft bei Anthropic, über den eigenen Schlüssel);
  die App selbst liest keine fremden Seiten. „🔎 Bei Mitbewerbern nachsehen“ ist ein Link.
- Nicht gebaut: **Live-Versandtarife** — Klaus' Wahl: eigene Tabelle.
- ⚠ KI-Recherche **nie gegen die echte API gemessen** (kein Schlüssel im Behälter): Form der Antwort nach der Doku gestellt.
  Ob echte Seiten Preise so zitieren, dass die Zahl im `cited_text` (≤ 150 Zeichen) steht, zeigt erst der erste echte Lauf.
- Nachkalkulation nur für Arbeitszeit ins Muster übernehmbar; Material- und Maschinen-Ist werden gezeigt, nicht gelernt.
- Die Import-Probe gegen Mein WorkFloh / Tomys WorkFloh läuft nur, wenn die Klone daneben liegen (sonst Hinweis, übersprungen).
- ⚠ Nicht gemessen: Tablet, echtes Drucken/„Als PDF speichern“, Import der Auftragsdatei in WorkFloh am Gerät,
  der Sprung nach BookLedgerPro mit Entsperren, Download/Dateiwahl der Sicherung am Tablet.
- Handelsware: **kein Lieferant ist geprüft eingetragen** — die Seiten waren aus dem Behälter nicht abrufbar (Proxy 403, Abruf-Werkzeug
  ohne Namensauflösung); die Vorschläge stammen aus der Websuche. KI-Recherche der Einkaufspreise (Brief Punkt 8, optional) **nicht gebaut**.
  Offen bei Klaus: Handlungskosten-Satz, eigener Tab oder Ansicht (gebaut: Ansicht mit eigener Adresse), Lieferanten mit Konto.
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


## 🛡 Prüfliste vor dem KI-Richter (Sage Bau 04.J, 2026-10-14)

Modul 04 kommt neu aus dem Kanon (Sage #1082). Der Richter prüft die Suchfrage und die Antworten fremder Knoten mit der Prüfliste (`pruefer-mail.js`). Fehlt die Liste, läuft er nicht. Eine Antwort, in der eine Anweisung an eine KI steht, geht nicht an die KI. Sie bekommt „gefahr“ und `ausgeschlossen: "ki-anweisung"`.
Die Seite lädt `assets/kern/pruefer-mail.js` schon. Gemessen im Browser: `prueflisteGeladen` ist true. Cache v39. Das Tablet ist nicht gemessen.

## ⬇ Installieren-Erklärtext ohne „Daten löschen“ (2026-10-18)

`assets/installieren.js` neu byte-1:1 aus Sage-Protokol (PR #1151, über denselben Stand wie Workflow-Needs). Der alte Rat „Websiteeinstellungen → Daten löschen“ ist ersetzt: auf `lausiklauskn-png.github.io` teilen sich alle Apps einen Speicher, das hätte die Daten ALLER Apps gelöscht. Pin in `tests/kern.mjs` = `09c533b3…2193`, Cache v51, `installieren.js?v=2`.

**Nachtrag 2026-10-18 · Kontrast:** am Handy stand das Erklärfenster hell auf weiß (`color:inherit` erbt helle Schrift, `--flaeche` fehlt → weiß). `assets/installieren.js` neu byte-1:1 aus Sage (#1152, sha `874d2a29…8dc4`): nach dem Einhängen wird der Kontrast gemessen, unter 4,5 steht die Meldung fest `#1a1a1a` auf `#fff`. Pin in `tests/kern.mjs` nachgezogen, `installieren.js?v=3`, Cache v52. ⚠ Am Tablet nicht gemessen.

**Nachtrag 2026-10-18 · Knopf in den Einstellungen:** `assets/installieren.js` neu byte-1:1 aus Sage (#1153, sha `e0644084…73c3`, enthält die Kontrast-Sicherung). Klaus: „Installieren-Button unter Einstellungen hinten.“ Das Skript-Tag trägt `data-in="#inhalt[data-reiter=einstellungen]" data-klasse="btn"`; `zeichne()` setzt dafür `data-reiter` an `#inhalt`. Im Browser gemessen (380 px): im Reiter Einstellungen steht `#installieren-einstellungen` als letztes Element, sichtbar; in anderen Reitern keiner; als App (standalone gestellt) beide weg. Pin nachgezogen, `installieren.js?v=4`, `app.js?v=20`, Cache v53. ⚠ Am Tablet nicht gemessen.
