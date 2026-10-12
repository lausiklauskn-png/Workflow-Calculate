/* Marktvergleich — was nimmt die Konkurrenz?
   Nur eingetragene Preise (Anbieter, Klasse, Menge, Stückpreis, Versand, Datum, Quelle). Keine Spanne
   ohne Daten. Drei Vergleichsklassen; eine Klasse gilt erst ab ihrer Mengengrenze (Handwerk nicht mit
   Fernost-Massenware vergleichen). Intern — nie auf dem Kundenblatt.
   Klassisches Skript: window.WC.markt bzw. globalThis.WC.markt. */
(function (g) {
  "use strict";
  var WC = g.WC = g.WC || {};
  var KLASSEN = [
    { id: "handwerk", name: "Handwerk / Kleinbetrieb vor Ort", grenzeVorgabe: 0 },
    { id: "online", name: "Online-Druckerei (DE/EU)", grenzeVorgabe: 50 },
    { id: "import", name: "Import / Massenware (Zukauf)", grenzeVorgabe: 500 },
  ];
  var VERALTET_TAGE = 183;

  function median(a) { var s = a.slice().sort(function (x, y) { return x - y; }), m = s.length >> 1; return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2); }
  function tageZwischen(a, b) { return Math.round((Date.parse(b) - Date.parse(a)) / 864e5); }

  /* vergleich(eintraege, menge, eigenStueckCent, grenzen, heute, selbstkostenStueckCent) */
  function vergleich(eintraege, menge, eigen, grenzen, heute, sk) {
    grenzen = grenzen || {};
    var klassen = KLASSEN.map(function (k) {
      var grenze = grenzen[k.id] != null && grenzen[k.id] !== "" ? Number(grenzen[k.id]) : k.grenzeVorgabe;
      /* ungeprüfte Funde der KI-Recherche zählen erst nach ✓ */
      var liste = (eintraege || []).filter(function (e) { return !e.ungeprueft && e.klasse === k.id && Number(e.stueckCent) > 0 && Number(e.menge) > 0; });
      var preise = liste.map(function (e) { return Math.round(Number(e.stueckCent) + (Number(e.versandCent) || 0) / Number(e.menge)); });
      var r = { id: k.id, name: k.name, grenze: grenze, aktiv: menge >= grenze, anzahl: preise.length,
        veraltet: liste.filter(function (e) { return e.datum && heute && tageZwischen(e.datum, heute) > VERALTET_TAGE; }).length };
      if (!preise.length) return Object.assign(r, { daten: false });
      r.daten = true; r.min = Math.min.apply(null, preise); r.max = Math.max.apply(null, preise); r.median = median(preise);
      if (eigen > 0) {
        r.lage = eigen < r.min ? "unter" : eigen > r.max ? "ueber" : eigen <= r.min + (r.max - r.min) / 3 ? "unteres" : eigen >= r.max - (r.max - r.min) / 3 ? "oberes" : "mittleres";
        r.bisMedian = r.median - eigen;
      }
      return r;
    });
    var irgend = klassen.some(function (k) { return k.daten && k.aktiv; });
    var ungeprueft = (eintraege || []).filter(function (e) { return e.ungeprueft; }).length;
    return { menge: menge, eigen: eigen, selbstkosten: sk, klassen: klassen, vergleich: irgend, ungeprueft: ungeprueft };
  }
  var LAGE_TEXT = { unter: "unter allen eingetragenen Preisen", ueber: "über allen eingetragenen Preisen", unteres: "im unteren Drittel",
    mittleres: "im mittleren Drittel", oberes: "im oberen Drittel" };

  /* Suche im Browser (nur ein Link, die App holt nichts) */
  function suchLink(produkt, menge) {
    return "https://www.google.com/search?q=" + encodeURIComponent(produkt + " " + menge + " Stück Preis");
  }

  WC.markt = { KLASSEN: KLASSEN, VERALTET_TAGE: VERALTET_TAGE, vergleich: vergleich, LAGE_TEXT: LAGE_TEXT, suchLink: suchLink, median: median };
})(typeof window !== "undefined" ? window : globalThis);
