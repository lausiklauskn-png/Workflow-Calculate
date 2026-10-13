/*
 * Siegel-Inhalt — DIE IDENTITÄT DIESES KNOTENS, und sonst nichts.
 *
 * Der Andock-Wizard liegt byte-1:1 aus Sage in `modules/16b_andock_wizard.js`
 * und liest nur `window.SBKIM_SIEGEL_WIZ`. Diese Datei wird NIE verteilt: sie
 * trägt die Bedeutung des Knotens (Sage-Protokol/docs/INTERFACES.md §11.9).
 *
 * ⚠ DIE BESCHREIBUNG IST KEINE ZIERDE. Modul 03 rechnet daraus den
 * Domänen-Vektor; das Wichtigste steht vorn (Name, Zweck, Protokoll).
 * ⚠ KEIN PREIS, KEIN SATZ, KEINE KUNDENDATEN — die Beschreibung geht in die
 * signierte Spore und damit ins Netz. Die Probe sucht danach.
 */
(function () {
  "use strict";
  window.SBKIM_SIEGEL_WIZ = {
    domain: "Angebot/Kalkulation/Werkzeug",
    endpoint: "https://lausiklauskn-png.github.io/Workflow-Calculate/",
    nodeType: "hybrid",
    nodeName: "Workflow Calculate",
    domainDescription: "Workflow Calculate ist ein Angebotsplaner für Digitaldruck, Stickerei, Lasergravur und Werbeartikel und ein eigener Knoten im SBKIM-Mycel. ZWECK: aus einer Anfrage ein Angebot machen — Material, Arbeitszeit, Maschine, Verpackung und Versand kalkulieren, mit Marktpreisen vergleichen, ein Kundenblatt drucken und den Auftrag an Mein WorkFloh, Tomys WorkFloh oder BookLedgerPro übergeben. Die Kalkulation bleibt intern; aufs Kundenblatt geht nur, was ausdrücklich dafür freigegeben ist. FORSCHUNG UND PROTOKOLL: Workflow Calculate gehört zum SBKIM-Protokoll (Semantisches Bidirektionales KI-Matching), der offenen Spezifikation aus dem Sage-Protokol; seine Module sind unverändert aus Sage übernommen. Er ist selbst ein Knoten: eigene signierte Spore, eigene Kennung, und mit dem Netz verbindet er sich nur auf ausdrücklichen Klick — öffentlich oder im eigenen Firmennetz. WAS ER TUT: eine Suche als Startseite (Produkt, Menge, Preis), Katalog mit Arbeitsgebieten und Vorlagen, Staffeln und Handelsware, Nachkalkulation gegen das Ist, Anfragen aus E-Mails lesen, verschlüsselte Sicherung. Läuft im Browser, auch offline; die Daten bleiben auf dem Gerät. WAS ER NICHT IST: keine Buchhaltung und kein Shop. FÜR WEN: für Werbetechnik-, Druck- und Stickerei-Betriebe, die Angebote schnell und nachvollziehbar rechnen wollen.",
    domainKeywords: ["SBKIM", "SBKIM-Protokoll", "Sage-Protokol", "Mycel", "Knoten", "Workflow Calculate", "Angebot", "Kalkulation", "Angebotsplaner", "Digitaldruck", "Stickerei", "Lasergravur", "Werbeartikel", "Werbetechnik", "Versand", "Marktvergleich", "Nachkalkulation", "WorkFloh", "BookLedgerPro", "offline", "Daten bleiben auf dem Gerät", "Werkzeug"],
    stammCategories: ["Angebot", "Kalkulation", "Werbetechnik"],
    guestCategories: ["Auftrag", "Rechnung", "Siegel"],
    backupPrefix: "workflow-calculate-backup",
  };
})();
