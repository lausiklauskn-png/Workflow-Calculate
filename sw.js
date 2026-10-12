/* Offline-Vorrat von Workflow Calculate. Wer eine Datei aus CORE ändert, erhöht CACHE_VERSION
   und ruft node tools/cache-stand.mjs — sonst liefert der Worker die alte Fassung weiter.
   Fremde Adressen fasst er nicht an (die App ruft keine auf). */
const CACHE_VERSION = "workflow-calculate-v3";
const CORE = ["./", "index.html", "manifest.json", "assets/app.css?v=1",
  "assets/kern/geld.js?v=1", "assets/kern/mengen.js?v=1", "assets/kern/kalkulation.js?v=2", "assets/kern/versand.js?v=1", "assets/kern/markt.js?v=1",
  "assets/kern/katalog.js?v=2", "assets/kern/angebot.js?v=2", "assets/kern/aussen.js?v=3", "assets/kern/uebergabe.js?v=3", "assets/schluesseltresor.js?v=1", "assets/kern/sicherung.js?v=1", "assets/kern/nachkalk.js?v=1",
  "assets/daten/werbetechnik.js?v=2", "assets/daten/stickerei.js?v=1", "assets/daten/dienstleistung.js?v=1", "assets/daten/beispiel-angebote.js?v=1", "assets/daten/bilder.js?v=2", "assets/app.js?v=3", "assets/installieren.js",
  "impressum.html", "datenschutz.html", "icons/favicon-32.png", "icons/favicon-48.png", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png"];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE_VERSION).then((c) =>
    Promise.allSettled(CORE.map((u) => c.add(new Request(u, { cache: "reload" }))))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => /^workflow-calculate-/.test(k) && k !== CACHE_VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then((r) => {
    if (r.status === 200) { const k = r.clone(); caches.open(CACHE_VERSION).then((c) => c.put(e.request, k)); }
    return r;
  }).catch(() => caches.match(e.request).then((r) => r || caches.match("index.html"))));
});
