/* Beispiel-Angebote (Klaus 2026-10-12: „Vorlagen in verschiedenen Aufgabenbereichen … zwischen 10 und 15
   vorgefertigte Testartikel, so dass man beim Ausfüllen sehen kann, wie das Ganze angelegt sein muss … was es
   kosten kann … und ob die Übergabe an Workflow oder an BookLedger Pro funktioniert“). Muster: Workflow-Needs
   „Beispiele laden“. Fünf Angebote, 15 Positionen, alle drei Arbeitsgebiete (Klaus: statt Geburtstag Firmenjubiläum und Hochzeit).
   ⚠ Kunden ERFUNDEN (… Beispiel, Musterstadt). Preise kommen aus dem Katalog — solange der Platzhalter trägt,
   sind es Platzhalter-Preise; die App sagt das. Ein Beispiel wird nicht doppelt geladen (a.beispiel).
   Klassisches Skript: WC.BEISPIEL_ANGEBOTE und WC.beispielAngebot. */
(function (g) {
  "use strict";
  var WC = g.WC = g.WC || {};
  var ANSCHRIFT = "Musterstraße 1\n12345 Musterstadt";
  WC.BEISPIEL_ANGEBOTE = [
    { bid: "verein", titel: "Vereinsausstattung Saison 2027", kunde: { name: "Sportverein Beispiel e. V.", anschrift: ANSCHRIFT, klasse: "A" },
      notiz: "Beispiel: Textil drucken und besticken — Kundenklasse A (bestellt jedes Jahr).",
      positionen: [
        { vorlage: "shirt", titel: "Trainings-Shirt, Vereinslogo 1-farbig", menge: 25, staffeln: [10, 25, 50], breiteMm: 250, hoeheMm: 300, farben: 1, verfahren: "flex" },
        { vorlage: "shirt", titel: "Fan-Shirt, Foto-Motiv vierfarbig", menge: 15, staffeln: [15, 30], breiteMm: 250, hoeheMm: 300, farben: 4, verfahren: "dtf", wahl: { shirt: "shirt_premium" } },
        { vorlage: "polo_stick", titel: "Trainer-Polo, Logo gestickt", menge: 20, staffeln: [10, 20], farben: 2, stiche: 6000 },
        { vorlage: "aufnaeher", titel: "Aufnäher Vereinswappen 8 × 6 cm", menge: 100, staffeln: [50, 100, 250], breiteMm: 80, hoeheMm: 60, farben: 3, stiche: 8000 },
      ] },
    { bid: "firmenstart", titel: "Firmenstart — Werbeartikel und Schild", kunde: { name: "Bäckerei Beispiel", anschrift: ANSCHRIFT, klasse: "B" },
      notiz: "Beispiel: Werbeartikel bedrucken, Schild, Anfahrt in km.",
      positionen: [
        { vorlage: "tasse", titel: "Tasse mit Logo, rundum", menge: 50, staffeln: [10, 50, 100] },
        { vorlage: "kuli", titel: "Kugelschreiber, Logo 3-farbig", menge: 250, staffeln: [250, 500], farben: 3, verfahren: "tampon" },
        { vorlage: "schild", titel: "Firmenschild 60 × 40 cm", menge: 1, staffeln: [1, 2], breiteMm: 600, hoeheMm: 400 },
        { vorlage: "anfahrt", titel: "Anfahrt zur Montage", menge: 40, staffeln: [40] },
      ] },
    { bid: "fahrzeug", titel: "Fahrzeugbeschriftung Transporter", kunde: { name: "Handwerk Beispiel GmbH", anschrift: ANSCHRIFT, klasse: "B" },
      notiz: "Beispiel: Digitaldruck groß, Plott-Schriftzug, Gestaltung nach Stunden.",
      positionen: [
        { vorlage: "gestaltung", titel: "Gestaltung der Beschriftung", menge: 3, staffeln: [3] },
        { vorlage: "fahrzeug", titel: "Seitenbeschriftung Digitaldruck, montiert", menge: 2, staffeln: [2], breiteMm: 4000, hoeheMm: 1500 },
        { vorlage: "schriftzug", titel: "Heckscheibe: Telefon und Internet", menge: 1, staffeln: [1], breiteMm: 1200, hoeheMm: 150, farben: 1 },
      ] },
    { bid: "jubilaeum", titel: "Firmenjubiläum 25 Jahre — Geschenke für die Belegschaft", kunde: { name: "Maschinenbau Beispiel GmbH", anschrift: ANSCHRIFT, klasse: "B" },
      notiz: "Beispiel: Jubiläumsgeschenke gestickt — Cap und Handtuch mit Jubiläumslogo.",
      positionen: [
        { vorlage: "cap_stick", titel: "Cap mit Jubiläumslogo „25 Jahre“", menge: 40, staffeln: [25, 40, 50], farben: 3, stiche: 7000 },
        { vorlage: "handtuch_stick", titel: "Handtuch mit Jubiläums-Stick", menge: 40, staffeln: [10, 40], farben: 2, stiche: 4000 },
      ] },
    { bid: "hochzeit", titel: "Hochzeit — Gastgeschenke und Brautpaar-Tassen", kunde: { name: "Brautpaar Beispiel", anschrift: ANSCHRIFT, klasse: "C" },
      notiz: "Beispiel: Hochzeit, kleine Mengen, Kundenklasse C (einmalig) — teurer je Stück.",
      positionen: [
        { vorlage: "tasse", titel: "Tassen „Mr & Mrs“ mit Datum", menge: 2, staffeln: [2] },
        { vorlage: "digi_folie", titel: "Aufkleber für Gastgeschenke 5 × 5 cm, glänzend", menge: 60, staffeln: [60, 100], breiteMm: 50, hoeheMm: 50 },
      ] },
  ];

  /* Ein Beispiel als Angebot anlegen. Fehlende Arbeitsgebiete holt es aus WC.STARTKATALOGE (eigene Zahlen bleiben).
     → { ok, angebot, gebieteNeu:[Namen] } · { ok:false, grund } */
  function gebietVon(vorlageId) {
    var ids = Object.keys(WC.STARTKATALOGE || {});
    for (var i = 0; i < ids.length; i++) if ((WC.STARTKATALOGE[ids[i]].vorlagen || []).some(function (v) { return v.id === vorlageId; })) return ids[i];
    return null;
  }
  WC.beispielAngebot = function (angebote, kat, bid, datum) {
    var b = WC.BEISPIEL_ANGEBOTE.filter(function (x) { return x.bid === bid; })[0];
    if (!b) return { ok: false, grund: "unbekanntes Beispiel" };
    if ((angebote || []).some(function (a) { return a.beispiel === bid; })) return { ok: false, grund: "schon geladen" };
    var gebieteNeu = [];
    b.positionen.forEach(function (p) {
      if (WC.kalk.finde(kat.vorlagen, p.vorlage)) return;
      var gid = gebietVon(p.vorlage);
      if (gid) { WC.katalog.gebietHinzufuegen(kat, WC.STARTKATALOGE[gid]); if (gebieteNeu.indexOf(WC.STARTKATALOGE[gid].name) < 0) gebieteNeu.push(WC.STARTKATALOGE[gid].name); }
    });
    var fehlt = b.positionen.filter(function (p) { return !WC.kalk.finde(kat.vorlagen, p.vorlage); });
    if (fehlt.length) return { ok: false, grund: "Vorlage fehlt im Katalog: " + fehlt.map(function (p) { return p.vorlage; }).join(", ") };
    var a = WC.angebot.neu(angebote, datum);
    a.beispiel = bid; a.titel = b.titel; a.kunde = JSON.parse(JSON.stringify(b.kunde)); a.notiz = b.notiz;
    b.positionen.forEach(function (q) {
      var p = WC.angebot.neuePosition(a, kat, q.vorlage);
      ["titel", "menge", "breiteMm", "hoeheMm", "farben", "verfahren", "stiche"].forEach(function (k) { if (q[k] != null) p[k] = q[k]; });
      p.staffeln = (q.staffeln || [q.menge]).concat([q.menge]).filter(function (m, i, s) { return s.indexOf(m) === i; }).sort(function (x, y) { return x - y; });
      if (q.wahl) p.wahl = Object.assign({}, p.wahl, q.wahl);
    });
    return { ok: true, angebot: a, gebieteNeu: gebieteNeu };
  };
})(typeof window !== "undefined" ? window : globalThis);
