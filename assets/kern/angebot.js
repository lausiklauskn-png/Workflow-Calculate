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
    return { id: nr, nummer: nr, fassung: 1, datum: datum, gueltigBis: plusTage(datum, 30), status: "entwurf", titel: "", kundeId: "", kunde: { name: "", anschrift: "", klasse: "B" },
      saetze: {}, positionen: [], versand: {}, stand: null, zaehler: 0, notiz: "" };
  }
  function neuePosition(a, kat, vorlageId) {
    var v = K().finde(kat.vorlagen, vorlageId);
    a.zaehler = (a.zaehler || 0) + 1;
    var p = { id: "P-" + a.zaehler, vorlage: vorlageId, titel: v ? v.titelVorgabe || v.name : "", beschreibung: v ? v.beschreibungVorgabe || "" : "",
      menge: v && v.staffelVorgabe ? v.staffelVorgabe[0] : 1, staffeln: v && v.staffelVorgabe ? v.staffelVorgabe.slice() : [1],
      breiteMm: v ? v.breiteVorgabe || "" : "", hoeheMm: v ? v.hoeheVorgabe || "" : "", farben: 1, verfahren: v ? v.verfahrenVorgabe || "" : "",
      wahl: {}, zeiten: {}, saetze: {}, eigen: {}, bilder: [] };
    (v && v.slots || []).forEach(function (s) { p.wahl[s.id] = s.vorgabe || ""; });
    if (v && v.einkaufsprodukt) { var em = K().einkaufsMengen(v); if (em.length) { p.staffeln = em; p.menge = em[0]; } }
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

  /* Fassungen: ein GESTELLTES Angebot bleibt, wie es ist; Änderungen ergeben Fassung n+1 mit derselben Nummer.
     Die neue Fassung ist ein Entwurf und rechnet mit dem aktuellen Katalog; die alte trägt `ersetztDurch`. */
  function fassungVon(a) { return Number(a.fassung) || 1; }
  function neueFassung(angebote, a, anlass, datum) {
    if (a.status !== "gestellt") return { ok: false, grund: "nur ein gestelltes Angebot bekommt eine neue Fassung" };
    if (a.ersetztDurch) return { ok: false, grund: "es gibt schon eine neuere Fassung" };
    var n = JSON.parse(JSON.stringify(a)), f = fassungVon(a) + 1;
    n.fassung = f; n.id = a.nummer + "-F" + f; n.status = "entwurf"; n.stand = null; n.ersetztDurch = null;
    n.anlass = String(anlass || ""); n.datum = datum || heute(); n.gueltigBis = plusTage(n.datum, 30); n.vorgaenger = a.id;
    a.ersetztDurch = n.id;
    return { ok: true, angebot: n };
  }
  /* Vergleich zweier Rechnungen (rechne(…)) — je Position (über die Kennung P-n) und die Summe */
  function vergleich(rAlt, rNeu) {
    var zeilen = [], ids = {};
    function netto(r, id) { var x = r.positionen.filter(function (q) { return q.pos.id === id; })[0]; return x && x.erg.ok ? x.erg.netto : null; }
    function titel(r, id) { var x = r.positionen.filter(function (q) { return q.pos.id === id; })[0]; return x ? x.pos.titel : ""; }
    rAlt.positionen.concat(rNeu.positionen).forEach(function (x) { if (!ids[x.pos.id]) { ids[x.pos.id] = 1; zeilen.push(x.pos.id); } });
    var z = zeilen.map(function (id) {
      var a = netto(rAlt, id), b = netto(rNeu, id);
      return { id: id, titel: titel(rNeu, id) || titel(rAlt, id), alt: a, neu: b, art: a == null ? "neu" : b == null ? "entfallen" : a === b ? "gleich" : "geaendert" };
    });
    var va = rAlt.versand.ok ? rAlt.versand.cent || 0 : 0, vb = rNeu.versand.ok ? rNeu.versand.cent || 0 : 0;
    return { zeilen: z, versand: { alt: va, neu: vb }, summe: { alt: rAlt.summen.netto, neu: rNeu.summen.netto, diff: rNeu.summen.netto - rAlt.summen.netto } };
  }

  /* Beitrag einer Position zum Versand */
  function versandTeil(vorlage, pos, erg) {
    var b = Number(pos.breiteMm) || 0, h = Number(pos.hoeheMm) || 0, m = erg.menge || 0;
    var art = vorlage.versandArt || "stueck";
    if (art === "flach") return { gewichtG: erg.gewichtG, volumenL: b * h * (Number(vorlage.dickeMm) || 1) * m / 1e6, laengsteMm: Math.max(b, h) };
    if (art === "rolle") return { gewichtG: erg.gewichtG, volumenL: b * h * (Number(vorlage.dickeMm) || 0.3) * m / 1e6 * 3, laengsteMm: Math.min(b, h) + 20 };
    return { gewichtG: erg.gewichtG, volumenL: (Number(vorlage.volumenJeStueckL) || 0) * m, laengsteMm: Number(vorlage.laengeMm) || 0 };
  }

  /* Kleinmengenzuschlag (Klaus 2026-10-13: „als eigene Zeile, unter 10 Stück“): EINE Zeile je Angebot, sobald eine kalkulierte
     Stück-Position unter der Grenze liegt. Stunden, km und Montage (Dienstleistung ohne Versand) zählen nicht.
     Er gilt nur, wenn der Katalog ihn trägt (kat.kleinmenge = { grenze, cent, text }) — ein eingefrorener Stand von früher hat ihn
     nicht, ein gestelltes Angebot ändert sich also nicht. a.kleinmengeAus = für dieses Angebot weggelassen. */
  function zaehltKlein(v) { return !!v && v.kleinmenge !== false && (v.einheitText || "Stk.") === "Stk." && !(v.versandArt === "keiner" && !v.einkaufsprodukt); }
  function kleinmengeFuer(a, kat, pos) {
    var km = kat.kleinmenge, grenze = km ? Math.round(+km.grenze) || 0 : 0, cent = km ? Math.round(+km.cent) || 0 : 0;
    var leer = { aktiv: false, cent: 0, positionen: [], grenze: grenze, text: km && km.text ? String(km.text) : "Kleinmengenzuschlag" };
    if (!(grenze > 0) || !(cent > 0)) return leer;
    leer.positionen = pos.filter(function (x) { return x.erg.ok && x.erg.menge < grenze && zaehltKlein(K().finde(kat.vorlagen, x.pos.vorlage)); }).map(function (x) { return x.pos.id; });
    if (!leer.positionen.length) return leer;
    if (a.kleinmengeAus) return Object.assign(leer, { weggelassen: true });
    return Object.assign(leer, { aktiv: true, cent: cent });
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
      /* Handelsware: der Einkauf ist inkl. Versand und der Verkauf auch — ein eigener Versandposten zählte ihn doppelt */
      if (v.versandArt === "keiner" || v.einkaufsprodukt) return;
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
    var kleinmenge = kleinmengeFuer(a, kat, pos);
    if (kleinmenge.aktiv) { var ks = kleinunternehmer ? 0 : ustVorgabe; perSatz[ks] = (perSatz[ks] || 0) + kleinmenge.cent; netto += kleinmenge.cent; }
    var ust = 0, saetze = Object.keys(perSatz).map(function (s) { var u = Math.round(perSatz[s] * Number(s) / 100); ust += u; return { satz: Number(s), netto: perSatz[s], ust: u }; });
    return { positionen: pos, versand: versand, kleinmenge: kleinmenge, summen: { netto: netto, ust: ust, brutto: netto + ust, perSatz: saetze, offen: offen,
      selbstkosten: sk, deckungsbeitrag: netto - sk }, kat: kat };
  }

  WC.angebot = { heute: heute, plusTage: plusTage, naechsteNummer: naechsteNummer, neu: neu, neuePosition: neuePosition,
    katalogFuer: katalogFuer, stellen: stellen, zurueckZumEntwurf: zurueckZumEntwurf, fassungVon: fassungVon, neueFassung: neueFassung, vergleich: vergleich, versandTeil: versandTeil, rechne: rechne, kleinmengeFuer: kleinmengeFuer, zaehltKlein: zaehltKlein,
    /* Klaus 2026-10-13 bestätigt: 12,00 € netto, unter 10 Stück, einmal je Angebot — sein Wert, kein Platzhalter */
    KLEINMENGE_VORGABE: { grenze: 10, cent: 1200, text: "Kleinmengenzuschlag" } };
})(typeof window !== "undefined" ? window : globalThis);
