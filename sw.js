// Service Worker — cache-first mit Hintergrund-Aktualisierung, Cache-Name pro Version.
// ACHTUNG: CacheStorage gilt für die ganze Origin mgtthrdt.github.io (auch W&B-Tool, Checklisten) —
// daher nur EIGENE Caches (Präfix "satzbuch-") löschen und nur im eigenen Cache nachsehen.
const PREFIX = "satzbuch-";
const CACHE = PREFIX + "v1.2.0";
const ASSETS = ["./", "./index.html", "./manifest.webmanifest", "./icon-180.png", "./icon-192.png", "./icon-512.png"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k.startsWith(PREFIX) && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(c => c.match(req, {ignoreSearch:true})).then(hit => {
    const net = fetch(req).then(res => {
      if (res && res.ok) caches.open(CACHE).then(c => c.put(req, res.clone())).catch(()=>{});
      return res;
    }).catch(() => hit);
    return hit || net;
  }));
});
