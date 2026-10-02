const CACHE = "stembuild-public-v1";
const SAFE = ["/", "/offline"];
self.addEventListener("install", (event) => event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SAFE))));
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/dashboard") || url.pathname.startsWith("/api") || url.pathname.startsWith("/login")) return;
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request).then((r) => r || caches.match("/offline"))));
});
