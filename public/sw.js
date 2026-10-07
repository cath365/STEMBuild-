const SHELL_CACHE = "stembuild-shell-v6";
const STATIC_CACHE = "stembuild-static-v6";
const PUBLIC_PAGES = ["/", "/offline", "/offline-lesson.html", "/showcase/smart-environment-monitor", "/teachers", "/about"];
const SHELL_URLS = [...PUBLIC_PAGES, "/icon-192.png", "/icon-512.png", "/lessons/smart-monitor-uno.ino", "/lessons/smart-monitor-esp32.ino", "/lessons/reading-log.csv", "/lessons/pilot-planning-brief.md"];
const DB_NAME = "stembuild_offline_v1";
const DB_VERSION = 2;

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("lessons")) db.createObjectStore("lessons", { keyPath: "key" });
      if (!db.objectStoreNames.contains("drafts")) db.createObjectStore("drafts", { keyPath: "key" });
      if (!db.objectStoreNames.contains("queue")) db.createObjectStore("queue", { keyPath: "id" });
      if (!db.objectStoreNames.contains("meta")) db.createObjectStore("meta", { keyPath: "key" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function req(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getMeta(key) {
  const db = await openDb();
  const tx = db.transaction("meta", "readonly");
  const value = await req(tx.objectStore("meta").get(key));
  db.close();
  return value?.value ?? null;
}

async function getQueueForOwner(ownerId) {
  if (!ownerId) return [];
  const db = await openDb();
  const tx = db.transaction("queue", "readonly");
  const all = await req(tx.objectStore("queue").getAll());
  db.close();
  return all.filter((item) => item.ownerId === ownerId).slice(0, 25);
}

async function deleteQueue(ids) {
  if (!ids.length) return;
  const db = await openDb();
  const tx = db.transaction("queue", "readwrite");
  const store = tx.objectStore("queue");
  ids.forEach((id) => store.delete(id));
  await new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

let syncing = false;
async function flushQueue() {
  if (syncing) return;
  syncing = true;
  try {
  const ownerId = await getMeta("activeOwner");
  const operations = await getQueueForOwner(ownerId);
  if (!operations.length) return;
  const response = await fetch("/api/offline/sync", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", "X-STEMBuild-Sync": "1" },
    body: JSON.stringify({ operations }),
  });
  if (response.status === 401 || response.status === 403) return;
  if (!response.ok) throw new Error("Offline synchronization failed.");
  const result = await response.json();
  const permanentRejects = (result.rejected || []).filter((item) => item.retryable === false).map((item) => item.id);
  await deleteQueue([...(result.accepted || []), ...permanentRejects]);
  // A single reconnect should drain more than one 25-operation batch.
  if ((await getQueueForOwner(ownerId)).length && (result.accepted?.length || permanentRejects.length)) {
    syncing = false;
    await flushQueue();
  }
  } finally { syncing = false; }
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_URLS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith("stembuild-") && ![SHELL_CACHE, STATIC_CACHE].includes(key)).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || request.headers.get("RSC") === "1") return;

  const imageSource = url.searchParams.get("url") || "";
  const publicBoardPhoto = url.pathname.startsWith("/hardware/") || url.pathname === "/electronics-workbench.jpg" ||
    (url.pathname === "/_next/image" && (imageSource.startsWith("/hardware/") || imageSource === "/electronics-workbench.jpg"));
  if (url.pathname.startsWith("/_next/static/") || publicBoardPhoto || SHELL_URLS.includes(url.pathname) && url.pathname.startsWith("/lessons/")) {
    event.respondWith(caches.open(STATIC_CACHE).then(async (cache) => {
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    }));
    return;
  }

  if (PUBLIC_PAGES.includes(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(SHELL_CACHE);
      try {
        const response = await fetch(request);
        if (response.ok) await cache.put(request, response.clone());
        return response;
      } catch {
        return (await cache.match(url.pathname)) || (await cache.match("/offline"));
      }
    })());
    return;
  }

  // Private/authenticated pages, APIs, evidence and AI routes are intentionally never cached.
  if (url.pathname.startsWith("/dashboard") || url.pathname.startsWith("/api") || url.pathname.startsWith("/login")) return;
});

self.addEventListener("sync", (event) => {
  if (event.tag === "stembuild-offline-sync") event.waitUntil(flushQueue());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SYNC_NOW") event.waitUntil(flushQueue().catch(() => undefined));
  if (event.data?.type === "CACHE_OFFLINE_READER") {
    event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.add("/offline-lesson.html")).catch(() => undefined));
  }
});
