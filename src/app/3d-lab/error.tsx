"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ThreeDLabError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("STEMBuild 3D Lab route error", error);
  }, [error]);

  return <main className="container" style={{padding:"64px 18px"}}>
    <section className="card" style={{maxWidth:760,margin:"0 auto"}}>
      <div className="eyebrow">3D LAB RECOVERY</div>
      <h1 style={{marginTop:8}}>The 3D Lab hit a loading problem.</h1>
      <p className="muted">Your browser can retry the route without losing the rest of STEMBuild. The 3D/WebGL engine is optional, so you can also return to the First Robot Path and continue with the normal guided build.</p>
      <div className="inline" style={{marginTop:16}}>
        <button type="button" className="btn btn-primary" onClick={reset}>Try 3D Lab again</button>
        <Link className="btn" href="/learning-paths/first-robot">Use normal build mode</Link>
        <Link className="btn" href="/">Home</Link>
      </div>
    </section>
  </main>;
}
