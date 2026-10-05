// Service Worker — cache-first mit Hintergrund-Aktualisierung, Cache-Name pro Version.
// ACHTUNG: CacheStorage gilt für die ganze Origin mgtthrdt.github.io (auch W&B-Tool, Checklisten) —
// daher nur EIGENE Caches (Präfix "satzbuch-") löschen und nur im eigenen Cache nachsehen.
// Das Dokument liegt nur EINMAL im Cache (Schlüssel ./index.html): "./", "./index.html" und jede ?…-Variante
// werden daraus bedient (bis v1.3.0 lag es doppelt, plus eine Kopie je Query-String). Andere Dateien: Schlüssel ohne Query.
// version.json (Update-Prüfung der App) geht immer ans Netz und wird nie gecacht.
const PREFIX = "satzbuch-";
const CACHE = PREFIX + "v1.4.0";
const SCOPE = new URL(self.registration.scope);
const DOC = new URL("index.html", SCOPE).href;
const ASSETS = ["index.html", "manifest.webmanifest", "icon-180.png", "icon-192.png", "icon-512.png"].map(u => new URL(u, SCOPE).href);
// cache: "reload" → am HTTP-Cache vorbei (GitHub Pages: max-age 600), sonst könnte ein neuer Worker die alte App einlagern
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k.startsWith(PREFIX) && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== SCOPE.origin || !url.pathname.startsWith(SCOPE.pathname)) return;
  if (url.pathname === SCOPE.pathname + "version.json") return; // immer Netz (no-store), nie Cache
  const isDoc = url.pathname === SCOPE.pathname || url.pathname === SCOPE.pathname + "index.html";
  const key = isDoc ? DOC : url.origin + url.pathname;
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(key);
    const net = fetch(isDoc ? new Request(DOC, { cache: "no-cache" }) : req).then(res => {
      if (res && res.ok && res.type === "basic" && !res.redirected) c.put(key, res.clone()).catch(() => {});
      return res;
    });
    if (hit) { try { e.waitUntil(net.catch(() => {})); } catch (_) { net.catch(() => {}); } return hit; }
    return net;
  }));
});
