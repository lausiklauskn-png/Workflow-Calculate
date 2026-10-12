/* Unterlagen am Angebot (Klaus 2026-10-13: „Ist ein entsprechendes Angebot akzeptiert worden, soll der … Entwurf als
   Beispielbild mit eingefügt werden können. Also verschiedene Ansichten, hergestelltes Produkt … eine Coreldatei … aus einem
   Bildbearbeitungsprogramm oder selbst eine PDF, wo man einen entsprechenden Link hat … Später kann man … genau dieses
   Angebot … wiederholen … oder für andere Kunden übernehmen“ · „Dateien mitgeben an WorkFloh, 50 MB passt“).

   Je Position: p.unterlagen = [{ id: "U-n", art, name, typ, groesse, datei: "D-…" (Blob in IndexedDB „bilder“), url, datum, notiz }]
     art: "entwurf" | "fertig" (Bilder: verschiedene Ansichten) · "datei" (Corel, PSD, AI, PDF, SVG …) · "link" (nur Adresse)
   Unterlagen ändern keinen Preis — darum sind sie auch an einem GESTELLTEN Angebot erlaubt (dort entstehen sie ja erst).
   ⚠ Sie gehen NIE aufs Kundenblatt (aussen.js kennt sie nicht). An WorkFloh gehen sie mit (Klaus' Ja), Links als Text.
   Dateien werden Byte für Byte gespeichert (kein Verkleinern) — höchstens MAX_BYTES je Datei.
   Klassisches Skript: window.WC.unterlagen bzw. globalThis.WC.unterlagen. */
(function (g) {
  "use strict";
  var WC = g.WC = g.WC || {};
  var MAX_BYTES = 50 * 1024 * 1024;
  var ARTEN = { entwurf: "Entwurf", fertig: "Fertiges Produkt", datei: "Datei", link: "Link" };
  var BILD = /^image\/(png|jpeg|webp|gif|svg\+xml)$/;

  function groesseText(n) { n = Number(n) || 0; return n < 1024 ? n + " B" : n < 1048576 ? (n / 1024).toFixed(0) + " KB" : (n / 1048576).toFixed(1).replace(".", ",") + " MB"; }
  function istBild(u) { return !!u && (u.art === "entwurf" || u.art === "fertig") && BILD.test(String(u.typ || "")); }
  /* Dateityp aus der Endung, wenn der Browser keinen nennt (Corel, Photoshop … kennt er oft nicht) */
  var ENDUNG = { cdr: "application/vnd.corel-draw", psd: "image/vnd.adobe.photoshop", ai: "application/postscript", eps: "application/postscript",
    pdf: "application/pdf", svg: "image/svg+xml", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif",
    tif: "image/tiff", tiff: "image/tiff", dxf: "image/vnd.dxf", plt: "application/vnd.hp-hpgl", zip: "application/zip" };
  /* ⚠ Browser melden für unbekannte Endungen oft „application/octet-stream“ statt nichts — dann zählt die Endung */
  function typVon(name, typ) { if (typ && typ !== "application/octet-stream") return String(typ); var e = (/\.([a-z0-9]+)$/i.exec(String(name || "")) || [])[1]; return (e && ENDUNG[e.toLowerCase()]) || "application/octet-stream"; }

  function pruefeDatei(name, groesse) {
    if (!(Number(groesse) > 0)) return { ok: false, grund: "„" + name + "“ ist leer" };
    if (Number(groesse) > MAX_BYTES) return { ok: false, grund: "„" + name + "“ ist " + groesseText(groesse) + " groß — höchstens " + groesseText(MAX_BYTES) + " je Datei" };
    return { ok: true };
  }
  function sichereAdresse(u) { u = String(u || "").trim(); return /^https?:\/\/[^\s"<>]+$/.test(u) ? u : ""; }

  /* Eine Unterlage an die Position hängen → { ok, unterlage } oder { ok:false, grund } */
  function dazu(p, x, datum) {
    p.unterlagen = p.unterlagen || [];
    var art = ARTEN[x.art] ? x.art : "datei";
    if (art === "link") { var u = sichereAdresse(x.url); if (!u) return { ok: false, grund: "Die Adresse muss mit https:// oder http:// beginnen" }; }
    else { var pr = pruefeDatei(x.name, x.groesse); if (!pr.ok) return pr; if (!x.datei) return { ok: false, grund: "Datei fehlt" }; }
    var n = 1; p.unterlagen.forEach(function (q) { var m = /^U-(\d+)$/.exec(q.id); if (m) n = Math.max(n, +m[1] + 1); });
    var neu = { id: "U-" + n, art: art, name: String(x.name || (art === "link" ? x.url : "")).slice(0, 200), typ: art === "link" ? "" : typVon(x.name, x.typ),
      groesse: art === "link" ? 0 : Number(x.groesse) || 0, datei: art === "link" ? "" : String(x.datei), url: art === "link" ? sichereAdresse(x.url) : "",
      datum: datum || "", notiz: String(x.notiz || "").slice(0, 500) };
    /* ein Bild als „Datei“ abgelegt bleibt Datei; ein Nicht-Bild als Entwurf/fertig wird Datei (es lässt sich nicht als Ansicht zeigen) */
    if ((neu.art === "entwurf" || neu.art === "fertig") && !BILD.test(neu.typ)) neu.art = "datei";
    p.unterlagen.push(neu);
    return { ok: true, unterlage: neu };
  }
  function weg(p, id) { p.unterlagen = (p.unterlagen || []).filter(function (u) { return u.id !== id; }); }

  /* Alle Datei-Kennungen (für Vorladen und Sicherung) */
  function dateiIds(angebote) {
    var l = [];
    (angebote || []).forEach(function (a) { (a.positionen || []).forEach(function (p) { (p.unterlagen || []).forEach(function (u) { if (u.datei && l.indexOf(u.datei) < 0) l.push(u.datei); }); }); });
    return l;
  }

  /* Angenommen (Auftrag erteilt) — nur ein gestelltes Angebot. Ändert keinen Preis. */
  function annehmen(a, datum) {
    if (a.status !== "gestellt") return { ok: false, grund: "erst ein gestelltes Angebot kann angenommen werden" };
    if (a.ersetztDurch) return { ok: false, grund: "es gibt eine neuere Fassung — die nehmen" };
    a.angenommen = { datum: datum || "" };
    return { ok: true };
  }

  /* An WorkFloh: Dateien (alle außer Links) mit sprechendem Namen, Links und Notizen als Text */
  function fuerWorkFloh(a) {
    var dateien = [], zeilen = [];
    (a.positionen || []).forEach(function (p) {
      (p.unterlagen || []).forEach(function (u) {
        var wo = p.id + " " + (p.titel || "") + " — " + ARTEN[u.art];
        if (u.art === "link") zeilen.push("• " + wo + ": " + u.url + (u.notiz ? " (" + u.notiz + ")" : ""));
        else { dateien.push({ datei: u.datei, name: a.nummer + "_" + p.id + "_" + ARTEN[u.art].replace(/\s+/g, "-") + "_" + u.name, typ: u.typ });
          zeilen.push("• " + wo + ": " + u.name + " (" + groesseText(u.groesse) + ", als Datei angehängt)" + (u.notiz ? " — " + u.notiz : "")); }
      });
    });
    return { dateien: dateien, text: zeilen.length ? "\nUnterlagen:\n" + zeilen.join("\n") : "" };
  }

  /* Als Beispiel in die Vorlage: Ansichten aus den Bildern (fertig zuerst), Menge und Maße der Position; der Preis wird in der
     Galerie wie immer FRISCH gerechnet (nie gespeichert). → { ok, beispiel } */
  function beispielAus(a, p, vorlage) {
    var bilder = (p.unterlagen || []).filter(istBild);
    if (!bilder.length) return { ok: false, grund: "kein Bild (Entwurf oder fertiges Produkt) an dieser Position" };
    bilder.sort(function (x, y) { return (x.art === "fertig" ? 0 : 1) - (y.art === "fertig" ? 0 : 1); });
    var schl = a.nummer + ":" + p.id;
    if ((vorlage.beispiele || []).some(function (b) { return b.quelle === schl; })) return { ok: false, grund: "schon als Beispiel in der Vorlage" };
    var n = 1; (vorlage.beispiele || []).forEach(function (b) { var m = /^b(\d+)$/.exec(b.id); if (m) n = Math.max(n, +m[1] + 1); });
    var b = { id: "b" + n, titel: p.titel || vorlage.name, menge: p.menge, breiteMm: p.breiteMm, hoeheMm: p.hoeheMm, farben: p.farben, verfahren: p.verfahren,
      stiche: p.stiche, wahl: JSON.parse(JSON.stringify(p.wahl || {})), quelle: schl,
      ansichten: bilder.map(function (u) { return [ARTEN[u.art] + (u.notiz ? " · " + u.notiz : ""), "img:" + u.datei]; }) };
    vorlage.beispiele = (vorlage.beispiele || []).concat([b]);
    return { ok: true, beispiel: b };
  }

  /* Wörter für die Suche (anfrage.js): Dateinamen und Notizen */
  function suchText(a) { var t = []; (a.positionen || []).forEach(function (p) { (p.unterlagen || []).forEach(function (u) { t.push(u.name, u.notiz); }); }); return t.join(" "); }

  WC.unterlagen = { MAX_BYTES: MAX_BYTES, ARTEN: ARTEN, groesseText: groesseText, istBild: istBild, typVon: typVon, pruefeDatei: pruefeDatei, sichereAdresse: sichereAdresse,
    dazu: dazu, weg: weg, dateiIds: dateiIds, annehmen: annehmen, fuerWorkFloh: fuerWorkFloh, beispielAus: beispielAus, suchText: suchText };
})(typeof window !== "undefined" ? window : globalThis);
