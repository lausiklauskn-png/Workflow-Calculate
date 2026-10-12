/* ⇅ Daten: Angebote als CSV ausgeben und tabellarisch gesammelte Angebote einlesen (Klaus 2026-10-12: „Import für Kunden, die
   die App erwerben: ihre tabellarisch gesammelten Angebote direkt einfügen … automatisch an den entsprechenden Stellen eingeordnet.
   Datenschutz: Kundenname, Kundennummern usw. sollen nicht vorhanden sein. Nur die reinen Daten für die Angebotserstellung.“)

   · lesenCsv()    CSV lesen: Trenner ; , Tab selbst erkannt, Anführungszeichen, Zeilenumbrüche in Feldern, BOM
   · spalten()     jede Spalte einordnen (Produkt, Menge, Einzelpreis, Gesamtpreis, Datum, Maße, Farben, Angebotsnummer).
                   Spalten mit PERSONENDATEN (Name, Kunde, Kundennummer, Anschrift, E-Mail, Telefon, IBAN …) werden NICHT
                   übernommen — erkannt am Kopf UND am Inhalt (eine harmlos benannte Spalte voller E-Mails fällt auch weg) —
                   und die Liste sagt, welche und warum.
   · zeilen()      jede Zeile einer Vorlage zuordnen — offline über WC.suche (dieselbe Wortsuche wie die Startseite).
   · angeboteAus() aus der (geprüften) Vorschau Angebote bauen: immer Entwurf, `import` vermerkt, der alte Preis als eigener
                   Preis der Position (pos.eigen), ohne Kunde.
   · csvAus()      Angebote als CSV — „intern“ mit Kunde, „ohne Kundendaten“ ohne Kunde, Titel, Notiz, Anfrage, Positions-Text.
   XLSX: nicht gebaut — es gäbe keine Bibliothek, die byte-1:1 und offline hierher passt. Die App sagt „als CSV speichern“.
   Klassisches Skript: window.WC.tabelle bzw. globalThis.WC.tabelle. */
(function (g) {
  "use strict";
  var WC = g.WC = g.WC || {};

  function lesenCsv(text) {
    text = String(text || "").replace(/^﻿/, "");
    var erste = text.split(/\r?\n/)[0] || "";
    var trenner = [";", "\t", ","].map(function (t) { return { t: t, n: erste.split(t).length }; }).sort(function (a, b) { return b.n - a.n; })[0].t;
    var zeilen = [], z = [], f = "", inQ = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (inQ) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else inQ = false; } else f += c; continue; }
      if (c === '"' && f === "") { inQ = true; continue; }
      if (c === trenner) { z.push(f); f = ""; continue; }
      if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; z.push(f); f = ""; if (z.some(function (x) { return x.trim(); })) zeilen.push(z); z = []; continue; }
      f += c;
    }
    z.push(f); if (z.some(function (x) { return x.trim(); })) zeilen.push(z);
    return { trenner: trenner, kopf: (zeilen[0] || []).map(function (x) { return x.trim(); }), daten: zeilen.slice(1) };
  }

  /* Spalten erkennen — Personendaten ZUERST: was so heißt oder so aussieht, kommt nicht herein */
  var PERSON = [["E-Mail", /e-?mail|mail\b|@/i], ["Telefon", /telefon|tel\b|tel\.|mobil|handy|fax/i], ["Kundennummer", /kunden-?n|kd\.?-?n|kundennr|debitor/i],
    ["Anschrift", /adress|anschrift|stra(ss|ß)e|str\.|plz|postleit|\bort\b|stadt|wohnort/i], ["Name", /name|kunde|firma|ansprech|empf(ä|ae)nger|person|inhaber|vorname|nachname/i],
    ["Bankdaten", /iban|bic|konto|bank/i], ["Geburtsdatum", /geburt/i], ["Steuernummer", /ust-?id|steuer-?n/i]];
  var ART = [["nummer", /^(angebots?-?(nr|nummer)|angebot$|nr\.?$|nummer$|beleg|vorgang)/i], ["einzel", /einzel|st(ü|ue)ckpreis|stk\.?-?preis|je st|e-?preis|preis je|preis pro/i],
    ["menge", /menge|anzahl|st(ü|ue)ck(?!preis)|stk(?!\.?preis)|qty|auflage/i], ["gesamt", /gesamt|summe|betrag|netto|brutto|preis|wert/i],
    ["datum", /datum|date|tag\b|erstellt/i], ["masse", /ma(ß|ss)e?\b|format|gr(ö|oe)(ß|ss)e|breite|h(ö|oe)he/i], ["farben", /farb/i],
    ["produkt", /produkt|artikel|bezeichnung|leistung|position|beschreibung|text|ware|titel|gegenstand/i]];
  var INHALT = [["E-Mail", /[\w.+-]+@[\w-]+\.[\w.]+/], ["Telefon", /^\+?[\d][\d ()/-]{6,}\d$/], ["Bankdaten", /\b[A-Z]{2}\d{2}(?:\s?\w{4}){3,}/], ["Anschrift", /\b\d{5}\s+[A-ZÄÖÜ]|(stra(ss|ß)e|weg|platz|allee)\s+\d/i]];
  function spalten(t) {
    var kopf = t.kopf, out = [];
    kopf.forEach(function (k, i) {
      var werte = t.daten.map(function (z) { return String(z[i] || "").trim(); }).filter(Boolean);
      var person = PERSON.filter(function (p) { return p[1].test(k); })[0];
      /* „Produktname“ / „Artikelbezeichnung“ sind keine Personen */
      if (person && person[0] === "Name" && /produkt|artikel|leistung|datei/i.test(k)) person = null;
      var inhalt = null;
      if (!person) INHALT.forEach(function (p) { if (!inhalt && werte.length && werte.filter(function (w) { return p[1].test(w); }).length >= Math.max(1, werte.length * 0.3)) inhalt = p; });
      if (person || inhalt) { out.push({ i: i, kopf: k, art: "person", grund: person ? person[0] + " (Spaltenkopf)" : inhalt[0] + " (Inhalt)" }); return; }
      var art = ART.filter(function (a) { return a[1].test(k); })[0];
      if (art && art[0] === "produkt" && /nummer|nr\b/i.test(k)) art = null;
      out.push({ i: i, kopf: k, art: art ? art[0] : "unbekannt" });
    });
    /* jede Art nur einmal — die erste gewinnt, weitere werden „unbekannt“ (nicht still zusammengelegt) */
    var schon = {};
    out.forEach(function (s) { if (s.art === "person" || s.art === "unbekannt") return; if (schon[s.art]) s.art = "unbekannt"; else schon[s.art] = 1; });
    return out;
  }

  function zahl(s) {
    s = String(s || "").replace(/[€\s]|eur(o)?/gi, ""); if (!s) return null;
    if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, "").replace(",", "."); else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
    var n = Number(s); return Number.isFinite(n) ? n : null;
  }
  function datum(s) {
    s = String(s || "").trim(); var m = /^(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})$/.exec(s);
    if (m) return (m[3].length === 2 ? "20" + m[3] : m[3]) + "-" + ("0" + m[2]).slice(-2) + "-" + ("0" + m[1]).slice(-2);
    m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s); return m ? m[1] + "-" + m[2] + "-" + m[3] : "";
  }

  /* Zeilen zuordnen. → [{ nr (Zeile in der Datei, ab 2), produkt, menge, einzelCent, gesamtCent, datum, nummer, text, vorlage, name, punkte, imKatalog }] */
  function zeilen(t, sp, kat, opt) {
    var w = {}; sp.forEach(function (s) { if (s.art !== "person" && s.art !== "unbekannt") w[s.art] = s.i; });
    return t.daten.map(function (z, k) {
      var get = function (a) { return w[a] != null ? String(z[w[a]] || "").trim() : ""; };
      var produkt = get("produkt"), menge = zahl(get("menge")), ein = zahl(get("einzel")), ges = zahl(get("gesamt"));
      menge = menge > 0 ? Math.round(menge) : null;
      var text = [menge ? menge + " Stk." : "", produkt, get("masse"), get("farben") ? get("farben") + "-farbig" : ""].filter(Boolean).join(" ");
      var q = WC.suche.lesen(text, kat, [], []), kand = produkt ? WC.suche.kandidaten(q, kat, opt || {}) : [], top = kand[0] || null;
      var einzelCent = ein != null ? Math.round(ein * 100) : (ges != null && menge ? Math.round(ges * 100 / menge) : null);
      var gesamtCent = ges != null ? Math.round(ges * 100) : (ein != null && menge ? Math.round(ein * 100 * menge) : null);
      return { nr: k + 2, produkt: produkt, menge: menge, einzelCent: einzelCent, gesamtCent: gesamtCent, datum: datum(get("datum")), nummer: get("nummer"), text: text,
        masse: q.masse, farben: q.farben, vorlage: top ? top.vorlage : "", name: top ? top.name : "", punkte: top ? top.punkte : 0, imKatalog: top ? top.imKatalog : false,
        herkunft: top ? "offline" : "" };
    });
  }

  /* Vorschau → Angebote. Zeilen mit derselben Angebotsnummer werden EIN Angebot, sonst jede Zeile eines. */
  function angeboteAus(vorschau, kat, angebote, datei, heute) {
    var A = WC.angebot, gruppen = [], nachNr = {}, ueber = [], neu = [];
    vorschau.forEach(function (z) {
      if (!z.uebernehmen) return;
      if (!z.vorlage || !WC.kalk.finde(kat.vorlagen, z.vorlage) || !(z.menge > 0)) { ueber.push({ nr: z.nr, grund: !z.vorlage ? "keine Vorlage" : !(z.menge > 0) ? "keine Menge" : "Vorlage nicht im Katalog" }); return; }
      if (z.nummer) { if (!nachNr[z.nummer]) { nachNr[z.nummer] = []; gruppen.push(nachNr[z.nummer]); } nachNr[z.nummer].push(z); }
      else gruppen.push([z]);
    });
    var alle = (angebote || []).slice();
    gruppen.forEach(function (gr) {
      var d = gr[0].datum || heute, a = A.neu(alle, d);
      a.titel = "Import " + (gr[0].nummer ? gr[0].nummer : "Zeile " + gr[0].nr);
      a.import = { datei: String(datei || "").slice(0, 120), zeilen: gr.map(function (z) { return z.nr; }), nummer: gr[0].nummer || "" };
      a.notiz = "Aus „" + a.import.datei + "“ eingelesen (Zeile " + a.import.zeilen.join(", ") + "). Ohne Kundendaten. Der alte Preis steht als eigener Preis an der Position.";
      gr.forEach(function (z) {
        var p = A.neuePosition(a, kat, z.vorlage);
        p.menge = z.menge; p.staffeln = [z.menge];
        if (z.produkt) p.beschreibung = z.produkt.slice(0, 200);
        if (z.masse) { p.breiteMm = z.masse.breiteMm; p.hoeheMm = z.masse.hoeheMm; }
        if (z.farben) p.farben = z.farben;
        if (z.gesamtCent != null) { p.eigen = {}; p.eigen[z.menge] = z.gesamtCent; }
      });
      alle.push(a); neu.push(a);
    });
    return { angebote: neu, uebersprungen: ueber };
  }

  /* CSV hinaus. mitKunde: false = ohne jede Kundenangabe (für Käufer der App / als Vorlage) */
  function feldCsv(x) { x = x == null ? "" : String(x); return /[;"\n\r]/.test(x) ? '"' + x.replace(/"/g, '""') + '"' : x; }
  function euroCsv(c) { return c == null ? "" : (c / 100).toFixed(2).replace(".", ","); }
  function csvAus(angebote, kat, kunden, mitKunde, kleinunternehmer) {
    var A = WC.angebot, K = WC.kalk;
    var kopf = ["Angebot", "Fassung", "Datum", "Status", "Position", "Produkt", "Menge", "Einheit", "Breite mm", "Höhe mm", "Farben", "Position netto", "je Stück netto", "Angebot netto", "Angebot brutto"];
    if (mitKunde) kopf = kopf.concat(["Titel", "Positions-Text", "Kunde", "Kundennummer", "Anschrift", "E-Mail", "Klasse"]);
    var z = [kopf];
    (angebote || []).forEach(function (a) {
      var k = (kunden || []).filter(function (x) { return x.id === a.kundeId; })[0] || a.kunde || {};
      var r = A.rechne(a, kat, k, kleinunternehmer), katA = r.kat;
      r.positionen.forEach(function (x) {
        var v = K.finde(katA.vorlagen, x.pos.vorlage) || {};
        var row = [a.nummer, A.fassungVon(a), a.datum, a.ersetztDurch ? "ersetzt" : a.status, x.pos.id, v.titelVorgabe || v.name || x.pos.vorlage, x.erg.menge, v.einheitText || "Stk.",
          x.pos.breiteMm || "", x.pos.hoeheMm || "", x.pos.farben || "", x.erg.ok ? euroCsv(x.erg.netto) : "nicht kalkuliert", x.erg.ok ? euroCsv(x.erg.stueckCent) : "",
          euroCsv(r.summen.netto), euroCsv(r.summen.brutto)];
        if (mitKunde) row = row.concat([a.titel, x.pos.titel, k.name || "", k.nr || "", String(k.anschrift || "").replace(/\n/g, ", "), k.email || "", k.klasse || ""]);
        z.push(row);
      });
    });
    return "﻿" + z.map(function (r) { return r.map(feldCsv).join(";"); }).join("\r\n") + "\r\n";
  }

  /* Text für die KI-Zuordnung (nur Produkt, Menge, Maße — Personenspalten sind schon weg); jede Zeile mit ihrer Nummer,
     damit ein Zitat genau EINER Zeile zugeordnet werden kann */
  function kiText(vorschau) {
    return vorschau.filter(function (z) { return z.produkt; }).map(function (z) { return "Zeile " + z.nr + ": " + z.text; }).join("\n");
  }
  function kiZuordnen(vorschau, positionen) {
    var n = 0;
    positionen.forEach(function (p) {
      var m = /Zeile\s+(\d+)/.exec(p.zitat || ""); if (!m) return;
      var z = vorschau.filter(function (x) { return x.nr === +m[1]; })[0]; if (!z || z.menge !== p.menge) return;
      if (z.vorlage !== p.vorlage) { z.vorlage = p.vorlage; z.name = p.name; z.herkunft = "ki"; n++; }
    });
    return n;
  }

  WC.tabelle = { lesenCsv: lesenCsv, spalten: spalten, zeilen: zeilen, angeboteAus: angeboteAus, csvAus: csvAus, kiText: kiText, kiZuordnen: kiZuordnen, zahl: zahl, datum: datum };
})(typeof window !== "undefined" ? window : globalThis);
