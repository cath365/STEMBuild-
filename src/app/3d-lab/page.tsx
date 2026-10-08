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
      <section className="lab3d-hero lab-ux-hero free">
        <div className="container lab-ux-hero-layout">
          <div className="lab-ux-hero-copy">
            <div className="lab-ux-breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><span>3D Lab</span></div>
            <div className="eyebrow">STEMBUILD · INTERACTIVE MAKER SPACE</div>
            <h1>Build something.<br/><span>Make it work.</span></h1>
            <p className="lead">Place parts on a breadboard, connect real pin locations, test circuits and design robots. Start small and keep building.</p>
            <div className="lab-ux-hero-actions">
              <a className="btn btn-primary" href="#workbench">Open Free Build <span aria-hidden="true">→</span></a>
              <Link className="btn" href="/3d-lab/guided">Try guided lessons</Link>
            </div>
            <p className="lab-ux-hero-footnote">Free to explore · Projects save in this browser · <Link href="/learn/arduino-led-blink" style={{color:"#ffffff",textDecoration:"underline",textUnderlineOffset:3}}>New? Learn the LED step by step →</Link></p>
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
