/*
 * SBKIM — Modul 25 — Pseudonymisierung (E2E-Vertraulichkeit Grad B)
 *
 * Sensible Werte in einem Text werden vor dem Versand durch lesbare Platzhalter
 * ersetzt (`⟦NAME-1⟧`, `⟦IBAN-1⟧`, `⟦MAIL-1⟧`), die Zuordnung (Platzhalter →
 * Klartext) bleibt beim Aufrufer. Die Antwort einer KI wird danach mit
 * `rehydrate` wieder in Klartext verwandelt.
 *
 * GENERATION 2 (2026-09-28): der Kern des Sende-Prüfers
 * (lausiklauskn-png/Sende-Pruefer, Prüfmerkmale 1–10 aus
 * Kimhub/auftraege/sende-pruefer.json) ist hierher umgezogen (Klaus
 * 2026-09-28: „der Kern soll ein eigenes Modul sein in Sage, was dann überall
 * eingefügt werden kann"). Was sich gegenüber Generation 1 (2026-07-16) ändert:
 *   - Platzhalter heißen `⟦TYP-n⟧` statt `[[TYP_n]]` (Klaus' Wahl: eine KI
 *     verwechselt sie seltener mit Programmcode). Alte `[[TYP_n]]` werden von
 *     `rehydrate`, `parseToken` und einer mitgegebenen `map` weiter verstanden.
 *   - Sechs eingebaute Sorten statt drei, alle standardmäßig an: SCHLUESSEL,
 *     MAIL, TELEFON, IBAN (nur mit stimmender Prüfziffer), BETRAG (auch mit
 *     Tausenderpunkt ganz), RECHNUNG. Namen kommen weiter über `values`.
 *     `EMAIL` und `TEL` werden in `options.types` als alte Namen angenommen.
 *   - Gefunden wird nach LAGE, nicht nacheinander: jede Fundstelle trägt
 *     start/end/line/type/value/token. Bei Überlappung gewinnt die frühere,
 *     bei gleichem Anfang die längere. So kann die Oberfläche zeigen, WO etwas
 *     gefunden wurde, und kein Muster zerschneidet ein anderes.
 *   - Namen werden nur an Wortgrenzen und ohne Groß/klein erkannt:
 *     „Müller" trifft nicht „Müllerstraße".
 *   - `find(text, options)` gibt nur die Fundstellen zurück, `findLeak(text,
 *     map)` sagt, ob in einem Text noch ein Klartext aus der Zuordnung steht
 *     (die letzte Sicherung vor dem Hinausgehen).
 *
 * Verfassungstreu:
 *   - BUILD-FREI, keine Krypto-Primitive, KEIN Spore-Feld, protocolVersion
 *     bleibt 0.1. Kein Draht-Vertrag zwischen Modulen — reiner Text-Transform.
 *   - Die Zuordnung verlässt das Gerät NIE (Aufrufer-Pflicht).
 *   - Fail-soft: kein Throw außer InvalidPseudonymArgError bei klarer
 *     Fehlbedienung. Ein Muster, das dieser Browser nicht übersetzen kann
 *     (Lookbehind fehlt in alten Browsern), fällt einzeln aus und steht in
 *     `_meta.ausgefallen` — statt das ganze Modul beim Laden umzuwerfen.
 *
 * DATUM (2026-10-02, Klaus' Grenzen-Liste Punkt 4): Daten sind standardmäßig
 * an, weil ein Geburtsdatum eine Person kenntlich macht. Eine Frist geht dabei
 * nicht verloren — die KI schreibt „bis ⟦DATUM-1⟧", `rehydrate` setzt sie
 * wieder ein. Rechnen kann die KI mit einem verdeckten Datum nicht („zwei
 * Wochen danach"); wer das braucht, lässt DATUM in `options.types` weg.
 *
 * NAMENSVORSCHLÄGE (2026-10-02, Grenzen-Liste Punkt 4c): `suggestNames` nennt
 * Wörter nach Herr/Frau, aus der Begrüßung und aus der Grußformel. Es bleibt
 * ein VORSCHLAG (Klaus: „gut, solange es ein Vorschlag bleibt") — verdeckt wird
 * ein Name erst, wenn der Mensch ihn über `values` mitgibt. Grenze: nur diese
 * drei Stellen, nur großgeschriebene Wörter; „Herrn Meier Bescheid geben"
 * ergibt „Meier", ein Name mitten im Satz wird nicht vorgeschlagen.
 *
 * Ehrliche Grenzen: Pseudonymisierung ≠ Verschlüsselung. Was kein Muster hat
 * (Adressen, „die Filialleiterin in Kiel"), erkennt es nicht. Ein Datum ohne
 * Tag („März 2026") und englische Schreibweisen („March 12") auch nicht.
 * Namen erkennt es nur aus der mitgegebenen Liste. Nur Text — Bilder nicht.
 *
 * Die Muster stehen ein zweites Mal im Auslieferungsprüfer
 * (pruefe-datei.py, assets/pruefer-formate.js). Wer eines ändert, zieht das
 * andere nach. Bewusste Abweichung hier: BETRAG erfasst den Tausenderpunkt,
 * und bei Feldern (password = …, Rechnungsnummer: …) wird nur der WERT
 * verdeckt, der Feldname bleibt.
 *
 * Public surface (registered on window.SbkimPseudonym):
 *   pseudonymize(text, options?)        -> { text, map, tokens, findings }
 *   find(text, options?)                -> Array<{start,end,line,type,value}>
 *   suggestNames(text, options?)        -> Array<{name,start,end,line,grund}>  (nur Vorschlag)
 *   rehydrate(text, map)                -> text
 *   findLeak(text, map)                 -> string | null
 *   pseudonymizeObject(obj, options?)   -> { data, map, tokens }
 *   rehydrateObject(obj, map)           -> obj
 *   getBuiltinPatterns()                -> Array<{ type, description, defaultOn }>
 *   isIban(str)                         -> boolean (Prüfziffer ISO 13616)
 *   makeToken(type, index)              -> "⟦TYPE-INDEX⟧"
 *   parseToken(token)                   -> { type, index } | null
 *   isToken(str)                        -> boolean
 *   serializeVault(map) / parseVault(str)
 *   InvalidPseudonymArgError
 *
 * Spec: docs/components/25_pseudonym.md · docs/E2E-VERTRAULICHKEIT.md §1.1.
 */
(function (global) {
  "use strict";

  // Platzhalter: ⟦TYP-n⟧ (neu) oder [[TYP_n]] (Generation 1, nur noch gelesen).
  var TYPE_SRC = "[A-Z][A-Z0-9_]*";
  var TOKEN_NEW_SRC = "⟦" + TYPE_SRC + "-\\d+⟧";
  var TOKEN_OLD_SRC = "\\[\\[" + TYPE_SRC + "_\\d+\\]\\]";
  var TOKEN_RE_SRC = "(?:" + TOKEN_NEW_SRC + "|" + TOKEN_OLD_SRC + ")";
  function tokenRe() { return new RegExp(TOKEN_RE_SRC, "g"); }

  function makeError(name, message) { var e = new Error(message); e.name = name; return e; }
  function InvalidPseudonymArgError(message) { return makeError("InvalidPseudonymArgError", message); }
  function isString(x) { return typeof x === "string"; }
  function isType(t) { return isString(t) && new RegExp("^" + TYPE_SRC + "$").test(t); }

  // Muster werden erst hier übersetzt, einzeln. Ein Browser ohne Lookbehind
  // verliert genau dieses Muster, nicht das Modul.
  var ausgefallen = [];
  function rx(name, src, flags) {
    try { return new RegExp(src, flags); }
    catch (e) { ausgefallen.push(name); return null; }
  }

  // ── Die Muster (Herkunft: Sende-Prüfer, 2026-09-26) ──────────────────────
  var SCHLUESSEL_MUSTER = [
    /-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----[\s\S]*?(?:-----END (?:[A-Z ]+ )?PRIVATE KEY-----|$)/g,
    /sk-ant-[A-Za-z0-9_\-]{16,}/g,
    /\bsk-(?!ant-)[A-Za-z0-9_\-]{20,}/g,
    /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}/g,
    /\bgithub_pat_[A-Za-z0-9_]{20,}/g,
    /\bAIza[A-Za-z0-9_\-]{30,}/g,
    /\bAKIA[0-9A-Z]{16}\b/g,
    /\bxox[baprs]-[A-Za-z0-9\-]{10,}/g,
    /\bnsec1[02-9ac-hj-np-z]{50,}/g,
  ];
  // Nur der Wert (Gruppe 1) wird verdeckt, der Feldname bleibt stehen.
  var SCHLUESSEL_FELD = /\b(?:api[_\-]?key|apikey|secret|client[_\-]?secret|passwort|password|passwd)\b["']?\s*[:=]\s*["']?([^\s"',}]{12,})/gi;
  var BEARER = /Authorization\s*:\s*Bearer\s+([A-Za-z0-9._\-]{16,})/gi;
  // RFC 5321: 64 vor dem @, 255 danach — ohne die Grenzen ist der Ausdruck auf
  // einer langen Zeile quadratisch (PWA Toolpoint: 23 s für 200 000 Zeichen).
  var MAIL = /[A-Za-z0-9._%+\-]{1,64}@[A-Za-z0-9.\-]{1,255}\.[A-Za-z]{2,}/g;
  // Nur mit Ländervorwahl oder tel: — eine bloße Ziffernfolge ist oft eine Kennung.
  var TELEFON = /(?:tel:|\+\d{2}[\s\-/()]?)\d[\d\s\-/()]{6,}\d/g;
  var IBAN_FORM = /\b[A-Z]{2}\d{2}(?:[ \-]?[A-Z0-9]{2,4}){3,8}\b/g;
  // Tausenderpunkt zuerst: „1.248,50 EUR" ganz, nicht „248,50 EUR" mit „1." davor.
  var ZAHL = "(?:\\d{1,3}(?:\\.\\d{3})+(?:,\\d{2})?|\\d{1,3}(?:,\\d{3})+(?:\\.\\d{2})?|\\d+[.,]\\d{2})";
  var WAEHRUNG = "(?:€|EUR|\\$|USD|CHF)";
  var BETRAG = rx("BETRAG", "(?<![\\d.,])" + ZAHL + "\\s?" + WAEHRUNG + "(?![A-Za-z])|" +
    "(?<![A-Za-z])" + WAEHRUNG + "\\s?" + ZAHL + "(?![\\d.,]*\\d)", "g");
  var BELEG_FELD = /["']?(?:rechnung(?:s?nummer|s?nr)?|kundennummer|kundennr|kunden_?nr|invoice(?:_id|_number)?|beleg(?:nummer)?|receipt(?:_number)?|customer_id)["']?\s*[:=]\s*["']?([A-Za-z0-9][A-Za-z0-9\-\/]{2,})/gi;
  var BELEG_FREI = /\b(?:RE|RG|INV|KD|KDNR|AN)-\d{2,4}-\d{3,}\b/g;
  // Datum (Klaus 2026-10-02, Grenze 2: Geburtsdaten). Tag und Monat müssen
  // gültig sein, sonst wäre jede Versionsnummer und jede IP ein Datum.
  // 12.03.2026 · 1.3.85 · 2026-03-12 · 12/03/2026 · 12. März 2026 · 3. Jan.
  var TAG = "(?:0?[1-9]|[12]\\d|3[01])", MONAT = "(?:0?[1-9]|1[0-2])";
  var MONATSNAME = "(?:Januar|Jänner|Februar|März|Maerz|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember|" +
    "Jan|Feb|Mär|Mrz|Apr|Jun|Jul|Aug|Sept?|Okt|Nov|Dez)";
  var DATUM_ZAHL = rx("DATUM", "(?<![\\d.,/])" + TAG + "\\." + MONAT + "\\.(?:\\d{4}|\\d{2})(?![\\d]|[.,/]\\d)", "g");
  var DATUM_STRICH = rx("DATUM", "(?<![\\d/])" + TAG + "/" + MONAT + "/\\d{4}(?![\\d]|/\\d)", "g");
  var DATUM_ISO = /\b(?:19|20)\d{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])\b/g;
  var DATUM_WORT = rx("DATUM", "(?<![\\d.])" + TAG + "\\.\\s?" + MONATSNAME + "(?:\\.|(?![\\p{L}]))(?:\\s?\\d{4}(?!\\d))?", "gu");

  function isIban(roh) {
    var s = String(roh).replace(/[\s\-]/g, "").toUpperCase();
    if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(s)) return false;
    var um = s.slice(4) + s.slice(0, 4), rest = 0;
    for (var i = 0; i < um.length; i++) {
      var z = um[i];
      var teil = /[A-Z]/.test(z) ? String(z.charCodeAt(0) - 55) : z;
      for (var j = 0; j < teil.length; j++) rest = (rest * 10 + Number(teil[j])) % 97;
    }
    return rest === 1;
  }

  // Jede Sorte: Beschreibung + Liste von [regex, gruppe, prüfung].
  var BUILTIN = {
    SCHLUESSEL: { description: "Zugangsschlüssel, private Schlüssel, password = …, Bearer-Token.",
      rules: SCHLUESSEL_MUSTER.map(function (r) { return [r, 0, null]; })
        .concat([[SCHLUESSEL_FELD, 1, null], [BEARER, 1, null]]) },
    MAIL: { description: "E-Mail-Adresse.", rules: [[MAIL, 0, null]] },
    TELEFON: { description: "Telefonnummer, nur mit Ländervorwahl oder tel:.", rules: [[TELEFON, 0, null]] },
    IBAN: { description: "IBAN, nur mit stimmender Prüfziffer.", rules: [[IBAN_FORM, 0, isIban]] },
    BETRAG: { description: "Geldbetrag mit Währung, auch mit Tausenderpunkt.",
      rules: BETRAG ? [[BETRAG, 0, null]] : [] },
    RECHNUNG: { description: "Rechnungs-/Kundennummer im Feld oder als RE-2026-04871.",
      rules: [[BELEG_FELD, 1, function (w) { return /\d/.test(w); }], [BELEG_FREI, 0, null]] },
    DATUM: { description: "Datum: 12.03.2026, 1.3.85, 2026-03-12, 12/03/2026, 12. März 2026.",
      rules: [DATUM_ZAHL, DATUM_STRICH, DATUM_ISO, DATUM_WORT].filter(Boolean).map(function (r) { return [r, 0, null]; }) },
  };
  var ORDER = ["SCHLUESSEL", "MAIL", "IBAN", "BETRAG", "RECHNUNG", "TELEFON", "DATUM"];
  var ALIAS = { EMAIL: "MAIL", TEL: "TELEFON" };
  var DEFAULT_TYPES = ORDER.slice();

  // ── Namensvorschläge (Klaus 2026-10-02, Grenzen-Liste 4c) ────────────────
  // „gut, solange es ein Vorschlag bleibt": suggestNames VERDECKT NICHTS. Es
  // nennt Wörter nach Herr/Frau, aus der Begrüßung („Hallo Petra,") und aus
  // der Grußformel („Viele Grüße\nPetra Schmidt"). Was davon ein Name ist,
  // entscheidet der Mensch und gibt ihn über `values` an find/pseudonymize.
  // find und pseudonymize rufen diese Funktion nie auf.
  var NW = "\\p{Lu}[\\p{Ll}ß]+(?:-\\p{Lu}[\\p{Ll}ß]+)?";
  var TITEL = "(?:(?:Dr|Prof|Dipl\\.-Ing)\\.\\s+)*";
  // Nach Herr/Frau EIN Wort — ein zweites nur, wenn danach die Zeile oder der
  // Satzteil endet („Frau Petra Schmidt,"). Sonst wäre „Herrn Meier Bescheid
  // geben" ein Name aus zwei Wörtern: im Deutschen sind Hauptwörter groß.
  var VOR_ANREDE = rx("NAMENSVORSCHLAG", "(?<![\\p{L}])(?:Herrn?|Frau|Hr\\.|Fr\\.)\\s+" + TITEL +
    "(" + NW + "(?:[ \\t]+" + NW + "(?=[ \\t]*(?:[,.;:!?)]|$)))?)", "gmu");
  var VOR_GRUSS = rx("NAMENSVORSCHLAG", "^[ \\t]*(?:Hallo|Hi|Hey|Moin|Servus|Liebe[rs]?|Guten[ \\t]+(?:Tag|Morgen|Abend))[ \\t]+" +
    "(" + NW + "(?:[ \\t]+" + NW + ")?)[ \\t]*(?:[,!]|$)", "gmu");
  var VOR_ABSCHIED = rx("NAMENSVORSCHLAG", "^[ \\t]*(?:(?:Mit[ \\t]+)?(?:freundlichen|besten|herzlichen|lieben|vielen|sonnigen)[ \\t]+Gr(?:ü|ue)(?:ß|ss)en|" +
    "(?:Viele|Beste|Liebe|Herzliche|Schöne|Freundliche)[ \\t]+Gr(?:ü|ue)(?:ß|ss)e|Gr(?:ü|ue)(?:ß|ss)e|Gru(?:ß|ss)|LG|VG|MfG)" +
    "[ \\t]*,?[ \\t]*(?:\\r?\\n[ \\t]*)?(" + NW + "(?:[ \\t]+" + NW + "){0,2})[ \\t]*$", "gmu");
  // Wörter, die an diesen Stellen stehen und kein Name sind.
  var KEIN_NAME = ["herr", "herrn", "frau", "damen", "herren", "team", "kollege", "kollegin", "kollegen",
    "kolleginnen", "alle", "allerseits", "zusammen", "leute", "kunde", "kundin", "kunden", "freunde",
    "familie", "ihr", "ihre", "euer", "eure", "dein", "deine", "sie", "du", "euch", "mama", "papa",
    "chef", "chefin", "nachbar", "nachbarin", "nochmal", "und", "aus", "vom", "von"];

  function suggestNames(text, options) {
    if (!isString(text)) throw InvalidPseudonymArgError("text muss ein String sein.");
    options = options || {};
    var bekannt = {};
    normalizeValues(options).forEach(function (v) { bekannt[v.value.toLowerCase()] = true; });
    var out = [], gesehen = {};
    function zeileVon(pos) { var n = 1; for (var i = 0; i < pos; i++) if (text.charCodeAt(i) === 10) n++; return n; }
    function nimm(re, grund) {
      if (!re) return;
      re.lastIndex = 0;
      var m;
      while ((m = re.exec(text)) !== null) {
        if (m[0].length === 0) { re.lastIndex++; continue; }
        var name = m[1], start = m.index + m[0].lastIndexOf(name), key = name.toLowerCase();
        var woerter = key.split(/\s+/);
        if (woerter.some(function (w) { return KEIN_NAME.indexOf(w) !== -1; })) continue;
        if (bekannt[key] || gesehen[key]) continue;
        gesehen[key] = true;
        out.push({ name: name, start: start, end: start + name.length, line: zeileVon(start), grund: grund });
      }
    }
    nimm(VOR_ANREDE, "anrede");
    nimm(VOR_GRUSS, "begruessung");
    nimm(VOR_ABSCHIED, "grussformel");
    out.sort(function (a, b) { return a.start - b.start; });
    return out;
  }

  function makeToken(type, index) {
    if (!isType(type)) throw InvalidPseudonymArgError("Platzhalter-Sorte muss GROSS beginnen: " + String(type));
    if (typeof index !== "number" || index < 1 || Math.floor(index) !== index) {
      throw InvalidPseudonymArgError("Platzhalter-Nummer muss ganze Zahl ≥ 1 sein: " + String(index));
    }
    return "⟦" + type + "-" + index + "⟧";
  }
  function parseToken(token) {
    if (!isString(token)) return null;
    var m = new RegExp("^⟦(" + TYPE_SRC + ")-(\\d+)⟧$").exec(token) ||
      new RegExp("^\\[\\[(" + TYPE_SRC + ")_(\\d+)\\]\\]$").exec(token);
    return m ? { type: m[1], index: parseInt(m[2], 10) } : null;
  }
  function isToken(str) { return isString(str) && new RegExp("^" + TOKEN_RE_SRC + "$").test(str); }
  function escapeRegExp(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

  function normalizeValues(options) {
    var values = options.values || [];
    var defaultType = options.valueType || "NAME";
    if (!Array.isArray(values)) throw InvalidPseudonymArgError("options.values muss ein Array sein.");
    if (!isType(defaultType)) throw InvalidPseudonymArgError("options.valueType muss GROSS beginnen.");
    var out = [];
    values.forEach(function (v) {
      if (v == null) return;
      if (isString(v)) { if (v.trim().length) out.push({ value: v.trim(), type: defaultType }); }
      else if (typeof v === "object" && isString(v.value) && v.value.trim().length) {
        var t = v.type || defaultType;
        if (!isType(t)) throw InvalidPseudonymArgError("values[].type muss GROSS beginnen: " + t);
        out.push({ value: v.value.trim(), type: t });
      }
    });
    return out;
  }

  function normalizeTypes(options) {
    var types = options.types || DEFAULT_TYPES;
    if (!Array.isArray(types)) throw InvalidPseudonymArgError("options.types muss ein Array sein.");
    return types.map(function (t) { return ALIAS[t] || t; });
  }

  /*
   * find(text, options?) -> [{ start, end, line, type, value }]
   * Nach Lage sortiert, ohne Überlappung. Vorhandene Platzhalter sind tabu.
   */
  function find(text, options) {
    if (!isString(text)) throw InvalidPseudonymArgError("find(text): text muss ein String sein.");
    options = options || {};
    var raw = [];
    function take(re, type, group, check) {
      if (!re) return;
      var r = new RegExp(re.source, re.flags.indexOf("g") === -1 ? re.flags + "g" : re.flags);
      var m;
      while ((m = r.exec(text)) !== null) {
        if (m[0].length === 0) { r.lastIndex++; continue; }
        var value = group ? m[group] : m[0];
        if (!value) continue;
        if (check && !check(value)) continue;
        var start = m.index + (group ? m[0].lastIndexOf(value) : 0);
        raw.push({ start: start, end: start + value.length, type: type, value: value });
      }
    }
    var types = normalizeTypes(options);
    ORDER.forEach(function (t) {
      if (types.indexOf(t) === -1) return;
      BUILTIN[t].rules.forEach(function (rule) { take(rule[0], t, rule[1], rule[2]); });
    });
    normalizeValues(options).forEach(function (v) {
      take(rx("NAME", "(?<![\\p{L}\\p{N}])" + escapeRegExp(v.value) + "(?![\\p{L}\\p{N}])", "giu") ||
        new RegExp(escapeRegExp(v.value), "gi"), v.type, 0, null);
    });
    var custom = options.customPatterns || [];
    if (!Array.isArray(custom)) throw InvalidPseudonymArgError("options.customPatterns muss ein Array sein.");
    custom.forEach(function (p) {
      if (!p || !isType(p.type)) throw InvalidPseudonymArgError("customPatterns[].type muss GROSS beginnen.");
      if (!(p.regex instanceof RegExp)) throw InvalidPseudonymArgError("customPatterns[].regex muss ein RegExp sein.");
      take(p.regex, p.type, 0, null);
    });

    // Vorhandene Platzhalter: kein Fund darf sie berühren (sonst verschachtelt).
    var reserved = [], tr = tokenRe(), tm;
    while ((tm = tr.exec(text)) !== null) reserved.push([tm.index, tm.index + tm[0].length]);
    raw = raw.filter(function (h) {
      return !reserved.some(function (r) { return h.start < r[1] && r[0] < h.end; });
    });

    raw.sort(function (a, b) { return a.start - b.start || (b.end - b.start) - (a.end - a.start); });
    var out = [], until = -1;
    raw.forEach(function (h) { if (h.start >= until) { out.push(h); until = h.end; } });
    var line = 1, pos = 0;
    out.forEach(function (h) {
      for (; pos < h.start; pos++) if (text.charCodeAt(pos) === 10) line++;
      h.line = line;
    });
    return out;
  }

  function makeState(initialMap) {
    var map = {}, reverse = {}, counters = {}, created = [];
    if (initialMap && typeof initialMap === "object") {
      Object.keys(initialMap).forEach(function (tok) {
        var orig = initialMap[tok], p = parseToken(tok);
        if (!isString(orig) || !p) return;
        map[tok] = orig;
        reverse[p.type + "\u0000" + orig] = tok;
        if (!counters[p.type] || p.index > counters[p.type]) counters[p.type] = p.index;
      });
    }
    return {
      map: map, created: created,
      tokenFor: function (type, value) {
        var key = type + "\u0000" + value;
        if (Object.prototype.hasOwnProperty.call(reverse, key)) return reverse[key];
        var idx = (counters[type] || 0) + 1;
        counters[type] = idx;
        var tok = makeToken(type, idx);
        map[tok] = value; reverse[key] = tok; created.push(tok);
        return tok;
      },
    };
  }

  /*
   * pseudonymize(text, options?) -> { text, map, tokens, findings }
   *   options.values          : Array<string | {value, type}> — Namen u. ä. (Sorte NAME)
   *   options.valueType       : Sorte für string-values (Vorgabe "NAME")
   *   options.types           : eingebaute Sorten (Vorgabe: alle sechs)
   *   options.customPatterns  : Array<{type, regex}>
   *   options.map             : vorhandene Zuordnung → gleiche Platzhalter über Läufe
   * Derselbe Wert derselben Sorte bekommt überall denselben Platzhalter.
   */
  function pseudonymize(text, options) {
    if (!isString(text)) throw InvalidPseudonymArgError("pseudonymize(text): text muss ein String sein.");
    options = options || {};
    var findings = find(text, options);
    var state = makeState(options.map);
    var out = "", pos = 0;
    findings.forEach(function (f) {
      f.token = state.tokenFor(f.type, f.value);
      out += text.slice(pos, f.start) + f.token;
      pos = f.end;
    });
    return { text: out + text.slice(pos), map: state.map, tokens: state.created.slice(), findings: findings };
  }

  // Unbekannte Platzhalter bleiben stehen (fail-soft).
  function rehydrate(text, map) {
    if (!isString(text)) throw InvalidPseudonymArgError("rehydrate(text): text muss ein String sein.");
    if (!map || typeof map !== "object") return text;
    return text.replace(tokenRe(), function (tok) {
      return Object.prototype.hasOwnProperty.call(map, tok) ? map[tok] : tok;
    });
  }

  // Die letzte Sicherung vor dem Hinausgehen: steht noch ein Klartext drin?
  function findLeak(text, map) {
    if (!isString(text) || !map || typeof map !== "object") return null;
    var keys = Object.keys(map);
    for (var i = 0; i < keys.length; i++) {
      var w = map[keys[i]];
      if (isString(w) && w.length && text.indexOf(w) !== -1) return w;
    }
    return null;
  }

  function walkStrings(value, fn) {
    if (isString(value)) return fn(value);
    if (Array.isArray(value)) return value.map(function (v) { return walkStrings(v, fn); });
    if (value && typeof value === "object") {
      var out = {};
      Object.keys(value).forEach(function (k) { out[k] = walkStrings(value[k], fn); });
      return out;
    }
    return value; // Zahlen/Booleans/null unverändert
  }

  // Alle String-Blätter eines Objekts mit EINER gemeinsamen Zuordnung.
  // Zahlen bleiben Zahlen (Grad-B-Grenze: ein Betrag als Zahl leakt weiter).
  function pseudonymizeObject(obj, options) {
    options = options || {};
    var sharedMap = options.map ? JSON.parse(JSON.stringify(options.map)) : {};
    var allTokens = [];
    var data = walkStrings(obj, function (str) {
      var res = pseudonymize(str, Object.assign({}, options, { map: sharedMap }));
      Object.keys(res.map).forEach(function (t) { sharedMap[t] = res.map[t]; });
      res.tokens.forEach(function (t) { if (allTokens.indexOf(t) === -1) allTokens.push(t); });
      return res.text;
    });
    return { data: data, map: sharedMap, tokens: allTokens };
  }
  function rehydrateObject(obj, map) { return walkStrings(obj, function (s) { return rehydrate(s, map); }); }

  function getBuiltinPatterns() {
    return ORDER.map(function (t) {
      return { type: t, description: BUILTIN[t].description, defaultOn: DEFAULT_TYPES.indexOf(t) !== -1 };
    });
  }

  // Zuordnung als Text für die Ablage auf dem Gerät. Enthält KLARTEXT.
  function serializeVault(map) {
    if (!map || typeof map !== "object") map = {};
    return JSON.stringify({ sbkimAnchorVault: 1, grade: "B", map: map }, null, 2);
  }
  function parseVault(str) {
    if (!isString(str)) throw InvalidPseudonymArgError("parseVault(str): str muss ein String sein.");
    var obj;
    try { obj = JSON.parse(str); } catch (e) { throw InvalidPseudonymArgError("parseVault: kein gültiges JSON."); }
    if (!obj || typeof obj !== "object" || !obj.map || typeof obj.map !== "object") {
      throw InvalidPseudonymArgError("parseVault: erwartet { map: {...} }.");
    }
    return obj.map;
  }

  global.SbkimPseudonym = {
    pseudonymize: pseudonymize,
    find: find,
    suggestNames: suggestNames,
    rehydrate: rehydrate,
    findLeak: findLeak,
    pseudonymizeObject: pseudonymizeObject,
    rehydrateObject: rehydrateObject,
    getBuiltinPatterns: getBuiltinPatterns,
    isIban: isIban,
    makeToken: makeToken,
    parseToken: parseToken,
    isToken: isToken,
    serializeVault: serializeVault,
    parseVault: parseVault,
    InvalidPseudonymArgError: InvalidPseudonymArgError,
    _meta: {
      generation: 2,
      stand: "2026-10-02",
      grade: "B",
      buildFree: true,
      protocolVersion: "0.1",
      builtinTypes: ORDER.slice(),
      defaultTypes: DEFAULT_TYPES.slice(),
      tokenPattern: TOKEN_RE_SRC,
      ausgefallen: ausgefallen,
      spec: "docs/components/25_pseudonym.md",
    },
  };

  if (typeof console !== "undefined" && console.info) {
    console.info("MODUL 25 PSEUDONYM Generation 2 bereit, Sorten: " + DEFAULT_TYPES.join("+") +
      " + NAME aus Liste" + (ausgefallen.length ? " — AUSGEFALLEN: " + ausgefallen.join(",") : ""));
  }
})(typeof window !== "undefined" ? window : globalThis);
