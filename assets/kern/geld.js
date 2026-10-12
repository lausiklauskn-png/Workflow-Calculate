/* Geld — nur ganze Cent (Muster: BookLedgerPro src/domain/money.js, gelesen
   und übernommen, nicht importiert). Gerundet wird beim Anzeigen, nie beim
   Rechnen; aus Stunden × Satz wird EINMAL je Posten auf ganze Cent gerundet.
   Klassisches Skript: im Browser window.WC.geld, in Node globalThis.WC.geld. */
(function (g) {
  "use strict";
  var WC = g.WC = g.WC || {};

  /* „1.234,56" · „1234.56" · „12" → Cent; Unlesbares → NaN */
  function parseEuroToCents(input) {
    if (typeof input === "number") return Math.round(input * 100);
    var s = String(input == null ? "" : input).trim().replace(/[€\s]/g, "");
    if (!s) return NaN;
    if (s.indexOf(",") >= 0) s = s.replace(/\./g, "").replace(",", ".");
    var v = Number(s);
    return Number.isFinite(v) ? Math.round(v * 100) : NaN;
  }

  function formatCents(cents, lang) {
    var n = (Number(cents) || 0) / 100;
    return n.toLocaleString(lang === "en" ? "en-GB" : "de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function formatEuro(cents, lang) { return formatCents(cents, lang) + " €"; }
  /* Ganze Euro für Spannen in der Schätzung („6.400 €") */
  function formatEuroGanz(cents, lang) {
    var n = Math.round((Number(cents) || 0) / 100);
    return n.toLocaleString(lang === "en" ? "en-GB" : "de-DE") + " €";
  }
  function formatStunden(h, lang) {
    var n = Math.round((Number(h) || 0) * 10) / 10;
    return n.toLocaleString(lang === "en" ? "en-GB" : "de-DE", { maximumFractionDigits: 1 });
  }
  function isValidCents(c) { return Number.isInteger(c) && c >= 0; }

  /* Verteilt `gesamt` Cent im Verhältnis `gewichte` — die Teile ergeben
     zusammen GENAU `gesamt` (größter Rest bekommt den Restcent). */
  function verteile(gesamt, gewichte) {
    var summe = gewichte.reduce(function (a, b) { return a + b; }, 0);
    if (!summe) return gewichte.map(function () { return 0; });
    var roh = gewichte.map(function (w) { return gesamt * w / summe; });
    var teile = roh.map(Math.floor);
    var rest = gesamt - teile.reduce(function (a, b) { return a + b; }, 0);
    roh.map(function (r, i) { return { i: i, r: r - Math.floor(r) }; })
      .sort(function (a, b) { return b.r - a.r || a.i - b.i; })
      .slice(0, rest).forEach(function (x) { teile[x.i] += 1; });
    return teile;
  }

  WC.geld = { parseEuroToCents: parseEuroToCents, formatCents: formatCents, formatEuro: formatEuro,
    formatEuroGanz: formatEuroGanz, formatStunden: formatStunden, isValidCents: isValidCents, verteile: verteile };
})(typeof window !== "undefined" ? window : globalThis);
