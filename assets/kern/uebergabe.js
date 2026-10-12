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
    z.push("Angebot " + d.nummer + " · " + tmj(d.datum) + (d.gueltigBis ? " · gültig bis " + tmj(d.gueltigBis) : ""));
    z.push("");
    var stueck = 0;
    d.positionen.forEach(function (p) {
      stueck += p.menge;
      z.push("• " + p.titel + (p.beschreibung ? " — " + p.beschreibung : "") + ": " + p.menge + " Stk. à " + eur(p.stueckCent) + " = " + eur(p.gesamtCent) + " netto");
      if (p.staffel.length) z.push("  Staffel: " + p.staffel.map(function (s) { return s.menge + " Stk. à " + eur(s.stueckCent); }).join(" · "));
    });
    if (d.versand) z.push("• " + d.versand.text + ": " + eur(d.versand.nettoCent) + " netto");
    z.push("", "Summe netto " + eur(d.summen.netto) + (d.kleinunternehmer ? " · § 19 UStG, keine Umsatzsteuer" : " · USt " + eur(d.summen.ust)) + " · brutto " + eur(d.summen.brutto));
    z.push("", "Aus Workflow Calculate übernommen.");
    var ts = jetzt || new Date().toISOString();
    return {
      id: "wc-" + d.nummer, nr: d.nummer, title: d.titel || (d.positionen[0] ? d.positionen[0].titel : d.nummer), status: "angebot",
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
  function dateiname(d) { return "Auftrag_" + d.nummer + ".json"; }

  WC.uebergabe = { auftrag: auftrag, buendel: buendel, dateien: dateien, dataUrl: dataUrl, dateiname: dateiname };
})(typeof window !== "undefined" ? window : globalThis);
