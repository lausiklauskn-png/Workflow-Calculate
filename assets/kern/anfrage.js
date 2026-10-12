/* Anfragen lesen und alte Angebote wiederfinden (Klaus 2026-10-13: „Über den Kundennamen oder Kundennummer sollen alte
   Angebote leicht übernommen werden können … automatisch nach oben gerückt werden, das Angebot, was der Anfrage am nächsten
   kommt … eine Anfrage über E-Mail automatisch erkannt … der Text gelesen, das Volumen, der Kunde, die Kundennummer … ein
   entsprechendes Angebot automatisch generiert“).

   OFFLINE, ohne KI: Wörter, Zahlen und Muster. Was nicht erkannt wird, bleibt leer und wird so genannt — nie geraten.
   Das erzeugte Angebot ist IMMER ein Entwurf; gestellt wird es nur von Hand.
   .eml liest WN.mail (assets/kern/mail.js, byte-1:1 aus Workflow-Needs).
   Klassisches Skript: window.WC.anfrage bzw. globalThis.WC.anfrage. */
(function (g) {
  "use strict";
  var WC = g.WC = g.WC || {};

  /* ── Wörter angleichen: klein, Umlaute gefaltet, ohne Satzzeichen; Füllwörter weg ── */
  var STOPP = ("und oder der die das den dem des ein eine einen einem einer für fur mit von vom zum zur bei auf aus ist sind wir ihr sie ich mich mir uns " +
    "bitte gerne hallo guten tag sehr geehrte geehrter damen herren grüße grusse gruss gruß freundlichen viele liebe lieber hätten hatten haben würden wurden " +
    "möchten mochten brauchen benötigen benotigen angebot anfrage preis preise kosten stück stuck stk anbei danke vielen wie was wann wäre ware noch auch " +
    "nicht nur als aber wenn dann bis über uber unter pro je per mal neue neuen neu unsere unser unseren ihre ihren ihrem").split(" ");
  var STAMM = { kuli: "kugelschreiber", kulis: "kugelschreiber", kugelschreibern: "kugelschreiber", tassen: "tasse", becher: "tasse", shirts: "tshirt", tshirts: "tshirt",
    "t-shirt": "tshirt", "t-shirts": "tshirt", aufkleber: "aufkleber", sticker: "aufkleber", schilder: "schild", polos: "polo", poloshirts: "polo", poloshirt: "polo",
    caps: "cap", kappen: "cap", handtucher: "handtuch", handtuecher: "handtuch", visitenkarte: "visitenkarten", glaser: "glas", glaeser: "glas", sektglaser: "sektglas",
    sektglaeser: "sektglas", untersetzer: "untersetzer", namen: "name", gravur: "gravur", graviert: "gravur", gravieren: "gravur", personalisiert: "name" };
  function falte(s) {
    return String(s || "").toLowerCase().replace(/ä/g, "a").replace(/ö/g, "o").replace(/ü/g, "u").replace(/ß/g, "ss")
      .replace(/ae/g, "a").replace(/oe/g, "o").replace(/ue/g, "u");
  }
  /* leichte Stammform: Mehrzahl und Beugung ab 6 Buchstaben abschneiden („tischkarten“ = „tischkarte“) */
  function stamm(w) { w = STAMM[w] || w; if (w.length >= 6) w = w.replace(/(?:en|er|es|n|s|e)$/, ""); return w; }
  function woerter(s) {
    var l = falte(s).replace(/[^a-z0-9-]+/g, " ").split(/\s+/), out = [];
    /* Bindestrich-Wörter zählen ganz UND in Teilen („vereinslogo-final“ findet „vereinslogo“); „t-shirt“ bleibt über STAMM ein Wort */
    var mitTeilen = [];
    l.forEach(function (w) { w = w.replace(/^-+|-+$/g, ""); if (!w) return; mitTeilen.push(w); if (w.indexOf("-") > 0 && !STAMM[w]) w.split("-").forEach(function (t) { mitTeilen.push(t); }); });
    l = mitTeilen;
    l.forEach(function (w) {
      if (!w) return;
      var st = stamm(w);
      if (st.length < 3 || /^\d+$/.test(st) || STOPP.indexOf(st) >= 0 || STOPP.indexOf(w) >= 0) return;
      if (out.indexOf(st) < 0) out.push(st);
    });
    return out;
  }
  function jaccard(a, b) { if (!a.length || !b.length) return 0; var n = 0; a.forEach(function (x) { if (b.indexOf(x) >= 0) n++; }); return n / (a.length + b.length - n); }
  function deckung(frage, ziel) { if (!frage.length) return 0; var n = 0; frage.forEach(function (x) { if (ziel.indexOf(x) >= 0) n++; }); return n / frage.length; }
  function zahlDe(s) { s = String(s); if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, ""); return Number(s.replace(",", ".")); }

  /* ── Anfrage lesen ── */
  function istEml(roh) { return /^(?:[\w-]+:[^\n]*\r?\n)*(?:From|Subject|Date|To|MIME-Version|Received|Return-Path):/im.test(String(roh || "").slice(0, 2000)) && /^(From|Subject):/im.test(String(roh || "")); }
  function absender(von) {
    var m = /^\s*"?([^"<]*?)"?\s*<([^>]+)>/.exec(von || ""), mail = m ? m[2] : (/[\w.+-]+@[\w-]+(\.[\w-]+)+/.exec(von || "") || [""])[0];
    return { name: m ? m[1].trim() : "", email: mail.trim().toLowerCase() };
  }
  /* Klartext einer Mail in Teile zerlegen: kopiert aus dem Mailprogramm („Von: …“, „Betreff: …“) oder .eml */
  function zerlege(roh) {
    roh = String(roh || "");
    if (istEml(roh) && g.WN && g.WN.mail) {
      var m = g.WN.mail.lesen(roh);
      return { von: m.kopf.von, betreff: m.kopf.betreff, datum: m.kopf.datum, text: m.text || "", eml: true };
    }
    var von = (/^\s*(?:von|from)\s*:\s*(.+)$/im.exec(roh) || [])[1] || "";
    var betreff = (/^\s*(?:betreff|subject)\s*:\s*(.+)$/im.exec(roh) || [])[1] || "";
    var datum = (/^\s*(?:datum|gesendet|date|sent)\s*:\s*(.+)$/im.exec(roh) || [])[1] || "";
    var text = roh.replace(/^\s*(?:von|from|an|to|cc|betreff|subject|datum|gesendet|date|sent)\s*:.*$/gim, "").trim();
    return { von: von.trim(), betreff: betreff.trim(), datum: datum.trim(), text: text, eml: false };
  }
  /* Wörter, hinter denen eine Zahl eine MENGE ist — auch wenn das Produkt (noch) nicht im Katalog steht, damit es benannt werden kann */
  var WARENWORT = ("tasse kugelschreiber kuli stift tshirt shirt polo cap mutze schild aufkleber etikett flyer plakat poster banner visitenkarten karte tischkarte " +
    "einladung glas sektglas becher flasche feuerzeug anhanger schlusselanhanger untersetzer notizbuch block kalender pin button magnet handtuch tasche beutel " +
    "regenschirm usb mousepad puzzle schurze jacke hoodie pullover weste folie beschriftung platte tafel lanyard band armband").split(" ").map(function (w) { return w.length >= 6 ? w.replace(/(?:en|er|es|n|s|e)$/, "") : w; });
  var MENGE_RE = /(\d{1,3}(?:\.\d{3})+|\d+)\s*(?:x\s+|×\s*|stk\.?|stück|stueck|st\.|exemplare|exemplar|teile|pcs|mal\b)?\s*([A-Za-zÄÖÜäöüß][\wÄÖÜäöüß-]*)?/g;
  function lesen(roh, kat, kunden) {
    var z = zerlege(roh), voll = [z.betreff, z.text].join("\n");
    var ab = absender(z.von);
    var nr = (/(?:kunden-?\s*(?:nr|nummer)|kd\.?\s*-?\s*nr|kundennr)\.?\s*[:#]?\s*([A-Z]{0,4}-?\d[\w-]*)/i.exec(voll) || [])[1] || "";
    /* Maße: 50 x 30 mm, 5×5 cm, 1,2 x 0,8 m */
    var masse = null, mm = /(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*(mm|cm|m)\b/i.exec(voll);
    if (mm) { var f = { mm: 1, cm: 10, m: 1000 }[mm[3].toLowerCase()]; masse = { breiteMm: Math.round(zahlDe(mm[1]) * f), hoeheMm: Math.round(zahlDe(mm[2]) * f), text: mm[0] }; }
    var farben = null, fb = /(\d)\s*-?\s*farbig/i.exec(voll) || (/vierfarbig|4c\b|vollfarbig|bunt/i.test(voll) ? [0, "4"] : /einfarbig/i.test(voll) ? [0, "1"] : null);
    if (fb) farben = +fb[1];
    /* Mengen: Zahl, oft mit Stück-Wort oder Produktwort dahinter. Datums- und Maßzahlen werden ausgelassen. */
    var ohne = voll.replace(/\d+(?:[.,]\d+)?\s*[x×]\s*\d+(?:[.,]\d+)?\s*(?:mm|cm|m)\b/gi, " ").replace(/\b\d{1,2}\.\d{1,2}\.(?:\d{2,4})?/g, " ")
      .replace(/(?:kunden-?\s*(?:nr|nummer)|kd\.?\s*-?\s*nr|kundennr)\.?\s*[:#]?\s*[A-Z]{0,4}-?\d[\w-]*/gi, " ").replace(/\b(?:19|20)\d\d\b/g, " ")
      .replace(/\d+(?:[.,]\d+)?\s*(?:€|eur|euro|%|uhr|mm|cm|km|kg|g\b)/gi, " ").replace(/\+?\d[\d /-]{6,}\d/g, " ").replace(/\b\d{5}\b/g, " ");
    /* Wortschatz des Katalogs: hinter diesen Wörtern ist eine Zahl eine Menge („in 2 Wochen“ ist keine) */
    var vokabel = WARENWORT.slice();
    ((kat && kat.vorlagen) || []).forEach(function (v) { woerter([v.name, v.titelVorgabe, v.id.replace(/_/g, " ")].join(" ")).forEach(function (w) { if (vokabel.indexOf(w) < 0) vokabel.push(w); }); });
    var mengen = [], m;
    MENGE_RE.lastIndex = 0;
    while ((m = MENGE_RE.exec(ohne))) {
      var n = zahlDe(m[1]); if (!(n > 0) || n > 1000000) continue;
      var wort = m[2] ? stamm(falte(m[2])) : "";
      var einheit = /stk|stück|stueck|st\.|exemplar|teile|pcs|x\s|×/i.test(m[0].slice(m[1].length, m[0].length - (m[2] || "").length));
      if (!einheit && !(wort && vokabel.indexOf(wort) >= 0)) continue;
      mengen.push({ menge: n, wort: wort, roh: m[2] || "", stelle: m.index });
    }
    /* Produkte: Vorlagen, deren Wörter in der Anfrage stehen */
    var wAnfrage = woerter(voll), produkte = [];
    ((kat && kat.vorlagen) || []).forEach(function (v) {
      var wv = woerter([v.name, v.titelVorgabe, v.beschreibungVorgabe, v.id.replace(/_/g, " ")].join(" "));
      var tr = wv.filter(function (x) { return wAnfrage.indexOf(x) >= 0; });
      if (!tr.length) return;
      var menge = null;
      mengen.forEach(function (q) { if (menge == null && q.wort && wv.indexOf(q.wort) >= 0) menge = q.menge; });
      produkte.push({ vorlage: v.id, name: v.name, treffer: tr, wert: tr.length / Math.max(3, wv.length) + (menge != null ? 0.5 : 0), menge: menge, einkaufsprodukt: !!v.einkaufsprodukt });
    });
    produkte.sort(function (a, b) { return b.wert - a.wert; });
    /* je erkanntem Produktwort nur die beste Vorlage (sonst stünden „Tasse bedrucken“ und „Tasse mit Namen“ beide da) */
    var genommen = [], beste = [];
    produkte.forEach(function (p) { var neu = p.treffer.filter(function (t) { return genommen.indexOf(t) < 0; }); if (!neu.length) return; genommen = genommen.concat(p.treffer); beste.push(p); });
    var kunde = kundeFinden({ nr: nr, email: ab.email, name: ab.name, text: voll }, kunden || []);
    /* Mengen mit Produktwort, zu dem keine Vorlage passt — benannt, nicht übergangen */
    var ohneProdukt = mengen.filter(function (q) { return q.wort && !beste.some(function (p) { return p.menge === q.menge; }); }).map(function (q) { return { menge: q.menge, wort: q.roh || q.wort }; });
    return { von: z.von, betreff: z.betreff, datum: z.datum, text: z.text, eml: z.eml, absender: ab, kundennr: nr, masse: masse, farben: farben,
      mengen: mengen.map(function (q) { return { menge: q.menge, wort: q.wort, roh: q.roh }; }), produkte: beste, ohneProdukt: ohneProdukt, kunde: kunde, woerter: wAnfrage,
      nichtErkannt: [!ab.name && !ab.email ? "Absender" : "", !nr ? "Kundennummer" : "", !mengen.length ? "Menge" : "", !beste.length ? "Produkt" : ""].filter(Boolean) };
  }

  /* Kunde finden: Kundennummer > E-Mail > Name. Gibt { kunde, grund } oder null. */
  function kundeFinden(x, kunden, teil) {
    var nr = falte(x.nr).replace(/[^a-z0-9]/g, ""), mail = String(x.email || "").toLowerCase();
    var k;
    if (nr) { k = kunden.filter(function (q) { return [q.nr, q.id].some(function (v) { return v && falte(v).replace(/[^a-z0-9]/g, "") === nr; }); })[0]; if (k) return { kunde: k, grund: "Kundennummer " + x.nr }; }
    if (mail) { k = kunden.filter(function (q) { return q.email && String(q.email).toLowerCase() === mail; })[0]; if (k) return { kunde: k, grund: "E-Mail " + mail }; }
    if (mail) { var dom = mail.split("@")[1]; if (dom && !/^(gmail|googlemail|gmx|web|t-online|yahoo|outlook|hotmail|icloud|freenet|aol|posteo|mailbox)\./.test(dom)) {
      k = kunden.filter(function (q) { return q.email && String(q.email).toLowerCase().split("@")[1] === dom; })[0]; if (k) return { kunde: k, grund: "gleiche Firmen-Adresse @" + dom }; } }
    var wn = woerter(x.name), wt = woerter(x.text);
    var best = null;
    kunden.forEach(function (q) {
      var wk = woerter(q.name); if (!wk.length) return;
      var d = Math.max(deckung(wk, wn), deckung(wk, wt), teil ? deckung(wt, wk) : 0);
      if (d >= 0.99 && (!best || wk.length > best.n)) best = { kunde: q, n: wk.length, grund: "Name „" + q.name + "“" };
    });
    return best ? { kunde: best.kunde, grund: best.grund } : null;
  }

  /* ── Ähnlichkeit: welches alte Angebot kommt der Anfrage (oder einem Suchtext) am nächsten? ──
     q = lesen(…) oder { woerter, kunde, produkte, mengen } · → [{ angebot, wert 0–100, gruende[] }], beste zuerst */
  function angebotWoerter(a, kat) {
    var t = [a.titel, a.nummer, (a.kunde || {}).name, a.notiz, WC.unterlagen ? WC.unterlagen.suchText(a) : ""];
    a.positionen.forEach(function (p) { var v = kat ? (kat.vorlagen || []).filter(function (x) { return x.id === p.vorlage; })[0] : null; t.push(p.titel, p.beschreibung, v ? v.name : p.vorlage); });
    return woerter(t.join(" "));
  }
  function aehnlich(q, angebote, kunden, kat) {
    var qVorl = (q.produkte || []).map(function (p) { return p.vorlage; }), qMengen = (q.mengen || []).map(function (m) { return m.menge; });
    var kid = q.kunde && q.kunde.kunde ? q.kunde.kunde.id : "";
    var liste = (angebote || []).filter(function (a) { return !a.ersetztDurch; }).map(function (a) {
      var gr = [], wert = 0;
      if (kid && a.kundeId === kid) { wert += 45; gr.push("gleicher Kunde"); }
      var aVorl = a.positionen.map(function (p) { return p.vorlage; });
      var pv = qVorl.filter(function (v) { return aVorl.indexOf(v) >= 0; });
      if (pv.length) { wert += 30 * pv.length / Math.max(qVorl.length, 1); gr.push(pv.map(function (v) { var x = (kat.vorlagen || []).filter(function (y) { return y.id === v; })[0]; return x ? x.name : v; }).join(", ")); }
      var aw = angebotWoerter(a, kat), d = deckung(q.woerter || [], aw);
      if (d > 0) { wert += 20 * d; var gem = (q.woerter || []).filter(function (w) { return aw.indexOf(w) >= 0; }).slice(0, 4); if (!pv.length || gem.length) gr.push("Wörter: " + gem.join(", ")); }
      if (qMengen.length) {
        var nah = 0; a.positionen.forEach(function (p) { qMengen.forEach(function (m) { if (p.menge > 0) nah = Math.max(nah, 1 - Math.min(1, Math.abs(Math.log(m / p.menge)) / Math.log(10))); }); });
        if (nah > 0 && pv.length) { wert += 5 * nah; if (nah > 0.8) gr.push("ähnliche Menge"); }
      }
      return { angebot: a, wert: Math.round(Math.min(100, wert)), gruende: gr };
    }).filter(function (x) { return x.wert > 0; });
    liste.sort(function (x, y) { return y.wert - x.wert || (x.angebot.datum < y.angebot.datum ? 1 : -1); });
    return liste;
  }
  /* Freie Suche (Kundenname, Kundennummer, Produkt, Text) → dieselbe Rangfolge */
  function suche(text, angebote, kunden, kat) {
    var w = woerter(text), roh = String(text || "").trim();
    var k = kundeFinden({ nr: /\d/.test(roh) ? roh : "", name: roh, text: roh, email: /@/.test(roh) ? roh : "" }, kunden || [], true);
    var produkte = ((kat && kat.vorlagen) || []).filter(function (v) { return deckung(w, woerter([v.name, v.titelVorgabe, v.id.replace(/_/g, " ")].join(" "))) > 0; }).map(function (v) { return { vorlage: v.id }; });
    var nrTreffer = (angebote || []).filter(function (a) { return roh && falte(a.nummer).indexOf(falte(roh)) >= 0; });
    var l = aehnlich({ woerter: w, kunde: k, produkte: produkte, mengen: [] }, angebote, kunden, kat);
    nrTreffer.forEach(function (a) { var x = l.filter(function (y) { return y.angebot === a; })[0]; if (x) { x.wert = 100; x.gruende.unshift("Angebotsnummer"); } else l.unshift({ angebot: a, wert: 100, gruende: ["Angebotsnummer"] }); });
    l.sort(function (x, y) { return y.wert - x.wert; });
    return l;
  }

  /* ── Entwurf aus der Anfrage: vom nächstliegenden alten Angebot (wenn es passt) oder aus den erkannten Produkten ──
     → { angebot, weg: [Sätze, was getan wurde], offen: [was fehlt] } — immer Entwurf, nie gestellt */
  var SCHWELLE = 40;
  function entwurf(an, kat, angebote, kunden, basis, datum) {
    var A = WC.angebot, a = A.neu(angebote, datum), weg = [], offen = [];
    var k = an.kunde ? an.kunde.kunde : null;
    if (k) { a.kundeId = k.id; a.kunde = { name: k.name, anschrift: k.anschrift || "", klasse: k.klasse || "B" }; weg.push("Kunde erkannt über " + an.kunde.grund + ": " + k.name); }
    else { a.kunde = { name: an.absender.name || "", anschrift: "", klasse: "B" }; offen.push(an.absender.name ? "Kunde „" + an.absender.name + "“ ist noch nicht angelegt" : "Kunde nicht erkannt"); }
    a.titel = String(an.betreff || "").replace(/^\s*(?:aw|re|wg|fw|fwd)\s*:\s*/i, "").slice(0, 120);
    /* basis: ein Angebot · null = das nächstliegende nehmen, wenn es passt · false = keins, nur aus der Anfrage */
    if (basis == null) { var l = aehnlich(an, angebote, kunden, kat); if (l[0] && l[0].wert >= SCHWELLE) basis = l[0].angebot; }
    if (basis) {
      a.positionen = JSON.parse(JSON.stringify(basis.positionen)); a.zaehler = basis.zaehler || a.positionen.length; a.saetze = JSON.parse(JSON.stringify(basis.saetze || {}));
      if (!a.titel) a.titel = basis.titel || "";
      weg.push("Übernommen aus " + basis.nummer + (basis.titel ? " („" + basis.titel + "“)" : ""));
      /* angefragte Mengen auf die passenden Positionen */
      (an.produkte || []).forEach(function (p) {
        if (p.menge == null) return;
        var pos = a.positionen.filter(function (x) { return x.vorlage === p.vorlage; })[0];
        if (pos) { if (pos.menge !== p.menge) weg.push(pos.id + ": Menge " + pos.menge + " → " + p.menge); pos.menge = p.menge; if (pos.staffeln.indexOf(p.menge) < 0) pos.staffeln = pos.staffeln.concat([p.menge]).sort(function (x, y) { return x - y; }); }
        else { var n = A.neuePosition(a, kat, p.vorlage); n.menge = p.menge; n.staffeln = [p.menge]; weg.push(n.id + ": „" + p.name + "“ dazu, " + p.menge + " Stk."); }
      });
    } else {
      if (!(an.produkte || []).length) offen.push("kein Produkt erkannt — Position von Hand wählen");
      (an.produkte || []).forEach(function (p, i) {
        var n = A.neuePosition(a, kat, p.vorlage);
        var menge = p.menge != null ? p.menge : (an.produkte.length === 1 && an.mengen[0] ? an.mengen[0].menge : null);
        if (menge != null) { n.menge = menge; if (n.staffeln.indexOf(menge) < 0) n.staffeln = n.staffeln.concat([menge]).sort(function (x, y) { return x - y; }); }
        else offen.push(n.id + ": Menge nicht erkannt — steht auf " + n.menge);
        if (p.breiteMm && p.hoeheMm) { n.breiteMm = p.breiteMm; n.hoeheMm = p.hoeheMm; weg.push(n.id + ": Maße " + p.breiteMm + " × " + p.hoeheMm + " mm"); }
        else if (an.masse && i === 0) { n.breiteMm = an.masse.breiteMm; n.hoeheMm = an.masse.hoeheMm; weg.push(n.id + ": Maße " + an.masse.text); }
        if (p.farben || an.farben) n.farben = p.farben || an.farben;
        weg.push(n.id + ": „" + p.name + "“" + (menge != null ? ", " + menge + " Stk." : "") + (p.herkunft === "ki" ? " (KI, Zitat: „" + String(p.zitat || "").slice(0, 80) + "“)" : ""));
      });
    }
    a.anfrage = { von: an.von, betreff: an.betreff, datum: an.datum, kundennr: an.kundennr };
    a.notiz = "Aus Anfrage" + (an.betreff ? " „" + an.betreff + "“" : "") + (an.datum ? " vom " + an.datum : "") + " automatisch erstellt — bitte prüfen.";
    return { angebot: a, weg: weg, offen: offen };
  }

  WC.anfrage = { woerter: woerter, falte: falte, zerlege: zerlege, lesen: lesen, kundeFinden: kundeFinden, aehnlich: aehnlich, suche: suche, entwurf: entwurf, SCHWELLE: SCHWELLE, jaccard: jaccard };
})(typeof window !== "undefined" ? window : globalThis);
