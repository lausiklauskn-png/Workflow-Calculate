/* Startkatalog Stickerei (Stufe 3) — ALLE Zahlen sind Platzhalter (platzhalter: true).
   Gerechnet wird nach Stichzahl: Garn und Vlies je Tausend Stiche, Maschinenzeit aus Tausend Stichen je Stunde.
   Farben: je Garnfarbe ein Einrichten (Rüsten), die Maschinenzeit hängt an der Stichzahl, nicht an den Farben.
   Wortschatz aus Tomys-Hub (Stickerei). Klassisches Skript: WC.STARTKATALOGE.stickerei. */
(function (g) {
  "use strict";
  var WC = g.WC = g.WC || {};
  var P = true, GB = "stickerei";
  function mat(id, name, einheit, ekCent, extra) { return Object.assign({ id: id, gebiet: GB, name: name, einheit: einheit, ekCent: ekCent, verschnittPct: 0, gewichtG: 0, platzhalter: P }, extra || {}); }
  function schritt(id, name, ruest, jeStueck, extra) { return Object.assign({ id: id, name: name, ruestMin: ruest || 0, minJeStueck: jeStueck || 0, minJeM2: 0 }, extra || {}); }
  var GARN = { id: "garn", name: "Garn & Stickvlies", bezug: "stiche", wahl: ["garn_vlies"], vorgabe: "garn_vlies" };
  var SCHRITTE = [schritt("punchen", "Stickdatei erstellen (Punchen)", 45), schritt("farben", "Garnfarbe einrichten (je Farbe)", 3, 0, { jeFarbe: true }),
    schritt("einspannen", "Einspannen / Ausspannen", 0, 1.5), schritt("versaeubern", "Fäden schneiden, Vlies entfernen", 0, 1)];
  function vorlage(id, name, beschr, rohling, stiche, staffel, extra) {
    return Object.assign({ id: id, gebiet: GB, name: name, mengenregel: "stueck", stiche: true, sticheVorgabe: stiche, einheitText: "Stk.",
      beschreibungVorgabe: beschr, breiteVorgabe: 90, hoeheVorgabe: 60, staffelVorgabe: staffel,
      verfahrenWahl: ["stick"], verfahrenVorgabe: "stick", farbenMax: 8,
      slots: [rohling, GARN], schritte: JSON.parse(JSON.stringify(SCHRITTE)),
      versandArt: "stueck", volumenJeStueckL: 0.8, laengeMm: 300, markt: [], marktGrenzen: { online: 25, import: 500 }, verlauf: [], beispiele: [] }, extra || {});
  }

  WC.STARTKATALOGE = WC.STARTKATALOGE || {};
  WC.STARTKATALOGE[GB] = {
    name: "Stickerei", beschreibung: "Textilien besticken: Polo, Cap, Handtuch, Aufnäher — gerechnet nach Stichzahl.",
    gebiete: [{ id: GB, name: "Stickerei", platzhalter: P,
      saetze: { modus: "einfach", stundensatzCent: 6000, lohnCent: 2400, materialzuschlagPct: 15, gkPct: 15, mgkPct: 10, fgkPct: 120,
        vwgkPct: 10, vtgkPct: 5, gewinnPct: 20, skontoPct: 0, provisionPct: 0, rabattPct: 0, handlungskostenPct: 25, ustSatz: 19 },
      klassen: { A: { name: "A-Kunde — bestellt häufig und viel", stundenPct: 0, gewinnPct: -5 }, B: { name: "B-Kunde — mittel", stundenPct: 0, gewinnPct: 0 },
        C: { name: "C-Kunde — einmalig", stundenPct: 15, gewinnPct: 10 } } }],
    materialien: [
      mat("garn_vlies", "Garn & Stickvlies (je 1000 Stiche)", "tsd_stiche", 8),
      mat("polo_std", "Poloshirt (Rohling)", "stueck", 900, { gewichtG: 220 }),
      mat("cap_std", "Baseball-Cap (Rohling)", "stueck", 450, { gewichtG: 90 }),
      mat("handtuch_std", "Handtuch 50 × 100 (Rohling)", "stueck", 600, { gewichtG: 350 }),
      mat("twill", "Twill-Stoff für Aufnäher", "stueck", 30, { gewichtG: 5 }),
    ],
    verfahren: [
      { id: "stick", gebiet: GB, name: "Stickmaschine (1 Kopf)", maschinensatzCent: 2000, leistung: 40, leistungEinheit: "tsd_stiche", ruestMin: 10,
        farbregel: "je_farbe", jeFarbe: false, platzhalter: P },
    ],
    vorlagen: [
      vorlage("polo_stick", "Poloshirt besticken (Brust)", "Poloshirt mit Brust-Stick", { id: "polo", name: "Poloshirt", bezug: "stueck", wahl: ["polo_std"], vorgabe: "polo_std" }, 6000, [10, 25, 50], {
        beispiele: [{ id: "b1", titel: "20 Polos, Logo 2-farbig, 6000 Stiche", menge: 20, breiteMm: 90, hoeheMm: 60, farben: 2, stiche: 6000, ansichten: [["Vorne", "svg:polo-vorne"], ["Detail Stick", "svg:polo-detail"]] },
          { id: "b2", titel: "20 Polos, Logo 4-farbig, 9000 Stiche", menge: 20, breiteMm: 90, hoeheMm: 60, farben: 4, stiche: 9000, ansichten: [["Vorne", "svg:polo-vorne-4"], ["Detail Stick", "svg:polo-detail-4"]] }] }),
      vorlage("cap_stick", "Cap besticken (Front)", "Cap mit Front-Stick", { id: "cap", name: "Cap", bezug: "stueck", wahl: ["cap_std"], vorgabe: "cap_std" }, 5000, [10, 25, 50], {
        versandArt: "stueck", volumenJeStueckL: 2,
        beispiele: [{ id: "b1", titel: "25 Caps, Logo 2-farbig, 5000 Stiche", menge: 25, breiteMm: 90, hoeheMm: 50, farben: 2, stiche: 5000, ansichten: [["Vorne", "svg:cap-vorne"], ["Seite", "svg:cap-seite"]] }] }),
      vorlage("handtuch_stick", "Handtuch besticken (Name)", "Handtuch mit gesticktem Namen", { id: "handtuch", name: "Handtuch", bezug: "stueck", wahl: ["handtuch_std"], vorgabe: "handtuch_std" }, 3000, [1, 5, 10], {
        volumenJeStueckL: 1.5,
        beispiele: [{ id: "b1", titel: "1 Handtuch mit Name, 3000 Stiche", menge: 1, breiteMm: 120, hoeheMm: 40, farben: 1, stiche: 3000, ansichten: [["Ganz", "svg:handtuch-ganz"], ["Detail Name", "svg:handtuch-detail"]] }] }),
      vorlage("aufnaeher", "Aufnäher / Patch", "Gestickter Aufnäher mit Bügelkleber", { id: "twill", name: "Trägerstoff", bezug: "stueck", wahl: ["twill"], vorgabe: "twill" }, 8000, [50, 100, 250], {
        volumenJeStueckL: 0.02, laengeMm: 100,
        beispiele: [{ id: "b1", titel: "100 Aufnäher 8 × 6 cm, 3-farbig", menge: 100, breiteMm: 80, hoeheMm: 60, farben: 3, stiche: 8000, ansichten: [["Vorne", "svg:patch-vorne"], ["Rückseite", "svg:patch-rueck"]] }] }),
    ],
    verpackungen: [], versand: [],
  };
})(typeof window !== "undefined" ? window : globalThis);
