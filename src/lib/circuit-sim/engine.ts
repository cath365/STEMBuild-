// Live circuit simulator engine (in the spirit of Falstad's applet): components sit between grid
// points; every step solves the node voltages with modified nodal analysis, then advances time.
//
// Every two-terminal branch is a conductance G in series with an EMF E, so the current a→b is
// I = G·(Va − Vb − E). Batteries, AC sources, capacitors (backward-Euler companion model), LEDs and
// diodes (piecewise-linear) all fit that form. The NPN transistor adds a base-emitter diode plus a
// voltage-controlled collector current (β·Ib) that saturates at about 0.2 V.

export type SimKind =
  | "wire" | "battery" | "ac" | "resistor" | "led" | "diode" | "lamp" | "motor" | "buzzer"
  | "switch" | "button" | "capacitor" | "npn" | "ground" | "voltmeter" | "ammeter";
export type LedColour = "red" | "yellow" | "green" | "blue" | "white";

/** Grid coordinates. For a battery (x1,y1) is −, (x2,y2) is +. For an LED/diode (x1,y1) is the anode.
 *  For an NPN transistor (x1,y1) is the collector, (x2,y2) the emitter; the base is beside the middle. */
export type SimElement = {
  id: string;
  kind: SimKind;
  x1: number; y1: number; x2: number; y2: number;
  /** Volts (battery, AC peak), ohms (resistor), farads (capacitor), β (npn). */
  value?: number;
  /** AC frequency in Hz. */
  freq?: number;
  colour?: LedColour;
  closed?: boolean;
};

export const LED_VF: Record<LedColour, number> = { red: 1.9, yellow: 2.0, green: 2.1, blue: 2.9, white: 2.9 };
export const LED_HEX: Record<LedColour, string> = { red: "#ff3b30", yellow: "#ffd60a", green: "#30d158", blue: "#3b8bff", white: "#f5f7fa" };
const LED_RS = 12, DIODE_VF = 0.7, DIODE_RS = 0.5;
// An open switch must leak far less than the tiny conductance that anchors floating nodes to ground.
const WIRE_G = 1000, SOURCE_R = 0.05, OPEN_G = 1e-12, LEAK_G = 1e-9;
// Lamp: a 6 V, 0.3 A bulb (20 Ω, full brightness at 1.8 W).
const LAMP_OHMS = 20, LAMP_WATTS = 1.8, MOTOR_OHMS = 10, BUZZER_OHMS = 400;
const VBE = 0.7, RBE = 100, VCE_SAT = 0.2, RCE_SAT = 1;
export const LED_BURN_AMPS = 0.06;
export const SHORT_AMPS = 5;

export const node = (x: number, y: number) => `${x},${y}`;

/** Where the base of an NPN transistor sits: two grid units beside the middle of the collector→emitter
 *  line (to the left when the collector is at the top). */
export function basePoint(e: SimElement) {
  const dx = e.x2 - e.x1, dy = e.y2 - e.y1, len = Math.hypot(dx, dy) || 1;
  return { x: Math.round((e.x1 + e.x2) / 2 - (dy / len) * 2), y: Math.round((e.y1 + e.y2) / 2 + (dx / len) * 2) };
}

export function terminals(e: SimElement): string[] {
  if (e.kind === "ground") return [node(e.x1, e.y1)];
  if (e.kind === "npn") { const b = basePoint(e); return [node(e.x1, e.y1), node(e.x2, e.y2), node(b.x, b.y)]; }
  return [node(e.x1, e.y1), node(e.x2, e.y2)];
}

export type ElementReading = {
  /** Current from the first terminal to the second (collector→emitter for an NPN). */
  current: number;
  voltage: number;
  power: number;
  /** 0..1 for LEDs, lamps, motors and buzzers. */
  level?: number;
  burnt?: boolean;
  /** NPN only. */
  base?: number;
  state?: "off" | "on" | "active" | "saturated";
};

export type SimState = {
  time: number;
  capVolts: Map<string, number>;
  /** Burnt-out LEDs and the current that destroyed them; they stay open circuits until reset. */
  burnt: Map<string, number>;
  /** Last conduction state of each nonlinear element, as a starting guess for the next step. */
  conducting: Map<string, string>;
};

export type StepResult = {
  ok: boolean;
  voltages: Map<string, number>;
  readings: Map<string, ElementReading>;
  warnings: string[];
};

export function createState(): SimState {
  return { time: 0, capVolts: new Map(), burnt: new Map(), conducting: new Map() };
}

function solve(a: Float64Array[], b: Float64Array) {
  const n = b.length;
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++) if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) pivot = row;
    if (Math.abs(a[pivot][col]) < 1e-20) return null;
    if (pivot !== col) { [a[col], a[pivot]] = [a[pivot], a[col]]; const t = b[col]; b[col] = b[pivot]; b[pivot] = t; }
    const rowC = a[col];
    for (let row = col + 1; row < n; row++) {
      const factor = a[row][col] / rowC[col];
      if (factor === 0) continue;
      const r = a[row];
      for (let k = col; k < n; k++) r[k] -= factor * rowC[k];
      b[row] -= factor * b[col];
    }
  }
  const x = new Float64Array(n);
  for (let row = n - 1; row >= 0; row--) {
    let sum = b[row];
    for (let k = row + 1; k < n; k++) sum -= a[row][k] * x[k];
    x[row] = sum / a[row][row];
  }
  return x;
}

type Branch = { a: string; b: string; g: number; e: number };

/**
 * Advances the circuit by `dt` seconds. `pressed` holds the ids of push buttons being held.
 * Pass dt = 0 for a DC operating point (capacitors then behave as open circuits).
 */
export function step(elements: SimElement[], state: SimState, dt: number, pressed: ReadonlySet<string> = new Set()): StepResult {
  const warnings: string[] = [];
  const readings = new Map<string, ElementReading>();
  if (!elements.length) return { ok: true, voltages: new Map(), readings, warnings };

  // Ground: every ground symbol's node, else the first battery's − terminal, else the first node.
  const grounds = new Set(elements.filter((e) => e.kind === "ground").map((e) => node(e.x1, e.y1)));
  const source = elements.find((e) => e.kind === "battery" || e.kind === "ac");
  if (!grounds.size) grounds.add(source ? node(source.x1, source.y1) : terminals(elements[0])[0]);
  const all = [...new Set(elements.flatMap(terminals))];
  const unknowns = all.filter((n) => !grounds.has(n));
  const index = new Map(unknowns.map((n, i) => [n, i]));
  const t = state.time + dt;

  const fixed: Branch[] = [];
  const nonlinear = elements.filter((e) => (e.kind === "led" || e.kind === "diode" || e.kind === "npn") && !state.burnt.has(e.id));
  for (const e of elements) {
    const [a, b] = terminals(e);
    switch (e.kind) {
      case "wire": case "ammeter": fixed.push({ a, b, g: WIRE_G, e: 0 }); break;
      case "battery": fixed.push({ a, b, g: 1 / SOURCE_R, e: -(e.value ?? 9) }); break;
      case "ac": fixed.push({ a, b, g: 1 / SOURCE_R, e: -(e.value ?? 6) * Math.sin(2 * Math.PI * (e.freq ?? 50) * t) }); break;
      case "resistor": fixed.push({ a, b, g: 1 / Math.max(0.01, e.value ?? 1000), e: 0 }); break;
      case "lamp": fixed.push({ a, b, g: 1 / LAMP_OHMS, e: 0 }); break;
      case "motor": fixed.push({ a, b, g: 1 / MOTOR_OHMS, e: 0 }); break;
      case "buzzer": fixed.push({ a, b, g: 1 / BUZZER_OHMS, e: 0 }); break;
      case "voltmeter": fixed.push({ a, b, g: 1e-7, e: 0 }); break;
      case "switch": fixed.push({ a, b, g: e.closed ? WIRE_G : OPEN_G, e: 0 }); break;
      case "button": fixed.push({ a, b, g: pressed.has(e.id) ? WIRE_G : OPEN_G, e: 0 }); break;
      case "capacitor": {
        const c = Math.max(1e-12, e.value ?? 100e-6);
        if (dt > 0) fixed.push({ a, b, g: c / dt, e: state.capVolts.get(e.id) ?? 0 });
        else fixed.push({ a, b, g: OPEN_G, e: 0 });
        break;
      }
      case "led": case "diode": if (state.burnt.has(e.id)) fixed.push({ a, b, g: OPEN_G, e: 0 }); break;
      case "npn": break;
      case "ground": break;
    }
  }

  // Piecewise-linear devices: guess each one's state, solve, correct, repeat until consistent.
  const mode = new Map(nonlinear.map((e) => [e.id, state.conducting.get(e.id) ?? "off"]));
  let x: Float64Array | null = null;
  const v = (n: string) => (grounds.has(n) ? 0 : x ? x[index.get(n)!] : 0);
  for (let iteration = 0; iteration < 40; iteration++) {
    const n = unknowns.length;
    const A = Array.from({ length: n }, () => new Float64Array(n));
    const B = new Float64Array(n);
    for (let i = 0; i < n; i++) A[i][i] += LEAK_G;
    const stamp = ({ a, b, g, e }: Branch) => {
      const ia = index.get(a), ib = index.get(b);
      if (ia !== undefined) { A[ia][ia] += g; B[ia] += g * e; }
      if (ib !== undefined) { A[ib][ib] += g; B[ib] -= g * e; }
      if (ia !== undefined && ib !== undefined) { A[ia][ib] -= g; A[ib][ia] -= g; }
    };
    fixed.forEach(stamp);
    for (const e of nonlinear) {
      const m = mode.get(e.id)!;
      const [c, em, base] = terminals(e);
      if (e.kind === "led" || e.kind === "diode") {
        stamp(m === "on" ? { a: c, b: em, g: 1 / (e.kind === "led" ? LED_RS : DIODE_RS), e: e.kind === "led" ? LED_VF[e.colour ?? "red"] : DIODE_VF } : { a: c, b: em, g: OPEN_G, e: 0 });
        continue;
      }
      // NPN: base-emitter diode, then the collector branch.
      const gbe = 1 / RBE, beta = e.value ?? 100;
      if (m === "off") { stamp({ a: base, b: em, g: OPEN_G, e: 0 }); stamp({ a: c, b: em, g: OPEN_G, e: 0 }); continue; }
      stamp({ a: base, b: em, g: gbe, e: VBE });
      if (m === "saturated") { stamp({ a: c, b: em, g: 1 / RCE_SAT, e: VCE_SAT }); continue; }
      // Active: Ic = β·gbe·(Vb − Ve − VBE), flowing from collector to emitter.
      const gm = beta * gbe;
      const ic = index.get(c), ie = index.get(em), ibx = index.get(base);
      const put = (row: number | undefined, col: number | undefined, value: number) => { if (row !== undefined && col !== undefined) A[row][col] += value; };
      put(ic, ibx, gm); put(ic, ie, -gm); if (ic !== undefined) B[ic] += gm * VBE;
      put(ie, ibx, -gm); put(ie, ie, gm); if (ie !== undefined) B[ie] -= gm * VBE;
      stamp({ a: c, b: em, g: OPEN_G, e: 0 });
    }
    x = solve(A, B);
    if (!x) break;
    let changed = false;
    for (const e of nonlinear) {
      const m = mode.get(e.id)!;
      const [c, em, base] = terminals(e);
      let next = m;
      if (e.kind === "led" || e.kind === "diode") {
        const vf = e.kind === "led" ? LED_VF[e.colour ?? "red"] : DIODE_VF;
        const drop = v(c) - v(em);
        if (m === "off" && drop > vf + 1e-6) next = "on";
        else if (m === "on" && drop < vf - 1e-6) next = "off";
      } else {
        const vbe = v(base) - v(em), vce = v(c) - v(em), ib = (vbe - VBE) / RBE;
        if (m === "off") { if (vbe > VBE + 1e-6) next = "active"; }
        else if (ib < -1e-9) next = "off";
        else if (m === "active" && vce < VCE_SAT - 1e-6) next = "saturated";
        else if (m === "saturated" && (vce - VCE_SAT) / RCE_SAT > (e.value ?? 100) * ib) next = "active";
      }
      if (next !== m) { mode.set(e.id, next); changed = true; }
    }
    if (!changed) break;
  }
  if (!x) return { ok: false, voltages: new Map(), readings, warnings: ["This circuit cannot be solved. A loop made only of batteries and wires is the usual cause."] };

  const voltages = new Map(all.map((n) => [n, Math.abs(v(n)) < 1e-9 ? 0 : v(n)]));
  const branchCurrent = (a: string, b: string, g: number, emf: number) => g * (v(a) - v(b) - emf);
  for (const e of elements) {
    const [a, b, base] = terminals(e);
    const voltage = e.kind === "ground" ? 0 : v(a) - v(b);
    let current = 0;
    const reading: ElementReading = { current: 0, voltage, power: 0 };
    switch (e.kind) {
      case "wire": case "ammeter": current = branchCurrent(a, b, WIRE_G, 0); break;
      case "battery": current = branchCurrent(a, b, 1 / SOURCE_R, -(e.value ?? 9)); break;
      case "ac": current = branchCurrent(a, b, 1 / SOURCE_R, -(e.value ?? 6) * Math.sin(2 * Math.PI * (e.freq ?? 50) * t)); break;
      case "resistor": current = voltage / Math.max(0.01, e.value ?? 1000); break;
      case "lamp": current = voltage / LAMP_OHMS; reading.level = Math.min(1, (voltage * current) / LAMP_WATTS); break;
      case "motor": current = voltage / MOTOR_OHMS; reading.level = Math.min(1, Math.abs(current) / 0.5) * Math.sign(current); break;
      case "buzzer": current = voltage / BUZZER_OHMS; reading.level = current > 0.004 ? Math.min(1, current / 0.02) : 0; break;
      case "voltmeter": current = voltage * 1e-7; break;
      case "switch": current = branchCurrent(a, b, e.closed ? WIRE_G : OPEN_G, 0); break;
      case "button": current = branchCurrent(a, b, pressed.has(e.id) ? WIRE_G : OPEN_G, 0); break;
      case "capacitor": {
        const c = Math.max(1e-12, e.value ?? 100e-6);
        current = dt > 0 ? (c / dt) * (voltage - (state.capVolts.get(e.id) ?? 0)) : 0;
        if (dt > 0) state.capVolts.set(e.id, voltage);
        break;
      }
      case "led": case "diode": {
        if (state.burnt.has(e.id)) {
          reading.burnt = true;
          warnings.push(`An LED burnt out at ${(state.burnt.get(e.id)! * 1000).toFixed(0)} mA. LEDs need a series resistor to keep the current near 10–20 mA. Fix the circuit, then press Reset to fit a new LED.`);
          break;
        }
        const on = mode.get(e.id) === "on";
        const vf = e.kind === "led" ? LED_VF[e.colour ?? "red"] : DIODE_VF;
        current = on ? (voltage - vf) / (e.kind === "led" ? LED_RS : DIODE_RS) : 0;
        if (e.kind === "led") {
          reading.level = Math.min(1, Math.max(0, current) / 0.015);
          if (current > LED_BURN_AMPS) {
            state.burnt.set(e.id, current);
            reading.burnt = true;
            warnings.push(`An LED burnt out at ${(current * 1000).toFixed(0)} mA. LEDs need a series resistor to keep the current near 10–20 mA. Fix the circuit, then press Reset to fit a new LED.`);
          }
        }
        break;
      }
      case "npn": {
        const m = mode.get(e.id) ?? "off";
        const ib = m === "off" ? 0 : Math.max(0, (v(base) - v(b) - VBE) / RBE);
        current = m === "off" ? 0 : m === "saturated" ? (voltage - VCE_SAT) / RCE_SAT : (e.value ?? 100) * ib;
        reading.base = ib;
        reading.state = m === "off" ? "off" : (m as "active" | "saturated");
        break;
      }
      case "ground": break;
    }
    if (e.kind === "led" || e.kind === "diode") reading.state = mode.get(e.id) === "on" && !reading.burnt ? "on" : "off";
    reading.current = Math.abs(current) < 1e-12 ? 0 : current;
    reading.power = Math.abs(voltage * current);
    readings.set(e.id, reading);
    if ((e.kind === "battery" || e.kind === "ac") && Math.abs(current) > SHORT_AMPS) warnings.push(`Short circuit: the source is delivering ${Math.abs(current).toFixed(0)} A. Real wires and batteries would overheat.`);
    if (e.kind === "resistor" && reading.power > 0.5) warnings.push(`A resistor is dissipating ${reading.power.toFixed(2)} W: an ordinary ¼ W resistor would overheat.`);
  }
  for (const e of nonlinear) state.conducting.set(e.id, mode.get(e.id)!);
  state.time = t;
  return { ok: true, voltages, readings, warnings: [...new Set(warnings)] };
}

/** True if the circuit changes over time, so it must be stepped continuously. */
export function isDynamic(elements: SimElement[]) {
  return elements.some((e) => e.kind === "capacitor" || e.kind === "ac");
}

/** Engineering formatting: 0.0123 A → "12.3 mA". */
export function si(value: number, unit: string) {
  const abs = Math.abs(value);
  if (abs === 0) return `0 ${unit}`;
  const [scale, prefix] = abs >= 1e6 ? [1e6, "M"] : abs >= 1e3 ? [1e3, "k"] : abs >= 1 ? [1, ""] : abs >= 1e-3 ? [1e-3, "m"] : abs >= 1e-6 ? [1e-6, "µ"] : [1e-9, "n"];
  const scaled = value / scale;
  return `${Math.abs(scaled) >= 100 ? scaled.toFixed(0) : Math.abs(scaled) >= 10 ? scaled.toFixed(1) : scaled.toFixed(2)} ${prefix}${unit}`;
}
