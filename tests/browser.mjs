/* Proben im echten Browser. node tests/browser.mjs
   Rückgabe 0 = grün · 1 = rot · 2 = nicht lauffähig (kein playwright-core oder kein Chromium) — nie grün. */
import { findeChromium } from "./chromium-finden.mjs";
import { starteServer } from "./server.mjs";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const WURZEL_T = join(dirname(fileURLToPath(import.meta.url)), "..");
const NEBEN = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

let chromium;
try { ({ chromium } = await import("playwright-core")); } catch { console.log("nicht lauffähig: playwright-core fehlt (npm install)"); process.exit(2); }
const pfad = findeChromium();
if (!pfad) { console.log("nicht lauffähig: kein Chromium gefunden"); process.exit(2); }

let gruen = 0, rot = 0;
function ok(name, wahr, mehr) {
  if (wahr) gruen++;
  else { rot++; console.log("ROT  " + name + (mehr !== undefined ? "  — " + (typeof mehr === "string" ? mehr : JSON.stringify(mehr)) : "")); }
}
const { server, url } = await starteServer();
const browser = await chromium.launch({ executablePath: pfad });
const fehler = [];
async function seite(breite) {
  const ctx = await browser.newContext({ viewport: { width: breite, height: 900 } });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => fehler.push(e.message));
  return { ctx, p };
}
/* Fehlt ein Ziel, wird es gemeldet statt 30 s zu warten und zu werfen */
async function tippe(p, sel, name) {
  const n = await p.locator(sel).count();
  if (!n) { ok("zu treffen: " + name, false, sel); return false; }
  await p.locator(sel).first().click(); return true;
}
async function druck(p, sel) {
  await p.evaluate(() => { window.print = () => { window.__gedruckt = (window.__gedruckt || 0) + 1; }; });
  await p.click(sel);
  return p.evaluate(() => ({ text: document.getElementById("druck").textContent, html: document.getElementById("druck").innerHTML, n: window.__gedruckt || 0 }));
}
/* Seit 2026-10-12 öffnet die App auf der Suche — die alten Proben beginnen in „Angebote“ */
async function zuAngeboten(p) { await p.click('[data-reiter="angebote"]'); }
const K_kuli = (k) => ((k && k.vorlagen) || []).find((v) => v.id === "kuli_zukauf") || { einkauf: [{}] };
const netto = (p, id) => p.evaluate((id) => Number((document.querySelector('[data-position="' + id + '"] [data-pos-netto]') || {}).dataset ? document.querySelector('[data-position="' + id + '"] [data-pos-netto]').dataset.posNetto : NaN), id);

try {
  const { ctx, p } = await seite(1200);
  await p.goto(url);
  await p.waitForSelector("body[data-bereit]");
  ok("START: Titel „Workflow Calculate“", (await p.title()) === "Workflow Calculate");
  ok("START: Hinweis auf Platzhalter-Werte steht da", await p.locator("[data-platzhalter-hinweis]").count() === 1);

  /* Lockwerte im Katalog: Einkaufspreis Tasse 7,31 €, Stundensatz 73,00 € */
  await tippe(p, '[data-reiter="einstellungen"]', "Reiter Einstellungen");
  await p.fill('[data-firma="name"]', "Werkstatt Prüf-Firma");
  await p.locator('[data-gebiet-saetze="werbetechnik"] [data-kat-feld="stundensatzCent"]').fill("73,00");
  await p.locator('[data-gebiet-saetze="werbetechnik"] [data-kat-feld="stundensatzCent"]').press("Tab");
  await tippe(p, '[data-reiter="katalog"]', "Reiter Katalog");
  await tippe(p, '[data-kat-reiter="materialien"]', "Katalog Materialien");
  await tippe(p, '[data-kat-eintrag="tasse_11"]', "Material Tasse");
  await p.locator('[data-kat-id="tasse_11"] [data-kat-feld="ekCent"]').fill("7,31");
  await p.locator('[data-kat-id="tasse_11"] [data-kat-feld="ekCent"]').press("Tab");
  ok("KATALOG: geänderter Preis nimmt die Platzhalter-Marke weg", !(await p.locator('[data-kat-id="tasse_11"]').textContent()).includes("Platzhalter"));

  /* ── Schritt für Schritt ── */
  await tippe(p, '[data-reiter="angebote"]', "Reiter Angebote");
  await tippe(p, "#neues-angebot", "Neues Angebot");
  ok("SCHRITTE: nächster Schritt ist „Kunde“", (await p.getAttribute("[data-naechster]", "data-naechster")) === "kunde");
  await p.fill("#kunde-neu-name", "Kunde Beispiel GmbH");
  await p.selectOption("#kunde-neu-klasse", "C");
  await tippe(p, "#kunde-neu-anlegen", "Kunde anlegen");
  ok("SCHRITTE: nach dem Kunden kommt „Produkt“", (await p.getAttribute("[data-naechster]", "data-naechster")) === "produkt");
  await p.selectOption("#vorlage-wahl", "tasse");
  ok("BEISPIELE: Galerie zeigt Beispiele mit Bild und gerechnetem Preis", await p.locator('[data-galerie="tasse"] [data-beispiel] img.gross').count() >= 1 && await p.locator('[data-galerie="tasse"] [data-beispiel-preis]').count() >= 1);
  const ans0 = await p.getAttribute('[data-beispiel="tasse:b1"] img.gross', "data-ansicht-gross");
  await tippe(p, '[data-beispiel="tasse:b1"] [data-ansicht="1"]', "zweite Ansicht");
  const ans1 = await p.getAttribute('[data-beispiel="tasse:b1"] img.gross', "data-ansicht-gross");
  ok("BEISPIELE: mehrere Ansichten — ein Tipp wechselt das große Bild", ans0 && ans1 && ans0 !== ans1, [ans0, ans1]);
  await tippe(p, '[data-beispiel-nehmen="tasse:b1"]', "Beispiel übernehmen");
  ok("BEISPIELE: übernommen mit Menge 50", (await p.inputValue('[data-position="P-1"] [data-feld="menge"]')) === "50");
  ok("SCHRITTE: Produkt, Maße und Preis sind erledigt", await p.locator('[data-schritt="masse"][data-fertig="1"]').count() === 1 && await p.locator('[data-schritt="produkt"][data-fertig="1"]').count() === 1);
  ok("KLASSE: Preisleiste nennt den C-Kunden", await p.locator('[data-leiste-klasse="C"]').count() === 1);

  /* ── Preis nachbessern: Wirkung vorher, Änderung erst auf Tipp ── */
  const n0 = await netto(p, "P-1");
  ok("NACHBESSERN: Werkzeuge sind eingeklappt, bis man sie braucht", await p.locator('[data-erklaer="P-1"]').count() === 0);
  await tippe(p, '[data-nachbessern-knopf="P-1"]', "Preis nachbessern");
  await tippe(p, '[data-erklaer="P-1"] [data-chip="menge"]', "Chip Menge");
  const wirk = await p.locator('[data-erklaer-feld="menge"] [data-wirkung]').first().getAttribute("data-wirkung");
  ok("NACHBESSERN: das Feld rechnet die Wirkung vorher", /netto .* → /.test(await p.textContent('[data-erklaer-feld="menge"]')) && Number(wirk) > 0);
  ok("NACHBESSERN: ein Tipp aufs Feld ändert noch nichts", (await netto(p, "P-1")) === n0);
  await p.locator('[data-erklaer-feld="menge"] [data-alternative] button').first().click();
  const n1 = await netto(p, "P-1");
  ok("NACHBESSERN: der Tipp auf die Alternative ändert genau auf den vorher gezeigten Wert", n1 === Number(wirk), [n1, wirk]);
  await tippe(p, "#zurueck", "Zurück");
  ok("ZURÜCK: ↶ stellt den Stand vor der Änderung her", (await netto(p, "P-1")) === n0);

  /* ── Eigener Preis unter Selbstkosten → Warnung; darüber → in die Vorlage übernehmen ── */
  await p.locator('[data-position="P-1"] [data-eigen="50"]').fill("50,00");
  await p.locator('[data-position="P-1"] [data-eigen="50"]').press("Tab");
  ok("VERLUST: Preis unter den Kosten steht rot da, mit Satz", await p.locator('[data-position="P-1"] [data-verlust]').count() === 1 && /Verlust je Stück/.test(await p.textContent('[data-position="P-1"] [data-verlust]')));
  const ziel = n0 + 10000;
  await p.locator('[data-position="P-1"] [data-eigen="50"]').fill((ziel / 100).toFixed(2).replace(".", ","));
  await p.locator('[data-position="P-1"] [data-eigen="50"]').press("Tab");
  ok("EIGEN: Abstand zur Kalkulation steht da", /über Kalkulation/.test(await p.textContent('[data-position="P-1"] [data-eigen-abstand]')));
  ok("LERNEN: drei Wege zum Übernehmen", await p.locator('[data-lernen="P-1"] [data-lernweg]').count() === 3);
  await p.locator('[data-lernweg="gewinn"] button').click();
  ok("LERNEN: nach dem Übernehmen rechnet die Vorlage den eigenen Preis", (await netto(p, "P-1")) === ziel && await p.locator('[data-position="P-1"] [data-eigen-abstand]').count() === 0, [await netto(p, "P-1"), ziel]);

  /* ── Marktvergleich ── */
  await tippe(p, '[data-markt-knopf="P-1"]', "Marktvergleich");
  ok("MARKT: ohne Preise „kein Vergleich“", await p.locator('[data-markt="P-1"] [data-kein-vergleich]').count() === 1);
  await p.fill('[data-markt="P-1"] [data-markt-neu="anbieter"]', "MARKT-PRUEFWORT");
  await p.fill('[data-markt="P-1"] [data-markt-neu="stueck"]', "12,50");
  await tippe(p, '[data-markt="P-1"] [data-markt-dazu]', "Marktpreis eintragen");
  ok("MARKT: eingetragener Preis ergibt eine Spanne mit Lage", await p.locator('[data-markt-klasse="handwerk"] [data-markt-lage]').count() === 1);
  ok("MARKT: Online-Druckerei ab 10 Stück ist aktiv, Import bei 50 nicht", (await p.getAttribute('[data-markt-klasse="import"]', "data-aktiv")) === "0");
  ok("MARKT: Suche öffnet sich nur auf Tipp, in neuem Fenster", (await p.getAttribute('[data-markt-suche]', "target")) === "_blank");

  /* ── Zweite Position aus T-Shirt mit Farben ── */
  await p.selectOption("#vorlage-wahl", "shirt");
  await tippe(p, '[data-beispiel-nehmen="shirt:b1"]', "Shirt-Beispiel");
  const s1 = await netto(p, "P-2");
  await p.selectOption('[data-position="P-2"] [data-feld="farben"]', "3");
  const s3 = await netto(p, "P-2");
  await p.selectOption('[data-position="P-2"] [data-feld="verfahren"]', "dtf");
  ok("FARBEN: 3-farbig kostet mehr als 1-farbig; beim Digitaltransfer verschwindet die Flexfolie", s3 > s1 && await p.locator('[data-position="P-2"] [data-slot="flex"]').count() === 0, [s1, s3]);

  /* ── Versand ── */
  ok("VERSAND: ein Posten Verpackung & Versand ist gerechnet", Number(await p.getAttribute("[data-versand-cent]", "data-versand-cent")) > 0);

  /* ── Kundenblatt: nur die Whitelist ── */
  const d = await druck(p, "#druck-angebot");
  ok("BLATT: Druck angestoßen, Titel „Angebot AN-…“", d.n === 1 && /Angebot AN-\d{4}-\d{4}/.test(d.text));
  ok("BLATT: kein Einkaufspreis 7,31 € und kein Stundensatz 73,00 €", !/7,31|73,00/.test(d.text));
  ok("BLATT: keine Selbstkosten, keine Klasse, keine Marktpreise", !/Selbstkost|C-Kunde|intern|MARKT-PRUEFWORT|Deckungsbeitrag/i.test(d.html));
  ok("BLATT: Verpackung & Versand als ein Posten, Firma und Kunde stehen da", /Verpackung & Versand/.test(d.text) && /Werkstatt Prüf-Firma/.test(d.text) && /Kunde Beispiel GmbH/.test(d.text));
  ok("BLATT: Staffelpreise stehen auf dem Angebot", /Staffel: /.test(d.text));

  /* ── Übergabe an WorkFloh ── */
  await tippe(p, "#uebergabe", "Übergabe");
  await p.waitForFunction(() => !!window.__wcUebergabe, null, { timeout: 5000 }).catch(() => {});
  const ub = await p.evaluate(() => window.__wcUebergabe || "");
  let b = null; try { b = JSON.parse(ub); } catch { /* bleibt null */ }
  ok("UEBERGABE: Weiterleitungs-Bündel für Mein WorkFloh und Tomys WorkFloh", b && b.wf === "forward" && b.auftraege.length === 1 && b.auftraege[0].status === "angebot");
  ok("UEBERGABE: nichts Internes in der Datei", ub && !/7,31|73,00|selbstkost|MARKT-PRUEFWORT|klasse/i.test(ub));

  /* ── Abkürzen: Angebot kopieren, Position aus früherem Angebot ── */
  await tippe(p, '[data-reiter="angebote"]', "Reiter Angebote");
  const vor = await p.locator("[data-angebot-zeile]").count();
  await tippe(p, "[data-kopieren]", "Angebot kopieren");
  ok("ABKÜRZEN: ein Angebot wird mit allen Positionen als neues übernommen", await p.locator("[data-position]").count() === 2 && /AN-\d{4}-0002/.test(await p.textContent("#app-unter")));
  await tippe(p, '[data-reiter="angebote"]', "Reiter Angebote");
  ok("ABKÜRZEN: die Liste hat ein Angebot mehr", await p.locator("[data-angebot-zeile]").count() === vor + 1);
  await tippe(p, "#neues-angebot", "Neues Angebot 3");
  await p.selectOption("#frueher-wahl", { index: 1 });
  await tippe(p, "#frueher-uebernehmen", "Position übernehmen");
  ok("ABKÜRZEN: eine kalkulierte Position aus einem früheren Angebot wird übernommen", await p.locator("[data-position] [data-pos-netto]").count() === 1);

  /* ── Bleibt nach dem Neuladen ── */
  await p.evaluate(() => window.WCApp.jetztSpeichern());
  await p.reload(); await p.waitForSelector("body[data-bereit]");
  await tippe(p, '[data-reiter="angebote"]', "Reiter Angebote");
  ok("SPEICHER: drei Angebote überstehen das Neuladen", await p.locator("[data-angebot-zeile]").count() === 3);

  /* ── Gestellt = eingefroren ── */
  await p.locator("[data-angebot-zeile]").last().click();
  await tippe(p, "#stellen", "Angebot stellen");
  ok("STELLEN: gestellt → nur lesen", await p.locator("[data-nur-lesen]").count() === 1 && await p.locator('[data-feld="menge"]:disabled').count() >= 1);

  /* ── Stufe 2: Fassungen ── */
  ok("FASSUNG: am gestellten Angebot steht der Weg zur neuen Fassung", await p.locator("#neue-fassung").count() === 1);
  await tippe(p, "#neue-fassung", "Neue Fassung");
  ok("FASSUNG: Fassung 2 ist offen (Entwurf) und nennt sich so", /Fassung 2/.test(await p.textContent("#app-unter")) && await p.locator("[data-nur-lesen]").count() === 0);
  await p.locator('[data-position] [data-feld="menge"]').first().fill("7");
  await p.locator('[data-position] [data-feld="menge"]').first().press("Tab");
  ok("FASSUNG: Vergleich mit Fassung 1 zeigt die Änderung", await p.locator('[data-vergleich-zeile="geaendert"]').count() === 1 && Number(await p.getAttribute("[data-vergleich-diff]", "data-vergleich-diff")) !== 0);
  const blatt2 = await druck(p, "#druck-angebot");
  ok("FASSUNG: das Kundenblatt sagt „Fassung 2“", /Fassung 2/.test(blatt2.text));
  await tippe(p, '[data-reiter="angebote"]', "Reiter Angebote");
  ok("FASSUNG: in der Liste steht die alte als „ersetzt“", /ersetzt/.test(await p.textContent("table")) && /F2/.test(await p.textContent("table")));

  /* ── Stufe 2: An BookLedgerPro ── */
  await p.locator("[data-angebot-zeile]").first().click();
  await p.evaluate(() => { window.__wcSprungAbfangen = true; window.__wcSprung = null; });
  await tippe(p, "#an-blp", "An BookLedgerPro");
  await p.waitForFunction(() => !!window.__wcSprung, null, { timeout: 5000 }).catch(() => {});
  const sprung = await p.evaluate(() => window.__wcSprung || "");
  let nl = null; try { const roh = new URL(sprung).searchParams.get("uebernahme").replace(/-/g, "+").replace(/_/g, "/"); nl = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(roh), (c) => c.charCodeAt(0)))); } catch { /* bleibt null */ }
  ok("BLP: der Knopf springt nach BookLedgerPro mit ?uebernahme=", sprung.startsWith("https://lausiklauskn-png.github.io/BookLedgerPro/?uebernahme=") && nl && nl.quelle === "workflow-calculate");
  ok("BLP: nichts Internes in der Adresse", nl && !/7,31|731|73,00|7300|selbstkost|klasse|MARKT-PRUEFWORT/i.test(JSON.stringify(nl)));

  /* ── Stufe 2: Sicherung — sichern, in einem frischen Browser zurückholen ── */
  await tippe(p, '[data-reiter="einstellungen"]', "Reiter Einstellungen");
  await p.fill("#sicherung-pw", "kurz"); await p.fill("#sicherung-pw2", "kurz");
  await tippe(p, "#sicherung-machen", "Sicherung (kurz)");
  ok("SICHERUNG: zu kurzes Passwort wird gemeldet", /mindestens/.test(await p.textContent("#sicherung-meldung")));
  await p.fill("#sicherung-pw", "pruef-passwort-123"); await p.fill("#sicherung-pw2", "pruef-passwort-123");
  await tippe(p, "#sicherung-machen", "Sicherung");
  await p.waitForFunction(() => !!window.__wcSicherung, null, { timeout: 30000 }).catch(() => {});
  const sich = await p.evaluate(() => window.__wcSicherung || "");
  ok("SICHERUNG: Datei entsteht, ohne Klartext", sich.length > 100 && !/Kunde Beispiel|AN-20|Prüf-Firma/.test(sich));
  await ctx.close();
  const f = await seite(1200);
  await f.p.goto(url); await f.p.waitForSelector("body[data-bereit]"); await zuAngeboten(f.p);
  await f.p.click('[data-reiter="einstellungen"]');
  await f.p.setInputFiles("#sicherung-datei", { name: "s.json", mimeType: "application/json", buffer: Buffer.from(sich) });
  await f.p.waitForFunction(() => !document.getElementById("sicherung-zurueck-meldung").hidden);
  await f.p.fill("#sicherung-pw-zurueck", "falsches-passwort-1");
  await f.p.click("#sicherung-zurueck");
  await f.p.waitForFunction(() => /passt nicht/.test(document.getElementById("sicherung-zurueck-meldung").textContent), null, { timeout: 30000 }).catch(() => {});
  ok("SICHERUNG: falsches Passwort wird gemeldet", /passt nicht/.test(await f.p.textContent("#sicherung-zurueck-meldung")));
  await f.p.fill("#sicherung-pw-zurueck", "pruef-passwort-123");
  await f.p.click("#sicherung-zurueck");
  await f.p.waitForSelector("[data-meldung]", { timeout: 30000 }).catch(() => {});
  ok("SICHERUNG: Zurückholen meldet die Zahl der Angebote", /Zurückgeholt: 4 Angebote, 1 Kunden/.test(await f.p.textContent("[data-meldung]").catch(() => "")), await f.p.textContent("[data-meldung]").catch(() => ""));
  await f.p.click('[data-reiter="angebote"]');
  ok("SICHERUNG: die Angebote stehen im frischen Browser", await f.p.locator("[data-angebot-zeile]").count() === 4);
  ok("SICHERUNG: der eigene Katalog (EK 7,31 €) kam mit", await f.p.evaluate(() => JSON.parse(localStorage.getItem("workflowcalculate_katalog") || "null")?.materialien.find((m) => m.id === "tasse_11").ekCent) === 731);
  await f.ctx.close();

  /* ── Stufe 3: Arbeitsgebiete, Stickerei, Einheit, Nachkalkulation ── */
  {
    const s3 = await seite(1200), q = s3.p;
    await q.goto(url); await q.waitForSelector("body[data-bereit]"); await zuAngeboten(q);
    await tippe(q, '[data-reiter="katalog"]', "Reiter Katalog");
    ok("GEBIET-SEITE: Stickerei und Dienstleistung stehen zum Hinzufügen da", await q.locator('[data-gebiet-hinzu="stickerei"]').count() === 1 && await q.locator('[data-gebiet-hinzu="dienstleistung"]').count() === 1);
    await tippe(q, '[data-gebiet-hinzu="stickerei"]', "Stickerei hinzufügen");
    await tippe(q, '[data-gebiet-hinzu="dienstleistung"]', "Dienstleistung hinzufügen");
    const katS = await q.evaluate(() => JSON.parse(localStorage.getItem("workflowcalculate_katalog") || "null"));
    ok("GEBIET-SEITE: Stickerei steht danach im Katalog (gespeichert)", !!katS && katS.gebiete.some((g) => g.id === "stickerei") && katS.vorlagen.some((v) => v.id === "polo_stick"));
    ok("GEBIET-SEITE: ein zweites Mal gibt es den Knopf nicht", await q.locator('[data-gebiet-hinzu="stickerei"]').count() === 0);

    await tippe(q, '[data-reiter="angebote"]', "Reiter Angebote");
    await tippe(q, "#neues-angebot", "Neues Angebot");
    await q.selectOption("#vorlage-wahl", "polo_stick");
    await tippe(q, '[data-beispiel-nehmen="polo_stick:b1"]', "Beispiel Polo");
    ok("STICK-SEITE: die Position fragt nach der Stichzahl (6000 aus dem Beispiel)", await q.inputValue('[data-position="P-1"] [data-feld="stiche"]').catch(() => "") === "6000");
    const n1 = await netto(q, "P-1");
    await q.fill('[data-position="P-1"] [data-feld="stiche"]', "12000"); await q.press('[data-position="P-1"] [data-feld="stiche"]', "Tab");
    const n2 = await netto(q, "P-1");
    ok("STICK-SEITE: doppelte Stichzahl macht die Position teurer", n2 > n1, [n1, n2]);
    await q.selectOption("#vorlage-wahl", "arbeit_std");
    await tippe(q, '[data-beispiel-nehmen="arbeit_std:b1"]', "Beispiel Arbeit");
    const bl = await druck(q, "#druck-angebot");
    ok("EINHEIT-SEITE: das Kundenblatt sagt „4 Std.“ und „20 Stk.“", /4 Std\./.test(bl.text) && /20 Stk\./.test(bl.text), bl.text.slice(0, 300));

    ok("NK-SEITE: am Entwurf steht keine Nachkalkulation", await q.locator("[data-nachkalk]").count() === 0);
    await tippe(q, "#stellen", "Angebot stellen");
    ok("NK-SEITE: am gestellten Angebot steht die Nachkalkulation", await q.locator("[data-nachkalk]").count() === 1);
    await q.evaluate(() => { const d = document.querySelector("[data-nachkalk]"); if (d) d.open = true; });
    const planMin = await q.getAttribute('[data-ist="P-1:minuten"]', "placeholder").catch(() => "");
    const dbVor = Number(await q.getAttribute("[data-nk-summe]", "data-db-ist").catch(() => "NaN"));
    await q.fill('[data-ist="P-1:minuten"]', String(Number(planMin.replace(",", ".")) * 2).replace(".", ","));
    await q.press('[data-ist="P-1:minuten"]', "Tab");
    const dbNach = Number(await q.getAttribute("[data-nk-summe]", "data-db-ist").catch(() => "NaN"));
    ok("NK-SEITE: doppelte Ist-Zeit senkt den Deckungsbeitrag", planMin !== "" && dbNach < dbVor, [planMin, dbVor, dbNach]);
    ok("NK-SEITE: die zweite Position ohne Ist-Werte wird benannt", await q.getAttribute("[data-nk-ausplan]", "data-nk-ausplan").catch(() => "") === "1");
    ok("NK-SEITE: die Eingabe ändert das Angebot nicht", await q.locator("[data-nur-lesen]").count() === 1);
    const bl2 = await druck(q, "#druck-angebot");
    ok("NK-SEITE: nichts von der Nachkalkulation auf dem Kundenblatt", bl2.text === bl.text.replace(/./g, (x) => x) && !/Nachkalk|Ist|Plan/.test(bl2.text));

    await tippe(q, '[data-reiter="angebote"]', "Reiter Angebote");
    ok("NK-SEITE: je Vorlage steht der Faktor × 2", await q.getAttribute('[data-nk-vorlage="polo_stick"]', "data-faktor").catch(() => "") === "2");
    await tippe(q, '[data-kalibrieren="polo_stick"]', "Zeit-Muster übernehmen");
    const katN = await q.evaluate(() => JSON.parse(localStorage.getItem("workflowcalculate_katalog") || "null"));
    const polo = katN && katN.vorlagen.find((v) => v.id === "polo_stick");
    ok("NK-SEITE: übernommen — Punchen 45 → 90 min, im Verlauf der Vorlage", polo && polo.schritte.find((s) => s.id === "punchen").ruestMin === 90 && polo.verlauf.length === 1);
    ok("NK-SEITE: danach kein zweites Übernehmen", await q.locator('[data-kalibrieren="polo_stick"]').count() === 0 && await q.locator('[data-nk-uebernommen="polo_stick"]').count() === 1);
    await q.setViewportSize({ width: 380, height: 900 });
    const breitL = await q.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
    await q.locator("[data-angebot-zeile]").first().click();
    await q.evaluate(() => { const d = document.querySelector("[data-nachkalk]"); if (d) d.open = true; });
    const breitA = await q.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
    ok("HANDY: Nachkalkulation und Liste je Vorlage passen auf 380 px", breitL && breitA, [breitL, breitA]);
    await s3.ctx.close();
  }

  /* ── Beispiel-Angebote: laden, ansehen, an WorkFloh und BookLedgerPro übergeben ── */
  {
    const s4 = await seite(1200), q = s4.p;
    await q.goto(url); await q.waitForSelector("body[data-bereit]"); await zuAngeboten(q);
    ok("BEISPIEL-SEITE: Auswahl und „Alle laden“ stehen gleich bei „＋ Neues Angebot“", await q.locator("[data-beispiel-angebote] #beispiel-wahl option").count() === 5);
    await tippe(q, "#beispiel-alle", "Alle Beispiele laden");
    ok("BEISPIEL-SEITE: fünf Angebote stehen in der Liste", await q.locator("[data-angebot-zeile]").count() === 5);
    await tippe(q, "#beispiel-alle", "noch einmal alle laden");
    ok("BEISPIEL-SEITE: ein zweites Laden legt nichts doppelt an", await q.locator("[data-angebot-zeile]").count() === 5 && /Schon geladen/.test(await q.textContent("[data-meldung]").catch(() => "")));
    await q.locator("[data-angebot-zeile]", { hasText: "Sportverein" }).click();
    ok("BEISPIEL-SEITE: das Vereins-Angebot hat 4 kalkulierte Positionen", await q.locator("[data-position] [data-pos-netto]").count() === 4 && await q.locator("[data-nicht-kalkuliert]").count() === 0);
    ok("BEISPIEL-SEITE: es sagt, dass es ein Beispiel ist", await q.locator("[data-notiz] .badge").count() === 1);
    await q.evaluate(() => { window.__wcUebergabe = null; });
    await tippe(q, "#uebergabe", "An WorkFloh übergeben");
    const ub = await q.evaluate(() => window.__wcUebergabe || "");
    let bu = null; try { bu = JSON.parse(ub); } catch { /* bleibt null */ }
    /* Gegen die echten WorkFlohs: dieselbe Datei über deren eigenes applyForwardBundle — nur wenn der Klon daneben liegt */
    for (const [name, pfadWF] of [["Mein WorkFloh", process.env.WORKFLOH_KLON || join(NEBEN, "Mein-WorkFloh")], ["Tomys WorkFloh", process.env.TOMYS_KLON || join(NEBEN, "Tomys-Hub", "workfloh")]]) {
      if (!existsSync(join(pfadWF, "index.html")) || !bu) { console.log("hinweis: " + name + " liegt nicht daneben — Import-Probe übersprungen"); continue; }
      const sv = await starteServer(0, pfadWF), wf = await seite(1200);
      wf.p.on("dialog", (d) => d.accept());
      await wf.p.goto(sv.url); await wf.p.waitForFunction(() => typeof applyForwardBundle === "function", null, { timeout: 20000 }).catch(() => {});
      const auf = await wf.p.evaluate(async (o) => { await applyForwardBundle(o); return AUF.filter((a) => a.nr === o.auftraege[0].nr).map((a) => ({ nr: a.nr, status: a.status, kunde: a.data.nameFirma, preis: a.data.preis, text: a.data.beschreibung })); }, bu).catch((e) => String(e));
      ok("WORKFLOH-IMPORT: " + name + " liest den Beispiel-Auftrag ein (Nr., Kunde, Preis, Positionen)", Array.isArray(auf) && auf.length === 1 && auf[0].status === "angebot" &&
        auf[0].kunde === "Sportverein Beispiel e. V." && /brutto/.test(auf[0].preis) && /Trainer-Polo/.test(auf[0].text) && /Aufnäher/.test(auf[0].text), auf);
      await wf.ctx.close(); sv.server.close();
    }
    ok("BEISPIEL-SEITE: WorkFloh-Datei mit Kunde und allen 4 Positionen", !!bu && bu.wf === "forward" && /Sportverein Beispiel/.test(ub) && /Trainer-Polo/.test(ub) && /Aufnäher/.test(ub), ub.slice(0, 200));
    await q.evaluate(() => { window.__wcSprungAbfangen = true; window.__wcSprung = null; });
    await tippe(q, "#an-blp", "An BookLedgerPro");
    await q.waitForFunction(() => !!window.__wcSprung, null, { timeout: 5000 }).catch(() => {});
    ok("BEISPIEL-SEITE: Sprung nach BookLedgerPro mit dem Beispiel", (await q.evaluate(() => window.__wcSprung || "")).startsWith("https://lausiklauskn-png.github.io/BookLedgerPro/?uebernahme="));
    await tippe(q, '[data-reiter="angebote"]', "Reiter Angebote");
    await q.locator("[data-angebot-zeile]", { hasText: "Handwerk" }).click();
    const bl = await druck(q, "#druck-angebot");
    ok("BEISPIEL-SEITE: Kundenblatt der Fahrzeugbeschriftung nennt „3 Std.“ Gestaltung", /3 Std\./.test(bl.text) && /Handwerk Beispiel GmbH/.test(bl.text));
    await s4.ctx.close();
  }

  /* ── KI-Recherche im Browser — gestellte Gegenseite, nichts geht wirklich hinaus ── */
  {
    const { teilA, teilB } = await import("./daten/ki-antwort.mjs");
    const s6 = await seite(1200), q = s6.p;
    await q.goto(url); await q.waitForSelector("body[data-bereit]"); await zuAngeboten(q);
    await tippe(q, "#neues-angebot", "Neues Angebot");
    await q.selectOption("#vorlage-wahl", "tasse"); await tippe(q, '[data-beispiel-nehmen="tasse:b1"]', "Beispiel Tasse");
    await q.fill('[data-position="P-1"] input[data-key="P-1-titel"]', "GEHEIM-TITEL Kunde Beispiel");
    await q.evaluate((antworten) => { window.__kiAnfragen = []; window.__wcKiFetch = async (u, o) => { window.__kiAnfragen.push({ u, o }); const j = antworten.shift(); return { ok: true, status: 200, json: async () => j }; }; }, [teilA(), teilB()]);
    await tippe(q, '[data-markt-knopf="P-1"]', "Marktvergleich");
    await tippe(q, '[data-ki-knopf="P-1"]', "KI-Recherche");
    ok("KI-SEITE: vor dem Senden steht da, was hinausgeht — ohne Titel", /50 Stk\. · Tasse bedrucken/.test(await q.textContent("[data-ki-auftrag]").catch(() => "")) && !/GEHEIM/.test(await q.textContent("[data-ki-auftrag]").catch(() => "GEHEIM")));
    await q.fill("#ki-schluessel", "kein-schluessel");
    await tippe(q, "#ki-schluessel-setzen", "Schlüssel übernehmen (falsch)");
    ok("KI-SEITE: ein falsch geformter Schlüssel wird abgewiesen, bevor etwas hinausgeht", /falscher Anfang/.test(await q.textContent("#ki-meldung").catch(() => "")) && await q.evaluate(() => window.__kiAnfragen.length) === 0);
    await q.fill("#ki-schluessel", "sk-ant-" + "x".repeat(50));
    await tippe(q, "#ki-schluessel-setzen", "Schlüssel übernehmen");
    await tippe(q, "#ki-los", "Jetzt recherchieren");
    await q.waitForSelector("[data-ki-ergebnis]", { timeout: 10000 }).catch(() => {});
    ok("KI-SEITE: 2 belegte Preise, 2 verworfen mit Grund", await q.getAttribute("[data-ki-ergebnis]", "data-ki-ergebnis").catch(() => "") === "2" && await q.getAttribute("[data-ki-ergebnis]", "data-ki-verworfen").catch(() => "") === "2" &&
      /nicht im zitierten Text/.test(await q.textContent("[data-ki-verworfen-liste]").catch(() => "")));
    const req = await q.evaluate(() => window.__kiAnfragen.map((x) => x.o.body).join(" "));
    ok("KI-SEITE: in der Anfrage steht kein Titel und kein Kunde", req.length > 0 && !/GEHEIM|Kunde Beispiel/.test(req));
    ok("KI-SEITE: die Funde stehen ungeprüft mit Quelle in der Liste", await q.locator('[data-markt-zeile="ungeprueft"]').count() === 2 && await q.locator("[data-markt-quelle]").count() >= 2 && await q.locator("[data-markt-ungeprueft]").count() === 1);
    ok("KI-SEITE: ungeprüft gibt es noch keinen Vergleich", await q.locator("[data-kein-vergleich]").count() === 1);
    await tippe(q, "[data-markt-pruefen]", "✓ geprüft");
    ok("KI-SEITE: nach ✓ zählt der Preis im Vergleich", await q.locator('[data-markt-zeile="geprueft"]').count() === 1 && await q.locator("[data-kein-vergleich]").count() === 0);
    await s6.ctx.close();
  }

  /* ── ← Zurück: Knopf und Android-Taste gehen dieselben Schritte zurück, die App schließt nicht (Klaus 2026-10-12) ── */
  {
    const sz = await seite(1200), q = sz.p;
    await q.goto(url); await q.waitForSelector("body[data-bereit]");
    const anfangTiefe = await q.getAttribute("#seite-zurueck", "data-tiefe"), anfangLaenge = await q.evaluate(() => history.length);
    await tippe(q, '[data-reiter="katalog"]', "Reiter Katalog");
    await tippe(q, '[data-kat-reiter="lieferanten"]', "Katalog-Reiter Lieferanten");
    await tippe(q, '[data-kat-reiter="verfahren"]', "Katalog-Reiter Verfahren");
    const erster = q.locator("[data-kat-eintrag]").first(), eid = await erster.getAttribute("data-kat-eintrag").catch(() => "");
    await tippe(q, "[data-kat-eintrag]", "Katalog-Eintrag aufklappen");
    await tippe(q, '[data-reiter="einstellungen"]', "Reiter Einstellungen");
    await tippe(q, "#handel-knopf", "Knopf Handelsware");
    const tiefe = Number(await q.getAttribute("#seite-zurueck", "data-tiefe")) - Number(anfangTiefe);
    const laenge = (await q.evaluate(() => history.length)) - anfangLaenge;
    ok("ZURÜCK: jeder Wechsel der Ansicht ist ein Schritt (6 Schritte gezählt, 6 im Verlauf des Browsers)", tiefe === 6 && laenge === 6 && !(await q.locator("#seite-zurueck").isDisabled()), { tiefe, laenge });
    const wo = () => q.evaluate(() => { const st = history.state || {}; return [st.reiter, st.katReiter || "", st.katOffen || "", location.hash].join("|"); });
    await tippe(q, "#seite-zurueck", "← Zurück 1");
    ok("ZURÜCK: ← von Handelsware führt in die Einstellungen (Adresse ohne #handel)", (await wo()) === "einstellungen|||" && await q.locator('[data-reiter="einstellungen"].on').count() === 1, await wo());
    await tippe(q, "#seite-zurueck", "← Zurück 2");
    ok("ZURÜCK: ← führt in den Katalog mit dem aufgeklappten Eintrag", (await wo()) === "katalog|verfahren|" + eid + "|" && await q.locator('[data-kat-reiter="verfahren"].on').count() === 1, await wo());
    await q.goBack(); await q.waitForTimeout(150);
    ok("ZURÜCK: die Zurück-Taste des Geräts klappt den Eintrag wieder zu", (await wo()) === "katalog|verfahren||", await wo());
    await tippe(q, "#seite-zurueck", "← Zurück 4");
    ok("ZURÜCK: ← führt zum vorigen Katalog-Reiter (Lieferanten)", (await wo()) === "katalog|lieferanten||" && await q.locator('[data-kat-reiter="lieferanten"].on').count() === 1, await wo());
    await tippe(q, "#seite-zurueck", "← Zurück 5"); await tippe(q, "#seite-zurueck", "← Zurück 6"); await q.waitForTimeout(150);
    ok("ZURÜCK: nach allen Schritten steht die Startansicht (Suche) da und ← ist grau (schließt nie die App)", (await wo()).startsWith("suche|") && await q.locator("#seite-zurueck").isDisabled() && q.url().startsWith(url), await wo());
    await sz.ctx.close();
  }

  /* ── 🛒 Handelsware: eigene Seite #handel, Lieferanten, ins Angebot, nichts Internes hinaus ── */
  {
    const s7 = await seite(1200), q = s7.p;
    await q.goto(url + "#handel");
    await q.waitForSelector("body[data-bereit]");
    ok("HANDEL-SEITE: #handel öffnet die Seite direkt (Lesezeichen, neuer Tab)", await q.locator("[data-handel-seite]").count() === 1 && /\bon\b/.test(await q.getAttribute("#handel-knopf", "class")));
    ok("HANDEL-SEITE: der Knopf „↗ in neuem Tab“ führt auf #handel", await q.getAttribute("[data-neuer-tab]", "href") === "#handel" && await q.getAttribute("[data-neuer-tab]", "target") === "_blank");
    await tippe(q, "[data-handel-start]", "Beispiele Handelsware holen");
    ok("HANDEL-SEITE: Kulis und Visitenkarten (250/500/1000) stehen da", await q.locator('[data-handel-produkt="kuli_zukauf"]').count() === 1 &&
      await q.locator('[data-handel-produkt="visitenkarten_zukauf"] [data-handel-zeile]').count() === 3);
    const z500 = q.locator('[data-handel-produkt="kuli_zukauf"] [data-handel-zeile="500"]');
    ok("HANDEL-SEITE: 500 Kulis, Einkauf 120,00 € → Verkauf 180,00 €, Spanne 60,00 €", await z500.getAttribute("data-einkauf").catch(() => "") === "12000" &&
      await z500.getAttribute("data-verkauf").catch(() => "") === "18000" && await z500.locator("[data-spanne]").getAttribute("data-spanne").catch(() => "") === "6000" && /50 %/.test(await z500.locator("[data-aufschlag]").textContent().catch(() => "")));
    await q.selectOption("[data-handel-klasse]", "C");
    ok("HANDEL-SEITE: Kundenklasse C rechnet mit +10 % Gewinn (195,00 €)", await z500.getAttribute("data-verkauf").catch(() => "") === "19500");
    await q.selectOption("[data-handel-klasse]", "B");
    const katLS = () => q.evaluate(() => JSON.parse(localStorage.getItem("workflowcalculate_katalog") || "null"));
    ok("HANDEL-SEITE: Vorschläge stehen da — eingetragen ist noch kein Lieferant", await q.locator("[data-vorschlag]").count() >= 5 && ((await katLS()) || {}).lieferanten.length === 0);
    await q.locator("[data-vorschlaege] summary").click();
    await tippe(q, '[data-vorschlag-uebernehmen="saxoprint"]', "Vorschlag SAXOPRINT übernehmen");
    const lf = ((await katLS()) || { lieferanten: [] }).lieferanten;
    ok("HANDEL-SEITE: „✓ geprüft“ trägt genau diesen Lieferanten ein, mit dem Datum des Tipps", lf.length === 1 && lf[0].id === "saxoprint" && /^\d{4}-\d\d-\d\d$/.test(lf[0].geprueftAm || "") &&
      await q.locator('[data-lieferant="saxoprint"] [data-lieferant-link]').getAttribute("href").catch(() => "") === "https://www.saxoprint.de/", lf);

    /* Eigener Einkauf mit Prüfwerten */
    await tippe(q, '[data-handel-bearbeiten="kuli_zukauf"]', "Einkauf bearbeiten");
    const zeile = q.locator('[data-handel-editor="kuli_zukauf"] [data-einkauf-zeile="0"]');
    await zeile.locator('[data-kat-feld="url"]').fill("javascript:alert(1)"); await zeile.locator('[data-kat-feld="url"]').press("Tab");
    ok("HANDEL-SEITE: eine javascript:-Adresse wird abgewiesen", /https:\/\//.test(await q.textContent("[data-meldung]").catch(() => "")) && !(K_kuli(await katLS()).einkauf[0].url));
    await zeile.locator('[data-kat-feld="gesamtCent"]').fill("123,45"); await zeile.locator('[data-kat-feld="gesamtCent"]').press("Tab");
    await q.locator('[data-handel-editor="kuli_zukauf"] [data-einkauf-zeile="0"] [data-kat-feld="lieferant"]').selectOption("saxoprint");
    const z2 = q.locator('[data-handel-editor="kuli_zukauf"] [data-einkauf-zeile="0"]');
    await z2.locator('[data-kat-feld="url"]').fill("https://lieferant-pruefwort.example/kuli-4711"); await z2.locator('[data-kat-feld="url"]').press("Tab");
    ok("HANDEL-SEITE: eigener Einkaufspreis rechnet sofort neu (123,45 € → 185,17 €)", await z500.getAttribute("data-verkauf").catch(() => "") === "18517", await z500.getAttribute("data-verkauf").catch(() => ""));
    ok("HANDEL-SEITE: eigener Einkaufspreis nimmt die Platzhalter-Marke des Einkaufs weg (die Sätze bleiben markiert)", await q.locator('[data-handel-produkt="kuli_zukauf"] [data-einkauf-platzhalter]').count() === 0 &&
      await q.locator('[data-handel-produkt="kuli_zukauf"] [data-saetze-platzhalter]').count() === 1 && await q.locator('[data-handel-produkt="visitenkarten_zukauf"] [data-einkauf-platzhalter]').count() === 1);
    ok("HANDEL-SEITE: Lieferant und Link stehen in der Zeile", /SAXOPRINT/.test(await z500.textContent().catch(() => "")) && await z500.locator("[data-lieferant-link]").getAttribute("href").catch(() => "") === "https://lieferant-pruefwort.example/kuli-4711");

    await tippe(q, '[data-ins-angebot="kuli_zukauf:500"]', "ins Angebot");
    ok("HANDEL-SEITE: „ins Angebot“ legt die Position an (185,17 €) und verlässt #handel", await netto(q, "P-1") === 18517 && await q.evaluate(() => location.hash) === "" && /neu angelegt/.test(await q.textContent("[data-meldung]").catch(() => "")));
    ok("HANDEL-SEITE: kein eigener Versandposten im Angebot", /Nichts zu versenden/.test(await q.textContent("[data-versand]").catch(() => "")));
    ok("HANDEL-SEITE: die Position sagt, dass es ein Einkaufsprodukt ist", await q.locator('[data-position="P-1"] [data-handel-hinweis]').count() === 1);
    const opts = await q.locator("#vorlage-wahl option").evaluateAll((l) => l.map((o) => o.value));
    ok("HANDEL-SEITE: Einkaufsprodukte stehen nicht in der Produktwahl der Eigenfertigung", opts.includes("tasse") && !opts.includes("kuli_zukauf") && !opts.includes("visitenkarten_zukauf") && await q.locator("[data-handel-verweis]").count() === 1, opts);
    const bl = await druck(q, "#druck-angebot");
    ok("HANDEL-SEITE: Kundenblatt trägt den Verkauf (185,17 €), aber keinen Lieferanten, Link oder Einkauf", /185,17/.test(bl.text) && !/SAXOPRINT|saxoprint|pruefwort|kuli-4711|123,45|Einkauf|Handlungsk/i.test(bl.html), bl.text.slice(0, 300));
    await q.evaluate(() => { window.__wcUebergabe = null; });
    await tippe(q, "#uebergabe", "An WorkFloh übergeben");
    await q.waitForFunction(() => !!window.__wcUebergabe, null, { timeout: 5000 }).catch(() => {});
    const datei = await q.evaluate(() => window.__wcUebergabe || "");
    ok("HANDEL-SEITE: Auftragsdatei für WorkFloh ohne Lieferant, Link, Einkauf", datei.length > 50 && /185,17/.test(datei) && !/SAXOPRINT|saxoprint|pruefwort|kuli-4711|123,45/i.test(datei), datei.slice(0, 200));

    /* Katalog: Einkaufsprodukte nicht unter Produktvorlagen; der Haken lenkt eine Vorlage auf die Seite */
    await tippe(q, '[data-reiter="katalog"]', "Reiter Katalog");
    await tippe(q, '[data-kat-reiter="vorlagen"]', "Katalog Produktvorlagen");
    ok("HANDEL-SEITE: im Katalog stehen die Einkaufsprodukte nicht unter den Produktvorlagen", await q.locator('[data-kat-eintrag="kuli_zukauf"]').count() === 0 && await q.getAttribute("[data-kat-handel]", "data-kat-handel").catch(() => "") === "7");
    await tippe(q, '[data-kat-eintrag="tasse"]', "Vorlage Tasse");
    await q.locator('[data-kat-id="tasse"] [data-kat-feld="einkaufsprodukt"]').click();
    ok("HANDEL-SEITE: Haken „Einkaufsprodukt“ nimmt die Vorlage aus der Liste", await q.locator('[data-kat-eintrag="tasse"]').count() === 0);
    await tippe(q, "#handel-knopf", "Knopf Handelsware");
    ok("HANDEL-SEITE: … und sie steht auf der Seite Handelsware, ohne geschätzten Preis", await q.locator('[data-handel-produkt="tasse"]').count() === 1 && await q.locator('[data-handel-produkt="tasse"] [data-handel-zeile]').count() === 0 &&
      await q.evaluate(() => location.hash) === "#handel");
    await tippe(q, '[data-reiter="katalog"]', "Reiter Katalog");
    await tippe(q, '[data-kat-reiter="lieferanten"]', "Katalog Lieferanten");
    ok("HANDEL-SEITE: der Katalog hat den Reiter „Lieferanten“ mit dem geprüften Eintrag", await q.locator('[data-kat-eintrag="saxoprint"]').count() === 1);
    await s7.ctx.close();

    const s8 = await seite(380), hq = s8.p;
    await hq.goto(url + "#handel"); await hq.waitForSelector("body[data-bereit]");
    await tippe(hq, "[data-handel-start]", "Beispiele Handelsware holen (Handy)");
    ok("HANDY: die Seite Handelsware passt auf 380 px (Tabelle rollt in sich)", await hq.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1) && await hq.locator("[data-handel-tabelle]").count() === 7);
    await s8.ctx.close();
  }

  /* ── Lasergravur: Einzelstück mit Namen, Fremdfertigung wenn das Gerät fehlt ── */
  {
    const s9 = await seite(1200), q = s9.p;
    await q.goto(url + "#handel"); await q.waitForSelector("body[data-bereit]");
    await tippe(q, '[data-handel-start-paket="laser"]', "Lasergravur holen");
    ok("LASER-SEITE: die Lohngravuren stehen gruppiert auf der Seite Handelsware", await q.locator('[data-handel-gruppe="laser"]').count() === 1 &&
      await q.locator('[data-handel-produkt="name_oeffner_zukauf"] [data-herstellung]').count() === 1);
    await tippe(q, '[data-reiter="angebote"]', "Reiter Angebote");
    await tippe(q, "#neues-angebot", "Neues Angebot");
    await q.selectOption("#vorlage-wahl", "name_karte_holz");
    ok("LASER-SEITE: die Holzkarte zeigt Beispiele mit Zeichnung und Preis (1 Name, 60 Namen)", await q.locator('[data-galerie="name_karte_holz"] [data-beispiel-preis]').count() === 2 &&
      await q.locator('[data-galerie="name_karte_holz"] img.gross').count() === 2);
    await q.selectOption("#vorlage-wahl", "name_oeffner");
    await tippe(q, "#position-leer", "Leere Position");
    await q.locator('[data-position="P-1"] [data-feld="menge"]').fill("60"); await q.locator('[data-position="P-1"] [data-feld="menge"]').press("Tab");
    ok("LASER-SEITE: Flaschenöffner (Faserlaser fehlt) — nicht kalkuliert, mit Knopf zur Fremdfertigung", /kein eigenes Gerät/.test(await q.textContent('[data-position="P-1"] [data-nicht-kalkuliert]').catch(() => "")) &&
      await q.locator('[data-fremd-nehmen="name_oeffner_zukauf"]').count() === 1);
    await tippe(q, '[data-fremd-nehmen="name_oeffner_zukauf"]', "Fremdfertigung nehmen");
    ok("LASER-SEITE: Fremdfertigung genommen — Menge bleibt 60 und rechnet aus der Staffel ab 50 (Stückpreis × 60)",
      await q.inputValue('[data-position="P-1"] [data-feld="menge"]').catch(() => "") === "60" && (await netto(q, "P-1")) > 0 &&
      await q.locator('[data-position="P-1"] [data-nicht-kalkuliert]').count() === 0);
    await q.locator('[data-position="P-1"] [data-feld="menge"]').fill("50"); await q.locator('[data-position="P-1"] [data-feld="menge"]').press("Tab");
    ok("LASER-SEITE: bei 50 Stück rechnet die Fremdfertigung (Einkauf + Aufschlag)", (await netto(q, "P-1")) > 0 && await q.locator('[data-position="P-1"] [data-handel-hinweis]').count() === 1);
    const bl = await druck(q, "#druck-angebot");
    ok("LASER-SEITE: Kundenblatt sagt „Flaschenöffner mit Namensgravur“ — ohne Zukauf, Lohngravur, Laser", /Flaschenöffner mit Namensgravur/.test(bl.text) && !/Zukauf|Lohngravur|Faserlaser|Hersteller/i.test(bl.html), bl.text.slice(0, 300));
    await s9.ctx.close();
  }

  /* ── Kleinmengenzuschlag: eigene Zeile unter 10 Stück ── */
  {
    const s10 = await seite(1200), q = s10.p;
    await q.goto(url); await q.waitForSelector("body[data-bereit]"); await zuAngeboten(q);
    await tippe(q, "#neues-angebot", "Neues Angebot");
    await q.selectOption("#vorlage-wahl", "tasse"); await tippe(q, "#position-leer", "Leere Position");
    await q.locator('[data-position="P-1"] [data-feld="menge"]').fill("2"); await q.locator('[data-position="P-1"] [data-feld="menge"]').press("Tab");
    ok("KLEIN-SEITE: 2 Tassen → Karte „Kleinmengenzuschlag“ mit 12,00 €", await q.getAttribute("[data-kleinmenge]", "data-kleinmenge").catch(() => "") === "1200");
    ok("KLEIN-SEITE: 12,00 € ist Klaus' Wert — keine Platzhalter-Marke", await q.evaluate(() => { const k = window.WCApp.S.katalog; return !!k.kleinmenge && k.kleinmenge.cent === 1200 && !k.kleinmenge.platzhalter; }));
    let bl = await druck(q, "#druck-angebot");
    ok("KLEIN-SEITE: Kundenblatt trägt die eigene Zeile", await q.locator("#druck [data-blatt-kleinmenge]").count() === 1 && /Kleinmengenzuschlag/.test(bl.text) && /12,00/.test(bl.text));
    await tippe(q, "[data-kleinmenge-schalter]", "Kleinmengenzuschlag weglassen");
    bl = await druck(q, "#druck-angebot");
    ok("KLEIN-SEITE: „weglassen“ nimmt die Zeile vom Blatt", await q.getAttribute("[data-kleinmenge]", "data-kleinmenge").catch(() => "") === "weg" && !/Kleinmengenzuschlag/.test(bl.text));
    await tippe(q, "[data-kleinmenge-schalter]", "Kleinmengenzuschlag wieder aufnehmen");
    await tippe(q, '[data-reiter="einstellungen"]', "Reiter Einstellungen");
    await q.locator('[data-kleinmenge-einst] [data-kat-feld="cent"]').fill("15,00"); await q.locator('[data-kleinmenge-einst] [data-kat-feld="cent"]').press("Tab");
    await tippe(q, '[data-reiter="angebot"]', "Reiter Angebot");
    ok("KLEIN-SEITE: eigener Betrag aus den Einstellungen (15,00 €) gilt sofort", await q.getAttribute("[data-kleinmenge]", "data-kleinmenge").catch(() => "") === "1500");
    await q.locator('[data-position="P-1"] [data-feld="menge"]').fill("10"); await q.locator('[data-position="P-1"] [data-feld="menge"]').press("Tab");
    ok("KLEIN-SEITE: ab 10 Stück keine Karte, keine Zeile", await q.locator("[data-kleinmenge]").count() === 0);
    await s10.ctx.close();
  }

  /* ── 📥 Anfrage einlesen, alte Angebote nach Ähnlichkeit, Entwurf — erfundene Mails ── */
  {
    const { readFileSync } = await import("node:fs");
    const DAT = join(dirname(fileURLToPath(import.meta.url)), "daten", "anfragen");
    const s11 = await seite(1200), q = s11.p;
    await q.goto(url); await q.waitForSelector("body[data-bereit]"); await zuAngeboten(q);
    await tippe(q, '[data-reiter="kunden"]', "Reiter Kunden");
    await tippe(q, "#neuer-kunde", "Neuer Kunde");
    await q.locator('[data-kunde="K-1"] input').first().fill("Sportverein Beispiel e.V.");
    await q.fill('[data-kunde-nr="K-1"]', "10234");
    await tippe(q, '[data-reiter="angebote"]', "Reiter Angebote");
    await tippe(q, "#neues-angebot", "Neues Angebot");
    await q.selectOption("#kunde-wahl", "K-1");
    await q.fill('[data-key="titel"]', "Vereinstassen");
    await q.selectOption("#vorlage-wahl", "tasse"); await tippe(q, "#position-leer", "Leere Position");
    await q.locator('[data-position="P-1"] [data-feld="menge"]').fill("50"); await q.locator('[data-position="P-1"] [data-feld="menge"]').press("Tab");
    await tippe(q, "#stellen", "Angebot stellen");
    const altId = await q.evaluate(() => window.WCApp.S.aktiv);
    await tippe(q, '[data-reiter="angebote"]', "Reiter Angebote");
    await tippe(q, "#anfrage-knopf", "Anfrage einlesen");
    await q.fill("#anfrage-text", readFileSync(join(DAT, "verein.txt"), "utf8"));
    await tippe(q, "#anfrage-lesen", "Lesen");
    ok("ANFRAGE-SEITE: erkannt — Kunde über die Kundennummer, 80 Tassen", /Sportverein Beispiel e\.V\. \(über Kundennummer 10234\)/.test(await q.textContent('[data-erkannt="kunde"]').catch(() => "")) &&
      /Tasse.*\(80\)/.test(await q.textContent('[data-erkannt="produkte"]').catch(() => "")));
    ok("ANFRAGE-SEITE: das alte Vereinsangebot steht oben, mit Grund", await q.getAttribute("[data-anfrage] [data-treffer-zeile]", "data-treffer-zeile").catch(() => "") === altId &&
      /gleicher Kunde/.test(await q.textContent("[data-anfrage] [data-treffer-zeile]").catch(() => "")) && await q.getAttribute("#anfrage-erzeugen", "data-basis") === altId);
    await tippe(q, "#anfrage-erzeugen", "Angebot erzeugen");
    ok("ANFRAGE-SEITE: Entwurf erzeugt — 80 Tassen, Kunde gesetzt, nicht gestellt, sagt, woher er kommt",
      await q.inputValue('[data-position="P-1"] [data-feld="menge"]').catch(() => "") === "80" && await q.locator("#stellen").count() === 1 &&
      /automatisch erstellt/.test(await q.textContent("[data-notiz]").catch(() => "")) && /50 → 80/.test(await q.textContent("[data-meldung]").catch(() => "")));
    const bl = await druck(q, "#druck-angebot");
    ok("ANFRAGE-SEITE: Kundenblatt ohne Absender-Adresse und ohne Hinweis auf die Automatik", /Sportverein/.test(bl.text) && !/sv-beispiel\.example|automatisch|Anfrage/.test(bl.text));
    await tippe(q, '[data-reiter="angebote"]', "Reiter Angebote");
    await q.fill("#angebot-suche", "Sportverein");
    ok("SUCHE-SEITE: Teil des Kundennamens findet beide Angebote des Vereins", await q.locator("[data-treffer-zeile]").count() === 2);
    await q.fill("#angebot-suche", "");
    await tippe(q, "#anfrage-knopf", "Anfrage einlesen (eml)");
    await q.setInputFiles("#anfrage-datei", { name: "hochzeit.eml", mimeType: "message/rfc822", buffer: readFileSync(join(DAT, "hochzeit.eml")) });
    await q.waitForSelector("[data-ohne-produkt]", { timeout: 5000 }).catch(() => {});
    ok("ANFRAGE-SEITE: ohne Laser im Katalog — „Tischkarten (60)“ wird als „kein passendes Produkt“ benannt", /„Tischkarten“ \(60\).*kein passendes Produkt/.test(await q.textContent("[data-ohne-produkt]").catch(() => "")));
    await tippe(q, '[data-reiter="katalog"]', "Reiter Katalog");
    await tippe(q, '[data-gebiet-hinzu="laser"]', "Lasergravur hinzufügen");
    await tippe(q, '[data-reiter="angebote"]', "Reiter Angebote");
    await q.setInputFiles("#anfrage-datei", { name: "hochzeit.eml", mimeType: "message/rfc822", buffer: readFileSync(join(DAT, "hochzeit.eml")) });
    await q.waitForSelector('[data-erkannt="produkte"]', { timeout: 5000 }).catch(() => {});
    ok("ANFRAGE-SEITE: .eml — Tischkarten (60) und Sektgläser (2), Kunde noch nicht angelegt", /Tischkarte.*\(60\)/.test(await q.textContent('[data-erkannt="produkte"]').catch(() => "")) &&
      /nicht im Kundenstamm.*Anna Brautpaar/.test(await q.textContent('[data-erkannt="kunde"]').catch(() => "")));
    await tippe(q, "[data-anfrage-kunde-neu]", "als Kunde anlegen");
    ok("ANFRAGE-SEITE: „als Kunde anlegen“ — danach ist der Kunde erkannt (E-Mail)", /Anna Brautpaar \(über E-Mail anna@example\.org\)/.test(await q.textContent('[data-erkannt="kunde"]').catch(() => "")));
    await s11.ctx.close();
  }

  /* ── 🤖 Anfrage mit KI lesen: prüfen, verdecken, einmal anhalten, nur Belegtes — Gegenseite gestellt ── */
  {
    const { readFileSync } = await import("node:fs");
    const DAT = join(dirname(fileURLToPath(import.meta.url)), "daten", "anfragen");
    const s12 = await seite(1200), q = s12.p;
    await q.goto(url); await q.waitForSelector("body[data-bereit]"); await zuAngeboten(q);
    await tippe(q, '[data-reiter="kunden"]', "Reiter Kunden");
    await tippe(q, "#neuer-kunde", "Neuer Kunde");
    await q.locator('[data-kunde="K-1"] input').first().fill("Sportverein Beispiel e.V.");
    await q.fill('[data-kunde-nr="K-1"]', "10234");
    await tippe(q, '[data-reiter="angebote"]', "Reiter Angebote");
    const antwort = JSON.stringify({ positionen: [{ vorlage: "tasse", menge: 120, zitat: "diesmal 120 Stück von den Tassen" }, { vorlage: "kuli", menge: 30, zitat: "dazu 30 Kulis" },
      { vorlage: "kuli", menge: 300, zitat: "dazu 30 Kulis" }], unklar: [] });
    await q.evaluate((antwort) => { window.__kiAnfragen = []; window.__wcKiFetch = async (u, o) => { window.__kiAnfragen.push({ u, o }); return { ok: true, status: 200, json: async () => ({ content: [{ type: "text", text: antwort }] }) }; }; }, antwort);
    await tippe(q, "#anfrage-knopf", "Anfrage einlesen");
    await q.setInputFiles("#anfrage-datei", { name: "frei.eml", mimeType: "message/rfc822", buffer: readFileSync(join(DAT, "frei-mit-befehl.eml")) });
    await q.waitForSelector("[data-ki-anfrage] summary", { timeout: 5000 }).catch(() => {});
    await q.locator("[data-ki-anfrage] summary").click();
    const verdeckt = await q.textContent("[data-ki-verdeckt]").catch(() => "");
    const PII = /Max|Beispiel|Sportverein|10234|23125|Musterstra|12345|Musterstadt|sv-beispiel/;
    ok("KI-ANFRAGE-SEITE: vor dem Senden steht der verdeckte Text da — ohne Namen, Nummern, Anschrift", verdeckt.length > 30 && /120 Stück von den Tassen/.test(verdeckt) && !PII.test(verdeckt), verdeckt);
    ok("KI-ANFRAGE-SEITE: die Anweisung an eine KI ist markiert", /KI-ANWEISUNG/.test(await q.textContent("[data-ki-halt]").catch(() => "")));
    await q.fill("#ki-schluessel", "sk-ant-" + "x".repeat(50));
    await tippe(q, "#ki-schluessel-setzen", "Schlüssel übernehmen");
    await tippe(q, "#ki-anfrage-los", "An die KI senden (erster Tipp)");
    ok("KI-ANFRAGE-SEITE: der erste Tipp hält an — nichts ist hinausgegangen", await q.evaluate(() => window.__kiAnfragen.length) === 0 && /noch einmal tippen/.test(await q.textContent("[data-ki-halt]").catch(() => "")));
    await tippe(q, "#ki-anfrage-los", "Trotzdem senden");
    await q.waitForSelector("[data-ki-anfrage-ergebnis]", { timeout: 10000 }).catch(() => {});
    const req = await q.evaluate(() => window.__kiAnfragen.map((x) => x.o.body).join(" "));
    ok("KI-ANFRAGE-SEITE: der zweite Tipp sendet — und im Körper steht nichts Persönliches", req.length > 0 && !PII.test(req) && !/vorstand@/.test(req));
    ok("KI-ANFRAGE-SEITE: 2 Positionen übernommen, 1 verworfen (Menge nicht im Zitat)", await q.getAttribute("[data-ki-anfrage-ergebnis]", "data-ki-anfrage-ergebnis").catch(() => "") === "2" &&
      await q.getAttribute("[data-ki-anfrage-ergebnis]", "data-ki-anfrage-verworfen").catch(() => "") === "1");
    await tippe(q, "#anfrage-erzeugen", "Angebot erzeugen");
    ok("KI-ANFRAGE-SEITE: Entwurf mit 120 Tassen und 30 Kulis, Kunde über die Kundennummer", await q.inputValue('[data-position="P-1"] [data-feld="menge"]').catch(() => "") === "120" &&
      await q.inputValue('[data-position="P-2"] [data-feld="menge"]').catch(() => "") === "30" && await q.inputValue("#kunde-wahl").catch(() => "") === "K-1");
    await s12.ctx.close();
  }

  /* ── 📎 Unterlagen am angenommenen Angebot: Entwurf, fertiges Produkt, Corel-Datei, Link ── */
  {
    const s13 = await seite(1200), q = s13.p;
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFklEQVR4nGP4z8DAwMDAxMDAwMDAAAANHQEDK+mmyAAAAABJRU5ErkJggg==", "base64");
    await q.goto(url); await q.waitForSelector("body[data-bereit]"); await zuAngeboten(q);
    await tippe(q, "#neues-angebot", "Neues Angebot");
    await q.fill("#kunde-neu-name", "Sportverein Beispiel e.V."); await tippe(q, "#kunde-neu-anlegen", "Kunde anlegen");
    await q.fill('[data-key="titel"]', "Vereinstassen");
    await q.selectOption("#vorlage-wahl", "tasse"); await tippe(q, "#position-leer", "Leere Position");
    await q.locator('[data-position="P-1"] [data-feld="menge"]').fill("50"); await q.locator('[data-position="P-1"] [data-feld="menge"]').press("Tab");
    ok("UL-SEITE: am Entwurf gibt es noch kein „angenommen“", await q.locator("#annehmen").count() === 0);
    await tippe(q, "#stellen", "Angebot stellen");
    await tippe(q, "#annehmen", "Auftrag erteilt");
    ok("UL-SEITE: gestellt → „✅ angenommen“ mit Datum", await q.locator("[data-angenommen]").count() === 1);
    const nettoVor = await netto(q, "P-1");
    /* fehlt das Feld (z. B. am gestellten Angebot gesperrt), wird es gemeldet statt 30 s zu warten */
    const ulDa = await tippe(q, '[data-unterlagen="P-1"] summary', "Unterlagen aufklappen");
    if (ulDa) {
    await q.selectOption('[data-unterlage-art="P-1"]', "entwurf"); await q.fill('[data-unterlage-notiz="P-1"]', "Ansicht vorne");
    await q.setInputFiles('[data-unterlage-datei="P-1"]', [{ name: "entwurf-vorne.png", mimeType: "image/png", buffer: png }]);
    await q.waitForSelector('[data-unterlage="U-1"]', { timeout: 5000 }).catch(() => {});
    await q.selectOption('[data-unterlage-art="P-1"]', "fertig"); await q.fill('[data-unterlage-notiz="P-1"]', "fertig, Foto");
    await q.setInputFiles('[data-unterlage-datei="P-1"]', [{ name: "foto-fertig.png", mimeType: "image/png", buffer: png }]);
    await q.waitForSelector('[data-unterlage="U-2"]', { timeout: 5000 }).catch(() => {});
    await q.selectOption('[data-unterlage-art="P-1"]', "datei"); await q.fill('[data-unterlage-notiz="P-1"]', "");
    await q.setInputFiles('[data-unterlage-datei="P-1"]', [{ name: "VEREINSLOGO-PRUEFWORT.cdr", mimeType: "", buffer: Buffer.from("CDR-PRUEFINHALT-0123456789") }]);
    await q.waitForSelector('[data-unterlage="U-3"]', { timeout: 5000 }).catch(() => {});
    await q.fill('[data-unterlage-url="P-1"]', "https://cloud.example/LINK-PRUEFWORT/motiv"); await q.fill('[data-unterlage-notiz="P-1"]', "Bildgenerierung");
    await tippe(q, '[data-unterlage-link="P-1"]', "Link dazu");
    }
    ok("UL-SEITE: zwei Bilder (Entwurf, fertig), die Corel-Datei und der Link stehen am gestellten Angebot", await q.locator('[data-unterlagen-bilder] figure').count() === 2 &&
      /VEREINSLOGO-PRUEFWORT\.cdr/.test(await q.textContent("[data-unterlagen-dateien]").catch(() => "")) && /LINK-PRUEFWORT/.test(await q.textContent("[data-unterlagen-dateien]").catch(() => "")));
    ok("UL-SEITE: der Preis bleibt, das Angebot bleibt gestellt", await netto(q, "P-1") === nettoVor && await q.locator("[data-nur-lesen]").count() === 1);
    const gespeichert = await q.evaluate(async () => { await window.WCApp.jetztSpeichern(); const a = window.WCApp.S.angebote[0]; return a.positionen[0].unterlagen.map((u) => u.art + ":" + u.typ); });
    ok("UL-SEITE: gespeichert mit Art und Dateityp (Corel aus der Endung)", gespeichert.join() === "entwurf:image/png,fertig:image/png,datei:application/vnd.corel-draw,link:", gespeichert);
    const bl = await druck(q, "#druck-angebot");
    ok("UL-SEITE: nichts von den Unterlagen auf dem Kundenblatt", !/PRUEFWORT|Bildgenerierung|Ansicht vorne|entwurf-vorne|foto-fertig/.test(bl.html));
    await q.evaluate(() => { window.__wcUebergabe = null; });
    await tippe(q, "#uebergabe", "An WorkFloh übergeben");
    await q.waitForFunction(() => !!window.__wcUebergabe, null, { timeout: 5000 }).catch(() => {});
    const bu = JSON.parse(await q.evaluate(() => window.__wcUebergabe || "{}") || "{}"), auf = (bu.auftraege || [])[0] || { files: [], data: {} };
    const cdr = (auf.files || []).find((f) => /VEREINSLOGO-PRUEFWORT\.cdr$/.test(f.name));
    ok("UL-SEITE: an WorkFloh gehen die Corel-Datei (Byte für Byte) und beide Bilder mit, der Link steht im Text",
      !!cdr && cdr.mime === "application/vnd.corel-draw" && Buffer.from(cdr.data.split(",")[1], "base64").toString() === "CDR-PRUEFINHALT-0123456789" &&
      (auf.files || []).filter((f) => /\.png$/.test(f.name)).length === 2 && /LINK-PRUEFWORT\/motiv \(Bildgenerierung\)/.test(auf.data.beschreibung || ""), (auf.files || []).map((f) => f.name));
    await tippe(q, '[data-als-beispiel="P-1"]', "Als Beispiel in die Vorlage");
    const bsp = await q.evaluate(() => { const v = window.WCApp.S.katalog.vorlagen.find((x) => x.id === "tasse"); return v.beispiele[v.beispiele.length - 1]; });
    ok("UL-SEITE: als Beispiel in der Vorlage „Tasse“ — fertig zuerst, zwei Ansichten, Menge 50", bsp && bsp.menge === 50 && bsp.ansichten.length === 2 && /^Fertiges Produkt/.test(bsp.ansichten[0][0]), bsp);
    await tippe(q, '[data-reiter="angebote"]', "Reiter Angebote");
    await q.fill("#angebot-suche", "vereinslogo");
    ok("SUCHE-SEITE: findet das Angebot über den Namen der Corel-Datei", await q.locator("[data-treffer-zeile]").count() === 1);
    await q.fill("#angebot-suche", "");
    const altId = await q.evaluate(() => window.WCApp.S.aktiv);
    await tippe(q, '[data-kopieren-anderer="' + altId + '"]', "für anderen Kunden");
    ok("UL-SEITE: „für anderen Kunden“ — neues Angebot ohne Kunde, mit Position und allen Unterlagen", await q.inputValue("#kunde-wahl").catch(() => "x") === "" &&
      await q.locator('[data-position="P-1"]').count() === 1 && /\(4\)/.test(await q.textContent('[data-unterlagen="P-1"] summary').catch(() => "")));
    await q.selectOption("#vorlage-wahl", "tasse");
    ok("UL-SEITE: das neue Beispiel steht in der Galerie mit Foto und frisch gerechnetem Preis", await q.locator('[data-galerie="tasse"] [data-beispiel] img.gross').count() >= 2 &&
      await q.locator('[data-galerie="tasse"] [data-beispiel-preis]').count() >= 2);
    await s13.ctx.close();
  }

  /* ── Vollbild: die Arbeitsfläche nutzt jede Breite (Klaus 2026-10-12) ── */
  {
    const v = await seite(1920), q = v.p;
    await q.goto(url); await q.waitForSelector("body[data-bereit]"); await zuAngeboten(q);
    await tippe(q, "#beispiel-laden", "Beispiel laden");
    const masse = [];
    for (const [b, hh] of [[360, 740], [740, 360], [1024, 768], [1920, 1080]]) {
      await q.setViewportSize({ width: b, height: hh });
      masse.push(await q.evaluate(() => { const m = document.querySelector("main").getBoundingClientRect(); return [Math.round(m.width), document.documentElement.clientWidth]; }));
    }
    ok("VOLLBILD: die Arbeitsfläche ist auf Handy hoch/quer, Tablet und großem Schirm so breit wie das Fenster", masse.every(([m, w]) => Math.abs(m - w) <= 1), masse);
    await tippe(q, "#vorschau-angebot", "Vorschau");
    const dlg = await q.evaluate(() => { const r = document.getElementById("vorschau").getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height), window.innerWidth, window.innerHeight]; });
    ok("VOLLBILD: die Vorschau füllt den ganzen Schirm", Math.abs(dlg[0] - dlg[2]) <= 1 && Math.abs(dlg[1] - dlg[3]) <= 1, dlg);
    /* Die Seite Handelsware: Vollbild auf jedem Gerät (Klaus 2026-10-13) — Verkauf und „ins Angebot“ ohne Wischen */
    await q.keyboard.press("Escape").catch(() => {});
    await q.goto(url + "#handel"); await q.waitForSelector("[data-handel-seite]");
    await tippe(q, "[data-handel-start]", "Beispiele Handelsware holen (Vollbild)");
    const hm = [];
    for (const [b, hh, name] of [[360, 740, "Handy hoch"], [740, 360, "Handy quer"], [1024, 768, "Tablet"], [1920, 1080, "großer Schirm"]]) {
      await q.setViewportSize({ width: b, height: hh });
      hm.push(await q.evaluate((name) => {
        const w = document.documentElement.clientWidth, m = document.querySelector("main").getBoundingClientRect();
        const karten = [...document.querySelectorAll("[data-handel-produkt]")].map((k) => k.getBoundingClientRect().width);
        const knopf = document.querySelector('[data-ins-angebot="visitenkarten_zukauf:1000"]').getBoundingClientRect();
        const verkauf = document.querySelector('[data-handel-produkt="visitenkarten_zukauf"] [data-handel-zeile="1000"] td:nth-child(2)').getBoundingClientRect();
        const huelle = document.querySelector('[data-handel-produkt="visitenkarten_zukauf"] .tabelle-huelle');
        return { name, w, main: Math.round(m.width), karteVoll: karten.every((x) => x >= m.width - 40), seiteRollt: document.documentElement.scrollWidth > w + 1,
          sichtbar: knopf.right <= w && verkauf.right <= w, tabellePasst: huelle.scrollWidth <= huelle.clientWidth + 1 };
      }, name));
    }
    ok("VOLLBILD: die Seite Handelsware ist auf Handy hoch/quer, Tablet und großem Schirm so breit wie das Fenster, die Karten füllen sie", hm.every((x) => Math.abs(x.main - x.w) <= 1 && x.karteVoll && !x.seiteRollt), hm);
    ok("VOLLBILD: Handelsware — Verkauf und „ins Angebot“ stehen auf jedem Gerät ohne Wischen da", hm.every((x) => x.sichtbar), hm);
    ok("VOLLBILD: Handelsware — ab Tablet passt die ganze Tabelle, ohne Rollen", hm.filter((x) => x.w >= 1024).every((x) => x.tabellePasst), hm);
    await v.ctx.close();
  }

  /* ── 🔎 SUCHE — die Startseite (Klaus 2026-10-12) ── */
  {
    const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 } });
    /* gestellte Spracherkennung (wie Workflow PDF tests/sprechen.mjs) und ein gestelltes Modell für die Bedeutung */
    await ctx.addInitScript(() => {
      window.__rec = [];
      class Stub { constructor() { window.__rec.push(this); } start() {} stop() { setTimeout(() => this.onend && this.onend(), 20); } abort() {} }
      window.SpeechRecognition = Stub;
      window.__sag = (t, fertig) => { const r = window.__rec[window.__rec.length - 1]; const a = [{ transcript: t }]; a.isFinal = !!fertig; r.onresult({ resultIndex: 0, results: [a] }); };
    });
    const q = await ctx.newPage(); q.on("pageerror", (e) => fehler.push(e.message));
    await q.goto(url); await q.waitForSelector("body[data-bereit]");
    ok("SUCHE: die App öffnet auf der Suche (Startseite)", await q.locator('[data-reiter="suche"].on').count() === 1 && await q.locator("[data-suche-seite] #suche-feld").count() === 1);
    ok("SUCHE: Mikrofon steht IM Suchfeld", await q.evaluate(() => { const f = document.querySelector(".su-form"); return !!f && !!f.querySelector("#suche-mic") && !document.getElementById("suche-mic").disabled; }));
    ok("BEISPIELE: 10 Beispiel-Fragen unter dem Suchfeld", await q.locator("[data-su-beispiel]").count() === 10);
    const vorherAngebote = await q.evaluate(() => WCApp.S.angebote.length);
    await tippe(q, '[data-su-beispiel="f01"] .su-vorschlag-text', "Beispiel Tassen-Frage");
    await q.waitForSelector("[data-su-karte]");
    ok("SUCHE: Klaus' Tassen-Frage → erste Karte ist die Tasse, 10 Stk., mit Preis netto/brutto/je Stück", await q.evaluate(() => {
      const k = document.querySelector("[data-su-karte]"), p = k.querySelector("[data-su-netto]");
      return k.dataset.suKarte === "tasse" && k.querySelector("[data-su-menge]").value === "10" && !!p && +p.dataset.suNetto > 0 && +p.dataset.suBrutto > +p.dataset.suNetto && /je Stk\./.test(p.textContent); }));
    ok("FÜLLWÖRTER: „ignoriert: …“ steht da, nicht still", /Der Kunde möchte/.test(await q.locator("[data-ignoriert]").textContent().catch(() => "")) && /Wie viel kostet das/i.test(await q.locator("[data-ignoriert]").textContent().catch(() => "")));
    ok("SUCHE: kein Kalkulationsdetail auf der Karte (Selbstkosten, Gewinn, Material nur nach Tipp)", !/Selbstkosten|Gewinn|Material/.test(await q.locator('[data-su-karte="tasse"]').textContent()));
    ok("KEIN SPRUNG: die Suche öffnet nichts von selbst (Reiter Suche, kein neues Angebot)", await q.locator('[data-reiter="suche"].on').count() === 1 && (await q.evaluate(() => WCApp.S.angebote.length)) === vorherAngebote);
    await tippe(q, '[data-su-zusammensetzung="tasse"]', "Zusammensetzung");
    ok("ZUSAMMENSETZUNG: klappt auf derselben Seite auf (Selbstkosten, Versand, brutto)", await q.locator('[data-reiter="suche"].on').count() === 1 && /Selbstkosten/.test(await q.locator('[data-su-zus="tasse"]').textContent().catch(() => "")) && await q.locator('[data-su-zus="tasse"] [data-su-versand]').count() === 1);
    ok("RÜCKRICHTUNG: an der Tasse stehen die Fragen dazu (bidirektional)", await q.locator('[data-su-zus="tasse"] [data-su-rueck-fragen]').count() === 1);
    const n10 = +(await q.getAttribute('[data-su-karte="tasse"] [data-su-netto]', "data-su-netto"));
    await q.fill('[data-su-menge="tasse"]', "1"); await q.press('[data-su-menge="tasse"]', "Enter");
    await q.waitForFunction(() => document.querySelector('[data-su-karte="tasse"] [data-su-menge]').value === "1", null, { timeout: 4000 }).catch(() => {});
    const n1 = +(await q.getAttribute('[data-su-karte="tasse"] [data-su-netto]', "data-su-netto"));
    ok("KORREKTUR: „und bei 1 Tasse?“ — Menge auf der Karte, Preis rechnet sofort neu (mit Kleinmengenzuschlag)", n1 > 0 && n1 < n10 && await q.locator('[data-su-zus="tasse"] [data-su-kleinmenge]').count() === 1, [n10, n1]);
    ok("LERNEN: Zusammensetzung und Menge merken sich die Frage am Produkt", await q.evaluate(() => (WCApp.S.einst.suche.gelernt || []).some((e) => e.vorlage === "tasse" && e.gut)));
    /* derselbe Preis wie im Angebot */
    await tippe(q, '[data-su-angebot-neu="tasse"]', "＋ Angebot");
    const vgl = await q.evaluate(() => { const a = WCApp.S.angebote[0], r = WC.angebot.rechne(a, WCApp.S.katalog, a.kunde, WCApp.S.einst.kleinunternehmer); return { netto: r.summen.netto, menge: a.positionen[0].menge, v: a.positionen[0].vorlage, reiter: WCApp.S.reiter }; });
    ok("PREIS: „＋ Angebot“ legt genau das an, was die Karte zeigte (gleicher Preis wie im Angebot)", vgl.netto === n1 && vgl.menge === 1 && vgl.v === "tasse" && vgl.reiter === "angebot", [vgl, n1]);
    /* ✕ an einem Beispiel, wiederherstellen in den Einstellungen */
    await tippe(q, '[data-reiter="suche"]', "Reiter Suche");
    await q.fill("#suche-feld", ""); await q.dispatchEvent("#suche-feld", "input");
    await tippe(q, '[data-su-beispiel-weg="f10"]', "Beispiel ✕");
    ok("BEISPIELE: ✕ nimmt genau ein Beispiel weg", await q.locator("[data-su-beispiel]").count() === 9 && await q.locator('[data-su-beispiel="f10"]').count() === 0);
    await q.reload(); await q.waitForSelector("body[data-bereit]");
    ok("BEISPIELE: ein gelöschtes Beispiel bleibt nach dem Neuladen weg", await q.locator("[data-su-beispiel]").count() === 9);
    await tippe(q, '[data-reiter="einstellungen"]', "Reiter Einstellungen");
    await tippe(q, "#beispiele-wiederherstellen", "Beispiele wiederherstellen");
    await tippe(q, '[data-reiter="suche"]', "Reiter Suche");
    ok("BEISPIELE: „Beispiele wiederherstellen“ bringt alle 10 zurück", await q.locator("[data-su-beispiel]").count() === 10);
    /* ▶ Durchspielen: alle 10 nacheinander, jedes rechnet (fehlende Gebiete werden geholt) */
    await tippe(q, "#su-durchspielen", "▶ Durchspielen");
    const lauf = [];
    for (let i = 0; i < 10; i++) {
      await q.waitForSelector("[data-su-uebung]");
      lauf.push(await q.evaluate(() => { const k = document.querySelector("[data-su-karte]"); return { schritt: document.querySelector("[data-su-uebung]").dataset.suUebung, v: k && k.dataset.suKarte, preis: !!(k && k.querySelector("[data-su-netto]")), menge: k && (k.querySelector("[data-su-menge]") || {}).value }; }));
      if (i < 9) await tippe(q, "[data-su-weiter]", "Weiter ›");
    }
    const erwartet = await q.evaluate(() => WC.BEISPIEL_FRAGEN.map((b) => b.vorlage + ":" + b.menge));
    ok("DURCHSPIELEN: alle 10 Beispiele nacheinander — richtiges Produkt, richtige Menge, jedes mit Preis", lauf.every((x, i) => x.schritt === String(i + 1) && x.v + ":" + x.menge === erwartet[i] && x.preis), lauf);
    await tippe(q, "[data-su-fertig]", "Fertig ✓");
    ok("DURCHSPIELEN: die fehlenden Arbeitsgebiete sind dazugeholt", await q.evaluate(() => ["stickerei", "laser", "handelsware", "dienstleistung"].every((g) => WCApp.S.katalog.gebiete.some((x) => x.id === g))));
    /* Kunde versteckt: Klasse wirkt, Klartext erst auf Tipp */
    await q.evaluate(() => { WCApp.S.kunden.push({ id: "K-9", name: "Pruefer", anschrift: "", klasse: "A" }); WCApp.S.katalog.gebiete.find((g) => g.id === "werbetechnik").klassen.A = { name: "A", stundenPct: -10, gewinnPct: -5 }; });
    await q.fill("#suche-feld", "10 Tassen"); await q.dispatchEvent("#suche-feld", "input");
    const ohneK = +(await q.getAttribute('[data-su-karte="tasse"] [data-su-netto]', "data-su-netto"));
    await q.fill("#suche-feld", "Kunde Pruefer wünscht 10 Tassen"); await q.dispatchEvent("#suche-feld", "input");
    const mitK = +(await q.getAttribute('[data-su-karte="tasse"] [data-su-netto]', "data-su-netto"));
    const sicht = await q.evaluate(() => document.getElementById("inhalt").innerText);
    ok("KUNDE: „Kunde Pruefer wünscht“ findet den Kunden — die Klasse wirkt auf den Preis", mitK > 0 && mitK < ohneK, [ohneK, mitK]);
    ok("KUNDE: zugeklappt nur ein Kürzel — kein „Klasse A“, kein „A-Kunde“ auf dem Schirm", /^◦\d+\/1$/.test(await q.getAttribute("[data-su-kuerzel]", "data-su-kuerzel")) && !/Klasse A|A-Kunde|frühere Angebote/.test(sicht), await q.getAttribute("[data-su-kuerzel]", "data-su-kuerzel"));
    await tippe(q, "[data-su-kuerzel]", "Kürzel");
    ok("KUNDE: erst ein Tipp aufs Kürzel zeigt Klasse und frühere Angebote", /Klasse A/.test(await q.locator("[data-su-kunde-info]").textContent().catch(() => "")));
    /* ✕ passt nicht */
    await q.fill("#suche-feld", "10 Tassen mit Namen"); await q.dispatchEvent("#suche-feld", "input");
    const vorX = await q.evaluate(() => [...document.querySelectorAll("[data-su-karte]")].map((k) => k.dataset.suKarte));
    const weg = vorX.find((v) => v !== "tasse") || vorX[0];
    await tippe(q, `[data-su-passt-nicht="${weg}"]`, "✕ passt nicht");
    const nachX = await q.evaluate(() => [...document.querySelectorAll("[data-su-karte]")].map((k) => k.dataset.suKarte));
    ok("LERNEN: „✕ passt nicht“ — das Produkt rückt bei derselben Frage nach hinten oder fällt weg", nachX.indexOf(weg) < 0 || nachX.indexOf(weg) > vorX.indexOf(weg), [vorX, nachX, weg]);
    /* 🎤 Spracheingabe */
    await q.fill("#suche-feld", ""); await q.dispatchEvent("#suche-feld", "input");
    await tippe(q, "#suche-mic", "Mikrofon");
    await q.evaluate(() => window.__sag("5 Schilder aus Alu", false));
    ok("SPRACHE: der Text steht schon beim Sprechen im Feld, die Karten folgen", (await q.inputValue("#suche-feld")) === "5 Schilder aus Alu" && await q.locator('[data-su-karte="schild"]').count() === 1 && await q.locator(".su-form [data-wfs]").count() === 1);
    await q.evaluate(() => window.__sag("5 Schilder aus Alu, 40 x 30 cm", true)); await tippe(q, ".wfs-fertig", "■ Stopp"); await q.waitForTimeout(120);
    ok("SPRACHE: Laufbalken im Suchfeld, Stopp beendet", await q.evaluate(() => document.querySelector("[data-wfs]").hidden));
    /* 🧠 Bedeutung — gestelltes Modell (Modul 03/04 haben dieselbe Oberfläche), echte Rangfolge aus bedeutung.js */
    await q.evaluate(() => {
      const D = ["tasse|henkel|kaffee|becher", "schild|alu|platte", "kugelschreiber|stift|kuli", "shirt|textil", "stick|polo|aufn"];
      const vek = (t) => { t = String(t).toLowerCase(); const v = D.map((d) => (new RegExp(d).test(t) ? 1 : 0)); v.push(0.2); const n = Math.hypot(...v); return Float32Array.from(v.map((x) => x / n)); };
      window.SbkimEmbedding = { init: () => { window.dispatchEvent(new CustomEvent("sbkim:embedding-progress", { detail: { status: "progress", file: "m.onnx", loaded: 5, total: 10 } })); return Promise.resolve(); },
        embedPassageBatch: (l) => Promise.resolve(l.map(vek)), embedQuery: (t) => Promise.resolve(vek(t)) };
      window.SbkimMatch = { match: (a, b) => a.reduce((s, x, i) => s + x * b[i], 0) };
    });
    let frage = "";
    q.once("dialog", (d) => { frage = d.message(); d.accept(); });
    await q.fill("#suche-feld", "Henkelgefäß fürs Büro"); await q.dispatchEvent("#suche-feld", "input");
    await tippe(q, "#bed-an", "🧠 Bedeutung");
    await q.waitForSelector('[data-bed-zustand="bereit"]', { timeout: 10000 }).catch(() => {});
    ok("BEDEUTUNG: nur auf Knopfdruck, vorher steht da, was woher geladen wird", /family-projekt\.de/.test(frage) && /Hugging Face/.test(frage) && /bleiben auf dem Gerät/.test(frage), frage);
    ok("BEDEUTUNG: Modul 03 bekommt den eigenen Server als Modell-Ort", await q.evaluate(() => window.SBKIM_MODEL_ROOT) === "https://family-projekt.de/models/");
    await q.fill("#suche-feld", "Henkelgefäß für den Kaffee"); await q.dispatchEvent("#suche-feld", "input");
    await q.waitForSelector('[data-su-bed-treffer="tasse"]', { timeout: 5000 }).catch(() => {});
    ok("BEDEUTUNG: ohne Wort-Treffer findet die Bedeutung die Tasse („ähnlich“ unter den Karten)", await q.locator('[data-su-bed-treffer="tasse"]').count() === 1);
    /* ?q= aus Tomys Hub / WorkFloh */
    await q.goto(url + "?q=" + encodeURIComponent("Der Kunde möchte 20 Caps mit Logo bestickt")); await q.waitForSelector("body[data-bereit]");
    ok("LINK: ?q= belegt die Frage vor und sucht sofort", (await q.inputValue("#suche-feld")) === "Der Kunde möchte 20 Caps mit Logo bestickt" && (await q.locator('[data-su-karte="cap_stick"] [data-su-menge]').inputValue().catch(() => "")) === "20");
    /* Vollbild */
    const vb = [];
    for (const [b, hh] of [[360, 740], [1920, 1080]]) {
      await q.setViewportSize({ width: b, height: hh });
      vb.push(await q.evaluate(() => { const w = document.documentElement.clientWidth, s = document.querySelector("[data-suche-seite]").getBoundingClientRect(), f = document.querySelector(".su-form").getBoundingClientRect();
        return { w, seite: Math.round(s.width), form: Math.round(f.width), rollt: document.documentElement.scrollWidth > w + 1 }; }));
    }
    ok("VOLLBILD: die Suche füllt Handy und großen Schirm, ohne waagerechtes Rollen", vb.every((x) => x.seite >= x.w - 40 && x.form >= x.w - 40 && !x.rollt), vb);
    await ctx.close();
  }

  /* ── ⇅ DATEN: CSV hinaus, Tabelle herein ── */
  {
    const d = await seite(1200), q = d.p;
    await q.goto(url); await q.waitForSelector("body[data-bereit]"); await zuAngeboten(q);
    await tippe(q, "#beispiel-alle", "Beispiele: Alle laden");
    await tippe(q, '[data-reiter="daten"]', "Reiter Daten");
    ok("DATEN: Sicherung, CSV-Export und Tabellen-Import stehen im Reiter „⇅ Daten“", await q.locator("[data-daten-seite]").count() === 1 && await q.locator("#sicherung-machen").count() === 1 && await q.locator("#csv-ohne").count() === 1 && await q.locator("#import-datei").count() === 1);
    await tippe(q, "#csv-ohne", "CSV ohne Kundendaten");
    const ohne = await q.evaluate(() => window.__wcCsv || "");
    await tippe(q, "#csv-intern", "CSV intern");
    const mit = await q.evaluate(() => window.__wcCsv || "");
    ok("CSV: ohne Kundendaten — kein Kundenname, aber alle Positionen mit Preis", ohne.split("\r\n").length > 15 && !/Beispiel e\. V\.|Bäckerei Beispiel|Musterstraße/.test(ohne) && /Tasse/.test(ohne), ohne.slice(0, 200));
    ok("CSV: intern — mit Kunde", /Sportverein Beispiel e\. V\./.test(mit));
    await q.setInputFiles("#import-datei", { name: "alte-angebote.csv", mimeType: "text/csv", buffer: readFileSync(join(WURZEL_T, "tests/daten/tabelle/alte-angebote.csv")) });
    await q.waitForSelector("[data-import-vorschau]");
    const pers = (await q.getAttribute("[data-import-person]", "data-import-person")) || "";
    ok("IMPORT: Personenspalten werden angezeigt und nicht übernommen", ["Kunde", "Ansprechpartner", "Straße", "Telefon", "Info"].every((k) => pers.split("|").includes(k)), pers);
    ok("IMPORT: Vorschau vor dem Übernehmen — 4 Zeilen, 3 zugeordnet", await q.locator("[data-import-zeile]").count() === 4 && await q.locator('[data-import-zeile][data-vorlage=""]').count() === 1);
    /* KI-Zuordnung über den Verdecken-Weg, Gegenseite gestellt */
    await q.evaluate(() => { WCApp.S.kiSchluessel = "sk-ant-test"; window.__wcKiFetch = (adr, opt) => { window.__kiGesendet = opt.body; const zeile = (JSON.parse(opt.body).messages[0].content.match(/Zeile 5:[^\n]*/) || [""])[0];
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ content: [{ type: "text", text: JSON.stringify({ positionen: [{ vorlage: "tasse", menge: 40, zitat: zeile }], unklar: [] }) }] }) }); }; });
    await q.evaluate(() => { const d = document.querySelector("[data-import-ki]"); d.open = true; d.dispatchEvent(new Event("toggle")); });
    await q.waitForSelector("[data-import-ki-text]");
    ok("IMPORT → KI: was hinausgeht, steht da — ohne Personendaten", !/Prüfwort|Musterfrau|23125|@/.test(await q.locator("[data-import-ki-text]").textContent()));
    await tippe(q, "#import-ki-los", "An die KI senden");
    await q.waitForSelector("[data-import-ki-ergebnis]", { timeout: 5000 }).catch(() => {});
    ok("IMPORT → KI: die KI-Zuordnung landet in der Vorschau (Zeile 5, markiert)", await q.locator('[data-import-zeile="5"][data-herkunft="ki"][data-vorlage="tasse"]').count() === 1 && !/Prüfwort|Musterfrau|23125|@/.test(await q.evaluate(() => window.__kiGesendet || "")));
    const vor = await q.evaluate(() => WCApp.S.angebote.length);
    await tippe(q, "#import-uebernehmen", "Übernehmen");
    const imp = await q.evaluate(() => WCApp.S.angebote.filter((a) => a.import));
    ok("IMPORT: übernommen — 3 Angebote (A-17 mit 2 Positionen), Entwurf, ohne Personendaten", imp.length === 3 && imp.some((a) => a.positionen.length === 2) && (await q.evaluate(() => WCApp.S.angebote.length)) === vor + 3 && !/Prüfwort|Musterfrau|Mustermann|23125|@|Erika/.test(JSON.stringify(imp)), imp.map((a) => a.titel));
    await q.setInputFiles("#import-datei", { name: "angebote.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: Buffer.from("PK") });
    ok("IMPORT: Excel wird nicht still verworfen — „als CSV speichern“", /CSV/.test(await q.locator("[data-import-fehler]").textContent().catch(() => "")));
    await d.ctx.close();
  }

  /* ── Handy: keine waagerechte Rollbahn ── */
  const h = await seite(380);
  await h.p.goto(url); await h.p.waitForSelector("body[data-bereit]"); await zuAngeboten(h.p);
  await h.p.click("#neues-angebot"); await h.p.selectOption("#vorlage-wahl", "kuli"); await h.p.click('[data-beispiel-nehmen="kuli:b1"]');
  ok("HANDY: 380 px ohne waagerechtes Rollen", await h.p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), await h.p.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]));
  await h.ctx.close();

  ok("KEINE Skriptfehler auf der Seite", fehler.length === 0, fehler);
} catch (e) {
  ok("Probe ist gestolpert", false, String(e && e.message || e));
}
await browser.close(); server.close();
console.log(`browser: ${gruen} grün · ${rot} ROT`);
process.exit(rot ? 1 : 0);
