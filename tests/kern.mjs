/* Proben ohne Browser — Mengen, Zuschlagskalkulation, Farben, Staffel, Klassen, Rückrechnung,
   Versand, Marktvergleich, Whitelist, Übergabe, Pins. node tests/kern.mjs · 0 = grün, 1 = rot.
   Jede Zusicherung hat einen eigenen Namen; die Gegenprobe (tests/gegenprobe.mjs) sucht genau diese. */
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const WURZEL = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const KERN = ["assets/kern/geld.js", "assets/kern/mengen.js", "assets/kern/kalkulation.js", "assets/kern/versand.js", "assets/kern/markt.js",
  "assets/kern/katalog.js", "assets/kern/angebot.js", "assets/kern/aussen.js", "assets/kern/uebergabe.js", "assets/daten/werbetechnik.js", "assets/daten/bilder.js"];
for (const f of KERN) require(join(WURZEL, f));
const WC = globalThis.WC, K = WC.kalk, M = WC.mengen, A = WC.angebot, V = WC.versand, MK = WC.markt;

let gruen = 0, rot = 0;
function ok(name, wahr, mehr) {
  if (wahr) gruen++;
  else { rot++; console.log("ROT  " + name + (mehr !== undefined ? "  — " + (typeof mehr === "string" ? mehr : JSON.stringify(mehr)) : "")); }
}
const kopie = (x) => JSON.parse(JSON.stringify(x));
const sha = (p) => createHash("sha256").update(readFileSync(join(WURZEL, p))).digest("hex");
const lies = (p) => readFileSync(join(WURZEL, p), "utf8");
function pos(kat, vorlage, extra) {
  const v = K.finde(kat.vorlagen, vorlage), p = { vorlage, menge: 1, staffeln: [1], breiteMm: v.breiteVorgabe, hoeheMm: v.hoeheVorgabe, farben: 1, verfahren: v.verfahrenVorgabe, wahl: {}, zeiten: {}, saetze: {}, eigen: {} };
  v.slots.forEach((s) => { p.wahl[s.id] = s.vorgabe; });
  return Object.assign(p, extra || {});
}

/* ── PINS ── */
ok("PIN: installieren.js ist byte-gleich mit Sage (über Workflow-Needs)", sha("assets/installieren.js") === "6de57ef331b5deb55b18ca7745da402f16b4401f22259d466b8d828ccbd1b909");

/* ── KATALOG ── */
{
  const kat = kopie(WC.START);
  ok("KATALOG: Startkatalog ist fehlerfrei", WC.katalog.pruefe(kat).length === 0, WC.katalog.pruefe(kat));
  ok("KATALOG: Startkatalog trägt Platzhalter-Marken", WC.katalog.platzhalter(kat).anzahl > 10);
  const k2 = kopie(kat); k2.vorlagen[0].slots[0].wahl.push("gibt_es_nicht");
  ok("KATALOG: Verweis auf fehlendes Material wird gemeldet", WC.katalog.pruefe(k2).some((f) => /gibt_es_nicht/.test(f)));
  const imp = WC.katalog.importieren(WC.katalog.exportieren(kat));
  ok("KATALOG: Export und Import ergeben denselben Katalog", imp.ok && JSON.stringify(imp.katalog) === JSON.stringify(kat));
  ok("KATALOG: kaputte Datei wird abgewiesen", !WC.katalog.importieren("{nein").ok);
  ok("KATALOG: jede Vorlage hat mindestens ein Beispiel mit Bild", kat.vorlagen.every((v) => v.beispiele.length && v.beispiele.every((b) => b.ansichten.length >= 2 && b.ansichten.every((a) => WC.bildUrl(a[1]).startsWith("data:image/svg+xml")))));
}

/* ── MENGEN ── */
{
  const r = M.rechne("rolle", { breiteMm: 500, hoeheMm: 300, menge: 5, abstandMm: 5 }, { rollenbreiteMm: 1370 });
  ok("MENGE: Rolle — 4 gedreht nebeneinander, 2 Reihen, 1,01 lfm, 1,3837 m²", r.ok && r.lfm === 1.01 && r.m2 === 1.384 && /gedreht/.test(r.weg[0]), r);
  const pl = M.rechne("platte", { breiteMm: 600, hoeheMm: 400, menge: 16, abstandMm: 4 }, { platteBMm: 3050, platteHMm: 1500 });
  ok("MENGE: Platte — 15 je Platte, 16 Stück → 2 Platten", pl.ok && pl.platten === 2, pl);
  ok("MENGE: zu breit für die Rolle wird gemeldet, nicht geraten", !M.rechne("rolle", { breiteMm: 2000, hoeheMm: 2000, menge: 1 }, { rollenbreiteMm: 1370 }).ok);
  ok("MENGE: Fläche = B × H × Menge", M.rechne("flaeche", { breiteMm: 1000, hoeheMm: 500, menge: 3 }).m2 === 1.5);
}

/* ── ZUSCHLAGSKALKULATION: Lehrbuch-Beispiel, Zeile für Zeile auf den Cent ── */
{
  const e = { lohnCent: 0, mgkPct: 10, fgkPct: 150, vwgkPct: 12, vtgkPct: 8, gewinnPct: 10, skontoPct: 2, provisionPct: 0, rabattPct: 10 };
  const s = K.schema({ mek: 100000, fek: 50000, maschine: 0 }, e);
  ok("KALK: Lehrbuch — Materialkosten 1.100,00", s.materialkosten === 110000, s.materialkosten);
  ok("KALK: Lehrbuch — Fertigungskosten 1.250,00", s.fertigungskosten === 125000, s.fertigungskosten);
  ok("KALK: Lehrbuch — Herstellkosten 2.350,00", s.herstellkosten === 235000);
  ok("KALK: Lehrbuch — Selbstkosten 2.820,00", s.selbstkosten === 282000, s.selbstkosten);
  ok("KALK: Lehrbuch — Barverkaufspreis 3.102,00", s.barverkaufspreis === 310200);
  ok("KALK: Lehrbuch — Zielverkaufspreis 3.165,31 (Skonto im Hundert)", s.zielverkaufspreis === 316531, s.zielverkaufspreis);
  ok("KALK: Lehrbuch — Listenpreis 3.517,01 (Rabatt im Hundert)", s.listenpreis === 351701, s.listenpreis);
  ok("KALK: jede Zeile steht im Rechenweg", s.zeilen.length === 17 && s.zeilen.some((z) => /Selbstkosten/.test(z.text)));
  const einfach = K.effektiv({ modus: "einfach", stundensatzCent: 6500, materialzuschlagPct: 15, gkPct: 12, gewinnPct: 20 });
  const voll = K.effektiv({ modus: "voll", lohnCent: 6500, mgkPct: 15, fgkPct: 0, vwgkPct: 12, vtgkPct: 0, gewinnPct: 20 });
  ok("KALK: vereinfacht und ausführlich rechnen gleich bei gleichwertigen Sätzen", JSON.stringify(einfach) === JSON.stringify(voll), [einfach, voll]);
}

/* ── POSITIONEN, FARBEN, STAFFEL ── */
{
  const kat = kopie(WC.START);
  const t10 = K.position(kat, pos(kat, "tasse", { menge: 10 }), {}), t100 = K.position(kat, pos(kat, "tasse", { menge: 100 }), {});
  ok("STAFFEL: mehr Stück → kleinerer Stückpreis (Rüsten verteilt sich)", t10.ok && t100.ok && t100.stueckCent < t10.stueckCent, [t10.stueckCent, t100.stueckCent]);
  /* Tasse: 1,5 + 0,5 min je Stück — 90 Stück mehr sind genau 180 min mehr; die Rüstzeit fällt einmal an */
  ok("STAFFEL: Rüstzeit fällt einmal an, nicht je Stück", Math.abs((t100.minuten - t10.minuten) - 180) < 0.01, [t10.minuten, t100.minuten]);
  const f1 = K.position(kat, pos(kat, "shirt", { menge: 20, farben: 1 }), {}), f3 = K.position(kat, pos(kat, "shirt", { menge: 20, farben: 3 }), {});
  const flex = (r) => r.material.filter((m) => m.slot === "flex")[0].cent;
  ok("FARBEN: 3-farbig Flex braucht dreimal die Folie", flex(f3) === 3 * flex(f1) || Math.abs(flex(f3) - 3 * flex(f1)) <= 1, [flex(f1), flex(f3)]);
  ok("FARBEN: 3-farbig Flex kostet mehr Zeit (Plotten, Entgittern, Pressen je Farbe)", f3.minuten > 2.5 * (f1.minuten - 15), [f1.minuten, f3.minuten]);
  const d1 = K.position(kat, pos(kat, "shirt", { menge: 20, farben: 1, verfahren: "dtf" }), {}), d4 = K.position(kat, pos(kat, "shirt", { menge: 20, farben: 4, verfahren: "dtf" }), {});
  ok("FARBEN: vierfarbiger Digitaltransfer — Farbzahl ändert nichts", d1.ok && d1.netto === d4.netto, [d1.netto, d4.netto]);
  ok("FARBEN: Flexfolie nur beim Flex-Verfahren", !d4.material.some((m) => m.slot === "flex") && d4.material.some((m) => m.slot === "dtf"));
  const k2 = kopie(kat); K.finde(k2.materialien, "tasse_11").ekCent = null;
  const ohne = K.position(k2, pos(k2, "tasse", { menge: 10 }), {});
  ok("OFFEN: fehlender Einkaufspreis → nicht kalkuliert, nicht 0", !ohne.ok && ohne.offen.some((o) => /Einkaufspreis fehlt/.test(o)));
  const a = A.neu([], "2026-10-12"); A.neuePosition(a, k2, "tasse"); A.neuePosition(a, k2, "kuli");
  const r = A.rechne(a, k2, null, false);
  ok("OFFEN: nicht kalkulierte Position zählt nicht in die Summe", r.summen.offen === 1 && r.summen.netto === r.positionen[1].erg.netto + r.versand.cent, r.summen);
  const lauf = K.position(kat, pos(kat, "tasse", { menge: 50, eigen: { 50: 100 } }), {});
  ok("VERLUST: eigener Preis unter Herstellkosten wird erkannt", lauf.lage === "unter_hk");
  const sk = K.position(kat, pos(kat, "tasse", { menge: 50 }), {});
  const mitte = Math.round((sk.herstellkosten + sk.selbstkosten) / 2);
  ok("VERLUST: zwischen Herstell- und Selbstkosten heißt „unter Selbstkosten“", K.position(kat, pos(kat, "tasse", { menge: 50, eigen: { 50: mitte } }), {}).lage === "unter_sk");
}

/* ── SATZ-EBENEN UND KUNDENKLASSEN ── */
{
  const kat = kopie(WC.START), p = pos(kat, "tasse", { menge: 50 });
  const na = (k) => K.position(kat, p, { kunde: k ? { klasse: k } : null }).netto;
  ok("KLASSE: C-Kunde zahlt mehr als B, A weniger", na("C") > na("B") && na("A") < na("B"), [na("A"), na("B"), na("C")]);
  const mitSatz = Object.assign(kopie(p), { saetze: { stundensatzCent: 6500 } });
  const c = K.position(kat, mitSatz, { kunde: { klasse: "C" } });
  ok("SATZ: an der Position gesetzter Satz gilt — die Klasse wirkt dort nicht", c.effektiv.lohnCent === 6500 && c.quelle.stundensatzCent === "position", c.quelle);
  const ang = { saetze: { gewinnPct: 0 } };
  ok("SATZ: Angebot überstimmt Vorlage und Gebiet", K.position(kat, p, { angebot: ang }).effektiv.gewinnPct === 0);
  K.finde(kat.vorlagen, "tasse").saetze = { gewinnPct: 40 };
  ok("SATZ: Vorlage überstimmt das Arbeitsgebiet", K.position(kat, p, {}).effektiv.gewinnPct === 40);
}

/* ── EIGENER PREIS → FORMEL LERNEN ── */
{
  const kat = kopie(WC.START), p = pos(kat, "tasse", { menge: 50 });
  const basis = K.position(kat, p, {}), ziel = basis.netto + 5000;
  for (const weg of ["gewinn", "stundensatz", "minuten"]) {
    const rr = K.rueckrechnen(kat, p, {}, ziel, weg);
    ok("LERNEN: " + weg + " — Rückrechnung trifft den Zielpreis auf den Cent", rr.ok && rr.netto === ziel, rr);
    const k2 = kopie(kat); K.uebernehmen(k2, "tasse", weg, rr.wert, { anlass: "Test" });
    ok("LERNEN: " + weg + " — nach dem Übernehmen rechnet die Vorlage genau den Preis", K.position(k2, p, {}).netto === ziel, K.position(k2, p, {}).netto);
    K.ruecknehmen(k2, "tasse", 1);
    ok("LERNEN: " + weg + " — Rücknehmen stellt die alte Rechnung her", K.position(k2, p, {}).netto === basis.netto);
  }
  const k3 = kopie(kat); const rr = K.rueckrechnen(k3, p, {}, ziel, "gewinn"); K.uebernehmen(k3, "tasse", "gewinn", rr.wert, { anlass: "Praxis" });
  ok("LERNEN: der Verlauf hält alt → neu und Anlass fest", K.finde(k3.vorlagen, "tasse").verlauf[0].anlass === "Praxis" && K.finde(k3.vorlagen, "tasse").verlauf[0].alt);
  const fest = Object.assign(kopie(p), { saetze: { gewinnPct: 20 } });
  ok("LERNEN: wirkt der Wert nicht (an der Position gesetzt), sagt die Rückrechnung das", !K.rueckrechnen(kat, fest, {}, ziel, "gewinn").ok);
}

/* ── VERSAND ── */
{
  const kat = kopie(WC.START);
  const r = V.waehle(kat, { gewichtG: 3200, volumenL: 5, laengsteMm: 200 }, 6500, {});
  ok("VERSAND: 3,2 kg → Stufe bis 5 kg", r.ok && r.stufeBisG === 5000 && r.dienst === "paket", r);
  ok("VERSAND: Posten = Verpackung + Packen + Tarif", r.cent === r.verpackungCent + r.packCent + r.tarifCent);
  const lang = V.waehle(kat, { gewichtG: 2000, volumenL: 10, laengsteMm: 1500 }, 6500, { dienst: "paket" });
  ok("VERSAND: Überlänge → Sperrgut-Zuschlag", lang.ok && lang.sperrgut === true, lang);
  const k2 = kopie(kat); k2.versand = k2.versand.filter((d) => d.id === "paket"); k2.versand[0].sperrgutCent = null;
  const nix = V.waehle(k2, { gewichtG: 2000, volumenL: 10, laengsteMm: 1500 }, 6500, {});
  ok("VERSAND: passt nichts → „kein Tarif passt“, nie still 0", !nix.ok && /kein Tarif passt/.test(nix.grund));
  const a = A.neu([], "2026-10-12"); A.neuePosition(a, kat, "fahrzeug");
  ok("VERSAND: Montage-Produkt (versandArt keiner) erzeugt keinen Versandposten", A.rechne(a, kat, null, false).versand.leer === true);
}

/* ── MARKT ── */
{
  const leer = MK.vergleich([], 50, 700, { online: 50, import: 500 }, "2026-10-12", 500);
  ok("MARKT: ohne eingetragene Preise kein Vergleich", leer.vergleich === false && leer.klassen.every((k) => !k.daten));
  const e = [{ klasse: "handwerk", menge: 50, stueckCent: 800, versandCent: 0, datum: "2026-10-01" }, { klasse: "handwerk", menge: 50, stueckCent: 1000, datum: "2026-10-01" },
    { klasse: "handwerk", menge: 50, stueckCent: 1200, datum: "2025-01-01" }, { klasse: "import", menge: 1000, stueckCent: 150, datum: "2026-10-01" }];
  const v = MK.vergleich(e, 50, 700, { online: 50, import: 500 }, "2026-10-12", 500);
  const hw = v.klassen.filter((k) => k.id === "handwerk")[0], im = v.klassen.filter((k) => k.id === "import")[0];
  ok("MARKT: Median 10,00 €, eigener Preis unter allen", hw.median === 1000 && hw.lage === "unter" && hw.bisMedian === 300, hw);
  ok("MARKT: Import gilt erst ab 500 Stück", im.aktiv === false && MK.vergleich(e, 600, 700, { import: 500 }, "2026-10-12").klassen[2].aktiv === true);
  ok("MARKT: älter als 6 Monate heißt „veraltet“", hw.veraltet === 1);
}

/* ── WHITELIST: Lockwerte dürfen nie aufs Kundenblatt ── */
{
  const kat = kopie(WC.START);
  K.finde(kat.materialien, "tasse_11").ekCent = 731;
  kat.gebiete[0].saetze.stundensatzCent = 7300;
  K.finde(kat.vorlagen, "tasse").markt = [{ anbieter: "MARKT-PRUEFWORT", klasse: "handwerk", menge: 50, stueckCent: 999 }];
  const a = A.neu([], "2026-10-12"); a.kunde = { name: "Kunde Beispiel", anschrift: "Musterweg 1", klasse: "C" };
  const p = A.neuePosition(a, kat, "tasse"); p.menge = 50; p.zeiten = { daten: { ruestMin: 17 } };
  const r = A.rechne(a, kat, a.kunde, false);
  const d = WC.aussen.angebotExtern(a, r, { name: "Firma" }, false), j = JSON.stringify(d);
  ok("WHITELIST: kein Einkaufspreis (7,31 €) im Kundenblatt", !/731|7,31/.test(j));
  ok("WHITELIST: kein Stundensatz (73,00 €) im Kundenblatt", !/7300|73,00/.test(j));
  ok("WHITELIST: keine internen Felder", !/selbstkosten|schema|klasse|effektiv|saetze|zeiten|markt|MARKT-PRUEFWORT|platzhalter/i.test(j), j.match(/selbstkosten|schema|klasse|effektiv|saetze|zeiten|markt|platzhalter/i));
  ok("WHITELIST: Kundenblatt trägt Positionen, Versand und Summen", d.positionen.length === 1 && d.versand && d.summen.brutto > d.summen.netto);
  const auf = WC.uebergabe.auftrag(d, "2026-10-12T10:00:00Z"), b = WC.uebergabe.buendel([auf], "2026-10-12T10:00:00Z"), jb = JSON.stringify(b);
  ok("UEBERGABE: Weiterleitungs-Bündel wie in Workflow-Needs (wf forward, v 1, Status angebot)", b.wf === "forward" && b.v === 1 && b.count === 1 && auf.status === "angebot" && auf.nr === a.nummer && b.quelle === "workflow-calculate");
  ok("UEBERGABE: keine internen Werte in der Auftragsdatei", !/731|7,31|7300|73,00|selbstkosten|klasse|MARKT-PRUEFWORT/i.test(jb));
  ok("UEBERGABE: Kunde und Preis stehen im Auftrag", auf.data.nameFirma === "Kunde Beispiel" && /brutto/.test(auf.data.preis) && auf.data.datum === "12.10.2026");
}

/* ── EINFRIEREN ── */
{
  const kat = kopie(WC.START), a = A.neu([], "2026-10-12"), p = A.neuePosition(a, kat, "tasse"); p.menge = 50;
  const vorher = A.rechne(a, kat, null, false).summen.netto;
  A.stellen(a, kat);
  K.finde(kat.materialien, "tasse_11").ekCent = 5000;
  ok("EINFRIEREN: gestelltes Angebot bleibt bei späterer Katalogänderung gleich", A.rechne(a, kat, null, false).summen.netto === vorher);
  A.zurueckZumEntwurf(a);
  ok("EINFRIEREN: zurück zum Entwurf rechnet mit dem aktuellen Katalog", A.rechne(a, kat, null, false).summen.netto > vorher);
  ok("NUMMER: AN-JJJJ-NNNN, fortlaufend je Jahr", A.naechsteNummer([{ nummer: "AN-2026-0007" }, { nummer: "AN-2025-0099" }], "2026-10-12") === "AN-2026-0008");
}

/* ── RECHNER ── */
{
  const r = K.stundensatzRechner({ lohnJahrCent: 3600000, lohnnebenPct: 20, gemeinkostenJahrCent: 2000000, gewinnJahrCent: 1000000, produktiveStunden: 1400 });
  ok("RECHNER: Stundensatz = (36.000 + 20 % + 20.000 + 10.000) ÷ 1400 h = 52,29 €", r.ok && r.satzCent === 5229, r);
  const z = K.zuschlagsRechner({ mekCent: 10000000, fertigungslohnCent: 5000000, mgkCent: 1000000, fgkCent: 7500000, vwgkCent: 2820000, vtgkCent: 1880000 });
  ok("RECHNER: Zuschläge 10 % · 150 % · 12 % · 8 %", z.ok && z.mgkPct === 10 && z.fgkPct === 150 && z.vwgkPct === 12 && z.vtgkPct === 8, z);
}

/* ── SCHALE ── */
{
  const sw = lies("sw.js"), idx = lies("index.html");
  const core = JSON.parse(sw.match(/const CORE = (\[[\s\S]*?\]);/)[1]);
  const skripte = [...idx.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]).concat([...idx.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map((m) => m[1]));
  ok("CACHE: jede Datei der Seite steht genau so im Vorrat (gleiche ?v=)", skripte.every((s) => core.includes(s)), skripte.filter((s) => !core.includes(s)));
  const stand = JSON.parse(lies("tests/cache-stand.json"));
  const h = createHash("sha256"); core.filter((u) => u !== "./").sort().forEach((u) => h.update(u + "\0").update(readFileSync(join(WURZEL, u.replace(/\?.*$/, "")))));
  ok("CACHE: Vorrat geändert → CACHE_VERSION erhöhen und node tools/cache-stand.mjs", stand.sha === h.digest("hex") && sw.includes('"' + stand.version + '"'));
  ok("PAGES: .gitignore sperrt node_modules (ohne Schrägstrich, auch als Verweis)", /^node_modules$/m.test(lies(".gitignore")));
  ok("SCHALE: kein fremder Abruf (nur der Such-Link auf Tipp)", !/src="https?:|fetch\(\s*["']https?:/.test(idx + lies("assets/app.js")));
}

console.log(`kern: ${gruen} grün · ${rot} ROT`);
process.exit(rot ? 1 : 0);
