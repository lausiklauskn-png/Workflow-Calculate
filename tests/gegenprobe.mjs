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
/* Die Kopie liegt unter /tmp — die Klone daneben (BookLedgerPro, die WorkFlohs) findet sie dort nicht.
   Ohne diese Zeilen wären die Parser- und Import-Proben in jeder Kopie übersprungen und ihre Fälle blind. */
for (const [k, rel] of [["BLP_KLON", "BookLedgerPro"], ["WORKFLOH_KLON", "Mein-WorkFloh"], ["TOMYS_KLON", "Tomys-Hub/workfloh"]]) {
  if (!process.env[k] && existsSync(join(WURZEL, "..", rel))) process.env[k] = join(WURZEL, "..", rel);
}
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
    an: [["assets/kern/aussen.js", "menge: c(x.erg.menge), einheit: einheitVon(r, x.pos), stueckCent:", "menge: c(x.erg.menge), einheit: einheitVon(r, x.pos), selbstkosten: c(x.erg.selbstkosten), stueckCent:"]] },
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
  { name: "BLP: Stückpreis statt glatter Summe (Cent-Abweichung)", probe: K, erwartet: "BLP: menge × Einzelpreis",
    an: [["assets/kern/uebergabe.js", "var glatt = p.menge > 0 && p.gesamtCent % p.menge === 0;", "var glatt = p.menge > 0;"],
         ["assets/kern/uebergabe.js", "einzelpreisCent: p.gesamtCent / p.menge, ustSatz: p.ustSatz }", "einzelpreisCent: p.stueckCent, ustSatz: p.ustSatz }"]] },
  { name: "BLP: Versand fehlt in der Übergabe", probe: K, erwartet: "BLP: menge × Einzelpreis",
    an: [["assets/kern/uebergabe.js", "    if (d.versand) pos.push(", "    if (false) pos.push("]] },
  { name: "BLP: Knopf übergibt nichts", probe: B, erwartet: "BLP: der Knopf springt",
    an: [["assets/app.js", "if (window.__wcSprungAbfangen) { window.__wcSprung = ad.url; return; }", 'if (window.__wcSprungAbfangen) { window.__wcSprung = ad.url.replace("?uebernahme=", "?x="); return; }']] },
  { name: "FASSUNG: neue Fassung überschreibt die alte", probe: K, erwartet: "FASSUNG: gestellt → Fassung 2",
    an: [["assets/kern/angebot.js", 'n.fassung = f; n.id = a.nummer + "-F" + f;', "n.fassung = f; n.id = a.id;"]] },
  { name: "FASSUNG: kein Vergleich mit der alten Fassung", probe: B, erwartet: "FASSUNG: Vergleich",
    an: [["assets/app.js", "if (a.vorgaenger) { var vk = vergleichKarte(a); if (vk) main.append(vk); }", ""]] },
  { name: "SICHERUNG: Zurückholen überschreibt Vorhandenes", probe: K, erwartet: "SICHERUNG: Zurückholen fügt hinzu",
    an: [["assets/kern/sicherung.js", "if (!x || !x.id || da[x.id]) return false;", "if (!x || !x.id) return false;"]] },
  { name: "SICHERUNG: Klartext neben dem Paket", probe: K, erwartet: "SICHERUNG: kein Klartext",
    an: [["assets/kern/sicherung.js", "return { art: ART, fassung: FASSUNG, erstellt: erstellt, paket: paket };", "return { art: ART, fassung: FASSUNG, erstellt: erstellt, paket: paket, vorschau: inhalt.angebote };"]] },
  { name: "SICHERUNG: Katalog kommt nicht mit zurück", probe: B, erwartet: "SICHERUNG: der eigene Katalog",
    an: [["assets/app.js", "if (!lsGet(LS.katalog) && o.speicher.katalog) { lsSet(LS.katalog, o.speicher.katalog); katalogLaden(); }", ""]] },
  /* ── Stufe 3 ── */
  { name: "NACHKALK: leeres Feld zählt als 0", probe: K, erwartet: "NACHKALK: leeres Feld heißt nicht erfasst",
    an: [["assets/kern/nachkalk.js", 'function zahl(x) { if (x === "" || x == null) return null;', "function zahl(x) { if (x == null) return null;"]] },
  { name: "NACHKALK: Ist-Minuten werden ignoriert", probe: K, erwartet: "NACHKALK: 50 % mehr Arbeitszeit",
    an: [["assets/kern/nachkalk.js", "var fek = min != null ? rund(min / 60 * erg.effektiv.lohnCent) : erg.fek;", "var fek = erg.fek;"]] },
  { name: "NACHKALK: Versand Ist fehlt in den Selbstkosten", probe: K, erwartet: "NACHKALK: Versand Ist",
    an: [["assets/kern/nachkalk.js", "var skPlan = vPlan, skIst = vIst, netto = vPlan;", "var skPlan = vPlan, skIst = vPlan, netto = vPlan;"]] },
  { name: "NACHKALK: Entwürfe zählen im Faktor mit", probe: K, erwartet: "NACHKALK: nur gestellte Angebote",
    an: [["assets/kern/nachkalk.js", 'if (a.status !== "gestellt" || !a.ist || !a.ist.pos) return;', "if (!a.ist || !a.ist.pos) return;"]] },
  { name: "NACHKALK: derselbe Befund wird zweimal übernommen", probe: K, erwartet: "NACHKALK: derselbe Befund wird nur einmal",
    an: [["assets/kern/nachkalk.js", 'if (schonUebernommen(kat, z)) return { ok: false, grund: "schon übernommen" };', ""]] },
  { name: "NACHKALK: kleine Abweichung wird trotzdem übernommen", probe: K, erwartet: "NACHKALK: unter 2 %",
    an: [["assets/kern/nachkalk.js", 'if (z.passt) return { ok: false, grund: "passt schon (Abweichung unter " + PASST_PCT + " %)" };', ""]] },
  { name: "NACHKALK: Ist-Werte gehen aufs Kundenblatt", probe: K, erwartet: "WHITELIST: Nachkalkulation und Stichzahl bleiben intern",
    an: [["assets/kern/aussen.js", "      kleinunternehmer: !!kleinunternehmer,", "      kleinunternehmer: !!kleinunternehmer, ist: a.ist || null,"]] },
  { name: "STICK: Maschinenzeit hängt nicht an der Stichzahl", probe: K, erwartet: "STICK: Maschinenzeit aus der Stichzahl",
    an: [["assets/kern/kalkulation.js", ': verfahren.leistungEinheit === "tsd_stiche" ? tsdStiche : menge;', ": menge;"]] },
  { name: "STICK: fehlende Stichzahl wird still 0", probe: K, erwartet: "STICK: fehlende Stichzahl",
    an: [["assets/kern/kalkulation.js", 'if (vorlage.stiche && !(stiche > 0)) offen.push("Stichzahl fehlt");', ""]] },
  { name: "GEBIET: Hinzufügen überschreibt eigene Zahlen", probe: K, erwartet: "GEBIET: eigene Zahlen bleiben",
    an: [["assets/kern/katalog.js", "if (kat[l].some(function (y) { return y.id === x.id; })) { schonDa++; return; }",
      "kat[l] = kat[l].filter(function (y) { return y.id !== x.id; });"]] },
  { name: "EINHEIT: immer Stk. auf dem Blatt", probe: K, erwartet: "EINHEIT: Std. und Stk.",
    an: [["assets/kern/aussen.js", 'return s(v && v.einheitText) || "Stk.";', 'return "Stk.";']] },
  { name: "NK-SEITE: keine Nachkalkulation am gestellten Angebot", probe: B, erwartet: "NK-SEITE: am gestellten Angebot steht die Nachkalkulation",
    an: [["assets/app.js", 'if (a.status === "gestellt") main.append(nachkalkKarte(a, r));', "if (false) main.append(nachkalkKarte(a, r));"]] },
  { name: "NK-SEITE: Übernehmen-Knopf bleibt nach dem Übernehmen", probe: B, erwartet: "NK-SEITE: danach kein zweites Übernehmen",
    an: [["assets/app.js", ': WC.nachkalk.schonUebernommen(S.katalog, z) ? h("span",', ': false ? h("span",']] },
  { name: "GEBIET-SEITE: der Knopf fügt nichts hinzu", probe: B, erwartet: "GEBIET-SEITE: Stickerei steht danach im Katalog",
    an: [["assets/app.js", "var r = KAT.gebietHinzufuegen(S.katalog, pk);", "var r = KAT.gebietHinzufuegen({}, pk);"]] },
  { name: "STICK-SEITE: das Feld Stichzahl ändert nichts", probe: B, erwartet: "STICK-SEITE: doppelte Stichzahl",
    an: [["assets/app.js", 'p.stiche = n > 0 ? n : ""; })', "void n; })"]] },
  { name: "BEISPIEL: dasselbe Beispiel wird doppelt angelegt", probe: K, erwartet: "BEISPIEL: ein Beispiel wird nicht doppelt geladen",
    an: [["assets/daten/beispiel-angebote.js", 'if ((angebote || []).some(function (a) { return a.beispiel === bid; })) return { ok: false, grund: "schon geladen" };', ""]] },
  { name: "BEISPIEL: fehlende Arbeitsgebiete werden nicht mitgeholt", probe: K, erwartet: "BEISPIEL: fehlende Arbeitsgebiete",
    an: [["assets/daten/beispiel-angebote.js", "      if (gid) { WC.katalog.gebietHinzufuegen", "      if (false) { WC.katalog.gebietHinzufuegen"]] },
  { name: "BEISPIEL-SEITE: „Alle laden“ lädt nur eines", probe: B, erwartet: "BEISPIEL-SEITE: fünf Angebote",
    an: [["assets/app.js", "beispielLaden(L.map(function (b) { return b.bid; }));", "beispielLaden([L[0].bid]);"]] },
  { name: "WORKFLOH-IMPORT: Kunde unter falschem Feldnamen", probe: B, erwartet: "WORKFLOH-IMPORT: Mein WorkFloh",
    an: [["assets/kern/uebergabe.js", "data: { nameFirma: d.kunde.name,", "data: { firma: d.kunde.name,"]] },
  { name: "RECHERCHE: Zitat wird nicht auf die Zahl geprüft", probe: K, erwartet: "RECHERCHE: Zahl, die nicht im Zitat steht",
    an: [["assets/kern/recherche.js", "return zitate.filter(function (z) { return z.url === url && zahlenIm(z.text).indexOf(cent) >= 0; })[0] || null;", "return zitate.filter(function (z) { return z.url === url; })[0] || null;"]] },
  { name: "RECHERCHE: Quelle muss nicht aus der Suche stammen", probe: K, erwartet: "RECHERCHE: Quelle, die die Suche nicht geliefert hat",
    an: [["assets/kern/recherche.js", 'if (!quellen[nu]) return weg("Quelle stammt nicht aus der Websuche");', ""]] },
  { name: "RECHERCHE: Funde ohne Marke „ungeprüft“", probe: K, erwartet: "RECHERCHE: belegter Preis wird übernommen",
    an: [["assets/kern/recherche.js", 'herkunft: "ki", ungeprueft: true });', 'herkunft: "ki" });']] },
  { name: "RECHERCHE: Vergleich zählt ungeprüfte mit", probe: K, erwartet: "RECHERCHE: ungeprüfte Preise zählen nicht",
    an: [["assets/kern/markt.js", "return !e.ungeprueft && e.klasse === k.id", "return e.klasse === k.id"]] },
  { name: "RECHERCHE: der Titel geht mit hinaus", probe: K, erwartet: "RECHERCHE: hinaus gehen nur Produktangaben",
    an: [["assets/kern/recherche.js", 'return { produkt: String(v.name || ""),', 'return { produkt: String(v.name || "") + " " + (p.titel || ""),']] },
  { name: "RECHERCHE: Bruttopreis wird nicht umgerechnet", probe: K, erwartet: "RECHERCHE: Gesamtpreis brutto",
    an: [["assets/kern/recherche.js", "if (/brutto/.test(steuer)) { stueck = Math.round(stueck / 1.19);", "if (false) { stueck = Math.round(stueck / 1.19);"]] },
  { name: "KI-SEITE: Schlüssel ohne Formprüfung", probe: B, erwartet: "KI-SEITE: ein falsch geformter Schlüssel",
    an: [["assets/app.js", 'if (!f.ok) { sag("Schlüssel: " + f.grund + ". " + f.hinweis, false); return; }', ""]] },
  { name: "KI-SEITE: Funde kommen nicht in die Liste", probe: B, erwartet: "KI-SEITE: die Funde stehen ungeprüft",
    an: [["assets/app.js", "vk.markt.push(f); neu++;", "neu++;"]] },
  { name: "VOLLBILD: Arbeitsfläche wieder begrenzt", probe: B, erwartet: "VOLLBILD: die Arbeitsfläche",
    an: [["assets/app.css", "main{padding:16px;max-width:none;margin:0}", "main{padding:16px;max-width:1400px;margin:0 auto}"]] },
  { name: "BEISPIEL: Hochzeit fehlt", probe: K, erwartet: "BEISPIEL: statt Geburtstag",
    an: [["assets/daten/beispiel-angebote.js", '{ bid: "hochzeit",', '{ bid: "geburtstag",']] },
  /* ── Handelsware (Klaus 2026-10-13) ── */
  { name: "HANDEL: Handlungskosten fallen weg", probe: K, erwartet: "HANDEL: Handrechnung",
    an: [["assets/kern/kalkulation.js", "hk = rund(bez * (+s.handlungskostenPct || 0) / 100)", "hk = 0"]] },
  { name: "HANDEL: Versand zählt doppelt", probe: K, erwartet: "HANDEL: per Haken umgestellte Vorlage — kein eigener Versandposten",
    an: [["assets/kern/angebot.js", 'if (v.versandArt === "keiner" || v.einkaufsprodukt) return;', 'if (v.versandArt === "keiner") return;']] },
  { name: "HANDEL: Zwischenmenge wird geschätzt", probe: K, erwartet: "HANDEL: Zwischenmenge (300) wird NICHT geschätzt",
    an: [["assets/kern/kalkulation.js", "return x && Math.round(+x.menge) === menge && zahl(x.gesamtCent) != null;", "return x && zahl(x.gesamtCent) != null;"]] },
  { name: "HANDEL: Kundenklasse wirkt nicht", probe: K, erwartet: "HANDEL: C-Kunde",
    an: [["assets/kern/kalkulation.js", "if (vorlage.einkaufsprodukt) return handelPosition(kat, vorlage, pos, menge, sf, e);",
      "if (vorlage.einkaufsprodukt) { var sf0 = saetzeFuer(kat, vorlage, pos, ctx.angebot, null); return handelPosition(kat, vorlage, pos, menge, sf0, effektiv(sf0.s)); }"]] },
  { name: "HANDEL: der teuerste Einkauf zählt", probe: K, erwartet: "HANDEL: mehrere Einkäufe",
    an: [["assets/kern/kalkulation.js", "l.sort(function (a, b) { return a.gesamtCent - b.gesamtCent; });", "l.sort(function (a, b) { return b.gesamtCent - a.gesamtCent; });"]] },
  { name: "HANDEL: fehlender Einkaufspreis zählt als 0", probe: K, erwartet: "HANDEL: fehlender Einkaufspreis",
    an: [["assets/kern/kalkulation.js", "return x && Math.round(+x.menge) === menge && zahl(x.gesamtCent) != null;", "return x && Math.round(+x.menge) === menge;"]] },
  { name: "HANDEL: Staffel nicht aus den Einkaufsmengen", probe: K, erwartet: "HANDEL: per Haken umgestellte Vorlage — Staffel",
    an: [["assets/kern/angebot.js", "if (v && v.einkaufsprodukt) { var em = K().einkaufsMengen(v); if (em.length) { p.staffeln = em; p.menge = em[0]; } }", ""]] },
  { name: "KATALOG: halbe Einkaufszeile wirft den Katalog weg", probe: K, erwartet: "KATALOG: halb ausgefüllte Einkaufszeile",
    an: [["assets/kern/katalog.js", "    if (f.length) return f;\n    var mat = ids(kat.materialien)", "    f = f.concat(hinweise(kat)); if (f.length) return f;\n    var mat = ids(kat.materialien)"]] },
  { name: "KATALOG: alter Katalog ohne Lieferanten gilt als kaputt", probe: K, erwartet: "KATALOG: ein Katalog ohne Lieferanten-Liste",
    an: [["assets/kern/katalog.js", "      if (kat[l] == null) return;\n", ""]] },
  { name: "LIEFERANT: Startliste trägt Ungeprüftes ein", probe: K, erwartet: "LIEFERANT: die Startliste trägt nichts Ungeprüftes ein",
    an: [["assets/daten/handelsware.js", "    lieferanten: [],\n", '    lieferanten: [{ id: "x", name: "Ungeprüft", url: "https://x.example/", fuer: "beides" }],\n']] },
  { name: "LIEFERANT: Vorschlag trägt schon ein Prüfdatum", probe: K, erwartet: "LIEFERANT: Vorschläge haben eine https-Adresse",
    an: [["assets/daten/handelsware.js", 'fuer: "wiederverkaeufer", anmeldung: true,\n      notiz: "Werbeartikel-Großhandel (Polyconcept', 'fuer: "wiederverkaeufer", anmeldung: true, geprueftAm: "2026-10-12",\n      notiz: "Werbeartikel-Großhandel (Polyconcept']] },
  { name: "LIEFERANT: jede Adresse wird zum Link", probe: K, erwartet: "LIEFERANT: javascript:",
    an: [["assets/kern/katalog.js", 'return /^https:\\/\\/[^\\s"<>]+$/.test(u) ? u : "";', "return u;"]] },
  { name: "WHITELIST: Lieferant geht aufs Kundenblatt", probe: K, erwartet: "WHITELIST: Handelsware — kein Lieferant",
    an: [["assets/kern/aussen.js", "titel: s(x.pos.titel), beschreibung: s(x.pos.beschreibung),", "titel: s(x.pos.titel), beschreibung: s(x.pos.beschreibung) + (x.erg.handel ? \" · \" + x.erg.handel.lieferantName : \"\"),"]] },
  { name: "NK-HANDEL: Ist-Einkauf wird ignoriert", probe: K, erwartet: "NK-HANDEL: Einkauf 130,00",
    an: [["assets/kern/nachkalk.js", "var hdIst = WC.kalk.handel(ek != null ? rund(ek) : erg.handel.bezugspreis, erg.saetze);", "var hdIst = WC.kalk.handel(erg.handel.bezugspreis, erg.saetze);"]] },
  { name: "HANDEL-SEITE: #handel öffnet die Seite nicht", probe: B, erwartet: "HANDEL-SEITE: #handel öffnet die Seite direkt",
    an: [["assets/app.js", 'if (location.hash === "#handel") S.reiter = "handel"; else if', "if (false) S.reiter = \"handel\"; else if"]] },
  { name: "HANDEL-SEITE: Einkaufsprodukte bleiben in der Produktwahl", probe: B, erwartet: "HANDEL-SEITE: Einkaufsprodukte stehen nicht in der Produktwahl",
    an: [["assets/app.js", "var l = KAT.eigenfertigung(kat).filter(function (v) { return v.gebiet === gb.id; });", "var l = kat.vorlagen.filter(function (v) { return v.gebiet === gb.id; });"]] },
  { name: "HANDEL-SEITE: der Link des Lieferanten landet in der Beschreibung", probe: B, erwartet: "HANDEL-SEITE: Kundenblatt trägt den Verkauf",
    an: [["assets/app.js", "    p.menge = menge; if (p.staffeln.indexOf(menge) < 0)", "    p.beschreibung += \" \" + ((v.einkauf || [])[0] || {}).url; p.menge = menge; if (p.staffeln.indexOf(menge) < 0)"]] },
  { name: "HANDEL-SEITE: ✓ geprüft trägt nichts ein", probe: B, erwartet: "HANDEL-SEITE: „✓ geprüft“ trägt genau",
    an: [["assets/app.js", "var n = kopie(x); n.geprueftAm = A.heute(); kat.lieferanten.push(n); katalogSpeichern();", "var n = kopie(x); n.geprueftAm = A.heute(); katalogSpeichern();"]] },
  { name: "HANDEL-SEITE: Vorschläge sind schon eingetragen", probe: B, erwartet: "HANDEL-SEITE: Vorschläge stehen da",
    an: [["assets/app.js", "    S.katalog.lieferanten = S.katalog.lieferanten || [];\n", "    S.katalog.lieferanten = S.katalog.lieferanten || kopie(WC.LIEFERANTEN_VORSCHLAEGE || []);\n"]] },
  { name: "HANDEL-SEITE: javascript:-Adresse wird übernommen", probe: B, erwartet: "HANDEL-SEITE: eine javascript:-Adresse",
    an: [["assets/app.js", 'if (v && !KAT.sichereAdresse(v)) { melde("Die Adresse muss mit https:// beginnen — nicht übernommen.", "bad"); return; }', ""]] },
  { name: "HANDEL-SEITE: Haken lenkt die Vorlage nicht um", probe: B, erwartet: "HANDEL-SEITE: Haken „Einkaufsprodukt“ nimmt",
    an: [["assets/app.js", "var alle = kat[S.katReiter] || [], liste = S.katReiter === \"vorlagen\" ? KAT.eigenfertigung(kat) : alle;", "var alle = kat[S.katReiter] || [], liste = alle;"]] },
  { name: "VOLLBILD: Handelsware — Spalten so breit, dass der Verkauf aus dem Bild fällt", probe: B, erwartet: "VOLLBILD: Handelsware — Verkauf",
    an: [["assets/app.css", ".handel-tab td,.handel-tab th{padding:5px 6px;white-space:nowrap}", ".handel-tab td,.handel-tab th{padding:5px 90px;white-space:nowrap}"]] },
  { name: "VOLLBILD: Handelsware — Seite wieder begrenzt", probe: B, erwartet: "VOLLBILD: die Seite Handelsware",
    an: [["assets/app.css", ".handel-knopf{padding:6px 10px;font-weight:600;font-size:.85rem}", ".handel-knopf{padding:6px 10px;font-weight:600;font-size:.85rem}[data-handel-produkt]{max-width:600px}"]] },
  { name: "HANDEL-SEITE: Tabelle sprengt das Handy", probe: B, erwartet: "HANDY: die Seite Handelsware passt",
    an: [["assets/app.js", 'karte.append(h("div", { class: "tabelle-huelle" }, t));', "karte.append(t);"]] },
  /* ── Lasergravur, Fremdfertigung (Klaus 2026-10-13) ── */
  { name: "FREMD: fehlendes Gerät wird ignoriert", probe: K, erwartet: "FREMD: Gerät fehlt (Faserlaser)",
    an: [["assets/kern/kalkulation.js", 'if (verfahren && verfahren.vorhanden === false) offen.push(', "if (false) offen.push("]] },
  { name: "FREMD: kein Feld „vorhanden“ heißt „fehlt“", probe: K, erwartet: "FREMD: ohne Feld „vorhanden“",
    an: [["assets/kern/kalkulation.js", 'if (verfahren && verfahren.vorhanden === false) offen.push(', "if (verfahren && verfahren.vorhanden !== true) offen.push("]] },
  { name: "LASER: Glas auf dem Diodenlaser", probe: K, erwartet: "LASER: technische Regel",
    an: [["assets/daten/laser.js", '"roh_sektglas", "Glas", ["laser_co2"], 3,', '"roh_sektglas", "Glas", ["laser_co2", "laser_diode"], 3,']] },
  { name: "LASER: Edelstahl auf dem CO2-Laser", probe: K, erwartet: "LASER: technische Regel",
    an: [["assets/daten/laser.js", '"roh_oeffner", "Flaschenöffner", ["laser_faser"], 1.5,', '"roh_oeffner", "Flaschenöffner", ["laser_co2", "laser_faser"], 1.5,']] },
  { name: "LASER: Zeit je Name fehlt", probe: K, erwartet: "LASER: Einzelstück mit Namen rechnet",
    an: [["assets/daten/laser.js", 'ruestMin: 0, minJeStueck: minJeName, minJeM2: 0 }];', "ruestMin: 0, minJeStueck: 0, minJeM2: 0 }];"]] },
  { name: "WHITELIST: Kunden-Titel ist der interne Name", probe: K, erwartet: "WHITELIST: Kunden-Titel ohne Zukauf",
    an: [["assets/kern/angebot.js", 'titel: v ? v.titelVorgabe || v.name : "",', 'titel: v ? v.name : "",']] },
  { name: "BILDER: Laser-Zeichnungen fehlen", probe: K, erwartet: "BILDER: jede Laser-Vorlage",
    an: [["assets/daten/bilder.js", '["kuli", "karte", "schiefer", "glas", "leder", "oeffner", "acryl"].forEach(', '[].forEach(']] },
  { name: "LASER-SEITE: Fremdfertigung setzt still eine andere Menge", probe: B, erwartet: "LASER-SEITE: Fremdfertigung genommen — Menge bleibt 60",
    an: [["assets/app.js", "p.staffeln = em.concat([p.menge]).filter(", "p.menge = em[0] || p.menge; p.staffeln = em.concat([p.menge]).filter("]] },
  { name: "LASER-SEITE: kein Knopf zur Fremdfertigung", probe: B, erwartet: "LASER-SEITE: Flaschenöffner (Faserlaser fehlt)",
    an: [["assets/app.js", "if (fv && !ro) karte.append(", "if (false) karte.append("]] },
  /* ── Kleinmengenzuschlag (Klaus 2026-10-13) ── */
  { name: "KLEIN: Zuschlag fehlt in der Summe", probe: K, erwartet: "KLEIN: 2 Tassen (unter 10)",
    an: [["assets/kern/angebot.js", "perSatz[ks] = (perSatz[ks] || 0) + kleinmenge.cent; netto += kleinmenge.cent;", "perSatz[ks] = (perSatz[ks] || 0) + kleinmenge.cent;"]] },
  { name: "KLEIN: je Position statt je Angebot", probe: K, erwartet: "KLEIN: zwei Positionen unter 10",
    an: [["assets/kern/angebot.js", "return Object.assign(leer, { aktiv: true, cent: cent });", "return Object.assign(leer, { aktiv: true, cent: cent * leer.positionen.length });"]] },
  { name: "KLEIN: Stunden und km zählen mit", probe: K, erwartet: "KLEIN: 4 Std. Arbeit",
    an: [["assets/kern/angebot.js", 'return !!v && v.kleinmenge !== false && (v.einheitText || "Stk.") === "Stk." && !(v.versandArt === "keiner" && !v.einkaufsprodukt); }', "return !!v; }"]] },
  { name: "KLEIN: weglassen wirkt nicht", probe: K, erwartet: "KLEIN: für ein Angebot weggelassen",
    an: [["assets/kern/angebot.js", "if (a.kleinmengeAus) return Object.assign(leer, { weggelassen: true });", ""]] },
  { name: "KLEIN: gestellte Angebote bekommen den Zuschlag nachträglich", probe: K, erwartet: "KLEIN: ein gestelltes Angebot von vorher",
    an: [["assets/kern/angebot.js", "var km = kat.kleinmenge, grenze =", "var km = kat.kleinmenge || { grenze: 10, cent: 1200 }, grenze ="]] },
  { name: "KLEIN: Zeile fehlt auf dem Kundenblatt", probe: K, erwartet: "KLEIN: Kundenblatt trägt die Zeile",
    an: [["assets/kern/aussen.js", "kleinmenge: r.kleinmenge && r.kleinmenge.aktiv ?", "kleinmenge: false ?"]] },
  { name: "KLEIN: BookLedgerPro bekommt die Zeile nicht", probe: K, erwartet: "KLEIN: BookLedgerPro bekommt die Zeile",
    an: [["assets/kern/uebergabe.js", "    if (d.kleinmenge) pos.push(", "    if (false) pos.push("]] },
  { name: "KLEIN-SEITE: Blatt zeigt die Zeile nicht", probe: B, erwartet: "KLEIN-SEITE: Kundenblatt trägt die eigene Zeile",
    an: [["assets/app.js", "    if (d.kleinmenge) tb.append(", "    if (false) tb.append("]] },
  { name: "KLEIN-SEITE: Vorgabe kommt nicht in den Katalog", probe: B, erwartet: "KLEIN-SEITE: 2 Tassen",
    an: [["assets/app.js", "    katalogErgaenzen(S.katalog);\n", ""]] },
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
