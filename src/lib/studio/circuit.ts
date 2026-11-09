// Maker Studio circuit model: nets from wires, then per-frame part behaviour from the emulated board.
// Pure functions so the whole electrical model is unit-testable without a browser.
import { LED_COLOURS, PART_BY_TYPE, isGround, type LedColour, type PartType } from "@/lib/studio/parts";

export type PlacedPart = { id: string; type: PartType; x: number; y: number; props: Record<string, string | number | boolean> };
export type StudioWire = { id: string; a: string; b: string; colour: string };
export type StudioDoc = { version: 1; parts: PlacedPart[]; wires: StudioWire[]; code: string };

export type PinMode = "output" | "input" | "pullup";
export type BoardSnapshot = { duty: number[]; mode: PinMode[]; freq: number[]; pulseUs: number[] };
export const IDLE_BOARD: BoardSnapshot = { duty: Array(14).fill(0), mode: Array(14).fill("input"), freq: Array(14).fill(0), pulseUs: Array(14).fill(0) };

export type Warning = { level: "error" | "warning" | "info"; message: string; partId?: string };

const unoEndpoint = (pin: string) => `uno:${isGround(pin) ? "GND" : pin}`;
const normalize = (endpoint: string) => endpoint.startsWith("uno:") ? unoEndpoint(endpoint.slice(4)) : endpoint;
const pinIndex = (pin: string) => Number(pin.slice(1));

// ---------- Nets ----------

export type Nets = {
  of: (endpoint: string) => string;
  info: Map<string, { pins: string[]; gnd: boolean; v5: boolean; v33: boolean }>;
  resistors: { id: string; a: string; b: string; ohms: number }[];
};

export function buildNets(doc: Pick<StudioDoc, "parts" | "wires">, pressed: ReadonlySet<string> = new Set()): Nets {
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    let root = parent.get(x) ?? x;
    if (root !== x) { root = find(root); parent.set(x, root); }
    return root;
  };
  const union = (a: string, b: string) => { const ra = find(a), rb = find(b); if (ra !== rb) parent.set(ra, rb); };

  for (const wire of doc.wires) union(normalize(wire.a), normalize(wire.b));
  for (const part of doc.parts) {
    if (part.type === "button" && pressed.has(part.id)) union(`${part.id}:a`, `${part.id}:b`);
    if (part.type === "switch") union(`${part.id}:common`, `${part.id}:${part.props.position === "b" ? "b" : "a"}`);
    if (part.type === "seven-segment") union(`${part.id}:common`, `${part.id}:common2`);
    if (part.type === "tilt-switch" && !part.props.tilted) union(`${part.id}:a`, `${part.id}:b`);   // the ball joins the legs while upright
  }

  const info: Nets["info"] = new Map();
  const touch = (endpoint: string) => {
    const root = find(endpoint);
    if (!info.has(root)) info.set(root, { pins: [], gnd: false, v5: false, v33: false });
    return info.get(root)!;
  };
  const unoPins = new Set(doc.wires.flatMap((w) => [w.a, w.b]).filter((e) => e.startsWith("uno:")).map(normalize));
  for (const endpoint of unoPins) {
    const net = touch(endpoint);
    const pin = endpoint.slice(4);
    if (pin === "GND") net.gnd = true;
    else if (pin === "5V") net.v5 = true;
    else if (pin === "3V3") net.v33 = true;
    else net.pins.push(pin);
  }
  const resistors = doc.parts.filter((p) => p.type === "resistor").map((p) => ({ id: p.id, a: find(`${p.id}:a`), b: find(`${p.id}:b`), ohms: Number(p.props.ohms ?? 220) }));
  return { of: (endpoint) => find(normalize(endpoint)), info, resistors };
}

// ---------- Electrical helpers ----------

type Source = { volts: number; duty: number; pin?: string; rail?: "5V" | "3V3" | "GND" };

/** What drives a net: a power rail or an Arduino pin configured as OUTPUT. */
function netSource(nets: Nets, net: string, board: BoardSnapshot): Source | null {
  const info = nets.info.get(net);
  if (!info) return null;
  if (info.gnd) return { volts: 0, duty: 0, rail: "GND" };
  if (info.v5) return { volts: 5, duty: 1, rail: "5V" };
  if (info.v33) return { volts: 3.3, duty: 1, rail: "3V3" };
  const output = info.pins.find((pin) => pin.startsWith("D") && board.mode[pinIndex(pin)] === "output");
  return output ? { volts: 5, duty: board.duty[pinIndex(output)], pin: output } : null;
}

/** Lowest-resistance route from a net, through resistors, to a net matching `accept`. */
function routeTo(nets: Nets, start: string, accept: (net: string) => boolean): { net: string; ohms: number } | null {
  const best = new Map<string, number>([[start, 0]]);
  const queue: string[] = [start];
  let found: { net: string; ohms: number } | null = null;
  while (queue.length) {
    queue.sort((x, y) => best.get(x)! - best.get(y)!);
    const net = queue.shift()!;
    const ohms = best.get(net)!;
    if (accept(net)) { if (!found || ohms < found.ohms) found = { net, ohms }; continue; }
    for (const r of nets.resistors) {
      const next = r.a === net ? r.b : r.b === net ? r.a : null;
      if (next === null || next === net) continue;
      const total = ohms + r.ohms;
      if (total < (best.get(next) ?? Infinity)) { best.set(next, total); queue.push(next); }
    }
  }
  return found;
}

const isRail = (nets: Nets, net: string, rail: "gnd" | "v5") => Boolean(nets.info.get(net)?.[rail]);

function powered(nets: Nets, partId: string) {
  return (isRail(nets, nets.of(`${partId}:vcc`), "v5") || Boolean(nets.info.get(nets.of(`${partId}:vcc`))?.v33)) && isRail(nets, nets.of(`${partId}:gnd`), "gnd");
}

// Sensor modules with a comparator output: which pin they drive, the prop that triggers them,
// and whether the output goes LOW (most IR and flame modules) or HIGH when triggered.
const DIGITAL_MODULES: Partial<Record<PartType, { pin: string; prop: string; activeLow: boolean }>> = {
  "ir-obstacle": { pin: "out", prop: "obstacle", activeLow: true },
  "line-sensor": { pin: "do", prop: "black", activeLow: false },
  "flame-sensor": { pin: "do", prop: "flame", activeLow: true },
  "sound-sensor": { pin: "do", prop: "loud", activeLow: false },
  "hall-sensor": { pin: "s", prop: "magnet", activeLow: true },
};
// Analog modules: output voltage as a fraction of their supply.
const ANALOG_MODULES: Partial<Record<PartType, { pin: string; fraction: (props: PlacedPart["props"]) => number }>> = {
  "soil-moisture": { pin: "aout", fraction: (p) => 0.82 - 0.56 * Number(p.moisture ?? 0.3) },   // wetter = lower
  "gas-sensor": { pin: "ao", fraction: (p) => 0.06 + 0.84 * Number(p.gas ?? 0.1) },
};

function supplyVolts(nets: Nets, partId: string) {
  return nets.info.get(nets.of(`${partId}:vcc`))?.v5 ? 5 : 3.3;
}

function attached(doc: Pick<StudioDoc, "wires">, partId: string) {
  return doc.wires.some((w) => w.a.startsWith(`${partId}:`) || w.b.startsWith(`${partId}:`));
}

// ---------- Per-frame simulation ----------

export type PartView = {
  brightness?: number;
  colour?: string;
  channels?: { r: number; g: number; b: number };
  segments?: Record<string, number>;
  frequency?: number;
  angle?: number;
  speed?: number;
  direction?: -1 | 0 | 1;
  burnt?: boolean;
  powered?: boolean;
};

export type UltrasonicLink = { partId: string; trigPin: number; echoPin: number; distanceCm: number };

export type SimResult = {
  views: Record<string, PartView>;
  digitalInputs: Record<number, boolean>;
  analogVolts: number[];
  ultrasonic: UltrasonicLink[];
  warnings: Warning[];
  burnt: string[];
};

/**
 * Computes what every part does for the current board state, and what the board's inputs see.
 * `previous` carries state that persists between frames (servo angle, burnt LEDs).
 */
export function simulate(doc: Pick<StudioDoc, "parts" | "wires">, nets: Nets, board: BoardSnapshot, previous: { angles: Record<string, number>; burnt: ReadonlySet<string> } = { angles: {}, burnt: new Set() }): SimResult {
  const views: Record<string, PartView> = {};
  const warnings: Warning[] = [];
  const burnt = new Set(previous.burnt);
  const digitalInputs: Record<number, boolean> = {};
  const analogVolts = [0, 0, 0, 0, 0, 0];
  const ultrasonic: UltrasonicLink[] = [];
  const name = (partId: string) => PART_BY_TYPE[doc.parts.find((p) => p.id === partId)!.type].name;

  // Net-level problems: shorts and fighting outputs.
  for (const [, info] of nets.info) {
    const outputs = info.pins.filter((pin) => pin.startsWith("D") && board.mode[pinIndex(pin)] === "output");
    if (info.gnd && (info.v5 || info.v33)) warnings.push({ level: "error", message: "Short circuit: 5V is wired straight to GND. A real board would reset or be damaged." });
    if (outputs.length > 1) warnings.push({ level: "error", message: `${outputs.join(" and ")} are both outputs on the same wire. If one goes HIGH while the other is LOW, it is a short circuit.` });
    for (const pin of outputs) {
      if (info.gnd && board.duty[pinIndex(pin)] > 0.01) warnings.push({ level: "error", message: `${pin} is driven HIGH but wired directly to GND: a short circuit through the pin.` });
      if ((info.v5 || info.v33) && board.duty[pinIndex(pin)] < 0.99) warnings.push({ level: "error", message: `${pin} is driven LOW but wired directly to 5V: a short circuit through the pin.` });
    }
  }

  // Analog voltages produced by parts, by net.
  const netVolts = new Map<string, number>();
  const digitalDrive = new Map<string, boolean>();
  const railVolts = (net: string) => { const i = nets.info.get(net); return i?.v5 ? 5 : i?.v33 ? 3.3 : i?.gnd ? 0 : undefined; };

  for (const part of doc.parts) {
    const p = part.props;
    switch (part.type) {
      case "potentiometer": {
        const v1 = railVolts(nets.of(`${part.id}:end1`)), v2 = railVolts(nets.of(`${part.id}:end2`));
        if (v1 !== undefined && v2 !== undefined) netVolts.set(nets.of(`${part.id}:wiper`), v1 + Number(p.position ?? 0.5) * (v2 - v1));
        else if (attached(doc, part.id)) warnings.push({ level: "warning", partId: part.id, message: "Potentiometer: connect one end to GND and the other to 5V, then read the middle pin (W)." });
        break;
      }
      case "light-sensor":
      case "temp-sensor":
      case "pir": {
        const isPowered = powered(nets, part.id);
        views[part.id] = { powered: isPowered };
        if (!isPowered) { if (attached(doc, part.id)) warnings.push({ level: "warning", partId: part.id, message: `${name(part.id)} has no power: wire VCC to 5V and GND to GND.` }); break; }
        if (part.type === "light-sensor") netVolts.set(nets.of(`${part.id}:ao`), 5 * Number(p.light ?? 0.6));
        if (part.type === "temp-sensor") netVolts.set(nets.of(`${part.id}:out`), Math.max(0, 0.5 + Number(p.celsius ?? 24) * 0.01));
        if (part.type === "pir") { const out = nets.of(`${part.id}:out`); digitalDrive.set(out, Boolean(p.motion)); netVolts.set(out, p.motion ? 5 : 0); }
        break;
      }
      case "ir-obstacle": case "line-sensor": case "flame-sensor": case "sound-sensor": case "hall-sensor":
      case "soil-moisture": case "gas-sensor": case "joystick": {
        const isPowered = powered(nets, part.id);
        views[part.id] = { powered: isPowered };
        if (!isPowered) { if (attached(doc, part.id)) warnings.push({ level: "warning", partId: part.id, message: `${name(part.id)} has no power: wire VCC to 5V and GND to GND.` }); break; }
        const supply = supplyVolts(nets, part.id);
        const digital = DIGITAL_MODULES[part.type], analog = ANALOG_MODULES[part.type];
        if (digital) {
          const out = nets.of(`${part.id}:${digital.pin}`);
          const level = Boolean(p[digital.prop]) !== digital.activeLow;
          digitalDrive.set(out, level);
          netVolts.set(out, level ? supply : 0);
        }
        if (analog) netVolts.set(nets.of(`${part.id}:${analog.pin}`), supply * Math.max(0, Math.min(1, analog.fraction(p))));
        if (part.type === "joystick") {
          netVolts.set(nets.of(`${part.id}:vrx`), supply * Number(p.x ?? 0.5));
          netVolts.set(nets.of(`${part.id}:vry`), supply * Number(p.y ?? 0.5));
          if (p.pressed) { const sw = nets.of(`${part.id}:sw`); digitalDrive.set(sw, false); netVolts.set(sw, 0); }   // the switch pulls SW to GND
        }
        break;
      }
      case "ultrasonic": {
        const isPowered = powered(nets, part.id);
        views[part.id] = { powered: isPowered };
        const trig = nets.info.get(nets.of(`${part.id}:trig`))?.pins.find((pin) => pin.startsWith("D"));
        const echo = nets.info.get(nets.of(`${part.id}:echo`))?.pins.find((pin) => pin.startsWith("D"));
        if (!isPowered) { if (attached(doc, part.id)) warnings.push({ level: "warning", partId: part.id, message: "HC-SR04 has no power: wire VCC to 5V and GND to GND." }); break; }
        if (trig && echo) ultrasonic.push({ partId: part.id, trigPin: pinIndex(trig), echoPin: pinIndex(echo), distanceCm: Number(p.distance ?? 60) });
        else warnings.push({ level: "info", partId: part.id, message: "HC-SR04: wire TRIG and ECHO to two digital pins." });
        break;
      }
    }
  }

  // Board inputs.
  for (let index = 2; index < 14; index++) {
    if (board.mode[index] === "output") continue;
    const net = nets.of(`uno:D${index}`);
    if (!nets.info.has(net)) { digitalInputs[index] = board.mode[index] === "pullup"; continue; }
    const rail = railVolts(net);
    const other = netSource(nets, net, board);
    let level: boolean | null = rail !== undefined ? rail > 1.5 : digitalDrive.has(net) ? digitalDrive.get(net)! : other?.pin && other.pin !== `D${index}` ? other.duty > 0.5 : null;
    if (level === null) {
      const pull = routeTo(nets, net, (n) => railVolts(n) !== undefined);
      if (pull && pull.ohms > 0) level = railVolts(pull.net)! > 1.5;
    }
    if (level === null) {
      level = board.mode[index] === "pullup";
      const usedByButton = doc.parts.some((part) => (part.type === "button" || part.type === "switch") && ["a", "b", "common"].some((pin) => nets.of(`${part.id}:${pin}`) === net));
      if (board.mode[index] === "input" && usedByButton) warnings.push({ level: "warning", message: `D${index} is floating while the button is released: use INPUT_PULLUP, or add a 10 kΩ pull-down resistor to GND.` });
    }
    digitalInputs[index] = level;
  }
  // ECHO pins are driven with microsecond timing by the emulator, never by the per-frame inputs.
  for (const link of ultrasonic) delete digitalInputs[link.echoPin];
  for (let channel = 0; channel < 6; channel++) {
    const net = nets.of(`uno:A${channel}`);
    const rail = railVolts(net);
    analogVolts[channel] = rail ?? netVolts.get(net) ?? 0;
  }

  // Outputs.
  const driver = (n: string) => { const s = netSource(nets, n, board); return Boolean(s && s.rail !== "GND"); };
  const sink = (n: string) => { const s = netSource(nets, n, board); return Boolean(s && (s.rail === "GND" || s.pin)); };
  const ledLevel = (anodeNet: string, cathodeNet: string, vf: number, id: string, label: string) => {
    const up = routeTo(nets, anodeNet, driver);
    const down = routeTo(nets, cathodeNet, sink);
    if (!up || !down) {
      if (routeTo(nets, anodeNet, (n) => isRail(nets, n, "gnd")) && routeTo(nets, cathodeNet, driver)) warnings.push({ level: "warning", partId: id, message: `${label} looks reversed: + (anode, long leg) goes towards the pin or 5V, − towards GND.` });
      else if (up && !down) warnings.push({ level: "warning", partId: id, message: `${label}: connect − to GND so current can flow.` });
      return 0;
    }
    const src = netSource(nets, up.net, board)!, snk = netSource(nets, down.net, board)!;
    const on = src.duty * (snk.rail === "GND" ? 1 : 1 - snk.duty);
    const ohms = up.ohms + down.ohms;
    if (on <= 0.001 || src.volts <= vf) return 0;
    if (ohms < 1) {
      burnt.add(id);
      return 0;
    }
    const current = (src.volts - vf) / (ohms + 15);
    if (current > 0.025) warnings.push({ level: "warning", partId: id, message: `${label} current is ${(current * 1000).toFixed(0)} mA, above the 20 mA safe limit. Use a 220 Ω resistor or larger.` });
    return Math.min(1, current / 0.012) * on;
  };

  for (const part of doc.parts) {
    const p = part.props;
    switch (part.type) {
      case "led": {
        const requested = String(p.colour ?? "red");
        const colour = (requested in LED_COLOURS ? requested : "red") as LedColour;
        if (burnt.has(part.id)) { views[part.id] = { burnt: true, brightness: 0, colour: LED_COLOURS[colour].hex }; break; }
        const brightness = ledLevel(nets.of(`${part.id}:anode`), nets.of(`${part.id}:cathode`), LED_COLOURS[colour].vf, part.id, "LED");
        views[part.id] = burnt.has(part.id) ? { burnt: true, brightness: 0, colour: LED_COLOURS[colour].hex } : { brightness, colour: LED_COLOURS[colour].hex };
        break;
      }
      case "rgb-led": {
        if (burnt.has(part.id)) { views[part.id] = { burnt: true, channels: { r: 0, g: 0, b: 0 } }; break; }
        const common = nets.of(`${part.id}:common`);
        const channels = { r: ledLevel(nets.of(`${part.id}:r`), common, 2.0, part.id, "RGB LED red"), g: ledLevel(nets.of(`${part.id}:g`), common, 3.0, part.id, "RGB LED green"), b: ledLevel(nets.of(`${part.id}:b`), common, 3.0, part.id, "RGB LED blue") };
        views[part.id] = burnt.has(part.id) ? { burnt: true, channels: { r: 0, g: 0, b: 0 } } : { channels };
        break;
      }
      case "seven-segment": {
        const grounded = isRail(nets, nets.of(`${part.id}:common`), "gnd");
        const segments: Record<string, number> = {};
        for (const seg of ["a", "b", "c", "d", "e", "f", "g", "dp"]) {
          const src = netSource(nets, nets.of(`${part.id}:${seg}`), board);
          segments[seg] = grounded && src && src.rail !== "GND" ? src.duty : 0;
        }
        if (!grounded && attached(doc, part.id)) warnings.push({ level: "warning", partId: part.id, message: "7-segment display: connect a − pin to GND." });
        views[part.id] = { segments };
        break;
      }
      case "buzzer": {
        const src = netSource(nets, nets.of(`${part.id}:plus`), board);
        const grounded = isRail(nets, nets.of(`${part.id}:minus`), "gnd");
        const frequency = src?.pin && grounded ? board.freq[pinIndex(src.pin)] : 0;
        views[part.id] = { frequency: frequency > 20 ? frequency : 0 };
        break;
      }
      case "active-buzzer": {
        const src = netSource(nets, nets.of(`${part.id}:plus`), board);
        const on = Boolean(src && src.rail !== "GND" && src.duty > 0.3) && isRail(nets, nets.of(`${part.id}:minus`), "gnd");
        views[part.id] = { frequency: on ? 2300 : 0 };
        break;
      }
      case "traffic-light": {
        const grounded = isRail(nets, nets.of(`${part.id}:gnd`), "gnd");
        const level = (pin: string) => { const s = netSource(nets, nets.of(`${part.id}:${pin}`), board); return grounded && s && s.rail !== "GND" ? s.duty : 0; };
        if (!grounded && attached(doc, part.id)) warnings.push({ level: "warning", partId: part.id, message: "Traffic-light module: connect GND to GND." });
        views[part.id] = { segments: { r: level("r"), y: level("y"), g: level("g") } };
        break;
      }
      case "vibration-motor": {
        const isPowered = powered(nets, part.id);
        const src = netSource(nets, nets.of(`${part.id}:in`), board);
        if (!isPowered && attached(doc, part.id)) warnings.push({ level: "warning", partId: part.id, message: "Vibration motor has no power: VCC to 5V and GND to GND." });
        views[part.id] = { powered: isPowered, speed: isPowered && src && src.rail !== "GND" ? src.duty : 0 };
        break;
      }
      case "relay": {
        const isPowered = powered(nets, part.id);
        const inNet = nets.of(`${part.id}:in`);
        const src = netSource(nets, inNet, board);
        // Active-LOW module: the coil energises when IN is pulled LOW; an unconnected IN stays off.
        const on = isPowered && Boolean(src && (src.rail === "GND" || (src.pin && src.duty < 0.5)));
        if (!isPowered && attached(doc, part.id)) warnings.push({ level: "warning", partId: part.id, message: "Relay module has no power: VCC to 5V and GND to GND." });
        views[part.id] = { powered: isPowered, direction: on ? 1 : 0 };
        break;
      }
      case "servo": {
        const isPowered = powered(nets, part.id);
        const src = netSource(nets, nets.of(`${part.id}:signal`), board);
        const pulse = src?.pin ? board.pulseUs[pinIndex(src.pin)] : 0;
        let angle = previous.angles[part.id] ?? 90;
        if (isPowered && pulse > 400 && pulse < 2700) angle = Math.round(Math.min(180, Math.max(0, ((pulse - 544) / (2400 - 544)) * 180)));
        if (!isPowered && attached(doc, part.id)) warnings.push({ level: "warning", partId: part.id, message: "Servo has no power: V+ to 5V and GND to GND." });
        views[part.id] = { angle, powered: isPowered };
        break;
      }
      case "motor-driver": {
        const isPowered = powered(nets, part.id);
        const level = (pin: string) => { const s = netSource(nets, nets.of(`${part.id}:${pin}`), board); return s ? s.duty : null; };
        const in1 = (level("in1") ?? 0) > 0.5, in2 = (level("in2") ?? 0) > 0.5;
        const en = level("en");
        if (en === null && attached(doc, part.id)) warnings.push({ level: "info", partId: part.id, message: "Motor driver: EN sets the speed. Wire it to a PWM pin (~) or to 5V for full speed." });
        const direction: -1 | 0 | 1 = in1 && !in2 ? 1 : !in1 && in2 ? -1 : 0;
        views[part.id] = { powered: isPowered, direction, speed: isPowered && direction ? en ?? 0 : 0 };
        if (!isPowered && attached(doc, part.id)) warnings.push({ level: "warning", partId: part.id, message: "Motor driver has no power: VCC to 5V and GND to GND." });
        break;
      }
    }
  }

  for (const id of burnt) {
    const label = doc.parts.find((p) => p.id === id)?.type === "rgb-led" ? "An RGB LED" : "An LED";
    warnings.unshift({ level: "error", partId: id, message: `${label} burnt out: it was connected without a current-limiting resistor. Add a 220 Ω resistor in series, then press Run again to fit a new one.` });
  }
  return { views, digitalInputs, analogVolts, ultrasonic, warnings: dedupe(warnings), burnt: [...burnt] };
}

function dedupe(warnings: Warning[]) {
  const seen = new Set<string>();
  return warnings.filter((w) => !seen.has(w.message) && seen.add(w.message));
}

/** Arduino pins wired to each part pin, for the inspector and the starter-code generator. */
export function connectionsOf(doc: Pick<StudioDoc, "parts" | "wires">, nets: Nets, partId: string) {
  const part = doc.parts.find((p) => p.id === partId);
  if (!part) return {};
  return Object.fromEntries(PART_BY_TYPE[part.type].pins.map((pin) => {
    const info = nets.info.get(nets.of(`${partId}:${pin.id}`));
    const direct = info ? [...info.pins, ...(info.gnd ? ["GND"] : []), ...(info.v5 ? ["5V"] : []), ...(info.v33 ? ["3V3"] : [])] : [];
    let via = "";
    if (!direct.length) {
      const route = routeTo(nets, nets.of(`${partId}:${pin.id}`), (n) => Boolean(nets.info.get(n)));
      const target = route ? nets.info.get(route.net)! : null;
      if (target && route) via = `${[...target.pins, ...(target.gnd ? ["GND"] : []), ...(target.v5 ? ["5V"] : [])].join("/")} via ${route.ohms} Ω`;
    }
    return [pin.id, direct.length ? direct.join(", ") : via];
  }));
}
