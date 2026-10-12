/* Startkatalog Montage & Dienstleistung (Stufe 3) — ALLE Zahlen sind Platzhalter (platzhalter: true).
   Für Angebote ohne Ware: Arbeit nach Stunden, Gestaltung, Anfahrt, Montage vor Ort. Die Menge ist hier
   „Std.“ oder „km“ (einheitText der Vorlage) — so steht es auch auf dem Kundenblatt.
   Klassisches Skript: WC.STARTKATALOGE.dienstleistung. */
(function (g) {
  "use strict";
  var WC = g.WC = g.WC || {};
  var P = true, GB = "dienstleistung";
  function schritt(id, name, ruest, jeStueck) { return { id: id, name: name, ruestMin: ruest || 0, minJeStueck: jeStueck || 0, minJeM2: 0 }; }
  function vorlage(id, name, einheit, beschr, staffel, extra) {
    return Object.assign({ id: id, gebiet: GB, name: name, mengenregel: "stueck", einheitText: einheit, beschreibungVorgabe: beschr, staffelVorgabe: staffel,
      verfahrenWahl: [], verfahrenVorgabe: "", farbenMax: 1, slots: [], schritte: [], versandArt: "keiner", markt: [], marktGrenzen: { online: 1000, import: 1000 }, verlauf: [], beispiele: [] }, extra || {});
  }
  WC.STARTKATALOGE = WC.STARTKATALOGE || {};
  WC.STARTKATALOGE[GB] = {
    name: "Montage & Dienstleistung", beschreibung: "Arbeit nach Stunden, Gestaltung, Anfahrt, Montage vor Ort — ohne Ware.",
    gebiete: [{ id: GB, name: "Montage & Dienstleistung", platzhalter: P,
      saetze: { modus: "einfach", stundensatzCent: 6500, lohnCent: 2500, materialzuschlagPct: 15, gkPct: 10, mgkPct: 10, fgkPct: 100,
        vwgkPct: 10, vtgkPct: 0, gewinnPct: 15, skontoPct: 0, provisionPct: 0, rabattPct: 0, handlungskostenPct: 25, ustSatz: 19 },
      klassen: { A: { name: "A-Kunde — bestellt häufig und viel", stundenPct: 0, gewinnPct: -5 }, B: { name: "B-Kunde — mittel", stundenPct: 0, gewinnPct: 0 },
        C: { name: "C-Kunde — einmalig", stundenPct: 15, gewinnPct: 10 } } }],
    materialien: [
      { id: "kleinmaterial", gebiet: GB, name: "Kleinmaterial (Dübel, Schrauben, Abstandshalter)", einheit: "stueck", ekCent: 400, verschnittPct: 0, gewichtG: 0, platzhalter: P },
      { id: "fahrzeug_km", gebiet: GB, name: "Fahrzeugkosten je km", einheit: "stueck", ekCent: 30, verschnittPct: 0, gewichtG: 0, platzhalter: P },
    ],
    verfahren: [],
    vorlagen: [
      vorlage("arbeit_std", "Arbeit nach Stunden (Service, Reparatur)", "Std.", "Arbeitszeit nach Aufwand", [1, 2, 4], {
        schritte: [schritt("arbeit", "Arbeitszeit", 0, 60)],
        beispiele: [{ id: "b1", titel: "4 Stunden Service vor Ort", menge: 4, ansichten: [["Zeit", "svg:uhr-4"], ["Werkzeug", "svg:koffer"]] }] }),
      vorlage("gestaltung", "Gestaltung / Grafik (Stunden)", "Std.", "Entwurf und Reinzeichnung", [1, 2, 3], {
        schritte: [schritt("gestalten", "Gestalten", 0, 60)],
        beispiele: [{ id: "b1", titel: "3 Stunden Logo-Entwurf, 3 Vorschläge", menge: 3, ansichten: [["Entwürfe", "svg:entwurf-3"], ["Zeit", "svg:uhr-3"]] }] }),
      vorlage("anfahrt", "Anfahrt (km, hin und zurück)", "km", "Anfahrt zum Einsatzort", [20, 60, 100], {
        slots: [{ id: "fahrzeug", name: "Fahrzeug", bezug: "stueck", wahl: ["fahrzeug_km"], vorgabe: "fahrzeug_km" }],
        schritte: [schritt("fahrzeit", "Fahrzeit (1 min je km)", 0, 1)],
        beispiele: [{ id: "b1", titel: "60 km Anfahrt", menge: 60, ansichten: [["Strecke", "svg:karte-60"], ["Fahrzeug", "svg:auto"]] }] }),
      vorlage("montage_schild", "Schild montieren vor Ort", "Stk.", "Montage inkl. Befestigungsmaterial", [1, 2, 4], {
        slots: [{ id: "klein", name: "Befestigung", bezug: "stueck", wahl: ["kleinmaterial"], vorgabe: "kleinmaterial" }],
        schritte: [schritt("vorbereiten", "Einrichten vor Ort", 20), schritt("montieren", "Montieren je Schild", 0, 30)],
        beispiele: [{ id: "b1", titel: "2 Schilder an der Fassade montieren", menge: 2, ansichten: [["Wand", "svg:montage-wand"], ["Befestigung", "svg:montage-detail"]] }] }),
    ],
    verpackungen: [], versand: [],
  };
})(typeof window !== "undefined" ? window : globalThis);
