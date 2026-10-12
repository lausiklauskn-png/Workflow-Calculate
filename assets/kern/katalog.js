/* Stammdaten: Arbeitsgebiete, Materialien, Verfahren, Produktvorlagen, Verpackungen, Versandtarife.
   Alles von Hand erweiterbar; hier nur Prüfen, Ex-/Import und Zählen der Platzhalter.
   Klassisches Skript: window.WC.katalog bzw. globalThis.WC.katalog. */
(function (g) {
  "use strict";
  var WC = g.WC = g.WC || {};
  var LISTEN = ["gebiete", "materialien", "verfahren", "vorlagen", "verpackungen", "versand"];
  /* Darf fehlen (Kataloge von vor der Handelsware) — fehlt sie, heißt das „keine Lieferanten“, kein Fehler */
  var ZUSATZ = ["lieferanten"];
  var FUER = ["wiederverkaeufer", "privat", "beides"];
  var EINHEITEN = ["m2", "lfm", "stueck", "platte", "tsd_stiche"];
  var FARBREGELN = ["ein", "je_farbe", "digital"];

  function kopie(x) { return JSON.parse(JSON.stringify(x)); }
  function ids(l) { return (l || []).map(function (x) { return x.id; }); }

  /* prueft(kat) → Liste von Sätzen; leer = in Ordnung */
  function pruefe(kat) {
    var f = [];
    if (!kat || typeof kat !== "object") return ["kein Katalog"];
    LISTEN.forEach(function (l) {
      if (!Array.isArray(kat[l])) { f.push("Liste „" + l + "“ fehlt"); return; }
      var gesehen = {};
      kat[l].forEach(function (x) {
        if (!x || !x.id) f.push(l + ": Eintrag ohne Kennung");
        else if (gesehen[x.id]) f.push(l + ": Kennung „" + x.id + "“ doppelt");
        else gesehen[x.id] = 1;
      });
    });
    ZUSATZ.forEach(function (l) {
      if (kat[l] == null) return;
      if (!Array.isArray(kat[l])) { f.push("Liste „" + l + "“ ist keine Liste"); return; }
      var gesehen = {};
      kat[l].forEach(function (x) {
        if (!x || !x.id) f.push(l + ": Eintrag ohne Kennung");
        else if (gesehen[x.id]) f.push(l + ": Kennung „" + x.id + "“ doppelt");
        else gesehen[x.id] = 1;
      });
    });
    if (f.length) return f;
    var mat = ids(kat.materialien), ver = ids(kat.verfahren), geb = ids(kat.gebiete);
    kat.materialien.forEach(function (m) { if (EINHEITEN.indexOf(m.einheit) < 0) f.push("Material „" + m.id + "“: Einheit „" + m.einheit + "“ unbekannt"); });
    kat.verfahren.forEach(function (v) { if (v.farbregel && FARBREGELN.indexOf(v.farbregel) < 0) f.push("Verfahren „" + v.id + "“: Farbregel „" + v.farbregel + "“ unbekannt"); });
    kat.vorlagen.forEach(function (v) {
      if (geb.indexOf(v.gebiet) < 0) f.push("Vorlage „" + v.id + "“: Arbeitsgebiet „" + v.gebiet + "“ fehlt");
      if (WC.mengen && WC.mengen.REGELN.indexOf(v.mengenregel) < 0) f.push("Vorlage „" + v.id + "“: Mengenregel „" + v.mengenregel + "“ unbekannt");
      (v.verfahrenWahl || []).forEach(function (x) { if (ver.indexOf(x) < 0) f.push("Vorlage „" + v.id + "“: Verfahren „" + x + "“ fehlt"); });
      (v.slots || []).forEach(function (s) {
        (s.wahl || []).forEach(function (x) { if (mat.indexOf(x) < 0) f.push("Vorlage „" + v.id + "“, " + s.name + ": Material „" + x + "“ fehlt"); });
        if (s.vorgabe && mat.indexOf(s.vorgabe) < 0) f.push("Vorlage „" + v.id + "“, " + s.name + ": Vorgabe „" + s.vorgabe + "“ fehlt");
      });
    });
    return f;
  }

  /* Platzhalter zählen — so lange die Zahlen nicht die eigenen sind, sagt die App das */
  function platzhalter(kat) {
    var n = 0, wo = [];
    LISTEN.forEach(function (l) { (kat[l] || []).forEach(function (x) { if (x.platzhalter) { n++; wo.push(l + ":" + x.id); } }); });
    return { anzahl: n, wo: wo };
  }

  function exportieren(kat) { return JSON.stringify({ art: "workflow-calculate-katalog", fassung: 1, katalog: kat }, null, 1); }
  function importieren(text) {
    var d; try { d = JSON.parse(text); } catch (_e) { return { ok: false, fehler: ["keine lesbare JSON-Datei"] }; }
    var kat = d && d.art === "workflow-calculate-katalog" ? d.katalog : d;
    var f = pruefe(kat);
    return f.length ? { ok: false, fehler: f } : { ok: true, katalog: kat };
  }
  function neueKennung(liste, basis) {
    var b = String(basis || "neu").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "neu", id = b, i = 2;
    while ((liste || []).some(function (x) { return x.id === id; })) id = b + "_" + i++;
    return id;
  }

  /* Ein mitgeliefertes Arbeitsgebiet (WC.STARTKATALOGE[id]) in den eigenen Katalog holen.
     Fügt nur hinzu, was es dort noch nicht gibt (gleiche Kennung = bleibt, wie es ist) — eigene Zahlen werden nie überschrieben. */
  function gebietHinzufuegen(kat, paket) {
    var neu = {}, schonDa = 0;
    LISTEN.concat(ZUSATZ).forEach(function (l) {
      if (!paket[l] && LISTEN.indexOf(l) < 0) { neu[l] = 0; return; }
      neu[l] = 0; kat[l] = kat[l] || [];
      (paket[l] || []).forEach(function (x) {
        if (kat[l].some(function (y) { return y.id === x.id; })) { schonDa++; return; }
        kat[l].push(kopie(x)); neu[l]++;
      });
    });
    return { neu: neu, schonDa: schonDa, summe: LISTEN.reduce(function (s, l) { return s + neu[l]; }, 0) };
  }
  function gebietDa(kat, id) { return (kat.gebiete || []).some(function (g) { return g.id === id; }); }

  /* Hinweise zur Handelsware — sie halten nichts auf. ⚠ Bewusst NICHT in pruefe(): ein Katalog, der pruefe() nicht
     besteht, wird beim Laden durch den Startkatalog ersetzt — eine halb ausgefüllte Einkaufszeile darf das nie auslösen. */
  function hinweise(kat) {
    var f = [];
    (kat.lieferanten || []).forEach(function (x) {
      if (x.fuer && FUER.indexOf(x.fuer) < 0) f.push("Lieferant „" + x.id + "“: „für“ = „" + x.fuer + "“ unbekannt");
      if (x.url && !/^https:\/\//.test(x.url)) f.push("Lieferant „" + x.id + "“: Adresse muss mit https:// beginnen");
    });
    var lie = ids(kat.lieferanten);
    kat.vorlagen.forEach(function (v) {
      if (!v.einkaufsprodukt || !Array.isArray(v.einkauf)) return;
      (v.einkauf || []).forEach(function (e, i) {
        if (!(Math.round(+e.menge) > 0)) f.push("Vorlage „" + v.id + "“, Einkauf " + (i + 1) + ": Menge fehlt");
        if (e.lieferant && lie.indexOf(e.lieferant) < 0) f.push("Vorlage „" + v.id + "“, Einkauf " + (i + 1) + ": Lieferant „" + e.lieferant + "“ fehlt");
        if (e.url && !/^https:\/\//.test(e.url)) f.push("Vorlage „" + v.id + "“, Einkauf " + (i + 1) + ": Adresse muss mit https:// beginnen");
      });
    });
    return f;
  }
  function sichereAdresse(u) { u = String(u || "").trim(); return /^https:\/\/[^\s"<>]+$/.test(u) ? u : ""; }

  /* Einkaufsprodukte stehen nur auf der Seite „🛒 Handelsware“, nicht unter den selbst gefertigten */
  function eigenfertigung(kat) { return (kat.vorlagen || []).filter(function (v) { return !v.einkaufsprodukt; }); }
  function handelsware(kat) { return (kat.vorlagen || []).filter(function (v) { return !!v.einkaufsprodukt; }); }

  WC.katalog = { gebietHinzufuegen: gebietHinzufuegen, gebietDa: gebietDa, LISTEN: LISTEN, ZUSATZ: ZUSATZ, FUER: FUER, eigenfertigung: eigenfertigung, handelsware: handelsware, hinweise: hinweise, sichereAdresse: sichereAdresse, EINHEITEN: EINHEITEN, FARBREGELN: FARBREGELN, pruefe: pruefe, platzhalter: platzhalter,
    exportieren: exportieren, importieren: importieren, neueKennung: neueKennung, kopie: kopie };
})(typeof window !== "undefined" ? window : globalThis);
