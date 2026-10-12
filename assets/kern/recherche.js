/* KI-Recherche der Marktpreise (Klaus 2026-10-12: „nur mit Quellenlink und ‚ungeprüft‘ bauen … sollte sich an
   den Marktpreisen orientieren und nicht raten“).

   Weg: Claude-API mit eigenem Schlüssel (BYOK) und dem Werkzeug Websuche (web_search, serverseitig). Die App
   schickt NUR die Produktangaben aus der Whitelist (auftragsInfo): Vorlage, Menge, Maße, Farben, Verfahren,
   Materialnamen — nie Kunde, Titel, Beschreibung, Einkaufspreise, Sätze.

   ⚠ NICHT RATEN heißt hier: ein Preis wird nur übernommen, wenn
     1. seine Quelle unter den Seiten ist, die die Websuche wirklich geliefert hat, UND
     2. die Zahl WÖRTLICH im zitierten Text dieser Quelle steht (cited_text der Zitate).
   Alles andere wird verworfen — mit Grund. Was durchkommt, ist „ungeprüft“: mit Link und Zitat, aber erst nach
   ✓ im Marktvergleich. Brutto → netto rechnet die App (÷ 1,19), Gesamt → Stück auch — und sagt es.
   Klassisches Skript: window.WC.recherche bzw. globalThis.WC.recherche. */
(function (g) {
  "use strict";
  var WC = g.WC = g.WC || {};
  var ADRESSE = "https://api.anthropic.com/v1/messages";
  var MODELL = "claude-opus-5-5";
  var MAX_SUCHEN = 5, MAX_FORTSETZEN = 3;
  var PREIS_USD = { ein: 4, aus: 20, suche: 0.01 }; /* je Million Token · je Suche (Stand 2026-10) */
  var KLASSEN = ["handwerk", "online", "import"];

  /* Was hinausgeht — nur diese Felder */
  function auftragsInfo(v, p, kat) {
    var vf = WC.kalk.finde(kat.verfahren, p.verfahren || v.verfahrenVorgabe);
    var mats = (v.slots || []).map(function (sl) {
      var w = p.wahl && Object.prototype.hasOwnProperty.call(p.wahl, sl.id) ? p.wahl[sl.id] : sl.vorgabe;
      var m = w && WC.kalk.finde(kat.materialien, w); return m ? m.name : "";
    }).filter(Boolean);
    return { produkt: String(v.name || ""), menge: Math.max(1, Math.round(Number(p.menge) || 1)), einheit: v.einheitText || "Stk.",
      breiteMm: Number(p.breiteMm) || 0, hoeheMm: Number(p.hoeheMm) || 0, farben: (+v.farbenMax || 1) > 1 ? Math.max(1, Number(p.farben) || 1) : 0,
      stiche: v.stiche ? Number(p.stiche || v.sticheVorgabe) || 0 : 0, verfahren: vf ? vf.name : "", material: mats };
  }
  function auftragsText(i) {
    var z = [i.menge + " " + i.einheit + " · " + i.produkt];
    if (i.breiteMm && i.hoeheMm) z.push("Maße " + i.breiteMm + " × " + i.hoeheMm + " mm");
    if (i.farben) z.push(i.farben + (i.farben > 1 ? " Farben" : " Farbe"));
    if (i.stiche) z.push(i.stiche + " Stiche je Stück");
    if (i.verfahren) z.push("Verfahren: " + i.verfahren);
    if (i.material.length) z.push("Material: " + i.material.join(", "));
    return z.join(" · ");
  }
  var ANWEISUNG = [
    "Du recherchierst Marktpreise für ein Angebot eines kleinen Werbetechnik-Betriebs in Deutschland.",
    "Suche im Netz nach Preisen, die Anbieter für genau dieses Produkt in dieser oder ähnlicher Menge verlangen (Handwerksbetriebe, Online-Druckereien, Großhändler/Import).",
    "Rate nie und schätze nie. Nenne nur Preise, die auf einer gefundenen Seite stehen, und zitiere die Stelle.",
    "Schreibe den Preis genau so, wie er auf der Seite steht — rechne nicht um.",
    "Gib am Ende je gefundenem Preis genau EINE Zeile in diesem Format aus, ohne weitere Zeichen davor:",
    "PREIS | Anbieter | Klasse | Menge | Preis wie auf der Seite | stueck oder gesamt | netto oder brutto | Versand wie auf der Seite oder - | URL",
    "Klasse ist handwerk, online oder import. Findest du keinen belegbaren Preis, schreibe: KEIN PREIS GEFUNDEN.",
  ].join("\n");

  function anfrage(info) {
    return {
      model: MODELL, max_tokens: 16000, output_config: { effort: "medium" }, fallbacks: "default",
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: MAX_SUCHEN, allowed_callers: ["direct"],
        user_location: { type: "approximate", country: "DE", timezone: "Europe/Berlin" } }],
      system: ANWEISUNG,
      messages: [{ role: "user", content: "Produkt: " + auftragsText(info) }],
    };
  }

  /* ── Zahlen: „4,90“ · „4.90“ · „1.234,56“ · „1,234.56“ · „5“ → Cent; mehrdeutige Schreibweisen geben ALLE Lesarten ── */
  function lesarten(s) {
    s = String(s || "").replace(/[€\s]|EUR/gi, "").replace(/ /g, "");
    var r = [];
    function add(x) { if (Number.isFinite(x) && x > 0 && r.indexOf(Math.round(x * 100)) < 0) r.push(Math.round(x * 100)); }
    if (/^\d+$/.test(s)) add(+s);
    if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(s)) add(+s.replace(/\./g, "").replace(",", "."));
    if (/^\d+,\d{1,2}$/.test(s)) add(+s.replace(",", "."));
    if (/^\d{1,3}(,\d{3})+(\.\d{1,2})?$/.test(s)) add(+s.replace(/,/g, ""));
    if (/^\d+\.\d{1,2}$/.test(s)) add(+s);
    return r;
  }
  function zahlenIm(text) {
    var m = String(text || "").match(/\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?/g) || [];
    var r = []; m.forEach(function (x) { lesarten(x).forEach(function (c) { if (r.indexOf(c) < 0) r.push(c); }); });
    return r;
  }
  function normUrl(u) { return String(u || "").trim().replace(/#.*$/, "").replace(/\/+$/, "").toLowerCase(); }

  /* Antworten (eine oder mehrere nach pause_turn) auswerten → { funde, verworfen, quellen, suchen, fehler, kosten } */
  function auswerten(antworten, info, datum) {
    antworten = [].concat(antworten || []);
    var quellen = {}, zitate = [], text = "", suchen = 0, fehler = [], usage = { ein: 0, aus: 0 };
    antworten.forEach(function (r) {
      (r && r.content || []).forEach(function (b) {
        if (b.type === "web_search_tool_result") {
          if (Array.isArray(b.content)) b.content.forEach(function (x) { if (x && x.url) quellen[normUrl(x.url)] = x.url; });
          else if (b.content && b.content.error_code) fehler.push(b.content.error_code);
        }
        if (b.type === "text") {
          text += b.text || "";
          (b.citations || []).forEach(function (c) { if (c.type === "web_search_result_location" && c.url) zitate.push({ url: normUrl(c.url), text: String(c.cited_text || "") }); });
        }
      });
      var u = r && r.usage || {};
      usage.ein += (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0); usage.aus += u.output_tokens || 0;
      suchen += (u.server_tool_use && u.server_tool_use.web_search_requests) || 0;
    });
    function belegt(url, cent) {
      return zitate.filter(function (z) { return z.url === url && zahlenIm(z.text).indexOf(cent) >= 0; })[0] || null;
    }
    var funde = [], verworfen = [];
    text.split(/\r?\n/).forEach(function (zeile) {
      var t = zeile.replace(/^[\s*>-]+/, "");
      if (!/^PREIS\s*\|/.test(t)) return;
      var f = t.split("|").map(function (x) { return x.trim(); });
      function weg(grund) { verworfen.push({ zeile: t, grund: grund }); }
      if (f.length < 9) return weg("Zeile unlesbar");
      var anbieter = f[1], klasse = f[2].toLowerCase(), menge = Math.round(Number(String(f[3]).replace(/[^\d]/g, ""))), roh = f[4],
        art = f[5].toLowerCase(), steuer = f[6].toLowerCase(), versandRoh = f[7], url = f.slice(8).join("|").trim();
      if (KLASSEN.indexOf(klasse) < 0) return weg("Klasse unbekannt");
      if (!(menge > 0)) return weg("Menge fehlt");
      if (!/^https?:\/\//i.test(url)) return weg("keine Quelle");
      var nu = normUrl(url);
      if (!quellen[nu]) return weg("Quelle stammt nicht aus der Websuche");
      var kand = lesarten(roh), beleg = null, cent = null;
      for (var i = 0; i < kand.length && !beleg; i++) { beleg = belegt(nu, kand[i]); if (beleg) cent = kand[i]; }
      if (!beleg) return weg("Preis steht nicht im zitierten Text der Quelle");
      var notiz = [];
      var stueck = cent;
      if (/gesamt/.test(art)) { stueck = Math.round(cent / menge); notiz.push("Gesamtpreis ÷ " + menge); }
      if (/brutto/.test(steuer)) { stueck = Math.round(stueck / 1.19); notiz.push("aus brutto (19 %) gerechnet"); }
      var versandCent = 0;
      if (versandRoh && versandRoh !== "-") {
        var vk = lesarten(versandRoh).filter(function (c) { return belegt(nu, c); })[0];
        if (vk != null) versandCent = /brutto/.test(steuer) ? Math.round(vk / 1.19) : vk;
        else notiz.push("Versand nicht belegt — nicht übernommen");
      }
      funde.push({ anbieter: anbieter, klasse: klasse, menge: menge, stueckCent: stueck, versandCent: versandCent, datum: datum, quelle: quellen[nu],
        zitat: beleg.text, roh: roh, notiz: notiz.join(" · "), herkunft: "ki", ungeprueft: true });
    });
    var usd = usage.ein / 1e6 * PREIS_USD.ein + usage.aus / 1e6 * PREIS_USD.aus + suchen * PREIS_USD.suche;
    return { funde: funde, verworfen: verworfen, quellen: Object.keys(quellen).length, suchen: suchen, fehler: fehler,
      keinPreis: !funde.length && /KEIN PREIS GEFUNDEN/.test(text), kosten: { ein: usage.ein, aus: usage.aus, suchen: suchen, usdGerechnet: Math.round(usd * 10000) / 10000 } };
  }

  /* Aufruf — fetchFn ist einspritzbar (Proben stellen die Gegenseite) */
  function rufen(schluessel, info, fetchFn, datum) {
    var f = fetchFn || g.fetch.bind(g), body = anfrage(info), antworten = [];
    function einmal() {
      return f(ADRESSE, { method: "POST", headers: { "content-type": "application/json", "x-api-key": schluessel, "anthropic-version": "2023-06-01",
        "anthropic-beta": "server-side-fallback-2026-07-01", "anthropic-dangerous-direct-browser-access": "true" }, body: JSON.stringify(body) })
        .then(function (r) {
          return r.json().catch(function () { return {}; }).then(function (j) {
            if (!r.ok) throw Object.assign(new Error((j && j.error && j.error.message) || ("HTTP " + r.status)), { status: r.status });
            return j;
          });
        }).then(function (j) {
          antworten.push(j);
          if (j.stop_reason === "refusal") throw new Error("abgelehnt (refusal)");
          if (j.stop_reason === "pause_turn" && antworten.length <= MAX_FORTSETZEN) {
            body.messages = body.messages.concat([{ role: "assistant", content: j.content }]);
            return einmal();
          }
          return auswerten(antworten, info, datum);
        });
    }
    return einmal();
  }

  WC.recherche = { ADRESSE: ADRESSE, MODELL: MODELL, MAX_SUCHEN: MAX_SUCHEN, PREIS_USD: PREIS_USD, auftragsInfo: auftragsInfo, auftragsText: auftragsText,
    anfrage: anfrage, lesarten: lesarten, zahlenIm: zahlenIm, auswerten: auswerten, rufen: rufen };
})(typeof window !== "undefined" ? window : globalThis);
