# Workflow Calculate

Angebote kalkulieren — **Produkt wählen, Maße, Menge und Material eingeben, fertig**. Die App rechnet
Material, Arbeitszeit, Maschine, Verpackung & Versand nach dem Schema der Zuschlagskalkulation und
schreibt das Angebot. Die Kalkulation bleibt intern; der Kunde sieht nur Leistung, Staffelpreise,
Versand und Summen.

Adresse: <https://lausiklauskn-png.github.io/Workflow-Calculate/> · offline, ohne Konto, ohne Server.

## So geht es

1. **Kunde** wählen oder neu anlegen (Klasse A/B/C)
2. **Produkt** wählen — am schnellsten über ein Beispiel mit Bild und gerechnetem Preis
3. **Maße, Menge, Material, Farben** eintragen
4. **Preis prüfen** — „💶 Preis nachbessern“ zeigt jede Alternative mit ihrer Wirkung, bevor sie gilt
5. **Verpackung & Versand** — automatisch, oder von Hand
6. **Angebot** drucken / als PDF, als Auftrag an Mein WorkFloh bzw. Tomys WorkFloh übergeben,
   oder mit „🧾 An BookLedgerPro“ als vorbefülltes Angebot in die Buchhaltung

Ändern nach dem Stellen ergibt eine **neue Fassung** (dieselbe Nummer, Vergleich mit der alten).
**🔐 Sicherung** (Einstellungen): alles in einer verschlüsselten Datei, Zurückholen fügt hinzu.

**Stufe 3:** Arbeitsgebiete Stickerei (nach Stichzahl) und Montage & Dienstleistung (Std., km) im Katalog hinzufügen ·
**📏 Nachkalkulation** am gestellten Angebot (Ist-Zeit, -Material, -Maschine, -Versand) und je Vorlage ins Zeit-Muster übernehmen ·
**Beispiele** im Reiter „Angebote“: 5 Angebote mit 15 Positionen zum Ansehen und zum Testen der Übergaben ·
**🤖 KI-Recherche** im Marktvergleich (eigener Schlüssel): nur belegte Preise, mit Quelle, „ungeprüft“ bis ✓.

Abkürzen: ein Angebot „⧉ als neues Angebot“ übernehmen, oder eine Position aus einem früheren Angebot.

## Prüfen

```bash
npm install
npm test                                  # tests/kern.mjs + tests/browser.mjs
NUR_ANKER=1 node tests/gegenprobe.mjs     # jeder Anker steht genau einmal
npm run gegenprobe                        # jeder eingebaute Fehler muss rot werden
```

© 2026 Klaus Nitzsche — [Impressum](impressum.html) · [Datenschutz](datenschutz.html)
