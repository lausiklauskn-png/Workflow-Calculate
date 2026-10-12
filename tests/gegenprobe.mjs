/* Gegenprobe — baut je Fall EINEN Fehler in eine Wegwerf-Kopie und verlangt,
   dass die Probe genau an der genannten Stelle rot wird.
     node tests/gegenprobe.mjs                 alle Fälle
     NUR_FALL="MD:" node tests/gegenprobe.mjs  nur Fälle, deren Name so beginnt
     NUR_ANKER=1 node tests/gegenprobe.mjs     nur prüfen, dass jeder Anker genau
                                               EINMAL in seiner Datei steht (Sekunden)
   Ergebnis je Fall: gefangen · BLIND (Probe blieb grün) · FALSCHER GRUND (rot,
   aber nicht mit der erwarteten Zeile) · TOTER ANKER (Sabotage griff nicht).
   Der echte Baum wird nie angefasst: gearbeitet wird in einer Kopie unter /tmp. */
import { cpSync, mkdtempSync, readFileSync, writeFileSync, rmSync, symlinkSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const WURZEL = join(dirname(fileURLToPath(import.meta.url)), "..");
const K = "kern", B = "browser";
const FAELLE = [
  { name: "LEHRBUCH: Skonto nicht im Hundert gerechnet", probe: K, erwartet: "KALK: Lehrbuch — Zielverkaufspreis",
    an: [["assets/kern/kalkulation.js", "var zvp = abzug > 0 ? rund(bvp / abzug) : NaN;", "var zvp = abzug > 0 ? rund(bvp * (2 - abzug)) : NaN;"]] },
  { name: "FARBEN: Material nicht je Farbe", probe: K, erwartet: "FARBEN: 3-farbig Flex braucht dreimal die Folie",
    an: [["assets/kern/kalkulation.js", "var fak = sl.jeFarbe ? ff : 1;", "var fak = 1;"]] },
  { name: "FARBEN: Digitaltransfer zählt die Farben doch", probe: K, erwartet: "FARBEN: vierfarbiger Digitaltransfer",
    an: [["assets/kern/kalkulation.js", 'var ff = regel === "je_farbe" ? farben : 1;', 'var ff = regel === "ein" ? 1 : farben;']] },
  { name: "KLASSE: Klasse wirkt auch auf den Satz an der Position", probe: K, erwartet: "SATZ: an der Position gesetzter Satz gilt",
    an: [["assets/kern/kalkulation.js", 'if (quelle[k] !== "position" && quelle[k] !== "angebot" && zahl(kl.stundenPct))', "if (zahl(kl.stundenPct))"]] },
  { name: "OFFEN: fehlender Einkaufspreis zählt als 0", probe: K, erwartet: "OFFEN: fehlender Einkaufspreis",
    an: [["assets/kern/kalkulation.js", 'if (ek == null) { offen.push(mat.name + ": Einkaufspreis fehlt"); return; }', "if (ek == null) ek = 0;"]] },
  { name: "LERNEN: Rücknehmen stellt nichts her", probe: K, erwartet: "LERNEN: gewinn — Rücknehmen",
    an: [["assets/kern/kalkulation.js", "v.saetze = kopie(e.alt.saetze); v.schritte = kopie(e.alt.schritte);", ""]] },
  { name: "STAFFEL: Rüstzeit wird je Stück gerechnet", probe: K, erwartet: "STAFFEL: Rüstzeit fällt einmal an",
    an: [["assets/kern/kalkulation.js", "var min = (ruest + jeSt * menge + jeM2 * m2Motiv) * fak;", "var min = (ruest * menge + jeSt * menge + jeM2 * m2Motiv) * fak;"]] },
  { name: "MENGE: Rolle wird nie gedreht", probe: K, erwartet: "MENGE: Rolle",
    an: [["assets/kern/mengen.js", "if (n1 > n2 || (n1 === n2 && h <= b)) return", "if (true) return"]] },
  { name: "WHITELIST: Selbstkosten im Kundenblatt", probe: K, erwartet: "WHITELIST: keine internen Felder",
    an: [["assets/kern/aussen.js", "menge: c(x.erg.menge), stueckCent:", "menge: c(x.erg.menge), selbstkosten: c(x.erg.selbstkosten), stueckCent:"]] },
  { name: "WHITELIST: Kundenklasse geht hinaus", probe: K, erwartet: "WHITELIST: keine internen Felder",
    an: [["assets/kern/aussen.js", "return { name: s(k.name), anschrift: s(k.anschrift) };", "return { name: s(k.name), anschrift: s(k.anschrift), klasse: s(k.klasse) };"]] },
  { name: "VERSAND: passt nichts → still 0", probe: K, erwartet: "VERSAND: passt nichts",
    an: [["assets/kern/versand.js", 'if (!kandidaten.length) return { ok: false, grund: "kein Tarif passt — von Hand setzen" };', "if (!kandidaten.length) return { ok: true, cent: 0 };"]] },
  { name: "VERSAND: kein Sperrgut-Zuschlag", probe: K, erwartet: "VERSAND: Überlänge",
    an: [["assets/kern/versand.js", "cent += n(dienst.sperrgutCent); sperr = true;", ""]] },
  { name: "MARKT: Import gilt bei jeder Menge", probe: K, erwartet: "MARKT: Import gilt erst",
    an: [["assets/kern/markt.js", "aktiv: menge >= grenze,", "aktiv: true,"]] },
  { name: "MARKT: erfundene Spanne ohne Daten", probe: K, erwartet: "MARKT: ohne eingetragene Preise",
    an: [["assets/kern/markt.js", "if (!preise.length) return Object.assign(r, { daten: false });", "if (!preise.length) preise = [1000];"]] },
  { name: "EINFRIEREN: gestelltes Angebot rechnet mit dem aktuellen Katalog", probe: K, erwartet: "EINFRIEREN: gestelltes",
    an: [["assets/kern/angebot.js", "function katalogFuer(a, kat) { return a.stand || kat; }", "function katalogFuer(a, kat) { return kat; }"]] },
  { name: "PAGES: .gitignore sperrt nur das Verzeichnis", probe: K, erwartet: "PAGES: .gitignore sperrt node_modules",
    an: [[".gitignore", "node_modules", "node_modules/"]] },
  { name: "BLATT: Selbstkosten auf dem Kundenblatt", probe: B, erwartet: "BLATT: keine Selbstkosten",
    an: [["assets/app.js", "return blattAngebot(WC.aussen.angebotExtern(a, r, S.einst.firma, S.einst.kleinunternehmer));",
      'var bl = blattAngebot(WC.aussen.angebotExtern(a, r, S.einst.firma, S.einst.kleinunternehmer)); bl.append(h("p", { text: "Selbstkosten " + euro(r.summen.selbstkosten) })); return bl;']] },
  { name: "NACHBESSERN: Tipp aufs Feld ändert sofort", probe: B, erwartet: "NACHBESSERN: ein Tipp aufs Feld ändert noch nichts",
    an: [["assets/app.js", "onclick: function () { S.offen[schluessel] = an ? null : c[0]; zeichne(); } });",
      "onclick: function () { var al = alternativen(p, v, e, kat, c[0])[0]; if (al) { al.tun(p); merken(a); } S.offen[schluessel] = an ? null : c[0]; zeichne(); } });"]] },
  { name: "NACHBESSERN: Werkzeuge immer offen", probe: B, erwartet: "NACHBESSERN: Werkzeuge sind eingeklappt",
    an: [["assets/app.js", 'if (S.offen[p.id + ":nachbessern"]) karte.append(erklaerChips', "if (true) karte.append(erklaerChips"]] },
  { name: "ZURÜCK: stellt nichts her", probe: B, erwartet: "ZURÜCK:",
    an: [["assets/app.js", "Object.assign(a, JSON.parse(st.pop())); merken(a); zeichne();", "st.pop(); merken(a); zeichne();"]] },
  { name: "SCHRITTE: Kunde gilt immer als erledigt", probe: B, erwartet: "SCHRITTE: nächster Schritt ist „Kunde“",
    an: [["assets/app.js", '["kunde", "1 Kunde", !!(kunde && kunde.name),', '["kunde", "1 Kunde", true,']] },
  { name: "UEBERGABE: interne Werte in der Auftragsdatei", probe: B, erwartet: "UEBERGABE: nichts Internes",
    an: [["assets/app.js", "var auf = WC.uebergabe.auftrag(d);", 'var auf = WC.uebergabe.auftrag(d); auf.data.beschreibung += " Selbstkosten " + r.summen.selbstkosten;']] },
  { name: "ABKÜRZEN: Kopie ohne Positionen", probe: B, erwartet: "ABKÜRZEN: ein Angebot wird",
    an: [["assets/app.js", "a.positionen = kopie(alt.positionen);", "a.positionen = [];"]] },
  { name: "BEISPIELE: Ansicht wechselt nicht", probe: B, erwartet: "BEISPIELE: mehrere Ansichten",
    an: [["assets/app.js", "onclick: function () { S.offen[schl] = j; zeichne(); }", "onclick: function () { zeichne(); }"]] },
  { name: "LERNEN: eigener Preis bleibt nach dem Übernehmen stehen", probe: B, erwartet: "LERNEN: nach dem Übernehmen",
    an: [["assets/app.js", "vorher(a); p.eigen = Object.assign({}, p.eigen); delete p.eigen[e.menge]; merken(a);", "vorher(a); merken(a);"]] },
  { name: "VERLUST: keine Warnung unter den Kosten", probe: B, erwartet: "VERLUST:",
    an: [["assets/app.js", "if (lageText) karte.append(", "if (false) karte.append("]] },
];

function vorkommen(text, teil) { let n = 0, i = 0; while ((i = text.indexOf(teil, i)) >= 0) { n++; i += teil.length; } return n; }

const nurFall = process.env.NUR_FALL || "";
const nurAnker = !!process.env.NUR_ANKER;
const faelle = FAELLE.filter((f) => f.name.startsWith(nurFall));
let gefangen = 0, blind = 0, falsch = 0, tot = 0;

/* 1 · Anker: jede Stelle steht genau einmal im echten Baum */
for (const f of faelle) {
  for (const [datei, alt] of f.an) {
    const n = vorkommen(readFileSync(join(WURZEL, datei), "utf8"), alt);
    if (n !== 1) { tot++; console.log(`TOTER ANKER  ${f.name}  — ${datei}: ${n}× statt 1×: ${alt.slice(0, 70)}`); }
  }
}
if (nurAnker) {
  console.log(`Anker: ${faelle.length} Fälle · ${tot} tot`);
  process.exit(tot ? 1 : 0);
}

/* 2 · Ausgangslage: die Proben sind in einer frischen Kopie grün */
function kopie() {
  const d = mkdtempSync(join(tmpdir(), "wc-gp-"));
  cpSync(WURZEL, d, { recursive: true, filter: (q) => !/[/\\](node_modules|\.git)([/\\]|$)/.test(q) });
  if (existsSync(join(WURZEL, "node_modules"))) symlinkSync(join(WURZEL, "node_modules"), join(d, "node_modules"), "dir");
  return d;
}
function lauf(d, probe) {
  const r = spawnSync(process.execPath, [join(d, "tests", probe + ".mjs")], { encoding: "utf8", timeout: 300000 });
  return { code: r.status, out: (r.stdout || "") + (r.stderr || "") };
}
const basis = kopie();
for (const p of [K, B]) {
  const r = lauf(basis, p);
  if (r.code !== 0) { console.log(`Ausgangslage: ${p} ist schon vor der Gegenprobe ${r.code === 2 ? "nicht lauffähig" : "rot"}:\n${r.out}`); rmSync(basis, { recursive: true, force: true }); process.exit(2); }
}
rmSync(basis, { recursive: true, force: true });

/* 3 · je Fall eine eigene Kopie */
for (const f of faelle) {
  const d = kopie();
  let griff = true;
  for (const [datei, alt, neu] of f.an) {
    const t = readFileSync(join(d, datei), "utf8");
    if (vorkommen(t, alt) !== 1) { griff = false; break; }
    writeFileSync(join(d, datei), t.replace(alt, () => neu));
  }
  if (!griff) { console.log(`TOTER ANKER   ${f.name}`); rmSync(d, { recursive: true, force: true }); continue; }
  const r = lauf(d, f.probe);
  const rote = r.out.split("\n").filter((z) => z.startsWith("ROT"));
  if (r.code === 0) { blind++; console.log(`BLIND         ${f.name}`); }
  else if (rote.some((z) => z.includes(f.erwartet))) { gefangen++; console.log(`gefangen      ${f.name}`); }
  else { falsch++; console.log(`FALSCHER GRUND ${f.name}\n    erwartet: ${f.erwartet}\n    ${rote.slice(0, 3).join("\n    ") || r.out.slice(0, 300)}`); }
  rmSync(d, { recursive: true, force: true });
}
console.log(`Gegenprobe: ${gefangen} gefangen · ${blind} blind · ${falsch} aus falschem Grund · ${tot} tote Anker (${faelle.length} Fälle)`);
process.exit(blind || falsch || tot ? 1 : 0);
