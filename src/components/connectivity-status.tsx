"use client";

import { useEffect, useState } from "react";

export function ConnectivityStatus() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return <div className={`connectivity ${online ? "online" : "offline"}`} role="status" aria-live="polite">
    <span className="connectivity-dot" />{online ? "Online" : "Offline · saved work stays on this device"}
  </div>;
}
