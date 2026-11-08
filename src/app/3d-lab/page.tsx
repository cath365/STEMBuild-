import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
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
      <section className="lab-hero" aria-labelledby="lab-title">
        <div className="container lab-hero-grid">
          <div className="lab-hero-copy">
            <nav className="page-header-crumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><span aria-current="page">3D Lab</span></nav>
            <h1 id="lab-title">3D Lab</h1>
            <p className="page-header-description">Three workspaces in one place: wire real parts on a breadboard hole by hole, assemble and drive an obstacle-avoiding robot, and design assemblies in a CAD editor. Your work saves in this browser.</p>
            <div className="page-header-actions">
              <a className="btn btn-primary" href="#workbench">Open the workbench</a>
              <Link className="btn" href="/3d-lab/guided">Guided lessons</Link>
            </div>
            <ul className="lab-hero-modes" aria-label="Workspaces">
              <li><strong>Circuit builder</strong><span>Breadboard wiring with a blink preview</span></li>
              <li><strong>Robot builder</strong><span>Assemble, wire and test in an arena</span></li>
              <li><strong>CAD workspace</strong><span>Position 3D parts and test circuits</span></li>
            </ul>
            <p className="lab-hero-note"><Link className="text-link" href="/learn/arduino-led-blink">New? Learn the LED step by step →</Link></p>
            <p className="lab-hero-note" style={{ marginTop: 8 }}>Want to build with any part and run your own code? <Link className="text-link" href="/studio">Open Maker Studio →</Link></p>
          </div>
          <div className="lab-ux-hero-visual free circuit-hero" aria-label="Arduino Uno LED blink circuit wiring preview">
            <div className="circuit-hero-head">
              <span className="lab-ux-diagram-top">CIRCUIT WORKBENCH / STARTER BUILD</span>
              <span className="circuit-hero-check">PIN-MAPPED EXAMPLE</span>
            </div>
            <figure className="circuit-hero-figure">
              <Image
                className="circuit-hero-picture"
                src="/illustrations/arduino-uno-led-breadboard.svg"
                width={920}
                height={510}
                priority
                alt="Realistic Fritzing-style Arduino Uno LED blink wiring: D8 to a 330 ohm resistor across the breadboard centre gap, to the LED anode, and the LED cathode to Arduino GND."
              />
              <figcaption>
                <strong>Arduino Uno · LED Blink</strong>
                <span>D8 → 330 Ω → LED (+) → GND</span>
              </figcaption>
            </figure>
            <div className="circuit-hero-bottom">
              <span className="lab-ux-diagram-bottom">REAL COMPONENTS · WIRING · CODE · TEST</span>
              <a href="#workbench" className="circuit-hero-link">Build this circuit <span aria-hidden="true">↗</span></a>
            </div>
          </div>
        </div>
      </section>

      <section id="workbench" className="container lab3d-section lab-workspace-wide">
        <LabModeSelector />
      </section>

      <section className="container lab3d-next-section">
        <div className="card">
          <div className="eyebrow">Engine boundaries</div>
          <h2 style={{marginTop:8}}>Simulation is a learning tool, not a substitute for physical testing.</h2>
          <p className="muted">The Free Build breadboard checks the supported electrical connections for a starter LED circuit. For compiled ATmega328P machine code and reviewed step-by-step wiring, use the <Link href="/3d-lab/guided">guided circuit lessons</Link>. Real hardware can differ because of power supplies, wiring, tolerances and component revisions.</p>
        </div>
      </section>
    </main>
    <PublicFooter />
  </div>;
}
