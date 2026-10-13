/* 🔎 Suche — die Startseite (Klaus 2026-10-12: „eine vereinfachte Suchmaschine … nur das Produkt als Ganzes mit dem
   entsprechenden Preis … ohne automatisch die Hintergrundseite aufzurufen“ · „soll sich selbst verbessern mit jeder Frage“).

   Nur RECHNUNG, keine Oberfläche, in Node prüfbar:
   · fuellweg()    Füllwörter („der Kunde möchte“, „Kunde … wünscht“, „wie viel kostet das“) aus der Frage nehmen —
                   und SAGEN, was weggenommen wurde. Ein Name nach „Kunde“ wird nicht gesucht, aber zurückgegeben.
   · lesen()       die Frage über WC.anfrage.lesen auswerten (Mengen, Maße, Farben, Produkte) — kein zweiter Leser.
   · kandidaten()  Produktvorlagen (eigene + Handelsware, auch aus noch nicht geholten Arbeitsgebieten) nach Wörtern
                   ordnen: Angleichung wie Workflow PDF (assets/wfpdf/suche.js, byte-1:1), dazu das GELERNTE.
   · preis()       derselbe Weg wie im Angebot: ein Angebot mit EINER Position, WC.angebot.rechne — Versand,
                   Kleinmengenzuschlag, Kundenklasse inklusive. Es gibt keine zweite Rechnung.
   · lernen()      jede bestätigte Antwort (Menge geändert, Zusammensetzung geöffnet, ins Angebot, „✓ passt“) merkt sich
                   die Frage-Wörter am Produkt; „✕ passt nicht“ merkt das Gegenteil. Beim nächsten Mal zählt das mit.
                   Gespeichert in den Einstellungen (reist mit der Sicherung), höchstens LERN_MAX Einträge.
   Klassisches Skript: window.WC.suche bzw. globalThis.WC.suche. */
(function (g) {
  "use strict";
  var WC = g.WC = g.WC || {};
  function SU() { return (g.WFP && g.WFP.Suche) || g.__WFP_SUCHE || null; }
  function AN() { return WC.anfrage; }

  var FUELL_VORGABE = ["der Kunde möchte", "der Kunde wünscht", "der Kunde hätte gern", "der Kunde braucht", "der Kunde … möchte", "der Kunde … wünscht",
    "Kunde … möchte", "Kunde … wünscht", "Kunde … braucht", "wie viel kostet das", "wieviel kostet das", "was kostet das", "was würde das kosten",
    "was kosten", "was kostet", "wie viel kosten", "wie viel kostet", "ich brauche", "ein Angebot für", "bitte"];
  var LERN_MAX = 300;

  /* ── Füllwörter ── */
  function muster(text) {
    var teile = String(text || "").trim().split(/\s*…\s*|\s*\.\.\.\s*/);
    var esc = function (s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+"); };
    var NAME = "([\\p{L}][\\p{L}.'-]*(?:\\s+[\\p{L}][\\p{L}.'-]*){0,2}?)";
    var kern = teile.map(esc).join("\\s+" + NAME + "\\s+");
    return new RegExp("(?<![\\p{L}\\d])" + kern + "(?![\\p{L}\\d])", "iu");
  }
  function fuellweg(frage, liste) {
    var rest = String(frage || ""), ignoriert = [], kundeName = "";
    var l = (liste || FUELL_VORGABE).map(String).filter(function (x) { return x.trim(); })
      .sort(function (a, b) { return b.length - a.length; });
    l.forEach(function (f) {
      var re; try { re = muster(f); } catch (_e) { return; }
      for (var i = 0; i < 5; i++) {
        var m = re.exec(rest); if (!m) break;
        ignoriert.push(m[0].replace(/\s+/g, " ").trim());
        if (m[1] && !kundeName) kundeName = m[1].trim();
        rest = rest.slice(0, m.index) + " " + rest.slice(m.index + m[0].length);
      }
    });
    var roh = String(frage || "").toLowerCase();
    ignoriert.sort(function (x, y) { return roh.indexOf(x.toLowerCase()) - roh.indexOf(y.toLowerCase()); });
    rest = rest.replace(/[?!]+/g, " ").replace(/\s*,\s*,+/g, ",").replace(/^[\s,.;:]+|[\s,.;:]+$/g, "").replace(/\s+/g, " ").trim();
    return { rest: rest, ignoriert: ignoriert, kundeName: kundeName };
  }

  /* ── Frage lesen ── */
  function lesen(frage, kat, liste, kunden) {
    var f = fuellweg(frage, liste);
    var an = AN().lesen(f.rest, kat, []);
    var kunde = f.kundeName ? AN().kundeFinden({ nr: "", email: "", name: f.kundeName, text: f.kundeName }, kunden || []) : null;
    var mengen = an.mengen.map(function (m) { return m.menge; });
    /* Kein Warenwort hinter der Zahl („30 Kaffeepötte“ — ein Wort, das erst gelernt wird): steht GENAU EINE Zahl in der Frage
       und dahinter keine Zeit, kein Maß, kein Preis, gilt sie als Menge. „in 2 Wochen“ bleibt keine Menge. */
    if (!mengen.length) {
      var ohne = f.rest.replace(/\d+(?:[.,]\d+)?\s*[x×]\s*\d+(?:[.,]\d+)?\s*(?:mm|cm|m)\b/gi, " "), z = [], m, re = /(?<![\d.,])(\d{1,6})(?![\d.,])\s*([\p{L}%€]*)/gu;
      while ((m = re.exec(ohne))) if (!/^(wochen?|tage?n?|monate?n?|jahre?n?|uhr|mm|cm|m|km|kg|g|%|€|euro|eur|farben|farbig|seiten?|std|stunden?)$/i.test(m[2])) z.push(+m[1]);
      if (z.length === 1 && z[0] > 0) mengen = z;
    }
    return { roh: String(frage || ""), rest: f.rest, ignoriert: f.ignoriert, kundeName: f.kundeName, kunde: kunde ? kunde.kunde : null,
      an: an, woerter: an.woerter, mengen: mengen, masse: an.masse, farben: an.farben };
  }

  /* ── Wo steht eine Vorlage? Live-Katalog zuerst, sonst in einem mitgelieferten Arbeitsgebiet ── */
  function gebietVon(vid) {
    var S = WC.STARTKATALOGE || {};
    return Object.keys(S).filter(function (gid) { return (S[gid].vorlagen || []).some(function (v) { return v.id === vid; }); })[0] || "";
  }
  function alleVorlagen(kat) {
    var da = {}, l = [];
    (kat.vorlagen || []).forEach(function (v) { da[v.id] = 1; l.push({ v: v, imKatalog: true }); });
    var S = WC.STARTKATALOGE || {};
    Object.keys(S).forEach(function (gid) { (S[gid].vorlagen || []).forEach(function (v) { if (!da[v.id]) { da[v.id] = 1; l.push({ v: v, imKatalog: false, gebiet: gid }); } }); });
    return l;
  }
  function gebietName(kat, v) {
    var gb = (kat.gebiete || []).filter(function (x) { return x.id === v.gebiet; })[0] || (WC.STARTKATALOGE || {})[v.gebiet];
    return gb ? gb.name : "";
  }
  function vorlagenText(kat, v) { return [v.name, v.titelVorgabe, v.beschreibungVorgabe, String(v.id).replace(/_/g, " "), gebietName(kat, v)].filter(Boolean).join(" "); }

  /* ── Lernen ── gelernt = [{ w: [Wörter], vorlage, gut: true|false, n, zuletzt }] */
  function lernen(gelernt, frageRest, vorlageId, gut, datum) {
    var l = (gelernt || []).slice(), w = AN().woerter(frageRest).filter(function (x) { return !/^\d/.test(x); });
    if (!w.length || !vorlageId) return l;
    var schl = w.slice().sort().join(" ");
    var e = l.filter(function (x) { return x.vorlage === vorlageId && x.w.slice().sort().join(" ") === schl; })[0];
    if (e) { if (e.gut !== !!gut) { e.gut = !!gut; e.n = 1; } else e.n = Math.min(20, (e.n || 1) + 1); e.zuletzt = datum || ""; e.frage = String(frageRest).slice(0, 160); }
    else l.push({ w: w, vorlage: vorlageId, gut: !!gut, n: 1, zuletzt: datum || "", frage: String(frageRest).slice(0, 160) });
    /* das Gegenteil für dieselben Wörter an einer ANDEREN Vorlage bleibt stehen — es sind verschiedene Aussagen */
    if (l.length > LERN_MAX) { l.sort(function (a, b) { return (a.zuletzt || "") < (b.zuletzt || "") ? 1 : -1; }); l = l.slice(0, LERN_MAX); }
    return l;
  }
  function gelerntFuer(gelernt, vorlageId) { return (gelernt || []).filter(function (x) { return x.vorlage === vorlageId && x.gut; }); }
  function deckung(frage, ziel) { if (!frage.length) return 0; var n = 0; frage.forEach(function (x) { if (ziel.indexOf(x) >= 0) n++; }); return n / frage.length; }

  /* ── Kandidaten: jede Vorlage bekommt Punkte; Gründe stehen dabei ── */
  function kandidaten(q, kat, opt) {
    opt = opt || {};
    var su = SU(), gelernt = opt.gelernt || [];
    var qw = (q.woerter || []).filter(function (x) { return !/^\d/.test(x); });
    var toks = su ? su.anfrage(qw.join(" ")) : [];
    var anProd = {}; ((q.an && q.an.produkte) || []).forEach(function (p) { anProd[p.vorlage] = p; });
    var out = [];
    alleVorlagen(kat).forEach(function (x) {
      var v = x.v, text = vorlagenText(kat, v), vw = AN().woerter(text), punkte = 0, worte = [];
      var b = su ? su.bereite(text) : null, kv = vw.filter(function (w) { return w.length >= 5; });
      qw.forEach(function (w, i) {
        if (vw.indexOf(w) >= 0) { punkte += 1; worte.push(w); return; }
        /* angeglichen wie in Workflow PDF: „Sublimationsdruck“ ⊃ „sublimation“, „KD-4711“ = „kd4711“ */
        var t = toks[i];
        if (t && b && su.trifft(t, b) && w.length >= 4) { punkte += 0.6; worte.push(w); return; }
        /* „bedruckt“ zu „bedrucken“ (Stamm „bedruck“): nur die Endung anders → zählt ganz */
        if (kv.some(function (k) { return w.indexOf(k) === 0 && w.length - k.length <= 2; })) { punkte += 1; worte.push(w); return; }
        if (kv.some(function (k) { return w.indexOf(k) >= 0; })) { punkte += 0.6; worte.push(w); }
      });
      var gruende = [];
      if (anProd[v.id]) punkte += 0.5;
      var lern = 0, lernN = 0, gegen = 0;
      gelernt.forEach(function (e) {
        if (e.vorlage !== v.id) return;
        var d = deckung(e.w, qw); if (d < 0.5) return;
        var gew = d * Math.min(3, 1 + Math.log(1 + (e.n || 1)));
        if (e.gut) { lern = Math.max(lern, gew); lernN++; } else gegen = Math.max(gegen, gew);
      });
      if (!punkte && !lern) return;
      punkte += lern - gegen * 1.5;
      if (worte.length) gruende.push(worte.join(", "));
      if (lernN) gruende.push("gelernt aus " + lernN + " Frage" + (lernN === 1 ? "" : "n"));
      if (gegen) gruende.push("einmal als „passt nicht“ markiert");
      var mg = mengeFuer(q, v, anProd[v.id]);
      /* Zukauf unter der kleinsten Staffel rechnet nicht — halbe Punkte */
      if (v.einkaufsprodukt && WC.kalk && !WC.kalk.einkaufFuer(v, mg.menge).treffer) { punkte *= 0.5; gruende.push("kein Einkauf für " + mg.menge + " " + (v.einheitText || "Stk.")); }
      if (punkte <= 0) return;
      out.push({ vorlage: v.id, name: v.titelVorgabe || v.name, intern: v.name, gebiet: v.gebiet, imKatalog: x.imKatalog, einkauf: !!v.einkaufsprodukt,
        punkte: Math.round(punkte * 100) / 100, gruende: gruende, menge: mg });
    });
    out.sort(function (a, b) { return b.punkte - a.punkte || (a.imKatalog === b.imKatalog ? 0 : a.imKatalog ? -1 : 1) || (a.einkauf === b.einkauf ? 0 : a.einkauf ? 1 : -1); });
    return out;
  }
  /* Menge: zum Produkt erkannt > die einzige Menge der Frage > die erste Menge der Vorlage (dann „angenommen“) */
  function mengeFuer(q, v, p) {
    if (p && p.menge != null) return { menge: p.menge, angenommen: false };
    if ((q.mengen || []).length === 1) return { menge: q.mengen[0], angenommen: false };
    var st = v.einkaufsprodukt && WC.kalk ? WC.kalk.einkaufsMengen(v) : (v.staffelVorgabe || []);
    return { menge: st[0] || 1, angenommen: true };
  }

  /* ── Preis: EIN Angebot mit EINER Position, gerechnet wie jedes Angebot ── */
  function preis(kat, vorlageId, menge, opt) {
    opt = opt || {};
    var A = WC.angebot, K = WC.kalk, v = K.finde(kat.vorlagen, vorlageId);
    if (!v) return { ok: false, offen: ["nicht im Katalog"], fehltGebiet: gebietVon(vorlageId) };
    var a = A.neu([], opt.datum), p = A.neuePosition(a, kat, vorlageId);
    menge = Math.max(1, Math.round(+menge) || 1);
    p.menge = menge; p.staffeln = [menge];
    if (opt.masse && (v.mengenregel !== "stueck" || v.breiteVorgabe)) { p.breiteMm = opt.masse.breiteMm; p.hoeheMm = opt.masse.hoeheMm; }
    if (opt.farben) p.farben = opt.farben;
    var kunde = opt.kunde ? { name: opt.kunde.name || "", klasse: opt.kunde.klasse || "B" } : opt.klasse ? { name: "", klasse: opt.klasse } : null;
    if (kunde) { a.kunde = { name: kunde.name, anschrift: "", klasse: kunde.klasse }; if (opt.kunde && opt.kunde.id) a.kundeId = opt.kunde.id; }
    var r = A.rechne(a, kat, kunde, !!opt.kleinunternehmer), x = r.positionen[0];
    var offen = (x.erg.offen || []).slice();
    if (!r.versand.ok) offen.push("Versand: " + (r.versand.grund || "nicht gerechnet"));
    return { ok: !offen.length, offen: offen, menge: menge, netto: r.summen.netto, brutto: r.summen.brutto, ust: r.summen.ust,
      stueck: Math.round(r.summen.netto / menge), stueckBrutto: Math.round(r.summen.brutto / menge), platzhalter: !!x.erg.platzhalter,
      einheit: v.einheitText || "Stk.", r: r, angebot: a, position: p, klasse: x.erg.klasse || "" };
  }

  /* ── Rückrichtung (Klaus' „bidirektional“): vom Produkt zu den Fragen und Angeboten, die es schon gab ── */
  function rueckrichtung(vorlageId, gelernt, beispiele, angebote) {
    var fragen = gelerntFuer(gelernt, vorlageId).map(function (e) { return e.frage; })
      .concat((beispiele || []).filter(function (b) { return b.vorlage === vorlageId; }).map(function (b) { return b.frage; }))
      .filter(function (f, i, l) { return f && l.indexOf(f) === i; });
    var ang = (angebote || []).filter(function (a) { return !a.ersetztDurch && (a.positionen || []).some(function (p) { return p.vorlage === vorlageId; }); });
    return { fragen: fragen, angebote: ang };
  }

  /* ── Frühere Angebote zur Frage: dieselbe Rangfolge wie „Alte Angebote“ (anfrage.js) ── */
  function angebote(q, angebote, kat) {
    if (!(q.woerter || []).length) return [];
    return AN().aehnlich({ woerter: q.woerter, kunde: null, produkte: (q.an && q.an.produkte) || [], mengen: (q.an && q.an.mengen) || [] }, angebote, [], kat)
      .filter(function (x) { return x.wert >= 20; });
  }

  WC.suche = { FUELL_VORGABE: FUELL_VORGABE, LERN_MAX: LERN_MAX, fuellweg: fuellweg, lesen: lesen, kandidaten: kandidaten, preis: preis, lernen: lernen,
    gelerntFuer: gelerntFuer, rueckrichtung: rueckrichtung, angebote: angebote, gebietVon: gebietVon, vorlagenText: vorlagenText, alleVorlagen: alleVorlagen };
})(typeof window !== "undefined" ? window : globalThis);
