"use client";

import { useState } from "react";
import type { OfflineLessonPackage } from "@/lib/offline-types";
import { saveOfflineLesson } from "@/lib/offline-client";

export function OfflineLessonDownload({ lesson }: { lesson: OfflineLessonPackage }) {
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const sizeKb = Math.max(1, Math.round(new TextEncoder().encode(JSON.stringify(lesson)).byteLength / 1024));

  async function download() {
    setState("saving");
    try {
      await saveOfflineLesson({ ...lesson, downloadedAt: new Date().toISOString() });
      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.ready;
        registration.active?.postMessage({ type: "CACHE_OFFLINE_READER" });
      }
      setState("saved");
    } catch {
      setState("error");
    }
  }

  return <div className="stack">
    <button className="btn btn-primary" type="button" onClick={download} disabled={state === "saving"}>
      {state === "saving" ? "Saving lesson…" : state === "saved" ? "Lesson saved offline" : "Download lesson"}
    </button>
    <a className="btn" href={`/offline-lesson.html?lesson=${encodeURIComponent(lesson.lessonId)}`}>Open offline copy</a>
    <div className="small muted">Approx. {sizeKb} KB of text/code. Quiz answers, evidence files and teacher records are not downloaded.</div>
    {state === "error" ? <div className="error">Could not save this lesson on this device.</div> : null}
  </div>;
}
