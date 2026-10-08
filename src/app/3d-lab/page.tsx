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
            <p className="lab-ux-hero-footnote">Free to explore · Projects save in this browser</p>
          </div>
          <div className="lab-ux-hero-visual free" aria-label="Illustration of connected electronic circuit modules">
            <span className="lab-ux-diagram-top">CIRCUIT WORKBENCH / ONLINE</span>
            <div className="lab-ux-circuit-diagram" aria-hidden="true">
              <div className="lab-ux-uno"><span>ARDUINO</span><strong>UNO</strong><small>Digital pin D8</small></div>
              <span className="lab-ux-trace"><i/><i/><i/></span>
              <div className="lab-ux-led"><span>LED</span><i/><small>Output</small></div>
            </div>
            <span className="lab-ux-diagram-bottom">COMPONENTS · WIRING · CODE · SIMULATION</span>
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
