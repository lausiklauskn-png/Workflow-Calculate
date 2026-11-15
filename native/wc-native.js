/* Workflow Calculate Pro — die EINE Stelle, an der die App (Android: Capacitor, Windows: Tauri-Brücke) sich von der PWA unterscheidet
   (Klaus 15.11.2026: „Workflow Needs und Calculate zu einer APK und einer Windows-Version bauen und sie Pro nennen“).

   Diese Datei liegt NUR im App-Paket: tools/native/prepare-web.mjs hängt sie in die Kopie von index.html (www/), die PWA auf
   GitHub Pages und die byte-1:1-Kopie in BookLedgerPro laden sie nie. Die Web-App selbst bleibt unverändert.

   Was sie tut, nur wenn window.Capacitor.isNativePlatform() wahr ist:
   · Name „Workflow Calculate Pro“ in Kopf und Titel, Fassung daneben (WcDateien.appInfo).
   · Herunterladen: ein <a download> (Auftragsdatei für WorkFloh, Sicherung, CSV, Katalog) geht an „Speichern unter …“ des Systems
     (WcDateien.speichern) — die WebView kann kein <a download>.
   · Drucken (Kundenblatt): unter Android über Androids Druckdienst (WcDateien.drucken); unter Windows druckt WebView2 selbst.
   · Spracheingabe: die WebView meldet die Web-Spracherkennung, verweigert sie aber (Private Brain Pro, Befund 22.10.) — darum ist sie
     in der App aus; das Mikrofon im Suchfeld zeigt „bitte tippen“.
   · Installieren-Knopf der PWA ist in der App weg (sie ist ja installiert).
   · Updates vom eigenen Server (WcUpdates): still gefragt beim Start, beim Zurückholen, höchstens einmal je Stunde; Fähnchen
     „Update X.Y.Z“ neben der Fassung, ein Tipp lädt und öffnet das Installieren-Fenster (wie Datei-Organizer Pro src/nativ.ts).
   Speicher-Namen der App (IndexedDB WorkflowCalculate1, localStorage workflowcalculate_*) bleiben unberührt. */
(function () {
  "use strict";
  var W = window, C = W.Capacitor;
  if (!C || typeof C.isNativePlatform !== "function" || !C.isNativePlatform()) return;
  var P = C.Plugins || {};
  var PLATTFORM = typeof C.getPlatform === "function" ? C.getPlatform() : "android";
  var NAME = "Workflow Calculate Pro";
  W.WCNativ = { name: NAME, plattform: PLATTFORM, variante: "Pro" };
  document.documentElement.dataset.appVariante = "Pro";

  /* Spracheingabe aus (sonst steht ein Mikrofon da, das „nicht erlaubt“ meldet). */
  ["SpeechRecognition", "webkitSpeechRecognition"].forEach(function (k) {
    try { delete W[k]; } catch (_e) { /* weiter */ }
    try { if (W[k]) Object.defineProperty(W, k, { value: undefined, configurable: true }); } catch (_e) { /* weiter */ }
  });

  /* ── Meldung (eigene, kleine Zeile unten; die Meldungen der App bleiben ihre) ── */
  var meldung;
  function melde(text) {
    if (!text) return;
    if (!meldung) {
      meldung = document.createElement("div"); meldung.id = "wc-nativ-meldung"; meldung.setAttribute("role", "status"); meldung.setAttribute("aria-live", "polite");
      document.body.appendChild(meldung);
    }
    meldung.textContent = text; meldung.hidden = false;
    clearTimeout(melde.t); melde.t = setTimeout(function () { meldung.hidden = true; }, 6000);
  }
  function code(e) { return String((e && (e.code || e.message)) || e || ""); }

  /* ── Herunterladen → Speichern unter … ── */
  function base64(buf) {
    var b = new Uint8Array(buf), s = "", STUECK = 0x8000;
    for (var i = 0; i < b.length; i += STUECK) s += String.fromCharCode.apply(null, b.subarray(i, i + STUECK));
    return btoa(s);
  }
  function speichern(a) {
    var name = a.getAttribute("download") || "Workflow-Calculate.json", href = a.href;
    return fetch(href).then(function (r) { return r.blob(); }).then(function (blob) {
      return blob.arrayBuffer().then(function (buf) {
        return P.WcDateien.speichern({ name: name, mime: blob.type || "application/octet-stream", data: base64(buf) });
      });
    }).then(function (r) {
      if (r && r.gespeichert) melde("Gespeichert: " + ((r && r.name) || name));
    }, function (e) {
      var c = code(e);
      melde(/KEIN_PLATZ/.test(c) ? "Nicht gespeichert: kein Platz auf dem Gerät." : /UNGUELTIG/.test(c) ? "Nicht gespeichert: die Datei ist zu groß." : "Nicht gespeichert (" + c + ").");
    });
  }
  W.WCNativ.speichern = speichern;
  W.addEventListener("click", function (e) {
    var a = e.target && e.target.closest ? e.target.closest("a[download]") : null;
    if (!a || !P.WcDateien || typeof P.WcDateien.speichern !== "function") return;
    e.preventDefault(); e.stopImmediatePropagation();
    speichern(a);
  }, true);

  /* ── Drucken: Android über den Druckdienst; Windows (WebView2) kann window.print() selbst ── */
  if (PLATTFORM === "android" && P.WcDateien && typeof P.WcDateien.drucken === "function") {
    W.print = function () {
      P.WcDateien.drucken({ titel: document.title || NAME }).catch(function (e) { melde("Drucken ging nicht (" + code(e) + ")."); });
    };
  }

  /* ── Updates vom eigenen Server ── */
  var STILL = "wc_update_still_v1", STUNDE = 3600000, ich = "", lauf = null, fahne, fassung;
  function gemerkt() { try { var g = JSON.parse(localStorage.getItem(STILL) || "null"); return g && typeof g.zeit === "number" ? g : null; } catch (_e) { return null; } }
  function merken(g) { try { localStorage.setItem(STILL, JSON.stringify(g)); } catch (_e) { /* ohne Speicher: nur diese Sitzung */ } }
  function teile(v) { var m = /^(\d+)\.(\d+)\.(\d+)$/.exec(v || ""); return m ? [+m[1], +m[2], +m[3]] : null; }
  function neuer(a, b) { var x = teile(a), y = teile(b); if (!x || !y) return false; for (var i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i]; return false; }
  W.WCNativ.neuer = neuer;
  function api() { return P.WcUpdates && typeof P.WcUpdates.pruefen === "function" ? P.WcUpdates : null; }
  function frage(u) { return lauf || (lauf = u.pruefen().then(function (r) { lauf = null; return r; }, function (e) { lauf = null; throw e; })); }
  function zeigeFahne(neu) { if (!fahne) return; fahne.hidden = !neu; fahne.textContent = neu ? "Update " + neu : ""; }
  function stillPruefen() {
    var u = api(); if (!u || !ich || document.visibilityState === "hidden") return;
    var g = gemerkt(), jetzt = Date.now();
    if (g && jetzt >= g.zeit && jetzt - g.zeit < STUNDE) { zeigeFahne(neuer(g.neu, ich) ? g.neu : ""); return; }
    merken({ zeit: jetzt, neu: (g && g.neu) || "" }); // auch ein Fehlschlag zählt: höchstens eine Anfrage je Stunde
    frage(u).then(function (r) { var neu = r && r.neu && neuer(r.neu, ich) ? r.neu : ""; merken({ zeit: jetzt, neu: neu }); zeigeFahne(neu); }, function () { /* still */ });
  }
  function fehlerSatz(e) {
    var c = code(e);
    if (/UPDATE_NICHT_EINGERICHTET/.test(c)) return "Updates sind in dieser Fassung noch nicht eingerichtet.";
    if (/UPDATE_NICHT_ERREICHBAR/.test(c)) return "Update-Server gerade nicht erreichbar. Verbindung prüfen und später noch einmal antippen.";
    return "Update ließ sich nicht laden. Später noch einmal antippen.";
  }
  function direktLaden() {
    var u = api(); if (!u) return;
    melde("Suche nach Updates …");
    frage(u).then(function (r) {
      var neu = r && r.neu && neuer(r.neu, ich) ? r.neu : "";
      merken({ zeit: Date.now(), neu: neu }); zeigeFahne(neu);
      if (!neu) { melde("Aktuelle Fassung " + ((r && (r.installiert || r.version)) || ich) + "."); return; }
      var aktiv = true, hoerer = null;
      return Promise.resolve(u.addListener ? u.addListener("stand", function (s) { if (aktiv && s && s.groesse) melde("Update lädt … " + Math.min(99, Math.floor(s.geladen * 100 / s.groesse)) + " %"); }) : null)
        .then(function (h) { hoerer = h; return u.installieren(); })
        .then(function (aus) { melde(aus && aus.erlaubnis ? "Erlaube „Apps installieren“ und tippe dann noch einmal auf das Update." : ""); })
        .finally(function () { aktiv = false; try { if (hoerer && hoerer.remove) hoerer.remove(); } catch (_e) { /* egal */ } });
    }).catch(function (e) { melde(fehlerSatz(e)); });
  }

  /* ── Kopf: Name, Fassung, Fähnchen ── */
  function kopf() {
    var stil = document.createElement("style");
    stil.textContent = "#installieren,[data-install-knopf],#install-meldung{display:none!important}"
      + ".wc-pro-zeile{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-top:1px}"
      + ".wc-pro-fassung,.wc-pro-fahne{font:inherit;font-size:11px;line-height:1.4;border-radius:999px;padding:0 7px;cursor:pointer;border:1px solid currentColor;background:transparent;color:inherit;opacity:.8}"
      + ".wc-pro-fahne{background:#1f7a52;border-color:#1f7a52;color:#fff;opacity:1}"
      + "#wc-nativ-meldung{position:fixed;left:50%;bottom:16px;transform:translateX(-50%);max-width:min(92vw,560px);z-index:2147483000;"
      + "background:#16202b;color:#fff;border:1px solid #2c3e50;border-radius:10px;padding:8px 14px;font-size:14px;box-shadow:0 4px 18px rgba(0,0,0,.35)}"
      + "@media print{#wc-nativ-meldung,.wc-pro-zeile{display:none!important}}";
    document.head.appendChild(stil);
    var n = document.getElementById("app-name");
    if (n) { n.textContent = NAME; n.setAttribute("data-app-name", ""); }
    document.title = NAME;
    if (n && n.parentNode) {
      var zeile = document.createElement("span"); zeile.className = "wc-pro-zeile";
      fassung = document.createElement("button"); fassung.type = "button"; fassung.className = "wc-pro-fassung"; fassung.id = "wc-pro-fassung";
      fassung.title = "Fassung — antippen sucht nach Updates"; fassung.hidden = true;
      fahne = document.createElement("button"); fahne.type = "button"; fahne.className = "wc-pro-fahne"; fahne.id = "wc-pro-fahne"; fahne.hidden = true;
      fahne.title = "Neue Fassung laden und installieren";
      fassung.addEventListener("click", direktLaden); fahne.addEventListener("click", direktLaden);
      zeile.appendChild(fassung); zeile.appendChild(fahne);
      n.parentNode.insertBefore(zeile, n.nextSibling);
    }
    var info = P.WcDateien && typeof P.WcDateien.appInfo === "function" ? P.WcDateien.appInfo() : Promise.reject(new Error("WC_KEINE_BRUECKE"));
    info.then(function (r) {
      ich = String((r && r.version) || "").replace(/-.*$/, "");
      if (fassung && ich) { fassung.textContent = "Pro " + ich; fassung.hidden = false; }
      setTimeout(stillPruefen, 2500);
    }, function () { /* ohne Fassung keine Updates */ });
    document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") stillPruefen(); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", kopf); else kopf();
})();
