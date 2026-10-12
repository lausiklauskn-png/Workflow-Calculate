/* Proben im echten Browser. node tests/browser.mjs
   Rückgabe 0 = grün · 1 = rot · 2 = nicht lauffähig (kein playwright-core oder kein Chromium) — nie grün. */
import { findeChromium } from "./chromium-finden.mjs";
import { starteServer } from "./server.mjs";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
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
  await f.p.goto(url); await f.p.waitForSelector("body[data-bereit]");
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
    await q.goto(url); await q.waitForSelector("body[data-bereit]");
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
    await q.goto(url); await q.waitForSelector("body[data-bereit]");
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
    await q.goto(url); await q.waitForSelector("body[data-bereit]");
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
    ok("HANDEL-SEITE: im Katalog stehen die Einkaufsprodukte nicht unter den Produktvorlagen", await q.locator('[data-kat-eintrag="kuli_zukauf"]').count() === 0 && await q.getAttribute("[data-kat-handel]", "data-kat-handel").catch(() => "") === "2");
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
    ok("HANDY: die Seite Handelsware passt auf 380 px (Tabelle rollt in sich)", await hq.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1) && await hq.locator("[data-handel-tabelle]").count() === 2);
    await s8.ctx.close();
  }

  /* ── Vollbild: die Arbeitsfläche nutzt jede Breite (Klaus 2026-10-12) ── */
  {
    const v = await seite(1920), q = v.p;
    await q.goto(url); await q.waitForSelector("body[data-bereit]");
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
    await v.ctx.close();
  }

  /* ── Handy: keine waagerechte Rollbahn ── */
  const h = await seite(380);
  await h.p.goto(url); await h.p.waitForSelector("body[data-bereit]");
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
