import type { Metadata } from "next";
import { ToolShell } from "@/components/tools/tool-shell";
import { Oscilloscope } from "@/components/tools/oscilloscope";

export const metadata: Metadata = {
  title: "Oscilloscope & Signal Generator",
  description: "A two-channel virtual oscilloscope with a signal generator, RC filters, rectifiers and PWM.",
};

export default function Page() {
  return <ToolShell slug="oscilloscope" eyebrow="LEVEL 3 · OSCILLOSCOPE & SIGNAL GENERATOR" title="See electricity" accent="change over time." intro="A multimeter gives one number. An oscilloscope draws the voltage over time, so you can see PWM, filtering, ripple and noise. Feed a signal into a circuit and compare input (CH1) with output (CH2).">
      <Oscilloscope />
  </ToolShell>;
}