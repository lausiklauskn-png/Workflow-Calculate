/* Übergabe an WorkFloh (Klaus 2026-10-12: „genau wie bei Workflow Needs übertragen … in Tomys Hub
   und Workflow, sodass es in den Arbeitsprozess übernommen und gleich einem Auftrag zugeordnet werden kann“).

   Format wie Workflow-Needs assets/kern/uebergabe.js — das Weiterleitungs-Bündel, das Mein WorkFloh UND
   Tomys Hub/workfloh mit „📥 Importieren“ lesen (applyForwardBundle):
     { wf: "forward", v: 1, ts, count, locked: 0, quelle, auftraege: [ Auftrag ] }
   ⚠ GEBAUT NUR AUS DER WHITELIST (WC.aussen.angebotExtern) — keine Einkaufspreise, Sätze, Zeiten,
   keine Kundenklasse. ⚠ Die Angebotsnummer steht als Auftrags-Nr. — liest WorkFloh dieselbe
   Nummer ein zweites Mal ein, fragt es nach (Dubletten-Warnung in applyForwardBundle).
   Bilder der Positionen kommen als Dateien mit.
   Klassisches Skript: window.WC.uebergabe bzw. globalThis.WC.uebergabe. */
(function (g) {
  "use strict";
  var WC = g.WC = g.WC || {};
  function tmj(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || "")); return m ? m[3] + "." + m[2] + "." + m[1] : ""; }
  function eur(c) { return WC.geld.formatEuro(c); }

  /* d = WC.aussen.angebotExtern(…) */
  function auftrag(d, jetzt) {
    var z = [];
    z.push("Angebot " + d.nummer + (d.fassung > 1 ? " · Fassung " + d.fassung : "") + " · " + tmj(d.datum) + (d.gueltigBis ? " · gültig bis " + tmj(d.gueltigBis) : ""));
    z.push("");
    var stueck = 0;
    d.positionen.forEach(function (p) {
      stueck += p.menge;
      z.push("• " + p.titel + (p.beschreibung ? " — " + p.beschreibung : "") + ": " + p.menge + " " + (p.einheit || "Stk.") + " à " + eur(p.stueckCent) + " = " + eur(p.gesamtCent) + " netto");
      if (p.staffel.length) z.push("  Staffel: " + p.staffel.map(function (s) { return s.menge + " " + (p.einheit || "Stk.") + " à " + eur(s.stueckCent); }).join(" · "));
    });
    if (d.versand) z.push("• " + d.versand.text + ": " + eur(d.versand.nettoCent) + " netto");
    if (d.kleinmenge) z.push("• " + d.kleinmenge.text + ": " + eur(d.kleinmenge.nettoCent) + " netto");
    z.push("", "Summe netto " + eur(d.summen.netto) + (d.kleinunternehmer ? " · § 19 UStG, keine Umsatzsteuer" : " · USt " + eur(d.summen.ust)) + " · brutto " + eur(d.summen.brutto));
    z.push("", "Aus Workflow Calculate übernommen.");
    var ts = jetzt || new Date().toISOString();
    return {
      id: "wc-" + d.nummer + (d.fassung > 1 ? "-F" + d.fassung : ""), nr: d.nummer + (d.fassung > 1 ? "-F" + d.fassung : ""), title: d.titel || (d.positionen[0] ? d.positionen[0].titel : d.nummer), status: "angebot",
      createdAt: ts, updatedAt: ts, projectId: null, folderId: null, kundeId: null,
      data: { nameFirma: d.kunde.name, ansprechpartner: "", email: "", erreichbarkeit: "", lieferadresse: d.kunde.anschrift,
        preis: eur(d.summen.brutto) + " brutto", beschreibung: z.join("\n"), datum: tmj(d.datum), stueck: stueck || "" },
      prod: {}, zeit: [], links: [], log: [], files: [],
    };
  }
  function buendel(auftraege, jetzt) {
    return { wf: "forward", v: 1, ts: jetzt || new Date().toISOString(), count: auftraege.length, locked: 0, quelle: "workflow-calculate", auftraege: auftraege };
  }
  function dataUrl(blob, typ) {
    return blob.arrayBuffer().then(function (buf) {
      var a = new Uint8Array(buf), s = "", i;
      for (i = 0; i < a.length; i += 0x8000) s += String.fromCharCode.apply(null, a.subarray(i, i + 0x8000));
      return "data:" + (typ || "application/octet-stream") + ";base64," + g.btoa(s);
    });
  }
  /* bilder: [{ name, blob }] */
  function dateien(bilder) {
    return Promise.all((bilder || []).filter(function (x) { return x && x.blob; }).map(function (x) {
      var typ = x.blob.type || "image/jpeg";
      return dataUrl(x.blob, typ).then(function (u) { return { name: x.name, mime: typ, size: x.blob.size || 0, data: u }; });
    }));
  }
  function dateiname(d) { return "Auftrag_" + d.nummer + (d.fassung > 1 ? "-F" + d.fassung : "") + ".json"; }

  /* ── An BookLedgerPro: Datenvertrag v1 (BookLedgerPro docs/UEBERNAHME_TOMY.md), quelle "workflow-calculate" ──
     BLP prüft und kappt (titel/beschreibung 140, Nummern 32, höchstens 20 Positionen, USt 0/7/19) und füllt nur das
     Angebots-Formular vor — gespeichert wird dort erst auf Klick. Gebaut aus der Whitelist d.
     ⚠ BLP rechnet menge × einzelpreisCent. Geht der Gesamtbetrag nicht glatt durch die Menge, wird die Position als
     1 × Gesamtbetrag geschickt und die Stückzahl steht im Text — sonst wiche die Summe in BLP um Cent ab. */
  var BLP_ZIEL = "https://lausiklauskn-png.github.io/BookLedgerPro/", BLP_MAX_POS = 20, BLP_MAX_LEN = 20000;
  function kappe(s, n) { s = String(s == null ? "" : s); return s.length > n ? s.slice(0, n - 1) + "…" : s; }
  function blpNutzlast(d) {
    var pos = d.positionen.map(function (p) {
      var text = p.titel + (p.beschreibung ? " — " + p.beschreibung : "");
      var glatt = p.menge > 0 && p.gesamtCent % p.menge === 0;
      return glatt ? { beschreibung: kappe(text, 140), menge: p.menge, einzelpreisCent: p.gesamtCent / p.menge, ustSatz: p.ustSatz }
        : { beschreibung: kappe(p.menge + " " + (p.einheit || "Stk.") + " " + text, 140), menge: 1, einzelpreisCent: p.gesamtCent, ustSatz: p.ustSatz };
    });
    if (d.versand) pos.push({ beschreibung: d.versand.text, menge: 1, einzelpreisCent: d.versand.nettoCent, ustSatz: d.kleinunternehmer ? 0 : 19 });
    if (d.kleinmenge) pos.push({ beschreibung: kappe(d.kleinmenge.text, 140), menge: 1, einzelpreisCent: d.kleinmenge.nettoCent, ustSatz: d.kleinunternehmer ? 0 : 19 });
    return { v: 1, quelle: "workflow-calculate", modus: "angebot", titel: kappe(d.titel || (d.positionen[0] ? d.positionen[0].titel : d.nummer), 140),
      kundeName: kappe(d.kunde.name, 80), auftragNr: "", angebotsNr: kappe(d.nummer + (d.fassung > 1 ? "-F" + d.fassung : ""), 32), positionen: pos };
  }
  function b64u(text) {
    var bytes = new g.TextEncoder().encode(text), s = "", i;
    for (i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return g.btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  /* → { ok, url } oder { ok:false, grund } */
  function blpAdresse(d) {
    var n = blpNutzlast(d);
    if (!d.positionen.length) return { ok: false, grund: "keine kalkulierte Position" };
    if (n.positionen.length > BLP_MAX_POS) return { ok: false, grund: "BookLedgerPro nimmt höchstens " + BLP_MAX_POS + " Positionen (mit Versand) — dieses Angebot hat " + n.positionen.length };
    var p = b64u(JSON.stringify(n));
    if (p.length > BLP_MAX_LEN) return { ok: false, grund: "das Angebot ist für die Übergabe zu lang (BookLedgerPro nimmt bis 20 kB)" };
    return { ok: true, url: BLP_ZIEL + "?uebernahme=" + p, nutzlast: n };
  }

  WC.uebergabe = { auftrag: auftrag, buendel: buendel, dateien: dateien, dataUrl: dataUrl, dateiname: dateiname, blpNutzlast: blpNutzlast, blpAdresse: blpAdresse, BLP_ZIEL: BLP_ZIEL };
})(typeof window !== "undefined" ? window : globalThis);
