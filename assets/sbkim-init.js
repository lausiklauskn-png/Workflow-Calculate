/* ============================================================================
 * Workflow Calculate — SBKIM-Andock (Klebstoff zwischen Seite und Modulen).
 *
 * Nach dem Muster des Sende-Prüfers (`Sende-Pruefer/assets/sbkim-init.js`):
 *   1. EIGENE SCHUBLADE `workflowcalculate` (steht zusätzlich im <head>, weil
 *      Modul 01 den Wert BEIM LADEN liest — Sage LEHREN § 4, Falle 1).
 *   2. KEIN MODUL 17: die feste Lampen-Leiste in der Kopfzeile bringt
 *      `#lamp-fremd`, `#siegel-platz` und den Platz für die Mycel-Blase mit.
 *   3. MODUL 03/04 sind DIESELBEN Dateien wie für die Bedeutungs-Suche
 *      (`vendor/sbkim/`), über einen gemeinsamen Lader (`WC_skriptEinmal`).
 *   4. KEINE RELAIS-LISTE: es gilt die Vorgabe aus Modul 05b; ein eigenes
 *      Firmennetz stellt man in der Mycel-Blase ein (Box „🔒 Netz", Modul 23-UI).
 *
 * NACHGELADEN in einer Leerlauf-Pause, Datei für Datei. ALLES FAIL-SOFT: fehlt
 * ein Modul, fehlen Lampen und Siegel — Kalkulation und Angebote laufen weiter.
 *
 * ⚠ BEIM LADEN GEHT NICHTS INS NETZ. Verbunden wird erst auf Klick in der
 * Mycel-Blase; das Sprachmodell lädt erst beim Signieren im Siegel.
 * ========================================================================== */
(function () {
  "use strict";

  var NETZ = {
    dbSuffix: "workflowcalculate",
    nodeName: "Workflow Calculate",
    repoUrl: "https://github.com/lausiklauskn-png/Workflow-Calculate",
    /* Fremde Seiten, die per postMessage mit diesem Knoten reden dürfen:
       KEINE. Alles andere weist Modul 15 ab und meldet es an der FREMD-Lampe. */
    allowedOrigins: []
  };
  window.WC_NETZ = NETZ;

  /* ---- Gerätename (INTERFACES § 11.7) — ins Verbinden-Panel, nie in die
     byte-kopierte Panel-Datei. Derselbe Schlüssel wie netzweit: es ist
     dasselbe Gerät. ------------------------------------------------------- */
  var LS_GERAETENAME = "sbkim_geraetename";
  function geraetename() {
    try { return (localStorage.getItem(LS_GERAETENAME) || "").trim().slice(0, 40); } catch (_e) { return ""; }
  }
  function anzeigeName() { var g = geraetename(); return g ? (NETZ.nodeName + " · " + g) : NETZ.nodeName; }
  function namensfelderAbgleichen() {
    try {
      var wert = geraetename(), liste = document.querySelectorAll("[data-sbkim-geraetename]");
      for (var i = 0; i < liste.length; i++) { if (liste[i].value !== wert) liste[i].value = wert; }
    } catch (_e) {}
  }
  function geraetenameFeldEinhaengen() {
    function versuch() {
      var panel = document.getElementById("sbkim-rdv-panel");
      if (!panel) return false;
      if (panel.querySelector("[data-sbkim-geraetename]")) return true;
      var zeile = document.createElement("div");
      zeile.style.cssText = "margin:8px 0;display:flex;gap:6px;align-items:center;flex-wrap:wrap";
      var beschriftung = document.createElement("label");
      beschriftung.setAttribute("for", "sbkim-geraetename");
      beschriftung.textContent = "🏷️ Gerätename:";
      beschriftung.style.cssText = "color:#9aa7b6;font-size:.85rem";
      var feld = document.createElement("input");
      feld.id = "sbkim-geraetename"; feld.type = "text"; feld.maxLength = 40;
      feld.setAttribute("data-sbkim-geraetename", "1");
      feld.placeholder = "z. B. Klaus-Handy (frei wählbar)";
      feld.value = geraetename();
      feld.title = "Nur ein Anzeige-Hinweis, kein Vertrauens-Beweis — die Kennung steht daneben.";
      feld.style.cssText = "flex:1;min-width:120px;padding:4px 6px;border-radius:6px;border:1px solid #33414f;background:#0d1520;color:#dfeaf2;font:inherit";
      feld.addEventListener("input", function () {
        try { localStorage.setItem(LS_GERAETENAME, String(feld.value || "").trim().slice(0, 40)); } catch (_e) {}
        try { window.dispatchEvent(new CustomEvent("sbkim:geraetename-changed")); } catch (_e) {}
      });
      zeile.appendChild(beschriftung); zeile.appendChild(feld);
      panel.insertBefore(zeile, panel.children[1] || null);
      return true;
    }
    if (versuch()) return;
    try {
      var beobachter = new MutationObserver(function () { if (versuch()) beobachter.disconnect(); });
      beobachter.observe(document.body, { childList: true, subtree: true });
    } catch (_e) {}
  }

  /* Sprachmodell vom eigenen Server (Klaus 2026-10-13) — derselbe Ort wie die
   * Bedeutungs-Suche in app.js (MODELL_SERVER). Modul 03 liest den Wert BEIM
   * LADEN; es wird erst in der Kette darunter geladen. Steht der Wert schon
   * (die Suche war zuerst), bleibt er. */
  if (!window.SBKIM_MODEL_ROOT) window.SBKIM_MODEL_ROOT = "https://family-projekt.de/models/";

  /* ---- Die Kette, kanonische Reihenfolge (Sage docs/PFLICHT_MODULE.md) ---- */
  var KANON = [
    ["",       "modules/01_storage.js"],
    ["",       "modules/02_spore.js"],
    ["",       "vendor/sbkim/03_embedding.js?v=2", "SbkimEmbedding"],   // DIESELBE Datei wie die Bedeutungs-Suche
    ["",       "vendor/sbkim/04_match.js?v=1", "SbkimMatch"],
    ["",       "modules/05_anastomose.js"],
    ["",       "modules/07_apoptose.js"],
    ["",       "modules/15_membran.js"],
    ["",       "modules/16_siegel.js"],
    ["module", "modules/05b_nostr_relay.js"],   // ES-Modul, holt noble-secp256k1.js selbst
    ["",       "modules/23_rendezvous.js"],
    ["",       "modules/23_rendezvous_ui.js"],
    ["",       "assets/siegel-inhalt.js"],       // die Identität dieses Knotens
    ["",       "modules/16b_andock_wizard.js"]    // Andock-Werkzeug IM Siegel
  ];
  window.WC_KETTE = KANON.map(function (k) { return k[1]; });

  function pause(f) {
    if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(f, { timeout: 500 });
    else setTimeout(f, 16);
  }
  /* EIN Lader für Kette UND Bedeutungs-Suche (app.js `skriptLaden`): jede Datei
   * (ohne `?v=`) wird höchstens EINMAL angefordert, auch wenn beide zugleich
   * danach fragen. Modul 03 zweimal zu laden hieße, die 30-MB-Pipeline und ihre
   * Zustände doppelt anzulegen. */
  var geladen = {};
  function skriptEinmal(src, typ) {
    var schluessel = String(src).split("?")[0];
    if (geladen[schluessel]) return geladen[schluessel];
    geladen[schluessel] = new Promise(function (res, rej) {
      var s = document.createElement("script");
      if (typ) s.type = typ;
      s.src = src;
      s.onload = function () { res(); };
      s.onerror = function () { delete geladen[schluessel]; rej(new Error("Datei fehlt: " + src)); };
      document.head.appendChild(s);
    });
    return geladen[schluessel];
  }
  window.WC_skriptEinmal = skriptEinmal;

  function naechste(i, fertig) {
    if (i >= KANON.length) { fertig(); return; }
    var k = KANON[i];
    /* Steht der Baustein schon (die Suche hat ihn geholt), wird er nicht noch einmal geladen. */
    if (k[2] && window[k[2]]) { naechste(i + 1, fertig); return; }
    /* Eine fehlende Datei darf die Kette nicht anhalten. */
    function weiter() { pause(function () { naechste(i + 1, fertig); }); }
    skriptEinmal(k[1], k[0]).then(weiter, weiter);
  }

  /* ---- Lampen: echte Ereignisse, nie ein geschätzter Zustand ------------- */
  /* Jede Lampe hat eine Kopie mit Namen im aufgeklappten Feld (am Handy
     stehen im Knopf nur die Punkte) — beide bekommen denselben Zustand. */
  function lampe(id, klasse) {
    var alle = [document.getElementById(id)].concat([].slice.call(document.querySelectorAll('[data-lampe-kopie="' + id + '"]')));
    alle.forEach(function (el) {
      if (!el) return;
      el.classList.remove("on", "warn", "bad");
      if (klasse) el.classList.add(klasse);
    });
  }
  function pulsSetzen(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.classList.add("puls");
    setTimeout(function () { el.classList.remove("puls"); }, 950);
  }
  function lampenVerdrahten() {
    window.addEventListener("sbkim:alive", function () { lampe("lamp-alive", "on"); });
    window.addEventListener("sbkim:nostr-listening", function (e) {
      lampe("lamp-traffic", (e && e.detail && e.detail.active) ? "on" : null);
    });
    window.addEventListener("sbkim:handshake",   function () { pulsSetzen("lamp-traffic"); });
    window.addEventListener("sbkim:postmessage", function () { pulsSetzen("lamp-traffic"); });
    /* FREMD — rot bei einem Fremdzugriff (Modul 15: fremde Nachricht). */
    window.addEventListener("sbkim:fremd-alert", function () { lampe("lamp-fremd", "bad"); });
  }

  /* ---- Auf- und Zuklappen der Leiste (am Handy nur die Lampen) ----------- */
  function leisteVerdrahten() {
    var knopf = document.getElementById("lampen"), leiste = document.getElementById("netzleiste");
    if (!knopf || !leiste) return;
    function setze(offen) {
      leiste.setAttribute("data-offen", offen ? "1" : "0");
      knopf.setAttribute("aria-expanded", String(offen));
    }
    knopf.addEventListener("click", function () { setze(leiste.getAttribute("data-offen") !== "1"); });
    /* Ein Tipp daneben klappt wieder zu — aber nicht, wenn er IN der Leiste
       landet (Siegel, Mycel-Blase) oder in einem Fenster, das sie geöffnet hat. */
    document.addEventListener("click", function (e) {
      if (leiste.getAttribute("data-offen") !== "1") return;
      var t = e.target;
      if (!document.contains(t) || leiste.contains(t)) return;
      if (t.closest && t.closest("[id^='sbkim-'],[class*='sbkim-']")) return;
      setze(false);
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") setze(false); });
  }

  /* ---- Start-Kette: Storage → Membran → Siegel → Apoptose → Anastomose →
     Rendezvous (Rezept „status-leiste-siegel", ohne Modul 17). ------------ */
  async function starten() {
    try {
      if (!window.SbkimStorage) return;
      await window.SbkimStorage.init({ dbSuffix: NETZ.dbSuffix });

      if (window.SbkimMembrane) {
        await window.SbkimMembrane.init({ allowedOrigins: NETZ.allowedOrigins, lampSelector: "#lamp-fremd" });
      }
      if (window.SbkimSiegel) {
        /* `ribbonText` ist Pflicht — ohne ihn bleibt das Band im Wappen leer. */
        window.SbkimSiegel.init({ badgeSelector: "#siegel-platz", mountModal: true, repoUrl: NETZ.repoUrl, ribbonText: "WORKFLOW CALCULATE" });
      }
      if (window.SbkimApoptose) { try { await window.SbkimApoptose.init(); } catch (_e) {} }
      if (window.SbkimAnastomose) { try { await window.SbkimAnastomose.init(); } catch (_e) {} }

      /* Rendezvous: `init()` baut NICHTS auf und ruft NICHTS. Angemeldet wird
         erst auf Klick. `ensureIdentity` ABSICHTLICH NICHT (netzweite Stufe 0b). */
      if (window.SbkimRendezvous) { try { window.SbkimRendezvous.init({ nodeName: anzeigeName(), dbSuffix: NETZ.dbSuffix }); } catch (_e) {} }
      if (window.SbkimRendezvousUI) { try { window.SbkimRendezvousUI.init({ nodeName: anzeigeName(), dbSuffix: NETZ.dbSuffix }); } catch (_e) {} }

      geraetenameFeldEinhaengen();
      window.addEventListener("sbkim:geraetename-changed", function () {
        namensfelderAbgleichen();
        try { if (window.SbkimRendezvous && window.SbkimRendezvous.configure) window.SbkimRendezvous.configure({ nodeName: anzeigeName() }); } catch (_e) {}
      });
    } catch (e) {
      if (window.console && console.warn) console.warn("[Workflow-Calculate-SBKIM] Andock übersprungen:", e);
    } finally {
      window.WC_KNOTEN_BEREIT = true;
    }
  }

  lampenVerdrahten();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", leisteVerdrahten);
  else leisteVerdrahten();
  if (document.readyState === "complete") pause(function () { naechste(0, starten); });
  else window.addEventListener("load", function () { pause(function () { naechste(0, starten); }); });
})();
