"use client";

import { useEffect, useState } from "react";

type State = "online" | "offline" | "restored";

// Stays out of the way while online; only offline and the moment of reconnection are shown.
export function ConnectivityStatus() {
  const [state, setState] = useState<State>("online");

  useEffect(() => {
    let timer: number | undefined;
    const goOffline = () => { window.clearTimeout(timer); setState("offline"); };
    const goOnline = () => {
      window.clearTimeout(timer);
      setState((current) => current === "offline" ? "restored" : "online");
      timer = window.setTimeout(() => setState("online"), 4000);
    };
    if (!navigator.onLine) goOffline();
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // The live region stays mounted so screen readers announce changes when the pill appears.
  return <div role="status" aria-live="polite">
    {state === "online" ? null : <div className={`connectivity ${state === "offline" ? "offline" : "online"}`}>
      <span className="connectivity-dot" />{state === "offline" ? "Offline · saved work stays on this device" : "Back online"}
    </div>}
  </div>;
}
