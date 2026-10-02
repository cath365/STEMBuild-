"use client";
import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let registration: ServiceWorkerRegistration | undefined;
    navigator.serviceWorker.register("/sw.js").then((value) => {
      registration = value;
      if (navigator.onLine) registration.active?.postMessage({ type: "SYNC_NOW" });
    }).catch(() => undefined);

    const sync = () => registration?.active?.postMessage({ type: "SYNC_NOW" });
    window.addEventListener("online", sync);
    return () => window.removeEventListener("online", sync);
  }, []);
  return null;
}
