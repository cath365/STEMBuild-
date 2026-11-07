import Link from "next/link";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";

export type ToolInfo = { slug: string; href: string; name: string; level: string; summary: string; replaces: string };

// Ordered basic → advanced, mirroring the tools engineers pick up as they progress.
export const VIRTUAL_TOOLS: ToolInfo[] = [
  { slug: "calculators", href: "/tools/calculators", name: "Engineering calculators", level: "Level 1 · Basics", summary: "Ohm’s law, resistor colour codes, LED resistors, voltage dividers, RC and 555 timers, battery life.", replaces: "Calculator, datasheets and a resistor colour chart" },
  { slug: "multimeter", href: "/tools/multimeter", name: "Circuit bench & multimeter", level: "Level 1 · Basics", summary: "Build circuits from batteries, resistors, LEDs and switches, then measure volts, amps, ohms and continuity.", replaces: "Breadboard, components and a digital multimeter" },
  { slug: "logic", href: "/tools/logic", name: "Logic gate lab", level: "Level 2 · Digital", summary: "AND, OR, NOT, XOR and friends, truth tables, adders and real-world logic circuits.", replaces: "Logic ICs (74HC series) and a breadboard" },
  { slug: "virtual-arduino", href: "/tools/virtual-arduino", name: "Virtual Arduino Uno", level: "Level 2 · Coding", summary: "Write real Arduino C++, compile it in the browser and run it on an emulated ATmega328P with LEDs, buttons, sensors and a serial monitor.", replaces: "Arduino Uno, USB cable, LEDs, buttons and sensors" },
  { slug: "oscilloscope", href: "/tools/oscilloscope", name: "Oscilloscope & signal generator", level: "Level 3 · Instruments", summary: "See signals over time: filters, PWM, rectifiers. Use timebase, volts/div, trigger and measurements like a real scope.", replaces: "Oscilloscope and function generator" },
  { slug: "hardware-monitor", href: "/hardware-monitor", name: "Live hardware monitor", level: "Level 2 · Real hardware", summary: "When you do have a board: plug it in by USB and graph its real serial output.", replaces: "Arduino IDE Serial Monitor and Plotter" },
];

export function ToolShell({ slug, eyebrow, title, accent, intro, children }: { slug: string; eyebrow: string; title: string; accent: string; intro: string; children: React.ReactNode }) {
  return <div>
    <PublicHeader />
    <main>
      <section className="sample-hero tool-hero">
        <div className="container">
          <div className="lab-ux-breadcrumb tool-breadcrumb"><Link href="/tools">Virtual Electronics Lab</Link><span aria-hidden="true">/</span><span>{VIRTUAL_TOOLS.find((tool) => tool.slug === slug)?.name}</span></div>
          <div className="eyebrow">{eyebrow}</div>
          <h1>{title}<br/><span>{accent}</span></h1>
          <p className="lead">{intro}</p>
        </div>
      </section>
      <nav className="container tool-tabs" aria-label="Virtual lab tools">
        {VIRTUAL_TOOLS.map((tool) => <Link key={tool.slug} href={tool.href} aria-current={tool.slug === slug ? "page" : undefined}>{tool.name}</Link>)}
      </nav>
      <section className="container section">{children}</section>
    </main>
    <PublicFooter />
  </div>;
}
