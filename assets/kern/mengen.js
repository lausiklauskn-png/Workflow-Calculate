/* Mengenregeln — wie viel Material eine Position braucht.
   Feste Regel-Arten statt freier Formeln (kein eval): stueck · flaeche · rolle · platte · laenge.
   Rechnet in Millimetern und gibt alle Größen zurück, die ein Material verlangen kann
   (stueck, m2, lfm, platten) — die Kalkulation nimmt die, deren Einheit das Material trägt.
   Jeder Schritt steht in `weg`, damit der Rechenweg intern lesbar ist.
   Klassisches Skript: im Browser window.WC.mengen, in Node globalThis.WC.mengen. */
(function (g) {
  "use strict";
  var WC = g.WC = g.WC || {};
  var REGELN = ["stueck", "flaeche", "rolle", "platte", "laenge"];

  function zahl(x) { var n = Number(x); return Number.isFinite(n) ? n : 0; }
  function r3(x) { return Math.round(x * 1000) / 1000; }
  function de(x) { return String(r3(x)).replace(".", ","); }

  /* Wie viele Teile b×h passen nebeneinander auf eine Breite W (mit Abstand a)? Beide Lagen probiert. */
  function quer(W, b, h, a) {
    var n1 = b > 0 ? Math.floor((W + a) / (b + a)) : 0, n2 = h > 0 ? Math.floor((W + a) / (h + a)) : 0;
    if (n1 <= 0 && n2 <= 0) return null;
    /* bevorzugt die Lage mit mehr Teilen je Reihe; gleich viele → weniger Länge je Reihe */
    if (n1 > n2 || (n1 === n2 && h <= b)) return { n: n1, laengeJeReihe: h, gedreht: false };
    return { n: n2, laengeJeReihe: b, gedreht: true };
  }

  /* rechne(regel, eingabe, material)
     eingabe: { breiteMm, hoeheMm, menge, abstandMm }
     material (nur für rolle/platte): { rollenbreiteMm } bzw. { platteBMm, platteHMm }
     → { ok, regel, stueck, m2 (verbrauchte Fläche), m2Motiv (bedruckte Fläche), lfm, platten, weg[], fehler? } */
  function rechne(regel, e, mat) {
    e = e || {}; mat = mat || {};
    var b = zahl(e.breiteMm), h = zahl(e.hoeheMm), n = Math.max(0, Math.round(zahl(e.menge))), a = zahl(e.abstandMm);
    var m2Motiv = b * h / 1e6 * n;
    var r = { ok: true, regel: regel, stueck: n, m2: 0, m2Motiv: r3(m2Motiv), lfm: 0, platten: 0, weg: [] };
    if (REGELN.indexOf(regel) < 0) return { ok: false, regel: regel, fehler: "unbekannte Mengenregel „" + regel + "“", weg: [] };
    if (regel === "stueck") {
      r.m2 = r.m2Motiv;
      r.weg.push(n + " Stück");
      return r;
    }
    if (regel === "flaeche") {
      if (!(b > 0 && h > 0)) return { ok: false, regel: regel, fehler: "Breite und Höhe fehlen", weg: [] };
      r.m2 = r.m2Motiv;
      r.weg.push(b + " × " + h + " mm × " + n + " Stück = " + de(r.m2) + " m²");
      return r;
    }
    if (regel === "laenge") {
      if (!(b > 0)) return { ok: false, regel: regel, fehler: "Länge fehlt", weg: [] };
      r.lfm = r3(b / 1000 * n);
      r.m2 = h > 0 ? r.m2Motiv : 0;
      r.weg.push(b + " mm × " + n + " Stück = " + de(r.lfm) + " lfm");
      return r;
    }
    if (!(b > 0 && h > 0)) return { ok: false, regel: regel, fehler: "Breite und Höhe fehlen", weg: [] };
    if (regel === "rolle") {
      var W = zahl(mat.rollenbreiteMm);
      if (!(W > 0)) return { ok: false, regel: regel, fehler: "Material hat keine Rollenbreite", weg: [] };
      var q = quer(W, b, h, a);
      if (!q || q.n < 1) return { ok: false, regel: regel, fehler: "Motiv " + b + " × " + h + " mm passt nicht auf die Rolle (" + W + " mm)", weg: [] };
      var reihen = Math.ceil(n / q.n);
      r.lfm = r3(reihen * (q.laengeJeReihe + a) / 1000);
      r.m2 = r3(r.lfm * W / 1000);
      r.weg.push(q.n + " nebeneinander auf " + W + " mm" + (q.gedreht ? " (gedreht)" : "") + " · " + reihen + " Reihen · " + de(r.lfm) + " lfm = " + de(r.m2) + " m² Rolle");
      return r;
    }
    /* platte */
    var PB = zahl(mat.platteBMm), PH = zahl(mat.platteHMm);
    if (!(PB > 0 && PH > 0)) return { ok: false, regel: regel, fehler: "Material hat kein Plattenformat", weg: [] };
    function jePlatte(bb, hh) { return Math.floor((PB + a) / (bb + a)) * Math.floor((PH + a) / (hh + a)); }
    var je = Math.max(jePlatte(b, h), jePlatte(h, b));
    if (je < 1) return { ok: false, regel: regel, fehler: "Motiv " + b + " × " + h + " mm passt nicht auf die Platte (" + PB + " × " + PH + " mm)", weg: [] };
    r.platten = Math.ceil(n / je);
    r.m2 = r3(r.platten * PB * PH / 1e6);
    r.weg.push(je + " je Platte " + PB + " × " + PH + " mm · " + r.platten + " Platten = " + de(r.m2) + " m²");
    return r;
  }

  /* Menge in der Einheit eines Materials. bezug: "regel" (aus der Mengenregel) · "flaeche" (Motivfläche) · "stueck" */
  function mengeFuer(einheit, bezug, r, e) {
    if (bezug === "stueck") return einheit === "stueck" ? r.stueck : null;
    if (bezug === "flaeche") {
      if (einheit === "m2") return r.m2Motiv;
      if (einheit === "stueck") return r.stueck;
      return null;
    }
    if (einheit === "m2") return r.m2;
    if (einheit === "lfm") return r.lfm;
    if (einheit === "platte") return r.platten;
    if (einheit === "stueck") return r.stueck;
    return null;
  }

  WC.mengen = { REGELN: REGELN, rechne: rechne, mengeFuer: mengeFuer };
})(typeof window !== "undefined" ? window : globalThis);
