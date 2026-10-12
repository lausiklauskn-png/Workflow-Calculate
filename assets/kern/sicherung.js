/* Verschlüsselte Sicherung — Muster: Workflow-Needs assets/kern/sicherung.js (dort aus dem Sende-Prüfer).
   Das Schloss ist assets/schluesseltresor.js, byte-1:1 (über Workflow-Needs aus kim-hub-company):
   AES-256-GCM, PBKDF2-SHA256 600 000 Runden. Diese Datei rechnet nur — die Oberfläche steht in app.js.

   ⚠ Die Datei verlässt das Gerät. In ihr steht KEIN Klartext: nur Art, Fassung, Datum und das Paket.
   Mit drin: Angebote, Kunden, Bilder (Byte für Byte), Katalog, Einstellungen. Das Passwort wird nirgends abgelegt.
   ⚠ Zurückholen FÜGT HINZU und überschreibt nie: was mit derselben Kennung schon da ist, bleibt.
   Katalog und Einstellungen kommen nur, wo auf diesem Gerät noch keine eigenen stehen.
   Klassisches Skript: window.WC.sicherung bzw. globalThis.WC.sicherung. */
(function (g) {
  "use strict";
  var WC = g.WC = g.WC || {};
  var ART = "workflowcalculate-sicherung-verschluesselt", FASSUNG = 1, MIN_PW = 8, ERINNERN_TAGE = 14;
  function T() { return g.WERKSTATT_SCHLUESSEL || null; }

  function blobZuB64(b) {
    return b.arrayBuffer().then(function (buf) {
      var a = new Uint8Array(buf), s = "", i;
      for (i = 0; i < a.length; i += 0x8000) s += String.fromCharCode.apply(null, a.subarray(i, i + 0x8000));
      return g.btoa(s);
    });
  }
  function b64ZuBlob(s, typ) {
    var bin = g.atob(s), a = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
    return new g.Blob([a], { type: typ || "application/octet-stream" });
  }

  /* inhalt: { angebote, kunden, bilder: [{id, name, blob, breite, hoehe}], speicher: { katalog, einstellungen } (Strings) } */
  function verschliessen(pw, inhalt, jetzt) {
    if (!T()) return Promise.reject(new Error("schloss-fehlt"));
    if (String(pw || "").length < MIN_PW) return Promise.reject(new Error("kurz"));
    var erstellt = jetzt || new Date().toISOString();
    return Promise.all((inhalt.bilder || []).filter(function (b) { return b && b.blob; }).map(function (b) {
      return blobZuB64(b.blob).then(function (d) { return { id: b.id, name: b.name || "", typ: b.blob.type || "image/jpeg", breite: b.breite || 0, hoehe: b.hoehe || 0, b64: d }; });
    })).then(function (bilder) {
      var klar = { art: ART, fassung: FASSUNG, erstellt: erstellt, angebote: inhalt.angebote || [], kunden: inhalt.kunden || [], bilder: bilder, speicher: inhalt.speicher || {} };
      return T().zu(pw, JSON.stringify(klar));
    }).then(function (paket) { return { art: ART, fassung: FASSUNG, erstellt: erstellt, paket: paket }; });
  }
  function istSicherung(d) { return !!(d && d.art === ART); }
  function oeffnen(pw, datei) {
    if (!T()) return Promise.reject(new Error("schloss-fehlt"));
    if (!istSicherung(datei) || !T().istPaketForm(datei.paket)) return Promise.reject(new Error("keine-sicherung"));
    if (datei.fassung !== FASSUNG) return Promise.reject(new Error("fassung"));
    return T().auf(pw, datei.paket).then(function (text) {
      var o = JSON.parse(text);
      if (!o || o.art !== ART || !Array.isArray(o.angebote)) throw new Error("keine-sicherung");
      return { angebote: o.angebote, kunden: o.kunden || [], speicher: o.speicher || {}, erstellt: o.erstellt,
        bilder: (o.bilder || []).map(function (b) { return { id: b.id, name: b.name, breite: b.breite, hoehe: b.hoehe, blob: b64ZuBlob(b.b64, b.typ) }; }) };
    }, function (e) { throw new Error(e && e.message === "fassung" ? "fassung" : "passwort"); });
  }

  /* Gibt je Liste die NEUEN zurück (gleiche Kennung = schon da, bleibt unberührt) */
  function zusammenfuehren(vorhanden, geholt) {
    function neu(alt, neuL) {
      var da = {}; (alt || []).forEach(function (x) { da[x.id] = 1; });
      return (neuL || []).filter(function (x) { if (!x || !x.id || da[x.id]) return false; da[x.id] = 1; return true; });
    }
    var r = { angebote: neu(vorhanden.angebote, geholt.angebote), kunden: neu(vorhanden.kunden, geholt.kunden), bilder: neu(vorhanden.bilder, geholt.bilder) };
    r.schonDa = (geholt.angebote || []).length - r.angebote.length;
    return r;
  }

  function tageSeit(iso, jetztMs) { var z = Date.parse(iso || ""); return isNaN(z) ? Infinity : ((jetztMs || Date.now()) - z) / 86400000; }
  function erinnernNoetig(angebote, zuletzt, jetztMs) { return (angebote || []).length > 0 && tageSeit(zuletzt, jetztMs) >= ERINNERN_TAGE; }

  WC.sicherung = { ART: ART, FASSUNG: FASSUNG, MIN_PW: MIN_PW, ERINNERN_TAGE: ERINNERN_TAGE, verschliessen: verschliessen, oeffnen: oeffnen,
    istSicherung: istSicherung, zusammenfuehren: zusammenfuehren, tageSeit: tageSeit, erinnernNoetig: erinnernNoetig };
})(typeof window !== "undefined" ? window : globalThis);
