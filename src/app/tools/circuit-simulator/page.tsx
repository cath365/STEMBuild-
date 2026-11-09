import type { Metadata } from "next";
import { ToolShell } from "@/components/tools/tool-shell";
import { CircuitLab } from "@/components/circuit-lab/circuit-lab";

export const metadata: Metadata = {
  title: "Live Circuit Simulator",
  description: "Draw circuits with batteries, resistors, LEDs, capacitors, diodes and transistors, and watch current flow and voltages change in real time.",
};

export default function Page() {
  return <ToolShell slug="circuit-simulator" description="Draw a circuit on the grid and it runs straight away. Moving dots show the current, wire colours show the voltage, and capacitors, diodes and transistors behave over time, as on a real bench.">
    <CircuitLab />
  </ToolShell>;
}
