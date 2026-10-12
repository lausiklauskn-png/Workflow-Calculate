# Abschlussbrief — Sitzung 2026-10-12 (Workflow Calculate, Stufen 1–3)

## Was getan wurde

| PR | Inhalt |
|---|---|
| Workflow-Calculate #1 | **Stufe 1**: Angebotsplaner. Zuschlagskalkulation (KLR), Mengenregeln mit Nesting, Farben, Staffeln, Kundenklassen A/B/C, Preis nachbessern mit Wirkung vorher, eigener Preis → Formel lernen, Verpackung & Versand als ein Posten, Marktvergleich, Beispiele mit Zeichnungen, Kundenblatt nur aus der Whitelist, Übergabe an Mein WorkFloh / Tomys WorkFloh |
| Workflow-Calculate #2 | **Stufe 2**: Fassungen (AN-…-F2, Vergleich), Übergabe an BookLedgerPro (`?uebernahme=`), verschlüsselte Sicherung, Klaus' rotes Zahnrad als App-Symbol |
| BookLedgerPro #324 | BLP nimmt die Quelle `workflow-calculate` an |
| Workflow-Calculate #3 | **Stufe 3**: Nachkalkulation (Plan gegen Ist, Faktor je Vorlage ins Zeit-Muster), Arbeitsgebiete Stickerei (Stichzahl) und Montage & Dienstleistung (Std., km), Beispiel-Angebote |
| Workflow-Calculate #4 | KI-Recherche der Marktpreise **nur mit Beleg** (Quelle aus der Websuche UND Zahl im Zitat, sonst verworfen; „ungeprüft“ bis ✓), Beispiele Firmenjubiläum und Hochzeit statt Geburtstag, Vollbild |

## Gemessen

- `npm test`: kern **145 grün · 0 ROT**, browser **87 grün · 0 ROT**
- Gegenprobe: **63 gefangen · 0 blind · 0 aus falschem Grund · 0 tote Anker**
- Übergabe der Beispiel-Auftragsdatei in **Mein WorkFloh und Tomys WorkFloh** über deren eigenes `applyForwardBundle` (im Browser)
- BookLedgerPros echter Parser liest die Nutzlast; Summe auf den Cent
- Pages-Bau nach #1–#3 erfolgreich; nach #4 bei Sitzungsende in der Warteschlange

## Nicht gemessen

- Alles am Tablet (Klaus' Sichttest steht aus)
- KI-Recherche gegen die echte API (kein Schlüssel im Behälter; Gegenseite nach der Doku gestellt)
- Echtes Drucken / „Als PDF speichern“, Download und Dateiwahl der Sicherung am Gerät, Sprung nach BookLedgerPro mit Entsperren
- Alle Zahlen im Katalog sind Platzhalter

## Stundennachweis

Gemessen aus Reflog und Commits dieses Behälters (UTC; Beginn aufgerundet, Ende abgeschnitten):

| | |
|---|---|
| erster Handgriff (Klon des Depots) | 2026-10-12 13:49:29Z |
| letzter Commit (Merge #4) | 2026-10-12 17:07:55Z |
| **Spanne** | **3 h 17 min** (15:50–19:07 Uhr MESZ) |

Nicht enthalten: die Planungsphase vor dem Klon (hinterlässt keine Spur) und das Schreiben dieser Briefe.
Die Spanne ist die Obergrenze von Klaus' Arbeitszeit (seine Auskunft: er sitzt davor); Pausen sind nicht abgezogen.
