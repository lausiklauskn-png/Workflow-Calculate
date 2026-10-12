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
