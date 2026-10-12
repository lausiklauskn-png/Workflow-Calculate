/* Beispielbilder für den Startkatalog — ZEICHNUNGEN, keine Fotos. Jede trägt unten „Beispielzeichnung“.
   Eigene Fotos lädt man je Beispiel im Katalog hoch; sie liegen dann in IndexedDB, nicht hier.
   Kennung „svg:<name>“ in vorlage.beispiele[].ansichten. Klassisches Skript: WC.BILDER. */
(function (g) {
  "use strict";
  var WC = g.WC = g.WC || {};
  var FARBEN = ["#1f6fb2", "#e0402f", "#2fb39a", "#f2b632"];
  function rahmen(inhalt) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" role="img"><rect width="400" height="300" fill="#eef3f8"/>' + inhalt +
      '<text x="392" y="292" font-family="Arial,sans-serif" font-size="11" fill="#6b7a8a" text-anchor="end">Beispielzeichnung</text></svg>';
  }
  function logo(x, y, s, n) {
    var t = "";
    for (var i = 0; i < n; i++) t += '<circle cx="' + (x + i * s * 0.55) + '" cy="' + y + '" r="' + s * 0.42 + '" fill="' + FARBEN[i % 4] + '" fill-opacity=".9"/>';
    return t + '<text x="' + (x + (n - 1) * s * 0.275) + '" y="' + (y + s * 0.95) + '" font-family="Arial,sans-serif" font-weight="700" font-size="' + s * 0.42 + '" fill="#1d232a" text-anchor="middle">LOGO</text>';
  }
  function tasse(seite) {
    var k = '<rect x="120" y="70" width="140" height="160" rx="10" fill="#fff" stroke="#9aa7b4" stroke-width="3"/>' +
      '<path d="M260 105 q55 0 55 50 q0 50 -55 50" fill="none" stroke="#9aa7b4" stroke-width="14"/><ellipse cx="190" cy="72" rx="70" ry="10" fill="#dfe6ee" stroke="#9aa7b4" stroke-width="3"/>';
    return rahmen(k + (seite ? '<rect x="140" y="110" width="50" height="80" fill="' + FARBEN[0] + '" opacity=".25"/>' : logo(178, 140, 44, 1)));
  }
  function kuli(n, detail) {
    if (detail) return rahmen('<rect x="40" y="120" width="320" height="60" rx="30" fill="#fff" stroke="#9aa7b4" stroke-width="3"/>' +
      '<rect x="120" y="128" width="160" height="44" fill="none" stroke="#1f6fb2" stroke-dasharray="6 4"/>' + logo(170, 145, 30, n) +
      '<text x="200" y="215" font-family="Arial" font-size="13" text-anchor="middle" fill="#4b5560">Druckfeld 40 × 8 mm · ' + n + (n > 1 ? " Farben" : " Farbe") + '</text>');
    return rahmen('<g transform="rotate(-18 200 150)"><rect x="40" y="135" width="300" height="30" rx="15" fill="#fff" stroke="#9aa7b4" stroke-width="3"/>' +
      '<path d="M340 140 l35 10 l-35 10z" fill="#9aa7b4"/><rect x="60" y="128" width="90" height="10" rx="4" fill="#9aa7b4"/>' + logo(210, 146, 18, n) + '</g>');
  }
  function shirt(n, detail) {
    if (detail) {
      var t = "";
      if (n === 4) t = '<rect x="110" y="70" width="180" height="150" fill="url(#v)"/><defs><linearGradient id="v"><stop offset="0" stop-color="#1f6fb2"/><stop offset=".35" stop-color="#2fb39a"/><stop offset=".7" stop-color="#f2b632"/><stop offset="1" stop-color="#e0402f"/></linearGradient></defs>' +
        '<text x="200" y="250" font-family="Arial" font-size="13" text-anchor="middle" fill="#4b5560">ein Transfer · alle Farben · ein Pressgang</text>';
      else {
        for (var i = 0; i < n; i++) t += '<rect x="' + (110 + i * 22) + '" y="' + (70 + i * 18) + '" width="150" height="120" rx="6" fill="' + FARBEN[i] + '" fill-opacity=".85" stroke="#fff" stroke-width="2"/>';
        t += '<text x="200" y="250" font-family="Arial" font-size="13" text-anchor="middle" fill="#4b5560">' + n + (n > 1 ? " Folien · " + n + " × Plotten, Entgittern, Pressen" : " Folie · 1 × Plotten, Entgittern, Pressen") + '</text>';
      }
      return rahmen(t);
    }
    return rahmen('<path d="M130 60 l-60 35 l25 45 l30 -15 v140 h150 v-140 l30 15 l25 -45 l-60 -35 q-40 25 -70 0z" fill="#fff" stroke="#9aa7b4" stroke-width="3"/>' +
      (n === 4 ? '<rect x="160" y="110" width="80" height="70" rx="6" fill="url(#w)"/><defs><linearGradient id="w"><stop offset="0" stop-color="#1f6fb2"/><stop offset=".5" stop-color="#2fb39a"/><stop offset="1" stop-color="#e0402f"/></linearGradient></defs>' : logo(200 - (n - 1) * 10, 140, 40, n)));
  }
  WC.BILDER = {
    "tasse-vorne": tasse(false),
    "tasse-seite": tasse(true),
    "tasse-abwicklung": rahmen('<rect x="60" y="100" width="280" height="126" fill="#fff" stroke="#9aa7b4" stroke-width="3"/>' + logo(200, 150, 50, 1) +
      '<text x="200" y="250" font-family="Arial" font-size="13" text-anchor="middle" fill="#4b5560">Druckbild 200 × 90 mm, rundum</text>'),
    "kuli-gesamt": kuli(1, false), "kuli-detail": kuli(1, true), "kuli-gesamt-3": kuli(3, false), "kuli-detail-3": kuli(3, true),
    "shirt-1": shirt(1, false), "shirt-3": shirt(3, false), "shirt-4": shirt(4, false),
    "shirt-detail-1": shirt(1, true), "shirt-detail-3": shirt(3, true), "shirt-detail-4": shirt(4, true),
    "folie-bogen": rahmen('<rect x="40" y="40" width="320" height="210" fill="#fff" stroke="#9aa7b4" stroke-width="3"/>' +
      [0, 1].map(function (r) { return [0, 1, 2].map(function (c) { return '<rect x="' + (55 + c * 100) + '" y="' + (55 + r * 95) + '" width="90" height="80" rx="10" fill="' + FARBEN[(r * 3 + c) % 4] + '" fill-opacity=".8" stroke="#1d232a" stroke-dasharray="4 3"/>'; }).join(""); }).join("")),
    "folie-detail": rahmen('<rect x="60" y="150" width="280" height="40" fill="#9aa7b4"/><rect x="60" y="120" width="280" height="30" fill="#1f6fb2" fill-opacity=".8"/>' +
      '<rect x="60" y="100" width="280" height="20" fill="#cfe6ff" fill-opacity=".9" stroke="#fff"/>' +
      '<text x="350" y="114" font-family="Arial" font-size="12" text-anchor="end" fill="#1d232a">Laminat</text><text x="350" y="140" font-family="Arial" font-size="12" text-anchor="end" fill="#fff">Druck</text>' +
      '<text x="350" y="175" font-family="Arial" font-size="12" text-anchor="end" fill="#fff">Folie + Kleber</text>'),
    "schild-vorne": rahmen('<rect x="70" y="70" width="260" height="160" rx="6" fill="#fff" stroke="#9aa7b4" stroke-width="4"/>' + logo(150, 140, 50, 2) +
      '<text x="250" y="160" font-family="Arial" font-weight="700" font-size="22" fill="#1d232a" text-anchor="middle">Firma</text>' +
      [[85, 85], [315, 85], [85, 215], [315, 215]].map(function (p) { return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="5" fill="#9aa7b4"/>'; }).join("")),
    "schild-seite": rahmen('<rect x="60" y="140" width="280" height="14" fill="#c7d0da" stroke="#6b7a8a"/><rect x="60" y="140" width="280" height="3" fill="#1f6fb2"/>' +
      '<text x="200" y="185" font-family="Arial" font-size="13" text-anchor="middle" fill="#4b5560">Alu-Verbund 3 mm, Direktdruck oben</text>'),
    "fahrzeug-seite": rahmen('<path d="M30 200 v-90 q0 -20 20 -20 h200 l50 40 h60 q10 0 10 10 v60z" fill="#fff" stroke="#9aa7b4" stroke-width="3"/>' +
      '<rect x="60" y="115" width="170" height="70" fill="' + FARBEN[0] + '" fill-opacity=".7"/>' + logo(120, 140, 36, 2) +
      '<circle cx="90" cy="205" r="22" fill="#4b5560"/><circle cx="300" cy="205" r="22" fill="#4b5560"/>'),
    "fahrzeug-heck": rahmen('<rect x="110" y="60" width="180" height="170" rx="14" fill="#fff" stroke="#9aa7b4" stroke-width="3"/><line x1="200" y1="60" x2="200" y2="230" stroke="#9aa7b4" stroke-width="2"/>' +
      '<rect x="125" y="150" width="150" height="50" fill="' + FARBEN[0] + '" fill-opacity=".7"/>' + logo(200, 165, 26, 1)),
    "schriftzug-fenster": rahmen('<rect x="40" y="40" width="320" height="210" fill="#dbe8f5" stroke="#6b7a8a" stroke-width="6"/>' +
      '<text x="200" y="160" font-family="Georgia,serif" font-size="46" font-style="italic" fill="#1d232a" text-anchor="middle">Bäckerei</text>'),
    "schriftzug-detail": rahmen('<rect x="40" y="90" width="320" height="120" fill="#fff" stroke="#9aa7b4" stroke-width="2" stroke-dasharray="6 4"/>' +
      '<text x="200" y="168" font-family="Georgia,serif" font-size="46" font-style="italic" fill="none" stroke="#1d232a" stroke-width="1.5" text-anchor="middle">Bäckerei</text>' +
      '<text x="200" y="235" font-family="Arial" font-size="13" text-anchor="middle" fill="#4b5560">entgittert, mit Übertragungsfolie</text>'),
  };
  /* data-URL für <img> */
  WC.bildUrl = function (key) {
    var s = WC.BILDER[String(key).replace(/^svg:/, "")];
    return s ? "data:image/svg+xml;charset=utf-8," + encodeURIComponent(s) : "";
  };
})(typeof window !== "undefined" ? window : globalThis);
