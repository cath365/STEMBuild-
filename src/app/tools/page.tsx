import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";
import { PageHeader } from "@/components/page-header";
import { ArrowRightIcon } from "@/components/icons";
import { VIRTUAL_TOOLS } from "@/components/tools/tool-shell";

export const metadata: Metadata = {
  title: "Virtual Electronics Lab",
  description: "Free virtual engineering tools: calculators, a circuit bench with multimeter, oscilloscope, logic gates and a virtual Arduino Uno. No components needed.",
};

const ladder = [
  { level: "1", name: "Foundations", tools: "Multimeter, breadboard, resistor colour code, Ohm’s law", here: ["calculators", "multimeter"] },
  { level: "2", name: "Building and coding", tools: "Arduino programming, digital logic, serial monitor", here: ["virtual-arduino", "logic", "hardware-monitor"] },
  { level: "3", name: "Seeing signals", tools: "Oscilloscope, function generator, filters, PWM", here: ["oscilloscope"] },
  { level: "4", name: "Designing products", tools: "PCB design (KiCad), circuit simulation (LTspice), CAD", here: [], external: "Free desktop apps: KiCad, LTspice, FreeCAD" },
  { level: "5", name: "Advanced systems", tools: "ROS 2, control systems, computer vision, TinyML", here: [], external: "Free and open source: ROS 2, OpenCV, Edge Impulse" },
];

export default function ToolsPage() {
  return <div>
    <PublicHeader />
    <main>
      <PageHeader
        crumbs={[{ label: "Home", href: "/" }, { label: "Virtual lab" }]}
        title="Virtual electronics lab"
        description="The instruments an engineering student learns on, working in your browser. Practise measuring, debugging and coding before your parts arrive, then build the real thing."
      />
      <section className="container section">
        <div className="vl-grid">
          {VIRTUAL_TOOLS.map(({ slug, href, name, level, summary, replaces, icon: Icon }) => <Link key={slug} href={href} className="vl-card">
            <div className="vl-card-top"><span className="icon-tile"><Icon /></span><span className="badge">{level}</span></div>
            <h2>{name}</h2>
            <p>{summary}</p>
            <span className="tool-replaces">Replaces: {replaces}</span>
            <span className="vl-open">Open <ArrowRightIcon className="vl-arrow" /></span>
          </Link>)}
        </div>
      </section>

      <section className="container" aria-labelledby="ladder-title">
        <div className="section-heading"><div><h2 id="ladder-title">From a first LED to professional engineering</h2><p>Engineers pick up their tools in roughly this order. Each level builds on the one before.</p></div></div>
        <ol className="vl-ladder">
          {ladder.map((row) => <li key={row.level}>
            <span className="vl-ladder-level">{row.level}</span>
            <div><h3>{row.name}</h3><p>{row.tools}</p></div>
            <div className="vl-ladder-links">{row.here.length
              ? row.here.map((slug) => { const tool = VIRTUAL_TOOLS.find((t) => t.slug === slug)!; return <Link key={slug} className="text-link" href={tool.href}>{tool.name}</Link>; })
              : <span className="muted small">{row.external}</span>}</div>
          </li>)}
        </ol>
        <p className="small muted" style={{ marginTop: 20 }}>Simulations teach the ideas and the measuring habits. Real components behave slightly differently (tolerances, noise, worn batteries), so build the real circuit when you can.</p>
      </section>
    </main>
    <PublicFooter />
  </div>;
}
