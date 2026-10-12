/* Workflow Calculate — die Oberfläche. Rechnen in assets/kern/*, hier nur Anzeige und Eingabe.
   Aufbau nach Workflow-Needs (assets/app.js, Stand c46c753): Reiter, h()-Helfer, IndexedDB mit
   verzögertem Schreiben, Druck über #druck, Glanzpunkt der Knöpfe. Alles Sichtbare über textContent. */
(function () {
  "use strict";
  var WC = window.WC, G = WC.geld, K = WC.kalk, A = WC.angebot, KAT = WC.katalog, MK = WC.markt;
  var LS = { katalog: "workflowcalculate_katalog", einst: "workflowcalculate_einstellungen", thema: "workflowcalculate_thema",
    aktiv: "workflowcalculate_aktiv", reiter: "workflowcalculate_reiter", sicherung: "workflowcalculate_sicherung_zuletzt" };
  var DB_NAME = "WorkflowCalculate1", STORES = ["angebote", "kunden", "bilder"];

  function lsGet(k) { try { return localStorage.getItem(k); } catch (_e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (_e) {} }
  function lsJson(k, d) { try { var x = JSON.parse(lsGet(k) || "null"); return x == null ? d : x; } catch (_e) { return d; } }
  function kopie(x) { return JSON.parse(JSON.stringify(x)); }
  function ssGet(k) { try { return sessionStorage.getItem(k); } catch (_e) { return null; } }
  function ssSet(k, v) { try { sessionStorage.setItem(k, v); } catch (_e) {} }

  /* ── Zustand ── */
  var S = {
    angebote: [], kunden: [], aktiv: lsGet(LS.aktiv), reiter: lsGet(LS.reiter) || "angebote",
    katalog: null, einst: Object.assign({ firma: { name: "", anschrift: "", kontakt: "", steuer: "", bank: "", logo: "" }, kleinunternehmer: false }, lsJson(LS.einst, {})),
    meldung: null, offen: {}, katReiter: "vorlagen", katOffen: null, neuPos: null,
  };
  function katalogLaden() {
    var k = lsJson(LS.katalog, null);
    S.katalog = k && !KAT.pruefe(k).length ? k : kopie(WC.START);
    S.katalog.lieferanten = S.katalog.lieferanten || [];
  }
  katalogLaden();
  function katalogSpeichern() { lsSet(LS.katalog, JSON.stringify(S.katalog)); }
  function einstSpeichern() { lsSet(LS.einst, JSON.stringify(S.einst)); }

  /* ── IndexedDB ── */
  var dbP = null;
  function db() {
    if (dbP) return dbP;
    dbP = new Promise(function (ok, nein) {
      if (!window.indexedDB) { nein(new Error("kein IndexedDB")); return; }
      var r = indexedDB.open(DB_NAME, 1);
      r.onupgradeneeded = function () { STORES.forEach(function (s) { if (!r.result.objectStoreNames.contains(s)) r.result.createObjectStore(s, { keyPath: "id" }); }); };
      r.onsuccess = function () { ok(r.result); };
      r.onerror = function () { nein(r.error); };
    });
    return dbP;
  }
  function dbAlle(store) {
    return db().then(function (d) { return new Promise(function (ok, nein) { var q = d.transaction(store, "readonly").objectStore(store).getAll(); q.onsuccess = function () { ok(q.result || []); }; q.onerror = function () { nein(q.error); }; }); });
  }
  function dbPut(store, v) {
    return db().then(function (d) { return new Promise(function (ok, nein) { var tx = d.transaction(store, "readwrite"); tx.objectStore(store).put(v); tx.oncomplete = function () { ok(); }; tx.onerror = function () { nein(tx.error); }; }); });
  }
  function dbGet(store, id) {
    return db().then(function (d) { return new Promise(function (ok) { var q = d.transaction(store, "readonly").objectStore(store).get(id); q.onsuccess = function () { ok(q.result || null); }; q.onerror = function () { ok(null); }; }); });
  }
  function dbDel(store, id) {
    return db().then(function (d) { return new Promise(function (ok) { var tx = d.transaction(store, "readwrite"); tx.objectStore(store).delete(id); tx.oncomplete = function () { ok(); }; }); });
  }
  var schreibUhr = null, offenSchreiben = {};
  function merken(a) {
    a = a || aktivesAngebot(); if (!a) return;
    offenSchreiben[a.id] = a;
    clearTimeout(schreibUhr); schreibUhr = setTimeout(jetztSpeichern, 250);
  }
  function jetztSpeichern() {
    var l = Object.keys(offenSchreiben).map(function (k) { return offenSchreiben[k]; }); offenSchreiben = {};
    return Promise.all(l.map(function (a) { return dbPut("angebote", kopie(a)); })).catch(function () {});
  }
  window.addEventListener("pagehide", jetztSpeichern);

  /* ── Bilder: verkleinert (≤ 1600 px), als Blob in IndexedDB ── */
  var bildUrls = {};
  function bildSpeichern(datei) {
    return new Promise(function (ok, nein) {
      var url = URL.createObjectURL(datei), img = new Image();
      img.onload = function () {
        var max = 1600, f = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        var c = document.createElement("canvas"); c.width = Math.round(img.naturalWidth * f); c.height = Math.round(img.naturalHeight * f);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
        c.toBlob(function (b) {
          if (!b) { nein(new Error("Bild nicht lesbar")); return; }
          var id = "B-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
          dbPut("bilder", { id: id, blob: b, name: datei.name || "", breite: c.width, hoehe: c.height }).then(function () { bildUrls[id] = URL.createObjectURL(b); ok(id); }, nein);
        }, "image/jpeg", 0.86);
      };
      img.onerror = function () { URL.revokeObjectURL(url); nein(new Error("Bild nicht lesbar")); };
      img.src = url;
    });
  }
  /* Quelle eines Bildes: „svg:…“ (Zeichnung aus dem Startkatalog) oder „img:B-…“ bzw. „B-…“ (eigenes Foto) */
  function bildQuelle(ref) {
    ref = String(ref || "");
    if (ref.indexOf("svg:") === 0) return WC.bildUrl(ref);
    var id = ref.replace(/^img:/, "");
    return bildUrls[id] || "";
  }
  function bilderVorladen(ids) {
    return Promise.all(ids.filter(function (id) { return id && !bildUrls[id]; }).map(function (id) {
      return dbGet("bilder", id).then(function (r) { if (r && r.blob) bildUrls[id] = URL.createObjectURL(r.blob); });
    }));
  }
  function alleBildIds() {
    var l = [];
    S.angebote.forEach(function (a) { a.positionen.forEach(function (p) { (p.bilder || []).forEach(function (b) { l.push(b); }); }); });
    (S.katalog.vorlagen || []).forEach(function (v) { (v.beispiele || []).forEach(function (b) { (b.ansichten || []).forEach(function (x) { if (/^img:/.test(x[1])) l.push(x[1].slice(4)); }); }); });
    return l;
  }

  /* ── Hilfen ── */
  function h(tag, a) {
    var el = document.createElement(tag);
    a = a || {};
    Object.keys(a).forEach(function (k) {
      var w = a[k];
      if (w == null || w === false) return;
      if (k === "text") el.textContent = w;
      else if (k === "class") el.className = w;
      else if (k.slice(0, 2) === "on") el.addEventListener(k.slice(2), w);
      else if (k === "value" || k === "checked" || k === "disabled" || k === "type" || k === "hidden" || k === "multiple") el[k] = w;
      else el.setAttribute(k, w === true ? "" : w);
    });
    for (var i = 2; i < arguments.length; i++) anhaengen(el, arguments[i]);
    return el;
  }
  function anhaengen(el, k) {
    if (k == null || k === false) return;
    if (Array.isArray(k)) { k.forEach(function (x) { anhaengen(el, x); }); return; }
    el.append(k.nodeType ? k : document.createTextNode(String(k)));
  }
  function knopf(text, fn, cls, extra) { return h("button", Object.assign({ type: "button", class: "btn " + (cls || ""), text: text, onclick: fn }, extra || {})); }
  function euro(c) { return G.formatEuro(c); }
  function zahl(x) { if (x === "" || x == null) return null; var n = Number(String(x).replace(/\./g, "").replace(",", ".")); return Number.isFinite(n) ? n : null; }
  function zahlPunkt(x) { if (x === "" || x == null) return null; var n = Number(String(x).replace(",", ".")); return Number.isFinite(n) ? n : null; }
  function deZahl(x) { return x == null || x === "" ? "" : String(Math.round(Number(x) * 1000) / 1000).replace(".", ","); }
  function finde(l, id) { return K.finde(l, id); }
  function aktivesAngebot() { return S.angebote.filter(function (a) { return a.id === S.aktiv; })[0] || null; }
  function kundeVon(a) { return S.kunden.filter(function (k) { return k.id === a.kundeId; })[0] || a.kunde; }
  function melde(text, art) { S.meldung = { text: text, art: art || "" }; zeichne(); }
  function bearbeitbar(a) { return a && a.status !== "gestellt"; }
  function feld(label, input, extra) { return h("label", Object.assign({ class: "feld" }, extra || {}), label, input); }
  function delta(alt, neu) { var d = neu - alt; return (d > 0 ? "+" : d < 0 ? "−" : "±") + euro(Math.abs(d)); }

  function fokusMerken() { var a = document.activeElement; if (!a || !a.dataset || !a.dataset.key) return null; return { key: a.dataset.key, s: a.selectionStart, e: a.selectionEnd }; }
  function fokusZurueck(f) {
    if (!f) return; var el = document.querySelector('[data-key="' + f.key.replace(/"/g, '\\"') + '"]'); if (!el) return;
    el.focus({ preventScroll: true }); try { if (f.s != null) el.setSelectionRange(f.s, f.e); } catch (_e) {}
  }

  /* ── ↶ Zurück: bis zu 50 Stände je Angebot, nur im Speicher ── */
  var ZURUECK = {};
  function vorher(a) {
    var st = ZURUECK[a.id] = ZURUECK[a.id] || [];
    st.push(JSON.stringify({ positionen: a.positionen, versand: a.versand, saetze: a.saetze, kundeId: a.kundeId, kunde: a.kunde, zaehler: a.zaehler }));
    if (st.length > 50) st.shift();
  }
  function zurueck(a) {
    var st = ZURUECK[a.id]; if (!st || !st.length) return;
    Object.assign(a, JSON.parse(st.pop())); merken(a); zeichne();
  }

  /* ── Rahmen ── */
  var REITER = [["angebote", "Angebote"], ["angebot", "Angebot"], ["katalog", "Katalog"], ["kunden", "Kunden"], ["einstellungen", "Einstellungen"]];
  function zeichneKopf() {
    var a = aktivesAngebot(), sub = document.getElementById("app-unter");
    if (sub) {
      var text = a ? ((kundeVon(a) || {}).name || "ohne Kunde") + " · " + a.nummer + (A.fassungVon(a) > 1 ? " · Fassung " + A.fassungVon(a) : "") + (a.status === "gestellt" ? " · gestellt" : " · Entwurf") + (a.titel ? " · " + a.titel : "") : "kein Angebot offen";
      sub.textContent = text; sub.title = text;
    }
    var th = document.getElementById("thema");
    if (th) { var hell = document.documentElement.dataset.theme === "light"; th.textContent = hell ? "🌙" : "☀"; th.title = hell ? "Dunkel" : "Hell"; }
    var hk = document.getElementById("handel-knopf");
    if (hk) hk.className = "btn handel-knopf" + (S.reiter === "handel" ? " on" : "");
    var nav = document.getElementById("reiter"); nav.replaceChildren();
    REITER.forEach(function (r) {
      nav.append(knopf(r[1], function () { geheZu(r[0]); }, "chip" + (S.reiter === r[0] ? " on" : ""), { "data-reiter": r[0] }));
    });
  }
  /* Die Seite „🛒 Handelsware“ hat eine eigene Adresse (#handel) — als Lesezeichen oder in einem neuen Tab zu öffnen.
     Gleicher Speicher, gleicher Katalog: es gibt keinen zweiten Zustand. */
  function adresseSetzen(reiter) {
    var soll = reiter === "handel" ? "#handel" : "";
    if ((location.hash || "") === soll) return;
    try { history.replaceState(null, "", location.pathname + location.search + soll); } catch (_e) {}
  }
  function geheZu(reiter) {
    S.reiter = reiter; lsSet(LS.reiter, reiter); S.meldung = null; adresseSetzen(reiter); zeichne(); window.scrollTo(0, 0);
  }
  function zeichne() {
    var fk = fokusMerken();
    zeichneKopf();
    var main = document.getElementById("inhalt"); main.replaceChildren();
    if (S.meldung) main.append(h("div", { class: "hinweis " + (S.meldung.art || ""), role: "status", "data-meldung": "" }, S.meldung.text));
    var fn = { angebote: zAngebote, angebot: zAngebot, katalog: zKatalog, kunden: zKunden, einstellungen: zEinstellungen, handel: zHandel }[S.reiter] || zAngebote;
    fn(main);
    fokusZurueck(fk);
  }

  /* ════ Angebote (Liste) ════ */
  function neuesAngebot() {
    var a = A.neu(S.angebote);
    S.angebote.unshift(a); S.aktiv = a.id; lsSet(LS.aktiv, a.id); merken(a);
    S.reiter = "angebot"; lsSet(LS.reiter, "angebot"); S.meldung = null; zeichne();
  }
  /* Vorhandene Kalkulation übernehmen (Klaus 2026-10-12: „nachfolgende Kalkulationen abkürzen“) */
  function angebotKopieren(alt) {
    var a = A.neu(S.angebote);
    ["titel", "kundeId", "kunde", "saetze", "versand", "zaehler", "notiz"].forEach(function (k) { a[k] = kopie(alt[k]); });
    a.positionen = kopie(alt.positionen);
    a.fassung = 1; delete a.vorgaenger; delete a.ersetztDurch;
    a.notiz = "Übernommen aus " + alt.nummer;
    S.angebote.unshift(a); S.aktiv = a.id; lsSet(LS.aktiv, a.id); merken(a);
    S.reiter = "angebot"; lsSet(LS.reiter, "angebot");
    melde("Neues Angebot " + a.nummer + " aus " + alt.nummer + " übernommen — gerechnet wird mit den aktuellen Katalogwerten. Kunde, Mengen, Material anpassen.", "");
  }
  function zAngebote(main) {
    main.append(h("div", { class: "karte held" },
      h("img", { src: "icons/icon-192.png", alt: "", width: "96", height: "96" }),
      h("div", null, h("h2", { text: "Workflow Calculate" }),
        h("p", { class: "gedaempft", text: "Produkt wählen, Material und Menge eingeben — die App rechnet Material, Zeit, Verpackung & Versand und schreibt das Angebot. Die Kalkulation bleibt intern." }))));
    var ph = KAT.platzhalter(S.katalog);
    if (ph.anzahl) main.append(h("div", { class: "hinweis warn", "data-platzhalter-hinweis": "" },
      "Der Katalog trägt noch " + ph.anzahl + " Platzhalter-Werte (Sätze, Einkaufspreise, Tarife) — nicht aus deinen Zahlen. Im Reiter „Katalog“ und „Einstellungen“ eigene eintragen.", " ",
      knopf("Zum Katalog", function () { S.reiter = "katalog"; zeichne(); }, "klein")));
    if (WC.sicherung.erinnernNoetig(S.angebote, lsGet(LS.sicherung)) && !ssGet("workflowcalculate_sicherung_spaeter")) main.append(h("div", { class: "hinweis warn", "data-sicherung-erinnerung": "" },
      lsGet(LS.sicherung) ? "Die letzte Sicherung ist " + Math.floor(WC.sicherung.tageSeit(lsGet(LS.sicherung))) + " Tage alt." : "Es gibt noch keine Sicherung deiner Angebote.",
      " Löschst du die Browserdaten oder wechselst das Gerät, sind sie sonst weg. ",
      knopf("🔐 Jetzt sichern", function () { S.reiter = "einstellungen"; zeichne(); var k = document.getElementById("sicherung-kasten"); if (k) k.scrollIntoView(); }, "klein pri"), " ",
      knopf("Später", function () { ssSet("workflowcalculate_sicherung_spaeter", "1"); zeichne(); }, "klein")));
    main.append(h("div", { class: "band", style: "margin-bottom:12px" }, knopf("＋ Neues Angebot", neuesAngebot, "pri", { id: "neues-angebot" }), beispielSteuerung()));
    if (!S.angebote.length) { main.append(h("p", { class: "gedaempft", text: "Noch kein Angebot." })); return; }
    var kat = S.katalog;
    var t = h("table", null, h("thead", null, h("tr", null, ["Nummer", "Kunde", "Titel", "Status", "netto", ""].map(function (x, i) { return h("th", { class: i === 4 ? "r" : "", text: x }); }))));
    var tb = h("tbody");
    S.angebote.forEach(function (a) {
      var r = A.rechne(a, kat, kundeVon(a), S.einst.kleinunternehmer);
      tb.append(h("tr", { "data-angebot-zeile": a.id, style: "cursor:pointer", onclick: function () { S.aktiv = a.id; lsSet(LS.aktiv, a.id); S.reiter = "angebot"; zeichne(); } },
        h("td", { text: a.nummer + (A.fassungVon(a) > 1 ? " · F" + A.fassungVon(a) : "") }), h("td", { text: (kundeVon(a) || {}).name || "—" }), h("td", { text: a.titel || "" }),
        h("td", { text: a.ersetztDurch ? "ersetzt" : a.status === "gestellt" ? "gestellt 🔒" : "Entwurf" }), h("td", { class: "r", text: euro(r.summen.netto) }),
        h("td", null, knopf("⧉ als neues Angebot", function (ev) { ev.stopPropagation(); angebotKopieren(a); }, "klein", { "data-kopieren": a.id, title: "Kalkulation übernehmen und anpassen" }))));
    });
    t.append(tb);
    main.append(h("div", { class: "karte" }, h("div", { class: "tabelle-huelle" }, t)));
    var nk = nachkalkVorlagenKarte();
    if (nk) main.append(nk);
  }

  /* Beispiel-Angebote laden (wie Workflow-Needs „Beispiele“) — zum Ansehen, Lernen und Testen der Übergaben */
  function beispielLaden(bids) {
    var neu = [], gebiete = [], schon = 0;
    bids.forEach(function (bid) {
      var r = WC.beispielAngebot(S.angebote, S.katalog, bid);
      if (!r.ok) { schon++; return; }
      S.angebote.unshift(r.angebot); merken(r.angebot); neu.push(r.angebot);
      r.gebieteNeu.forEach(function (gname) { if (gebiete.indexOf(gname) < 0) gebiete.push(gname); });
    });
    if (gebiete.length) katalogSpeichern();
    if (!neu.length) { melde("Schon geladen — jedes Beispiel steht nur einmal in der Liste.", ""); return; }
    if (neu.length === 1) { S.aktiv = neu[0].id; lsSet(LS.aktiv, S.aktiv); S.reiter = "angebot"; lsSet(LS.reiter, "angebot"); }
    melde(neu.length + " Beispiel-Angebot(e) geladen: " + neu.map(function (a) { return a.nummer + " " + a.titel; }).join(" · ") +
      (gebiete.length ? ". Dazu ins Katalog geholt: " + gebiete.join(", ") : "") + ". Kunden sind erfunden; die Preise rechnet dein Katalog (Platzhalter, bis du eigene Zahlen einträgst).", "");
  }
  function beispielSteuerung() {
    var geladen = {}; S.angebote.forEach(function (a) { if (a.beispiel) geladen[a.beispiel] = 1; });
    var L = WC.BEISPIEL_ANGEBOTE || [], erstes = L.filter(function (b) { return !geladen[b.bid]; })[0];
    var wahl = h("select", { id: "beispiel-wahl", "aria-label": "Beispiel-Angebot", style: "flex:1 1 160px;min-width:0;max-width:100%" }, L.map(function (b) {
      return h("option", { value: b.bid, selected: erstes && b.bid === erstes.bid, text: (geladen[b.bid] ? "✓ " : "") + b.titel + " (" + b.positionen.length + " Positionen)" });
    }));
    return h("span", { class: "band", "data-beispiel-angebote": "", style: "max-width:100%;min-width:0" }, h("span", { class: "gedaempft klein", text: "Beispiele:" }), wahl,
      knopf("Laden", function () { beispielLaden([wahl.value]); }, "klein", { id: "beispiel-laden" }),
      knopf("Alle laden", function () { beispielLaden(L.map(function (b) { return b.bid; })); }, "klein", { id: "beispiel-alle" }));
  }

  /* Über alle gestellten Angebote: Arbeitszeit je Vorlage, Plan gegen Ist → ins Zeit-Muster übernehmen */
  function nachkalkVorlagenKarte() {
    var zl = WC.nachkalk.jeVorlage(S.angebote, function (a) { return A.rechne(a, S.katalog, kundeVon(a), S.einst.kleinunternehmer); });
    if (!zl.length) return null;
    var t = h("table", null, h("thead", null, h("tr", null, ["Vorlage", "Positionen", "Plan min", "Ist min", "Faktor", ""].map(function (x, i) { return h("th", { class: i && i < 5 ? "r" : "", text: x }); }))));
    var tb = h("tbody");
    zl.forEach(function (z) {
      var v = finde(S.katalog.vorlagen, z.vorlage), pct = Math.round((z.faktor - 1) * 1000) / 10;
      var tat = !v ? h("span", { class: "gedaempft klein", text: "nicht mehr im Katalog" })
        : z.passt ? h("span", { class: "gedaempft klein", "data-nk-passt": z.vorlage, text: "passt (unter " + WC.nachkalk.PASST_PCT + " %)" })
        : WC.nachkalk.schonUebernommen(S.katalog, z) ? h("span", { class: "gedaempft klein", "data-nk-uebernommen": z.vorlage, text: "übernommen — steht im Verlauf der Vorlage" })
        : knopf("Zeit-Muster × " + deZahl(z.faktor) + " übernehmen", function () {
          var e = WC.nachkalk.kalibrieren(S.katalog, z, A.heute());
          if (!e.ok) { melde("Nicht übernommen: " + (e.grund || "") + ".", "warn"); return; }
          katalogSpeichern();
          melde("Zeit-Muster von „" + v.name + "“ × " + deZahl(z.faktor) + " übernommen — neue Angebote rechnen damit. Gestellte bleiben, wie sie sind. Rücknehmbar im Katalog unter „Verlauf“.", "");
        }, "klein pri", { "data-kalibrieren": z.vorlage });
      tb.append(h("tr", { "data-nk-vorlage": z.vorlage, "data-faktor": String(z.faktor) }, h("td", { text: v ? v.name : z.vorlage }), h("td", { class: "r", text: String(z.n) }),
        h("td", { class: "r", text: deZahl(Math.round(z.planMin)) }), h("td", { class: "r", text: deZahl(Math.round(z.istMin)) }),
        h("td", { class: "r" + (pct > 0 ? " minus" : ""), text: "× " + deZahl(z.faktor) + " (" + (pct > 0 ? "+" : "") + fmtPct(pct) + " %)" }), h("td", null, tat)));
    });
    t.append(tb);
    return h("div", { class: "karte", "data-nk-vorlagen": "" }, h("h3", null, "📏 Nachkalkulation je Vorlage ", h("span", { class: "badge intern", text: "🔒 intern" })),
      h("p", { class: "gedaempft klein", text: "Arbeitszeit aus allen gestellten Angeboten mit erfassten Ist-Minuten. Der Faktor wirkt auf alle Arbeitsschritte der Vorlage; jede Übernahme steht im Verlauf und ist rücknehmbar." }),
      h("div", { class: "tabelle-huelle" }, t));
  }

  /* ════ Angebot ════ */
  function zAngebot(main) {
    var a = aktivesAngebot();
    if (!a) { main.append(h("div", { class: "karte" }, h("p", { text: "Noch kein Angebot offen." }), knopf("＋ Neues Angebot", neuesAngebot, "pri", { id: "neues-angebot" }))); return; }
    var ro = !bearbeitbar(a), kunde = kundeVon(a);
    var r = A.rechne(a, S.katalog, kunde, S.einst.kleinunternehmer), kat = r.kat;

    /* Schrittleiste: jeder sieht, was als Nächstes kommt (Klaus 2026-10-12: „nutzerfreundlich, aber nicht simpel … gleich zum Ziel gelenkt“) */
    main.append(schrittLeiste(a, r, kunde));

    /* Kopf */
    var kundenWahl = h("select", { id: "kunde-wahl", disabled: ro, onchange: function () { vorher(a); a.kundeId = this.value; var k = S.kunden.filter(function (x) { return x.id === a.kundeId; })[0]; if (k) a.kunde = { name: k.name, anschrift: k.anschrift, klasse: k.klasse }; merken(a); zeichne(); } },
      h("option", { value: "", text: "— Kunde wählen —" }), S.kunden.map(function (k) { return h("option", { value: k.id, text: k.name + " (" + (k.klasse || "B") + ")", selected: k.id === a.kundeId }); }));
    main.append(h("div", { class: "karte", "data-schritt-ziel": "kunde" },
      h("div", { class: "position-kopf" }, h("h2", { text: "Angebot " + a.nummer + (A.fassungVon(a) > 1 ? " · Fassung " + A.fassungVon(a) : "") }),
        h("div", { class: "band" },
          knopf("↶ Zurück" + (ZURUECK[a.id] && ZURUECK[a.id].length ? " (" + ZURUECK[a.id].length + ")" : ""), function () { zurueck(a); }, "klein", { id: "zurueck", disabled: ro || !(ZURUECK[a.id] && ZURUECK[a.id].length) }),
          knopf("👁 Vorschau", function () { vorschau(a); }, "klein", { id: "vorschau-angebot" }),
          knopf("🖨 Drucken / PDF", function () { drucke(a); }, "pri klein", { id: "druck-angebot" }),
          knopf("📤 An WorkFloh übergeben", function () { uebergeben(a); }, "klein", { id: "uebergabe" }),
          knopf("🧾 An BookLedgerPro", function () { anBlp(a); }, "klein", { id: "an-blp" }),
          ro ? null : knopf("🔒 Angebot stellen", function () { A.stellen(a, S.katalog); merken(a); melde("Angebot gestellt — Sätze und Einkaufspreise sind jetzt eingefroren. Änderungen ergeben eine neue Fassung.", ""); }, "klein", { id: "stellen" }))),
      ro ? nurLesenBanner(a) : null,
      a.notiz ? h("p", { class: "gedaempft klein", "data-notiz": "" }, a.beispiel ? h("span", { class: "badge gelb", text: "Beispiel" }) : null, " " + a.notiz) : null,
      h("div", { class: "feldgitter" },
        feld("Titel", h("input", { value: a.titel, "data-key": "titel", disabled: ro, oninput: function () { a.titel = this.value; merken(a); zeichneKopf(); } })),
        feld("Kunde", kundenWahl),
        feld("Datum", h("input", { type: "date", value: a.datum, disabled: ro, onchange: function () { a.datum = this.value; merken(a); } })),
        feld("gültig bis", h("input", { type: "date", value: a.gueltigBis, disabled: ro, onchange: function () { a.gueltigBis = this.value; merken(a); } }))),
      ro ? null : kundeSchnell(a)));

    if (a.vorgaenger) { var vk = vergleichKarte(a); if (vk) main.append(vk); }

    /* Preisleiste (intern) */
    var s = r.summen;
    var kl = kunde && kunde.klasse ? kunde.klasse : "";
    var leiste = h("div", { class: "preis-leiste intern", "data-preis-leiste": "" },
      h("span", { class: "badge intern", text: "🔒 intern" }),
      h("span", { class: "badge", "data-leiste-netto": "" }, "Angebot netto ", h("b", { text: euro(s.netto) })),
      h("span", { class: "badge", "data-leiste-sk": "" }, "Selbstkosten " + euro(s.selbstkosten)),
      h("span", { class: "badge " + (s.deckungsbeitrag < 0 ? "verlust" : "ok"), "data-leiste-db": "" }, "Deckungsbeitrag " + euro(s.deckungsbeitrag)),
      kl ? h("span", { class: "badge", "data-leiste-klasse": kl }, kl + "-Kunde") : h("span", { class: "badge", text: "ohne Kundenklasse (B)" }),
      s.offen ? h("span", { class: "badge gelb", text: s.offen + " Position(en) nicht kalkuliert — zählen nicht mit" }) : null,
      r.positionen.some(function (x) { return x.erg.platzhalter; }) ? h("span", { class: "badge gelb", "data-leiste-platzhalter": "" }, "Platzhalter-Werte — nicht aus deinen Zahlen") : null);
    leiste.setAttribute("data-schritt-ziel", "preis");
    main.append(leiste);

    /* Positionen */
    r.positionen.forEach(function (x, i) { main.append(positionKarte(a, x, kat, kunde, ro, i)); });

    /* + Position mit Beispielen */
    if (!ro) main.append(neuePositionKarte(a, kat, kunde));

    /* Versand */
    main.append(versandKarte(a, r, kat, ro));

    /* Summen */
    var t = h("table", { class: "summen-tab", "data-summen": "" });
    t.append(h("tr", null, h("td", { text: "Summe netto" }), h("td", { class: "r", text: euro(s.netto) })));
    s.perSatz.forEach(function (p) { t.append(h("tr", null, h("td", { text: S.einst.kleinunternehmer ? "keine USt (§ 19 UStG)" : "USt " + p.satz + " % auf " + euro(p.netto) }), h("td", { class: "r", text: euro(p.ust) }))); });
    t.append(h("tr", null, h("td", null, h("b", { text: "Gesamt brutto" })), h("td", { class: "r" }, h("b", { text: euro(s.brutto) }))));
    main.append(h("div", { class: "karte", "data-schritt-ziel": "angebot" }, h("h3", { text: "Summe" }), t,
      h("div", { class: "band", style: "margin-top:10px" }, knopf("👁 Vorschau", function () { vorschau(a); }, "klein"), knopf("🖨 Drucken / PDF", function () { drucke(a); }, "pri klein"),
        knopf("📤 An WorkFloh übergeben", function () { uebergeben(a); }, "klein"),
        knopf("🧾 An BookLedgerPro", function () { anBlp(a); }, "klein"),
        h("span", { class: "gedaempft klein", text: "WorkFloh: die Datei mit „📥 Importieren“ einlesen — daraus wird ein Auftrag. BookLedgerPro öffnet sich mit dem vorbefüllten Angebot; gespeichert wird dort erst auf Klick." }))));

    /* Stufe 3: Nachkalkulation — erst am gestellten Angebot, denn verglichen wird mit dem, was angeboten wurde */
    if (a.status === "gestellt") main.append(nachkalkKarte(a, r));
  }

  /* ── Nachkalkulation: Plan gegen Ist (intern) ── */
  function nachkalkKarte(a, r) {
    var N = WC.nachkalk.angebot(a, r), schl = "nk:" + a.id;
    var offen = S.offen[schl] != null ? S.offen[schl] : N.summe.erfasst > 0 || N.summe.versandErfasst;
    var box = h("details", { class: "karte", open: offen, "data-nachkalk": a.id, ontoggle: function () { S.offen[schl] = this.open; } },
      h("summary", null, h("b", { text: "📏 Nachkalkulation — Plan gegen Ist" }), " ", h("span", { class: "badge intern", text: "🔒 intern" }),
        h("span", { class: "gedaempft klein", text: N.summe.erfasst ? " · " + N.summe.erfasst + " von " + N.summe.gesamt + " Position(en) erfasst" : " · noch nichts erfasst" })));
    box.append(h("p", { class: "gedaempft klein", text: "Nach dem Auftrag eintragen, was es wirklich gebraucht hat. Leer heißt „nicht erfasst“ und zählt mit dem Plan. Arbeitszeit = Lohnminuten, ohne Maschinenlaufzeit. Das Angebot selbst ändert sich nicht." }));
    function ist(pid) { a.ist = a.ist || { pos: {} }; a.ist.pos = a.ist.pos || {}; return (a.ist.pos[pid] = a.ist.pos[pid] || {}); }
    function setzen(pid, feldName, wert) {
      var o = ist(pid);
      if (wert == null) delete o[feldName]; else o[feldName] = wert;
      a.ist.datum = A.heute(); merken(a); zeichne();
    }
    N.positionen.forEach(function (q) {
      var x = WC.nachkalk.istVon(a, q.id);
      var mm = q.minutenPct;
      if (q.handel) {
        box.append(h("div", { class: "eintrag-kat", "data-nk-zeile": q.id, "data-sk-ist": String(q.ist.selbstkosten), "data-db-ist": String(q.dbIst) },
          h("div", null, h("span", { class: "badge kennung", text: q.id }), " ", h("b", { text: q.titel }), " ", h("span", { class: "badge", text: "🛒 Einkaufsprodukt" })),
          h("div", { class: "feldgitter" },
            feld("Einkauf Ist komplett inkl. Versand (€, Rechnung des Lieferanten) · Plan " + euro(q.plan.einkauf), h("input", { inputmode: "decimal", value: x.einkaufCent != null ? G.formatCents(x.einkaufCent) : "", placeholder: G.formatCents(q.plan.einkauf), "data-ist": q.id + ":einkaufCent",
              onchange: function () { var c = this.value.trim() === "" ? null : G.parseEuroToCents(this.value); setzen(q.id, "einkaufCent", Number.isFinite(c) && c >= 0 ? c : null); } }))),
          h("p", { class: "klein" + (q.dbIst < 0 ? " verlust" : "") }, q.erfasst ? "Einkauf " + euro(q.plan.einkauf) + " → " + euro(q.ist.einkauf) + " (" + delta(q.plan.einkauf, q.ist.einkauf) + ") · Selbstkosten " + euro(q.plan.selbstkosten) + " → " + euro(q.ist.selbstkosten) +
            " · Deckungsbeitrag " + euro(q.dbPlan) + " → " + euro(q.dbIst) : "nicht erfasst — zählt mit dem Plan (Einkauf " + euro(q.plan.einkauf) + ")")));
        return;
      }
      box.append(h("div", { class: "eintrag-kat", "data-nk-zeile": q.id, "data-sk-ist": String(q.ist.selbstkosten), "data-db-ist": String(q.dbIst) },
        h("div", null, h("span", { class: "badge kennung", text: q.id }), " ", h("b", { text: q.titel })),
        h("div", { class: "feldgitter" },
          feld("Arbeitszeit Ist (min) · Plan " + deZahl(q.plan.minuten), h("input", { inputmode: "decimal", value: x.minuten != null ? deZahl(x.minuten) : "", placeholder: deZahl(q.plan.minuten), "data-ist": q.id + ":minuten",
            onchange: function () { var n = this.value.trim() === "" ? null : zahlPunkt(this.value); setzen(q.id, "minuten", n != null && n >= 0 ? n : null); } })),
          feld("Material Ist (€) · Plan " + euro(q.plan.mek), h("input", { inputmode: "decimal", value: x.materialCent != null ? G.formatCents(x.materialCent) : "", placeholder: G.formatCents(q.plan.mek), "data-ist": q.id + ":materialCent",
            onchange: function () { var c = this.value.trim() === "" ? null : G.parseEuroToCents(this.value); setzen(q.id, "materialCent", Number.isFinite(c) && c >= 0 ? c : null); } })),
          q.plan.maschinenH > 0 ? feld("Maschine Ist (h) · Plan " + deZahl(q.plan.maschinenH), h("input", { inputmode: "decimal", value: x.maschinenH != null ? deZahl(x.maschinenH) : "", placeholder: deZahl(q.plan.maschinenH), "data-ist": q.id + ":maschinenH",
            onchange: function () { var n = this.value.trim() === "" ? null : zahlPunkt(this.value); setzen(q.id, "maschinenH", n != null && n >= 0 ? n : null); } })) : null),
        h("p", { class: "klein" + (q.dbIst < 0 ? " verlust" : "") }, q.erfasst ? "Selbstkosten " + euro(q.plan.selbstkosten) + " → " + euro(q.ist.selbstkosten) + " (" + delta(q.plan.selbstkosten, q.ist.selbstkosten) + ")" +
          (mm != null ? " · Arbeitszeit " + (mm > 0 ? "+" : "") + fmtPct(mm) + " %" : "") + " · Deckungsbeitrag " + euro(q.dbPlan) + " → " + euro(q.dbIst)
          : "nicht erfasst — zählt mit dem Plan (Selbstkosten " + euro(q.plan.selbstkosten) + ")")));
    });
    var vi = a.ist && a.ist.versandCent != null ? a.ist.versandCent : null;
    box.append(feld("Verpackung & Versand Ist (€) · Plan " + euro(N.versand.plan), h("input", { inputmode: "decimal", value: vi != null ? G.formatCents(vi) : "", placeholder: G.formatCents(N.versand.plan), "data-ist-versand": "",
      onchange: function () { var c = this.value.trim() === "" ? null : G.parseEuroToCents(this.value); a.ist = a.ist || { pos: {} }; if (Number.isFinite(c) && c >= 0) a.ist.versandCent = c; else delete a.ist.versandCent; a.ist.datum = A.heute(); merken(a); zeichne(); } })));
    var su = N.summe;
    box.append(h("div", { class: "preis-leiste intern", "data-nk-summe": "", "data-db-plan": String(su.dbPlan), "data-db-ist": String(su.dbIst) },
      h("span", { class: "badge", text: "Angebot netto " + euro(su.netto) }),
      h("span", { class: "badge", text: "Selbstkosten Plan " + euro(su.skPlan) + " → Ist " + euro(su.skIst) }),
      h("span", { class: "badge " + (su.dbIst < 0 ? "verlust" : "ok") }, "Deckungsbeitrag Plan " + euro(su.dbPlan) + " → Ist ", h("b", { text: euro(su.dbIst) })),
      su.ausPlan ? h("span", { class: "badge gelb", "data-nk-ausplan": String(su.ausPlan) }, su.ausPlan + " Position(en) ohne Ist-Werte zählen mit dem Plan") : null));
    box.append(h("p", { class: "gedaempft klein", text: "Weicht die Arbeitszeit bei einer Vorlage immer wieder ab, lässt sie sich im Reiter „Angebote“ unter „Nachkalkulation je Vorlage“ ins Zeit-Muster übernehmen." }));
    return box;
  }

  /* ── Gestellt: nur lesen, Weg zur neuen Fassung (wie Workflow-Needs) ── */
  function nurLesenBanner(a) {
    var box = h("div", { class: "hinweis warn", "data-nur-lesen": "" }, "Gestellt und eingefroren — nur lesen. Spätere Katalogänderungen verschieben dieses Angebot nicht.");
    if (a.ersetztDurch) {
      box.append(" ", h("span", { "data-ersetzt": a.ersetztDurch }, "Ersetzt durch Fassung " + (A.fassungVon(a) + 1) + "."), " ",
        knopf("Zur neuen Fassung", function () { S.aktiv = a.ersetztDurch; lsSet(LS.aktiv, S.aktiv); zeichne(); }, "klein"));
      return box;
    }
    var anl = h("input", { value: "Änderungswunsch des Kunden", id: "anlass-fassung", "data-key": "anlass-fassung", style: "flex:1 1 220px" });
    box.append(h("div", { class: "zeile", "data-neue-fassung": "" }, anl, knopf("✎ Neue Fassung zum Ändern", function () {
      var r = A.neueFassung(S.angebote, a, anl.value);
      if (!r.ok) { melde(r.grund, "warn"); return; }
      S.angebote.unshift(r.angebot); merken(a); merken(r.angebot); S.aktiv = r.angebot.id; lsSet(LS.aktiv, S.aktiv);
      melde("Fassung " + r.angebot.fassung + " angelegt — Fassung " + A.fassungVon(a) + " bleibt gestellt, wie sie ist.", "");
    }, "pri klein", { id: "neue-fassung" })));
    return box;
  }
  /* Vergleich mit der vorigen Fassung */
  function vergleichKarte(a) {
    var alt = S.angebote.filter(function (x) { return x.id === a.vorgaenger; })[0];
    if (!alt) return null;
    var v = A.vergleich(A.rechne(alt, S.katalog, kundeVon(alt), S.einst.kleinunternehmer), A.rechne(a, S.katalog, kundeVon(a), S.einst.kleinunternehmer));
    var t = h("table", { "data-vergleich": "" }, h("tr", null, ["Position", "Fassung " + A.fassungVon(alt), "Fassung " + A.fassungVon(a), ""].map(function (x, i) { return h("th", { class: i && i < 3 ? "r" : "", text: x }); })));
    var ART = { neu: ["neu", "status-neu"], entfallen: ["entfällt", "status-entfallen"], geaendert: ["geändert", "status-geaendert"], gleich: ["gleich", "status-gleich"] };
    v.zeilen.forEach(function (z) { t.append(h("tr", { "data-vergleich-zeile": z.art }, h("td", { text: z.id + " " + z.titel }), h("td", { class: "r", text: z.alt == null ? "—" : euro(z.alt) }),
      h("td", { class: "r", text: z.neu == null ? "—" : euro(z.neu) }), h("td", { class: ART[z.art][1], text: ART[z.art][0] }))); });
    t.append(h("tr", null, h("td", { text: "Verpackung & Versand" }), h("td", { class: "r", text: euro(v.versand.alt) }), h("td", { class: "r", text: euro(v.versand.neu) }), h("td")));
    t.append(h("tr", null, h("td", null, h("b", { text: "Summe netto" })), h("td", { class: "r", text: euro(v.summe.alt) }), h("td", { class: "r" }, h("b", { text: euro(v.summe.neu) })),
      h("td", { class: v.summe.diff > 0 ? "plus" : v.summe.diff < 0 ? "minus" : "", "data-vergleich-diff": String(v.summe.diff), text: delta(v.summe.alt, v.summe.neu) })));
    return h("details", { class: "karte", open: true, "data-vergleich-karte": "" }, h("summary", { text: "Vergleich mit Fassung " + A.fassungVon(alt) + (a.anlass ? " — Anlass: " + a.anlass : "") }),
      h("div", { class: "tabelle-huelle" }, t));
  }

  /* ── An BookLedgerPro: gleicher Origin, ?uebernahme= (Datenvertrag v1) ── */
  function anBlp(a) {
    var r = A.rechne(a, S.katalog, kundeVon(a), S.einst.kleinunternehmer);
    var ad = WC.uebergabe.blpAdresse(WC.aussen.angebotExtern(a, r, S.einst.firma, S.einst.kleinunternehmer));
    if (!ad.ok) { melde("Nicht an BookLedgerPro übergeben: " + ad.grund + ".", "warn"); return; }
    jetztSpeichern().then(function () {
      if (window.__wcSprungAbfangen) { window.__wcSprung = ad.url; return; }
      location.assign(ad.url);
    });
  }

  /* ── Schritte ── */
  function schrittLeiste(a, r, kunde) {
    var pos = r.positionen, alleOk = pos.length && pos.every(function (x) { return x.erg.ok; });
    var verlust = pos.some(function (x) { return x.erg.ok && x.erg.lage !== "ok"; });
    var schritte = [
      ["kunde", "1 Kunde", !!(kunde && kunde.name), "Kunde wählen oder neu anlegen."],
      ["produkt", "2 Produkt", pos.length > 0, "Unten bei „＋ Position“ ein Produkt wählen — am schnellsten über ein Beispiel."],
      ["masse", "3 Maße & Material", !!alleOk, "In der Position Maße, Menge und Material eintragen, bis ein Preis dasteht."],
      ["preis", "4 Preis prüfen", !!alleOk && !verlust, verlust ? "Ein Preis liegt unter den Kosten — „💶 Preis nachbessern“ öffnen." : "Preis ansehen; bei Bedarf „💶 Preis nachbessern“."],
      ["versand", "5 Versand", r.versand.ok, r.versand.ok ? "" : "Verpackung & Versand von Hand setzen."],
      ["angebot", "6 Angebot", a.status === "gestellt", "Vorschau ansehen, drucken oder an WorkFloh übergeben."],
    ];
    var naechster = schritte.filter(function (x) { return !x[2]; })[0];
    return h("div", { class: "karte schritte", "data-schritte": "" },
      h("div", { class: "band" }, schritte.map(function (x) {
        return h("button", { type: "button", class: "btn chip" + (x[2] ? " fertig" : naechster === x ? " on" : ""), "data-schritt": x[0], "data-fertig": x[2] ? "1" : "0",
          onclick: function () { var z = document.querySelector('[data-schritt-ziel="' + x[0] + '"]'); if (z) z.scrollIntoView({ behavior: "smooth", block: "start" }); } }, (x[2] ? "✓ " : "") + x[1]);
      })),
      h("p", { class: "klein", "data-naechster": naechster ? naechster[0] : "fertig" }, naechster ? h("b", { text: "Nächster Schritt: " }) : null, naechster ? naechster[3] : "Alles fertig — Angebot ist gestellt."));
  }
  function kundeSchnell(a) {
    var name = h("input", { placeholder: "Neuer Kunde: Name / Firma", "data-key": "kunde-neu", id: "kunde-neu-name", style: "flex:1 1 200px" });
    var kl = h("select", { id: "kunde-neu-klasse", "aria-label": "Klasse" }, ["A", "B", "C"].map(function (c) { return h("option", { value: c, text: c + "-Kunde", selected: c === "B" }); }));
    return h("div", { class: "zeile", "data-kunde-schnell": "" }, name, kl, knopf("＋ anlegen", function () {
      if (!name.value.trim()) { name.focus(); return; }
      var n = 1; S.kunden.forEach(function (k) { var m = /^K-(\d+)$/.exec(k.id); if (m) n = Math.max(n, +m[1] + 1); });
      var k = { id: "K-" + n, name: name.value.trim(), anschrift: "", klasse: kl.value };
      S.kunden.push(k); dbPut("kunden", kopie(k)); vorher(a); a.kundeId = k.id; a.kunde = { name: k.name, anschrift: "", klasse: k.klasse }; merken(a); zeichne();
    }, "klein", { id: "kunde-neu-anlegen" }));
  }

  /* ── Übergabe an WorkFloh (Format wie Workflow-Needs) ── */
  function uebergeben(a) {
    var r = A.rechne(a, S.katalog, kundeVon(a), S.einst.kleinunternehmer);
    var d = WC.aussen.angebotExtern(a, r, S.einst.firma, S.einst.kleinunternehmer);
    if (!d.positionen.length) { melde("Noch keine kalkulierte Position — nichts zu übergeben.", "warn"); return; }
    var auf = WC.uebergabe.auftrag(d);
    var ids = []; a.positionen.forEach(function (p) { (p.bilder || []).forEach(function (b) { if (ids.indexOf(b) < 0) ids.push(b); }); });
    Promise.all(ids.map(function (id, i) { return dbGet("bilder", id).then(function (x) { return x && x.blob ? { name: a.nummer + "_Bild-" + (i + 1) + ".jpg", blob: x.blob } : null; }); }))
      .then(function (l) { return WC.uebergabe.dateien(l.filter(Boolean)); })
      .then(function (fs) {
        auf.files = fs;
        var text = JSON.stringify(WC.uebergabe.buendel([auf]), null, 1);
        window.__wcUebergabe = text;
        herunterladen(WC.uebergabe.dateiname(d), text, "application/json");
        melde("Auftragsdatei „" + WC.uebergabe.dateiname(d) + "“ gespeichert. In Mein WorkFloh oder Tomys WorkFloh: „📥 Importieren“ und die Datei wählen.", "");
      });
  }

  /* ── Eine Position ── */
  function positionKarte(a, x, kat, kunde, ro, idx) {
    var p = x.pos, e = x.erg, v = finde(kat.vorlagen, p.vorlage);
    var ctx = { angebot: a, kunde: kunde };
    function setze(fn) { return function () { if (ro) return; vorher(a); fn.apply(this, arguments); merken(a); zeichne(); }; }
    var karte = h("div", { class: "position" + (e.ok ? "" : " offen"), "data-position": p.id, "data-schritt-ziel": idx === 0 ? "masse" : null });
    karte.append(h("div", { class: "position-kopf" },
      h("div", null, h("span", { class: "badge kennung", text: p.id }), " ", h("b", { text: v ? v.name : "Vorlage fehlt" })),
      ro ? null : knopf("✕ Position entfernen", setze(function () { a.positionen = a.positionen.filter(function (q) { return q !== p; }); }), "klein gefahr")));
    if (!v) return karte;

    /* Eingaben */
    var g = h("div", { class: "feldgitter" });
    g.append(feld("Titel (Kundenblatt)", h("input", { value: p.titel, "data-key": p.id + "-titel", disabled: ro, oninput: function () { p.titel = this.value; merken(a); } })));
    g.append(feld("Beschreibung (Kundenblatt)", h("input", { value: p.beschreibung, "data-key": p.id + "-beschr", disabled: ro, oninput: function () { p.beschreibung = this.value; merken(a); } })));
    if (v.mengenregel !== "stueck" || v.breiteVorgabe) {
      g.append(feld(v.mengenregel === "laenge" ? "Länge mm" : "Breite mm", h("input", { inputmode: "decimal", value: deZahl(p.breiteMm), "data-key": p.id + "-b", "data-feld": "breite", disabled: ro, onchange: setze(function () { p.breiteMm = zahlPunkt(this.value) || ""; }) })));
      g.append(feld("Höhe mm", h("input", { inputmode: "decimal", value: deZahl(p.hoeheMm), "data-key": p.id + "-h", "data-feld": "hoehe", disabled: ro, onchange: setze(function () { p.hoeheMm = zahlPunkt(this.value) || ""; }) })));
    }
    var einh = v.einheitText || "Stk.";
    g.append(feld("Menge in " + einh + " (für die Summe)", h("input", { inputmode: "numeric", value: p.menge, "data-key": p.id + "-menge", "data-feld": "menge", disabled: ro, onchange: setze(function () { var n = Math.max(1, Math.round(zahlPunkt(this.value) || 1)); p.menge = n; if (p.staffeln.indexOf(n) < 0) p.staffeln = p.staffeln.concat([n]).sort(function (q, w) { return q - w; }); }) })));
    g.append(feld("Staffel (Mengen, mit Komma)", h("input", { value: p.staffeln.join(", "), "data-key": p.id + "-staffel", "data-feld": "staffel", disabled: ro, onchange: setze(function () {
      var l = this.value.split(/[,;\s]+/).map(function (q) { return Math.round(Number(q)); }).filter(function (q) { return q > 0; });
      l = l.filter(function (q, i2) { return l.indexOf(q) === i2; }).sort(function (q, w) { return q - w; });
      if (!l.length) l = [p.menge]; if (l.indexOf(p.menge) < 0) p.menge = l[0]; p.staffeln = l; }) })));
    if ((v.verfahrenWahl || []).length > 1) {
      g.append(feld("Verfahren", h("select", { "data-feld": "verfahren", disabled: ro, onchange: setze(function () { p.verfahren = this.value; }) },
        v.verfahrenWahl.map(function (id) { var vf = finde(kat.verfahren, id); return h("option", { value: id, text: vf ? vf.name : id, selected: id === (p.verfahren || v.verfahrenVorgabe) }); }))));
    }
    if (v.stiche) g.append(feld("Stichzahl je Stück", h("input", { inputmode: "numeric", value: p.stiche != null && p.stiche !== "" ? p.stiche : v.sticheVorgabe || "", "data-key": p.id + "-stiche", "data-feld": "stiche", disabled: ro,
      onchange: setze(function () { var n = Math.round(zahlPunkt(this.value) || 0); p.stiche = n > 0 ? n : ""; }) })));
    if ((+v.farbenMax || 1) > 1) {
      var vfA = finde(kat.verfahren, p.verfahren || v.verfahrenVorgabe);
      var opts = []; for (var f = 1; f <= v.farbenMax; f++) opts.push(h("option", { value: f, text: f + (f === 1 ? " Farbe" : " Farben"), selected: f === (+p.farben || 1) }));
      g.append(feld("Farben" + (vfA && vfA.farbregel === "digital" ? " (vierfarbig: zählt nicht)" : ""), h("select", { "data-feld": "farben", disabled: ro, onchange: setze(function () { p.farben = +this.value; }) }, opts)));
    }
    (v.slots || []).forEach(function (sl) {
      var vf = finde(kat.verfahren, p.verfahren || v.verfahrenVorgabe);
      if (sl.nurBei && sl.nurBei.length && (!vf || sl.nurBei.indexOf(vf.id) < 0)) return;
      var w = Object.prototype.hasOwnProperty.call(p.wahl || {}, sl.id) ? p.wahl[sl.id] : sl.vorgabe;
      g.append(feld(sl.name, h("select", { "data-slot": sl.id, disabled: ro, onchange: setze(function () { p.wahl = Object.assign({}, p.wahl); p.wahl[sl.id] = this.value; }) },
        sl.optional ? h("option", { value: "", text: "— ohne —", selected: !w }) : null,
        (sl.wahl || []).map(function (id) { var m = finde(kat.materialien, id); return h("option", { value: id, text: m ? m.name : id, selected: id === w }); }))));
    });
    karte.append(g);
    if (v.einkaufsprodukt) karte.append(h("p", { class: "gedaempft klein", "data-handel-hinweis": "" }, "🛒 Einkaufsprodukt — Verkauf komplett inkl. Versand, kein eigener Versandposten. Eingetragene Mengen: " +
      (K.einkaufsMengen(v).join(", ") || "keine") + " (Zwischenmengen werden nicht geschätzt). ", knopf("Einkauf ansehen", function () { geheZu("handel"); }, "klein")));

    /* Bilder der Position */
    var daumen = h("div", { class: "daumen", "data-pos-bilder": "" });
    (p.bilder || []).forEach(function (id) {
      daumen.append(h("span", null, h("img", { src: bildQuelle(id), alt: "Bild" }), ro ? null : knopf("✕", setze(function () { p.bilder = p.bilder.filter(function (q) { return q !== id; }); }), "klein", { "aria-label": "Bild entfernen" })));
    });
    if (!ro) daumen.append(h("label", { class: "btn klein" }, "📷 Bild dazu", h("input", { type: "file", accept: "image/*", hidden: true, "data-bild-hoch": p.id, onchange: function () {
      var file = this.files && this.files[0]; if (!file) return;
      bildSpeichern(file).then(function (id) { vorher(a); p.bilder = (p.bilder || []).concat([id]); merken(a); zeichne(); }, function () { melde("Das Bild ließ sich nicht lesen.", "bad"); });
    } })));
    karte.append(h("div", { class: "zeile" }, h("span", { class: "gedaempft klein", text: "Bilder (Motiv, Mockup — das erste kommt aufs Angebot):" }), daumen));

    /* Ergebnis */
    if (!e.ok) {
      karte.append(h("div", { class: "hinweis warn", "data-nicht-kalkuliert": "" }, "Nicht kalkuliert — zählt nicht mit: " + e.offen.join(" · ")));
      return karte;
    }
    var lageText = e.lage === "unter_hk" ? "unter den Herstellkosten — Verlust je Stück " + euro(Math.round((e.herstellkosten - e.netto) / e.menge)) + " schon ohne Gemeinkosten"
      : e.lage === "unter_sk" ? "unter Selbstkosten — Verlust je Stück " + euro(Math.round((e.selbstkosten - e.netto) / e.menge)) + "; deckt die Gemeinkosten nicht" : "";
    karte.append(h("div", { class: "band", style: "justify-content:space-between" },
      h("div", null, h("div", { class: "preis-gross" + (e.lage !== "ok" ? " verlust" : ""), "data-pos-netto": String(e.netto) }, euro(e.netto)),
        h("div", { class: "gedaempft klein" }, e.menge + " " + einh + " · " + euro(e.stueckCent) + " je " + einh + " netto" + (e.eigen != null ? " · eigener Preis" : ""))),
      h("div", { class: "band" },
        h("span", { class: "badge intern", "data-pos-sk": String(e.selbstkosten) }, "Selbstkosten " + euro(e.selbstkosten)),
        e.eigen != null ? h("span", { class: "badge gelb", "data-eigen-abstand": "" }, abstandText(e)) : null)));
    if (lageText) karte.append(h("div", { class: "hinweis bad", "data-verlust": e.lage }, "⚠ " + lageText + ". Das ist erlaubt — du entscheidest."));

    /* Staffel mit eigenem Preis */
    karte.append(staffelTabelle(a, x, kat, ro));

    /* Werkzeuge — eingeklappt, bis man sie braucht */
    function umschalter(art, text, attr) {
      var an = !!S.offen[p.id + ":" + art];
      return knopf(text, function () { S.offen[p.id + ":" + art] = !an; zeichne(); }, "klein" + (an ? " on" : ""), attr);
    }
    karte.append(h("div", { class: "band", style: "margin-top:6px" },
      umschalter("nachbessern", "💶 Preis nachbessern", { "data-nachbessern-knopf": p.id }),
      umschalter("markt", "📊 Marktvergleich", { "data-markt-knopf": p.id }),
      umschalter("weg", "🔒 Rechenweg", { "data-weg-knopf": p.id }),
      (v.beispiele || []).length ? umschalter("bsp", "🖼 Beispiele (" + v.beispiele.length + ")", null) : null));
    if (S.offen[p.id + ":nachbessern"]) karte.append(erklaerChips(a, p, v, e, kat, ctx, ro));

    /* Eigener Preis → in die Vorlage übernehmen */
    if (e.eigen != null && e.eigen !== e.nettoKalk && !ro) karte.append(lernenFeld(a, p, v, e, kat, ctx));

    if (S.offen[p.id + ":weg"]) {
      var schema = h("table", { class: "schema" });
      e.schema.zeilen.forEach(function (z) { schema.append(h("tr", { class: /^=/.test(z.text) ? "summe" : "" }, h("td", { text: z.text }), h("td", { class: "r", text: euro(z.cent) }))); });
      karte.append(h("div", { class: "erklaer-feld", "data-rechenweg": "" }, h("b", { text: "🔒 Rechenweg (intern) — " + (e.handel ? "Handelskalkulation" : "Zuschlagskalkulation") }),
        e.handel && KAT.sichereAdresse(e.handel.url) ? h("p", { class: "klein" }, "Lieferant: ", h("a", { href: KAT.sichereAdresse(e.handel.url), target: "_blank", rel: "noopener noreferrer", text: (e.handel.lieferantName || "Link") + " ↗" })) : null,
        h("ul", { class: "weg" }, e.weg.map(function (w) { return h("li", { text: w }); })), schema,
        h("p", { class: "gedaempft klein", text: "Sätze: " + satzQuellen(e) })));
    }
    if (S.offen[p.id + ":markt"]) karte.append(marktFeld(a, p, v, e));
    if (S.offen[p.id + ":bsp"]) karte.append(galerie(v, kat, ctx, null));
    return karte;
  }
  function abstandText(e) {
    var d = e.eigen - e.nettoKalk, pct = e.nettoKalk ? Math.round(d / e.nettoKalk * 1000) / 10 : 0;
    return "eigener Preis: " + (d >= 0 ? "+" : "−") + String(Math.abs(pct)).replace(".", ",") + " % " + (d >= 0 ? "über" : "unter") + " Kalkulation (" + euro(e.nettoKalk) + ")";
  }
  function satzQuellen(e) {
    var Q = { position: "Position", angebot: "Angebot", vorlage: "Vorlage", gebiet: "Arbeitsgebiet", vorgabe: "Vorgabe" };
    function q(k) { var s = e.quelle[k] || ""; return (Q[s.replace("+klasse", "")] || s) + (/\+klasse/.test(s) ? " + Klasse " + e.klasse : ""); }
    var lohn = e.saetze.modus === "voll" ? "lohnCent" : "stundensatzCent";
    return (e.saetze.modus === "voll" ? "ausführlich" : "vereinfacht") + " · " + K.SATZ_LABEL[lohn] + " " + euro(Math.round(e.effektiv.lohnCent)) + " (" + q(lohn) + ") · Gewinn " +
      String(Math.round(e.effektiv.gewinnPct * 100) / 100).replace(".", ",") + " % (" + q("gewinnPct") + ")";
  }

  /* ── Staffel: Menge → Stückpreis, Summe, Selbstkosten; eigener Preis je Zeile ── */
  function staffelTabelle(a, x, kat, ro) {
    var p = x.pos, einhS = (finde(kat.vorlagen, p.vorlage) || {}).einheitText || "Stk.";
    var t = h("table", { "data-staffel": p.id }, h("thead", null, h("tr", null, h("th", { text: "Menge" }), h("th", { class: "r", text: "je " + einhS }), h("th", { class: "r", text: "netto" }),
      h("th", { class: "r", text: "🔒 Selbstk." }), h("th", { text: "Eigener Preis netto" }))));
    var tb = h("tbody");
    x.staffel.forEach(function (st) {
      if (!st.ok) { tb.append(h("tr", null, h("td", { text: String(st.menge || "") }), h("td", { colspan: "4", text: "nicht kalkuliert: " + st.offen.join(" · ") }))); return; }
      var inp = h("input", { class: "mittel", inputmode: "decimal", placeholder: G.formatCents(st.nettoKalk), value: st.eigen != null ? G.formatCents(st.eigen) : "", disabled: ro,
        "data-eigen": String(st.menge), "data-key": p.id + "-eigen-" + st.menge, onchange: function () {
          vorher(a); var c = this.value.trim() === "" ? null : G.parseEuroToCents(this.value);
          p.eigen = Object.assign({}, p.eigen); if (c == null || !Number.isFinite(c)) delete p.eigen[st.menge]; else p.eigen[st.menge] = c;
          merken(a); zeichne(); } });
      tb.append(h("tr", { class: st.menge === p.menge ? "" : "", "data-staffel-zeile": String(st.menge) },
        h("td", null, h("b", { text: String(st.menge) }), st.menge === p.menge ? h("span", { class: "gedaempft klein", text: " · Summe" }) : null),
        h("td", { class: "r" + (st.lage !== "ok" ? " verlust" : ""), text: euro(st.stueckCent) }), h("td", { class: "r", text: euro(st.netto) }),
        h("td", { class: "r intern-satz", text: euro(st.selbstkosten) }), h("td", null, inp)));
    });
    t.append(tb);
    return h("div", { class: "tabelle-huelle" }, t);
  }

  /* ── Erklären an Ort und Stelle: Wert antippen → Alternativen mit vorher gerechneter Wirkung ── */
  function erklaerChips(a, p, v, e, kat, ctx, ro) {
    var vf = finde(kat.verfahren, p.verfahren || v.verfahrenVorgabe);
    if (e.handel) return erklaerChipsBox(a, p, v, e, kat, ctx, ro, [["menge", "Menge " + p.menge], ["gewinn", "Gewinn " + String(Math.round(e.effektiv.gewinnPct * 10) / 10).replace(".", ",") + " %"]]);
    var chips = [["menge", "Menge " + p.menge], ["zeit", "Arbeitszeit " + String(Math.round(e.minuten)).replace(".", ",") + " min"],
      ["stundensatz", (e.saetze.modus === "voll" ? "Lohn " : "Stundensatz ") + euro(Math.round(e.effektiv.lohnCent)) + "/h"],
      ["gewinn", "Gewinn " + String(Math.round(e.effektiv.gewinnPct * 10) / 10).replace(".", ",") + " %"]];
    if ((v.verfahrenWahl || []).length > 1 && vf) chips.splice(1, 0, ["verfahren", vf.name]);
    if ((+v.farbenMax || 1) > 1) chips.splice(1, 0, ["farben", (+p.farben || 1) + " Farbe(n)"]);
    (v.slots || []).forEach(function (sl) {
      if (sl.nurBei && sl.nurBei.length && (!vf || sl.nurBei.indexOf(vf.id) < 0)) return;
      if ((sl.wahl || []).length + (sl.optional ? 1 : 0) < 2) return;
      var w = Object.prototype.hasOwnProperty.call(p.wahl || {}, sl.id) ? p.wahl[sl.id] : sl.vorgabe, m = finde(kat.materialien, w);
      chips.push(["slot:" + sl.id, sl.name + ": " + (m ? m.name : "ohne")]);
    });
    return erklaerChipsBox(a, p, v, e, kat, ctx, ro, chips);
  }
  function erklaerChipsBox(a, p, v, e, kat, ctx, ro, chips) {
    var schluessel = p.id + ":erklaer";
    var box = h("div", { "data-erklaer": p.id },
      h("div", { class: "band" }, h("span", { class: "gedaempft klein", text: "Preis nachbessern — antippen:" }),
        chips.map(function (c) {
          var an = S.offen[schluessel] === c[0];
          return h("button", { type: "button", class: "badge erklaer-chip" + (an ? " erklaer-offen" : ""), text: c[1], "data-chip": c[0],
            onclick: function () { S.offen[schluessel] = an ? null : c[0]; zeichne(); } });
        })));
    if (S.offen[schluessel]) box.append(erklaerFeld(a, p, v, e, kat, ctx, S.offen[schluessel], ro));
    return box;
  }
  function alternativen(p, v, e, kat, art) {
    var l = [];
    var lohnKey = e.saetze.modus === "voll" ? "lohnCent" : "stundensatzCent";
    if (art === "menge") {
      /* Handelsware: nur Mengen mit eingetragenem Einkauf — Zwischenmengen werden nicht geschätzt */
      var ms = (e.handel ? e.handel.mengen : [Math.max(1, Math.round(p.menge / 2)), p.menge * 2].concat(p.staffeln)).filter(function (m, i, s) { return m !== p.menge && s.indexOf(m) === i; }).sort(function (q, w) { return q - w; });
      ms.forEach(function (m) { l.push({ label: m + " Stück", tun: function (q) { q.menge = m; if (q.staffeln.indexOf(m) < 0) q.staffeln = q.staffeln.concat([m]).sort(function (x, y) { return x - y; }); } }); });
    } else if (art === "verfahren") {
      (v.verfahrenWahl || []).forEach(function (id) { var vf = finde(kat.verfahren, id); if (id !== (p.verfahren || v.verfahrenVorgabe)) l.push({ label: vf ? vf.name : id, tun: function (q) { q.verfahren = id; } }); });
    } else if (art === "farben") {
      for (var f = 1; f <= (+v.farbenMax || 1); f++) (function (f) { if (f !== (+p.farben || 1)) l.push({ label: f + (f === 1 ? " Farbe" : " Farben"), tun: function (q) { q.farben = f; } }); })(f);
    } else if (art.indexOf("slot:") === 0) {
      var sl = finde(v.slots, art.slice(5)), cur = Object.prototype.hasOwnProperty.call(p.wahl || {}, sl.id) ? p.wahl[sl.id] : sl.vorgabe;
      (sl.optional ? [""] : []).concat(sl.wahl || []).forEach(function (id) {
        if (id === cur) return; var m = finde(kat.materialien, id);
        l.push({ label: id ? m ? m.name : id : "ohne", tun: function (q) { q.wahl = Object.assign({}, q.wahl); q.wahl[sl.id] = id; } });
      });
    } else if (art === "zeit") {
      [-20, -10, 10, 20].forEach(function (pc) {
        l.push({ label: (pc > 0 ? "+" : "−") + Math.abs(pc) + " % Zeit", tun: function (q) {
          q.zeiten = Object.assign({}, q.zeiten);
          e.zeiten.forEach(function (z) {
            var st = finde(v.schritte, z.schritt), ov = (p.zeiten || {})[z.schritt] || {};
            function b(k) { return zahl(ov[k]) != null ? +ov[k] : +st[k] || 0; }
            q.zeiten[z.schritt] = { ruestMin: rund2(b("ruestMin") * (1 + pc / 100)), minJeStueck: rund2(b("minJeStueck") * (1 + pc / 100)), minJeM2: rund2(b("minJeM2") * (1 + pc / 100)) };
          });
        } });
      });
      if (p.zeiten && Object.keys(p.zeiten).length) l.push({ label: "Zeit-Muster der Vorlage", tun: function (q) { q.zeiten = {}; } });
    } else if (art === "stundensatz") {
      [-10, -5, 5, 10].forEach(function (pc) { l.push({ label: (pc > 0 ? "+" : "−") + Math.abs(pc) + " % Satz (nur diese Position)", tun: function (q) { q.saetze = Object.assign({}, q.saetze); q.saetze[lohnKey] = Math.round(e.effektiv.lohnCent * (1 + pc / 100)); } }); });
      if (p.saetze && p.saetze[lohnKey] != null) l.push({ label: "Satz wie Vorlage/Kundenklasse", tun: function (q) { q.saetze = Object.assign({}, q.saetze); delete q.saetze[lohnKey]; } });
    } else if (art === "gewinn") {
      [0, 10, 15, 20, 30].forEach(function (gw) { if (Math.abs(gw - e.effektiv.gewinnPct) > 0.01) l.push({ label: "Gewinn " + gw + " % (nur diese Position)", tun: function (q) { q.saetze = Object.assign({}, q.saetze, { gewinnPct: gw }); } }); });
      if (p.saetze && p.saetze.gewinnPct != null) l.push({ label: "Gewinn wie Vorlage/Kundenklasse", tun: function (q) { q.saetze = Object.assign({}, q.saetze); delete q.saetze.gewinnPct; } });
    }
    return l;
  }
  function rund2(x) { return Math.round(x * 100) / 100; }
  function erklaerFeld(a, p, v, e, kat, ctx, art, ro) {
    var box = h("div", { class: "erklaer-feld", "data-erklaer-feld": art });
    var text = { menge: "Mehr Stück verteilen Rüstzeit und Einrichten — der Stückpreis sinkt.", zeit: "Das Zeit-Muster der Vorlage, für diese Position angepasst.",
      stundensatz: "Satz nur für diese Position (eine Kundenklasse wirkt dann hier nicht mehr).", gewinn: "Gewinnaufschlag nur für diese Position.",
      farben: "Je Farbe: eigene Folie, eigenes Plotten/Entgittern, eigener Pressgang, eigenes Rüsten — außer beim vierfarbigen Digitaltransfer.",
      verfahren: "Ein anderes Verfahren ändert Material, Zeit und Maschine." }[art] || "Anderes Material — Einkaufspreis, Verschnitt und Gewicht ändern sich.";
    box.append(h("p", { class: "klein", text: text }));
    var alts = alternativen(p, v, e, kat, art);
    if (!alts.length) box.append(h("p", { class: "gedaempft klein", text: "Keine Alternative im Katalog." }));
    alts.forEach(function (al) {
      var q = kopie(p); al.tun(q);
      var n = K.position(kat, q, ctx);
      /* verglichen wird der KALKULIERTE Preis — ein eigener Preis würde jede Wirkung verdecken */
      var alt = e.nettoKalk;
      var wirk = n.ok ? "netto " + euro(alt) + " → " + euro(n.nettoKalk) + " (" + delta(alt, n.nettoKalk) + ") · " + euro(n.menge ? Math.round(n.nettoKalk / n.menge) : 0) + "/Stück · DB " + euro(n.nettoKalk - n.selbstkosten)
        : "nicht kalkulierbar: " + n.offen.join(" · ");
      box.append(h("div", { class: "alt-zeile", "data-alternative": al.label },
        ro ? h("span", { text: al.label }) : knopf(al.label, function () { vorher(a); al.tun(p); merken(a); S.offen[p.id + ":erklaer"] = null; zeichne(); }, "klein"),
        h("span", { class: "wirkung", "data-wirkung": n.ok ? String(n.nettoKalk) : "", text: wirk })));
    });
    if (ro) box.append(h("p", { class: "gedaempft klein", text: "Gestellt — hier wird nur erklärt, nicht geändert." }));
    return box;
  }

  /* ── Eigener Preis → Formel lernen (drei Wege, Wirkung vorher) ── */
  function lernenFeld(a, p, v, e, kat, ctx) {
    var box = h("div", { class: "erklaer-feld", "data-lernen": p.id });
    box.append(h("p", null, h("b", { text: "In die Vorlage „" + v.name + "“ übernehmen …" }), " ",
      h("span", { class: "gedaempft klein", text: "Damit neue Angebote mit dieser Vorlage von selbst " + euro(e.eigen) + " für " + e.menge + " Stück ergeben. Gestellte Angebote bleiben, wie sie sind." })));
    var anlass = h("input", { value: "Preis aus der Praxis (" + a.nummer + ")", "data-key": p.id + "-anlass", style: "flex:1 1 220px" });
    box.append(h("div", { class: "zeile" }, h("span", { class: "klein", text: "Anlass:" }), anlass));
    var WEGE = [["gewinn", "Gewinnaufschlag anpassen", "Preis passt zum Markt"], ["stundensatz", "Stundensatz der Vorlage anpassen", "die Arbeit ist mehr wert"],
      ["minuten", "Arbeitszeit-Muster anpassen", "es dauert in Wahrheit länger"]];
    var pq = kopie(p); delete pq.eigen;
    WEGE.forEach(function (w) {
      var rr = K.rueckrechnen(kat, pq, ctx, e.eigen, w[0]);
      var vorschau = !rr.ok ? rr.grund : w[0] === "gewinn" ? "Gewinn " + fmtPct(e.effektiv.gewinnPct) + " → " + fmtPct(rr.wert + (e.effektiv.gewinnPct - (Number((v.saetze || {}).gewinnPct != null ? v.saetze.gewinnPct : (K.saetzeFuer(kat, v, {}, null, null).s.gewinnPct))))) + " %"
        : w[0] === "stundensatz" ? "Satz der Vorlage → " + euro(Math.round(rr.wert)) + "/h" : "alle Zeiten der Vorlage × " + String(Math.round(rr.wert * 1000) / 1000).replace(".", ",");
      box.append(h("div", { class: "alt-zeile", "data-lernweg": w[0] },
        knopf(w[1], function () {
          if (!rr.ok) return;
          var info = { datum: A.heute(), anlass: anlass.value, angebot: a.nummer, zielCent: e.eigen, menge: e.menge };
          K.uebernehmen(S.katalog, v.id, w[0], rr.wert, info); katalogSpeichern();
          vorher(a); p.eigen = Object.assign({}, p.eigen); delete p.eigen[e.menge]; merken(a);
          var neu = K.position(S.katalog, p, ctx);
          melde("Übernommen in „" + v.name + "“: " + w[1] + ". Die Kalkulation ergibt jetzt " + euro(neu.nettoKalk) + " für " + e.menge + " Stück. Im Katalog unter „Verlauf“ rücknehmbar.", "");
        }, "klein", { disabled: !rr.ok }),
        h("span", { class: "wirkung", text: w[2] + " · " + vorschau + (rr.ok ? " · ergibt " + euro(rr.netto) + (rr.diff ? " (" + delta(e.eigen, rr.netto) + " Rundung)" : " — genau") : "") })));
    });
    return box;
  }
  function fmtPct(x) { return String(Math.round(x * 100) / 100).replace(".", ","); }

  /* ── Marktvergleich ── */
  function marktFeld(a, p, v, e) {
    var box = h("div", { class: "erklaer-feld", "data-markt": p.id });
    var stueckVersand = e.stueckCent;
    var mv = MK.vergleich(v.markt, e.menge, stueckVersand, v.marktGrenzen, A.heute(), Math.round(e.selbstkosten / e.menge));
    box.append(h("p", null, h("b", { text: "📊 Marktvergleich — " + e.menge + " Stück" }), " ", h("span", { class: "badge intern", text: "🔒 intern" })));
    if (!mv.klassen.some(function (k) { return k.daten; })) box.append(h("div", { class: "hinweis", "data-kein-vergleich": "" }, "Kein Vergleich — noch keine Marktpreise für diese Vorlage eingetragen. Unten eintragen, was Mitbewerber nehmen."));
    mv.klassen.forEach(function (k) {
      var z = h("div", { class: "markt-klasse" + (k.aktiv ? "" : " aus"), "data-markt-klasse": k.id, "data-aktiv": k.aktiv ? "1" : "0" });
      z.append(h("div", { class: "band" }, h("b", { text: k.name }), h("span", { class: "gedaempft klein", text: k.grenze ? "ab " + k.grenze + " Stück" : "jede Menge" }),
        k.veraltet ? h("span", { class: "badge gelb", text: k.veraltet + " veraltet (> 6 Monate)" }) : null));
      if (!k.aktiv) z.append(h("p", { class: "gedaempft klein", text: "nicht vergleichbar bei dieser Menge" }));
      else if (!k.daten) z.append(h("p", { class: "gedaempft klein", text: "noch keine Preise eingetragen" }));
      else {
        var lo = Math.min(k.min, stueckVersand, mv.selbstkosten), hi = Math.max(k.max, stueckVersand, mv.selbstkosten), span = Math.max(1, hi - lo);
        function pos(c) { return ((c - lo) / span * 100).toFixed(1) + "%"; }
        z.append(h("div", { class: "markt-balken" }, h("i", { style: "left:" + pos(k.min) + ";width:" + ((k.max - k.min) / span * 100).toFixed(1) + "%" }),
          h("s", { title: "Selbstkosten", style: "left:" + pos(mv.selbstkosten) }), h("b", { title: "dein Preis", style: "left:" + pos(stueckVersand) })));
        z.append(h("p", { class: "klein", "data-markt-lage": k.lage || "" }, "min " + euro(k.min) + " · Median " + euro(k.median) + " · max " + euro(k.max) + " (" + k.anzahl + " Preise, je Stück inkl. Versand). Dein Preis " + euro(stueckVersand) + " liegt " + (MK.LAGE_TEXT[k.lage] || "") +
          (k.bisMedian > 0 ? "; Spielraum bis zum Median +" + euro(k.bisMedian) + " je Stück." : ".")));
        if (k.median > stueckVersand && k.id === "handwerk" && bearbeitbar(a)) z.append(knopf("Median als eigenen Preis übernehmen (" + euro(k.median * e.menge) + ")", function () {
          vorher(a); p.eigen = Object.assign({}, p.eigen); p.eigen[e.menge] = k.median * e.menge; merken(a); zeichne(); }, "klein", { "data-median-uebernehmen": "" }));
      }
      box.append(z);
    });
    if (e.menge >= ((v.marktGrenzen || {}).import || 500) && v.zukaufEkCent) {
      var hd = K.handel(v.zukaufEkCent, e.saetze);
      box.append(h("p", { class: "hinweis", "data-zukauf": "" }, "Zukauf statt Eigenfertigung? Bezugspreis " + euro(hd.bezugspreis) + " + Handlungskosten → " + euro(hd.netto) + " je Stück netto."));
    }
    /* Eintragen */
    var f = { anbieter: h("input", { placeholder: "Anbieter", "data-markt-neu": "anbieter" }), klasse: h("select", { "data-markt-neu": "klasse" }, MK.KLASSEN.map(function (k) { return h("option", { value: k.id, text: k.name }); })),
      menge: h("input", { class: "kurz", inputmode: "numeric", placeholder: "Menge", value: e.menge, "data-markt-neu": "menge" }),
      stueck: h("input", { class: "kurz", inputmode: "decimal", placeholder: "€/Stück", "data-markt-neu": "stueck" }),
      versand: h("input", { class: "kurz", inputmode: "decimal", placeholder: "Versand €", "data-markt-neu": "versand" }),
      quelle: h("input", { placeholder: "Quelle / Link", "data-markt-neu": "quelle" }) };
    box.append(h("div", { class: "zeile" }, f.anbieter, f.klasse, f.menge, f.stueck, f.versand, f.quelle,
      knopf("＋ Preis eintragen", function () {
        var c = G.parseEuroToCents(f.stueck.value); if (!Number.isFinite(c) || c <= 0) { melde("Bitte einen Stückpreis eintragen.", "warn"); return; }
        var vk = finde(S.katalog.vorlagen, v.id);
        vk.markt = (vk.markt || []).concat([{ anbieter: f.anbieter.value, klasse: f.klasse.value, menge: Math.max(1, Math.round(zahlPunkt(f.menge.value) || e.menge)), stueckCent: c,
          versandCent: Number.isFinite(G.parseEuroToCents(f.versand.value)) ? G.parseEuroToCents(f.versand.value) : 0, datum: A.heute(), quelle: f.quelle.value }]);
        katalogSpeichern(); zeichne();
      }, "klein", { "data-markt-dazu": "" }),
      h("a", { class: "btn klein", href: MK.suchLink(v.name, e.menge), target: "_blank", rel: "noopener noreferrer", "data-markt-suche": "" }, "🔎 Bei Mitbewerbern nachsehen"),
      knopf("🤖 KI-Recherche", function () { S.offen[p.id + ":ki"] = !S.offen[p.id + ":ki"]; zeichne(); }, "klein" + (S.offen[p.id + ":ki"] ? " on" : ""), { "data-ki-knopf": p.id })));
    if (mv.ungeprueft) box.append(h("p", { class: "hinweis", "data-markt-ungeprueft": String(mv.ungeprueft) }, mv.ungeprueft + " ungeprüfte Preise aus der KI-Recherche — sie zählen erst nach ✓ (Quelle ansehen, dann bestätigen)."));
    if (S.offen[p.id + ":ki"]) box.append(kiFeld(p, v, e));
    if ((v.markt || []).length) {
      var t = h("table", null, h("tr", null, ["Anbieter", "Klasse", "Menge", "€/Stück", "Versand", "Datum", ""].map(function (x) { return h("th", { text: x }); })));
      v.markt.forEach(function (m, i) {
        t.append(h("tr", { "data-markt-zeile": m.ungeprueft ? "ungeprueft" : "geprueft" }, h("td", null, m.anbieter || "—",
          m.ungeprueft ? h("span", { class: "badge gelb", text: " ungeprüft" }) : null,
          m.quelle && /^https?:\/\//.test(m.quelle) ? h("div", null, h("a", { href: m.quelle, target: "_blank", rel: "noopener noreferrer", class: "klein", "data-markt-quelle": "" }, "↗ Quelle")) : null,
          m.zitat ? h("div", { class: "gedaempft klein", text: "„" + m.zitat + "“" + (m.notiz ? " · " + m.notiz : "") }) : null,
          m.ungeprueft ? knopf("✓ geprüft", function () { var vk = finde(S.katalog.vorlagen, v.id); var x = vk.markt[i]; if (x) { delete x.ungeprueft; x.geprueftAm = A.heute(); } katalogSpeichern(); zeichne(); }, "klein", { "data-markt-pruefen": String(i) }) : null), h("td", { text: (finde(MK.KLASSEN, m.klasse) || {}).name || m.klasse }), h("td", { text: String(m.menge) }),
          h("td", { class: "r", text: euro(m.stueckCent) }), h("td", { class: "r", text: euro(m.versandCent || 0) }), h("td", { text: m.datum || "" }),
          h("td", null, knopf("✕", function () { var vk = finde(S.katalog.vorlagen, v.id); vk.markt = vk.markt.filter(function (_q, j) { return j !== i; }); katalogSpeichern(); zeichne(); }, "klein", { "aria-label": "Eintrag löschen" }))));
      });
      box.append(h("div", { class: "tabelle-huelle" }, t));
    }
    return box;
  }

  /* ── KI-Recherche: eigener Schlüssel, Websuche, nur belegte Preise (WC.recherche) ── */
  var KI_ABLAGE = {
    lies: function (k) { return Promise.resolve(lsJson("workflowcalculate_ki_" + k, null)); },
    schreib: function (k, v) { lsSet("workflowcalculate_ki_" + k, JSON.stringify(v)); return Promise.resolve(); },
    loesch: function (k) { try { localStorage.removeItem("workflowcalculate_ki_" + k); } catch (_e) {} return Promise.resolve(); },
  };
  function kiFeld(p, v, e) {
    var T = window.WERKSTATT_SCHLUESSEL, R = WC.recherche, info = R.auftragsInfo(v, p, S.katalog), erg = (S.kiErgebnis || {})[p.id];
    var box = h("div", { class: "erklaer-feld", "data-ki-feld": p.id }, h("b", { text: "🤖 KI-Recherche der Marktpreise" }), " ", h("span", { class: "badge intern", text: "🔒 intern" }),
      h("p", { class: "klein" }, "Geht hinaus (an Anthropic, über deinen eigenen Schlüssel): ", h("b", { "data-ki-auftrag": "", text: R.auftragsText(info) }), ". Nicht hinaus: Kunde, Titel, Beschreibung, deine Preise und Sätze."),
      h("p", { class: "gedaempft klein", text: "Die KI sucht im Netz (bis zu " + R.MAX_SUCHEN + " Suchen à 1 Cent, dazu Tokens). Übernommen wird nur ein Preis, der wörtlich im zitierten Text einer gefundenen Seite steht — sonst wird er verworfen, mit Grund. Was durchkommt, steht als „ungeprüft“ mit Link in der Liste und zählt erst nach ✓." }));
    var meld = h("p", { class: "klein", id: "ki-meldung", hidden: true });
    function sag(t, gut) { meld.hidden = false; meld.className = "hinweis " + (gut ? "" : "bad"); meld.textContent = t; }
    function los(schluessel) {
      sag("Recherche läuft … (kann eine Minute dauern)", true);
      var fetchFn = window.__wcKiFetch || null;
      R.rufen(schluessel, info, fetchFn, A.heute()).then(function (r) {
        var vk = finde(S.katalog.vorlagen, v.id), neu = 0;
        vk.markt = vk.markt || [];
        r.funde.forEach(function (f) { if (!vk.markt.some(function (m) { return m.quelle === f.quelle && m.roh === f.roh && m.menge === f.menge; })) { vk.markt.push(f); neu++; } });
        katalogSpeichern();
        S.kiErgebnis = S.kiErgebnis || {}; S.kiErgebnis[p.id] = Object.assign({ neu: neu }, r); zeichne();
      }, function (err) { sag("Nicht gelungen: " + (err && err.message || err) + ". Es wurde nichts übernommen.", false); });
    }
    if (S.kiSchluessel) {
      box.append(h("div", { class: "zeile" }, h("span", { class: "gedaempft klein", text: "Schlüssel für diese Sitzung gesetzt." }),
        knopf("🤖 Jetzt recherchieren", function () { los(S.kiSchluessel); }, "pri klein", { id: "ki-los" }),
        knopf("Schlüssel vergessen", function () { S.kiSchluessel = null; zeichne(); }, "klein")));
    } else {
      var sch = h("input", { type: "password", id: "ki-schluessel", placeholder: "sk-ant-…", autocomplete: "off", style: "flex:1 1 220px;min-width:0" });
      var merk = h("input", { type: "checkbox", id: "ki-merken" }), pw = h("input", { type: "password", id: "ki-passwort", placeholder: "Passwort (mind. 8 Zeichen)", autocomplete: "off", style: "flex:1 1 160px;min-width:0" });
      box.append(h("div", { class: "zeile", id: "ki-gemerkt", hidden: true }, h("span", { class: "klein", text: "Auf diesem Gerät liegt ein verschlüsselter Schlüssel — Passwort:" }),
        h("input", { type: "password", id: "ki-aufschliessen-pw", autocomplete: "off" }), knopf("Aufschließen", function () {
          T.holen(KI_ABLAGE, document.getElementById("ki-aufschliessen-pw").value).then(function (k) { S.kiSchluessel = k; zeichne(); },
            function (err) { sag(err.message === "passwort" ? "Das Passwort passt nicht." : "Nicht aufzuschließen (" + err.message + ").", false); });
        }, "klein", { id: "ki-aufschliessen" }), knopf("Gespeicherten Schlüssel löschen", function () { T.werfen(KI_ABLAGE).then(zeichne); }, "klein gefahr")));
      box.append(h("div", { class: "zeile" }, sch, h("label", { class: "schalter" }, merk, "verschlüsselt auf diesem Gerät merken"), pw,
        knopf("Übernehmen", function () {
          var f = T.pruefeForm(sch.value);
          if (!f.ok) { sag("Schlüssel: " + f.grund + ". " + f.hinweis, false); return; }
          if (merk.checked) {
            if (pw.value.length < 8) { sag("Zum Merken ein Passwort mit mindestens 8 Zeichen.", false); return; }
            T.einlegen(KI_ABLAGE, pw.value, sch.value).then(function () { S.kiSchluessel = sch.value; zeichne(); }, function (err) { sag("Nicht gemerkt: " + err.message, false); });
          } else { S.kiSchluessel = sch.value; zeichne(); }
        }, "klein", { id: "ki-schluessel-setzen" })));
      box.append(h("p", { class: "gedaempft klein", text: "Ohne Merken gilt der Schlüssel nur bis zum Schließen der Seite. Gemerkt liegt er verschlüsselt im Browser; das Passwort steht nirgends." }));
      T.liegtEtwas(KI_ABLAGE).then(function (da) { var z = document.getElementById("ki-gemerkt"); if (z) z.hidden = !da; });
    }
    box.append(meld);
    if (erg) {
      var k = erg.kosten;
      box.append(h("p", { class: "hinweis", "data-ki-ergebnis": String(erg.funde.length), "data-ki-verworfen": String(erg.verworfen.length) },
        erg.funde.length + " belegte(r) Preis(e) gefunden, " + erg.neu + " neu in der Liste (ungeprüft) · " + erg.verworfen.length + " verworfen · " + erg.quellen + " Quellen · " +
        k.suchen + " Suche(n), " + k.ein + " Token ein / " + k.aus + " aus ≈ " + String(k.usdGerechnet.toFixed(4)).replace(".", ",") + " $ (gerechnet nach Listenpreis)" +
        (erg.keinPreis ? " · Die KI fand keinen belegbaren Preis." : "") + (erg.fehler.length ? " · Fehler der Suche: " + erg.fehler.join(", ") : "")));
      if (erg.verworfen.length) box.append(h("ul", { class: "weg", "data-ki-verworfen-liste": "" }, erg.verworfen.map(function (x) { return h("li", { class: "klein", text: x.grund + " — " + x.zeile.slice(0, 160) }); })));
    }
    return box;
  }

  /* ── Beispiele mit Bildern in mehreren Ansichten — Preis aus der AKTUELLEN Kalkulation ── */
  function beispielPosition(v, b) {
    var p = { vorlage: v.id, menge: b.menge || 1, staffeln: [b.menge || 1], breiteMm: b.breiteMm || v.breiteVorgabe || "", hoeheMm: b.hoeheMm || v.hoeheVorgabe || "",
      farben: b.farben || 1, verfahren: b.verfahren || v.verfahrenVorgabe || "", stiche: b.stiche || "", wahl: Object.assign({}, b.wahl || {}), zeiten: {}, saetze: {}, eigen: {}, bilder: [] };
    (v.slots || []).forEach(function (s) { if (!Object.prototype.hasOwnProperty.call(p.wahl, s.id)) p.wahl[s.id] = s.vorgabe || ""; });
    return p;
  }
  function galerie(v, kat, ctx, nehmen) {
    var gal = h("div", { class: "galerie", "data-galerie": v.id });
    (v.beispiele || []).forEach(function (b) {
      var ansichten = b.ansichten || [];
      var schl = "ans:" + v.id + ":" + b.id, i = Math.min(S.offen[schl] || 0, Math.max(0, ansichten.length - 1));
      var erg = K.position(kat, beispielPosition(v, b), ctx);
      var karte = h("div", { class: "beispiel", "data-beispiel": v.id + ":" + b.id },
        ansichten.length ? h("img", { class: "gross", src: bildQuelle(ansichten[i][1]), alt: ansichten[i][0], "data-ansicht-gross": ansichten[i][0] }) : h("div", { class: "gedaempft klein", text: "noch kein Bild" }),
        ansichten.length > 1 ? h("div", { class: "ansichten" }, ansichten.map(function (an, j) {
          return h("button", { type: "button", class: j === i ? "on" : "", title: an[0], "aria-label": "Ansicht " + an[0], "data-ansicht": String(j), onclick: function () { S.offen[schl] = j; zeichne(); } }, h("img", { src: bildQuelle(an[1]), alt: "" }));
        })) : null,
        h("b", { text: b.titel }),
        h("span", { class: "gedaempft klein", text: ansichten.length ? "Ansicht: " + ansichten[i][0] : "" }),
        erg.ok ? h("span", { "data-beispiel-preis": String(erg.netto) }, "≈ ", h("b", { text: euro(erg.netto) }), " netto · " + euro(erg.stueckCent) + " je " + (v.einheitText || "Stk."),
          erg.platzhalter ? h("span", { class: "platzhalter-marke", text: " · mit Platzhalter-Werten" }) : null)
          : h("span", { class: "gedaempft klein", text: "nicht kalkulierbar: " + erg.offen.join(" · ") }),
        nehmen ? knopf("Als Position übernehmen", function () { nehmen(beispielPosition(v, b), b); }, "klein pri", { "data-beispiel-nehmen": v.id + ":" + b.id }) : null);
      gal.append(karte);
    });
    return gal;
  }
  function neuePositionKarte(a, kat, kunde) {
    var karte = h("div", { class: "karte", "data-neue-position": "", "data-schritt-ziel": "produkt" }, h("h3", { text: "＋ Position" }));
    var wahl = h("select", { id: "vorlage-wahl", onchange: function () { S.neuPos = this.value; zeichne(); } },
      h("option", { value: "", text: "— Produkt wählen —" }), kat.gebiete.map(function (gb) {
        var l = KAT.eigenfertigung(kat).filter(function (v) { return v.gebiet === gb.id; });
        return l.length ? h("optgroup", { label: gb.name }, l.map(function (v) { return h("option", { value: v.id, text: v.name, selected: v.id === S.neuPos }); })) : null;
      }));
    var nHandel = KAT.handelsware(S.katalog).length;
    karte.append(h("div", { class: "zeile" }, wahl, S.neuPos ? knopf("Leere Position", function () {
      vorher(a); A.neuePosition(a, kat, S.neuPos); merken(a); zeichne(); }, "", { id: "position-leer" }) : null));
    karte.append(h("p", { class: "gedaempft klein", "data-handel-verweis": "" }, "Fertig eingekaufte Produkte" + (nHandel ? " (" + nHandel + ")" : "") + " stehen nicht hier, sondern auf der Seite ",
      knopf("🛒 Handelsware", function () { geheZu("handel"); }, "klein"), " — von dort „ins Angebot“."));
    /* … oder eine schon kalkulierte Position aus einem früheren Angebot */
    var frueher = [];
    S.angebote.forEach(function (b) { if (b === a) return; b.positionen.forEach(function (p) { frueher.push({ a: b, p: p }); }); });
    if (frueher.length) {
      var fw = h("select", { id: "frueher-wahl", "aria-label": "Position aus früherem Angebot" }, h("option", { value: "", text: "— oder aus früherem Angebot übernehmen —" }),
        frueher.map(function (x, i) { return h("option", { value: String(i), text: x.a.nummer + " · " + ((x.a.kunde || {}).name || "ohne Kunde") + " · " + (x.p.titel || x.p.vorlage) + " · " + x.p.menge + " " + ((finde(kat.vorlagen, x.p.vorlage) || {}).einheitText || "Stk.") }); }));
      karte.append(h("div", { class: "zeile" }, fw, knopf("Übernehmen", function () {
        if (fw.value === "") return; var q = kopie(frueher[+fw.value].p); vorher(a); a.zaehler = (a.zaehler || 0) + 1; q.id = "P-" + a.zaehler; a.positionen.push(q); merken(a); zeichne();
      }, "", { id: "frueher-uebernehmen" })));
    }
    var v = finde(kat.vorlagen, S.neuPos);
    if (v) {
      karte.append(h("p", { class: "gedaempft klein", text: "Beispiele — so viel Aufwand, ungefähr so ein Preis (gerechnet mit deinen aktuellen Werten):" }));
      karte.append(galerie(v, kat, { angebot: a, kunde: kunde }, function (pp, b) {
        vorher(a); var p = A.neuePosition(a, kat, v.id);
        Object.assign(p, { menge: pp.menge, staffeln: (v.staffelVorgabe || []).concat([pp.menge]).filter(function (m, i, s) { return s.indexOf(m) === i; }).sort(function (x, y) { return x - y; }),
          breiteMm: pp.breiteMm, hoeheMm: pp.hoeheMm, farben: pp.farben, verfahren: pp.verfahren, stiche: pp.stiche, wahl: pp.wahl, titel: b.titel });
        S.neuPos = null; merken(a); zeichne();
      }));
    }
    return karte;
  }

  /* ── Verpackung & Versand ── */
  function versandKarte(a, r, kat, ro) {
    var vs = r.versand, karte = h("div", { class: "karte", "data-versand": "", "data-schritt-ziel": "versand" }, h("h3", { text: "Verpackung & Versand" }));
    function setze(fn) { return function () { vorher(a); fn.apply(this, arguments); merken(a); zeichne(); }; }
    if (vs.leer) karte.append(h("p", { class: "gedaempft", text: "Nichts zu versenden (keine kalkulierte Position mit Versand)." }));
    else if (!vs.ok) karte.append(h("div", { class: "hinweis bad", "data-kein-tarif": "" }, vs.grund + "."));
    else if (vs.manuell) karte.append(h("p", { "data-versand-cent": String(vs.cent) }, "Von Hand gesetzt: ", h("b", { text: euro(vs.cent) })));
    else karte.append(h("p", { "data-versand-cent": String(vs.cent) }, h("b", { text: euro(vs.cent) }), " netto — " + vs.pakete + " × " + vs.verpackungName + " · " + vs.dienstName +
      (vs.sperrgut ? " · Sperrgut" : "") + " · " + String(Math.round(vs.gewichtJePaketG / 100) / 10).replace(".", ",") + " kg je Paket",
      h("br"), h("span", { class: "gedaempft klein intern-satz", text: "🔒 Verpackung " + euro(vs.verpackungCent) + " + Packen " + euro(vs.packCent) + " + Tarif " + euro(vs.tarifCent) }), ));
    if (vs.inhalt) karte.append(h("p", { class: "gedaempft klein", text: "Inhalt: " + String(Math.round(vs.inhalt.gewichtG / 100) / 10).replace(".", ",") + " kg · " + String(vs.inhalt.volumenL).replace(".", ",") + " l · längstes Teil " + Math.round(vs.inhalt.laengsteMm) + " mm" }));
    var vw = a.versand || {};
    karte.append(h("div", { class: "feldgitter" },
      feld("Verpackung", h("select", { "data-versand-wahl": "verpackung", disabled: ro, onchange: setze(function () { a.versand = Object.assign({}, a.versand, { verpackung: this.value || undefined }); }) },
        h("option", { value: "", text: "automatisch" }), kat.verpackungen.map(function (p) { return h("option", { value: p.id, text: p.name, selected: p.id === vw.verpackung }); }))),
      feld("Dienst", h("select", { "data-versand-wahl": "dienst", disabled: ro, onchange: setze(function () { a.versand = Object.assign({}, a.versand, { dienst: this.value || undefined }); }) },
        h("option", { value: "", text: "günstigster" }), kat.versand.map(function (d) { return h("option", { value: d.id, text: d.name, selected: d.id === vw.dienst }); }))),
      feld("Von Hand (netto €, leer = gerechnet)", h("input", { inputmode: "decimal", value: vw.manuellCent != null && vw.manuellCent !== "" ? G.formatCents(vw.manuellCent) : "", disabled: ro, "data-versand-manuell": "",
        onchange: setze(function () { var c = this.value.trim() === "" ? null : G.parseEuroToCents(this.value); a.versand = Object.assign({}, a.versand, { manuellCent: Number.isFinite(c) ? c : null }); }) }))));
    return karte;
  }

  /* ── Kundenblatt: nur aus WC.aussen.angebotExtern ── */
  function blattAngebot(d) {
    var b = h("article", { class: "blatt", "data-blatt": "angebot" });
    var abs = h("div", { class: "absender" }, d.firma.logo ? h("img", { src: d.firma.logo, alt: "" }) : null, h("div", { text: [d.firma.name, d.firma.anschrift, d.firma.kontakt].filter(Boolean).join("\n") }));
    b.append(h("div", { class: "kopfzeile" }, h("div", { class: "meta" }, h("div", { text: d.kunde.name }), h("div", { style: "white-space:pre-line", text: d.kunde.anschrift })), abs));
    b.append(h("h1", { text: "Angebot " + d.nummer + (d.fassung > 1 ? " · Fassung " + d.fassung : "") }));
    b.append(h("p", { class: "meta", text: "Datum: " + datumDe(d.datum) + " · gültig bis " + datumDe(d.gueltigBis) + (d.titel ? " · " + d.titel : "") }));
    var t = h("table", null, h("thead", null, h("tr", null, h("th", { text: "" }), h("th", { text: "Leistung" }), h("th", { class: "r", text: "Menge" }), h("th", { class: "r", text: "Einzelpreis" }), h("th", { class: "r", text: "Gesamt netto" }))));
    var tb = h("tbody");
    d.positionen.forEach(function (p) {
      tb.append(h("tr", null, h("td", null, p.bild ? h("img", { class: "pos-bild", src: bildQuelle(p.bild), alt: "" }) : null),
        h("td", null, h("b", { text: p.titel }), p.beschreibung ? h("div", { class: "klein", text: p.beschreibung }) : null,
          p.staffel.length ? h("div", { class: "staffel", text: "Staffel: " + p.staffel.map(function (s) { return s.menge + " " + (p.einheit || "Stk.") + " à " + euro(s.stueckCent); }).join(" · ") }) : null),
        h("td", { class: "r", "data-blatt-menge": "", text: p.menge + " " + (p.einheit || "Stk.") }), h("td", { class: "r", text: euro(p.stueckCent) }), h("td", { class: "r", text: euro(p.gesamtCent) })));
    });
    if (d.versand) tb.append(h("tr", null, h("td"), h("td", { text: d.versand.text }), h("td"), h("td"), h("td", { class: "r", text: euro(d.versand.nettoCent) })));
    t.append(tb); b.append(t);
    var su = h("table", { class: "summen", style: "width:auto;margin-left:auto;margin-top:10px" });
    su.append(h("tr", null, h("td", { text: "Summe netto" }), h("td", { class: "r", text: euro(d.summen.netto) })));
    d.summen.perSatz.forEach(function (p) { su.append(h("tr", null, h("td", { text: d.kleinunternehmer ? "Keine Umsatzsteuer (§ 19 UStG)" : "USt " + p.satz + " %" }), h("td", { class: "r", text: euro(p.ust) }))); });
    su.append(h("tr", { class: "brutto" }, h("td", { text: "Gesamt" }), h("td", { class: "r", text: euro(d.summen.brutto) })));
    b.append(su);
    b.append(h("p", { class: "fuss", text: [d.firma.name, d.firma.steuer, d.firma.bank].filter(Boolean).join("\n") }));
    return b;
  }
  function datumDe(iso) { var m = /^(\d{4})-(\d\d)-(\d\d)$/.exec(iso || ""); return m ? m[3] + "." + m[2] + "." + m[1] : iso || ""; }
  function blattBauen(a) {
    var r = A.rechne(a, S.katalog, kundeVon(a), S.einst.kleinunternehmer);
    return blattAngebot(WC.aussen.angebotExtern(a, r, S.einst.firma, S.einst.kleinunternehmer));
  }
  function drucke(a) { var d = document.getElementById("druck"); d.replaceChildren(blattBauen(a)); window.print(); }
  function vorschau(a) {
    var dlg = document.getElementById("vorschau");
    dlg.replaceChildren(h("div", { class: "vorschau-kopf" }, h("b", { text: "Vorschau — genau das, was der Kunde bekommt" }),
      h("div", { class: "band" }, knopf("🖨 Drucken / als PDF", function () { dlg.close(); drucke(a); }, "pri klein"), knopf("✕", function () { dlg.close(); }, "klein", { "aria-label": "Schließen" }))),
      h("div", { class: "vorschau-papier" }, blattBauen(a)));
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", "");
  }

  /* ════ Kunden ════ */
  function zKunden(main) {
    var karte = h("div", { class: "karte" }, h("h2", { text: "Kunden" }),
      h("p", { class: "gedaempft klein", text: "Die Klasse wirkt auf die Kalkulation (Einstellungen → Kundenklassen) und steht nie auf dem Angebot." }));
    S.kunden.forEach(function (k) {
      function sp() { dbPut("kunden", kopie(k)); }
      karte.append(h("div", { class: "eintrag-kat", "data-kunde": k.id, style: "border:1px solid var(--line);border-radius:11px;padding:8px;margin:6px 0" }, h("div", { class: "feldgitter" },
        feld("Name / Firma", h("input", { value: k.name, "data-key": k.id + "-name", oninput: function () { k.name = this.value; sp(); } })),
        feld("Anschrift", h("textarea", { value: k.anschrift, "data-key": k.id + "-anschrift", rows: "2", oninput: function () { k.anschrift = this.value; sp(); } })),
        feld("Klasse", h("select", { "data-kunde-klasse": k.id, onchange: function () { k.klasse = this.value; sp(); S.angebote.forEach(function (a) { if (a.kundeId === k.id && bearbeitbar(a)) { a.kunde = { name: k.name, anschrift: k.anschrift, klasse: k.klasse }; merken(a); } }); zeichne(); } },
          ["A", "B", "C"].map(function (c) { var kl = (S.katalog.gebiete[0].klassen || {})[c] || {}; return h("option", { value: c, text: kl.name || c, selected: (k.klasse || "B") === c }); })))),
        knopf("✕ Kunde löschen", function () { if (!confirm("Kunde „" + k.name + "“ löschen?")) return; S.kunden = S.kunden.filter(function (q) { return q !== k; }); dbDel("kunden", k.id); zeichne(); }, "klein gefahr")));
    });
    karte.append(knopf("＋ Kunde", function () {
      var n = 1; S.kunden.forEach(function (k) { var m = /^K-(\d+)$/.exec(k.id); if (m) n = Math.max(n, +m[1] + 1); });
      var k = { id: "K-" + n, name: "Neuer Kunde", anschrift: "", klasse: "B" }; S.kunden.push(k); dbPut("kunden", kopie(k)); zeichne();
    }, "pri", { id: "neuer-kunde" }));
    main.append(karte);
  }

  /* ════ 🛒 Handelsware (Klaus 2026-10-13) ════
     „Eine eigene Seite … nur Produkte, die ich fertig einkaufe und wieder verkaufe — mit gewinnbringendem Aufschlag.“
     Einkauf komplett inkl. Versand → + Handlungskosten → + Gewinn (+ Kundenklasse) → Verkauf komplett inkl. Versand.
     Gerechnet mit WC.kalk.handel — derselbe Weg wie im Angebot. Alles hier ist intern; aufs Kundenblatt kommt nur die Position. */
  function handelLink(url, text) {
    var u = KAT.sichereAdresse(url);
    return u ? h("a", { href: u, target: "_blank", rel: "noopener noreferrer", "data-lieferant-link": "", text: text + " ↗" }) : null;
  }
  function insAngebot(v, menge) {
    var a = aktivesAngebot(), neu = false;
    if (!a || !bearbeitbar(a)) { a = A.neu(S.angebote); S.angebote.unshift(a); S.aktiv = a.id; lsSet(LS.aktiv, a.id); neu = true; }
    vorher(a);
    var p = A.neuePosition(a, S.katalog, v.id);
    p.menge = menge; if (p.staffeln.indexOf(menge) < 0) p.staffeln = p.staffeln.concat([menge]).sort(function (x, y) { return x - y; });
    merken(a);
    S.reiter = "angebot"; lsSet(LS.reiter, "angebot"); adresseSetzen("angebot");
    melde("„" + v.name + "“, " + menge + " " + (v.einheitText || "Stk.") + ", steht als Position " + p.id + " in Angebot " + a.nummer +
      (neu ? " — neu angelegt, weil kein Angebot als Entwurf offen war." : "."), "");
    window.scrollTo(0, 0);
  }
  function zHandel(main) {
    var kat = S.katalog; kat.lieferanten = kat.lieferanten || [];
    var hw = KAT.handelsware(kat), klasse = S.handelKlasse || "B";
    var kopfK = h("div", { class: "karte", "data-handel-seite": "" },
      h("div", { class: "position-kopf" }, h("h2", { text: "🛒 Handelsware" }),
        h("div", { class: "band" },
          h("a", { class: "btn klein", href: "#handel", target: "_blank", rel: "noopener", "data-neuer-tab": "", text: "↗ in neuem Tab" }),
          h("span", { class: "badge intern", text: "🔒 intern" }))),
      h("p", { class: "gedaempft klein", text: "Nur Produkte, die du fertig einkaufst und mit Aufschlag weiterverkaufst. Einkauf komplett inkl. Versand → + Handlungskosten → + Gewinn → Verkauf komplett inkl. Versand, als EINE Position ohne eigenen Versandposten. Lieferant, Link und Einkaufspreis gehen nie aufs Kundenblatt, nie an WorkFloh oder BookLedgerPro." }),
      h("div", { class: "band" }, h("span", { class: "klein", text: "Rechnen für Kundenklasse:" }),
        h("select", { "data-handel-klasse": "", onchange: function () { S.handelKlasse = this.value; zeichne(); } },
          ["A", "B", "C"].map(function (k) { return h("option", { value: k, text: k + "-Kunde", selected: k === klasse }); }))));
    main.append(kopfK);
    if (!KAT.gebietDa(kat, "handelsware") && WC.STARTKATALOGE && WC.STARTKATALOGE.handelsware) {
      main.append(h("div", { class: "karte" }, h("p", { text: "Beispiele mit Platzhalter-Preisen: 500 Kugelschreiber fertig bedruckt · Visitenkarten 250 / 500 / 1000." }),
        knopf("＋ Beispiele holen (Arbeitsgebiet Handelsware)", function () {
          var r = KAT.gebietHinzufuegen(S.katalog, WC.STARTKATALOGE.handelsware); katalogSpeichern();
          melde(r.neu.vorlagen + " Einkaufsprodukte geholt. Die Preise sind Platzhalter — eigene Einkaufspreise eintragen („✎ Einkauf bearbeiten“).", "");
        }, "pri", { "data-handel-start": "" })));
    }
    var hin = KAT.hinweise(kat);
    if (hin.length) main.append(h("div", { class: "hinweis warn", "data-handel-hinweise": "" }, hin.join(" · ")));
    if (!hw.length) main.append(h("div", { class: "karte" }, h("p", { class: "gedaempft", "data-handel-leer": "" }, "Noch keine Einkaufsprodukte. Eine Produktvorlage wird eins mit dem Haken „🛒 Einkaufsprodukt“ (Katalog → Produktvorlagen) — oder hier neu anlegen.")));
    hw.forEach(function (v) { main.append(handelProdukt(v, kat, klasse)); });
    main.append(h("div", { class: "band", style: "margin:10px 0" }, knopf("＋ Neues Einkaufsprodukt", function () {
      var gb = KAT.gebietDa(kat, "handelsware") ? "handelsware" : (kat.gebiete[0] || {}).id || "";
      var id = KAT.neueKennung(kat.vorlagen, "zukauf");
      kat.vorlagen.push({ id: id, gebiet: gb, name: "Neues Einkaufsprodukt", einkaufsprodukt: true, einkauf: [], mengenregel: "stueck", einheitText: "Stk.", beschreibungVorgabe: "",
        staffelVorgabe: [], verfahrenWahl: [], verfahrenVorgabe: "", farbenMax: 1, slots: [], schritte: [], versandArt: "keiner", markt: [], marktGrenzen: { online: 1, import: 500 }, verlauf: [], beispiele: [] });
      katalogSpeichern(); S.offen["handel:" + id] = true; zeichne();
    }, "pri", { id: "handel-neu" })));
    main.append(lieferantenKarte(kat));
    main.append(h("div", { class: "karte gedaempft klein", "data-handel-grenzen": "" },
      h("p", { text: "Zwischenmengen werden nicht geschätzt: steht für eine Menge kein Einkauf da, rechnet die Position nicht und sagt das. Wie es stattdessen gehen soll, ist noch offen." }),
      h("p", { text: "Wiederverkäuferpreise stehen bei vielen Lieferanten erst nach der Anmeldung — eingetragen wird, was auf deinem Konto oder deiner Rechnung steht." }),
      h("p", { text: "Kundenrabatt und Skonto aus den Sätzen wirken bei Handelsware nicht — es zählen Handlungskosten, Gewinn und die Kundenklasse." })));
  }
  function handelProdukt(v, kat, klasse) {
    var sf = K.saetzeFuer(kat, v, {}, null, { klasse: klasse }), einh = v.einheitText || "Stk.";
    var auf = !!S.offen["handel:" + v.id];
    var karte = h("div", { class: "karte", "data-handel-produkt": v.id });
    var ph = (v.einkauf || []).some(function (x) { return x.platzhalter; }), phGb = !!(K.finde(kat.gebiete, v.gebiet) || {}).platzhalter;
    karte.append(h("div", { class: "position-kopf" },
      h("div", null, h("b", { text: v.name }), " ", ph ? h("span", { class: "platzhalter-marke", "data-einkauf-platzhalter": "", text: "Einkauf: Platzhalter" }) : null,
        phGb ? h("span", { class: "badge gelb", "data-saetze-platzhalter": "", text: "Sätze: Platzhalter" }) : null),
      knopf(auf ? "▾ Einkauf bearbeiten" : "✎ Einkauf bearbeiten", function () { S.offen["handel:" + v.id] = !auf; zeichne(); }, "klein" + (auf ? " on" : ""), { "data-handel-bearbeiten": v.id })));
    karte.append(h("p", { class: "gedaempft klein", text: "Handlungskosten " + fmtPct(+sf.s.handlungskostenPct || 0) + " % · Gewinn " + fmtPct(+sf.s.gewinnPct || 0) + " %" + (sf.klasse ? " (mit " + sf.klasse + "-Kunde)" : "") }));
    var zeilen = (v.einkauf || []).map(function (x, i) { return { x: x, i: i }; }).sort(function (a, b) { return (+a.x.menge || 0) - (+b.x.menge || 0) || a.i - b.i; });
    if (!zeilen.length) karte.append(h("p", { class: "hinweis warn", text: "Noch kein Einkauf eingetragen — „✎ Einkauf bearbeiten“." }));
    else {
      var t = h("table", { class: "handel-tab", "data-handel-tabelle": v.id }, h("thead", null, h("tr", null,
        ["Menge", "Lieferant", "Einkauf inkl. Versand", "+ Handlungsk.", "+ Gewinn", "Verkauf inkl. Versand netto", "je " + einh, "Aufschlag", "Spanne", ""].map(function (x, i) { return h("th", { class: i >= 2 && i <= 8 ? "r" : "", text: x }); }))));
      var tb = h("tbody");
      zeilen.forEach(function (z) {
        var x = z.x, m = Math.round(+x.menge) || 0, lf = K.finde(kat.lieferanten, x.lieferant);
        var lfZelle = h("td", null, lf ? lf.name : x.lieferant ? "„" + x.lieferant + "“ fehlt" : h("span", { class: "gedaempft", text: "—" }), " ", handelLink(x.url || (lf && lf.url), lf ? "" : "Link"));
        if (x.gesamtCent == null || x.gesamtCent === "" || !(m > 0)) {
          tb.append(h("tr", { "data-handel-zeile": String(m), "data-offen": "" }, h("td", { text: m ? m + " " + einh : "—" }), lfZelle,
            h("td", { colspan: "8", class: "gedaempft", text: !(m > 0) ? "Menge fehlt" : "Einkaufspreis fehlt — nicht kalkuliert" })));
          return;
        }
        var hd = K.handel(+x.gesamtCent, sf.s), zaehlt = K.einkaufFuer(v, m).treffer === x;
        var spanne = hd.netto - hd.bezugspreis;
        tb.append(h("tr", { "data-handel-zeile": String(m), "data-einkauf": String(hd.bezugspreis), "data-verkauf": String(hd.netto), class: zaehlt ? "" : "gedaempft" },
          h("td", { text: m + " " + einh }), lfZelle,
          h("td", { class: "r", text: euro(hd.bezugspreis) }), h("td", { class: "r", text: euro(hd.handlungskosten) }), h("td", { class: "r", text: euro(hd.gewinn) }),
          h("td", { class: "r" }, h("b", { text: euro(hd.netto) })), h("td", { class: "r", text: euro(Math.round(hd.netto / m)) }),
          h("td", { class: "r", "data-aufschlag": "", text: hd.bezugspreis ? fmtPct(Math.round(spanne / hd.bezugspreis * 10000) / 100) + " %" : "—" }),
          h("td", { class: "r", "data-spanne": String(spanne), text: euro(spanne) + (hd.netto ? " · " + fmtPct(Math.round(spanne / hd.netto * 10000) / 100) + " %" : "") }),
          h("td", null, zaehlt ? knopf("ins Angebot", function () { insAngebot(v, m); }, "klein pri", { "data-ins-angebot": v.id + ":" + m })
            : h("span", { class: "klein", text: "teurer als ein anderer Einkauf für " + m }))));
      });
      t.append(tb);
      karte.append(h("div", { class: "tabelle-huelle" }, t));
      karte.append(h("p", { class: "gedaempft klein", text: "Aufschlag = auf den Einkauf · Spanne = Verkauf − Einkauf, in % vom Verkauf. Mehrere Einkäufe für dieselbe Menge: der günstigste zählt." }));
    }
    if (auf) karte.append(handelBearbeiten(v, kat));
    return karte;
  }
  function handelBearbeiten(v, kat) {
    var box = h("div", { class: "erklaer-feld", "data-handel-editor": v.id });
    v.saetze = v.saetze || {}; v.einkauf = v.einkauf || [];
    var gb = K.finde(kat.gebiete, v.gebiet) || { saetze: {} };
    box.append(h("div", { class: "feldgitter" },
      feld("Name", eingabe(v, "name", "text", null, zeichne)),
      feld("Beschreibung (Kundenblatt)", eingabe(v, "beschreibungVorgabe", "text", null, zeichne)),
      feld("Mengen-Einheit (Stk., Pack)", eingabe(v, "einheitText", "text", null, zeichne)),
      feld("Handlungskosten % (leer = Gebiet: " + fmtPct(+gb.saetze.handlungskostenPct || 0) + ")", eingabe(v.saetze, "handlungskostenPct", "zahl", null, zeichne)),
      feld("Gewinn % (leer = Gebiet: " + fmtPct(+gb.saetze.gewinnPct || 0) + ")", eingabe(v.saetze, "gewinnPct", "zahl", null, zeichne)),
      feld("🛒 Einkaufsprodukt", eingabe(v, "einkaufsprodukt", "bool"))));
    box.append(h("b", { text: "Einkauf — Komplettpreis je Menge, inkl. Versand" }));
    v.einkauf.forEach(function (z, i) {
      box.append(h("div", { class: "zeile", style: "align-items:flex-end", "data-einkauf-zeile": String(i) },
        feld("Menge", eingabe(z, "menge", "zahl", null, zeichne)),
        feld("gesamt inkl. Versand €", eingabe(z, "gesamtCent", "cent", null, zeichne)),
        feld("Lieferant", h("select", { "data-kat-feld": "lieferant", onchange: function () { z.lieferant = this.value; katalogSpeichern(); zeichne(); } },
          h("option", { value: "", text: "—" }), kat.lieferanten.map(function (l) { return h("option", { value: l.id, text: l.name, selected: l.id === z.lieferant }); }))),
        feld("Link zum Produkt", eingabe(z, "url", "link", null, zeichne)),
        feld("Stand", eingabe(z, "datum", "datum", null, zeichne)),
        knopf("✕", function () { v.einkauf.splice(i, 1); katalogSpeichern(); zeichne(); }, "klein", { "aria-label": "Einkauf löschen" })));
    });
    box.append(knopf("＋ Einkauf", function () { v.einkauf.push({ menge: null, gesamtCent: null, lieferant: "", url: "", datum: A.heute() }); katalogSpeichern(); zeichne(); }, "klein", { "data-einkauf-neu": v.id }));
    return box;
  }
  function lieferantenKarte(kat) {
    var box = h("div", { class: "karte", "data-lieferanten": "" }, h("h3", { text: "Lieferanten" }));
    if (!kat.lieferanten.length) box.append(h("p", { class: "gedaempft klein", text: "Noch keine Lieferanten eingetragen." }));
    kat.lieferanten.forEach(function (l) {
      box.append(h("div", { class: "zeile", "data-lieferant": l.id }, h("b", { text: l.name || l.id }), handelLink(l.url, "öffnen"),
        h("span", { class: "badge", text: FUER_TEXT[l.fuer] || l.fuer || "—" }), h("span", { class: "badge", text: l.anmeldung ? "Konto nötig" : "ohne Konto" }),
        l.geprueftAm ? h("span", { class: "badge ok", text: "geprüft " + datumDe(l.geprueftAm) }) : h("span", { class: "badge gelb", text: "ungeprüft" }),
        l.notiz ? h("span", { class: "gedaempft klein", text: l.notiz }) : null));
    });
    box.append(h("div", { class: "band" }, knopf("Lieferanten bearbeiten (Katalog)", function () { S.katReiter = "lieferanten"; S.katOffen = null; geheZu("katalog"); }, "klein", { "data-lieferanten-bearbeiten": "" })));
    var vs = (WC.LIEFERANTEN_VORSCHLAEGE || []).filter(function (x) { return !K.finde(kat.lieferanten, x.id); });
    if (vs.length) {
      var vb = h("details", { class: "erklaer-feld", "data-vorschlaege": String(vs.length) },
        h("summary", null, h("b", { text: "Vorschläge zum Prüfen (" + vs.length + ")" }), " ", h("span", { class: "badge gelb", text: "nicht abgerufen — ungeprüft" })),
        h("p", { class: "gedaempft klein", text: "Per Websuche gefunden (2026-10-12); die Seiten selbst ließen sich beim Bau nicht abrufen. Öffnen, ansehen, dann „✓ geprüft“ — erst das trägt den Lieferanten ein, mit heutigem Datum." }));
      vs.forEach(function (x) {
        vb.append(h("div", { class: "eintrag-kat", "data-vorschlag": x.id },
          h("div", { class: "zeile" }, h("b", { text: x.name }), handelLink(x.url, "öffnen"), h("span", { class: "badge", text: FUER_TEXT[x.fuer] || x.fuer }), h("span", { class: "badge", text: x.anmeldung ? "Konto nötig" : "ohne Konto" })),
          h("p", { class: "gedaempft klein", text: x.notiz }),
          knopf("✓ geprüft — eintragen", function () {
            var n = kopie(x); n.geprueftAm = A.heute(); kat.lieferanten.push(n); katalogSpeichern();
            melde("„" + x.name + "“ eingetragen, geprüft am " + datumDe(n.geprueftAm) + ". „Für“, „Konto nötig“ und Notiz im Katalog anpassen, wenn es anders ist.", "");
          }, "klein", { "data-vorschlag-uebernehmen": x.id })));
      });
      box.append(vb);
    }
    return box;
  }

  /* ════ Katalog ════ */
  var FELDER = {
    gebiete: [["name", "Name", "text"]],
    materialien: [["name", "Name", "text"], ["gebiet", "Arbeitsgebiet", "gebiet"], ["einheit", "Einheit", "wahl", ["m2", "lfm", "stueck", "platte", "tsd_stiche"]], ["ekCent", "Einkaufspreis je Einheit €", "cent"],
      ["verschnittPct", "Verschnitt %", "zahl"], ["rollenbreiteMm", "Rollenbreite mm", "zahl"], ["platteBMm", "Platte Breite mm", "zahl"], ["platteHMm", "Platte Höhe mm", "zahl"], ["gewichtG", "Gewicht g je Einheit", "zahl"]],
    verfahren: [["name", "Name", "text"], ["gebiet", "Arbeitsgebiet", "gebiet"], ["maschinensatzCent", "Maschinenstundensatz €/h", "cent"], ["leistung", "Leistung je Stunde", "zahl"],
      ["leistungEinheit", "Leistung in", "wahl", ["m2", "stueck", "tsd_stiche"]], ["ruestMin", "Rüstzeit min", "zahl"], ["farbregel", "Farbregel", "wahl", ["ein", "je_farbe", "digital"]], ["jeFarbe", "Maschine läuft je Farbe", "bool"]],
    vorlagen: [["name", "Name", "text"], ["gebiet", "Arbeitsgebiet", "gebiet"], ["mengenregel", "Mengenregel", "wahl", ["stueck", "flaeche", "rolle", "platte", "laenge"]], ["beschreibungVorgabe", "Beschreibung (Vorgabe)", "text"], ["einheitText", "Mengen-Einheit auf dem Angebot (Stk., Std., km)", "text"],
      ["stiche", "Stickerei: Stichzahl abfragen", "bool"], ["sticheVorgabe", "Stichzahl je Stück (Vorgabe)", "zahl"],
      ["breiteVorgabe", "Breite mm (Vorgabe)", "zahl"], ["hoeheVorgabe", "Höhe mm (Vorgabe)", "zahl"], ["abstandMm", "Abstand mm (Nesting)", "zahl"], ["farbenMax", "Farben höchstens", "zahl"],
      ["verfahrenWahl", "Verfahren (Auswahl)", "multi:verfahren"], ["verfahrenVorgabe", "Verfahren (Vorgabe)", "ref:verfahren"],
      ["versandArt", "Versand als", "wahl", ["stueck", "flach", "rolle", "keiner"]], ["volumenJeStueckL", "Volumen je Stück l", "zahl"], ["laengeMm", "Längstes Maß je Stück mm", "zahl"], ["dickeMm", "Dicke mm (flach/rolle)", "zahl"],
      ["gewichtJeStueckG", "Zusatzgewicht je Stück g", "zahl"], ["zukaufEkCent", "Zukauf-EK je Stück € (Vergleich)", "cent"],
      ["einkaufsprodukt", "🛒 Einkaufsprodukt (fertig zugekauft) — steht dann nur noch auf der Seite Handelsware", "bool"]],
    lieferanten: [["name", "Name", "text"], ["url", "Adresse (https://…)", "link"], ["fuer", "für", "wahl", ["wiederverkaeufer", "privat", "beides"]],
      ["anmeldung", "Wiederverkäufer-Konto nötig", "bool"], ["notiz", "Notiz", "text"], ["geprueftAm", "geprüft am", "datum"]],
    verpackungen: [["name", "Name", "text"], ["innenL", "Innen L mm", "zahl"], ["innenB", "Innen B mm", "zahl"], ["innenH", "Innen H mm", "zahl"], ["eigengewichtG", "Eigengewicht g", "zahl"],
      ["ekCent", "Einkaufspreis €", "cent"], ["packMin", "Packen min", "zahl"], ["maxGewichtG", "max. Gewicht g", "zahl"]],
    versand: [["name", "Name", "text"], ["maxL", "max. Länge mm (0 = egal)", "zahl"], ["maxGurt", "max. Gurtmaß mm (0 = egal)", "zahl"], ["sperrgutCent", "Sperrgut-Zuschlag € (leer = keins)", "cent"], ["sperrgutMaxL", "Sperrgut bis Länge mm", "zahl"]],
  };
  var PREISFELDER = ["ekCent", "maschinensatzCent", "leistung", "ruestMin", "gewichtG", "verschnittPct", "packMin", "sperrgutCent"];
  var KAT_NAMEN = { vorlagen: "Produktvorlagen", materialien: "Materialien", verfahren: "Verfahren", verpackungen: "Verpackungen", versand: "Versandtarife", gebiete: "Arbeitsgebiete", lieferanten: "Lieferanten" };
  var FUER_TEXT = { wiederverkaeufer: "für Wiederverkäufer", privat: "für jeden (auch privat)", beides: "Wiederverkäufer und privat" };

  function eingabe(obj, key, typ, opt, onAenderung) {
    var w = obj[key];
    function fertig(neu) {
      if (key === "einkaufsprodukt") {
        obj[key] = !!neu; if (neu) obj.einkauf = obj.einkauf || [];
        katalogSpeichern();
        melde(neu ? "„" + (obj.name || obj.id) + "“ ist jetzt ein Einkaufsprodukt und steht auf der Seite 🛒 Handelsware (nicht mehr unter den Produktvorlagen)." : "„" + (obj.name || obj.id) + "“ ist wieder ein selbst gefertigtes Produkt.", "");
        return;
      }
      obj[key] = neu; var war = !!obj.platzhalter; if (PREISFELDER.indexOf(key) >= 0 || /Cent$/.test(key)) delete obj.platzhalter; katalogSpeichern(); if (onAenderung) onAenderung(); else if (war && !obj.platzhalter) zeichne(); }
    var at = { "data-kat-feld": key };
    if (typ === "text") return h("input", Object.assign(at, { value: w || "", onchange: function () { fertig(this.value); } }));
    if (typ === "zahl") return h("input", Object.assign(at, { inputmode: "decimal", value: w == null ? "" : deZahl(w), onchange: function () { fertig(zahlPunkt(this.value)); } }));
    if (typ === "cent") return h("input", Object.assign(at, { inputmode: "decimal", value: w == null || w === "" ? "" : G.formatCents(w), onchange: function () { var c = this.value.trim() === "" ? null : G.parseEuroToCents(this.value); fertig(Number.isFinite(c) ? c : null); } }));
    if (typ === "link") return h("input", Object.assign(at, { type: "url", inputmode: "url", value: w || "", placeholder: "https://…", onchange: function () {
      var v = this.value.trim(); if (v && !KAT.sichereAdresse(v)) { melde("Die Adresse muss mit https:// beginnen — nicht übernommen.", "bad"); return; } fertig(v); } }));
    if (typ === "datum") return h("input", Object.assign(at, { type: "date", value: w || "", onchange: function () { fertig(this.value); } }));
    if (typ === "bool") return h("input", Object.assign(at, { type: "checkbox", checked: !!w, onchange: function () { fertig(this.checked); } }));
    if (typ === "wahl") return h("select", Object.assign(at, { onchange: function () { fertig(this.value); } }), opt.map(function (o) { return h("option", { value: o, text: o, selected: o === w }); }));
    if (typ === "gebiet") return h("select", Object.assign(at, { onchange: function () { fertig(this.value); } }), S.katalog.gebiete.map(function (gb) { return h("option", { value: gb.id, text: gb.name, selected: gb.id === w }); }));
    if (typ.indexOf("ref:") === 0) { var l = S.katalog[typ.slice(4)]; return h("select", Object.assign(at, { onchange: function () { fertig(this.value); } }), h("option", { value: "", text: "—" }), l.map(function (x) { return h("option", { value: x.id, text: x.name, selected: x.id === w }); })); }
    if (typ.indexOf("multi:") === 0) {
      var liste = S.katalog[typ.slice(6)], cur = Array.isArray(w) ? w : [];
      return h("div", Object.assign(at, { class: "band" }), liste.map(function (x) {
        return h("label", { class: "schalter" }, h("input", { type: "checkbox", checked: cur.indexOf(x.id) >= 0, onchange: function () {
          var n = (Array.isArray(obj[key]) ? obj[key] : []).filter(function (q) { return q !== x.id; }); if (this.checked) n.push(x.id); fertig(n); } }), x.name);
      }));
    }
    return h("span");
  }
  function felderFuer(obj, liste, onAenderung) { return h("div", { class: "feldgitter" }, liste.map(function (f) { return feld(f[1], eingabe(obj, f[0], f[2], f[3], onAenderung)); })); }

  function zKatalog(main) {
    var kat = S.katalog;
    var fehler = KAT.pruefe(kat), ph = KAT.platzhalter(kat);
    main.append(h("div", { class: "karte" }, h("h2", { text: "Katalog" }),
      h("p", { class: "gedaempft klein", text: "Alles hier ist von Hand erweiterbar: Arbeitsgebiete, Materialien, Verfahren, Produktvorlagen mit Zeit-Mustern, Beispielen und Marktpreisen, Verpackungen, Versandtarife." }),
      ph.anzahl ? h("div", { class: "hinweis warn", "data-katalog-platzhalter": String(ph.anzahl) }, ph.anzahl + " Einträge tragen noch Platzhalter-Werte (gelb markiert). Wer einen Preis ändert, nimmt die Marke weg.") : null,
      fehler.length ? h("div", { class: "hinweis bad", "data-katalog-fehler": "" }, "Der Katalog hat Fehler: " + fehler.join(" · ")) : null,
      h("div", { class: "band" },
        knopf("⬇ Katalog als Datei", function () { herunterladen("workflow-calculate-katalog.json", KAT.exportieren(kat), "application/json"); }, "klein", { id: "katalog-export" }),
        h("label", { class: "btn klein" }, "⬆ Katalog einlesen", h("input", { type: "file", accept: ".json,application/json", hidden: true, id: "katalog-import", onchange: function () {
          var file = this.files && this.files[0]; if (!file) return;
          file.text().then(function (t) { var r = KAT.importieren(t); if (!r.ok) { melde("Nicht eingelesen: " + r.fehler.join(" · "), "bad"); return; } S.katalog = r.katalog; katalogSpeichern(); melde("Katalog eingelesen.", ""); });
        } })),
        knopf("Startkatalog wiederherstellen", function () { if (confirm("Den ganzen Katalog durch den Startkatalog ersetzen? Eigene Einträge gehen verloren (vorher als Datei sichern).")) { S.katalog = kopie(WC.START); katalogSpeichern(); zeichne(); } }, "klein gefahr"))));
    main.append(gebieteKarte(kat));
    var nav = h("div", { class: "band", style: "margin-bottom:10px" });
    kat.lieferanten = kat.lieferanten || [];
    Object.keys(KAT_NAMEN).forEach(function (k) { nav.append(knopf(KAT_NAMEN[k] + " (" + (k === "vorlagen" ? KAT.eigenfertigung(kat) : kat[k]).length + ")", function () { S.katReiter = k; S.katOffen = null; zeichne(); }, "chip" + (S.katReiter === k ? " on" : ""), { "data-kat-reiter": k })); });
    main.append(nav);
    /* Einkaufsprodukte stehen auf der Seite „🛒 Handelsware“ — hier nur die selbst gefertigten. Gelöscht/kopiert wird in der GANZEN Liste. */
    var alle = kat[S.katReiter] || [], liste = S.katReiter === "vorlagen" ? KAT.eigenfertigung(kat) : alle;
    var karte = h("div", { class: "karte katalog-liste" });
    var nHw = KAT.handelsware(kat).length;
    if (S.katReiter === "vorlagen" && nHw) karte.append(h("p", { class: "gedaempft klein", "data-kat-handel": String(nHw) }, nHw + " Einkaufsprodukt(e) stehen auf der Seite ", knopf("🛒 Handelsware", function () { geheZu("handel"); }, "klein"), "."));
    if (S.katReiter === "lieferanten") karte.append(h("p", { class: "gedaempft klein", text: "Lieferanten für Handelsware (fertig eingekauft). Eintragen, was geprüft ist — Vorschläge stehen auf der Seite 🛒 Handelsware." }));
    liste.forEach(function (x) {
      var auf = S.katOffen === x.id;
      var kopfZ = h("div", { class: "band", style: "justify-content:space-between" },
        h("button", { type: "button", class: "btn klein", "data-kat-eintrag": x.id, onclick: function () { S.katOffen = auf ? null : x.id; zeichne(); } }, (auf ? "▾ " : "▸ ") + (x.name || x.id)),
        h("span", { class: "band" }, x.platzhalter ? h("span", { class: "platzhalter-marke", text: "Platzhalter" }) : null,
          knopf("⧉", function () { var c = kopie(x); c.id = KAT.neueKennung(alle, x.id + "_kopie"); c.name = (x.name || "") + " (Kopie)"; c.verlauf = []; alle.push(c); katalogSpeichern(); S.katOffen = c.id; zeichne(); }, "klein", { "aria-label": "Kopieren", title: "Kopieren" }),
          knopf("✕", function () { if (!confirm("„" + (x.name || x.id) + "“ löschen?")) return; S.katalog[S.katReiter] = alle.filter(function (q) { return q !== x; }); katalogSpeichern(); zeichne(); }, "klein gefahr", { "aria-label": "Löschen", title: "Löschen" })));
      var e = h("div", { class: "eintrag-kat", "data-kat-id": x.id }, kopfZ);
      if (auf) {
        e.append(felderFuer(x, FELDER[S.katReiter] || [], null));
        if (S.katReiter === "vorlagen") e.append(vorlageDetails(x));
        if (S.katReiter === "versand") e.append(stufenEditor(x));
        if (S.katReiter === "gebiete") e.append(h("p", { class: "gedaempft klein", text: "Sätze und Kundenklassen des Gebiets: Reiter „Einstellungen“." }));
      }
      karte.append(e);
    });
    karte.append(knopf("＋ " + (KAT_NAMEN[S.katReiter] || "Eintrag"), function () {
      var n = neuerEintrag(S.katReiter); alle.push(n); katalogSpeichern(); S.katOffen = n.id; zeichne();
    }, "pri", { id: "kat-neu" }));
    main.append(karte);
  }
  /* Stufe 3: mitgelieferte Arbeitsgebiete in den eigenen Katalog holen — eigene Einträge bleiben unberührt */
  function gebieteKarte(kat) {
    var box = h("div", { class: "karte", "data-gebiete-start": "" }, h("h3", { text: "Arbeitsgebiete" }),
      h("p", { class: "gedaempft klein", text: "Mitgelieferte Gebiete mit eigenem Startkatalog (Platzhalter-Zahlen). Hinzufügen ändert nichts an dem, was schon da ist." }));
    Object.keys(WC.STARTKATALOGE || {}).forEach(function (id) {
      var pk = WC.STARTKATALOGE[id], da = KAT.gebietDa(kat, id);
      box.append(h("div", { class: "zeile", "data-gebiet-start": id },
        h("span", null, h("b", { text: pk.name }), h("span", { class: "gedaempft klein", text: " — " + pk.beschreibung + " (" + (pk.vorlagen || []).length + " Produktvorlagen)" })),
        da ? h("span", { class: "badge ok", text: "✓ im Katalog" }) : knopf("＋ hinzufügen", function () {
          var r = KAT.gebietHinzufuegen(S.katalog, pk);
          katalogSpeichern();
          melde("„" + pk.name + "“ hinzugefügt: " + r.neu.vorlagen + " Produktvorlagen, " + r.neu.materialien + " Materialien, " + r.neu.verfahren + " Verfahren" +
            (r.schonDa ? " · " + r.schonDa + " Einträge waren schon da und bleiben, wie sie sind" : "") + ". Alle Zahlen sind Platzhalter — eigene im Katalog eintragen.", "");
        }, "klein pri", { "data-gebiet-hinzu": id })));
    });
    return box;
  }
  function neuerEintrag(art) {
    var gb = S.katalog.gebiete[0] ? S.katalog.gebiete[0].id : "";
    var l = S.katalog[art], id = KAT.neueKennung(l, "neu");
    if (art === "materialien") return { id: id, gebiet: gb, name: "Neues Material", einheit: "m2", ekCent: null, verschnittPct: 0, gewichtG: 0 };
    if (art === "verfahren") return { id: id, gebiet: gb, name: "Neues Verfahren", maschinensatzCent: null, leistung: 0, leistungEinheit: "stueck", ruestMin: 0, farbregel: "ein", jeFarbe: false };
    if (art === "vorlagen") return { id: id, gebiet: gb, name: "Neues Produkt", mengenregel: "stueck", verfahrenWahl: [], verfahrenVorgabe: "", farbenMax: 1, slots: [], schritte: [], staffelVorgabe: [1],
      versandArt: "stueck", volumenJeStueckL: 0, laengeMm: 0, markt: [], marktGrenzen: { online: 50, import: 500 }, verlauf: [], beispiele: [] };
    if (art === "lieferanten") return { id: id, name: "Neuer Lieferant", url: "", fuer: "wiederverkaeufer", anmeldung: false, notiz: "", geprueftAm: "" };
    if (art === "verpackungen") return { id: id, name: "Neue Verpackung", innenL: 0, innenB: 0, innenH: 0, eigengewichtG: 0, ekCent: null, packMin: 0 };
    if (art === "versand") return { id: id, name: "Neuer Dienst", maxL: 0, maxGurt: 0, sperrgutCent: null, stufen: [] };
    return { id: id, name: "Neues Arbeitsgebiet", saetze: kopie(S.katalog.gebiete[0] ? S.katalog.gebiete[0].saetze : {}), klassen: kopie(S.katalog.gebiete[0] ? S.katalog.gebiete[0].klassen : {}) };
  }
  /* Kleine Tabellen-Editoren für Listen in einem Eintrag */
  function listenEditor(titel, arr, spalten, neu, attr) {
    var box = h("div", Object.assign({ style: "margin-top:8px" }, attr || {}), h("b", { text: titel }));
    arr.forEach(function (z, i) {
      box.append(h("div", { class: "zeile", style: "align-items:flex-end" }, spalten.map(function (s) { return feld(s[1], eingabe(z, s[0], s[2], s[3])); }),
        knopf("✕", function () { arr.splice(i, 1); katalogSpeichern(); zeichne(); }, "klein", { "aria-label": "Zeile löschen" })));
    });
    box.append(knopf("＋ " + titel, function () { arr.push(neu()); katalogSpeichern(); zeichne(); }, "klein"));
    return box;
  }
  function stufenEditor(d) { d.stufen = d.stufen || []; return listenEditor("Gewichtsstufe", d.stufen, [["bisG", "bis g", "zahl"], ["cent", "Preis €", "cent"]], function () { return { bisG: 0, cent: null }; }); }
  function vorlageDetails(v) {
    var box = h("div");
    v.slots = v.slots || []; v.schritte = v.schritte || []; v.beispiele = v.beispiele || []; v.markt = v.markt || []; v.marktGrenzen = v.marktGrenzen || {};
    box.append(feld("Staffel (Vorgabe, mit Komma)", h("input", { value: (v.staffelVorgabe || []).join(", "), onchange: function () { v.staffelVorgabe = this.value.split(/[,;\s]+/).map(Number).filter(function (n) { return n > 0; }); katalogSpeichern(); } })));
    box.append(listenEditor("Material-Platz", v.slots, [["name", "Name", "text"], ["bezug", "Menge aus", "wahl", ["regel", "flaeche", "stueck", "stiche"]], ["wahl", "Materialien", "multi:materialien"],
      ["vorgabe", "Vorgabe", "ref:materialien"], ["optional", "darf fehlen", "bool"], ["jeFarbe", "je Farbe", "bool"], ["nurBei", "nur bei Verfahren", "multi:verfahren"]],
      function () { return { id: KAT.neueKennung(v.slots, "platz"), name: "Material", bezug: "regel", wahl: [], vorgabe: "" }; }, { "data-slots": "" }));
    box.append(listenEditor("Arbeitsschritt (Zeit-Muster)", v.schritte, [["name", "Name", "text"], ["ruestMin", "Rüsten min", "zahl"], ["minJeStueck", "min je Stück", "zahl"], ["minJeM2", "min je m²", "zahl"],
      ["jeFarbe", "je Farbe", "bool"], ["nurBei", "nur bei Verfahren", "multi:verfahren"]],
      function () { return { id: KAT.neueKennung(v.schritte, "schritt"), name: "Schritt", ruestMin: 0, minJeStueck: 0, minJeM2: 0 }; }, { "data-schritte": "" }));
    /* Sätze der Vorlage (überstimmen das Arbeitsgebiet) */
    v.saetze = v.saetze || {};
    box.append(h("div", { style: "margin-top:8px" }, h("b", { text: "Eigene Sätze dieser Vorlage (leer = Arbeitsgebiet)" }),
      felderFuer(v.saetze, [["stundensatzCent", "Stundensatz €/h", "cent"], ["lohnCent", "Lohn €/h (ausführlich)", "cent"], ["gewinnPct", "Gewinn %", "zahl"], ["materialzuschlagPct", "Materialzuschlag %", "zahl"]])));
    /* Beispiele mit Ansichten */
    var bx = h("div", { style: "margin-top:8px", "data-beispiele-editor": "" }, h("b", { text: "Beispiele (Bilder in mehreren Ansichten; der Preis wird immer frisch gerechnet)" }));
    v.beispiele.forEach(function (b, i) {
      b.ansichten = b.ansichten || [];
      bx.append(h("div", { class: "eintrag-kat" },
        felderFuer(b, [["titel", "Titel", "text"], ["menge", "Menge", "zahl"], ["breiteMm", "Breite mm", "zahl"], ["hoeheMm", "Höhe mm", "zahl"], ["farben", "Farben", "zahl"], ["verfahren", "Verfahren", "ref:verfahren"]]),
        h("div", { class: "daumen" }, b.ansichten.map(function (an, j) {
          return h("span", { class: "band" }, h("img", { src: bildQuelle(an[1]), alt: an[0] }), h("input", { class: "mittel", value: an[0], "aria-label": "Name der Ansicht", onchange: function () { an[0] = this.value; katalogSpeichern(); } }),
            knopf("✕", function () { b.ansichten.splice(j, 1); katalogSpeichern(); zeichne(); }, "klein", { "aria-label": "Ansicht entfernen" }));
        }), h("label", { class: "btn klein" }, "📷 Foto als Ansicht", h("input", { type: "file", accept: "image/*", hidden: true, "data-ansicht-hoch": v.id + ":" + b.id, onchange: function () {
          var file = this.files && this.files[0]; if (!file) return;
          bildSpeichern(file).then(function (id) { b.ansichten.push(["Foto " + (b.ansichten.length + 1), "img:" + id]); katalogSpeichern(); zeichne(); }, function () { melde("Das Bild ließ sich nicht lesen.", "bad"); });
        } }))),
        knopf("✕ Beispiel entfernen", function () { v.beispiele.splice(i, 1); katalogSpeichern(); zeichne(); }, "klein gefahr")));
    });
    bx.append(knopf("＋ Beispiel", function () { v.beispiele.push({ id: KAT.neueKennung(v.beispiele, "b"), titel: "Beispiel", menge: (v.staffelVorgabe || [1])[0], breiteMm: v.breiteVorgabe || "", hoeheMm: v.hoeheVorgabe || "", ansichten: [] }); katalogSpeichern(); zeichne(); }, "klein"));
    box.append(bx);
    box.append(galerie(v, S.katalog, {}, null));
    /* Marktgrenzen */
    box.append(h("div", { style: "margin-top:8px" }, h("b", { text: "Marktvergleich: ab welcher Menge eine Klasse gilt" }),
      felderFuer(v.marktGrenzen, [["online", "Online-Druckerei ab Stück", "zahl"], ["import", "Import/Massenware ab Stück", "zahl"]])));
    /* Verlauf: übernommene Preise, rücknehmbar */
    var vl = h("div", { style: "margin-top:8px", "data-verlauf": v.id }, h("b", { text: "Verlauf (eigene Preise übernommen)" }));
    if (!(v.verlauf || []).length) vl.append(h("p", { class: "gedaempft klein", text: "noch nichts übernommen" }));
    (v.verlauf || []).slice().reverse().forEach(function (e) {
      vl.append(h("div", { class: "zeile", "data-verlauf-eintrag": String(e.nr) },
        h("span", { class: "klein", text: e.datum + " · " + ({ gewinn: "Gewinn", stundensatz: "Stundensatz", minuten: "Zeit-Muster" }[e.weg] || e.weg) + " · " + (e.anlass || "") + (e.angebot ? " · " + e.angebot : "") + (e.zurueck ? " · zurückgenommen" : "") }),
        e.zurueck ? null : knopf("Rücknehmen", function () { K.ruecknehmen(S.katalog, v.id, e.nr); katalogSpeichern(); melde("Zurückgenommen — die Vorlage rechnet wieder wie vorher.", ""); }, "klein", { "data-ruecknehmen": String(e.nr) })));
    });
    box.append(vl);
    return box;
  }
  function herunterladen(name, text, typ) {
    var u = URL.createObjectURL(new Blob([text], { type: typ })), l = h("a", { href: u, download: name });
    document.body.append(l); l.click(); l.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 2000);
  }

  /* ════ Einstellungen ════ */
  function zEinstellungen(main) {
    var f = S.einst.firma;
    main.append(h("div", { class: "karte" }, h("h2", { text: "Firma (steht auf dem Angebot)" }),
      h("div", { class: "feldgitter" }, ["name", "anschrift", "kontakt", "steuer", "bank"].map(function (k) {
        var lab = { name: "Name", anschrift: "Anschrift", kontakt: "Kontakt", steuer: "Steuernummer / USt-IdNr.", bank: "Bankverbindung" }[k];
        return feld(lab, h(k === "anschrift" ? "textarea" : "input", { value: f[k] || "", "data-firma": k, "data-key": "firma-" + k, oninput: function () { f[k] = this.value; einstSpeichern(); } }));
      })),
      h("label", { class: "schalter" }, h("input", { type: "checkbox", checked: !!S.einst.kleinunternehmer, id: "kleinunternehmer", onchange: function () { S.einst.kleinunternehmer = this.checked; einstSpeichern(); } }), "Kleinunternehmer (§ 19 UStG, keine USt)")));
    main.append(sicherungKarte());
    S.katalog.gebiete.forEach(function (gb) {
      var s = gb.saetze = gb.saetze || {};
      function sp() { delete gb.platzhalter; katalogSpeichern(); }
      var modus = s.modus === "voll" ? "voll" : "einfach";
      var karte = h("div", { class: "karte", "data-gebiet-saetze": gb.id }, h("h2", { text: "Sätze — " + gb.name }),
        gb.platzhalter ? h("div", { class: "hinweis warn", "data-saetze-platzhalter": "" }, "Platzhalter-Sätze — nicht aus deinen Zahlen. Unten mit den Rechnern aus deinen Jahreskosten bestimmen.") : null,
        h("p", { class: "gedaempft klein", text: "Gerechnet wird nach dem Schema der Zuschlagskalkulation (Kosten- und Leistungsrechnung). Die Formeln sind Standard; die Sätze sind betriebsindividuell und kommen aus deinen eigenen Kosten." }),
        h("div", { class: "seg", style: "margin:6px 0" }, [["einfach", "Vereinfacht"], ["voll", "Ausführlich (MGK, FGK, VwGK, VtGK)"]].map(function (m) {
          return h("button", { type: "button", class: modus === m[0] ? "on" : "", "data-modus": m[0], onclick: function () { s.modus = m[0]; sp(); zeichne(); } }, m[1]);
        })));
      var liste = modus === "voll"
        ? [["lohnCent", "Fertigungslohn €/h", "cent"], ["mgkPct", "Materialgemeinkosten %", "zahl"], ["fgkPct", "Fertigungsgemeinkosten %", "zahl"], ["vwgkPct", "Verwaltungsgemeinkosten %", "zahl"], ["vtgkPct", "Vertriebsgemeinkosten %", "zahl"]]
        : [["stundensatzCent", "Stundenverrechnungssatz €/h", "cent"], ["materialzuschlagPct", "Materialzuschlag %", "zahl"], ["gkPct", "Gemeinkosten % (auf Herstellkosten)", "zahl"]];
      liste = liste.concat([["gewinnPct", "Gewinn %", "zahl"], ["skontoPct", "Kundenskonto %", "zahl"], ["provisionPct", "Provision %", "zahl"], ["rabattPct", "Kundenrabatt %", "zahl"],
        ["handlungskostenPct", "Handlungskosten % (Zukauf)", "zahl"], ["ustSatz", "USt %", "zahl"]]);
      karte.append(felderFuer(s, liste, function () { delete gb.platzhalter; katalogSpeichern(); }));
      /* Kundenklassen */
      gb.klassen = gb.klassen || {};
      var kl = h("div", { "data-klassen": gb.id }, h("h3", { text: "Kundenklassen A / B / C", style: "margin-top:10px" }),
        h("p", { class: "gedaempft klein", text: "Wirkt auf Stundensatz und Gewinn, solange Position oder Angebot keinen eigenen Wert setzen. Steht nie auf dem Angebot." }));
      ["A", "B", "C"].forEach(function (c) {
        var k = gb.klassen[c] = gb.klassen[c] || { name: c, stundenPct: 0, gewinnPct: 0 };
        kl.append(h("div", { class: "zeile" }, h("b", { text: c, style: "width:1.5em" }), felderFuer(k, [["name", "Bezeichnung", "text"], ["stundenPct", "Stundensatz ± %", "zahl"], ["gewinnPct", "Gewinn ± Prozentpunkte", "zahl"]])));
      });
      karte.append(kl);
      karte.append(rechnerKarte(gb));
      main.append(karte);
    });
  }
  /* ── Verschlüsselte Sicherung (Muster Workflow-Needs) — Rechnen in assets/kern/sicherung.js ── */
  var SI = WC.sicherung, gewaehlt = null;
  var SI_GRUND = { kurz: "Das Passwort braucht mindestens " + SI.MIN_PW + " Zeichen.", passwort: "Das Passwort passt nicht zu dieser Sicherung.",
    fassung: "Diese Sicherung stammt aus einer anderen Fassung der App.", "keine-sicherung": "Das ist keine Sicherungsdatei von Workflow Calculate.",
    "schloss-fehlt": "Das Schloss (Verschlüsselung) ist nicht geladen — bitte ⟳ neu laden." };
  function siMelde(id, text, gut) { var el = document.getElementById(id); if (!el) return; el.hidden = false; el.className = "hinweis " + (gut ? "" : "bad"); el.textContent = text; }
  function sicherungKarte() {
    var z = lsGet(LS.sicherung);
    var pw = h("input", { type: "password", id: "sicherung-pw", autocomplete: "new-password" }), pw2 = h("input", { type: "password", id: "sicherung-pw2", autocomplete: "new-password" });
    var pwz = h("input", { type: "password", id: "sicherung-pw-zurueck", autocomplete: "current-password" });
    return h("div", { class: "karte", id: "sicherung-kasten", "data-sicherung": "" }, h("h2", { text: "🔐 Sicherung" }),
      h("p", { class: "klein", id: "sicherung-stand", text: z ? "Letzte Sicherung auf diesem Gerät: " + datumDe(z.slice(0, 10)) : "Auf diesem Gerät wurde noch keine Sicherung angelegt." }),
      h("p", { class: "gedaempft klein", text: "Eine Datei mit allen Angeboten, Kunden, Bildern, dem Katalog und den Einstellungen — verschlüsselt mit deinem Passwort (AES-256)." }),
      h("div", { class: "feldgitter" }, feld("Passwort (mind. " + SI.MIN_PW + " Zeichen)", pw), feld("Passwort wiederholen", pw2)),
      h("p", { class: "hinweis warn klein", text: "Das Passwort wird nirgends gespeichert. Ist es vergessen, lässt sich die Sicherung nicht mehr öffnen — von niemandem." }),
      knopf("🔐 Sicherung speichern", function () {
        if (pw.value.length < SI.MIN_PW) return siMelde("sicherung-meldung", SI_GRUND.kurz, false);
        if (pw.value !== pw2.value) return siMelde("sicherung-meldung", "Die beiden Passwörter sind nicht gleich.", false);
        siMelde("sicherung-meldung", "Wird verschlüsselt …", true);
        jetztSpeichern().then(function () { return Promise.all([dbAlle("angebote"), dbAlle("kunden"), dbAlle("bilder")]); }).then(function (l) {
          return SI.verschliessen(pw.value, { angebote: l[0], kunden: l[1], bilder: l[2], speicher: { katalog: lsGet(LS.katalog), einstellungen: lsGet(LS.einst) } });
        }).then(function (d) {
          var name = "Workflow-Calculate-Sicherung-" + d.erstellt.slice(0, 10) + ".json", text = JSON.stringify(d);
          window.__wcSicherung = text; herunterladen(name, text, "application/json");
          lsSet(LS.sicherung, d.erstellt); pw.value = ""; pw2.value = "";
          siMelde("sicherung-meldung", "✓ " + S.angebote.length + " Angebote gesichert in „" + name + "“. Lege die Datei an einen zweiten Ort (Stick, Cloud, Mail an dich selbst).", true);
        }, function (e) { siMelde("sicherung-meldung", SI_GRUND[e && e.message] || "Die Sicherung ist nicht gelungen.", false); });
      }, "pri", { id: "sicherung-machen" }),
      h("p", { id: "sicherung-meldung", role: "status", hidden: true }),
      h("h3", { text: "Zurückholen", style: "margin-top:12px" }),
      h("p", { class: "gedaempft klein", text: "Fügt hinzu, überschreibt nie: was mit derselben Nummer schon da ist, bleibt. Katalog und Einstellungen kommen nur, wo hier noch keine eigenen stehen." }),
      h("div", { class: "zeile" }, h("label", { class: "btn" }, "📂 Sicherung wählen …", h("input", { type: "file", accept: ".json,application/json", hidden: true, id: "sicherung-datei", onchange: function () {
          var f = this.files && this.files[0]; if (!f) return;
          f.text().then(function (t) { var j = null; try { j = JSON.parse(t); } catch (_e) {}
            if (!SI.istSicherung(j)) { gewaehlt = null; siMelde("sicherung-zurueck-meldung", SI_GRUND["keine-sicherung"], false); return; }
            gewaehlt = j; siMelde("sicherung-zurueck-meldung", "Sicherung vom " + datumDe(String(j.erstellt).slice(0, 10)) + " gewählt — jetzt das Passwort eingeben.", true); pwz.focus(); });
        } })), feld("Passwort der Sicherung", pwz),
        knopf("Zurückholen", function () {
          if (!gewaehlt) return siMelde("sicherung-zurueck-meldung", "Erst eine Sicherungsdatei wählen.", false);
          SI.oeffnen(pwz.value, gewaehlt).then(function (o) {
            return dbAlle("bilder").then(function (bl) {
              var neu = SI.zusammenfuehren({ angebote: S.angebote, kunden: S.kunden, bilder: bl }, o);
              return Promise.all(neu.angebote.map(function (a) { return dbPut("angebote", a); }).concat(neu.kunden.map(function (k) { return dbPut("kunden", k); }))
                .concat(neu.bilder.map(function (b) { return dbPut("bilder", b); }))).then(function () {
                  if (!lsGet(LS.katalog) && o.speicher.katalog) { lsSet(LS.katalog, o.speicher.katalog); katalogLaden(); }
                  if (!lsGet(LS.einst) && o.speicher.einstellungen) { lsSet(LS.einst, o.speicher.einstellungen); S.einst = Object.assign(S.einst, lsJson(LS.einst, {})); }
                  S.angebote = S.angebote.concat(neu.angebote).sort(function (x, y) { return x.id < y.id ? 1 : -1; }); S.kunden = S.kunden.concat(neu.kunden);
                  neu.bilder.forEach(function (b) { bildUrls[b.id] = URL.createObjectURL(b.blob); });
                  gewaehlt = null; pwz.value = "";
                  melde("Zurückgeholt: " + neu.angebote.length + " Angebote, " + neu.kunden.length + " Kunden, " + neu.bilder.length + " Bilder" + (neu.schonDa ? " · " + neu.schonDa + " Angebote waren schon da und bleiben unverändert" : "") + ".", "");
                });
            });
          }, function (e) { siMelde("sicherung-zurueck-meldung", SI_GRUND[e && e.message] || "Zurückholen ist nicht gelungen.", false); });
        }, "", { id: "sicherung-zurueck" })),
      h("p", { id: "sicherung-zurueck-meldung", role: "status", hidden: true }));
  }

  function rechnerKarte(gb) {
    var s = gb.saetze, box = h("div");
    var R1 = S.rechner1 = S.rechner1 || { lohnJahrCent: null, lohnnebenPct: 21, gemeinkostenJahrCent: null, gewinnJahrCent: null, produktiveStunden: 1400 };
    var r1 = K.stundensatzRechner(R1);
    box.append(h("details", { "data-rechner": "stundensatz" }, h("summary", { text: "🧮 Stundensatz-Rechner" }),
      h("p", { class: "gedaempft klein", text: "Stundenverrechnungssatz = (Lohn + Lohnnebenkosten + Gemeinkosten + Gewinn im Jahr) ÷ produktive Stunden im Jahr" }),
      felderFuer(R1, [["lohnJahrCent", "Lohn im Jahr €", "cent"], ["lohnnebenPct", "Lohnnebenkosten %", "zahl"], ["gemeinkostenJahrCent", "Gemeinkosten im Jahr € (Miete, Strom, Fahrzeug …)", "cent"],
        ["gewinnJahrCent", "gewünschter Gewinn im Jahr €", "cent"], ["produktiveStunden", "produktive Stunden im Jahr", "zahl"]], zeichne),
      r1.ok ? h("p", { "data-rechner-satz": String(r1.satzCent) }, "Ergebnis: ", h("b", { text: euro(r1.satzCent) + " je Stunde" }), " ",
        knopf("übernehmen", function () { s.stundensatzCent = r1.satzCent; delete gb.platzhalter; katalogSpeichern(); melde("Stundenverrechnungssatz " + euro(r1.satzCent) + " übernommen.", ""); }, "klein pri")) : h("p", { class: "gedaempft klein", text: r1.grund })));
    var R2 = S.rechner2 = S.rechner2 || { mekCent: null, fertigungslohnCent: null, mgkCent: null, fgkCent: null, vwgkCent: null, vtgkCent: null };
    var r2 = K.zuschlagsRechner(R2);
    box.append(h("details", { "data-rechner": "zuschlaege" }, h("summary", { text: "🧮 Zuschlags-Rechner (vereinfachter Betriebsabrechnungsbogen)" }),
      h("p", { class: "gedaempft klein", text: "Jahreskosten eintragen (aus der EÜR / Buchhaltung). MGK % = MGK ÷ Materialeinzelkosten · FGK % = FGK ÷ Fertigungslöhne · VwGK %, VtGK % = Kosten ÷ Herstellkosten." }),
      felderFuer(R2, [["mekCent", "Materialeinzelkosten im Jahr €", "cent"], ["fertigungslohnCent", "Fertigungslöhne im Jahr €", "cent"], ["mgkCent", "Materialgemeinkosten €", "cent"],
        ["fgkCent", "Fertigungsgemeinkosten €", "cent"], ["vwgkCent", "Verwaltungsgemeinkosten €", "cent"], ["vtgkCent", "Vertriebsgemeinkosten €", "cent"]], zeichne),
      r2.ok ? h("p", { "data-rechner-zuschlaege": "" }, "MGK " + fmtPct(r2.mgkPct) + " % · FGK " + fmtPct(r2.fgkPct) + " % · VwGK " + fmtPct(r2.vwgkPct) + " % · VtGK " + fmtPct(r2.vtgkPct) + " % ",
        knopf("übernehmen (ausführlicher Modus)", function () { Object.assign(s, { modus: "voll", mgkPct: r2.mgkPct, fgkPct: r2.fgkPct, vwgkPct: r2.vwgkPct, vtgkPct: r2.vtgkPct }); delete gb.platzhalter; katalogSpeichern(); melde("Zuschlagssätze übernommen — ausführlicher Modus ist an.", ""); }, "klein pri"))
        : h("p", { class: "gedaempft klein", text: r2.grund })));
    return box;
  }

  /* ── Glanzpunkt folgt der Maus (wie Workflow-Needs) ── */
  function glanz() {
    if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    document.addEventListener("pointermove", function (e) {
      var b = e.target && e.target.closest && e.target.closest(".btn"); if (!b) return;
      var r = b.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      b.style.setProperty("--mx", (px * 100).toFixed(1) + "%"); b.style.setProperty("--my", (py * 100).toFixed(1) + "%");
      b.style.setProperty("--ry", ((px - 0.5) * 10).toFixed(2) + "deg"); b.style.setProperty("--rx", (-(py - 0.5) * 10).toFixed(2) + "deg");
    }, { passive: true });
    document.addEventListener("pointerout", function (e) { var b = e.target && e.target.closest && e.target.closest(".btn"); if (b) ["--mx", "--my", "--rx", "--ry"].forEach(function (p) { b.style.removeProperty(p); }); }, { passive: true });
  }
  function neuLaden() {
    var EIGEN = /^workflow-calculate-/;
    Promise.resolve().then(function () { return window.caches ? caches.keys().then(function (n) { return Promise.all(n.filter(function (x) { return EIGEN.test(x); }).map(function (x) { return caches.delete(x); })); }) : null; })
      .catch(function () {}).then(function () {
        return navigator.serviceWorker && navigator.serviceWorker.getRegistrations ? navigator.serviceWorker.getRegistrations().then(function (rs) {
          var hier = new URL("./", location.href).href; return Promise.all(rs.filter(function (r) { return r.scope === hier; }).map(function (r) { return r.unregister(); })); }) : null;
      }).catch(function () {}).then(function () { return jetztSpeichern(); }).then(function () { location.replace(location.pathname + "?frisch=" + Date.now() + location.hash); });
  }

  function start() {
    try { if (/[?&]frisch=/.test(location.search) && history.replaceState) history.replaceState(null, "", location.pathname + location.hash); } catch (_e) {}
    if (lsGet(LS.thema) === "light") document.documentElement.dataset.theme = "light";
    document.getElementById("thema").addEventListener("click", function () {
      var hell = document.documentElement.dataset.theme !== "light";
      if (hell) document.documentElement.dataset.theme = "light"; else delete document.documentElement.dataset.theme;
      lsSet(LS.thema, hell ? "light" : "dark"); zeichneKopf();
    });
    document.getElementById("neuladen").addEventListener("click", neuLaden);
    var hkn = document.getElementById("handel-knopf"); if (hkn) hkn.addEventListener("click", function () { geheZu("handel"); });
    if (location.hash === "#handel") S.reiter = "handel"; else if (S.reiter === "handel") adresseSetzen("handel");
    window.addEventListener("hashchange", function () {
      if (location.hash === "#handel") { if (S.reiter !== "handel") { S.reiter = "handel"; lsSet(LS.reiter, "handel"); S.meldung = null; zeichne(); } }
      else if (S.reiter === "handel") { S.reiter = "angebote"; lsSet(LS.reiter, "angebote"); zeichne(); }
    });
    glanz();
    Promise.all([dbAlle("angebote"), dbAlle("kunden")]).then(function (r) {
      S.angebote = r[0].sort(function (a, b) { return a.id < b.id ? 1 : -1; });
      S.kunden = r[1].sort(function (a, b) { return a.id < b.id ? -1 : 1; });
      return bilderVorladen(alleBildIds());
    }).then(function () {
      if (!aktivesAngebot() && S.angebote[0]) S.aktiv = S.angebote[0].id;
      zeichne(); document.body.dataset.bereit = "1";
    }).catch(function () { zeichne(); melde("Der Speicher (IndexedDB) ist nicht erreichbar — Angebote werden nicht gespeichert.", "bad"); document.body.dataset.bereit = "1"; });
  }

  window.WCApp = { S: S, zeichne: zeichne, blattBauen: blattBauen, jetztSpeichern: jetztSpeichern };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
