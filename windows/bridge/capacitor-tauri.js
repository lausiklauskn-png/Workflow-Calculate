/* Workflow Calculate Pro für Windows (Vorbild Datei-Organizer Pro und BookLedgerPro windows/bridge): stellt dieselben Capacitor-Plugins
   bereit wie die Android-Hülle, damit native/wc-native.js unverändert seinen Weg findet. Jeder Aufruf geht mit dem Sitzungsschlüssel an
   die Hülle (wc_call); welche Methoden es gibt, legt bridge/contracts.json fest (dort geprüft, nicht hier). Ereignisse der Engine
   kommen als 'wc-native' (z. B. WcUpdates:stand). */
(() => {
  'use strict';
  if (window !== window.top || location.protocol !== 'https:' || location.hostname !== 'tauri.localhost' || !['/', '/index.html'].includes(location.pathname)) return;
  const invoke = window.__TAURI_INTERNALS__?.invoke; if (typeof invoke !== 'function') return;
  const TOKEN = __WC_SESSION_TOKEN__;
  const listeners = new Map();
  window.addEventListener('wc-native', (event) => {
    for (const listener of listeners.get(event.detail?.name) || []) { try { listener(event.detail.data); } catch { /* Hörer der Seite */ } }
  });
  const plugins = {};
  for (const name of ['WcDateien', 'WcUpdates']) {
    plugins[name] = new Proxy(Object.freeze({}), { get(_, method) {
      if (method === 'then') return undefined;
      if (method === 'addListener') return async (event, listener) => {
        const key = name + ':' + event; let set = listeners.get(key); if (!set) listeners.set(key, set = new Set()); set.add(listener);
        return { remove: async () => set.delete(listener) };
      };
      return async (options = {}) => {
        try {
          return await invoke('wc_call', { plugin: name, method: String(method), options }, { headers: { 'x-wc-session': TOKEN } });
        } catch (error) {
          const code = typeof error === 'string' ? error : error?.code || 'APP_RUNTIME_UNAVAILABLE';
          throw Object.assign(new Error(code), { code });
        }
      };
    } });
  }
  Object.defineProperty(window, 'Capacitor', { value: Object.freeze({ Plugins: Object.freeze(plugins), isNativePlatform: () => true, getPlatform: () => 'windows' }), writable: false, configurable: false });
})();
