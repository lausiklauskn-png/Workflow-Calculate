/* Eine E-Mail (.eml) lesen, um sie in der Voransicht zu zeigen (Klaus 2026-10-08: „mit einem Auge …
   als Voransicht größer gemacht werden, damit man einmal raufschauen kann, ob es die richtigen
   Dokumente sind“). NUR LESEN: nichts wird ausgeführt, HTML wird nie als HTML gezeigt, sondern
   als Text (ohne Tags) — so kann keine Mail Skripte oder fremde Bilder nachladen.
   Kann: Kopfzeilen samt RFC 2047 (=?utf-8?B?…?=), multipart (auch verschachtelt), base64,
   quoted-printable, 7bit/8bit, Zeichensätze über TextDecoder, Dateinamen nach RFC 2231.
   Läuft im Browser und in Node (TextDecoder, atob/Buffer). */
(function (g) {
  "use strict";
  var WN = g.WN = g.WN || {};

  function b64bytes(s) {
    s = String(s || "").replace(/[^A-Za-z0-9+/=]/g, "");
    if (typeof g.atob === "function") { var bin = g.atob(s), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }
    return new Uint8Array(Buffer.from(s, "base64"));
  }
  function qpbytes(s) {
    s = String(s || "").replace(/=\r?\n/g, "");
    var out = [];
    for (var i = 0; i < s.length; i++) {
      var c = s.charAt(i);
      if (c === "=" && /^[0-9A-Fa-f]{2}$/.test(s.substr(i + 1, 2))) { out.push(parseInt(s.substr(i + 1, 2), 16)); i += 2; }
      else out.push(s.charCodeAt(i) & 0xff);
    }
    return new Uint8Array(out);
  }
  function latin1bytes(s) { var u = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) u[i] = s.charCodeAt(i) & 0xff; return u; }
  function dekodiere(bytes, charset) {
    var cs = String(charset || "utf-8").toLowerCase().replace(/^"|"$/g, "");
    try { return new TextDecoder(cs).decode(bytes); } catch (_e) { try { return new TextDecoder("utf-8").decode(bytes); } catch (_e2) { return String.fromCharCode.apply(null, bytes); } }
  }
  /* =?charset?B|Q?text?= → Klartext */
  function wort(s) {
    return String(s || "").replace(/\?=\s+=\?/g, "?==?").replace(/=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g, function (_m, cs, art, txt) {
      var b = art.toUpperCase() === "B" ? b64bytes(txt) : qpbytes(txt.replace(/_/g, " "));
      return dekodiere(b, cs);
    });
  }
  /* Kopf und Rumpf trennen; Kopfzeilen entfalten (Fortsetzungszeilen beginnen mit Leerraum) */
  function teile(roh) {
    var m = /\r?\n\r?\n/.exec(roh);
    var kopfText = m ? roh.slice(0, m.index) : roh, rumpf = m ? roh.slice(m.index + m[0].length) : "";
    var kopf = {};
    kopfText.replace(/\r?\n[ \t]+/g, " ").split(/\r?\n/).forEach(function (z) {
      var i = z.indexOf(":"); if (i <= 0) return;
      var k = z.slice(0, i).trim().toLowerCase(); if (!(k in kopf)) kopf[k] = z.slice(i + 1).trim();
    });
    return { kopf: kopf, rumpf: rumpf };
  }
  function param(wert, name) {
    wert = String(wert || "");
    var s = new RegExp("(?:^|;)\\s*" + name + "\\*=([^;]+)", "i").exec(wert);      // RFC 2231: utf-8''…
    if (s) { var v = s[1].trim().replace(/^"|"$/g, ""), p = v.split("'"); try { return decodeURIComponent(p.length >= 3 ? p.slice(2).join("'") : v); } catch (_e) { return v; } }
    var q = new RegExp("(?:^|;)\\s*" + name + "=(\"([^\"]*)\"|[^;]+)", "i").exec(wert);
    return q ? wort((q[2] != null ? q[2] : q[1]).trim()) : "";
  }
  function rumpfBytes(rumpf, cte) {
    cte = String(cte || "").toLowerCase();
    if (cte === "base64") return b64bytes(rumpf);
    if (cte === "quoted-printable") return qpbytes(rumpf);
    return latin1bytes(rumpf);
  }
  function ohneTags(html) {
    return String(html || "").replace(/<(script|style)[\s\S]*?<\/\1>/gi, "").replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|tr|li|h\d)>/gi, "\n")
      .replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&amp;/g, "&").replace(/\n{3,}/g, "\n\n").trim();
  }

  function sammle(teil, out, tiefe) {
    if (tiefe > 8) return;
    var ct = teil.kopf["content-type"] || "text/plain; charset=us-ascii";
    var typ = ct.split(";")[0].trim().toLowerCase();
    var disp = teil.kopf["content-disposition"] || "";
    var name = param(disp, "filename") || param(ct, "name");
    if (/^multipart\//.test(typ)) {
      var grenze = param(ct, "boundary");
      if (!grenze) return;
      var stuecke = teil.rumpf.split(new RegExp("\\r?\\n?--" + grenze.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?:--)?[ \\t]*\\r?\\n?"));
      stuecke.slice(1).forEach(function (s) { if (s.trim()) sammle(teile(s), out, tiefe + 1); });
      return;
    }
    var bytes = rumpfBytes(teil.rumpf, teil.kopf["content-transfer-encoding"]);
    var anhang = /^attachment/i.test(disp) || (name && !/^text\/(plain|html)$/.test(typ));
    if (!anhang && typ === "text/plain" && out.text == null) { out.text = dekodiere(bytes, param(ct, "charset")).replace(/\r\n/g, "\n"); return; }
    if (!anhang && typ === "text/html" && out.htmlText == null) { out.htmlText = ohneTags(dekodiere(bytes, param(ct, "charset"))); return; }
    if (typ === "message/rfc822" && !name) name = "weitergeleitet.eml";
    out.anhaenge.push({ name: name || ("anhang-" + (out.anhaenge.length + 1)), typ: typ, bytes: bytes, groesse: bytes.length });
  }

  /* roh: der Inhalt der .eml als Text (Latin-1-treu gelesen, damit base64/8bit Byte für Byte bleiben) */
  function lesen(roh) {
    var t = teile(String(roh || ""));
    var out = { kopf: { von: wort(t.kopf.from || ""), an: wort(t.kopf.to || ""), cc: wort(t.kopf.cc || ""), betreff: wort(t.kopf.subject || ""), datum: t.kopf.date || "" },
      text: null, htmlText: null, anhaenge: [] };
    sammle(t, out, 0);
    if (out.text == null) out.text = out.htmlText || "";
    /* 8bit-Text ohne Kodierung kam Latin-1-treu herein: als UTF-8 deuten, wenn es so aussieht */
    if (/Ã.|â€/.test(out.text)) { try { out.text = new TextDecoder("utf-8").decode(latin1bytes(out.text)); } catch (_e) {} }
    delete out.htmlText;
    return out;
  }

  WN.mail = { lesen: lesen, wort: wort, ohneTags: ohneTags };
})(typeof window !== "undefined" ? window : globalThis);
