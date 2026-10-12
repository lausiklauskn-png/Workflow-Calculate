/* Startkatalog Handelsware (Klaus 2026-10-13) — Produkte, die NICHT selbst gefertigt, sondern fertig eingekauft und mit
   Aufschlag weiterverkauft werden. Einkauf als Komplettpreis je Menge INKL. Versand (`einkauf`), keine Maschinenzeit.
   ⚠ ALLE Preise sind Platzhalter (platzhalter: true) — keine Lieferantenpreise. Ein Lieferant ist nicht eingetragen:
   eingetragen wird nur, was geprüft ist (s. WC.LIEFERANTEN_VORSCHLAEGE unten).
   Klassisches Skript: WC.STARTKATALOGE.handelsware · WC.LIEFERANTEN_VORSCHLAEGE. */
(function (g) {
  "use strict";
  var WC = g.WC = g.WC || {};
  var P = true, GB = "handelsware";
  function ek(menge, cent) { return { menge: menge, gesamtCent: cent, lieferant: "", url: "", datum: "", platzhalter: P }; }
  function vorlage(id, name, beschr, einkauf) {
    return { id: id, gebiet: GB, name: name, einkaufsprodukt: true, einkauf: einkauf, mengenregel: "stueck", einheitText: "Stk.", beschreibungVorgabe: beschr,
      staffelVorgabe: einkauf.map(function (e) { return e.menge; }), verfahrenWahl: [], verfahrenVorgabe: "", farbenMax: 1, slots: [], schritte: [],
      versandArt: "keiner", markt: [], marktGrenzen: { online: 1, import: 500 }, verlauf: [], beispiele: [], platzhalter: P };
  }
  WC.STARTKATALOGE = WC.STARTKATALOGE || {};
  WC.STARTKATALOGE[GB] = {
    name: "Handelsware", beschreibung: "Fertig eingekauft, mit Aufschlag weiterverkauft — Kugelschreiber, Visitenkarten. Einkauf und Verkauf komplett inkl. Versand.",
    gebiete: [{ id: GB, name: "Handelsware", platzhalter: P,
      /* Nur Handlungskosten, Gewinn und USt wirken hier — Stundensatz und Zuschläge der Fertigung kommen nicht vor */
      saetze: { modus: "einfach", stundensatzCent: 6500, lohnCent: 2500, materialzuschlagPct: 0, gkPct: 0, mgkPct: 0, fgkPct: 0,
        vwgkPct: 0, vtgkPct: 0, gewinnPct: 20, skontoPct: 0, provisionPct: 0, rabattPct: 0, handlungskostenPct: 25, ustSatz: 19 },
      klassen: { A: { name: "A-Kunde — bestellt häufig und viel", stundenPct: 0, gewinnPct: -5 }, B: { name: "B-Kunde — mittel", stundenPct: 0, gewinnPct: 0 },
        C: { name: "C-Kunde — einmalig", stundenPct: 0, gewinnPct: 10 } } }],
    materialien: [], verfahren: [],
    vorlagen: [
      vorlage("kuli_zukauf", "Kugelschreiber fertig bedruckt (Zukauf)", "Kugelschreiber, einfarbig mit Ihrem Logo bedruckt", [ek(500, 12000)]),
      vorlage("visitenkarten_zukauf", "Visitenkarten 85 × 55 mm, beidseitig (Zukauf)", "Visitenkarten 85 × 55 mm, beidseitig farbig", [ek(250, 2490), ek(500, 2990), ek(1000, 3990)]),
    ],
    verpackungen: [], versand: [],
    lieferanten: [],
  };

  /* Vorschläge — NICHT eingetragen. Die Adressen sind in der Sitzung vom 2026-10-12 per Websuche gefunden (die Seiten
     selbst waren aus dem Behälter nicht abrufbar). Erst wer sie öffnet und „✓ geprüft“ tippt, übernimmt sie in die eigene
     Liste — mit dem Datum dieses Tipps. Was die Suche nicht zeigte, steht als „nicht gefunden“ da, nie geraten. */
  WC.LIEFERANTEN_VORSCHLAEGE = [
    { id: "pf_concept", name: "PF Concept", url: "https://www.pfconcept.com/de_de/", fuer: "wiederverkaeufer", anmeldung: true,
      notiz: "Werbeartikel-Großhandel (Polyconcept, Niederlande), liefert über Wiederverkäufer. Konditionen und Anmeldung: nicht gefunden." },
    { id: "midocean", name: "Solo midocean", url: "https://www.midocean.com/germany/de/eur/", fuer: "wiederverkaeufer", anmeldung: true,
      notiz: "Werbeartikel-Importeur, beliefert Händler (nicht Endkunden), Büro Koblenz für DE/AT/CH. Anmeldebedingungen: nicht gefunden." },
    { id: "inspirion", name: "Inspirion", url: "https://www.inspirion.eu/de/", fuer: "wiederverkaeufer", anmeldung: true,
      notiz: "Werbeartikel-Großhandel und Importeur, nur B2B. Konditionen: nicht gefunden." },
    { id: "wirmachendruck", name: "WIRmachenDRUCK", url: "https://www.wir-machen-druck.de/", fuer: "beides", anmeldung: false,
      notiz: "Online-Druckerei, Visitenkarten im offenen Shop. Wiederverkäufer-Programm: https://www.wir-machen-druck.de/wiederverkaeufer.html (Konditionen nicht gefunden)." },
    { id: "flyeralarm", name: "FLYERALARM", url: "https://www.flyeralarm.com/de/", fuer: "beides", anmeldung: false,
      notiz: "Online-Druckerei, Visitenkarten im offenen Shop. Reseller-Programm „FLYERALARM PRO“ nur auf der Schweizer Seite gesehen — für DE nicht bestätigt." },
    { id: "saxoprint", name: "SAXOPRINT", url: "https://www.saxoprint.de/", fuer: "beides", anmeldung: false,
      notiz: "Online-Druckerei, Visitenkarten 50–50.000 Stk. Reseller-Seite: https://www.saxoprint.de/ueber-uns/unternehmen/vorteile/reseller (neutraler Versand an Endkunden)." },
    { id: "onlineprinters", name: "Onlineprinters", url: "https://www.onlineprinters.de/", fuer: "privat", anmeldung: false,
      notiz: "Online-Druckerei, Visitenkarten im offenen Shop. Ein Wiederverkäufer-Programm wurde nicht gefunden." },
  ];
})(typeof window !== "undefined" ? window : globalThis);
