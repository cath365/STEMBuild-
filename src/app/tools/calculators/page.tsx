import type { Metadata } from "next";
import { ToolShell } from "@/components/tools/tool-shell";
import { EngineeringCalculators } from "@/components/tools/calculators";

export const metadata: Metadata = {
  title: "Engineering Calculators",
  description: "Ohm's law, resistor colour code, LED resistor, voltage divider, RC, 555 timer, capacitor code and battery life calculators.",
};

export default function Page() {
  return <ToolShell slug="calculators" eyebrow="LEVEL 1 · ENGINEERING CALCULATORS" title="Do the maths" accent="before you build." intro="The calculations engineers do every day, with the formula explained. Type values the way engineers write them: 4k7, 100n, 20m.">
      <EngineeringCalculators />
  </ToolShell>;
}