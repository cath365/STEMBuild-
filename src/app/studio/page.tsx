import type { Metadata } from "next";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";
import { PageHeader } from "@/components/page-header";
import { MakerStudio } from "@/components/studio/maker-studio";

export const metadata: Metadata = {
  title: "Maker Studio",
  description: "Build any Arduino circuit from real parts, write the code and run it on a simulated ATmega328P. Includes advanced engineering challenges with an automatic test bench.",
};

export default function StudioPage() {
  return <div>
    <PublicHeader />
    <main>
      <PageHeader
        crumbs={[{ label: "Home", href: "/" }, { label: "Maker Studio" }]}
        title="Maker Studio"
        description="Build anything: place real parts, wire them to an Arduino Uno, write the code and watch it run on a simulated ATmega328P. When you’re ready, take on the engineering challenges."
      />
      <section className="studio-section">
        <MakerStudio />
      </section>
      <section className="container section" aria-labelledby="studio-how">
        <div className="section-heading"><div><h2 id="studio-how">How the simulation works</h2><p>What happens on this page, and where it differs from a real bench.</p></div></div>
        <div className="grid grid-3">
          <div className="card"><h3>Real machine code</h3><p className="muted small">Your sketch is compiled with avr-gcc into the same machine code a real Uno runs, and executed instruction by instruction at 16 MHz. Timers, PWM, interrupts, serial and the ADC all behave like the chip.</p></div>
          <div className="card"><h3>Real wiring rules</h3><p className="muted small">Wires form electrical nets. An LED needs a resistor and a path to GND, inputs float without a pull-up, and two outputs on one wire are a short circuit. The bench check tells you what a real circuit would do.</p></div>
          <div className="card"><h3>Where it simplifies</h3><p className="muted small">Sensors are idealised modules, there is no noise or supply droop, and the servo moves instantly. Use the studio to design and debug, then build it for real and measure it with the Live hardware monitor.</p></div>
        </div>
      </section>
    </main>
    <PublicFooter />
  </div>;
}
