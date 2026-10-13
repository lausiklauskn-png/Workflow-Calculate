/* Der Preisschlüssel — differenzierende Zuschlagskalkulation (KLR, Schema wie in der IHK-Ausbildung)
   mit Maschinenstundensatz. Alles in ganzen Cent, gerundet je Schritt; jede Zeile steht im Ergebnis.

     Materialeinzelkosten (MEK) + Materialgemeinkosten (MGK %)            = Materialkosten
     Fertigungslohn (FEK)       + Fertigungsgemeinkosten (FGK %) + Maschine = Fertigungskosten
     Material- + Fertigungskosten                                          = Herstellkosten (HK)
     HK + Verwaltungs-GK % + Vertriebs-GK %                                = Selbstkosten (SK)
     SK + Gewinn %                                                         = Barverkaufspreis
     ÷ (1 − Skonto % − Provision %)                                        = Zielverkaufspreis
     ÷ (1 − Rabatt %)                                                      = Listenpreis netto

   Vereinfachter Modus (Vorgabe): EIN Stundenverrechnungssatz statt Lohn + FGK, EIN Gemeinkosten-
   Zuschlag auf die Herstellkosten, ein Materialzuschlag. Er wird in dieselben Felder übersetzt
   (`effektiv`) — es gibt nur EINEN Rechenweg.

   Satz-Ebenen: Position → Angebot → [Kundenklasse] → Vorlage → Arbeitsgebiet. Die Kundenklasse
   wirkt nur auf Werte, die nicht ausdrücklich an Position oder Angebot gesetzt sind.
   Klassisches Skript: window.WC.kalk bzw. globalThis.WC.kalk. */
(function (g) {
  "use strict";
  var WC = g.WC = g.WC || {};
  var M = function () { return WC.mengen; };

  var SATZ_KEYS = ["modus", "stundensatzCent", "lohnCent", "materialzuschlagPct", "gkPct", "mgkPct", "fgkPct", "vwgkPct", "vtgkPct",
    "gewinnPct", "skontoPct", "provisionPct", "rabattPct", "handlungskostenPct", "ustSatz"];
  var SATZ_LABEL = { stundensatzCent: "Stundenverrechnungssatz", lohnCent: "Fertigungslohn je Stunde", materialzuschlagPct: "Materialzuschlag %",
    gkPct: "Gemeinkosten %", mgkPct: "Materialgemeinkosten %", fgkPct: "Fertigungsgemeinkosten %", vwgkPct: "Verwaltungsgemeinkosten %",
    vtgkPct: "Vertriebsgemeinkosten %", gewinnPct: "Gewinn %", skontoPct: "Kundenskonto %", provisionPct: "Provision %", rabattPct: "Kundenrabatt %",
    handlungskostenPct: "Handlungskosten % (Zukauf)", ustSatz: "USt %" };

  function zahl(x) { if (x === "" || x == null) return null; var n = Number(x); return Number.isFinite(n) ? n : null; }
  function rund(x) { return Math.round(x); }
  function kopie(x) { return JSON.parse(JSON.stringify(x)); }
  function finde(liste, id) { return (liste || []).filter(function (x) { return x.id === id; })[0] || null; }
  function hatEigen(o, k) { return o && Object.prototype.hasOwnProperty.call(o, k) && o[k] !== "" && o[k] != null; }

  /* ── Satz-Ebenen ── */
  function saetzeFuer(kat, vorlage, pos, angebot, kunde) {
    var gebiet = finde(kat.gebiete, vorlage && vorlage.gebiet) || (kat.gebiete || [])[0] || { saetze: {}, klassen: {} };
    var s = {}, quelle = {};
    SATZ_KEYS.forEach(function (k) {
      if (hatEigen(pos && pos.saetze, k)) { s[k] = pos.saetze[k]; quelle[k] = "position"; }
      else if (hatEigen(angebot && angebot.saetze, k)) { s[k] = angebot.saetze[k]; quelle[k] = "angebot"; }
      else if (hatEigen(vorlage && vorlage.saetze, k)) { s[k] = vorlage.saetze[k]; quelle[k] = "vorlage"; }
      else if (hatEigen(gebiet.saetze, k)) { s[k] = gebiet.saetze[k]; quelle[k] = "gebiet"; }
      else { s[k] = k === "modus" ? "einfach" : 0; quelle[k] = "vorgabe"; }
    });
    /* Kundenklasse — nur auf Werte, die NICHT an Position/Angebot gesetzt sind */
    var klasse = kunde && kunde.klasse ? String(kunde.klasse) : "";
    var kl = (gebiet.klassen || {})[klasse] || null;
    if (kl) {
      ["stundensatzCent", "lohnCent"].forEach(function (k) {
        if (quelle[k] !== "position" && quelle[k] !== "angebot" && zahl(kl.stundenPct)) { s[k] = Number(s[k]) * (1 + Number(kl.stundenPct) / 100); quelle[k] += "+klasse"; }
      });
      if (quelle.gewinnPct !== "position" && quelle.gewinnPct !== "angebot" && zahl(kl.gewinnPct)) { s.gewinnPct = Number(s.gewinnPct) + Number(kl.gewinnPct); quelle.gewinnPct += "+klasse"; }
    }
    return { s: s, quelle: quelle, klasse: klasse, gebiet: gebiet };
  }
  /* Vereinfacht → dieselben Felder wie ausführlich (ein Rechenweg) */
  function effektiv(s) {
    if (s.modus === "voll") return { lohnCent: +s.lohnCent || 0, mgkPct: +s.mgkPct || 0, fgkPct: +s.fgkPct || 0, vwgkPct: +s.vwgkPct || 0, vtgkPct: +s.vtgkPct || 0,
      gewinnPct: +s.gewinnPct || 0, skontoPct: +s.skontoPct || 0, provisionPct: +s.provisionPct || 0, rabattPct: +s.rabattPct || 0 };
    return { lohnCent: +s.stundensatzCent || 0, mgkPct: +s.materialzuschlagPct || 0, fgkPct: 0, vwgkPct: +s.gkPct || 0, vtgkPct: 0,
      gewinnPct: +s.gewinnPct || 0, skontoPct: +s.skontoPct || 0, provisionPct: +s.provisionPct || 0, rabattPct: +s.rabattPct || 0 };
  }

  /* ── Das Schema selbst (auch für das Lehrbuch-Beispiel und die Rechner) ──
     z: { mek, fek, maschine } in Cent · e: effektive Sätze */
  function schema(z, e) {
    var mek = rund(z.mek || 0), fek = rund(z.fek || 0), masch = rund(z.maschine || 0);
    var mgk = rund(mek * e.mgkPct / 100), mk = mek + mgk;
    var fgk = rund(fek * e.fgkPct / 100), fk = fek + fgk + masch;
    var hk = mk + fk;
    var vw = rund(hk * e.vwgkPct / 100), vt = rund(hk * e.vtgkPct / 100), sk = hk + vw + vt;
    var gew = rund(sk * e.gewinnPct / 100), bvp = sk + gew;
    var abzug = 1 - (e.skontoPct + e.provisionPct) / 100;
    var zvp = abzug > 0 ? rund(bvp / abzug) : NaN;
    var lvp = e.rabattPct < 100 ? rund(zvp / (1 - e.rabattPct / 100)) : NaN;
    return {
      mek: mek, mgk: mgk, materialkosten: mk, fek: fek, fgk: fgk, maschine: masch, fertigungskosten: fk, herstellkosten: hk,
      vwgk: vw, vtgk: vt, selbstkosten: sk, gewinn: gew, barverkaufspreis: bvp, skontoProv: zvp - bvp, zielverkaufspreis: zvp,
      rabatt: lvp - zvp, listenpreis: lvp,
      zeilen: [
        ["mek", "Materialeinzelkosten", mek], ["mgk", "+ Materialgemeinkosten " + e.mgkPct + " %", mgk], ["materialkosten", "= Materialkosten", mk],
        ["fek", "Fertigungslohn", fek], ["fgk", "+ Fertigungsgemeinkosten " + e.fgkPct + " %", fgk], ["maschine", "+ Maschinenkosten", masch],
        ["fertigungskosten", "= Fertigungskosten", fk], ["herstellkosten", "= Herstellkosten", hk],
        ["vwgk", "+ Verwaltungsgemeinkosten " + e.vwgkPct + " %", vw], ["vtgk", "+ Vertriebsgemeinkosten " + e.vtgkPct + " %", vt],
        ["selbstkosten", "= Selbstkosten", sk], ["gewinn", "+ Gewinn " + r2(e.gewinnPct) + " %", gew], ["barverkaufspreis", "= Barverkaufspreis", bvp],
        ["skontoProv", "+ Skonto/Provision " + (e.skontoPct + e.provisionPct) + " % (im Hundert)", zvp - bvp], ["zielverkaufspreis", "= Zielverkaufspreis", zvp],
        ["rabatt", "+ Kundenrabatt " + e.rabattPct + " % (im Hundert)", lvp - zvp], ["listenpreis", "= Listenpreis netto", lvp],
      ].map(function (z) { return { key: z[0], text: z[1], cent: z[2] }; }),
    };
  }
  function r2(x) { return Math.round(x * 100) / 100; }

  /* Handelskalkulation (Zukauf statt Eigenfertigung): Bezugspreis × (1 + Handlungskosten) × (1 + Gewinn) */
  function handel(ekCent, s) {
    var bez = rund(+ekCent || 0), hk = rund(bez * (+s.handlungskostenPct || 0) / 100), sk = bez + hk, gew = rund(sk * (+s.gewinnPct || 0) / 100);
    return { bezugspreis: bez, handlungskosten: hk, selbstkosten: sk, gewinn: gew, netto: sk + gew };
  }

  /* ── Handelsware (Einkaufsprodukt, Klaus 2026-10-13): fertig eingekauft, mit Aufschlag weiterverkauft ──
     vorlage.einkauf = [{ menge, gesamtCent, lieferant, url, datum }] — Komplettpreis je Menge INKL. Versand.
     Verkauf = handel(Einkauf) als EINE Position, ebenfalls inkl. Versand (kein eigener Versandposten, s. angebot.js).
     Staffel (Klaus 2026-10-13: „innerhalb der Staffelung steht der Preis ja fest“): ein Einkauf gilt AB seiner Menge.
     Steht für die Menge selbst nichts da, zählt der Stückpreis der nächstkleineren Staffel × Menge (20 Tassen = je Stück
     aus „10 Stk.“ × 20). Das ist gerechnet, nicht geschätzt. Unter der kleinsten Staffel bleibt die Position offen.
     Mehrere Einkäufe für dieselbe Menge (Lieferanten im Vergleich): der günstigste zählt, und es steht dabei. */
  function einkaufFuer(vorlage, menge) {
    var alle = (vorlage.einkauf || []).filter(function (x) { return x && Math.round(+x.menge) > 0 && zahl(x.gesamtCent) != null; });
    function guenstigste(m) {
      var l = alle.filter(function (x) { return Math.round(+x.menge) === m; });
      l.sort(function (a, b) { return a.gesamtCent - b.gesamtCent; });
      return l;
    }
    var genau = guenstigste(menge);
    if (genau.length) return { treffer: genau[0], anzahl: genau.length, ab: menge, gesamtCent: Math.round(+genau[0].gesamtCent), staffel: false };
    /* eine Zeile für genau diese Menge ohne Preis: offen („Einkaufspreis fehlt“), nicht still aus der kleineren Staffel */
    var halb = (vorlage.einkauf || []).some(function (x) { return x && Math.round(+x.menge) === menge; });
    var ab = 0;
    if (!halb) alle.forEach(function (x) { var m = Math.round(+x.menge); if (m < menge && m > ab) ab = m; });
    if (!ab || !(menge > 0)) return { treffer: null, anzahl: 0, ab: 0, gesamtCent: null, staffel: false };
    var l = guenstigste(ab);
    return { treffer: l[0], anzahl: l.length, ab: ab, gesamtCent: Math.round(+l[0].gesamtCent * menge / ab), staffel: true };
  }
  function einkaufsMengen(vorlage) {
    var m = (vorlage.einkauf || []).map(function (x) { return Math.round(+x.menge); }).filter(function (n) { return n > 0; });
    return m.filter(function (n, i) { return m.indexOf(n) === i; }).sort(function (a, b) { return a - b; });
  }
  function handelPosition(kat, vorlage, pos, menge, sf, e) {
    var offen = [], weg = [];
    var ek = einkaufFuer(vorlage, menge), ein = ek.treffer, mengen = einkaufsMengen(vorlage), einh = " " + (vorlage.einheitText || "Stk.");
    if (!ein) {
      var stehtDa = (vorlage.einkauf || []).some(function (x) { return x && Math.round(+x.menge) === menge; });
      offen.push(stehtDa ? "Einkaufspreis für " + menge + einh + " fehlt"
        : "für " + menge + einh + " ist kein Einkauf eingetragen" + (mengen.length ? " — kleinste Staffel: " + mengen[0] + einh + " (eingetragen: " + mengen.join(", ") + ")" : ""));
    }
    var bez = ein ? ek.gesamtCent : 0, hd = handel(bez, sf.s);
    var lf = ein ? finde(kat.lieferanten, ein.lieferant) : null;
    if (ein) {
      var eu = function (c) { return (c / 100).toFixed(2).replace(".", ",") + " €"; };
      if (ek.staffel) weg.push("Staffel ab " + ek.ab + einh + ": Einkauf " + ek.ab + einh + " komplett inkl. Versand " + eu(Math.round(+ein.gesamtCent)) +
        " → je " + einh.trim() + " " + eu(Math.round(+ein.gesamtCent / ek.ab)) + " × " + menge + " = " + eu(bez) + (lf ? " · " + lf.name : "") + (ein.datum ? " · Stand " + ein.datum : ""));
      else weg.push("Einkauf " + menge + einh + " komplett inkl. Versand: " + eu(bez) + (lf ? " · " + lf.name : "") + (ein.datum ? " · Stand " + ein.datum : ""));
      if (ek.anzahl > 1) weg.push(ek.anzahl + " Einkäufe für " + ek.ab + einh + " eingetragen — der günstigste zählt");
      weg.push("+ Handlungskosten " + r2(+sf.s.handlungskostenPct || 0) + " % · + Gewinn " + r2(+sf.s.gewinnPct || 0) + " % → Verkauf komplett inkl. Versand, ohne eigenen Versandposten");
    }
    var zeilen = [["bezugspreis", ek.staffel ? "Einkauf inkl. Versand — Stückpreis aus der Staffel ab " + ek.ab + einh + " × " + menge + " (Bezugspreis)" : "Einkauf komplett inkl. Versand (Bezugspreis)", hd.bezugspreis], ["handlungskosten", "+ Handlungskosten " + r2(+sf.s.handlungskostenPct || 0) + " %", hd.handlungskosten],
      ["selbstkosten", "= Selbstkosten", hd.selbstkosten], ["gewinn", "+ Gewinn " + r2(+sf.s.gewinnPct || 0) + " %", hd.gewinn], ["listenpreis", "= Verkauf komplett inkl. Versand netto", hd.netto]]
      .map(function (z) { return { key: z[0], text: z[1], cent: z[2] }; });
    var sch = { herstellkosten: hd.bezugspreis, selbstkosten: hd.selbstkosten, listenpreis: hd.netto, zeilen: zeilen };
    var eigen = pos.eigen && zahl(pos.eigen[menge]) != null ? Math.round(+pos.eigen[menge]) : null;
    var netto = eigen != null ? eigen : hd.netto;
    return {
      ok: offen.length === 0, offen: offen, vorlage: vorlage.id, menge: menge, farben: 1, farbFaktor: 1, stiche: 0,
      material: [], zeiten: [], minuten: 0, maschinenH: 0, gewichtG: 0, m2Motiv: 0,
      fek: 0, maschine: 0, mek: hd.bezugspreis, maschinensatzCent: null,
      schema: sch, selbstkosten: hd.selbstkosten, herstellkosten: hd.bezugspreis, nettoKalk: hd.netto,
      eigen: eigen, netto: netto, stueckCent: menge ? Math.round(netto / menge) : 0,
      saetze: sf.s, effektiv: e, quelle: sf.quelle, klasse: sf.klasse, weg: weg,
      platzhalter: !!(sf.gebiet.platzhalter || vorlage.platzhalter || (ein && ein.platzhalter)),
      lage: lage(netto, sch), ustSatz: zahl(sf.s.ustSatz) == null ? 19 : +sf.s.ustSatz,
      handel: { bezugspreis: hd.bezugspreis, handlungskosten: hd.handlungskosten, gewinn: hd.gewinn, lieferant: ein ? String(ein.lieferant || "") : "",
        staffelAb: ek.staffel ? ek.ab : null, lieferantName: lf ? lf.name : "", url: ein ? String(ein.url || (lf && lf.url) || "") : "", datum: ein ? String(ein.datum || "") : "", mengen: mengen },
    };
  }

  /* ── Eine Position rechnen ──
     pos: { vorlage, menge, breiteMm, hoeheMm, farben, verfahren, wahl:{slotId: materialId|""}, zeiten:{schrittId:{…}}, saetze:{}, eigen:{menge: cent} }
     ctx: { angebot, kunde, menge } → Ergebnis mit ok/offen, allen Zeilen und dem Rechenweg */
  function position(kat, pos, ctx) {
    ctx = ctx || {};
    var vorlage = finde(kat.vorlagen, pos.vorlage);
    if (!vorlage) return { ok: false, offen: ["Vorlage fehlt"], weg: [] };
    var menge = Math.max(0, Math.round(Number(ctx.menge != null ? ctx.menge : pos.menge) || 0));
    var sf = saetzeFuer(kat, vorlage, pos, ctx.angebot, ctx.kunde), e = effektiv(sf.s);
    if (vorlage.einkaufsprodukt) return handelPosition(kat, vorlage, pos, menge, sf, e);
    var offen = [], weg = [];
    var verfahren = finde(kat.verfahren, pos.verfahren || vorlage.verfahrenVorgabe);
    if ((vorlage.verfahrenWahl || []).length && !verfahren) offen.push("Verfahren fehlt");
    /* Kein eigenes Gerät (Klaus 2026-10-13: „wenn wir den Laser selber nicht haben, lassen wir die herstellen“) — nicht schätzen,
       sondern die Fremdfertigung nennen: dasselbe Produkt als Einkaufsprodukt (vorlage.fremdVorlage) */
    var fremd = vorlage.fremdVorlage ? finde(kat.vorlagen, vorlage.fremdVorlage) : null;
    if (verfahren && verfahren.vorhanden === false) offen.push(verfahren.name + ": kein eigenes Gerät — fremd fertigen lassen" + (fremd ? " („" + fremd.name + "“, Seite Handelsware)" : ""));
    var farbenMax = Math.max(1, +vorlage.farbenMax || 1);
    var farben = Math.min(farbenMax, Math.max(1, Math.round(+pos.farben || 1)));
    var regel = verfahren ? verfahren.farbregel || "je_farbe" : "ein";
    var ff = regel === "je_farbe" ? farben : 1;
    if (regel === "je_farbe" && farben > 1) weg.push(farben + " Farben · " + (verfahren ? verfahren.name : "") + " → je Farbe eigene Folie, eigene Zeit, eigenes Rüsten");
    if (regel === "digital") weg.push("vierfarbig/digital: Farbzahl ändert nichts an Material und Zeit");
    var eing = { breiteMm: pos.breiteMm, hoeheMm: pos.hoeheMm, menge: menge, abstandMm: vorlage.abstandMm || 0 };
    var basis = M().rechne(vorlage.mengenregel === "stueck" ? "stueck" : "flaeche", eing, {});
    if (!basis.ok && vorlage.mengenregel !== "stueck") offen.push(basis.fehler);
    var m2Motiv = basis.ok ? basis.m2Motiv : 0;
    /* Stickerei: Stichzahl je Stück (Garn, Vlies und Maschinenzeit hängen daran, nicht an der Fläche) */
    var stiche = vorlage.stiche ? Math.max(0, Number(pos.stiche != null && pos.stiche !== "" ? pos.stiche : vorlage.sticheVorgabe) || 0) : 0;
    if (vorlage.stiche && !(stiche > 0)) offen.push("Stichzahl fehlt");
    var tsdStiche = stiche * menge / 1000;
    if (stiche > 0) weg.push(menge + " × " + stiche + " Stiche = " + String(Math.round(tsdStiche * 1000) / 1000).replace(".", ",") + " Tausend Stiche");

    /* Material */
    var mek = 0, gewichtG = 0, material = [];
    (vorlage.slots || []).forEach(function (sl) {
      if (sl.nurBei && sl.nurBei.length && (!verfahren || sl.nurBei.indexOf(verfahren.id) < 0)) return;
      var wahl = pos.wahl && Object.prototype.hasOwnProperty.call(pos.wahl, sl.id) ? pos.wahl[sl.id] : sl.vorgabe;
      if (!wahl) { if (!sl.optional) offen.push(sl.name + ": kein Material gewählt"); return; }
      var mat = finde(kat.materialien, wahl);
      if (!mat) { offen.push(sl.name + ": Material „" + wahl + "“ fehlt im Katalog"); return; }
      var r = sl.bezug === "regel" ? M().rechne(vorlage.mengenregel, eing, mat) : basis;
      if (!r.ok && sl.bezug !== "stiche") { offen.push(sl.name + ": " + r.fehler); return; }
      var q = sl.bezug === "stiche" ? (mat.einheit === "tsd_stiche" ? tsdStiche : null) : M().mengeFuer(mat.einheit, sl.bezug || "regel", r, eing);
      if (q == null) { offen.push(sl.name + ": Einheit „" + mat.einheit + "“ passt nicht zur Mengenregel"); return; }
      var fak = sl.jeFarbe ? ff : 1;
      var ek = zahl(mat.ekCent);
      if (ek == null) { offen.push(mat.name + ": Einkaufspreis fehlt"); return; }
      var cent = rund(q * fak * ek * (1 + (+mat.verschnittPct || 0) / 100));
      /* Gewicht: was hinausgeht, nicht was verbraucht wurde (Verschnitt und Plattenrest bleiben in der Werkstatt) */
      var anteil = sl.bezug === "regel" && r.m2 > 0 && r.m2Motiv > 0 ? Math.min(1, r.m2Motiv / r.m2) : 1;
      mek += cent; gewichtG += q * fak * (+mat.gewichtG || 0) * anteil;
      material.push({ slot: sl.id, name: mat.name, menge: Math.round(q * fak * 1000) / 1000, einheit: mat.einheit, cent: cent, platzhalter: !!mat.platzhalter });
      weg.push(sl.name + ": " + mat.name + " " + String(Math.round(q * fak * 1000) / 1000).replace(".", ",") + " " + mat.einheit +
        (fak > 1 ? " (" + fak + " Farben)" : "") + " × " + (ek / 100).toFixed(2).replace(".", ",") + " €" +
        (+mat.verschnittPct ? " + " + mat.verschnittPct + " % Verschnitt" : "") + (r.weg && r.weg[0] && sl.bezug === "regel" ? " · " + r.weg[0] : ""));
    });
    gewichtG += menge * (+vorlage.gewichtJeStueckG || 0);

    /* Arbeitszeit aus dem Muster der Vorlage, je Position überschreibbar */
    var minuten = 0, zeiten = [];
    (vorlage.schritte || []).forEach(function (st) {
      if (st.nurBei && st.nurBei.length && (!verfahren || st.nurBei.indexOf(verfahren.id) < 0)) return;
      if (st.nurMitSlot) { var w = pos.wahl && Object.prototype.hasOwnProperty.call(pos.wahl, st.nurMitSlot) ? pos.wahl[st.nurMitSlot] : (finde(vorlage.slots, st.nurMitSlot) || {}).vorgabe; if (!w) return; }
      var ov = (pos.zeiten || {})[st.id] || {};
      var ruest = zahl(ov.ruestMin) != null ? +ov.ruestMin : +st.ruestMin || 0;
      var jeSt = zahl(ov.minJeStueck) != null ? +ov.minJeStueck : +st.minJeStueck || 0;
      var jeM2 = zahl(ov.minJeM2) != null ? +ov.minJeM2 : +st.minJeM2 || 0;
      var fak = st.jeFarbe ? ff : 1;
      var min = (ruest + jeSt * menge + jeM2 * m2Motiv) * fak;
      minuten += min;
      zeiten.push({ schritt: st.id, name: st.name, minuten: Math.round(min * 100) / 100, eigen: !!(pos.zeiten && pos.zeiten[st.id]) });
    });
    var fek = rund(minuten / 60 * e.lohnCent);
    if (minuten) weg.push("Arbeitszeit " + String(Math.round(minuten * 10) / 10).replace(".", ",") + " min × " + (e.lohnCent / 100).toFixed(2).replace(".", ",") + " €/h");

    /* Maschine */
    var maschine = 0, maschinenH = 0;
    if (verfahren) {
      var ms = zahl(verfahren.maschinensatzCent);
      var leist = +verfahren.leistung || 0;
      var arbeit = verfahren.leistungEinheit === "m2" ? m2Motiv : verfahren.leistungEinheit === "tsd_stiche" ? tsdStiche : menge;
      maschinenH = (leist > 0 ? arbeit / leist : 0) + (+verfahren.ruestMin || 0) / 60;
      if (verfahren.jeFarbe) maschinenH *= ff;
      if (ms == null) { if (maschinenH > 0) offen.push(verfahren.name + ": Maschinenstundensatz fehlt"); }
      else { maschine = rund(maschinenH * ms); if (maschine) weg.push(verfahren.name + ": " + String(Math.round(maschinenH * 100) / 100).replace(".", ",") + " h × " + (ms / 100).toFixed(2).replace(".", ",") + " €/h"); }
    }

    var sch = schema({ mek: mek, fek: fek, maschine: maschine }, e);
    var eigen = pos.eigen && zahl(pos.eigen[menge]) != null ? Math.round(+pos.eigen[menge]) : null;
    var netto = eigen != null ? eigen : sch.listenpreis;
    var platzhalter = !!(sf.gebiet.platzhalter || material.some(function (m) { return m.platzhalter; }) || (verfahren && verfahren.platzhalter));
    return {
      ok: offen.length === 0, offen: offen, vorlage: vorlage.id, menge: menge, farben: farben, fremd: fremd && verfahren && verfahren.vorhanden === false ? fremd.id : "", farbFaktor: ff, stiche: stiche,
      material: material, zeiten: zeiten, minuten: Math.round(minuten * 100) / 100, maschinenH: Math.round(maschinenH * 1000) / 1000,
      gewichtG: Math.round(gewichtG), m2Motiv: m2Motiv,
      fek: fek, maschine: maschine, mek: mek, maschinensatzCent: verfahren ? zahl(verfahren.maschinensatzCent) : null,
      schema: sch, selbstkosten: sch.selbstkosten, herstellkosten: sch.herstellkosten, nettoKalk: sch.listenpreis,
      eigen: eigen, netto: netto, stueckCent: menge ? Math.round(netto / menge) : 0,
      saetze: sf.s, effektiv: e, quelle: sf.quelle, klasse: sf.klasse, platzhalter: platzhalter, weg: weg,
      lage: lage(netto, sch), ustSatz: zahl(sf.s.ustSatz) == null ? 19 : +sf.s.ustSatz,
    };
  }

  /* Verlustgrenze: unter Herstellkosten · unter Selbstkosten · ok */
  function lage(netto, sch) {
    if (netto < sch.herstellkosten) return "unter_hk";
    if (netto < sch.selbstkosten) return "unter_sk";
    return "ok";
  }

  /* Staffel: dieselbe Position für mehrere Mengen */
  function staffel(kat, pos, ctx) {
    var mengen = (pos.staffeln && pos.staffeln.length ? pos.staffeln : [pos.menge]).map(Number).filter(function (n) { return n > 0; });
    return mengen.map(function (m) { return position(kat, pos, Object.assign({}, ctx, { menge: m })); });
  }

  /* ── Rückrechnung: welcher Wert ergibt genau den Zielpreis? (nach BookLedgerPro kalkuliereRueckwaerts) ──
     weg: "gewinn" (Gewinn-% der Vorlage) · "stundensatz" (Satz der Vorlage) · "minuten" (Faktor auf das Zeit-Muster) */
  var WEGE = {
    gewinn: { lo: -95, hi: 2000, setze: function (v, x) { v.saetze = Object.assign({}, v.saetze, { gewinnPct: x }); } },
    stundensatz: { lo: 0, hi: 5e6, setze: function (v, x, kat) {
      var modus = (saetzeFuer(kat, v, {}, null, null).s.modus);
      v.saetze = Object.assign({}, v.saetze); v.saetze[modus === "voll" ? "lohnCent" : "stundensatzCent"] = x; } },
    minuten: { lo: 0, hi: 200, setze: function (v, x, kat, basis) {
      v.schritte = basis.schritte.map(function (s) { return Object.assign({}, s, { ruestMin: (+s.ruestMin || 0) * x, minJeStueck: (+s.minJeStueck || 0) * x, minJeM2: (+s.minJeM2 || 0) * x }); }); } },
  };
  function rueckrechnen(kat, pos, ctx, zielCent, weg) {
    var W = WEGE[weg]; if (!W) return { ok: false, grund: "unbekannter Weg" };
    var basisV = finde(kat.vorlagen, pos.vorlage); if (!basisV) return { ok: false, grund: "Vorlage fehlt" };
    var p = kopie(pos); delete p.eigen;
    function f(x) {
      var k = kopie(kat), v = finde(k.vorlagen, pos.vorlage);
      W.setze(v, x, k, basisV);
      return position(k, p, ctx).nettoKalk;
    }
    var lo = W.lo, hi = W.hi;
    if (f(lo) === f(hi)) return { ok: false, grund: "Dieser Wert wirkt hier nicht (an Position oder Angebot ausdrücklich gesetzt, oder er kommt in der Rechnung nicht vor)." };
    if (f(hi) < zielCent || f(lo) > zielCent) return { ok: false, grund: "Zielpreis ist auf diesem Weg nicht erreichbar." };
    for (var i = 0; i < 90; i++) { var mid = (lo + hi) / 2; if (f(mid) >= zielCent) hi = mid; else lo = mid; }
    var wert = Math.round(hi * 1e6) / 1e6;
    if (f(wert) < zielCent) wert = hi;
    return { ok: true, weg: weg, wert: wert, netto: f(wert), diff: f(wert) - zielCent };
  }
  /* In die Vorlage übernehmen — mit Verlauf (alt → neu), rücknehmbar */
  function uebernehmen(kat, vorlageId, weg, wert, info) {
    var v = finde(kat.vorlagen, vorlageId); if (!v) return { ok: false };
    var alt = { saetze: kopie(v.saetze || {}), schritte: kopie(v.schritte || []) };
    WEGE[weg].setze(v, wert, kat, { schritte: kopie(v.schritte || []) });
    var eintrag = Object.assign({ nr: (v.verlauf || []).length + 1, weg: weg, wert: wert, alt: alt, neu: { saetze: kopie(v.saetze || {}), schritte: kopie(v.schritte || []) } }, info || {});
    v.verlauf = (v.verlauf || []).concat([eintrag]);
    return { ok: true, eintrag: eintrag };
  }
  function ruecknehmen(kat, vorlageId, nr) {
    var v = finde(kat.vorlagen, vorlageId); if (!v) return { ok: false };
    var e = (v.verlauf || []).filter(function (x) { return x.nr === nr; })[0];
    if (!e || e.zurueck) return { ok: false };
    v.saetze = kopie(e.alt.saetze); v.schritte = kopie(e.alt.schritte);
    e.zurueck = true;
    return { ok: true };
  }

  /* ── Rechner in den Einstellungen ── */
  /* Stundenverrechnungssatz = (Lohn + Lohnnebenkosten + Gemeinkosten + Gewinn) ÷ produktive Stunden */
  function stundensatzRechner(x) {
    var lohn = +x.lohnJahrCent || 0, neben = rund(lohn * (+x.lohnnebenPct || 0) / 100), gk = +x.gemeinkostenJahrCent || 0, gew = +x.gewinnJahrCent || 0;
    var std = +x.produktiveStunden || 0;
    if (!(std > 0)) return { ok: false, grund: "produktive Stunden fehlen" };
    var summe = lohn + neben + gk + gew;
    return { ok: true, lohnneben: neben, summe: summe, satzCent: rund(summe / std) };
  }
  /* Zuschlagssätze aus Jahreskosten (vereinfachter Betriebsabrechnungsbogen) */
  function zuschlagsRechner(x) {
    var mek = +x.mekCent || 0, fl = +x.fertigungslohnCent || 0, mgk = +x.mgkCent || 0, fgk = +x.fgkCent || 0, vw = +x.vwgkCent || 0, vt = +x.vtgkCent || 0;
    if (!(mek > 0 && fl > 0)) return { ok: false, grund: "Materialeinzelkosten und Fertigungslöhne fehlen" };
    var hk = mek + mgk + fl + fgk;
    function pct(a, b) { return Math.round(a / b * 10000) / 100; }
    return { ok: true, mgkPct: pct(mgk, mek), fgkPct: pct(fgk, fl), herstellkosten: hk, vwgkPct: pct(vw, hk), vtgkPct: pct(vt, hk) };
  }

  WC.kalk = { SATZ_KEYS: SATZ_KEYS, SATZ_LABEL: SATZ_LABEL, saetzeFuer: saetzeFuer, effektiv: effektiv, schema: schema, handel: handel,
    position: position, staffel: staffel, lage: lage, rueckrechnen: rueckrechnen, uebernehmen: uebernehmen, ruecknehmen: ruecknehmen,
    stundensatzRechner: stundensatzRechner, zuschlagsRechner: zuschlagsRechner, finde: finde, kopie: kopie, einkaufFuer: einkaufFuer, einkaufsMengen: einkaufsMengen };
})(typeof window !== "undefined" ? window : globalThis);
