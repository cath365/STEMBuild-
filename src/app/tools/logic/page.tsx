import type { Metadata } from "next";
import { ToolShell } from "@/components/tools/tool-shell";
import { LogicLab } from "@/components/tools/logic-lab";

export const metadata: Metadata = {
  title: "Logic Gate Lab",
  description: "Interactive logic gates, truth tables, adders and real logic circuits.",
};

export default function Page() {
  return <ToolShell slug="logic" description="Every processor is built from logic gates. Toggle the inputs, watch the outputs and read the truth table, from a single AND gate to a binary adder.">
      <LogicLab />
  </ToolShell>;
}