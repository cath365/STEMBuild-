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
      <section className="lab3d-hero lab-ux-hero guided">
        <div className="container lab-ux-hero-layout">
          <div className="lab-ux-hero-copy">
            <div className="lab-ux-breadcrumb"><Link href="/3d-lab">3D Lab</Link><span aria-hidden="true">/</span><span>Guided lessons</span></div>
            <div className="eyebrow">LEARN WITH GUIDANCE · ARDUINO UNO</div>
            <h1>One circuit.<br/><span>Four clear steps.</span></h1>
            <p className="lead">Start with LED Blink or Push-Button Light. Follow each step to assemble the circuit, connect the wires and test your Arduino sketch.</p>
            <div className="lab-ux-hero-actions">
              <a className="btn btn-primary" href="#guided-workbench">Choose a lesson <span aria-hidden="true">→</span></a>
              <Link className="btn" href="/3d-lab#workbench">← Free Build &amp; other workspaces</Link>
            </div>
            <p className="lab-ux-hero-footnote">Lightweight by default · Full AVR firmware compilation is optional</p>
          </div>
          <div className="lab-ux-hero-visual guided" aria-label="Four stages of a guided robotics lesson">
            <span className="lab-ux-diagram-top">STEMBUILD / LEARNING SEQUENCE</span>
            <div className="lab-ux-diagram-guided">
              <span><b>01</b><strong>Assemble</strong><small>Place the parts</small></span>
              <span><b>02</b><strong>Wire</strong><small>Connect safely</small></span>
              <span><b>03</b><strong>Program</strong><small>Edit Arduino</small></span>
              <span><b>04</b><strong>Run</strong><small>Test &amp; review</small></span>
            </div>
            <span className="lab-ux-diagram-bottom">LEARN · BUILD · TEST · IMPROVE</span>
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
