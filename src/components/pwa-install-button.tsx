"use client";

import { useEffect, useState } from "react";

type InstallPromptEvent = Event & {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function PwaInstallButton() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      if (!window.matchMedia("(display-mode: standalone)").matches) setPrompt(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!prompt) return null;
  return <button className="btn" type="button" onClick={async () => {
    await prompt.prompt();
    const result = await prompt.userChoice;
    if (result.outcome === "accepted") setPrompt(null);
  }}>Install STEMBuild</button>;
}
