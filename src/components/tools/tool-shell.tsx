import Link from "next/link";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";
import { PageHeader } from "@/components/page-header";
import { CalculatorIcon, ChipIcon, LogicIcon, MultimeterIcon, ScopeIcon, UsbIcon } from "@/components/icons";

export type ToolInfo = { slug: string; href: string; name: string; level: string; summary: string; replaces: string; icon: (props: { className?: string }) => React.ReactElement };

// Ordered basic → advanced, mirroring the tools engineers pick up as they progress.
export const VIRTUAL_TOOLS: ToolInfo[] = [
  { slug: "calculators", href: "/tools/calculators", name: "Engineering calculators", level: "Level 1", icon: CalculatorIcon, summary: "Ohm’s law, resistor colour codes, LED resistors, voltage dividers, RC and 555 timers, battery life.", replaces: "Calculator, datasheets, colour chart" },
  { slug: "multimeter", href: "/tools/multimeter", name: "Circuit bench & multimeter", level: "Level 1", icon: MultimeterIcon, summary: "Build circuits from batteries, resistors, LEDs and switches, then measure volts, amps, ohms and continuity.", replaces: "Breadboard, components, multimeter" },
  { slug: "logic", href: "/tools/logic", name: "Logic gate lab", level: "Level 2", icon: LogicIcon, summary: "AND, OR, NOT, XOR and the rest, with truth tables, adders and real-world logic circuits.", replaces: "74HC logic ICs, breadboard" },
  { slug: "virtual-arduino", href: "/tools/virtual-arduino", name: "Virtual Arduino Uno", level: "Level 2", icon: ChipIcon, summary: "Write Arduino C++, compile it in the browser and run it on an emulated ATmega328P with LEDs, buttons, sensors and a serial monitor.", replaces: "Arduino Uno, USB cable, LEDs, sensors" },
  { slug: "oscilloscope", href: "/tools/oscilloscope", name: "Oscilloscope & signal generator", level: "Level 3", icon: ScopeIcon, summary: "Watch signals change over time through filters, PWM and rectifiers, with timebase, volts/div, trigger and measurements.", replaces: "Oscilloscope, function generator" },
  { slug: "hardware-monitor", href: "/hardware-monitor", name: "Live hardware monitor", level: "Real hardware", icon: UsbIcon, summary: "When you do have a board: plug it in over USB and graph its real serial output.", replaces: "Arduino IDE Serial Monitor & Plotter" },
];

export function ToolShell({ slug, description, children }: { slug: string; description: string; children: React.ReactNode }) {
  const tool = VIRTUAL_TOOLS.find((item) => item.slug === slug)!;
  return <div>
    <PublicHeader />
    <main>
      <PageHeader crumbs={[{ label: "Home", href: "/" }, { label: "Virtual lab", href: "/tools" }, { label: tool.name }]} title={tool.name} description={description} />
      <nav className="container tool-tabs" aria-label="Virtual lab tools">
        {VIRTUAL_TOOLS.map((item) => <Link key={item.slug} href={item.href} aria-current={item.slug === slug ? "page" : undefined}>{item.name}</Link>)}
      </nav>
      <section className="container section" style={{ paddingTop: 24 }}>{children}</section>
    </main>
    <PublicFooter />
  </div>;
}
