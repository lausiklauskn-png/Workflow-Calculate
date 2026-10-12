/* Nachkalkulation — Plan gegen Ist (Muster: BookLedgerPro nachkalkulation.js, Workflow-Needs „Schätzung und Ist“).
   Rechnet nur; die Eingabe steht in app.js. Erfasst wird am GESTELLTEN Angebot (a.ist), gerechnet mit dessen
   eingefrorenem Stand — verglichen wird mit dem, was angeboten wurde, nicht mit dem heutigen Katalog.

   a.ist = { pos: { "P-1": { minuten, materialCent, maschinenH } }, versandCent, datum, notiz }
   ⚠ Ein leeres Feld heißt „nicht erfasst“, nicht 0. Es zählt dann mit dem Plan, und das wird gesagt.
   ⚠ Ist-Minuten sind ARBEITSzeit (Lohn) — die Maschinenlaufzeit steht getrennt (maschinenH).
   Klassisches Skript: window.WC.nachkalk bzw. globalThis.WC.nachkalk. */
(function (g) {
  "use strict";
  var WC = g.WC = g.WC || {};
  var FELDER = ["minuten", "materialCent", "maschinenH"];
  var PASST_PCT = 2;
  function zahl(x) { if (x === "" || x == null) return null; var n = Number(x); return Number.isFinite(n) && n >= 0 ? n : null; }
  function rund(x) { return Math.round(x); }

  function istVon(a, pid) { return (a && a.ist && a.ist.pos && a.ist.pos[pid]) || {}; }
  function erfassteFelder(ist) { return FELDER.filter(function (f) { return zahl(ist[f]) != null; }); }

  /* Eine Position: erg = WC.kalk.position(…) des gestellten Angebots */
  function position(erg, ist) {
    ist = ist || {};
    var felder = erfassteFelder(ist);
    var min = zahl(ist.minuten), mat = zahl(ist.materialCent), mh = zahl(ist.maschinenH);
    var fek = min != null ? rund(min / 60 * erg.effektiv.lohnCent) : erg.fek;
    var mek = mat != null ? rund(mat) : erg.mek;
    var masch = mh != null && erg.maschinensatzCent != null ? rund(mh * erg.maschinensatzCent) : erg.maschine;
    var sch = WC.kalk.schema({ mek: mek, fek: fek, maschine: masch }, erg.effektiv);
    return {
      felder: felder, erfasst: felder.length > 0,
      plan: { minuten: erg.minuten, mek: erg.mek, fek: erg.fek, maschine: erg.maschine, maschinenH: erg.maschinenH, selbstkosten: erg.selbstkosten },
      ist: { minuten: min, mek: mek, fek: fek, maschine: masch, maschinenH: mh, selbstkosten: sch.selbstkosten },
      netto: erg.netto,
      dbPlan: erg.netto - erg.selbstkosten, dbIst: erg.netto - sch.selbstkosten,
      skDiff: sch.selbstkosten - erg.selbstkosten,
      minutenPct: min != null && erg.minuten > 0 ? Math.round((min / erg.minuten - 1) * 1000) / 10 : null,
    };
  }

  /* Ein Angebot: r = WC.angebot.rechne(a, …) — mit dem eingefrorenen Stand */
  function angebot(a, r) {
    var pos = r.positionen.filter(function (x) { return x.erg.ok; }).map(function (x) {
      return Object.assign({ id: x.pos.id, titel: x.pos.titel, vorlage: x.pos.vorlage }, position(x.erg, istVon(a, x.pos.id)));
    });
    var vPlan = r.versand.ok ? r.versand.cent || 0 : 0, vIstRoh = zahl(a.ist && a.ist.versandCent), vIst = vIstRoh != null ? rund(vIstRoh) : vPlan;
    var skPlan = vPlan, skIst = vIst, netto = vPlan;
    pos.forEach(function (p) { skPlan += p.plan.selbstkosten; skIst += p.ist.selbstkosten; netto += p.netto; });
    var erfasst = pos.filter(function (p) { return p.erfasst; }).length;
    return { positionen: pos, versand: { plan: vPlan, ist: vIstRoh != null ? vIst : null },
      summe: { netto: netto, skPlan: skPlan, skIst: skIst, dbPlan: netto - skPlan, dbIst: netto - skIst, erfasst: erfasst, gesamt: pos.length,
        ausPlan: pos.length - erfasst, versandErfasst: vIstRoh != null } };
  }

  /* Über alle gestellten Angebote: Arbeitszeit je Vorlage, Plan gegen Ist.
     rechneFn(a) → WC.angebot.rechne(a, …). Nur Positionen mit erfassten Minuten und Plan-Minuten > 0 zählen. */
  function jeVorlage(angebote, rechneFn) {
    var m = {};
    (angebote || []).forEach(function (a) {
      if (a.status !== "gestellt" || !a.ist || !a.ist.pos) return;
      var r = rechneFn(a);
      r.positionen.forEach(function (x) {
        if (!x.erg.ok) return;
        var ist = zahl(istVon(a, x.pos.id).minuten);
        if (ist == null || !(x.erg.minuten > 0)) return;
        var z = m[x.pos.vorlage] = m[x.pos.vorlage] || { vorlage: x.pos.vorlage, n: 0, planMin: 0, istMin: 0, angebote: [] };
        z.n++; z.planMin += x.erg.minuten; z.istMin += ist;
        if (z.angebote.indexOf(a.nummer) < 0) z.angebote.push(a.nummer);
      });
    });
    return Object.keys(m).map(function (k) {
      var z = m[k];
      z.planMin = Math.round(z.planMin * 100) / 100;
      z.faktor = Math.round(z.istMin / z.planMin * 1000) / 1000;
      z.passt = Math.abs(z.faktor - 1) * 100 < PASST_PCT;
      return z;
    });
  }

  /* Den Faktor ins Zeit-Muster der Vorlage übernehmen — über denselben Weg wie „eigener Preis lernen“, mit Verlauf, rücknehmbar */
  /* Derselbe Befund darf nur EINMAL übernommen werden — sonst wüchse das Muster bei jedem Tipp um denselben Faktor.
     Der Schlüssel steht im Verlauf; wird der Eintrag zurückgenommen, ist der Weg wieder frei. */
  function schluessel(z) { return [z.vorlage, z.angebote.join(","), z.n, z.istMin, z.planMin].join("|"); }
  function schonUebernommen(kat, z) {
    var v = WC.kalk.finde(kat.vorlagen, z.vorlage);
    return !!(v && (v.verlauf || []).some(function (e) { return e.nk === schluessel(z) && !e.zurueck; }));
  }
  function kalibrieren(kat, z, datum) {
    if (!(z && z.faktor > 0)) return { ok: false, grund: "kein Faktor" };
    if (z.passt) return { ok: false, grund: "passt schon (Abweichung unter " + PASST_PCT + " %)" };
    if (!WC.kalk.finde(kat.vorlagen, z.vorlage)) return { ok: false, grund: "die Vorlage steht nicht mehr im Katalog" };
    if (schonUebernommen(kat, z)) return { ok: false, grund: "schon übernommen" };
    return WC.kalk.uebernehmen(kat, z.vorlage, "minuten", z.faktor, { datum: datum, anlass: "Nachkalkulation: " + z.n + " Position(en), Ist " + Math.round(z.istMin) + " min statt " + Math.round(z.planMin) + " min",
      angebot: z.angebote.join(", "), nk: schluessel(z) });
  }

  WC.nachkalk = { FELDER: FELDER, PASST_PCT: PASST_PCT, istVon: istVon, erfassteFelder: erfassteFelder, position: position, angebot: angebot, jeVorlage: jeVorlage, schonUebernommen: schonUebernommen, kalibrieren: kalibrieren };
})(typeof window !== "undefined" ? window : globalThis);
