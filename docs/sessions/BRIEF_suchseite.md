# Brief — Workflow Calculate: Startseite als Suchmaschine, Beispiel-Fragen, Import/Export

Für die nächste Sitzung. Depot `lausiklauskn-png/workflow-calculate`, Pages
https://lausiklauskn-png.github.io/workflow-calculate/. Zuerst `CLAUDE.md` lesen, frisch von `origin/main`.
Stand bei Übergabe: `main` nach #10 (← Zurück), Cache v28. Proben: kern 239 · browser 155 · Gegenprobe 148 Fälle.

## Klaus' Auftrag (2026-10-12, wörtlich gekürzt)

> „Die Startseite für den Workflow Calculator soll eine vereinfachte Suchmaschine sein, die nach Produkten oder
> Angeboten innerhalb der Workflow Calculate Seite sucht. Die Ergebnisse sollen wie bei einer Embedding-Suche,
> semantische bidirektionale Suche … und auch eine einfache Wortsuche, so wie sie bei Workflow PDF … vorhanden ist.
> Beispiel: ‚Der Kunde möchte 10 Tassen im Sublimationsdruck, beidseitig bedruckt, kein Sondermaß. Wie viel kostet
> das?' Dabei sollen solche Standardworte wie ‚der Kunde wünscht' oder ‚der Kunde mit Name wünscht' gespeichert sein,
> sodass diese nicht mit in den Suchbegriff eingebunden werden. Die Hauptsache ist bei der Ausgabe, dass einfach nur
> das Produkt als Ganzes mit dem entsprechenden Preis ausgegeben wird. Der Kunde kann angegeben werden — ob er schon
> Angebote hatte, ob A-, B- oder C-Kunde — soll **versteckt** angegeben werden können, dass der Kunde es nicht auf
> Anhieb sieht, wenn er auf den Bildschirm schaut. Oder eine Korrektur: was würde es kosten, wenn er nur eine Tasse
> nimmt? Das soll alles auf der ersten Seite möglich sein, **ohne automatisch die Hintergrundseite aufzurufen**. Die
> wird nur manuell aufgerufen, damit ich sehe, wie sich der Preis zusammensetzt. … Ein Werkzeug für Tomys Hub, für
> WorkFloh und für die gesamte Brigade, um ein einfaches Angebot schnellstmöglich zu erfassen.
> Mache 10 verschiedene Fragen … 10 Produkte, 10 unterschiedliche Mengen … die in Workflow Calculate integriert sind.
> Sie sollen in der Suchmaschinenseite einzeln gelöscht werden können, damit später aktuelle Daten eingelesen werden.
> Ganz oben ein Import-/Export-Werkzeug: ein Backup exportieren und einen kompletten Import machen für Angebote.
> Gleichzeitig ist das eine Backup-Seite. Import für Kunden, die die App erwerben: ihre tabellarisch gesammelten
> Angebote direkt einfügen, automatisch — von mir aus mit KI — an den entsprechenden Stellen eingeordnet. Datenschutz:
> Kundenname, Kundennummern usw. sollen nicht vorhanden sein. Nur die reinen Daten für die Angebotserstellung."

## Was es schon gibt (nicht neu bauen, wiederverwenden)

| Baustein | wo | wofür hier |
|---|---|---|
| Anfrage lesen (Mengen, Maße, Farben, Produkte; Zahl nur mit Stück-/Warenwort) | `assets/kern/anfrage.js` `lesen()` | die Suchfrage auswerten: „10 Tassen“ → Vorlage + Menge |
| Ähnlichkeit, Suche über Angebote, Stamm-Wörter | `anfrage.js` `aehnlich()`, `suche()` | Wortsuche über Angebote |
| Preis einer Position | `WC.kalk.position`, Handelsware `handelPosition` | der Preis auf der Startseite — **dieselbe** Rechnung wie im Angebot, keine zweite |
| Kundenklassen A/B/C, Kunden mit `nr`/`email` | Einstellungen, Store `kunden` | versteckte Angabe |
| Verdecken vor einer KI (Modul 25 + eigene Muster, `findLeak`, Halt bei Anweisung an eine KI) | `assets/kern/ki-anfrage.js`, `modules/25_pseudonym.js`, `pruefer-mail.js` | Import mit KI |
| Verschlüsselte Sicherung (fügt hinzu, überschreibt nie) | `assets/kern/sicherung.js` | Backup-Seite: **vorhanden**, nur nach oben holen |
| ← Zurück-Verlauf | `verlaufMerken` am Ende von `zeichne` | die neue Seite ist ein Reiter wie die anderen |
| Wortsuche mit Fundstelle (Umlaute, Satzzeichen, Daten angeglichen) | **Workflow-PDF** `assets/suche.js` | Vorlage; ist host-neutral |
| Suche nach Bedeutung (e5-small, Download mit Balken, auf Knopfdruck) | **Workflow-PDF** `assets/bedeutung.js`, `vendor/sbkim/03_embedding.js` + `04_match.js` (**byte-1:1 aus Sage**, SHA-gepinnt) | semantische Suche |

## Zu bauen

1. **Neuer Reiter „🔎 Suche“, Startseite** (Vorgabe beim ersten Öffnen; die Wahl in `workflowcalculate_reiter` gilt weiter).
   Ein Suchfeld, darunter die Ergebnisse als **Karten: Produkt als Ganzes · Menge · Preis** (netto und brutto,
   je Stück). Kein Kalkulationsdetail auf der Karte.
2. **Füllwörter-Liste** (Einstellungen, editierbar, Vorgabe z. B. „der Kunde möchte“, „der Kunde wünscht“,
   „Kunde … wünscht“, „wie viel kostet das“, „was kostet“, „bitte“): wird vor der Suche aus der Frage entfernt und
   **angezeigt** („ignoriert: …“), nie still. Namen nach „Kunde“ werden **nicht** gesucht.
3. **Wortsuche + Suche nach Bedeutung**, beide wie in Workflow PDF: Wort-Treffer zuerst, Bedeutungs-Treffer
   darunter („ähnlich“). Modell nur auf Knopfdruck, vorher sagen, was aus dem Netz kommt. Durchsucht werden
   Produktvorlagen (inkl. Handelsware) **und** gespeicherte Angebote.
4. **Korrektur an Ort und Stelle**: Menge auf der Karte änderbar (−/+ oder Feld; „und bei 1 Tasse?“ auch als neue
   Frage), Preis rechnet sofort neu. Kleinmengenzuschlag und Staffel gelten wie im Angebot.
5. **Kunde versteckt**: optional Kunde wählen; ob es frühere Angebote gibt und welche Klasse (A/B/C), steht nur als
   unauffälliges Zeichen (Vorschlag: ein kleines Kürzel, das erst auf Tipp/Gedrückthalten aufgeht). Die Klasse wirkt
   auf den Preis. Kein Klartext „A-Kunde“ auf dem Schirm.
6. **Kein Sprung**: die Startseite öffnet nie selbst ein Angebot oder den Katalog. Ein Knopf „Zusammensetzung“
   klappt **auf derselben Seite** auf; „→ als Angebot übernehmen“ / „Kalkulation öffnen“ nur auf Tipp.
7. **10 Beispiel-Fragen** (verschiedene Produkte, Mengen, Gebiete: Werbetechnik, Stickerei, Laser, Handelsware,
   Dienstleistung), als Vorschläge unter dem Suchfeld, **einzeln löschbar** (✕), „Beispiele wiederherstellen“ in den
   Einstellungen. Platzhalter-Preise bleiben als solche markiert. Eine davon wörtlich Klaus' Tassen-Frage.
8. **Import/Export oben** (ganz oben auf der Startseite oder ein eigener Reiter „⇅ Daten“ — siehe Frage 3):
   - Export/Backup: die vorhandene verschlüsselte Sicherung, dazu **Angebote als CSV** (ohne Kundendaten? Frage 4).
   - Import Backup: vorhanden (fügt hinzu).
   - **Import tabellarischer Angebote** (CSV; XLSX nur, wenn eine Bibliothek byte-1:1 und offline geht — sonst
     „als CSV speichern“ sagen): Spalten erkennen (Produkt, Menge, Maße, Preis, Datum …), **Spalten mit Namen,
     Kundennummer, Adresse, E-Mail, Telefon werden nicht übernommen** und das wird angezeigt. Zuordnung zu Vorlagen
     offline über `anfrage.js`; **mit KI** (eigener Schlüssel, freiwillig) nur über den Verdecken-Weg aus
     `ki-anfrage.js` — verdeckt, `findLeak`, einmal anhalten. Vorschau vor dem Übernehmen, nichts still.

## Zu klären mit Klaus (fragen, nicht raten)

1. **„bidirektional“**: gemeint als „Frage findet Produkt UND ein Produkt findet ähnliche Fragen/Angebote“? Oder
   e5-Query/Passage-Symmetrie? Vorschlag: beides über dieselben Vektoren, im Brief-Abschluss benennen.
2. **Versteckte Kundenangabe**: Kürzel + Tipp zum Aufklappen gut? Oder Farbe/Punkt?
3. **Import/Export** ganz oben auf der Suchseite oder eigener Reiter?
4. **Export für Käufer**: Angebote ohne Kundendaten exportieren (Vorlage für andere Betriebe) gewünscht?
5. **Einbindung in Tomys Hub / WorkFloh**: reicht ein Link `…/workflow-calculate/?q=…` (Frage vorbelegt)?

## Leitplanken

- Nichts Internes hinaus (Whitelist `aussen.js`), Speicher-Namen nie ändern, Cache-Bump + `node tools/cache-stand.mjs`.
- Byte-1:1-Module aus Workflow-PDF / Sage nie abwandeln, SHA in `tests/kern.mjs` pinnen.
- Proben nur mit erfundenen Daten; jede neue Zusicherung mit Gegenprobe-Fall (`NUR_ANKER=1` zuerst).
- Am Ende: Abschlussbrief mit gemessenem Stundennachweis, **Forschungseintrag in Kimhub**
  (`node tools/sitzung-eintragen.mjs`, `arm: "voll"`, `ende` NACH dem letzten Merge), Brief für die nächste Sitzung.
- Offene Fragen von vorher bleiben: Lieferanten prüfen, Laser-Daten, Zwischenmengen-Regel, Vorgabe-Sätze.
