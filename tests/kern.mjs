/* Proben ohne Browser — Mengen, Zuschlagskalkulation, Farben, Staffel, Klassen, Rückrechnung,
   Versand, Marktvergleich, Whitelist, Übergabe, Pins. node tests/kern.mjs · 0 = grün, 1 = rot.
   Jede Zusicherung hat einen eigenen Namen; die Gegenprobe (tests/gegenprobe.mjs) sucht genau diese. */
import { createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const WURZEL = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const KERN = ["assets/kern/geld.js", "assets/kern/mengen.js", "assets/kern/kalkulation.js", "assets/kern/versand.js", "assets/kern/markt.js",
  "assets/kern/katalog.js", "assets/kern/angebot.js", "assets/kern/aussen.js", "assets/kern/uebergabe.js", "assets/schluesseltresor.js", "assets/kern/sicherung.js", "assets/kern/nachkalk.js", "assets/kern/recherche.js", "assets/daten/werbetechnik.js", "assets/daten/stickerei.js", "assets/daten/dienstleistung.js", "assets/daten/handelsware.js", "assets/daten/laser.js", "assets/daten/beispiel-angebote.js", "assets/daten/bilder.js"];
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

/* ── STUFE 2: Fassungen ── */
{
  const kat = kopie(WC.START), alle = [];
  const a = A.neu(alle, "2026-10-12"); alle.push(a); const p = A.neuePosition(a, kat, "tasse"); p.menge = 50;
  ok("FASSUNG: ein Entwurf bekommt keine neue Fassung", !A.neueFassung(alle, a, "x").ok);
  A.stellen(a, kat);
  const r = A.neueFassung(alle, a, "Kunde will 100 Stück", "2026-10-13");
  ok("FASSUNG: gestellt → Fassung 2 mit derselben Nummer, eigener Kennung, als Entwurf", r.ok && r.angebot.fassung === 2 && r.angebot.nummer === a.nummer && r.angebot.id === a.nummer + "-F2" && r.angebot.status === "entwurf" && r.angebot.stand === null);
  ok("FASSUNG: die alte bleibt gestellt und nennt die neue", a.status === "gestellt" && a.ersetztDurch === r.angebot.id && !A.neueFassung(alle, a, "y").ok);
  const n = r.angebot; n.positionen[0].menge = 100;
  const v = A.vergleich(A.rechne(a, kat, null, false), A.rechne(n, kat, null, false));
  ok("FASSUNG: Vergleich zeigt die geänderte Position und die Differenz", v.zeilen[0].art === "geaendert" && v.summe.diff === v.summe.neu - v.summe.alt && v.summe.diff > 0, v);
  const d = WC.aussen.angebotExtern(n, A.rechne(n, kat, null, false), {}, false);
  ok("FASSUNG: Kundenblatt und Übergaben tragen die Fassung", d.fassung === 2 && WC.uebergabe.auftrag(d).nr === a.nummer + "-F2" && WC.uebergabe.blpNutzlast(d).angebotsNr === a.nummer + "-F2");
  ok("NUMMER: eine neue Fassung zieht keine neue Nummer", A.naechsteNummer([a, n], "2026-10-12") === "AN-2026-0002");
}

/* ── STUFE 2: An BookLedgerPro (Datenvertrag v1) ── */
{
  const kat = kopie(WC.START), a = A.neu([], "2026-10-12"); a.kunde = { name: "Kunde Beispiel", anschrift: "", klasse: "C" };
  K.finde(kat.materialien, "tasse_11").ekCent = 731;
  const p1 = A.neuePosition(a, kat, "tasse"); p1.menge = 50; const p2 = A.neuePosition(a, kat, "kuli"); p2.menge = 250;
  const r = A.rechne(a, kat, a.kunde, false), d = WC.aussen.angebotExtern(a, r, {}, false);
  const n = WC.uebergabe.blpNutzlast(d);
  ok("BLP: Nutzlast v1, quelle workflow-calculate, modus angebot", n.v === 1 && n.quelle === "workflow-calculate" && n.modus === "angebot" && n.kundeName === "Kunde Beispiel");
  const summe = n.positionen.reduce((s, x) => s + x.menge * x.einzelpreisCent, 0);
  ok("BLP: menge × Einzelpreis ergibt genau die Netto-Summe (Versand als eigene Position)", summe === d.summen.netto && n.positionen.some((x) => x.beschreibung === "Verpackung & Versand"), [summe, d.summen.netto]);
  ok("BLP: nur ganze Cent, USt 0/7/19, Texte ≤ 140", n.positionen.every((x) => Number.isInteger(x.einzelpreisCent) && [0, 7, 19].includes(x.ustSatz) && x.beschreibung.length <= 140));
  ok("BLP: nichts Internes in der Nutzlast", !/731|7,31|selbstkost|klasse|saetze/i.test(JSON.stringify(n)));
  const ad = WC.uebergabe.blpAdresse(d);
  ok("BLP: Adresse auf BookLedgerPro mit ?uebernahme=", ad.ok && ad.url.startsWith("https://lausiklauskn-png.github.io/BookLedgerPro/?uebernahme=") && ad.url.length < 20100);
  const viel = Object.assign({}, d, { positionen: Array.from({ length: 21 }, () => d.positionen[0]) });
  ok("BLP: mehr als 20 Positionen werden abgewiesen, mit Grund", !WC.uebergabe.blpAdresse(viel).ok && /höchstens 20/.test(WC.uebergabe.blpAdresse(viel).grund));
  /* Gegen BookLedgerPros echten Parser — nur wenn der Klon daneben liegt */
  const blp = process.env.BLP_KLON || join(WURZEL, "..", "BookLedgerPro");
  const parser = join(blp, "src/domain/uebernahmeExtern.js");
  if (existsSync(parser)) {
    const { parseUebernahmeParam, UEBERNAHME_QUELLEN } = await import(pathToFileURL(parser).href);
    if (UEBERNAHME_QUELLEN.includes("workflow-calculate")) {
      const g = parseUebernahmeParam(new URL(ad.url).search);
      ok("BLP: BookLedgerPros Parser liest die Nutzlast unverändert", g && g.quelle === "workflow-calculate" && g.positionen.length === n.positionen.length &&
        g.positionen.reduce((s, x) => s + x.menge * x.einzelpreisCent, 0) === d.summen.netto && g.kundeName === "Kunde Beispiel", g);
    } else console.log("hinweis: BookLedgerPro-Klon kennt workflow-calculate noch nicht (PR offen) — Parser-Probe übersprungen");
  } else console.log("hinweis: kein BookLedgerPro-Klon daneben — Parser-Probe übersprungen");
}

/* ── STUFE 2: Sicherung ── */
{
  const SI = WC.sicherung;
  ok("PIN: schluesseltresor.js ist byte-gleich mit Workflow-Needs", sha("assets/schluesseltresor.js") === "eaed30e8f3921835a3f58b69f89d9b008831f69f164ad1dfec630fa43161f666");
  const bild = new Blob([new Uint8Array([1, 2, 3, 250])], { type: "image/jpeg" });
  const inhalt = { angebote: [{ id: "AN-2026-0001", nummer: "AN-2026-0001", kunde: { name: "GEHEIM-KUNDE" }, positionen: [] }], kunden: [{ id: "K-1", name: "GEHEIM-KUNDE" }],
    bilder: [{ id: "B-1", name: "x.jpg", blob: bild }], speicher: { katalog: "{}", einstellungen: null } };
  ok("SICHERUNG: zu kurzes Passwort wird abgewiesen", await SI.verschliessen("kurz", inhalt).then(() => false, (e) => e.message === "kurz"));
  const d = await SI.verschliessen("ein-langes-passwort", inhalt, "2026-10-12T10:00:00Z");
  const t = JSON.stringify(d);
  ok("SICHERUNG: kein Klartext in der Datei", d.art === SI.ART && !/GEHEIM|AN-2026|K-1/.test(t));
  ok("SICHERUNG: falsches Passwort → „passwort“", await SI.oeffnen("falsches-passwort", d).then(() => false, (e) => e.message === "passwort"));
  const o = await SI.oeffnen("ein-langes-passwort", d);
  const bytes = new Uint8Array(await o.bilder[0].blob.arrayBuffer());
  ok("SICHERUNG: Angebote, Kunden und Bilder Byte für Byte zurück", o.angebote[0].kunde.name === "GEHEIM-KUNDE" && o.kunden.length === 1 && bytes.join() === "1,2,3,250" && o.bilder[0].blob.type === "image/jpeg");
  const z = SI.zusammenfuehren({ angebote: [{ id: "AN-2026-0001" }], kunden: [], bilder: [] }, o);
  ok("SICHERUNG: Zurückholen fügt hinzu, überschreibt nie", z.angebote.length === 0 && z.schonDa === 1 && z.kunden.length === 1 && z.bilder.length === 1);
  ok("SICHERUNG: Erinnerung ab 14 Tagen, nur mit Angeboten", SI.erinnernNoetig([{}], "2026-09-01T00:00:00Z", Date.parse("2026-10-12")) && !SI.erinnernNoetig([{}], "2026-10-10T00:00:00Z", Date.parse("2026-10-12")) && !SI.erinnernNoetig([], null));
}

/* ── STUFE 3: Arbeitsgebiete aus dem Startkatalog ── */
{
  const kat = kopie(WC.START), KA = WC.katalog;
  const r1 = KA.gebietHinzufuegen(kat, WC.STARTKATALOGE.stickerei);
  ok("GEBIET: Stickerei bringt Gebiet, Materialien, Verfahren und 4 Vorlagen", r1.neu.gebiete === 1 && r1.neu.vorlagen === 4 && r1.neu.verfahren === 1 && KA.gebietDa(kat, "stickerei"), r1);
  KA.gebietHinzufuegen(kat, WC.STARTKATALOGE.dienstleistung);
  ok("GEBIET: der Katalog mit allen drei Gebieten ist fehlerfrei", KA.pruefe(kat).length === 0, KA.pruefe(kat));
  K.finde(kat.materialien, "garn_vlies").ekCent = 11;
  const r2 = KA.gebietHinzufuegen(kat, WC.STARTKATALOGE.stickerei);
  ok("GEBIET: eigene Zahlen bleiben beim zweiten Hinzufügen (nichts doppelt, nichts überschrieben)", r2.summe === 0 && r2.schonDa > 0 && K.finde(kat.materialien, "garn_vlies").ekCent === 11 &&
    kat.vorlagen.filter((v) => v.id === "polo_stick").length === 1, r2);
  const neu = ["stickerei", "dienstleistung"].flatMap((g) => WC.STARTKATALOGE[g].vorlagen);
  ok("GEBIET: jede neue Vorlage hat Beispiele mit mindestens zwei Ansichten (Zeichnungen)", neu.every((v) => v.beispiele.length && v.beispiele.every((b) => b.ansichten.length >= 2 && b.ansichten.every((a) => WC.bildUrl(a[1]).startsWith("data:image/svg+xml")))));
  ok("GEBIET: alle neuen Zahlen tragen die Platzhalter-Marke", ["stickerei", "dienstleistung"].every((g) => WC.STARTKATALOGE[g].materialien.concat(WC.STARTKATALOGE[g].verfahren, WC.STARTKATALOGE[g].gebiete).every((x) => x.platzhalter)));
}

/* ── STUFE 3: Stickerei nach Stichzahl — von Hand gerechnet ── */
{
  const kat = kopie(WC.START); WC.katalog.gebietHinzufuegen(kat, WC.STARTKATALOGE.stickerei);
  const e = K.position(kat, pos(kat, "polo_stick", { menge: 20, stiche: 6000, farben: 2 }), {});
  /* 20 × 6000 = 120 Tsd. Stiche · Maschine 120 / 40 + 10/60 = 3,167 h · Arbeit 45 + 2×3 + 20×1,5 + 20×1 = 101 min · Material 20 × 9,00 + 120 × 0,08 = 189,60 € */
  ok("STICK: Maschinenzeit aus der Stichzahl (3,167 h)", e.ok && e.maschinenH === 3.167, e.maschinenH);
  ok("STICK: Arbeitszeit 101 min (Punchen + je Farbe einrichten + je Stück)", e.minuten === 101, e.minuten);
  ok("STICK: Material 189,60 € (Polos + Garn je Tausend Stiche)", e.mek === 18960, e.mek);
  const e2 = K.position(kat, pos(kat, "polo_stick", { menge: 20, stiche: 12000, farben: 2 }), {});
  ok("STICK: doppelte Stichzahl verlängert die Maschinenzeit, nicht die Arbeitszeit", e2.maschinenH === 6.167 && e2.minuten === 101, [e2.maschinenH, e2.minuten]);
  const e3 = K.position(kat, pos(kat, "polo_stick", { menge: 20, stiche: 6000, farben: 4 }), {});
  ok("STICK: mehr Garnfarben = je Farbe Einrichten, die Maschine läuft gleich lang", e3.minuten === 107 && e3.maschinenH === 3.167, [e3.minuten, e3.maschinenH]);
  const v = K.finde(kat.vorlagen, "polo_stick"); v.sticheVorgabe = 0;
  const e4 = K.position(kat, pos(kat, "polo_stick", { menge: 20, stiche: "" }), {});
  ok("STICK: fehlende Stichzahl → nicht kalkuliert, nicht 0", !e4.ok && e4.offen.indexOf("Stichzahl fehlt") >= 0, e4.offen);
}

/* ── STUFE 3: Mengen-Einheit (Std., km) bis aufs Blatt und in die Übergaben ── */
{
  const kat = kopie(WC.START); WC.katalog.gebietHinzufuegen(kat, WC.STARTKATALOGE.dienstleistung);
  const a = A.neu([], "2026-10-12"); a.kunde = { name: "Kunde Beispiel", anschrift: "", klasse: "B" };
  const p1 = A.neuePosition(a, kat, "arbeit_std"); p1.menge = 4; p1.staffeln = [4];
  const p2 = A.neuePosition(a, kat, "tasse"); p2.menge = 10; p2.staffeln = [10];
  const r = A.rechne(a, kat, a.kunde, false), d = WC.aussen.angebotExtern(a, r, {}, false);
  /* 4 Std. × 65 € = 260 € · + 10 % Gemeinkosten = 286 € · + 15 % Gewinn = 328,90 € */
  ok("EINHEIT: 4 Std. Arbeit = 328,90 € netto (Satz, Gemeinkosten, Gewinn)", r.positionen[0].erg.netto === 32890, r.positionen[0].erg.netto);
  ok("EINHEIT: Std. und Stk. stehen am Kundenblatt", d.positionen[0].einheit === "Std." && d.positionen[1].einheit === "Stk.", d.positionen.map((x) => x.einheit));
  ok("EINHEIT: die WorkFloh-Übergabe sagt „4 Std.“", /4 Std\. à/.test(JSON.stringify(WC.uebergabe.auftrag(d))));
  ok("EINHEIT: Dienstleistung ohne Ware braucht keinen Versand", r.versand.ok && r.positionen[0].erg.gewichtG === 0);
}

/* ── STUFE 3: Nachkalkulation — Plan gegen Ist ── */
{
  const NK = WC.nachkalk, kat = kopie(WC.START);
  const a = A.neu([], "2026-10-12"); a.kunde = { name: "Kunde Beispiel", anschrift: "", klasse: "B" };
  const p1 = A.neuePosition(a, kat, "tasse"); p1.menge = 50; p1.staffeln = [50];
  const p2 = A.neuePosition(a, kat, "kuli"); p2.menge = 250; p2.staffeln = [250];
  A.stellen(a, kat);
  const r = A.rechne(a, kat, a.kunde, false), plan = r.positionen[0].erg;
  ok("NACHKALK: Ausgangslage — Tasse 50 Stück plant 125 min", plan.minuten === 125, plan.minuten);
  let n = NK.angebot(a, r);
  ok("NACHKALK: ohne Ist-Werte ist Ist = Plan, und es wird gesagt", n.summe.erfasst === 0 && n.summe.ausPlan === 2 && n.summe.skIst === n.summe.skPlan && n.summe.dbIst === n.summe.dbPlan);
  a.ist = { pos: { "P-1": { minuten: 187.5 } } };
  n = NK.angebot(a, r);
  const q = n.positionen[0];
  /* 125 → 187,5 min = +62,5 min × 65 €/h = +67,71 € Lohn · × 1,15 Gemeinkosten ≈ +77,86 € Selbstkosten */
  ok("NACHKALK: 50 % mehr Arbeitszeit → Selbstkosten +77,86 € (±1 Cent), Deckungsbeitrag sinkt genauso", Math.abs(q.skDiff - 7786) <= 1 && q.dbPlan - q.dbIst === q.skDiff && q.minutenPct === 50, q);
  ok("NACHKALK: die andere Position zählt mit dem Plan", n.summe.erfasst === 1 && n.summe.ausPlan === 1 && n.summe.skIst - n.summe.skPlan === q.skDiff);
  a.ist.pos["P-1"].materialCent = 0;
  ok("NACHKALK: 0 € Material ist ein erfasster Wert", NK.angebot(a, r).positionen[0].ist.mek === 0);
  a.ist.pos["P-1"] = { minuten: "" };
  ok("NACHKALK: leeres Feld heißt nicht erfasst, nicht 0", !NK.angebot(a, r).positionen[0].erfasst && NK.angebot(a, r).positionen[0].ist.fek === plan.fek);
  a.ist = { pos: { "P-1": { minuten: 187.5 } }, versandCent: (r.versand.cent || 0) + 500 };
  ok("NACHKALK: Versand Ist geht in die Selbstkosten", NK.angebot(a, r).summe.skIst - NK.angebot(a, r).summe.skPlan === NK.angebot(a, r).positionen[0].skDiff + 500);
  ok("WHITELIST: Nachkalkulation und Stichzahl bleiben intern", !/"ist"|187\.5|"stiche"|minuten/.test(JSON.stringify(WC.aussen.angebotExtern(a, r, {}, false))));

  /* Über mehrere Angebote: Faktor je Vorlage, nur gestellte */
  const b = A.neu([a], "2026-10-12"); const pb = A.neuePosition(b, kat, "tasse"); pb.menge = 10; pb.staffeln = [10]; A.stellen(b, kat);
  const planB = A.rechne(b, kat, null, false).positionen[0].erg.minuten;
  b.ist = { pos: { "P-1": { minuten: planB * 1.5 } } };
  const c = A.neu([a, b], "2026-10-12"); const pc = A.neuePosition(c, kat, "tasse"); pc.menge = 10; c.ist = { pos: { "P-1": { minuten: 9999 } } };
  const rf = (x) => A.rechne(x, kat, null, false);
  const zl = NK.jeVorlage([a, b, c], rf), z = zl.filter((x) => x.vorlage === "tasse")[0];
  ok("NACHKALK: nur gestellte Angebote zählen (Entwürfe nicht)", z && z.n === 2 && z.istMin === 187.5 + planB * 1.5, z);
  ok("NACHKALK: Faktor je Vorlage = Ist ÷ Plan (× 1,5)", z && z.faktor === 1.5 && !z.passt, z);
  const minVorher = K.position(kat, pos(kat, "tasse", { menge: 50 }), {}).minuten;
  const e = NK.kalibrieren(kat, z, "2026-10-12");
  const minNachher = K.position(kat, pos(kat, "tasse", { menge: 50 }), {}).minuten;
  ok("NACHKALK: übernommen — neue Positionen rechnen mit dem 1,5-fachen Zeit-Muster", e.ok && Math.abs(minNachher - minVorher * 1.5) < 0.01, [minVorher, minNachher]);
  ok("NACHKALK: gestellte Angebote bleiben, wie sie sind", A.rechne(a, kat, null, false).positionen[0].erg.minuten === 125);
  ok("NACHKALK: derselbe Befund wird nur einmal übernommen", !NK.kalibrieren(kat, z, "2026-10-12").ok && NK.schonUebernommen(kat, z));
  K.ruecknehmen(kat, "tasse", e.eintrag.nr);
  ok("NACHKALK: zurückgenommen → wieder wie vorher, und wieder übernehmbar", K.position(kat, pos(kat, "tasse", { menge: 50 }), {}).minuten === minVorher && !NK.schonUebernommen(kat, z));
  const fast = Object.assign({}, z, { faktor: 1.01, passt: true });
  ok("NACHKALK: unter 2 % Abweichung wird nichts übernommen", !NK.kalibrieren(kat, fast, "2026-10-12").ok);
}

/* ── Beispiel-Angebote: 15 Positionen in drei Arbeitsgebieten, Übergaben testbar ── */
{
  const kat = kopie(WC.START), L = [];
  WC.BEISPIEL_ANGEBOTE.forEach((b) => { const r = WC.beispielAngebot(L, kat, b.bid, "2026-10-12"); if (r.ok) L.push(r.angebot); });
  const posN = L.reduce((s, a) => s + a.positionen.length, 0);
  ok("BEISPIEL: fünf Angebote mit zusammen 10–15 Positionen", L.length === 5 && posN >= 10 && posN <= 15, posN);
  ok("BEISPIEL: fehlende Arbeitsgebiete werden mitgeholt", WC.katalog.gebietDa(kat, "stickerei") && WC.katalog.gebietDa(kat, "dienstleistung") && WC.katalog.pruefe(kat).length === 0);
  const gebiete = new Set(L.flatMap((a) => a.positionen.map((p) => K.finde(kat.vorlagen, p.vorlage).gebiet)));
  ok("BEISPIEL: alle drei Arbeitsgebiete kommen vor", gebiete.size === 3, [...gebiete]);
  const rs = L.map((a) => A.rechne(a, kat, a.kunde, false));
  ok("BEISPIEL: jede Position ist kalkuliert und hat einen Preis", rs.every((r) => r.positionen.every((x) => x.erg.ok && x.erg.netto > 0)), rs.flatMap((r) => r.positionen.filter((x) => !x.erg.ok).map((x) => x.pos.titel + ": " + x.erg.offen)));
  ok("BEISPIEL: Kunden sind erkennbar erfunden", L.every((a) => /Beispiel/.test(a.kunde.name) && /Musterstadt/.test(a.kunde.anschrift)));
  ok("BEISPIEL: ein Beispiel wird nicht doppelt geladen", !WC.beispielAngebot(L, kat, "verein").ok && L.length === 5);
  ok("BEISPIEL: fortlaufende Nummern AN-2026-0001 … 0005", L.map((a) => a.nummer).join() === "AN-2026-0001,AN-2026-0002,AN-2026-0003,AN-2026-0004,AN-2026-0005");
  const ds = L.map((a, i) => WC.aussen.angebotExtern(a, rs[i], { name: "Werkstatt Beispiel" }, false));
  ok("BEISPIEL: jedes geht als WorkFloh-Auftrag hinaus (Kunde, alle Positionen)", ds.every((d) => { const au = WC.uebergabe.auftrag(d); const t = JSON.stringify(au); return au.status === "angebot" && t.includes(d.kunde.name) && d.positionen.every((p) => t.includes(p.titel)); }));
  ok("BEISPIEL: jedes geht an BookLedgerPro, und die Summe stimmt auf den Cent", ds.every((d) => { const n = WC.uebergabe.blpNutzlast(d); return WC.uebergabe.blpAdresse(d).ok && n.positionen.reduce((s, x) => s + x.menge * x.einzelpreisCent, 0) === d.summen.netto; }));
  const ih = L.findIndex((a) => a.beispiel === "hochzeit");
  ok("BEISPIEL: statt Geburtstag gibt es Firmenjubiläum und Hochzeit", ih >= 0 && L.some((a) => a.beispiel === "jubilaeum") && !L.some((a) => /Geburtstag/.test(a.titel)));
  ok("BEISPIEL: C-Kunde (Hochzeit) zahlt je Stück mehr als derselbe Artikel bei B", ih >= 0 && (() => {
    const p = rs[ih].positionen[0].pos, b = Object.assign({}, L[ih].kunde, { klasse: "B" });
    return K.position(kat, p, { angebot: L[ih], kunde: L[ih].kunde }).netto > K.position(kat, p, { angebot: L[ih], kunde: b }).netto; })());
}

/* ── KI-Recherche: nur belegte Preise, ungeprüft, nichts Internes hinaus ── */
{
  const R = WC.recherche, { teilA, teilB } = await import(pathToFileURL(join(WURZEL, "tests/daten/ki-antwort.mjs")).href);
  const kat = kopie(WC.START); K.finde(kat.materialien, "tasse_11").ekCent = 731;
  const v = K.finde(kat.vorlagen, "tasse"), p = pos(kat, "tasse", { menge: 50, titel: "GEHEIM-TITEL", beschreibung: "GEHEIM-BESCHREIBUNG" });
  const info = R.auftragsInfo(v, p, kat), body = JSON.stringify(R.anfrage(info));
  ok("RECHERCHE: hinaus gehen nur Produktangaben (kein Titel, keine Beschreibung, kein EK)", /50 Stk\. · Tasse bedrucken/.test(body) && !/GEHEIM|731|7,31/.test(body), body.slice(0, 300));
  ok("RECHERCHE: Websuche (web_search), höchstens 5 Suchen, Modell claude-opus-5-5", /"type":"web_search_20260209"/.test(body) && /"max_uses":5/.test(body) && /"model":"claude-opus-5-5"/.test(body));
  ok("RECHERCHE: Zahlen in deutscher und englischer Schreibweise", R.lesarten("1.234,56").includes(123456) && R.lesarten("1,234.56").includes(123456) && R.lesarten("4.90").includes(490) && R.lesarten("5").includes(500));
  const a = R.auswerten([teilA(), teilB()], info, "2026-10-12");
  const f1 = a.funde.find((f) => f.menge === 50);
  ok("RECHERCHE: belegter Preis wird übernommen — mit Quelle, Zitat, „ungeprüft“", f1 && f1.stueckCent === 690 && f1.versandCent === 495 && f1.ungeprueft === true && /druck-beispiel\.example/.test(f1.quelle) && /6,90/.test(f1.zitat), a.funde);
  ok("RECHERCHE: Quelle, die die Suche nicht geliefert hat, wird verworfen", a.verworfen.some((x) => /Erfunden/.test(x.zeile) && /nicht aus der Websuche/.test(x.grund)), a.verworfen);
  ok("RECHERCHE: Zahl, die nicht im Zitat steht, wird verworfen (nicht geraten)", a.verworfen.some((x) => /Grosshandel/.test(x.zeile) && /nicht im zitierten Text/.test(x.grund)) && !a.funde.some((f) => f.klasse === "import"), a.verworfen);
  const f2 = a.funde.find((f) => f.menge === 100);
  ok("RECHERCHE: Gesamtpreis brutto → Stück netto, und es steht dabei", f2 && f2.stueckCent === 500 && /brutto/.test(f2.notiz) && /Gesamtpreis/.test(f2.notiz), f2);
  ok("RECHERCHE: Kosten gerechnet (2 Suchen, Tokens) und Suchfehler genannt", a.kosten.suchen === 2 && a.kosten.usdGerechnet === 0.1 && a.fehler.includes("too_many_requests"), a.kosten);
  const mv = MK.vergleich([Object.assign({}, f1)], 50, 1000, {}, "2026-10-12", 500);
  ok("RECHERCHE: ungeprüfte Preise zählen nicht im Marktvergleich", !mv.klassen.some((k) => k.daten) && mv.ungeprueft === 1);
  /* Aufruf mit gestellter Gegenseite: pause_turn wird fortgesetzt, Kopfzeilen stimmen */
  const anfragen = [];
  const stell = (antworten) => async (url, o) => { anfragen.push({ url, o }); const j = antworten.shift(); return { ok: true, status: 200, json: async () => j }; };
  const r2 = await R.rufen("sk-ant-test", info, stell([teilA(), teilB()]), "2026-10-12");
  ok("RECHERCHE: pause_turn wird fortgesetzt (zweite Anfrage trägt die erste Antwort)", anfragen.length === 2 && JSON.parse(anfragen[1].o.body).messages.length === 2 && r2.funde.length === 2);
  ok("RECHERCHE: Kopfzeilen für den Browser (Schlüssel, Version, direkter Zugriff)", anfragen[0].url === "https://api.anthropic.com/v1/messages" && anfragen[0].o.headers["x-api-key"] === "sk-ant-test" &&
    anfragen[0].o.headers["anthropic-dangerous-direct-browser-access"] === "true" && anfragen[0].o.headers["anthropic-version"] === "2023-06-01");
  const fehl = await R.rufen("sk-ant-x", info, async () => ({ ok: false, status: 401, json: async () => ({ error: { message: "invalid x-api-key" } }) })).then(() => "", (e) => e.message);
  ok("RECHERCHE: abgewiesener Schlüssel → Fehler mit Grund, nichts übernommen", /invalid x-api-key/.test(fehl));
  const abl = await R.rufen("sk-ant-x", info, stell([{ stop_reason: "refusal", content: [] }])).then(() => "", (e) => e.message);
  ok("RECHERCHE: Ablehnung (refusal) wird gemeldet, nicht als leeres Ergebnis", /abgelehnt/.test(abl));
}

/* ── HANDELSWARE (Klaus 2026-10-13): fertig eingekauft, mit Aufschlag weiterverkauft ── */
{
  const KA = WC.katalog, kat = kopie(WC.START);
  ok("KATALOG: ein Katalog ohne Lieferanten-Liste (von vor der Handelsware) ist fehlerfrei", KA.pruefe(kat).length === 0 && kat.lieferanten === undefined);
  KA.gebietHinzufuegen(kat, WC.STARTKATALOGE.handelsware);
  ok("KATALOG: Handelsware dazu — fehlerfrei, Lieferanten-Liste angelegt", KA.pruefe(kat).length === 0 && Array.isArray(kat.lieferanten), KA.pruefe(kat));
  ok("LIEFERANT: die Startliste trägt nichts Ungeprüftes ein (keine Lieferanten, Einkäufe ohne Lieferant)",
    WC.STARTKATALOGE.handelsware.lieferanten.length === 0 && WC.STARTKATALOGE.handelsware.vorlagen.every((v) => v.einkauf.every((e) => !e.lieferant && !e.url)));
  ok("LIEFERANT: Vorschläge haben eine https-Adresse und KEIN Prüfdatum", WC.LIEFERANTEN_VORSCHLAEGE.length >= 5 && WC.LIEFERANTEN_VORSCHLAEGE.every((x) => /^https:\/\//.test(x.url) && !x.geprueftAm && ["wiederverkaeufer", "privat", "beides"].includes(x.fuer) && typeof x.anmeldung === "boolean"));
  ok("LIEFERANT: javascript:- oder http-Adresse wird nicht zum Link", KA.sichereAdresse("javascript:alert(1)") === "" && KA.sichereAdresse("http://x.example/") === "" && KA.sichereAdresse(" https://x.example/a ") === "https://x.example/a");
  ok("HANDEL: Einkaufsprodukte stehen nicht unter den selbst gefertigten", KA.eigenfertigung(kat).every((v) => !v.einkaufsprodukt) && ["kuli_zukauf", "visitenkarten_zukauf", "tasse_sublimation_zukauf", "pin_emaille_zukauf"].every((id) => KA.handelsware(kat).some((v) => v.id === id)));

  /* Handrechnung aus dem Brief: 500 Kulis 120,00 € inkl. Versand, 25 % Handlungskosten, 20 % Gewinn → 180,00 € netto */
  const a = A.neu([], "2026-10-13"), p = A.neuePosition(a, kat, "kuli_zukauf");
  const r = A.rechne(a, kat, null, false), e = r.positionen[0].erg;
  ok("HANDEL: Handrechnung — 120,00 + 25 % = 150,00 + 20 % = 180,00 € netto", e.ok && e.handel.bezugspreis === 12000 && e.handel.handlungskosten === 3000 && e.selbstkosten === 15000 && e.handel.gewinn === 3000 && e.netto === 18000 && e.stueckCent === 36, e);
  ok("HANDEL: kein eigener Versandposten — der Versand steckt in Einkauf und Verkauf", r.versand.leer === true && r.summen.netto === 18000, r.versand);
  ok("HANDEL: der Rechenweg nennt die Handelskalkulation Zeile für Zeile", e.schema.zeilen.length === 5 && /inkl\. Versand/.test(e.schema.zeilen[0].text) && e.schema.listenpreis === 18000);
  ok("HANDEL: Platzhalter-Preis wird als Platzhalter gemeldet", e.platzhalter === true);
  const c = K.position(kat, p, { kunde: { klasse: "C" } });
  ok("HANDEL: C-Kunde — Gewinn 20 % + 10 % → 195,00 €", c.netto === 19500, c.netto);

  const v = K.finde(kat.vorlagen, "visitenkarten_zukauf"), pv = A.neuePosition(a, kat, "visitenkarten_zukauf");
  ok("HANDEL: Staffel aus den eingetragenen Einkaufsmengen (250, 500, 1000)", pv.staffeln.join() === "250,500,1000" && pv.menge === 250);
  pv.menge = 300;
  const z = K.position(kat, pv, {});
  ok("HANDEL: Zwischenmenge (300) wird NICHT geschätzt — nicht kalkuliert, mit den eingetragenen Mengen", !z.ok && /300 Stk\. ist kein Einkauf eingetragen \(eingetragen: 250, 500, 1000\)/.test(z.offen[0]), z.offen);
  ok("HANDEL: die nicht kalkulierte Zwischenmenge zählt nicht in die Summe", A.rechne(a, kat, null, false).summen.offen === 1);
  pv.menge = 500;
  v.einkauf.push({ menge: 500, gesamtCent: 2500, lieferant: "", url: "", datum: "2026-10-13" }, { menge: 500, gesamtCent: 3500, lieferant: "", url: "", datum: "2026-10-13" });
  const g = K.position(kat, pv, {});
  ok("HANDEL: mehrere Einkäufe für dieselbe Menge — der günstigste zählt, und es steht dabei", g.handel.bezugspreis === 2500 && g.weg.some((w) => /3 Einkäufe/.test(w)), g.weg);
  v.einkauf.push({ menge: 2000, gesamtCent: null });
  const f = K.position(kat, Object.assign(kopie(pv), { menge: 2000 }), {});
  ok("HANDEL: fehlender Einkaufspreis → nicht kalkuliert, nicht 0", !f.ok && /Einkaufspreis für 2000 Stk\. fehlt/.test(f.offen[0]), f.offen);
  const halb = kopie(kat); K.finde(halb.vorlagen, "kuli_zukauf").einkauf.push({ menge: null, gesamtCent: null, lieferant: "gibt_es_nicht", url: "" });
  ok("KATALOG: halb ausgefüllte Einkaufszeile hält den Katalog nicht auf (nur ein Hinweis)", KA.pruefe(halb).length === 0 && KA.hinweise(halb).length === 2, [KA.pruefe(halb), KA.hinweise(halb)]);

  /* Eine eigene Vorlage (Tasse: Versand „stueck“, eigene Staffel) wird per Haken zum Einkaufsprodukt —
     die Beispiele oben tragen schon versandArt „keiner“ und passende Staffeln und könnten das nicht zeigen */
  const tv = K.finde(kat.vorlagen, "tasse"); tv.einkaufsprodukt = true; tv.einkauf = [{ menge: 50, gesamtCent: 20000 }, { menge: 100, gesamtCent: 36000 }];
  const ta = A.neu([], "2026-10-13"), tp = A.neuePosition(ta, kat, "tasse"), tr = A.rechne(ta, kat, null, false);
  ok("HANDEL: per Haken umgestellte Vorlage — kein eigener Versandposten (Tasse, sonst Versand „stueck“)", tv.versandArt !== "keiner" && tr.versand.leer === true && tr.summen.netto === 30000, tr.versand);
  ok("HANDEL: per Haken umgestellte Vorlage — Staffel aus den Einkaufsmengen statt der alten Staffel", tp.staffeln.join() === "50,100" && tp.menge === 50 && tv.staffelVorgabe.join() !== "50,100", [tp.staffeln, tv.staffelVorgabe]);

  /* Einfrieren: der Einkauf gehört zum Stand */
  const b = A.neu([], "2026-10-13"); A.neuePosition(b, kat, "kuli_zukauf"); A.stellen(b, kat);
  K.finde(kat.vorlagen, "kuli_zukauf").einkauf[0].gesamtCent = 50000;
  ok("HANDEL: gestelltes Angebot behält den Einkauf von damals", A.rechne(b, kat, null, false).summen.netto === 18000);

  /* Nachkalkulation: Ist-Einkauf gegen Plan */
  const nk0 = WC.nachkalk.angebot(b, A.rechne(b, kat, null, false));
  ok("NK-HANDEL: ohne Ist zählt der Plan, und das wird gesagt", nk0.summe.ausPlan === 1 && nk0.positionen[0].handel && nk0.positionen[0].dbIst === 3000);
  b.ist = { pos: { "P-1": { einkaufCent: 13000 } } };
  const nk = WC.nachkalk.angebot(b, A.rechne(b, kat, null, false)).positionen[0];
  ok("NK-HANDEL: Einkauf 130,00 statt 120,00 → Selbstkosten 162,50, Deckungsbeitrag 17,50", nk.erfasst && nk.ist.einkauf === 13000 && nk.einkaufDiff === 1000 && nk.ist.selbstkosten === 16250 && nk.dbIst === 1750, nk);
}

/* ── WHITELIST HANDELSWARE: Lieferant, Link und Einkaufspreis gehen nie hinaus ── */
{
  const kat = kopie(WC.START); WC.katalog.gebietHinzufuegen(kat, WC.STARTKATALOGE.handelsware);
  kat.lieferanten.push({ id: "lf_pruef", name: "LIEFERANT-PRUEFWORT", url: "https://lieferant-pruefwort.example/", fuer: "wiederverkaeufer", anmeldung: true, geprueftAm: "2026-10-13" });
  K.finde(kat.vorlagen, "kuli_zukauf").einkauf = [{ menge: 500, gesamtCent: 12345, lieferant: "lf_pruef", url: "https://lieferant-pruefwort.example/kuli-4711", datum: "2026-10-13" }];
  const a = A.neu([], "2026-10-13"); a.kunde = { name: "Kunde Beispiel", anschrift: "", klasse: "B" };
  A.neuePosition(a, kat, "kuli_zukauf"); A.neuePosition(a, kat, "tasse").menge = 50;
  const r = A.rechne(a, kat, a.kunde, false);
  ok("WHITELIST: Handelsware — der Prüfwert wird wirklich gerechnet (Einkauf 123,45 € → 185,17 €)", r.positionen[0].erg.ok && r.positionen[0].erg.netto === 18517 && /LIEFERANT-PRUEFWORT/.test(r.positionen[0].erg.weg.join(" ")));
  const d = WC.aussen.angebotExtern(a, r, { name: "Firma" }, false), j = JSON.stringify(d);
  const verbot = /PRUEFWORT|pruefwort|kuli-4711|lf_pruef|12345|123,45|lieferant|einkauf|bezugspreis|handlungskosten/i;
  ok("WHITELIST: Handelsware — kein Lieferant, kein Link, kein Einkaufspreis im Kundenblatt", !verbot.test(j), j.match(verbot));
  ok("WHITELIST: Handelsware — die Position steht da (Verkauf 185,17 €)", d.positionen.some((x) => x.gesamtCent === 18517 && x.menge === 500));
  const jb = JSON.stringify(WC.uebergabe.buendel([WC.uebergabe.auftrag(d, "2026-10-13T10:00:00Z")], "2026-10-13T10:00:00Z"));
  ok("UEBERGABE: Handelsware — nichts davon in der Auftragsdatei für WorkFloh", !verbot.test(jb), jb.match(verbot));
  const ad = WC.uebergabe.blpAdresse(d), jn = JSON.stringify(ad.nutzlast);
  ok("BLP: Handelsware — nichts davon in der Nutzlast an BookLedgerPro", ad.ok && !verbot.test(jn) && !verbot.test(decodeURIComponent(ad.url)), jn.match(verbot));
}

/* ── LASERGRAVUR in drei Stufen, Fremdfertigung wenn das Gerät fehlt (Klaus 2026-10-13) ── */
{
  const KA = WC.katalog, kat = kopie(WC.START); KA.gebietHinzufuegen(kat, WC.STARTKATALOGE.laser);
  ok("LASER: Gebiet fehlerfrei, drei Laser-Stufen", KA.pruefe(kat).length === 0 && ["laser_diode", "laser_co2", "laser_faser"].every((id) => K.finde(kat.verfahren, id)), KA.pruefe(kat));
  const eigen = kat.vorlagen.filter((v) => v.gebiet === "laser" && !v.einkaufsprodukt), wahl = (id) => K.finde(kat.vorlagen, id).verfahrenWahl;
  ok("LASER: technische Regel — klares Glas und Acryl nur CO2, blanker Edelstahl nur Faser, Holz und Leder nie Faser",
    wahl("name_sektglas").join() === "laser_co2" && wahl("name_acryl").join() === "laser_co2" && wahl("name_oeffner").join() === "laser_faser" && wahl("name_kuli_edelstahl").join() === "laser_faser" &&
    !wahl("name_karte_holz").includes("laser_faser") && !wahl("name_leder").includes("laser_faser") &&
    eigen.every((v) => !(v.verfahrenWahl.includes("laser_diode") && /glas|acryl|edelstahl|oeffner/.test(v.id))), eigen.map((v) => [v.id, v.verfahrenWahl]));
  const pos1 = (id, m) => { const a = A.neu([], "2026-10-13"), p = A.neuePosition(a, kat, id); p.menge = m; return { a, p, e: K.position(kat, p, {}) }; };
  const k1 = pos1("name_karte_holz", 1).e, k60 = pos1("name_karte_holz", 60).e;
  ok("LASER: Einzelstück mit Namen rechnet (CO2 in der Werkstatt), 60 Namen sind je Stück günstiger", k1.ok && k60.ok && k60.stueckCent < k1.stueckCent && k60.minuten > k1.minuten, [k1.netto, k60.stueckCent, k1.minuten, k60.minuten]);
  const o = pos1("name_oeffner", 1).e;
  ok("FREMD: Gerät fehlt (Faserlaser) — nicht kalkuliert, nicht geschätzt, die Fremdfertigung steht dabei", !o.ok && /Faserlaser 30 W: kein eigenes Gerät — fremd fertigen lassen/.test(o.offen.join()) && o.fremd === "name_oeffner_zukauf", o.offen);
  const k2 = kopie(kat); K.finde(k2.verfahren, "laser_faser").vorhanden = true;
  const o2 = K.position(k2, pos1("name_oeffner", 1).p, {});
  ok("FREMD: Haken „Gerät in der Werkstatt“ gesetzt — dann rechnet die Eigenfertigung", o2.ok && !o2.fremd, o2.offen);
  ok("FREMD: ohne Feld „vorhanden“ (ältere Kataloge) gilt das Gerät als da", K.position(kat, pos(kat, "tasse", { menge: 10 }), {}).ok);
  ok("FREMD: jede Laser-Vorlage hat ihre Fremdfertigung als Einkaufsprodukt mit Einkauf ab 1 Stück",
    eigen.length === 8 && eigen.every((v) => { const z = K.finde(kat.vorlagen, v.fremdVorlage); return z && z.einkaufsprodukt && K.einkaufsMengen(z)[0] === 1 && z.titelVorgabe === v.titelVorgabe; }));
  ok("BILDER: jede Laser-Vorlage hat Beispiele mit zwei Zeichnungen", eigen.every((v) => v.beispiele.length && v.beispiele.every((b) => b.ansichten.length >= 2 && b.ansichten.every((x) => WC.bildUrl(x[1]).startsWith("data:image/svg+xml")))));

  /* Kundenblatt: der Kunde liest den Kunden-Titel — nie „Zukauf“, „Lohngravur“, den Laser oder die Herstellung */
  KA.gebietHinzufuegen(kat, WC.STARTKATALOGE.handelsware);
  const a = A.neu([], "2026-10-13"); a.kunde = { name: "Brautpaar Beispiel", anschrift: "", klasse: "C" };
  A.neuePosition(a, kat, "name_oeffner_zukauf"); A.neuePosition(a, kat, "name_sektglas"); A.neuePosition(a, kat, "kuli_zukauf"); A.neuePosition(a, kat, "tasse_sublimation_zukauf");
  const r = A.rechne(a, kat, a.kunde, false), d = WC.aussen.angebotExtern(a, r, {}, false), j = JSON.stringify(d);
  const intern = /Zukauf|Lohngravur|Hersteller|herstellung|Faserlaser|CO2|Sublimation|Tampondruck/i;
  ok("WHITELIST: Kunden-Titel ohne Zukauf, Lohngravur, Laser oder Herstellungsweg", d.positionen.length === 4 && !intern.test(j) && d.positionen.some((x) => x.titel === "Flaschenöffner mit Namensgravur"), j.match(intern));
  const jb = JSON.stringify(WC.uebergabe.auftrag(d, "2026-10-13T10:00:00Z")) + JSON.stringify(WC.uebergabe.blpNutzlast(d));
  ok("UEBERGABE: auch WorkFloh und BookLedgerPro sehen keinen Herstellungsweg", !intern.test(jb), jb.match(intern));
}

/* ── STUFE 2: Klaus' Symbol ── */
ok("ICON: App-Symbole sind aus Klaus' Vorlage gebaut (Grundfarbe rot)", existsSync(join(WURZEL, "icons/quelle/icon-klaus.png")) && /icon-klaus\.png/.test(lies("tools/icons-bauen.py")));

console.log(`kern: ${gruen} grün · ${rot} ROT`);
process.exit(rot ? 1 : 0);
