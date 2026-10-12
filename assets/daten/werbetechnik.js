/* Startkatalog Werbetechnik — ALLE Zahlen sind Platzhalter (platzhalter: true), keine Lieferanten-
   oder Tarifpreise. Die App sagt das, bis eigene Zahlen eingetragen sind; wer einen Wert ändert,
   nimmt die Marke weg. Wortschatz aus Tomys-Hub (tomy-data/angebot-katalog.js, produkte.js) und
   Mein-WorkFloh (Laminate, Verbrauch lfm/m²). Beispielbilder: assets/daten/bilder.js (Zeichnungen).
   Klassisches Skript: window.WC.START bzw. globalThis.WC.START. */
(function (g) {
  "use strict";
  var WC = g.WC = g.WC || {};
  var P = true;
  function mat(id, name, einheit, ekCent, extra) { return Object.assign({ id: id, gebiet: "werbetechnik", name: name, einheit: einheit, ekCent: ekCent, verschnittPct: 0, gewichtG: 0, platzhalter: P }, extra || {}); }
  function verf(id, name, satz, leistung, einheit, ruest, farbregel, jeFarbe) {
    return { id: id, gebiet: "werbetechnik", name: name, maschinensatzCent: satz, leistung: leistung, leistungEinheit: einheit, ruestMin: ruest, farbregel: farbregel, jeFarbe: !!jeFarbe, platzhalter: P };
  }
  function schritt(id, name, ruest, jeStueck, jeM2, extra) { return Object.assign({ id: id, name: name, ruestMin: ruest || 0, minJeStueck: jeStueck || 0, minJeM2: jeM2 || 0 }, extra || {}); }

  WC.START = {
    gebiete: [{
      id: "werbetechnik", name: "Werbetechnik", platzhalter: P,
      saetze: { modus: "einfach", stundensatzCent: 6500, lohnCent: 2500, materialzuschlagPct: 15, gkPct: 15, mgkPct: 10, fgkPct: 120,
        vwgkPct: 10, vtgkPct: 5, gewinnPct: 20, skontoPct: 0, provisionPct: 0, rabattPct: 0, handlungskostenPct: 25, ustSatz: 19 },
      klassen: {
        A: { name: "A-Kunde — bestellt häufig und viel", stundenPct: 0, gewinnPct: -5 },
        B: { name: "B-Kunde — mittel", stundenPct: 0, gewinnPct: 0 },
        C: { name: "C-Kunde — einmalig", stundenPct: 15, gewinnPct: 10 },
      },
    }],
    materialien: [
      mat("folie_monomer", "Digitaldruckfolie monomer weiß", "m2", 450, { rollenbreiteMm: 1370, verschnittPct: 10, gewichtG: 180 }),
      mat("folie_polymer", "Digitaldruckfolie polymer weiß", "m2", 750, { rollenbreiteMm: 1370, verschnittPct: 10, gewichtG: 180 }),
      mat("folie_cast", "Car-Wrap-Folie gegossen (cast)", "m2", 1600, { rollenbreiteMm: 1520, verschnittPct: 15, gewichtG: 200 }),
      mat("lam_glanz", "Laminat glänzend", "m2", 300, { rollenbreiteMm: 1370, verschnittPct: 10, gewichtG: 90 }),
      mat("lam_matt", "Laminat matt", "m2", 300, { rollenbreiteMm: 1370, verschnittPct: 10, gewichtG: 90 }),
      mat("lam_3d", "Laminat 3D-Struktur", "m2", 800, { rollenbreiteMm: 1370, verschnittPct: 10, gewichtG: 120 }),
      mat("lam_cast", "Laminat gegossen (für Car-Wrap)", "m2", 900, { rollenbreiteMm: 1520, verschnittPct: 15, gewichtG: 100 }),
      mat("platte_alu", "Alu-Verbundplatte 3 mm (3050 × 1500)", "platte", 4500, { platteBMm: 3050, platteHMm: 1500, verschnittPct: 0, gewichtG: 17400 }),
      mat("platte_pvc", "PVC-Hartschaum 5 mm (3050 × 2030)", "platte", 3200, { platteBMm: 3050, platteHMm: 2030, verschnittPct: 0, gewichtG: 15500 }),
      mat("plott_std", "Plotterfolie einfarbig (Standard)", "m2", 350, { rollenbreiteMm: 630, verschnittPct: 15, gewichtG: 100 }),
      mat("flexfolie", "Flexfolie Textil (je Farbe)", "m2", 1800, { rollenbreiteMm: 500, verschnittPct: 20, gewichtG: 150 }),
      mat("dtf_folie", "Digitaltransfer-Folie DTF (vierfarbig)", "m2", 2500, { rollenbreiteMm: 600, verschnittPct: 15, gewichtG: 120 }),
      mat("subli_papier", "Sublimationspapier", "m2", 120, { rollenbreiteMm: 610, verschnittPct: 15, gewichtG: 100 }),
      mat("tasse_11", "Tasse weiß 11 oz (Rohling)", "stueck", 180, { gewichtG: 350 }),
      mat("tasse_15", "Tasse weiß 15 oz (Rohling)", "stueck", 260, { gewichtG: 450 }),
      mat("kuli", "Kugelschreiber Kunststoff (Rohling)", "stueck", 25, { gewichtG: 10 }),
      mat("shirt_std", "T-Shirt Baumwolle (Rohling)", "stueck", 280, { gewichtG: 180 }),
      mat("shirt_premium", "T-Shirt Premium (Rohling)", "stueck", 550, { gewichtG: 200 }),
    ],
    verfahren: [
      verf("rollendruck", "Rollendruck (Eco-Solvent/Latex)", 2500, 12, "m2", 10, "digital"),
      verf("plattendruck", "Plattendruck UV-Flachbett", 4500, 15, "m2", 15, "digital"),
      verf("plotten", "Plotten (Schneideplotter, je Farbe)", 1500, 20, "m2", 5, "je_farbe", true),
      verf("flex", "Flex-Folientransfer (je Farbe)", 1000, 60, "stueck", 5, "je_farbe", true),
      verf("dtf", "Digitaltransfer DTF (vierfarbig)", 2000, 50, "stueck", 10, "digital"),
      verf("subli", "Sublimation (Tassenpresse)", 800, 30, "stueck", 10, "digital"),
      verf("tampon", "Tampondruck (je Farbe)", 2500, 400, "stueck", 30, "je_farbe", true),
      verf("laser", "Lasergravur (einfarbig)", 3000, 120, "stueck", 10, "ein"),
    ],
    vorlagen: [
      { id: "digi_folie", gebiet: "werbetechnik", name: "Digitaldruck auf Folie (Aufkleber, Banner-Folie)", mengenregel: "rolle", abstandMm: 5,
        beschreibungVorgabe: "Digitaldruck auf Folie, konturgeschnitten", breiteVorgabe: 500, hoeheVorgabe: 300, staffelVorgabe: [1, 5, 10],
        verfahrenWahl: ["rollendruck"], verfahrenVorgabe: "rollendruck", farbenMax: 1,
        slots: [
          { id: "folie", name: "Druckfolie", bezug: "regel", wahl: ["folie_monomer", "folie_polymer", "folie_cast"], vorgabe: "folie_monomer" },
          { id: "laminat", name: "Laminat", bezug: "regel", optional: true, wahl: ["lam_glanz", "lam_matt", "lam_3d"], vorgabe: "lam_glanz" },
        ],
        schritte: [schritt("daten", "Daten prüfen / anlegen", 15), schritt("laminieren", "Laminieren", 5, 0, 4, { nurMitSlot: "laminat" }),
          schritt("schneiden", "Konturschnitt", 5, 0, 3), schritt("entgittern", "Entgittern", 0, 0, 6)],
        versandArt: "rolle", dickeMm: 0.3, markt: [], marktGrenzen: { online: 10, import: 1000 }, verlauf: [],
        beispiele: [
          { id: "b1", titel: "5 Aufkleber 50 × 30 cm, glänzend laminiert", menge: 5, breiteMm: 500, hoeheMm: 300, ansichten: [["Bogen", "svg:folie-bogen"], ["Detail Laminat", "svg:folie-detail"]] },
        ] },
      { id: "schild", gebiet: "werbetechnik", name: "Schild / Plattendruck", mengenregel: "platte", abstandMm: 4,
        beschreibungVorgabe: "Direktdruck auf Platte, zugeschnitten", breiteVorgabe: 600, hoeheVorgabe: 400, staffelVorgabe: [1, 2, 5],
        verfahrenWahl: ["plattendruck"], verfahrenVorgabe: "plattendruck", farbenMax: 1,
        slots: [{ id: "platte", name: "Platte", bezug: "regel", wahl: ["platte_alu", "platte_pvc"], vorgabe: "platte_alu" }],
        schritte: [schritt("daten", "Daten prüfen / anlegen", 15), schritt("zuschnitt", "Zuschnitt", 10, 3), schritt("kanten", "Kanten / Bohren", 0, 2)],
        versandArt: "flach", dickeMm: 3, markt: [], marktGrenzen: { online: 5, import: 500 }, verlauf: [],
        beispiele: [{ id: "b1", titel: "Firmenschild 60 × 40 cm, Alu-Verbund", menge: 1, breiteMm: 600, hoeheMm: 400, ansichten: [["Vorne", "svg:schild-vorne"], ["Seite (3 mm)", "svg:schild-seite"]] }] },
      { id: "tasse", gebiet: "werbetechnik", name: "Tasse bedrucken (Sublimation)", mengenregel: "stueck",
        beschreibungVorgabe: "Tasse weiß, rundum bedruckt", breiteVorgabe: 200, hoeheVorgabe: 90, staffelVorgabe: [10, 50, 100],
        verfahrenWahl: ["subli"], verfahrenVorgabe: "subli", farbenMax: 1,
        slots: [
          { id: "tasse", name: "Tasse", bezug: "stueck", wahl: ["tasse_11", "tasse_15"], vorgabe: "tasse_11" },
          { id: "papier", name: "Transferpapier", bezug: "flaeche", wahl: ["subli_papier"], vorgabe: "subli_papier" },
        ],
        schritte: [schritt("daten", "Daten / Motiv anlegen", 15), schritt("vorbereiten", "Druck, Zuschnitt, Einlegen", 10, 1.5), schritt("verpacken", "Einzeln verpacken", 0, 0.5)],
        versandArt: "stueck", volumenJeStueckL: 1.2, laengeMm: 150, markt: [], marktGrenzen: { online: 10, import: 300 }, verlauf: [],
        beispiele: [
          { id: "b1", titel: "50 Tassen mit Firmenlogo, rundum", menge: 50, breiteMm: 200, hoeheMm: 90, ansichten: [["Vorne", "svg:tasse-vorne"], ["Seite", "svg:tasse-seite"], ["Abwicklung 200 × 90 mm", "svg:tasse-abwicklung"]] },
        ] },
      { id: "kuli", gebiet: "werbetechnik", name: "Kugelschreiber bedrucken", mengenregel: "stueck",
        beschreibungVorgabe: "Kugelschreiber mit Werbeanbringung", breiteVorgabe: 40, hoeheVorgabe: 8, staffelVorgabe: [100, 250, 500],
        verfahrenWahl: ["tampon", "laser"], verfahrenVorgabe: "tampon", farbenMax: 4,
        slots: [{ id: "kuli", name: "Kugelschreiber", bezug: "stueck", wahl: ["kuli"], vorgabe: "kuli" }],
        schritte: [schritt("daten", "Daten anlegen", 15), schritt("klischee", "Klischee / Einrichten je Farbe", 20, 0, 0, { jeFarbe: true, nurBei: ["tampon"] }),
          schritt("einlegen", "Einlegen / Entnehmen", 0, 0.2)],
        versandArt: "stueck", volumenJeStueckL: 0.05, laengeMm: 150, markt: [], marktGrenzen: { online: 100, import: 500 }, verlauf: [],
        beispiele: [{ id: "b1", titel: "250 Kulis, 1-farbig Tampondruck", menge: 250, breiteMm: 40, hoeheMm: 8, farben: 1, verfahren: "tampon", ansichten: [["Gesamt", "svg:kuli-gesamt"], ["Druckfeld 40 × 8 mm", "svg:kuli-detail"]] },
          { id: "b2", titel: "250 Kulis, 3-farbig Tampondruck", menge: 250, breiteMm: 40, hoeheMm: 8, farben: 3, verfahren: "tampon", ansichten: [["Gesamt", "svg:kuli-gesamt-3"], ["Druckfeld", "svg:kuli-detail-3"]] }] },
      { id: "shirt", gebiet: "werbetechnik", name: "T-Shirt Transferdruck", mengenregel: "stueck",
        beschreibungVorgabe: "T-Shirt mit Brustdruck", breiteVorgabe: 250, hoeheVorgabe: 300, staffelVorgabe: [10, 25, 50],
        verfahrenWahl: ["flex", "dtf"], verfahrenVorgabe: "flex", farbenMax: 4,
        slots: [
          { id: "shirt", name: "T-Shirt", bezug: "stueck", wahl: ["shirt_std", "shirt_premium"], vorgabe: "shirt_std" },
          { id: "flex", name: "Flexfolie", bezug: "flaeche", jeFarbe: true, nurBei: ["flex"], wahl: ["flexfolie"], vorgabe: "flexfolie" },
          { id: "dtf", name: "DTF-Folie", bezug: "flaeche", nurBei: ["dtf"], wahl: ["dtf_folie"], vorgabe: "dtf_folie" },
        ],
        schritte: [schritt("daten", "Daten anlegen", 15), schritt("plotten", "Plotten je Farbe", 5, 0.5, 0, { jeFarbe: true, nurBei: ["flex"] }),
          schritt("entgittern", "Entgittern je Farbe", 0, 2, 0, { jeFarbe: true, nurBei: ["flex"] }),
          schritt("pressen", "Pressen (je Farbe ein Pressgang)", 0, 1, 0, { jeFarbe: true }), schritt("falten", "Falten / Verpacken", 0, 0.5)],
        versandArt: "stueck", volumenJeStueckL: 0.6, laengeMm: 300, markt: [], marktGrenzen: { online: 10, import: 300 }, verlauf: [],
        beispiele: [
          { id: "b1", titel: "20 Shirts, 1-farbig Flex", menge: 20, breiteMm: 250, hoeheMm: 300, farben: 1, verfahren: "flex", ansichten: [["Vorne", "svg:shirt-1"], ["Detail Folie", "svg:shirt-detail-1"]] },
          { id: "b2", titel: "20 Shirts, 3-farbig Flex", menge: 20, breiteMm: 250, hoeheMm: 300, farben: 3, verfahren: "flex", ansichten: [["Vorne", "svg:shirt-3"], ["Detail: 3 Folien übereinander", "svg:shirt-detail-3"]] },
          { id: "b3", titel: "20 Shirts, vierfarbig Digitaltransfer", menge: 20, breiteMm: 250, hoeheMm: 300, farben: 4, verfahren: "dtf", ansichten: [["Vorne", "svg:shirt-4"], ["Detail: ein Transfer, alle Farben", "svg:shirt-detail-4"]] },
        ] },
      { id: "fahrzeug", gebiet: "werbetechnik", name: "Fahrzeugfolierung (Digitaldruck, montiert)", mengenregel: "rolle", abstandMm: 20,
        beschreibungVorgabe: "Fahrzeugbeschriftung im Digitaldruck, inkl. Montage", breiteVorgabe: 4000, hoeheVorgabe: 1500, staffelVorgabe: [1],
        verfahrenWahl: ["rollendruck"], verfahrenVorgabe: "rollendruck", farbenMax: 1,
        slots: [
          { id: "folie", name: "Car-Wrap-Folie", bezug: "regel", wahl: ["folie_cast", "folie_polymer"], vorgabe: "folie_cast" },
          { id: "laminat", name: "Laminat", bezug: "regel", optional: true, wahl: ["lam_cast", "lam_glanz", "lam_matt"], vorgabe: "lam_cast" },
        ],
        schritte: [schritt("daten", "Gestaltung / Daten", 60), schritt("laminieren", "Laminieren", 10, 0, 4, { nurMitSlot: "laminat" }),
          schritt("vorbereiten", "Fahrzeug reinigen / vorbereiten", 30), schritt("montage", "Montage", 30, 0, 45)],
        versandArt: "keiner", markt: [], marktGrenzen: { online: 1000, import: 1000 }, verlauf: [],
        beispiele: [{ id: "b1", titel: "Transporter, eine Seite 4,0 × 1,5 m", menge: 1, breiteMm: 4000, hoeheMm: 1500, ansichten: [["Seite", "svg:fahrzeug-seite"], ["Heck", "svg:fahrzeug-heck"]] }] },
      { id: "schriftzug", gebiet: "werbetechnik", name: "Plott-Schriftzug (Folie, je Farbe)", mengenregel: "rolle", abstandMm: 10,
        beschreibungVorgabe: "Schriftzug aus Plotterfolie, mit Übertragungsfolie", breiteVorgabe: 1000, hoeheVorgabe: 200, staffelVorgabe: [1, 2, 5],
        verfahrenWahl: ["plotten"], verfahrenVorgabe: "plotten", farbenMax: 3,
        slots: [{ id: "folie", name: "Plotterfolie", bezug: "regel", jeFarbe: true, wahl: ["plott_std"], vorgabe: "plott_std" }],
        schritte: [schritt("daten", "Daten / Schrift anlegen", 15), schritt("entgittern", "Entgittern je Farbe", 0, 0, 20, { jeFarbe: true }),
          schritt("uebertragen", "Übertragungsfolie je Farbe", 0, 0, 10, { jeFarbe: true })],
        versandArt: "rolle", dickeMm: 0.3, markt: [], marktGrenzen: { online: 5, import: 1000 }, verlauf: [],
        beispiele: [{ id: "b1", titel: "Schaufenster-Schriftzug 1,0 × 0,2 m, einfarbig", menge: 1, breiteMm: 1000, hoeheMm: 200, farben: 1, ansichten: [["Schaufenster", "svg:schriftzug-fenster"], ["Entgittert", "svg:schriftzug-detail"]] }] },
    ],
    verpackungen: [
      { id: "karton_s", name: "Karton S (300 × 200 × 150)", innenL: 300, innenB: 200, innenH: 150, eigengewichtG: 200, ekCent: 60, packMin: 2, maxGewichtG: 10000, platzhalter: P },
      { id: "karton_m", name: "Karton M (400 × 300 × 200)", innenL: 400, innenB: 300, innenH: 200, eigengewichtG: 350, ekCent: 110, packMin: 3, maxGewichtG: 20000, platzhalter: P },
      { id: "karton_l", name: "Karton L (600 × 400 × 400)", innenL: 600, innenB: 400, innenH: 400, eigengewichtG: 600, ekCent: 220, packMin: 4, maxGewichtG: 30000, platzhalter: P },
      { id: "rolle", name: "Versandrolle 1000 × Ø 100", innenL: 1000, innenB: 100, innenH: 100, eigengewichtG: 300, ekCent: 250, packMin: 3, maxGewichtG: 10000, platzhalter: P },
      { id: "rolle_l", name: "Versandrolle 1600 × Ø 120", innenL: 1600, innenB: 120, innenH: 120, eigengewichtG: 450, ekCent: 400, packMin: 4, maxGewichtG: 15000, platzhalter: P },
      { id: "platte", name: "Plattenverpackung 1250 × 850 × 50", innenL: 1250, innenB: 850, innenH: 50, eigengewichtG: 1200, ekCent: 600, packMin: 8, maxGewichtG: 30000, platzhalter: P },
    ],
    versand: [
      { id: "paket", name: "Paketdienst (Platzhalter-Tarif)", maxL: 1200, maxGurt: 3000, sperrgutCent: 2500, sperrgutMaxL: 2000, platzhalter: P,
        stufen: [{ bisG: 2000, cent: 590 }, { bisG: 5000, cent: 690 }, { bisG: 10000, cent: 990 }, { bisG: 31500, cent: 1690 }] },
      { id: "spedition", name: "Spedition (Platzhalter-Tarif)", maxL: 0, maxGurt: 0, sperrgutCent: null, platzhalter: P,
        stufen: [{ bisG: 1000000, cent: 8900 }] },
    ],
  };
  /* Mitgelieferte Arbeitsgebiete (Stufe 3) — im Katalog „＋ Arbeitsgebiet hinzufügen“ */
  WC.STARTKATALOGE = WC.STARTKATALOGE || {};
  WC.STARTKATALOGE.werbetechnik = Object.assign({ name: "Werbetechnik", beschreibung: "Digitaldruck, Schilder, Tassen, Kulis, T-Shirts, Fahrzeugfolierung, Schriftzüge." }, WC.START);
})(typeof window !== "undefined" ? window : globalThis);
