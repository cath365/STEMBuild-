import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";
import { VIRTUAL_TOOLS } from "@/components/tools/tool-shell";

export const metadata: Metadata = {
  title: "Virtual Electronics Lab",
  description: "Free virtual engineering tools: calculators, a circuit bench with multimeter, oscilloscope, logic gates and a virtual Arduino Uno. No components needed.",
};

const ladder = [
  { level: "Level 1 · Foundations", tools: "Multimeter, breadboard, resistor colour code, Ohm’s law", here: ["calculators", "multimeter"] },
  { level: "Level 2 · Building & coding", tools: "Arduino programming, digital logic, serial monitor", here: ["virtual-arduino", "logic", "hardware-monitor"] },
  { level: "Level 3 · Seeing signals", tools: "Oscilloscope, function generator, filters, PWM", here: ["oscilloscope"] },
  { level: "Level 4 · Designing products", tools: "PCB design (KiCad), SPICE simulation (LTspice), CAD", here: [] },
  { level: "Level 5 · Advanced systems", tools: "ROS 2, control systems, computer vision, TinyML", here: [] },
];

export default function ToolsPage() {
  return <div>
    <PublicHeader />
    <main>
      <section className="sample-hero">
        <div className="container">
          <div className="eyebrow">VIRTUAL ELECTRONICS LAB</div>
          <h1>No components?<br/><span>Start engineering anyway.</span></h1>
          <p className="lead">The instruments and parts engineers use, working in your browser: build circuits and measure them, read signals on an oscilloscope, design logic and program a virtual Arduino. Free, and no hardware needed.</p>
          <p className="small muted">Simulations teach the ideas and the measuring habits. Real components still behave a little differently (tolerances, noise, worn batteries), so build the real thing when you can.</p>
        </div>
      </section>
      <section className="container section stack">
        <div className="tool-grid">
          {VIRTUAL_TOOLS.map((tool) => <Link key={tool.slug} href={tool.href} className="card tool-card">
            <span className="badge">{tool.level}</span>
            <h2>{tool.name}</h2>
            <p className="muted">{tool.summary}</p>
            <p className="small tool-replaces"><strong>Stands in for:</strong> {tool.replaces}</p>
            <span className="text-link">Open tool →</span>
          </Link>)}
        </div>

        <div className="card">
          <div className="eyebrow">The engineer’s tool ladder</div>
          <h2 style={{ marginTop: 8 }}>From your first LED to professional engineering</h2>
          <p className="muted">Engineers pick up tools in roughly this order. Each level builds on the one before it.</p>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Level</th><th>Real-world tools</th><th>Practise here</th></tr></thead>
              <tbody>{ladder.map((row) => <tr key={row.level}><td><strong>{row.level}</strong></td><td>{row.tools}</td><td>{row.here.length ? <span className="inline">{row.here.map((slug) => { const tool = VIRTUAL_TOOLS.find((t) => t.slug === slug)!; return <Link key={slug} className="text-link" href={tool.href}>{tool.name}</Link>; })}</span> : <span className="muted">Coming next. Free desktop tools: KiCad, LTspice, FreeCAD, ROS 2.</span>}</td></tr>)}</tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-2">
          <div className="card"><div className="eyebrow">Also in STEMBuild</div><h2 style={{ marginTop: 8, fontSize: 24 }}>3D Lab</h2><p className="muted">Wire a real breadboard layout, assemble a robot and design CAD assemblies.</p><Link className="btn" href="/3d-lab">Open the 3D Lab</Link></div>
          <div className="card"><div className="eyebrow">Ready for hardware?</div><h2 style={{ marginTop: 8, fontSize: 24 }}>Projects that match your kit</h2><p className="muted">Tick the parts you have and STEMBuild shows what you can build now.</p><Link className="btn" href="/components">My Components</Link></div>
        </div>
      </section>
    </main>
    <PublicFooter />
  </div>;
}
