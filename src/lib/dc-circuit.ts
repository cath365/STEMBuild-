// DC circuit solver for the virtual multimeter bench (nodal analysis, pure functions).
//
// Every element is a two-terminal branch from `a` to `b`, modelled as a conductance G in series
// with an EMF E, so the branch current a→b is I = G·(Va − Vb − E). That one form covers:
//   battery  E = +V (a is +), G = 1 / internal resistance
//   LED      E = Vf, G = 1 / series resistance while forward-biased; ~open otherwise
//   resistor / wire / closed switch   E = 0
// Batteries have internal resistance, so a short circuit gives a large but finite current
// that the bench reports as a hazard (as it would be on a real bench).

export type ElementKind = "battery" | "resistor" | "led" | "switch" | "wire";
export type LedColour = "red" | "yellow" | "green" | "blue" | "white";

export type CircuitElement = {
  id: string;
  kind: ElementKind;
  a: string;
  b: string;
  /** Volts for a battery, ohms for a resistor. */
  value?: number;
  closed?: boolean;
  colour?: LedColour;
  /** Burnt-out LED or hidden broken wire: behaves as an open circuit. */
  broken?: boolean;
};

export const LED_FORWARD_VOLTS: Record<LedColour, number> = { red: 2.0, yellow: 2.1, green: 2.2, blue: 3.0, white: 3.0 };
export const LED_MAX_AMPS = 0.03;
export const LED_ON_AMPS = 0.0005;
const LED_SERIES_OHMS = 15;
const BATTERY_INTERNAL_OHMS = 0.3;
const WIRE_OHMS = 0.01;
const OPEN = 1e-12;
const LEAK = 1e-12;
export const SHORT_CIRCUIT_AMPS = 3;

export type ElementResult = { current: number; voltage: number; power: number; ledOn?: boolean; overCurrent?: boolean };
export type CircuitSolution = {
  ok: boolean;
  ground: string | null;
  voltages: Record<string, number>;
  elements: Record<string, ElementResult>;
  warnings: string[];
};

function branch(element: CircuitElement, ledOn: boolean) {
  if (element.broken) return { g: OPEN, e: 0 };
  switch (element.kind) {
    case "battery": return { g: 1 / BATTERY_INTERNAL_OHMS, e: element.value ?? 0 };
    case "resistor": return { g: 1 / Math.max(element.value ?? 1, WIRE_OHMS), e: 0 };
    case "wire": return { g: 1 / WIRE_OHMS, e: 0 };
    case "switch": return element.closed ? { g: 1 / WIRE_OHMS, e: 0 } : { g: OPEN, e: 0 };
    case "led": return ledOn ? { g: 1 / LED_SERIES_OHMS, e: LED_FORWARD_VOLTS[element.colour ?? "red"] } : { g: OPEN, e: 0 };
  }
}

/** Solves A·x = b in place with partial pivoting. Returns null for a singular matrix. */
function gaussianSolve(a: number[][], b: number[]) {
  const n = b.length;
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++) if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) pivot = row;
    if (Math.abs(a[pivot][col]) < 1e-18) return null;
    [a[col], a[pivot]] = [a[pivot], a[col]];
    [b[col], b[pivot]] = [b[pivot], b[col]];
    for (let row = col + 1; row < n; row++) {
      const factor = a[row][col] / a[col][col];
      if (!factor) continue;
      for (let k = col; k < n; k++) a[row][k] -= factor * a[col][k];
      b[row] -= factor * b[col];
    }
  }
  const x = new Array<number>(n).fill(0);
  for (let row = n - 1; row >= 0; row--) {
    let sum = b[row];
    for (let k = row + 1; k < n; k++) sum -= a[row][k] * x[k];
    x[row] = sum / a[row][row];
  }
  return x;
}

function nodesOf(elements: CircuitElement[]) {
  return Array.from(new Set(elements.flatMap((element) => [element.a, element.b])));
}

/** Node voltages relative to `ground`, given each branch's (g, e). */
function nodal(elements: CircuitElement[], ground: string, branches: Map<string, { g: number; e: number }>, inject?: { node: string; amps: number }) {
  const nodes = nodesOf(elements).filter((node) => node !== ground);
  const index = new Map(nodes.map((node, i) => [node, i]));
  const n = nodes.length;
  const a = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  const b = new Array<number>(n).fill(0);
  for (let i = 0; i < n; i++) a[i][i] += LEAK; // keeps floating sections solvable
  for (const element of elements) {
    const { g, e } = branches.get(element.id)!;
    const ia = index.get(element.a), ib = index.get(element.b);
    if (ia !== undefined) { a[ia][ia] += g; b[ia] += g * e; }
    if (ib !== undefined) { a[ib][ib] += g; b[ib] -= g * e; }
    if (ia !== undefined && ib !== undefined) { a[ia][ib] -= g; a[ib][ia] -= g; }
  }
  if (inject) { const i = index.get(inject.node); if (i !== undefined) b[i] += inject.amps; }
  const x = gaussianSolve(a, b);
  if (!x) return null;
  const voltages: Record<string, number> = { [ground]: 0 };
  nodes.forEach((node, i) => { voltages[node] = Math.abs(x[i]) < 1e-9 ? 0 : x[i]; });
  return voltages;
}

export function solveCircuit(elements: CircuitElement[]): CircuitSolution {
  const empty: CircuitSolution = { ok: true, ground: null, voltages: {}, elements: {}, warnings: [] };
  if (!elements.length) return empty;
  const battery = elements.find((element) => element.kind === "battery" && !element.broken);
  const ground = battery ? battery.b : elements[0].a;

  // LEDs are diodes: iterate the on/off assumption until it is self-consistent.
  const ledOn = new Map(elements.filter((element) => element.kind === "led").map((element) => [element.id, false]));
  let voltages: Record<string, number> | null = null;
  let branches = new Map<string, { g: number; e: number }>();
  for (let iteration = 0; iteration < 30; iteration++) {
    branches = new Map(elements.map((element) => [element.id, branch(element, ledOn.get(element.id) ?? false)]));
    voltages = nodal(elements, ground, branches);
    if (!voltages) break;
    let changed = false;
    for (const element of elements) {
      if (element.kind !== "led" || element.broken) continue;
      const vf = LED_FORWARD_VOLTS[element.colour ?? "red"];
      const drop = voltages[element.a] - voltages[element.b];
      const on = ledOn.get(element.id)!;
      const current = on ? (drop - vf) / LED_SERIES_OHMS : 0;
      if (!on && drop > vf) { ledOn.set(element.id, true); changed = true; }
      else if (on && current < 0) { ledOn.set(element.id, false); changed = true; }
    }
    if (!changed) break;
  }
  if (!voltages) return { ...empty, ok: false, ground, warnings: ["The circuit could not be solved. Check for a loop made only of wires and batteries."] };

  const results: Record<string, ElementResult> = {};
  const warnings: string[] = [];
  for (const element of elements) {
    const { g, e } = branches.get(element.id)!;
    const voltage = voltages[element.a] - voltages[element.b];
    const raw = element.broken || g === OPEN ? 0 : g * (voltage - e);
    const current = Math.abs(raw) < 1e-9 ? 0 : raw;
    const result: ElementResult = { current, voltage, power: Math.abs(voltage * current) };
    if (element.kind === "led") {
      result.ledOn = current > LED_ON_AMPS;
      if (current > LED_MAX_AMPS) { result.overCurrent = true; warnings.push(`An LED is carrying ${(current * 1000).toFixed(0)} mA, above its ~30 mA limit. It would burn out. Add a series resistor.`); }
    }
    if (element.kind === "battery" && -current > SHORT_CIRCUIT_AMPS) {
      result.overCurrent = true;
      warnings.push(`Short circuit: the battery is supplying ${(-current).toFixed(1)} A. On a real bench the wires and battery would get dangerously hot.`);
    }
    if (element.kind === "resistor" && result.power > 0.25) {
      result.overCurrent = true;
      warnings.push(`A resistor is dissipating ${result.power.toFixed(2)} W, more than a common ¼ W resistor can handle.`);
    }
    results[element.id] = result;
  }
  return { ok: true, ground, voltages, elements: results, warnings };
}

/** Resistance between two nodes as an ohmmeter sees it: batteries removed, LEDs not conducting. */
export function measureResistance(elements: CircuitElement[], p: string, q: string) {
  if (p === q) return 0;
  const passive = elements.filter((element) => element.kind !== "battery");
  if (!passive.some((element) => [element.a, element.b].includes(p)) || !passive.some((element) => [element.a, element.b].includes(q))) return Infinity;
  const branches = new Map(passive.map((element) => [element.id, branch(element, false)]));
  const voltages = nodal(passive, q, branches, { node: p, amps: 1 });
  if (!voltages) return Infinity;
  const ohms = voltages[p];
  return ohms > 1e8 ? Infinity : ohms;
}
