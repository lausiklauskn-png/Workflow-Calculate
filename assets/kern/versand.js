/* Verpackung & Versand — EIN Posten.
   Aus Gewicht und Maßen wählt die App Verpackung und den günstigsten Dienst, der passt.
   Passt nichts, heißt es „kein Tarif passt — von Hand setzen“, nie still 0.
   Posten = Σ je Paket (Verpackung EK + Packminuten × Lohnsatz + Tarif).
   Klassisches Skript: window.WC.versand bzw. globalThis.WC.versand. */
(function (g) {
  "use strict";
  var WC = g.WC = g.WC || {};
  function n(x) { var v = Number(x); return Number.isFinite(v) ? v : 0; }

  /* Inhalt: { gewichtG, volumenL, laengsteMm } — aus allen Positionen zusammengezählt */
  function inhalt(teile) {
    var r = { gewichtG: 0, volumenL: 0, laengsteMm: 0 };
    (teile || []).forEach(function (t) { r.gewichtG += n(t.gewichtG); r.volumenL += n(t.volumenL); r.laengsteMm = Math.max(r.laengsteMm, n(t.laengsteMm)); });
    r.gewichtG = Math.round(r.gewichtG); r.volumenL = Math.round(r.volumenL * 1000) / 1000;
    return r;
  }
  function innenL(p) { return n(p.innenL) * n(p.innenB) * n(p.innenH) / 1e6; }
  function laengsteInnen(p) { return Math.max(n(p.innenL), n(p.innenB), n(p.innenH)); }
  function gurtmass(p) { var a = [n(p.innenL), n(p.innenB), n(p.innenH)].sort(function (x, y) { return y - x; }); return a[0] + 2 * a[1] + 2 * a[2]; }

  /* Tarif eines Dienstes für ein Paket (Außenmaß ≈ Innenmaß + 10 mm) */
  function tarif(dienst, paket, gewichtG) {
    var aussen = { innenL: n(paket.innenL) + 10, innenB: n(paket.innenB) + 10, innenH: n(paket.innenH) + 10 };
    var stufe = (dienst.stufen || []).filter(function (s) { return gewichtG <= n(s.bisG); }).sort(function (a, b) { return n(a.bisG) - n(b.bisG); })[0];
    if (!stufe) return null;
    var cent = n(stufe.cent), sperr = false;
    var lang = laengsteInnen(aussen), gurt = gurtmass(aussen);
    if ((n(dienst.maxL) && lang > n(dienst.maxL)) || (n(dienst.maxGurt) && gurt > n(dienst.maxGurt))) {
      if (dienst.sperrgutCent == null || dienst.sperrgutCent === "" || (n(dienst.sperrgutMaxL) && lang > n(dienst.sperrgutMaxL))) return null;
      cent += n(dienst.sperrgutCent); sperr = true;
    }
    return { cent: cent, sperrgut: sperr, stufe: stufe.bisG };
  }

  /* Wählt Verpackung × Anzahl × Dienst mit den geringsten Kosten.
     kat: { verpackungen, versand }, lohnCent: Satz fürs Packen, wahl: { verpackung?, dienst? } (überstimmt) */
  function waehle(kat, inh, lohnCent, wahl) {
    wahl = wahl || {};
    var kandidaten = [];
    if (!(inh.gewichtG > 0 || inh.volumenL > 0)) return { ok: false, grund: "nichts zu versenden (kein Gewicht, kein Volumen)" };
    (kat.verpackungen || []).forEach(function (p) {
      if (wahl.verpackung && p.id !== wahl.verpackung) return;
      if (inh.laengsteMm > laengsteInnen(p)) return;
      var vol = innenL(p) * 0.8;
      var maxG = n(p.maxGewichtG) || Infinity;
      var stk = Math.max(1, vol > 0 ? Math.ceil(inh.volumenL / vol) : 1, Math.ceil((inh.gewichtG + 0) / maxG));
      var jeG = Math.ceil(inh.gewichtG / stk) + n(p.eigengewichtG);
      (kat.versand || []).forEach(function (d) {
        if (wahl.dienst && d.id !== wahl.dienst) return;
        var t = tarif(d, p, jeG);
        if (!t) return;
        var pack = Math.round(n(p.packMin) / 60 * n(lohnCent));
        var je = n(p.ekCent) + pack + t.cent;
        kandidaten.push({ verpackung: p.id, verpackungName: p.name, dienst: d.id, dienstName: d.name, pakete: stk, gewichtJePaketG: jeG,
          sperrgut: t.sperrgut, stufeBisG: t.stufe, verpackungCent: n(p.ekCent) * stk, packCent: pack * stk, tarifCent: t.cent * stk, cent: je * stk });
      });
    });
    if (!kandidaten.length) return { ok: false, grund: "kein Tarif passt — von Hand setzen" };
    kandidaten.sort(function (a, b) { return a.cent - b.cent || a.pakete - b.pakete; });
    return Object.assign({ ok: true, alternativen: kandidaten.length }, kandidaten[0]);
  }

  WC.versand = { inhalt: inhalt, tarif: tarif, waehle: waehle, gurtmass: gurtmass };
})(typeof window !== "undefined" ? window : globalThis);
