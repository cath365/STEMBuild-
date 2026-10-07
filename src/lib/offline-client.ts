"use client";

import type { OfflineCheckpointPayload, OfflineLessonPackage, OfflineSyncOperation } from "@/lib/offline-types";

const DB_NAME = "stembuild_offline_v1";
const DB_VERSION = 2;
const ACTIVE_OWNER_KEY = "stembuild_active_learner";

function requestToPromise<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function openOfflineDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
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

async function put(storeName: string, value: unknown) {
  const db = await openOfflineDb();
  const tx = db.transaction(storeName, "readwrite");
  await requestToPromise(tx.objectStore(storeName).put(value));
  db.close();
}

export async function setActiveOfflineLearner(ownerId: string | null) {
  if (ownerId) localStorage.setItem(ACTIVE_OWNER_KEY, ownerId);
  else localStorage.removeItem(ACTIVE_OWNER_KEY);
  await put("meta", { key: "activeOwner", value: ownerId, updatedAt: new Date().toISOString() });
}

export function getActiveOfflineLearner() {
  return localStorage.getItem(ACTIVE_OWNER_KEY);
}

export async function saveOfflineLesson(pkg: OfflineLessonPackage) {
  if (pkg.ownerId !== getActiveOfflineLearner()) await setActiveOfflineLearner(pkg.ownerId);
  await put("lessons", { key: `${pkg.ownerId}:${pkg.lessonId}`, ...pkg });
}

export async function queueCheckpoint(ownerId: string, payload: OfflineCheckpointPayload) {
  const op: OfflineSyncOperation = {
    id: crypto.randomUUID(),
    ownerId,
    type: "CHECKPOINT_UPSERT",
    payload,
  };
  await put("queue", op);
  if ("serviceWorker" in navigator) {
    const registration = await navigator.serviceWorker.ready;
    const syncRegistration = registration as ServiceWorkerRegistration & { sync?: { register(tag: string): Promise<void> } };
    await syncRegistration.sync?.register("stembuild-offline-sync").catch(() => undefined);
    registration.active?.postMessage({ type: "SYNC_NOW" });
  }
  return op.id;
}

export async function clearLearnerOfflineData(ownerId: string) {
  const db = await openOfflineDb();
  for (const storeName of ["lessons", "drafts", "queue"] as const) {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const all = await requestToPromise(store.getAll());
    for (const item of all as Array<{ key?: string; ownerId?: string; id?: string }>) {
      const belongs = item.ownerId === ownerId || item.key?.startsWith(`${ownerId}:`);
      const key = item.key ?? item.id;
      if (belongs && key) store.delete(key);
    }
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }
  db.close();
}
