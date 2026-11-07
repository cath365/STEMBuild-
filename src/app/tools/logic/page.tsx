import type { Metadata } from "next";
import { ToolShell } from "@/components/tools/tool-shell";
import { LogicLab } from "@/components/tools/logic-lab";

export const metadata: Metadata = {
  title: "Logic Gate Lab",
  description: "Interactive logic gates, truth tables, adders and real logic circuits.",
};

export default function Page() {
  return <ToolShell slug="logic" eyebrow="LEVEL 2 · LOGIC GATE LAB" title="Ones and zeros" accent="make decisions." intro="Every computer is built from logic gates. Toggle inputs, watch outputs and see the truth table, from a single AND gate to the adder inside a processor.">
      <LogicLab />
  </ToolShell>;
}