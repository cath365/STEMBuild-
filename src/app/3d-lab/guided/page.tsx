import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";
import { Stem3DLabPrototype } from "@/components/stem-3d-lab-prototype";

export const metadata: Metadata = {
  title: "Guided Circuit Lessons | 3D Lab",
  description: "Follow guided Arduino Uno LED and push-button circuit lessons, connect reviewed pins, program the Uno and optionally compile AVR firmware.",
};

export default function GuidedCircuitLessonsPage() {
  return <div>
    <PublicHeader />
    <main>
      <section className="lab3d-hero">
        <div className="container">
          <div className="eyebrow">STEMBUILD · GUIDED CIRCUIT LESSONS</div>
          <h1>Learn the circuit.<br/><span>Then build it yourself.</span></h1>
          <p className="lead">Choose an LED or push-button project and follow a step-by-step Arduino lesson. Place components, connect reviewed wires and test your sketch. Full Firmware Mode remains optional.</p>
          <div className="inline" style={{marginTop:18}}>
            <a className="btn btn-primary" href="#guided-workbench">Start a guided lesson</a>
            <Link className="btn" href="/3d-lab#workbench">← Free Build &amp; other workspaces</Link>
          </div>
        </div>
      </section>
      <section className="container lab3d-section" id="guided-workbench" aria-label="Guided Arduino circuit lessons">
        <div className="guided-lab-route-intro">
          <div>
            <p className="eyebrow">STEP-BY-STEP · ARDUINO UNO</p>
            <p className="muted">Your previous LED Blink and Push-Button Light work stays saved in this browser. This lesson workspace is separate from the Free Build breadboard.</p>
          </div>
          <Link href="/3d-lab#workbench" className="btn">Go to Free Build →</Link>
        </div>
        <Stem3DLabPrototype />
      </section>
    </main>
    <PublicFooter />
  </div>;
}
