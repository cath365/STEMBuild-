import { useCallback, useSyncExternalStore } from "react";

// localStorage as an external store: hydration-safe (the server snapshot is null), shared
// across components and tabs, and kept in memory when storage is blocked or full.
const CHANGE_EVENT = "stembuild-storage-change";
const memory = new Map<string, string>();
const memoryOnly = new Set<string>();

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

export function readStoredValue(key: string): string | null {
  if (memoryOnly.has(key)) return memory.get(key) ?? null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return memory.get(key) ?? null;
  }
}

export function writeStoredValue(key: string, value: string) {
  memory.set(key, value);
  try {
    window.localStorage.setItem(key, value);
  } catch {
    memoryOnly.add(key);
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Returns the raw stored string (null before hydration or when unset) and a setter. */
export function useStoredValue(key: string) {
  const value = useSyncExternalStore(subscribe, () => readStoredValue(key), () => null);
  const setValue = useCallback((next: string) => writeStoredValue(key, next), [key]);
  return [value, setValue] as const;
}

/** True only after hydration on the client; false during server render and the hydration pass. */
export function useIsClient() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
