/* 10 Beispiel-Fragen für die Startseite (Klaus 2026-10-12: „Mache 10 verschiedene Fragen … 10 Produkte, 10 unterschiedliche
   Mengen … einzeln gelöscht werden können“ · „einmal komplett 10 verschiedene Beispiele durchspielen … für einen Nutzer, der
   das gern testen möchte oder der angelernt wird“).
   Jede Frage trifft eine Vorlage aus dem Katalog von Workflow Calculate (alle fünf Arbeitsgebiete). Fehlt das Gebiet im
   eigenen Katalog, holt ein Tipp es dazu (KAT.gebietHinzufuegen: nur Fehlendes, eigene Zahlen bleiben).
   `vorlage` und `menge` sind die ERWARTUNG — die Probe (tests/kern.mjs) liest jede Frage so, wie die App sie liest, und
   verlangt genau dieses Ergebnis. `lehre` ist der eine Satz fürs Anlernen. Namen sind erfunden.
   Klassisches Skript: WC.BEISPIEL_FRAGEN. */
(function (g) {
  "use strict";
  var WC = g.WC = g.WC || {};
  WC.BEISPIEL_FRAGEN = [
    { id: "f01", frage: "Der Kunde möchte 10 Tassen im Sublimationsdruck, beidseitig bedruckt, kein Sondermaß. Wie viel kostet das?", vorlage: "tasse", menge: 10, gebiet: "werbetechnik",
      lehre: "Füllwörter fallen weg; Menge und Produkt werden erkannt." },
    { id: "f02", frage: "Was kosten 250 Kugelschreiber mit Logo bedruckt?", vorlage: "kuli", menge: 250, gebiet: "werbetechnik",
      lehre: "Eigene Fertigung steht vor dem Zukauf, wenn beide passen." },
    { id: "f03", frage: "Kunde Becker wünscht 25 T-Shirts mit Vereinslogo", vorlage: "shirt", menge: 25, gebiet: "werbetechnik",
      lehre: "Der Name nach „Kunde“ wird nicht gesucht — steht er im Kundenstamm, zählt seine Klasse." },
    { id: "f04", frage: "5 Schilder aus Alu, 40 x 30 cm", vorlage: "schild", menge: 5, gebiet: "werbetechnik",
      lehre: "Maße in der Frage gehen in die Rechnung." },
    { id: "f05", frage: "Der Kunde wünscht 15 Poloshirts, Logo auf der Brust gestickt", vorlage: "polo_stick", menge: 15, gebiet: "stickerei",
      lehre: "Stickerei rechnet nach Stichzahl — die Vorgabe der Vorlage gilt, bis du sie änderst." },
    { id: "f06", frage: "Was kostet 1 Handtuch mit Namen bestickt?", vorlage: "handtuch_stick", menge: 1, gebiet: "stickerei",
      lehre: "Unter 10 Stück kommt der Kleinmengenzuschlag dazu." },
    { id: "f07", frage: "50 Sektgläser mit Namensgravur für eine Hochzeit", vorlage: "name_sektglas", menge: 50, gebiet: "laser",
      lehre: "Lasergravur: der Laser in der Werkstatt muss das Material können." },
    { id: "f08", frage: "Der Kunde möchte 1000 Visitenkarten, beidseitig", vorlage: "visitenkarten_zukauf", menge: 1000, gebiet: "handelsware",
      lehre: "Handelsware: Einkauf + Handlungskosten + Gewinn, ohne eigenen Versandposten." },
    { id: "f09", frage: "3 Stunden Gestaltung für ein neues Logo", vorlage: "gestaltung", menge: 3, gebiet: "dienstleistung",
      lehre: "Dienstleistung zählt in Stunden — kein Versand, kein Kleinmengenzuschlag." },
    { id: "f10", frage: "Was kosten 100 Aufnäher mit Vereinswappen?", vorlage: "aufnaeher", menge: 100, gebiet: "stickerei",
      lehre: "Menge ändern auf der Karte: der Preis rechnet sofort neu." },
  ];
})(typeof window !== "undefined" ? window : globalThis);
