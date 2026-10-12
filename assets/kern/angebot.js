/* Ein Angebot: Positionen (je mit Staffel), der Posten „Verpackung & Versand“, Summen nach USt-Satz,
   Nummer AN-JJJJ-NNNN, Einfrieren beim Stellen. Rechnet nur — Anzeige in app.js, Kundenblatt in aussen.js.
   Klassisches Skript: window.WC.angebot bzw. globalThis.WC.angebot. */
(function (g) {
  "use strict";
  var WC = g.WC = g.WC || {};
  var K = function () { return WC.kalk; }, V = function () { return WC.versand; };

  function heute() { var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function plusTage(iso, t) { var d = new Date(iso + "T12:00:00"); d.setDate(d.getDate() + t); return d.toISOString().slice(0, 10); }

  function naechsteNummer(angebote, datum) {
    var jahr = (datum || heute()).slice(0, 4), max = 0;
    (angebote || []).forEach(function (a) { var m = /^AN-(\d{4})-(\d{4})$/.exec(a.nummer || ""); if (m && m[1] === jahr) max = Math.max(max, +m[2]); });
    return "AN-" + jahr + "-" + String(max + 1).padStart(4, "0");
  }
  function neu(angebote, datum) {
    datum = datum || heute();
    var nr = naechsteNummer(angebote, datum);
    return { id: nr, nummer: nr, datum: datum, gueltigBis: plusTage(datum, 30), status: "entwurf", titel: "", kundeId: "", kunde: { name: "", anschrift: "", klasse: "B" },
      saetze: {}, positionen: [], versand: {}, stand: null, zaehler: 0, notiz: "" };
  }
  function neuePosition(a, kat, vorlageId) {
    var v = K().finde(kat.vorlagen, vorlageId);
    a.zaehler = (a.zaehler || 0) + 1;
    var p = { id: "P-" + a.zaehler, vorlage: vorlageId, titel: v ? v.name : "", beschreibung: v ? v.beschreibungVorgabe || "" : "",
      menge: v && v.staffelVorgabe ? v.staffelVorgabe[0] : 1, staffeln: v && v.staffelVorgabe ? v.staffelVorgabe.slice() : [1],
      breiteMm: v ? v.breiteVorgabe || "" : "", hoeheMm: v ? v.hoeheVorgabe || "" : "", farben: 1, verfahren: v ? v.verfahrenVorgabe || "" : "",
      wahl: {}, zeiten: {}, saetze: {}, eigen: {}, bilder: [] };
    (v && v.slots || []).forEach(function (s) { p.wahl[s.id] = s.vorgabe || ""; });
    a.positionen.push(p);
    return p;
  }

  /* Welcher Katalog gilt? Gestellt = eingefroren. */
  function katalogFuer(a, kat) { return a.stand || kat; }
  function stellen(a, kat) {
    a.status = "gestellt";
    a.stand = JSON.parse(JSON.stringify(kat));
    return a;
  }
  function zurueckZumEntwurf(a) { a.status = "entwurf"; a.stand = null; return a; }

  /* Beitrag einer Position zum Versand */
  function versandTeil(vorlage, pos, erg) {
    var b = Number(pos.breiteMm) || 0, h = Number(pos.hoeheMm) || 0, m = erg.menge || 0;
    var art = vorlage.versandArt || "stueck";
    if (art === "flach") return { gewichtG: erg.gewichtG, volumenL: b * h * (Number(vorlage.dickeMm) || 1) * m / 1e6, laengsteMm: Math.max(b, h) };
    if (art === "rolle") return { gewichtG: erg.gewichtG, volumenL: b * h * (Number(vorlage.dickeMm) || 0.3) * m / 1e6 * 3, laengsteMm: Math.min(b, h) + 20 };
    return { gewichtG: erg.gewichtG, volumenL: (Number(vorlage.volumenJeStueckL) || 0) * m, laengsteMm: Number(vorlage.laengeMm) || 0 };
  }

  /* rechne(a, kat, kunde) → Positionen, Versand, Summen (für die Summe gilt pos.menge) */
  function rechne(a, kat0, kunde, kleinunternehmer) {
    var kat = katalogFuer(a, kat0);
    var ctx = { angebot: a, kunde: kunde || a.kunde };
    var pos = a.positionen.map(function (p) {
      var erg = K().position(kat, p, ctx);
      var st = K().staffel(kat, p, ctx);
      return { pos: p, erg: erg, staffel: st };
    });
    var teile = [], lohn = 0;
    pos.forEach(function (x) {
      if (!x.erg.ok) return;
      var v = K().finde(kat.vorlagen, x.pos.vorlage);
      if (v.versandArt === "keiner") return;
      teile.push(versandTeil(v, x.pos, x.erg));
      lohn = lohn || x.erg.effektiv.lohnCent;
    });
    if (!lohn) { var sf = K().saetzeFuer(kat, null, {}, a, ctx.kunde); lohn = K().effektiv(sf.s).lohnCent; }
    var inh = V().inhalt(teile);
    var versand;
    var man = a.versand && a.versand.manuellCent != null && a.versand.manuellCent !== "" ? Math.round(Number(a.versand.manuellCent)) : null;
    if (man != null && Number.isFinite(man)) versand = { ok: true, manuell: true, cent: man };
    else if (!teile.length) versand = { ok: true, leer: true, cent: 0 };
    else versand = V().waehle(kat, inh, lohn, a.versand || {});
    versand.inhalt = inh;

    var ustVorgabe = (kat.gebiete && kat.gebiete[0] && kat.gebiete[0].saetze && kat.gebiete[0].saetze.ustSatz) || 19;
    var perSatz = {}, netto = 0, sk = 0, offen = 0;
    pos.forEach(function (x) {
      if (!x.erg.ok) { offen++; return; }
      var s = kleinunternehmer ? 0 : x.erg.ustSatz;
      perSatz[s] = (perSatz[s] || 0) + x.erg.netto; netto += x.erg.netto; sk += x.erg.selbstkosten;
    });
    if (versand.ok && versand.cent) { var vs = kleinunternehmer ? 0 : ustVorgabe; perSatz[vs] = (perSatz[vs] || 0) + versand.cent; netto += versand.cent; sk += versand.cent; }
    var ust = 0, saetze = Object.keys(perSatz).map(function (s) { var u = Math.round(perSatz[s] * Number(s) / 100); ust += u; return { satz: Number(s), netto: perSatz[s], ust: u }; });
    return { positionen: pos, versand: versand, summen: { netto: netto, ust: ust, brutto: netto + ust, perSatz: saetze, offen: offen,
      selbstkosten: sk, deckungsbeitrag: netto - sk }, kat: kat };
  }

  WC.angebot = { heute: heute, plusTage: plusTage, naechsteNummer: naechsteNummer, neu: neu, neuePosition: neuePosition,
    katalogFuer: katalogFuer, stellen: stellen, zurueckZumEntwurf: zurueckZumEntwurf, versandTeil: versandTeil, rechne: rechne };
})(typeof window !== "undefined" ? window : globalThis);
