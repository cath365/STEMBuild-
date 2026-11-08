import type { Metadata } from "next";
import { ToolShell } from "@/components/tools/tool-shell";
import { Oscilloscope } from "@/components/tools/oscilloscope";

export const metadata: Metadata = {
  title: "Oscilloscope & Signal Generator",
  description: "A two-channel virtual oscilloscope with a signal generator, RC filters, rectifiers and PWM.",
};

export default function Page() {
  return <ToolShell slug="oscilloscope" description="A multimeter gives you one number. An oscilloscope shows how a voltage changes over time. Feed a signal into a circuit and compare the input (CH1) with the output (CH2).">
      <Oscilloscope />
  </ToolShell>;
}