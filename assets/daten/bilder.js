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
  /* Stufe 3: Stickerei und Montage & Dienstleistung */
  function stich(x, y, w, h, n) {
    var t = "";
    for (var i = 0; i < n; i++) t += '<rect x="' + (x + i * 6) + '" y="' + (y + i * 6) + '" width="' + w + '" height="' + h + '" rx="6" fill="none" stroke="' + FARBEN[i % 4] + '" stroke-width="5" stroke-dasharray="2 2"/>';
    return t;
  }
  function polo(detail, n) {
    if (detail) return rahmen('<rect x="90" y="70" width="220" height="150" fill="#fff" stroke="#9aa7b4" stroke-width="2"/>' + stich(140, 100, 100, 70, n) +
      '<text x="200" y="250" font-family="Arial" font-size="13" text-anchor="middle" fill="#4b5560">Stickmotiv · ' + n + (n > 1 ? " Garnfarben" : " Garnfarbe") + ' · Vlies auf der Rückseite</text>');
    return rahmen('<path d="M130 60 l-60 35 l25 45 l30 -15 v140 h150 v-140 l30 15 l25 -45 l-60 -35 l-25 25 h-20z" fill="#fff" stroke="#9aa7b4" stroke-width="3"/>' +
      '<path d="M175 60 l25 30 l25 -30" fill="none" stroke="#9aa7b4" stroke-width="3"/>' + stich(225, 130, 40, 26, n));
  }
  function cap(seite) {
    if (seite) return rahmen('<path d="M90 190 q20 -110 120 -110 q90 0 100 110z" fill="#fff" stroke="#9aa7b4" stroke-width="3"/><path d="M300 190 q50 5 70 20 l-90 0z" fill="#dfe6ee" stroke="#9aa7b4" stroke-width="3"/>' +
      '<text x="200" y="240" font-family="Arial" font-size="13" text-anchor="middle" fill="#4b5560">Seite: Stick nur vorn, Rückseite offen</text>');
    return rahmen('<path d="M100 190 q0 -110 100 -110 q100 0 100 110z" fill="#fff" stroke="#9aa7b4" stroke-width="3"/><path d="M90 190 h220 q-20 35 -110 35 q-90 0 -110 -35z" fill="#dfe6ee" stroke="#9aa7b4" stroke-width="3"/>' + stich(160, 120, 80, 45, 2));
  }
  function handtuch(detail) {
    if (detail) return rahmen('<rect x="60" y="110" width="280" height="90" fill="#fff" stroke="#9aa7b4" stroke-width="2"/>' +
      '<text x="200" y="170" font-family="Georgia,serif" font-size="40" font-style="italic" fill="none" stroke="#1f6fb2" stroke-width="2" stroke-dasharray="2 2" text-anchor="middle">Anna</text>' +
      '<text x="200" y="235" font-family="Arial" font-size="13" text-anchor="middle" fill="#4b5560">Name in Schreibschrift, einfarbig</text>');
    return rahmen('<rect x="90" y="50" width="220" height="200" rx="6" fill="#fff" stroke="#9aa7b4" stroke-width="3"/>' +
      '<line x1="90" y1="215" x2="310" y2="215" stroke="#9aa7b4" stroke-width="2"/><line x1="90" y1="225" x2="310" y2="225" stroke="#9aa7b4" stroke-width="2"/>' +
      '<text x="200" y="200" font-family="Georgia,serif" font-size="28" font-style="italic" fill="#1f6fb2" text-anchor="middle">Anna</text>');
  }
  function patch(seite) {
    if (seite) return rahmen('<ellipse cx="200" cy="150" rx="120" ry="80" fill="#dfe6ee" stroke="#9aa7b4" stroke-width="3"/>' +
      '<text x="200" y="155" font-family="Arial" font-size="13" text-anchor="middle" fill="#4b5560">Rückseite: Bügelkleber / Klett</text>');
    return rahmen('<ellipse cx="200" cy="150" rx="120" ry="80" fill="#fff" stroke="' + FARBEN[0] + '" stroke-width="8"/>' + logo(200, 140, 50, 3));
  }
  function uhr(stunden) {
    var t = '<circle cx="150" cy="150" r="80" fill="#fff" stroke="#9aa7b4" stroke-width="4"/><line x1="150" y1="150" x2="150" y2="95" stroke="#1d232a" stroke-width="5"/>' +
      '<line x1="150" y1="150" x2="190" y2="150" stroke="#1d232a" stroke-width="4"/><path d="M150 150 L150 70 A80 80 0 0 1 ' + (150 + 80 * Math.sin(stunden / 12 * 2 * Math.PI)) + " " + (150 - 80 * Math.cos(stunden / 12 * 2 * Math.PI)) + ' z" fill="' + FARBEN[0] + '" fill-opacity=".25"/>';
    return rahmen(t + '<text x="300" y="155" font-family="Arial" font-weight="700" font-size="28" text-anchor="middle" fill="#1d232a">' + stunden + ' Std.</text>');
  }
  function werkzeugkoffer() {
    return rahmen('<rect x="90" y="110" width="220" height="120" rx="10" fill="' + FARBEN[1] + '" fill-opacity=".85"/><rect x="160" y="85" width="80" height="30" rx="8" fill="none" stroke="#1d232a" stroke-width="6"/>' +
      '<rect x="90" y="150" width="220" height="10" fill="#1d232a" fill-opacity=".4"/><text x="200" y="260" font-family="Arial" font-size="13" text-anchor="middle" fill="#4b5560">Montage vor Ort</text>');
  }
  function karte(km) {
    return rahmen('<path d="M60 230 C120 120 200 260 330 80" fill="none" stroke="' + FARBEN[0] + '" stroke-width="6" stroke-dasharray="12 8"/>' +
      '<circle cx="60" cy="230" r="12" fill="' + FARBEN[2] + '"/><circle cx="330" cy="80" r="12" fill="' + FARBEN[1] + '"/>' +
      '<text x="200" y="60" font-family="Arial" font-weight="700" font-size="24" text-anchor="middle" fill="#1d232a">' + km + ' km</text>');
  }
  function auto() {
    return rahmen('<path d="M60 200 v-50 l40 -40 h150 l40 40 h30 v50z" fill="#fff" stroke="#9aa7b4" stroke-width="3"/><circle cx="110" cy="205" r="20" fill="#4b5560"/><circle cx="270" cy="205" r="20" fill="#4b5560"/>' +
      '<text x="200" y="260" font-family="Arial" font-size="13" text-anchor="middle" fill="#4b5560">Hin- und Rückfahrt</text>');
  }
  function montageWand() {
    return rahmen('<rect x="40" y="40" width="320" height="220" fill="#e8e1d6"/><rect x="110" y="90" width="180" height="110" rx="4" fill="#fff" stroke="#9aa7b4" stroke-width="4"/>' + logo(170, 140, 40, 2) +
      [[122, 102], [278, 102], [122, 188], [278, 188]].map(function (p) { return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="5" fill="#4b5560"/>'; }).join(""));
  }
  function montageDetail() {
    return rahmen('<rect x="60" y="120" width="280" height="14" fill="#c7d0da" stroke="#6b7a8a"/><rect x="190" y="80" width="12" height="110" fill="#6b7a8a"/><rect x="180" y="190" width="32" height="30" rx="4" fill="#9aa7b4"/>' +
      '<text x="200" y="250" font-family="Arial" font-size="13" text-anchor="middle" fill="#4b5560">Abstandshalter, Dübel, Schrauben</text>');
  }
  function entwurf(n) {
    var t = "";
    for (var i = 0; i < n; i++) t += '<rect x="' + (50 + i * 110) + '" y="80" width="90" height="120" rx="6" fill="#fff" stroke="#9aa7b4" stroke-width="3"/>' + logo(95 + i * 110, 130, 34, i + 1);
    return rahmen(t + '<text x="200" y="240" font-family="Arial" font-size="13" text-anchor="middle" fill="#4b5560">' + n + " Entwürfe zur Auswahl</text>");
  }
  /* Lasergravur (2026-10-13): Gegenstand mit eingraviertem Namen — Gravur dunkel/hell je Material */
  function gravurText(x, y, gr, farbe) { return '<text x="' + x + '" y="' + y + '" font-family="Georgia,serif" font-style="italic" font-size="' + gr + '" fill="' + farbe + '" text-anchor="middle">Anna</text>'; }
  function laser(art, detail) {
    var F = {
      kuli: ['<g transform="rotate(-15 200 150)"><rect x="40" y="135" width="300" height="30" rx="15" fill="#6d8fb3" stroke="#3d5670" stroke-width="3"/><path d="M340 140 l35 10 l-35 10z" fill="#9aa7b4"/>' + gravurText(200, 157, 20, "#e8eef4") + '</g>', '#e8eef4'],
      karte: ['<rect x="90" y="70" width="220" height="140" rx="8" fill="#e8c99a" stroke="#a9834f" stroke-width="3"/>' + gravurText(200, 150, 40, "#5a3b17"), '#5a3b17'],
      schiefer: ['<rect x="110" y="60" width="180" height="180" rx="10" fill="#3c4148" stroke="#22262b" stroke-width="3"/>' + gravurText(200, 160, 40, "#c9ced6"), '#c9ced6'],
      glas: ['<path d="M170 50 h60 l-8 120 q-22 20 -44 0z" fill="#eaf4fb" stroke="#8fb3cc" stroke-width="3"/><rect x="196" y="180" width="8" height="60" fill="#8fb3cc"/><ellipse cx="200" cy="245" rx="40" ry="8" fill="#8fb3cc"/>' + gravurText(200, 120, 18, "#7d93a6"), '#7d93a6'],
      leder: ['<rect x="130" y="90" width="140" height="80" rx="30" fill="#8a5a32" stroke="#5c3a1e" stroke-width="3"/><circle cx="150" cy="130" r="8" fill="#eef3f8"/><circle cx="150" cy="130" r="20" fill="none" stroke="#9aa7b4" stroke-width="4" transform="translate(-35 0)"/>' + gravurText(215, 140, 26, "#3a2210"), '#3a2210'],
      oeffner: ['<rect x="80" y="125" width="240" height="50" rx="25" fill="#c9cfd6" stroke="#7c8792" stroke-width="3"/><circle cx="115" cy="150" r="14" fill="#eef3f8" stroke="#7c8792" stroke-width="3"/>' + gravurText(220, 160, 24, "#2b3036"), '#2b3036'],
      acryl: ['<rect x="100" y="90" width="200" height="100" rx="6" fill="#ffffff" fill-opacity=".55" stroke="#9fb6c8" stroke-width="3"/><rect x="100" y="190" width="200" height="12" fill="#c7d0da"/>' + gravurText(200, 155, 40, "#b8c9d6"), '#b8c9d6'],
    }[art];
    if (!detail) return rahmen(F[0]);
    return rahmen('<rect x="60" y="80" width="280" height="120" rx="10" fill="#fff" stroke="#9aa7b4" stroke-width="2" stroke-dasharray="6 4"/>' + gravurText(200, 160, 64, F[1] === "#e8eef4" ? "#3d5670" : F[1]) +
      '<text x="200" y="230" font-family="Arial" font-size="13" text-anchor="middle" fill="#4b5560">Gravurfeld · ein Name je Stück</text>');
  }
  ["kuli", "karte", "schiefer", "glas", "leder", "oeffner", "acryl"].forEach(function (a) { WC.BILDER["laser-" + a] = laser(a, false); WC.BILDER["laser-" + a + "-detail"] = laser(a, true); });
  Object.assign(WC.BILDER, {
    "polo-vorne": polo(false, 2), "polo-detail": polo(true, 2), "polo-vorne-4": polo(false, 4), "polo-detail-4": polo(true, 4),
    "cap-vorne": cap(false), "cap-seite": cap(true),
    "handtuch-ganz": handtuch(false), "handtuch-detail": handtuch(true),
    "patch-vorne": patch(false), "patch-rueck": patch(true),
    "uhr-4": uhr(4), "koffer": werkzeugkoffer(),
    "karte-60": karte(60), "auto": auto(),
    "montage-wand": montageWand(), "montage-detail": montageDetail(),
    "entwurf-3": entwurf(3), "uhr-3": uhr(3),
  });
  /* data-URL für <img> */
  WC.bildUrl = function (key) {
    var s = WC.BILDER[String(key).replace(/^svg:/, "")];
    return s ? "data:image/svg+xml;charset=utf-8," + encodeURIComponent(s) : "";
  };
})(typeof window !== "undefined" ? window : globalThis);
