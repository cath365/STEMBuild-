import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";
import { LabModeSelector } from "@/components/lab-mode-selector";

export const metadata: Metadata = {
  title: "3D Lab",
  description: "Build free breadboard circuits, assemble an obstacle-avoiding robot and design CAD assemblies. Guided Arduino lessons have their own page.",
};

export default function ThreeDLabPage() {
  return <div>
    <PublicHeader />
    <main>
      <section className="lab3d-hero">
        <div className="container">
          <div className="eyebrow">STEMBUILD 3D LAB · LEARN BY MAKING</div>
          <h1>Build it in 3D.<br/><span>Understand how it works.</span></h1>
          <p className="lead">Build circuits freely on a breadboard, assemble an obstacle-avoiding robot or design your robot in CAD. Choose one workspace at a time. Guided Arduino lessons are available separately.</p>
          <div className="inline" style={{marginTop:18}}>
            <a className="btn btn-primary" href="#workbench">Open Free Build</a>
            <Link className="btn" href="/3d-lab/guided">Guided circuit lessons</Link>
            <Link className="btn" href="/learning-paths/first-robot">First Robot Path</Link>
          </div>
        </div>
      </section>

      <section id="workbench" className="container lab3d-section">
        <LabModeSelector />
      </section>

      <section className="container lab3d-next-section">
        <div className="card">
          <div className="eyebrow">ENGINE BOUNDARIES</div>
          <h2 style={{marginTop:8}}>Simulation is a learning tool, not a substitute for physical testing.</h2>
          <p className="muted">The Free Build breadboard checks the supported electrical connections for a starter LED circuit. For compiled ATmega328P machine code and reviewed step-by-step wiring, use the <Link href="/3d-lab/guided">guided circuit lessons</Link>. Real hardware can differ because of power supplies, wiring, tolerances and component revisions.</p>
        </div>
      </section>
    </main>
    <PublicFooter />
  </div>;
}
