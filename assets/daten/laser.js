/* Startkatalog Lasergravur (Klaus 2026-10-13: „Einzelstückanfertigung … nur ein Name draufsteht“ · „Laser in verschiedenen
   Stufen, in verschiedenen Stärken … wenn wir den Laser selber nicht haben, lassen wir die herstellen und verkaufen sie dann
   … mit den entsprechenden Aufschlägen“). ALLE Zahlen sind Platzhalter (platzhalter: true).

   Drei Laser-Stufen — welches Material welcher Laser kann, ist die technische Regel dieser Datei:
     Diodenlaser 10 W   Holz, Leder, Schiefer, eloxiertes Aluminium         — nicht: klares Glas, klares Acryl, blanker Edelstahl
     CO2-Laser 60 W     Holz, Glas, Acryl, Leder, Schiefer, eloxiertes Alu  — nicht: blanker Edelstahl (nur mit Markierspray, nicht eingeplant)
     Faserlaser 30 W    Edelstahl, blankes Metall, eloxiertes Alu, Schiefer — nicht: Holz, Glas, Acryl, Leder (eingeplant: nein)
   `vorhanden` sagt, ob das Gerät in der eigenen Werkstatt steht. ANNAHME bis Klaus' Wort: CO2 ja, Diode und Faser nein.
   Fehlt das Gerät, rechnet die Eigenfertigung nicht — die Vorlage nennt ihre Fremdfertigung (`fremdVorlage`): dasselbe
   Produkt als Einkaufsprodukt (Lohngravur), Einkauf + Aufschlag, auf der Seite „🛒 Handelsware“.
   Klassisches Skript: WC.STARTKATALOGE.laser. */
(function (g) {
  "use strict";
  var WC = g.WC = g.WC || {};
  var P = true, GB = "laser";
  function mat(id, name, ekCent, gewichtG) { return { id: id, gebiet: GB, name: name, einheit: "stueck", ekCent: ekCent, verschnittPct: 0, gewichtG: gewichtG, platzhalter: P }; }
  function verf(id, name, satz, leistung, vorhanden, notiz) {
    return { id: id, gebiet: GB, name: name, maschinensatzCent: satz, leistung: leistung, leistungEinheit: "stueck", ruestMin: 5, farbregel: "ein", jeFarbe: false,
      vorhanden: vorhanden, notiz: notiz, platzhalter: P };
  }
  /* Einrichten einmal je Auftrag (Datei mit den Namen, Fokus, Probestück), dann je Name: eintragen, einlegen, ausrichten, entnehmen */
  function schritte(minJeName) {
    return [{ id: "datei", name: "Datei mit den Namen, Fokus, Probestück", ruestMin: 10, minJeStueck: 0, minJeM2: 0 },
      { id: "name", name: "Je Name: eintragen, einlegen, ausrichten, entnehmen", ruestMin: 0, minJeStueck: minJeName, minJeM2: 0 }];
  }
  /* Lohngravur-Preise je Menge: Einrichten beim Hersteller + je Stück (Rohling + Gravur), inkl. Versand — Platzhalter */
  function lohnPreise(rohCent) {
    return [1, 10, 25, 50].map(function (m) { var c = 790 + m * (rohCent + 160) + 490; return { menge: m, gesamtCent: Math.ceil(c / 100) * 100 - 10, lieferant: "", url: "", datum: "", platzhalter: P }; });
  }
  var VORLAGEN = [], ZUKAUF = [];
  function produkt(id, name, kundenTitel, beschr, rohId, rohName, verfahren, minJeName, bild, extra) {
    var r = MAT[rohId];
    VORLAGEN.push(Object.assign({ id: id, gebiet: GB, name: name, titelVorgabe: kundenTitel, mengenregel: "stueck", einheitText: "Stk.", beschreibungVorgabe: beschr,
      staffelVorgabe: [1, 10, 25, 50], verfahrenWahl: verfahren, verfahrenVorgabe: verfahren[0], farbenMax: 1,
      slots: [{ id: "rohling", name: rohName, bezug: "stueck", wahl: [rohId], vorgabe: rohId }], schritte: schritte(minJeName),
      versandArt: "stueck", volumenJeStueckL: 0.2, laengeMm: 150, fremdVorlage: id + "_zukauf",
      markt: [], marktGrenzen: { online: 1, import: 500 }, verlauf: [],
      beispiele: [{ id: "b1", titel: "1 Stück mit Name „Anna“", menge: 1, ansichten: [["Ganz", "svg:" + bild], ["Detail Gravur", "svg:" + bild + "-detail"]] },
        { id: "b2", titel: "60 Stück, je Gast ein Name (Hochzeit)", menge: 60, ansichten: [["Ganz", "svg:" + bild], ["Detail Gravur", "svg:" + bild + "-detail"]] }] }, extra || {}));
    ZUKAUF.push({ id: id + "_zukauf", gebiet: GB, name: name + " — Lohngravur (Zukauf)", titelVorgabe: kundenTitel, einkaufsprodukt: true,
      herstellung: "Lasergravur beim Hersteller (" + verfahren.map(function (v) { return KURZ[v]; }).join(" / ") + ")", einkauf: lohnPreise(r.ekCent),
      mengenregel: "stueck", einheitText: "Stk.", beschreibungVorgabe: beschr, staffelVorgabe: [1, 10, 25, 50], verfahrenWahl: [], verfahrenVorgabe: "", farbenMax: 1,
      slots: [], schritte: [], versandArt: "keiner", markt: [], marktGrenzen: { online: 1, import: 500 }, verlauf: [], beispiele: [] });
  }
  var KURZ = { laser_diode: "Diodenlaser", laser_co2: "CO2-Laser", laser_faser: "Faserlaser" };
  var MATERIAL = [
    mat("roh_kuli_alu", "Kugelschreiber Aluminium eloxiert (Rohling)", 90, 15),
    mat("roh_kuli_edelstahl", "Kugelschreiber Edelstahl blank (Rohling)", 180, 25),
    mat("roh_karte_holz", "Geschenkkarte Birkensperrholz 85 × 55 × 2 mm", 60, 8),
    mat("roh_schiefer", "Schiefer-Untersetzer 10 × 10 cm", 150, 120),
    mat("roh_sektglas", "Sektglas (Rohling)", 250, 180),
    mat("roh_leder", "Schlüsselanhänger Echtleder", 120, 10),
    mat("roh_oeffner", "Flaschenöffner Edelstahl", 140, 40),
    mat("roh_acryl", "Tischkarte Acryl klar 3 mm, 100 × 50 mm", 80, 20),
  ];
  var MAT = {}; MATERIAL.forEach(function (m) { MAT[m.id] = m; });

  produkt("name_kuli_alu", "Kugelschreiber Alu mit Namen (Lasergravur)", "Kugelschreiber mit Namensgravur", "Aluminium-Kugelschreiber, Name graviert",
    "roh_kuli_alu", "Kugelschreiber", ["laser_co2", "laser_diode", "laser_faser"], 1.5, "laser-kuli");
  produkt("name_kuli_edelstahl", "Kugelschreiber Edelstahl mit Namen (Lasergravur)", "Edelstahl-Kugelschreiber mit Namensgravur", "Edelstahl-Kugelschreiber, Name graviert",
    "roh_kuli_edelstahl", "Kugelschreiber", ["laser_faser"], 1.5, "laser-kuli");
  produkt("name_karte_holz", "Geschenkkarte Holz mit Namen (Lasergravur)", "Geschenkkarte aus Holz mit Namen", "Holzkarte 85 × 55 mm, Name und Datum graviert",
    "roh_karte_holz", "Holzkarte", ["laser_co2", "laser_diode"], 2, "laser-karte");
  produkt("name_schiefer", "Schiefer-Untersetzer mit Namen (Lasergravur)", "Schiefer-Untersetzer mit Namen", "Schiefer 10 × 10 cm, Name graviert",
    "roh_schiefer", "Untersetzer", ["laser_co2", "laser_diode", "laser_faser"], 3, "laser-schiefer");
  produkt("name_sektglas", "Sektglas mit Namen (Lasergravur)", "Sektglas mit Namensgravur", "Sektglas, Name graviert",
    "roh_sektglas", "Glas", ["laser_co2"], 3, "laser-glas", { volumenJeStueckL: 1.2, laengeMm: 240 });
  produkt("name_leder", "Schlüsselanhänger Leder mit Namen (Lasergravur)", "Leder-Schlüsselanhänger mit Namen", "Echtleder, Name graviert",
    "roh_leder", "Anhänger", ["laser_co2", "laser_diode"], 1.5, "laser-leder");
  produkt("name_oeffner", "Flaschenöffner Edelstahl mit Namen (Lasergravur)", "Flaschenöffner mit Namensgravur", "Edelstahl-Flaschenöffner, Name graviert",
    "roh_oeffner", "Flaschenöffner", ["laser_faser"], 1.5, "laser-oeffner");
  produkt("name_acryl", "Tischkarte Acryl mit Namen (Lasergravur)", "Tischkarte aus Acryl mit Namen", "Acryl klar, Name graviert, Kontur geschnitten",
    "roh_acryl", "Tischkarte", ["laser_co2"], 3, "laser-acryl");

  WC.STARTKATALOGE = WC.STARTKATALOGE || {};
  WC.STARTKATALOGE[GB] = {
    name: "Lasergravur", beschreibung: "Einzelstücke mit Namen: Kuli, Holzkarte, Schiefer, Glas, Leder, Flaschenöffner, Acryl — drei Laser-Stufen, sonst Lohngravur (Zukauf).",
    gebiete: [{ id: GB, name: "Lasergravur", platzhalter: P,
      saetze: { modus: "einfach", stundensatzCent: 6000, lohnCent: 2400, materialzuschlagPct: 15, gkPct: 15, mgkPct: 10, fgkPct: 120,
        vwgkPct: 10, vtgkPct: 5, gewinnPct: 20, skontoPct: 0, provisionPct: 0, rabattPct: 0, handlungskostenPct: 25, ustSatz: 19 },
      klassen: { A: { name: "A-Kunde — bestellt häufig und viel", stundenPct: 0, gewinnPct: -5 }, B: { name: "B-Kunde — mittel", stundenPct: 0, gewinnPct: 0 },
        C: { name: "C-Kunde — einmalig", stundenPct: 15, gewinnPct: 10 } } }],
    materialien: MATERIAL,
    verfahren: [
      verf("laser_co2", "CO2-Laser 60 W", 1500, 40, true, "Holz, Glas, Acryl, Leder, Schiefer, Alu eloxiert. Annahme: in der Werkstatt."),
      verf("laser_diode", "Diodenlaser 10 W", 600, 25, false, "Holz, Leder, Schiefer, Alu eloxiert — kein klares Glas, kein klares Acryl, kein blanker Edelstahl."),
      verf("laser_faser", "Faserlaser 30 W", 1200, 60, false, "Edelstahl, blankes Metall, Alu eloxiert, Schiefer — kein Holz, Glas, Acryl, Leder."),
    ],
    vorlagen: VORLAGEN.concat(ZUKAUF),
    verpackungen: [], versand: [],
  };
})(typeof window !== "undefined" ? window : globalThis);
