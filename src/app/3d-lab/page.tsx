import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";
import { Stem3DLabPrototype } from "@/components/stem-3d-lab-prototype";

export const metadata: Metadata = {
  title: "3D Lab",
  description: "Assemble, wire, program and simulate beginner Arduino projects in STEMBuild 3D Lab.",
};

export default function ThreeDLabPage() {
  return <div>
    <PublicHeader />
    <main>
      <section className="lab3d-hero">
        <div className="container">
          <div className="eyebrow">STEMBUILD 3D LAB · INTERACTIVE v0.2</div>
          <h1>Assemble it. Wire it.<br/><span>Program it. Watch it work.</span></h1>
          <p className="lead">Build an Arduino Uno circuit from real component references, connect the reviewed electrical paths, edit Arduino-style code and run the virtual result. This version includes LED Blink and Push-Button Light, saves progress on the learner's device, and supports tap-to-wire interaction on phones.</p>
          <div className="inline" style={{marginTop:18}}>
            <a className="btn btn-primary" href="#workbench">Open the workbench</a>
            <Link className="btn" href="/learning-paths/first-robot">First Robot Path</Link>
          </div>
        </div>
      </section>

      <section id="workbench" className="container lab3d-section">
        <Stem3DLabPrototype />
      </section>

      <section className="container lab3d-next-section">
        <div className="card">
          <div className="eyebrow">WHAT COMES AFTER v0.2</div>
          <h2 style={{marginTop:8}}>Keep this learning flow, upgrade the engine underneath it.</h2>
          <p className="muted">The project definition, snap points, terminal graph, code and simulation state are separate from the visual renderer. The next major layer can therefore add verified GLB/CAD models and true Arduino AVR firmware compilation/emulation without throwing away the learner workflow you are testing now.</p>
        </div>
      </section>
    </main>
    <PublicFooter />
  </div>;
}
