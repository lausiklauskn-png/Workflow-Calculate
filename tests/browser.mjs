/* Proben im echten Browser. node tests/browser.mjs
   Rückgabe 0 = grün · 1 = rot · 2 = nicht lauffähig (kein playwright-core oder kein Chromium) — nie grün. */
import { findeChromium } from "./chromium-finden.mjs";
import { starteServer } from "./server.mjs";

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
  await ctx.close();

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
