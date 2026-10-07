import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";
import { Stem3DLabPrototype } from "@/components/stem-3d-lab-prototype";

export const metadata: Metadata = {
  title: "3D Lab Prototype",
  description: "Assemble, wire, program and simulate an Arduino Uno LED circuit in the STEMBuild 3D Lab proof of concept.",
};

export default function ThreeDLabPage() {
  return <div>
    <PublicHeader />
    <main>
      <section className="lab3d-hero">
        <div className="container">
          <div className="eyebrow">STEMBUILD 3D LAB · PROOF OF CONCEPT</div>
          <h1>Assemble it. Wire it.<br/><span>Program it. Watch it work.</span></h1>
          <p className="lead">This first prototype tests the complete interaction using an Arduino Uno, breadboard, 330 Ω resistor and LED. The parts use real reference imagery on a 3D-style workbench; the simulation engine is intentionally limited to this circuit while we validate the learning experience.</p>
          <div className="inline" style={{marginTop:18}}>
            <a className="btn btn-primary" href="#workbench">Open the workbench</a>
            <Link className="btn" href="/learning-paths/first-robot">Back to First Robot Path</Link>
          </div>
        </div>
      </section>

      <section id="workbench" className="container lab3d-section">
        <Stem3DLabPrototype />
      </section>

      <section className="container lab3d-next-section">
        <div className="card">
          <div className="eyebrow">IF THIS INTERACTION FEELS RIGHT</div>
          <h2 style={{marginTop:8}}>The visual layer can graduate to verified CAD.</h2>
          <p className="muted">The project definition, snap points, wiring graph, code and simulation state are kept separate from the current prototype rendering. That means Arduino/ESP32 GLB models, breadboards, motors, robot chassis and articulated kits can replace the prototype workbench without rewriting the learning logic.</p>
        </div>
      </section>
    </main>
    <PublicFooter />
  </div>;
}
