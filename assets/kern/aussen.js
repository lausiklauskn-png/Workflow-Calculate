/* Was hinausgeht — Whitelist (Muster: BookLedgerPro externesAngebot, Workflow-Needs aussen.js).
   Jede Funktion liest NUR die Felder, die sie nennt, und gibt ein NEUES Objekt zurück. Das Kundenblatt
   wird ausschließlich daraus gezeichnet. Nie hinaus: Einkaufspreise, Zuschläge, Sätze, Zeiten,
   Rechenweg, Kundenklasse, Marktpreise, Selbstkosten.
   Klassisches Skript: window.WC.aussen bzw. globalThis.WC.aussen. */
(function (g) {
  "use strict";
  var WC = g.WC = g.WC || {};
  function s(x) { return x == null ? "" : String(x); }
  function c(x) { var n = Math.round(Number(x)); return Number.isFinite(n) ? n : 0; }

  function firmaExtern(f) {
    f = f || {};
    var logo = typeof f.logo === "string" && /^data:image\/(png|jpeg|webp);base64,/.test(f.logo) ? f.logo : "";
    return { name: s(f.name), anschrift: s(f.anschrift), kontakt: s(f.kontakt), steuer: s(f.steuer), bank: s(f.bank), logo: logo };
  }
  function kundeExtern(k) { k = k || {}; return { name: s(k.name), anschrift: s(k.anschrift) }; }

  /* Einheit der Menge („Stk.“, „Std.“, „km“) — aus der Vorlage, nie aus der Rechnung */
  function einheitVon(r, p) {
    var v = (r.kat && r.kat.vorlagen || []).filter(function (x) { return x.id === p.vorlage; })[0];
    return s(v && v.einheitText) || "Stk.";
  }
  /* r = WC.angebot.rechne(…) · a = das Angebot */
  function angebotExtern(a, r, firma, kleinunternehmer) {
    var positionen = r.positionen.filter(function (x) { return x.erg.ok; }).map(function (x) {
      return {
        titel: s(x.pos.titel), beschreibung: s(x.pos.beschreibung),
        bild: Array.isArray(x.pos.bilder) && x.pos.bilder.length ? s(x.pos.bilder[0]) : "",
        menge: c(x.erg.menge), einheit: einheitVon(r, x.pos), stueckCent: c(x.erg.stueckCent), gesamtCent: c(x.erg.netto), ustSatz: kleinunternehmer ? 0 : c(x.erg.ustSatz),
        staffel: x.staffel.length > 1 ? x.staffel.filter(function (e) { return e.ok; }).map(function (e) { return { menge: c(e.menge), stueckCent: c(e.stueckCent), gesamtCent: c(e.netto) }; }) : [],
      };
    });
    var v = r.versand;
    return {
      nummer: s(a.nummer), fassung: Number(a.fassung) || 1, datum: s(a.datum), gueltigBis: s(a.gueltigBis), titel: s(a.titel),
      firma: firmaExtern(firma), kunde: kundeExtern(a.kunde),
      positionen: positionen,
      versand: v && v.ok && !v.leer ? { text: "Verpackung & Versand", nettoCent: c(v.cent) } : null,
      kleinmenge: r.kleinmenge && r.kleinmenge.aktiv ? { text: s(r.kleinmenge.text) || "Kleinmengenzuschlag", nettoCent: c(r.kleinmenge.cent) } : null,
      summen: { netto: c(r.summen.netto), ust: c(r.summen.ust), brutto: c(r.summen.brutto),
        perSatz: r.summen.perSatz.map(function (p) { return { satz: c(p.satz), netto: c(p.netto), ust: c(p.ust) }; }) },
      kleinunternehmer: !!kleinunternehmer,
    };
  }

  WC.aussen = { firmaExtern: firmaExtern, kundeExtern: kundeExtern, angebotExtern: angebotExtern };
})(typeof window !== "undefined" ? window : globalThis);
