import type { Metadata } from "next";
import { ToolShell } from "@/components/tools/tool-shell";
import { CircuitBench } from "@/components/tools/circuit-bench";

export const metadata: Metadata = {
  title: "Circuit Bench & Multimeter",
  description: "Build circuits with batteries, resistors, LEDs and switches and measure them with a virtual digital multimeter.",
};

export default function Page() {
  return <ToolShell slug="multimeter" eyebrow="LEVEL 1 · CIRCUIT BENCH & MULTIMETER" title="Build a circuit." accent="Measure everything." intro="Place batteries, resistors, LEDs, switches and wires, then measure voltage, current, resistance and continuity with a digital multimeter. The circuit is solved with real circuit laws, so LEDs burn out without a resistor and short circuits are dangerous.">
      <CircuitBench />
  </ToolShell>;
}