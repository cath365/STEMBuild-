// Digital logic for the logic-gate lab (pure functions).

export type GateType = "AND" | "OR" | "NOT" | "NAND" | "NOR" | "XOR" | "XNOR";

export const GATES: { type: GateType; summary: string; expression: string }[] = [
  { type: "AND", summary: "Output is 1 only when every input is 1.", expression: "Q = A · B" },
  { type: "OR", summary: "Output is 1 when at least one input is 1.", expression: "Q = A + B" },
  { type: "NOT", summary: "Output is the opposite of the input.", expression: "Q = Ā" },
  { type: "NAND", summary: "AND followed by NOT. Any circuit can be built from NAND gates alone.", expression: "Q = ¬(A · B)" },
  { type: "NOR", summary: "OR followed by NOT.", expression: "Q = ¬(A + B)" },
  { type: "XOR", summary: "Output is 1 when the inputs are different.", expression: "Q = A ⊕ B" },
  { type: "XNOR", summary: "Output is 1 when the inputs are the same.", expression: "Q = ¬(A ⊕ B)" },
];

export function evaluateGate(type: GateType, a: boolean, b = false) {
  switch (type) {
    case "AND": return a && b;
    case "OR": return a || b;
    case "NOT": return !a;
    case "NAND": return !(a && b);
    case "NOR": return !(a || b);
    case "XOR": return a !== b;
    case "XNOR": return a === b;
  }
}

export type LogicCircuit = {
  id: string;
  name: string;
  summary: string;
  inputs: string[];
  outputs: { name: string; expression: string; evaluate: (inputs: Record<string, boolean>) => boolean }[];
  gates: string[];
};

export const LOGIC_CIRCUITS: LogicCircuit[] = [
  {
    id: "half-adder", name: "Half adder", summary: "Adds two bits. This is the first step of how every computer does arithmetic.",
    inputs: ["A", "B"], gates: ["1 × XOR", "1 × AND"],
    outputs: [
      { name: "Sum", expression: "A ⊕ B", evaluate: (x) => x.A !== x.B },
      { name: "Carry", expression: "A · B", evaluate: (x) => x.A && x.B },
    ],
  },
  {
    id: "full-adder", name: "Full adder", summary: "Adds two bits plus a carry-in. Chain eight of these and you can add whole bytes.",
    inputs: ["A", "B", "Cin"], gates: ["2 × XOR", "2 × AND", "1 × OR"],
    outputs: [
      { name: "Sum", expression: "A ⊕ B ⊕ Cin", evaluate: (x) => (x.A !== x.B) !== x.Cin },
      { name: "Cout", expression: "A·B + Cin·(A ⊕ B)", evaluate: (x) => (x.A && x.B) || (x.Cin && x.A !== x.B) },
    ],
  },
  {
    id: "alarm", name: "Security alarm", summary: "The siren sounds when the system is armed and the door or the window opens.",
    inputs: ["Armed", "Door", "Window"], gates: ["1 × OR", "1 × AND"],
    outputs: [{ name: "Siren", expression: "Armed · (Door + Window)", evaluate: (x) => x.Armed && (x.Door || x.Window) }],
  },
  {
    id: "majority", name: "Majority vote", summary: "Output follows at least two of three inputs. Used in safety systems with three redundant sensors.",
    inputs: ["A", "B", "C"], gates: ["3 × AND", "1 × OR (3-input)"],
    outputs: [{ name: "Vote", expression: "A·B + B·C + A·C", evaluate: (x) => (x.A && x.B) || (x.B && x.C) || (x.A && x.C) }],
  },
];

export function truthTable(inputs: string[]) {
  return Array.from({ length: 2 ** inputs.length }, (_, row) =>
    Object.fromEntries(inputs.map((name, index) => [name, Boolean((row >> (inputs.length - 1 - index)) & 1)])) as Record<string, boolean>);
}
