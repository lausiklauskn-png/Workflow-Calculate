# Brief für die nächste Sitzung — Handelsware: Einkauf und Wiederverkauf

**Repo:** lausiklauskn-png/Workflow-Calculate · zuerst `CLAUDE.md`, dann diesen Brief.
**Pflicht:** frisch von `origin/main`, `npm install && npm test`, `NUR_ANKER=1 node tests/gegenprobe.mjs`.

## Klaus' Wunsch (2026-10-12, wörtlich zusammengefasst)

> Einkauf von fertigen Produkten. Ich produziere nicht selber — z. B. Kugelschreiber kaufe ich ein:
> Einkauf Komplettpreis, Verkauf Komplettpreis, **inklusive Versand**. Genauso Visitenkarten, Einkauf bei
> entsprechenden Anbietern. Die sollen **als Link schon eingetragen** sein — vorrangig Anbieter für
> **Wiederverkäufer**, aber auch für **Privatkunden**, wo ich günstig einkaufen kann, um mit Aufschlag
> weiterzuverkaufen. Die Kalkulation soll **automatisch** erfolgen.

## Was es schon gibt (nicht neu bauen)

- `WC.kalk.handel(ekCent, s)` — Handelskalkulation: Bezugspreis × (1 + Handlungskosten %) × (1 + Gewinn %)
- Satz `handlungskostenPct` je Arbeitsgebiet; Kundenklassen A/B/C; Satz-Ebenen
- `vorlage.zukaufEkCent` — bisher nur als Hinweis „Zukauf statt Eigenfertigung?“ im Marktvergleich
- Arbeitsgebiete als Startkatalog (`WC.STARTKATALOGE`, `gebietHinzufuegen`), Beispiel-Angebote, KI-Recherche mit Beleg

## Zu bauen

1. **Lieferanten** (neuer Katalog-Reiter): `{ id, name, url, fuer: "wiederverkaeufer" | "privat" | "beides", anmeldung: bool, notiz, geprueftAm }`.
   Startliste mit Links. ⚠ **Jede Adresse vor dem Eintragen nachsehen** (abrufen); was nicht antwortet oder
   nicht passt, kommt nicht hinein. Kandidaten zum Prüfen, nicht als Befund: Werbeartikel-Großhändler für
   Wiederverkäufer (z. B. PF Concept, Midocean, Inspirion) · Online-Druckereien mit Wiederverkäufer-Zugang für
   Visitenkarten (z. B. WIRmachenDRUCK, Flyeralarm, Saxoprint, Onlineprinters). Je Eintrag kennzeichnen, ob
   Wiederverkäufer-Konto nötig ist.
2. **Arbeitsgebiet „Handelsware“** mit Vorlagen ohne eigene Fertigung (z. B. Kugelschreiber fertig bedruckt,
   Visitenkarten, Flyer). Einkauf als **Komplettpreis je Menge inkl. Versand**:
   `einkauf: [{ menge, gesamtCent, lieferant, url, datum }]` — kein Stückpreis, keine Maschinenzeit.
3. **Automatische Kalkulation:** Bezugspreis = Einkauf komplett inkl. Versand → + Handlungskosten (Bestellen,
   Prüfen, Weitergeben; optional Minuten × Satz) → + Gewinn (+ Kundenklasse) → **Verkauf Komplettpreis inkl.
   Versand** als EINE Position. Diese Position trägt keinen eigenen Versandposten (`versandArt: "keiner"`),
   sonst zählt der Versand doppelt. Staffeln aus den eingetragenen Einkaufsmengen.
4. **Zwischenmengen:** nicht interpolieren (das wäre geraten). Vorschlag: nur eingetragene Mengen, oder die
   nächstgrößere Staffel mit Hinweis — **Klaus fragen**.
5. **Whitelist:** Lieferant, Link und Einkaufspreis gehen nie aufs Kundenblatt, nie in WorkFloh/BLP.
   Lockwert-Probe wie bei EK 7,31 €.
6. **Beispiele:** 500 Kulis fertig bedruckt, Visitenkarten 250/500/1000 — mit Platzhalter-Einkaufspreisen.
7. **Optional:** KI-Recherche für Einkaufspreise bei den eingetragenen Lieferanten (`allowed_domains`),
   gleiche Regel: nur belegt, „ungeprüft“ bis ✓. ⚠ Wiederverkäuferpreise stehen oft nur nach Anmeldung —
   die Suche sieht sie dann nicht, und das muss die Seite sagen.
8. **Nachkalkulation:** Ist-Einkauf (Rechnung des Lieferanten) gegen Plan.

## Offene Fragen an Klaus

- Handlungskosten-Satz für Handelsware (Vorgabe aus dem Gebiet oder eigener Satz?)
- Zwischenmengen (Punkt 4)
- Welche Lieferanten nutzt er schon (mit Konto)? Die gehören zuerst in die Liste.

## Prüfen

Proben gegen Handrechnung (z. B. Einkauf 500 Kulis 120,00 € inkl. Versand, 25 % Handlungskosten, 20 % Gewinn →
180,00 € netto), Whitelist-Lockwert, Gegenprobe-Fall je Zusicherung, Cache-Bump, Pages-Lauf nach dem Merge ansehen.
