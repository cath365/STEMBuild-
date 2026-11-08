import type { Metadata } from "next";
import { ToolShell } from "@/components/tools/tool-shell";
import { CircuitBench } from "@/components/tools/circuit-bench";

export const metadata: Metadata = {
  title: "Circuit Bench & Multimeter",
  description: "Build circuits with batteries, resistors, LEDs and switches and measure them with a virtual digital multimeter.",
};

export default function Page() {
  return <ToolShell slug="multimeter" description="Place batteries, resistors, LEDs and switches, then measure them like a technician. The circuit is solved with real circuit laws, so an LED without a resistor burns out.">
      <CircuitBench />
  </ToolShell>;
}