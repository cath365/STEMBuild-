import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";
import { RobotArena } from "@/components/robot-arena";
import { Stem3DLabPrototype } from "@/components/stem-3d-lab-prototype";

export const metadata: Metadata = {
  title: "3D Lab",
  description: "Assemble real-world parts in WebGL, wire them, program Arduino Uno source, and optionally compile and execute real AVR firmware.",
};

export default function ThreeDLabPage() {
  return <div>
    <PublicHeader />
    <main>
      <section className="lab3d-hero">
        <div className="container">
          <div className="eyebrow">STEMBUILD 3D LAB · REAL ENGINE PREVIEW</div>
          <h1>Build it in 3D.<br/><span>Run the firmware. Take it outside.</span></h1>
          <p className="lead">The lab now combines a true WebGL workbench with dimensioned 3D parts and two simulation choices: a fast low-data learning engine, or an opt-in Full Firmware Mode that compiles Arduino Uno source to real AVR machine code and executes it in an ATmega328P emulator.</p>
          <div className="inline" style={{marginTop:18}}>
            <a className="btn btn-primary" href="#workbench">Open the 3D workbench</a>
            <Link className="btn" href="/learning-paths/first-robot">First Robot Path</Link>
          </div>
        </div>
      </section>

      <section id="workbench" className="container lab3d-section">
        <Stem3DLabPrototype />
        <RobotArena />
      </section>

      <section className="container lab3d-next-section">
        <div className="card">
          <div className="eyebrow">ENGINE BOUNDARIES</div>
          <h2 style={{marginTop:8}}>Real firmware does not mean imaginary hardware is perfect.</h2>
          <p className="muted">The Arduino Uno model uses the official 68.6 × 53.4 mm board footprint. Generic breadboards, LEDs, resistors and tactile buttons use dimensioned educational geometry and can vary between manufacturers. Full Firmware Mode executes compiled ATmega328P machine code, but a physical build can still differ because of battery condition, loose wires, component tolerances, motor load and module revisions.</p>
        </div>
      </section>
    </main>
    <PublicFooter />
  </div>;
}
