# Abschlussbrief — Sitzung 2026-10-12 spät (Workflow Calculate: Suche als Startseite)

Brief: `BRIEF_suchseite.md`. Nächster Brief: `BRIEF_suche-stufe2.md`.

## Klaus' Antworten auf die fünf Fragen des Briefes (zu Beginn gefragt)

| Frage | Antwort |
|---|---|
| „bidirektional“ | **beides**: Frage → Produkt, und an der Zusammensetzung Produkt → gelernte Fragen, Beispiel-Fragen, Angebote |
| versteckte Kundenangabe | **kleines Kürzel**, Klartext erst auf Tipp |
| Import/Export | **eigener Reiter „⇅ Daten“** |
| CSV-Export | **zwei Knöpfe**: intern mit Kunde · ohne Kundendaten |
| Einbindung Tomys Hub / WorkFloh | **?q= reicht**, hier gebaut; Knöpfe dort in einer eigenen Sitzung |

Dazu während der Arbeit: *„im Vollbild, übersichtlicher, nicht zu viel Text … ein Mikrofon im Suchfeld … soll sich selbst
verbessern mit jeder Frage“* und *„mindestens 10 Beispiele … einmal komplett durchspielen … für einen Nutzer, der angelernt wird“*.

## Was getan wurde

- **🔎 Suche als Startseite**: ein Suchfeld mit 🎤 (Laufbalken im Feld, byte-1:1 aus Workflow PDF), Karten
  Produkt · Menge · Preis (netto, brutto, je Stück — über `WC.angebot.rechne`, also mit Versand, Kleinmengenzuschlag
  und Kundenklasse genau wie im Angebot), Menge auf der Karte, „Zusammensetzung“ auf derselben Seite, „＋ Angebot“ und
  „Kalkulation öffnen“ nur auf Tipp, Füllwörter benannt („ignoriert: …“), Kunde als Kürzel `◦n/k`, frühere Angebote
  ohne Kundennamen, Produkte aus noch nicht geholten Gebieten klein mit „＋ Gebiet“.
- **Lernen**: Menge ändern, Zusammensetzung öffnen, ＋ Angebot, ✓ merken die Frage-Wörter am Produkt; ✕ das Gegenteil.
  Höchstens 300 Einträge, in den Einstellungen (reist mit der Sicherung), „Gelerntes vergessen“ in Einstellungen → Suche.
- **🧠 Bedeutung** nur auf Knopfdruck, vorher die Frage, was aus dem Netz kommt; ordnet jede Vorlage mit ihren gelernten
  und Beispiel-Fragen ein.
- **10 Beispiel-Fragen** (10 Produkte, 10 Mengen, alle fünf Gebiete, Klaus' Tassen-Frage wörtlich), einzeln ✕,
  „Beispiele wiederherstellen“, **▶ Durchspielen** 1/10 … 10/10 mit je einem Lernsatz; fehlende Gebiete kommen dazu.
- **⇅ Daten**: Sicherung, CSV intern / ohne Kundendaten, CSV-Import mit Vorschau (Personenspalten nach Kopf UND Inhalt
  nicht übernommen und genannt), KI-Zuordnung über `ki-anfrage.js`, Excel wird benannt statt verworfen.
- Datenschutz: Suche, Spracheingabe (Chrome → Google), Bedeutung (jsDelivr, Hugging Face), Tabellen-Import ergänzt.

## Gemessen

- `kern` **271 grün · 0 ROT** (BLP-Parser-Probe ohne Klon übersprungen) · `browser` **191 grün · 0 ROT** (Cache v30).
- Gegenprobe: **176 Anker · 0 tot**; die 29 neuen Fälle plus die 4 berührten alten Fälle (32 Fälle in Summe der Blöcke)
  **32 gefangen · 0 blind · 0 aus falschem Grund**, in einem Lauf ohne Eingriff in den Baum.
- Die 10 Beispiele: jede Frage findet als ERSTES ihr Produkt mit ihrer Menge und hat einen Preis — im Kern und im
  Browser beim Durchspielen.

## Befunde (mit Herkunft)

- **hinsehen**: „250 Kugelschreiber“ fand zuerst den Zukauf (nur 500 Stk. eingekauft) — Zukauf ohne Einkauf für genau
  die Menge bekommt halbe Punkte; „bedruckt“ zu „bedrucken“ zählt als ganzes Wort.
- **regel (Probe)**: „Was kosten 30 Kaffeepötte“ — ohne Warenwort keine Menge; jetzt gilt eine einzelne Zahl ohne
  Zeit-/Maß-Wort als Menge („in 2 Wochen“ bleibt keine, eigener Gegenprobe-Fall).
- **hinsehen (Bildschirmfoto)**: Karten im Raster wurden auf die Höhe der Nachbarn gezogen; Produkte aus fremden Gebieten
  standen als große leere Karten — jetzt klein als „Auch möglich“.
- **regel**: Startseite = Suche brach den Zurück-Test (Startansicht war „Angebote“) — Probe auf Suche umgestellt.
- **gegenprobe/hinsehen**: zwei eigene Anker standen doppelt (gleiche Zeile wie in insAngebot/kiAnfrageFeld) — `NUR_ANKER`
  meldete sie in Sekunden, Code umformuliert.
- **regel (eigener Fehler)**: während des Gegenprobe-Laufs `datenschutz.html` geändert → fünf Blöcke brachen mit roter
  Ausgangslage ab. Cache v30, ganzer Lauf ohne Eingriff wiederholt. Dieselbe Lehre steht in Kimhubs Verfassung.

## Nicht gemessen

- Tablet (Startseite, Kürzel, Durchspielen, Daten-Reiter), **Mikrofon in Chrome am Tablet** (Probe stellt die Erkennung),
  **das echte Sprachmodell** (Probe stellt Modul 03; im Behälter nicht ladbar), KI-Zuordnung gegen die echte Schnittstelle,
  eine echte Angebots-CSV aus einem anderen Programm. Alle Preise außer dem Kleinmengenzuschlag sind Platzhalter.
- Punkte der Wortsuche (1 · 0,6 · +0,5 · Lernen bis 3 · ✕ × 1,5) sind gewählt, nicht gemessen.

## Stundennachweis

Gemessen aus dem Reflog dieses Behälters (UTC; Beginn aufgerundet, Ende abgeschnitten):

| | |
|---|---|
| erster Handgriff (Klon von workflow-calculate) | 2026-10-12 21:05:20Z |
| Ende | Merge dieses PR — steht im Forschungseintrag in Kimhub, gemessen nach dem Merge |

Die Spanne ist die Obergrenze von Klaus' Arbeitszeit (seine Auskunft: er sitzt davor und liest jede Nachricht);
Pausen sind nicht abgezogen. Nicht addiert mit der Sitzung davor.
