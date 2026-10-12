# Sitzung 2026-10-13 — Handelsware (Einkauf und Wiederverkauf)

Brief: `BRIEF_2026-10-13_handelsware.md`.

## Gebaut

- **Eigene Seite „🛒 Handelsware“**: Knopf in der Kopfleiste (am Handy nur 🛒), eigene Adresse `#handel`
  (Lesezeichen, „↗ in neuem Tab“). Gleicher Speicher und Katalog wie die App, kein zweiter Zustand.
- **Schalter „🛒 Einkaufsprodukt“** an jeder Produktvorlage (Katalog → Produktvorlagen, oder auf der Seite selbst).
  Gesetzt, steht die Vorlage **nur** noch auf der Seite Handelsware: nicht in der Produktwahl eines Angebots, nicht
  unter Katalog → Produktvorlagen (dort steht ein Verweis mit der Zahl).
- **Einkauf** als Komplettpreis je Menge inkl. Versand: `einkauf: [{ menge, gesamtCent, lieferant, url, datum }]`.
- **Automatische Kalkulation** über das vorhandene `WC.kalk.handel`: Einkauf → + Handlungskosten → + Gewinn
  (+ Kundenklasse) → Verkauf komplett inkl. Versand, als **eine** Position **ohne** eigenen Versandposten.
  Staffel = die eingetragenen Einkaufsmengen.
- Je Produkt eine Tabelle: Menge · Lieferant mit Link · Einkauf · Handlungskosten · Gewinn · Verkauf · je Stück ·
  Aufschlag % · Spanne € und % · **„ins Angebot“** (in das offene Angebot; ist keins als Entwurf offen, wird eins angelegt).
  Wahl der Kundenklasse A/B/C oben auf der Seite.
- **Lieferanten** als eigener Katalog-Reiter: Name, Link (nur https), für Wiederverkäufer / privat / beides,
  Konto nötig, Notiz, geprüft am.
- **Nachkalkulation**: am gestellten Angebot je Einkaufsprodukt „Einkauf Ist komplett inkl. Versand“ gegen den Plan.
- **Beispiele** (Arbeitsgebiet „Handelsware“, Knopf auf der Seite): 500 Kulis fertig bedruckt (120,00 €),
  Visitenkarten 250 / 500 / 1000 (24,90 / 29,90 / 39,90 €) — **alles Platzhalter-Preise**.

- **Vollbild auf jedem Gerät** (Klaus' Nachtrag): gemessen bei 360×740, 740×360, 1024×768, 1920×1080 — Seite so breit
  wie das Fenster, Karten füllen sie, kein waagerechtes Rollen; Verkauf und „ins Angebot“ stehen am Handy ohne Wischen
  da (die Spalten sind dafür umgestellt), ab Tablet passt die ganze Tabelle.

## Nachtrag: Einzelstücke, Lasergravur, Fremdfertigung

Klaus: *„Einzelstückanfertigung … wo nur ein Name draufsteht“* · *„Laser in verschiedenen Stufen … wenn wir den Laser selber
nicht haben, lassen wir die herstellen und verkaufen sie dann … mit den entsprechenden Aufschlägen“* · *„denke auch an andere
Herstellungsverfahren … Wir machen den Einkauf, müssen natürlich gut handeln und dann machen wir den Aufschlag.“*

- **Befund vorher:** die vorhandenen Vorlagen sind auf Serien gebaut — 1 Kuli im Tampondruck kam auf 84,77 € (Platzhalter),
  weil das Einrichten bei 1 Stück genauso anfällt wie bei 250. Ein Mindermengenzuschlag hätte das Falsche gelöst.
- **Arbeitsgebiet „Lasergravur“** (Katalog → Arbeitsgebiete, oder auf der Seite 🛒): Diodenlaser 10 W · CO2-Laser 60 W ·
  Faserlaser 30 W. Acht Produkte mit Namen, je nur mit den Lasern, die das Material technisch können:
  | Produkt | Diode | CO2 | Faser |
  |---|---|---|---|
  | Kuli Alu eloxiert | ✓ | ✓ | ✓ |
  | Kuli Edelstahl blank | – | – (nur mit Markierspray) | ✓ |
  | Geschenkkarte Holz | ✓ | ✓ | – |
  | Schiefer-Untersetzer | ✓ | ✓ | ✓ |
  | Sektglas | – | ✓ | – |
  | Schlüsselanhänger Leder | ✓ | ✓ | – |
  | Flaschenöffner Edelstahl | – | – | ✓ |
  | Tischkarte Acryl klar | – | ✓ | – |
  Gerechnet: Einrichten einmal (Datei, Fokus, Probestück, 10 min) + **je Name** 1,5–3 min + Laserzeit + Rohling.
  Holzkarte (Platzhalter, C-Kunde): 1 Stück 24,10 € · 60 Namen 5,35 € je Stück.
- **Annahme bis Klaus' Wort:** in der Werkstatt steht nur der **CO2-Laser**. Haken je Verfahren im Katalog („Gerät in der eigenen Werkstatt“).
- **Fremdfertigung für jedes Verfahren:** fehlt das Gerät, rechnet die Eigenfertigung nicht, sondern nennt ihren Zwilling
  „… — Lohngravur (Zukauf)“ (Einkauf 1 / 10 / 25 / 50 Stk., Platzhalter). „→ Fremdfertigung nehmen“ im Angebot tauscht die Position.
- **Weitere Verfahren als Fremdfertigung** (Handelsware): Tasse mit Namen (Sublimation) · Kuli vollfarbig mit Namen (UV-Druck) ·
  Acryl-Anhänger mit Foto (UV-Druck) · Notizbuch mit Blindprägung (Klischee, ab 25) · Emaille-Anstecker (Form, ab 100).
  Prägung und Emaille brauchen ein Werkzeug je Motiv — darum dort keine Einzelstücke.
- **Gut handeln:** je Menge lassen sich mehrere Herstellerangebote eintragen, der günstigste zählt.
- **Kunden-Titel getrennt vom internen Namen** (`titelVorgabe`): Lücke aus dem ersten Bau — „Kugelschreiber fertig bedruckt (Zukauf)“
  wäre als Titel aufs Kundenblatt gekommen. Jetzt „Kugelschreiber mit Logo“; die Probe sucht Zukauf/Lohngravur/Laser/Hersteller.
- ⚠ **Hochzeit mit 60 Gästen über Fremdfertigung:** eingetragen sind 1/10/25/50 — für 60 rechnet die Position nicht (Frage 2 unten).
- **Kleinmengenzuschlag** (Klaus: *„als eigene Zeile, unter 10 Stück“*): eigene Zeile „Kleinmengenzuschlag“ auf dem Angebot,
  **einmal je Angebot**, sobald eine Stück-Position unter 10 liegt; Stunden, km und Montage zählen nicht. Betrag **12,00 € netto**
  (Einstellungen → Kleinmengenzuschlag: Text, Grenze, Betrag; leer = aus). Je Angebot „weglassen“.
  Geht auf das Kundenblatt, in die WorkFloh-Datei und als Position an BookLedgerPro. Gestellte Angebote bleiben unverändert.
  ✅ Klaus 2026-10-13: „12 Euro passt, einmal je Angebot“ — die Platzhalter-Marke ist weg.
- Am Laser offen bei Klaus: Lasertyp und Stärke, Einrichtzeit, Minuten je Name, Maschinenstundensatz, welche Rohlinge.

## Nachtrag: Anfrage einlesen, alte Angebote wiederfinden

Klaus: *„Über den Kundennamen oder Kundennummer sollen alte Angebote leicht übernommen werden können … automatisch nach oben
gerückt werden, das Angebot, was der Anfrage am nächsten kommt … eine Anfrage über E-Mail automatisch erkannt … ein entsprechendes
Angebot automatisch generiert.“*

- **Kunden** haben jetzt **Kundennummer** und **E-Mail**.
- **Suche** über alle alten Angebote (Reiter „Angebote“): Kundenname (auch Teil), Kundennummer, Angebotsnummer, Produkt, Text.
  Das Nächstliegende steht oben, mit Ähnlichkeit in % und dem Grund („gleicher Kunde · Tasse · ähnliche Menge“). „⧉ als neues Angebot“ übernimmt.
- **📥 Anfrage einlesen**: E-Mail einfügen oder `.eml` wählen. Gelesen werden Absender, Kundennummer, Mengen, Maße, Farben, Produkte;
  der Kunde wird gefunden (Kundennummer, E-Mail, Firmen-Adresse, Name) oder kann mit einem Tipp angelegt werden.
  **„✨ Angebot erzeugen“** nimmt das nächstliegende alte Angebot (ab 40 %) und setzt die angefragten Mengen — sonst baut es den
  Entwurf aus den erkannten Produkten. Immer ein **Entwurf**; gestellt wird von Hand.
- Offline, ohne KI, auf dem Gerät. ⚠ Grenzen: freie Formulierungen („so wie letztes Mal, nur doppelt so viele“) versteht es nicht;
  Anhänge der Mail werden nicht gelesen; die Gewichte der Ähnlichkeit sind gewählt, nicht gemessen. Optional später: KI mit eigenem
  Schlüssel für freie Texte — dann ginge der Mailtext an die KI, das braucht Klaus' ausdrückliches Ja.

## Nachtrag: KI-Lesung mit eigenem Schlüssel, personenbezogene Daten ausgeblendet

Klaus: *„KI mit eigenem Schlüssel einbinden, dabei alles, was beim Auslieferungsprüfer, Sendeprüfer … Bedarfsanalyse …
Workflow PDF beachtet wird … dass … nicht von einer KI personifizierte Daten übernehmen. Das soll ausgeblendet werden.“*

- In „📥 Anfrage einlesen“ steht **„🤖 Mit KI lesen“** — freiwillig, nach der Offline-Lesung, mit demselben Schlüssel wie die Marktpreis-Recherche.
- **Prüfen:** Prüfkern des Auslieferungsprüfers (`pruefer-mail.js`, byte-1:1 aus Workflow-PDF). Anweisung an eine KI, versteckter
  Text, unsichtbare Zeichen, Absender-Tarnung → die App **hält einmal an** und zeigt den Fund; erst der zweite Tipp sendet.
- **Verdecken:** Sage-Modul 25 (byte-1:1 über Workflow-Needs) + eigene Muster. Getestet an einer erfundenen Mail: Name, Verein,
  Kundennummer, Telefon, Straße, PLZ/Ort, Mail, Datum, Betrag, Rechnername und IP aus dem Mailkopf — nichts davon im Körper der Anfrage.
  Mengen und Produktwörter bleiben lesbar. Vorgeschlagene weitere Namen (aus Anrede/Gruß) lassen sich mit einem Tipp dazunehmen.
- **Nicht raten:** eine KI-Position zählt nur mit wörtlichem Zitat aus der Anfrage, das die Menge trägt, und mit einer Vorlage
  aus dem Katalog — sonst verworfen, mit Grund. Der Kunde wird nie von der KI bestimmt.
- ⚠ Nicht gegen die echte API gemessen (kein Schlüssel im Behälter) — Gegenseite gestellt, wie bei der Marktpreis-Recherche.
  ⚠ Verdecken ist keine Verschlüsselung: was kein Muster hat und nicht im Kundenstamm steht („die Filialleiterin in Kiel“), bleibt
  stehen — darum steht der verdeckte Text vor dem Senden sichtbar da.

## Nachtrag: Unterlagen am angenommenen Angebot

Klaus: *„Ist ein entsprechendes Angebot akzeptiert worden, soll der … Entwurf als Beispielbild mit eingefügt werden können. Also
verschiedene Ansichten, hergestelltes Produkt … eine Coreldatei … Bildbearbeitungsprogramm … PDF … Link für die Bildgenerierung …
genau dieses Angebot … wiederholen … für andere Kunden übernehmen“* · *„Dateien mitgeben an WorkFloh, 50 MB passt“*.

- Gestelltes Angebot → **„✅ Auftrag erteilt (angenommen)“** mit Datum; in der Liste „angenommen ✅“.
- Je Position **„📎 Unterlagen“**: Bilder als **Entwurf** oder **fertiges Produkt** (mehrere Ansichten, je mit Notiz), **Dateien**
  (Corel `.cdr`, Photoshop `.psd`, Illustrator `.ai`, PDF, SVG …, höchstens 50 MB, Byte für Byte) und **Links** (Cloud, Bildgenerierung).
  Auch am gestellten Angebot — der Preis ändert sich nicht. In der verschlüsselten Sicherung mit drin.
- **Nie auf dem Kundenblatt.** **An WorkFloh** gehen alle Dateien mit sprechendem Namen mit (`AN-…_P-1_Datei_logo.cdr`), Links stehen im Auftragstext.
- **„★ Als Beispiel in die Vorlage“**: die Fotos (fertig zuerst) erscheinen in der Galerie der Produktvorlage; der Preis wird dort frisch gerechnet.
- **„⧉ für anderen Kunden“** in der Liste: Positionen, Bilder und Unterlagen kommen mit, der Kunde wird neu gewählt.
  Die **Suche** findet ein Angebot auch über Dateinamen und Notizen der Unterlagen.
- Gefunden beim Bauen: Browser melden eine Corel-Datei als `application/octet-stream` — der Typ kommt dann aus der Endung.
- ⚠ Nicht gemessen: echte große Dateien (50 MB) am Tablet — Speicher und Dauer der WorkFloh-Datei (Dateien gehen als data-URL in die JSON, also ~⅓ größer).

## Lieferanten — ehrlich

Der Brief verlangt: jede Adresse vorher abrufen, nichts Ungeprüftes eintragen. **Abrufen ging nicht**: der
Netz-Proxy des Behälters weist alle sieben Seiten ab (403), das Abruf-Werkzeug löst keinen Namen auf (auch
nicht wikipedia.org). Die Websuche hat die Domains und ihre Wiederverkäufer-Seiten gezeigt — das ist kein Abruf.

Deshalb steht **kein Lieferant eingetragen**. Die sieben Kandidaten (PF Concept, Solo midocean, Inspirion,
WIRmachenDRUCK, FLYERALARM, SAXOPRINT, Onlineprinters) stehen auf der Seite als **„Vorschläge zum Prüfen —
nicht abgerufen“**, je mit Link, dem, was die Suche zeigte, und dem, was sie nicht zeigte. Erst „✓ geprüft —
eintragen“ (nach eigenem Öffnen) übernimmt einen, mit dem Datum dieses Tipps.

## Offene Fragen an Klaus

1. **Handlungskosten-Satz für Handelsware?** Vorgabe jetzt: 25 % im Gebiet Handelsware (Platzhalter), je Produkt
   überschreibbar. Gewinn 20 %, Kundenklasse A −5 / C +10 Prozentpunkte.
2. **Zwischenmengen** (z. B. 300 Visitenkarten, eingetragen sind 250 und 500): jetzt wird **nichts geschätzt** —
   die Position bleibt offen und nennt die eingetragenen Mengen. Möglich wäre: nächstgrößere Staffel mit Hinweis,
   oder nur die eingetragenen Mengen anbieten. Was soll gelten?
3. **Eigener Tab oder Ansicht?** Gebaut ist eine Ansicht in der App mit eigener Adresse `#handel` — sie öffnet
   sich auch in einem neuen Tab. Passt das?
4. **Bei welchen Lieferanten hast du schon ein Konto?** Die gehören zuerst geprüft eingetragen.

## Nicht gebaut / Grenzen

- KI-Recherche der Einkaufspreise (Brief Punkt 8, optional): nicht gebaut.
- Kundenrabatt und Skonto aus den Sätzen wirken bei Handelsware nicht (nur Handlungskosten, Gewinn, Klasse) — steht auf der Seite.
- Mehrere Einkäufe für dieselbe Menge: der günstigste zählt (steht im Rechenweg und in der Tabelle).
- ⚠ Nicht gemessen: Tablet, echte Lieferantenseiten, echte Einkaufspreise.
