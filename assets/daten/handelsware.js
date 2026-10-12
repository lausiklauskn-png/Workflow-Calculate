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
  /* name = intern (Katalog, Seite) · titel = was der Kunde liest — nie „Zukauf“, „Lohn…“ oder der Hersteller */
  function vorlage(id, name, beschr, einkauf, titel, herstellung) {
    return { id: id, gebiet: GB, name: name, titelVorgabe: titel, herstellung: herstellung || "", einkaufsprodukt: true, einkauf: einkauf, mengenregel: "stueck", einheitText: "Stk.", beschreibungVorgabe: beschr,
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
      vorlage("kuli_zukauf", "Kugelschreiber fertig bedruckt (Zukauf)", "Kugelschreiber, einfarbig mit Ihrem Logo bedruckt", [ek(500, 12000)],
        "Kugelschreiber mit Logo", "Tampondruck beim Hersteller"),
      vorlage("visitenkarten_zukauf", "Visitenkarten 85 × 55 mm, beidseitig (Zukauf)", "Visitenkarten 85 × 55 mm, beidseitig farbig", [ek(250, 2490), ek(500, 2990), ek(1000, 3990)],
        "Visitenkarten", "Digital- oder Offsetdruck, Online-Druckerei"),
      /* Weitere Verfahren, die fremd gefertigt werden (Klaus 2026-10-13: „fast alles möglich … Wir machen den Einkauf … dann den Aufschlag“).
         Technisch: Sublimation braucht polymerbeschichtete Ware; Prägung und Emaille brauchen ein Werkzeug (Klischee, Form) —
         darum dort keine Einzelstücke. Mengen und Preise: Platzhalter. */
      vorlage("tasse_sublimation_zukauf", "Tasse mit Namen, Sublimation (Zukauf)", "Keramiktasse, Name und Motiv vollfarbig, spülmaschinenfest", [ek(1, 1490), ek(10, 8990), ek(25, 18990)],
        "Tasse mit Namen", "Sublimationsdruck beim Hersteller (beschichtete Tasse)"),
      vorlage("kuli_uv_zukauf", "Kugelschreiber vollfarbig mit Namen, UV-Druck (Zukauf)", "Kugelschreiber, Name und Motiv vollfarbig bedruckt", [ek(1, 690), ek(25, 3490), ek(100, 9990)],
        "Kugelschreiber mit Namen, farbig", "UV-Digitaldruck beim Hersteller"),
      vorlage("anhaenger_acryl_uv_zukauf", "Acryl-Schlüsselanhänger mit Foto, UV-Druck (Zukauf)", "Acryl-Anhänger, Foto und Name vollfarbig, Kontur geschnitten", [ek(1, 890), ek(10, 4490), ek(50, 15990)],
        "Schlüsselanhänger mit Foto und Namen", "UV-Druck auf Acryl, Kontur gelasert, beim Hersteller"),
      vorlage("notizbuch_praegung_zukauf", "Notizbuch A5 mit Blindprägung (Zukauf)", "Notizbuch A5, Hardcover, Logo blindgeprägt", [ek(25, 22490), ek(50, 37990), ek(100, 64990)],
        "Notizbuch A5 mit Prägung", "Blindprägung beim Hersteller (Klischee je Motiv — keine Einzelstücke)"),
      vorlage("pin_emaille_zukauf", "Anstecker Emaille, Hartemaille (Zukauf)", "Anstecknadel Hartemaille, 25 mm, Motiv nach Vorlage", [ek(100, 24990), ek(250, 42990), ek(500, 69990)],
        "Anstecknadel Emaille", "Hartemaille beim Hersteller (Form je Motiv — keine Einzelstücke)"),
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
