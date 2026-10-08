import { checkLedSketch, defaultLedSketch, lab3dProject, supportsFastSketch } from "./lab3d";

export type BoardPoint = { x: number; y: number };
export type BoardComponent = { a: string; b: string } | null;
export type BoardWire = { id: string; from: string; to: string };
export type BreadboardDocument = {
  version: 1;
  led: BoardComponent;
  resistor: BoardComponent;
  wires: BoardWire[];
  code: string;
};

export const BOARD_STORAGE_KEY = "stembuild-hole-workshop-v1";
const letterRows = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"] as const;
const rowY: Record<string, number> = {
  P: 62, N: 93, A: 149, B: 175, C: 201, D: 227, E: 253,
  F: 309, G: 335, H: 361, I: 387, J: 413,
};
export const holes: { id: string; x: number; y: number; rail: boolean }[] = [
  ...(["P", "N", ...letterRows] as const).flatMap(row =>
    Array.from({ length: 20 }, (_, index) => ({
      id: `${row}${index + 1}`,
      x: 200 + index * 25,
      y: rowY[row],
      rail: row === "P" || row === "N",
    }))
  ),
  { id: "UNO:D8", x: 133, y: 224, rail: false },
  { id: "UNO:GND", x: 133, y: 280, rail: false },
];
export const holePositions = new Map(holes.map(hole => [hole.id, { x: hole.x, y: hole.y }]));
export const breadboardHoleIds = new Set(holes.filter(hole => hole.id !== "UNO:D8" && hole.id !== "UNO:GND").map(hole => hole.id));

export function createBreadboard(): BreadboardDocument {
  return { version: 1, led: null, resistor: null, wires: [], code: defaultLedSketch };
}

export function demoBreadboard(): BreadboardDocument {
  return {
    version: 1,
    resistor: { a: "E6", b: "F6" },
    led: { a: "E11", b: "F11" },
    wires: [
      { id: "demo-1", from: "UNO:D8", to: "A6" },
      { id: "demo-2", from: "J6", to: "A11" },
      { id: "demo-3", from: "J11", to: "UNO:GND" },
    ],
    code: defaultLedSketch,
  };
}

export function parseBreadboard(value: unknown): BreadboardDocument {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw Error("Invalid breadboard project.");
  const raw = value as Record<string, unknown>;
  if (raw.version !== 1 || typeof raw.code !== "string" || raw.code.length > 50_000 ||
      !Array.isArray(raw.wires) || raw.wires.length > 80) throw Error("Unsupported breadboard project format.");

  function parseComponent(input: unknown): BoardComponent {
    if (input === null) return null;
    if (!input || typeof input !== "object" || Array.isArray(input)) throw Error("Invalid placed component.");
    const value = input as Record<string, unknown>;
    if (typeof value.a !== "string" || typeof value.b !== "string" ||
        !breadboardHoleIds.has(value.a) || !breadboardHoleIds.has(value.b) || value.a === value.b) {
      throw Error("Component leads must occupy two different breadboard holes.");
    }
    return { a: value.a, b: value.b };
  }

  const led = parseComponent(raw.led);
  const resistor = parseComponent(raw.resistor);
  const usedByParts = [led?.a, led?.b, resistor?.a, resistor?.b].filter((hole): hole is string => Boolean(hole));
  if (new Set(usedByParts).size !== usedByParts.length) throw Error("Two component leads cannot share one hole.");

  const wireIds = new Set<string>();
  const usedByWires = new Set<string>();
  const wires: BoardWire[] = raw.wires.map((item: unknown) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) throw Error("Invalid jumper wire.");
    const wire = item as Record<string, unknown>;
    if (typeof wire.id !== "string" || wire.id.length > 90 || !wire.id ||
        typeof wire.from !== "string" || typeof wire.to !== "string" ||
        !holePositions.has(wire.from) || !holePositions.has(wire.to) || wire.from === wire.to ||
        wireIds.has(wire.id)) throw Error("Invalid or duplicate jumper wire.");
    wireIds.add(wire.id);
    if (usedByWires.has(wire.from) || usedByWires.has(wire.to)) throw Error("Each breadboard hole accepts only one jumper plug.");
    usedByWires.add(wire.from);
    usedByWires.add(wire.to);
    return { id: wire.id, from: wire.from, to: wire.to };
  });
  if (usedByParts.some(hole => usedByWires.has(hole))) {
    throw Error("A jumper plug and a component lead cannot occupy the same hole.");
  }
  return { version: 1, led, resistor, wires, code: raw.code };
}

export function closestBreadboardHole(x: number, y: number, maxDistance = 17): string | null {
  let best: string | null = null;
  let distance = maxDistance;
  for (const hole of holes) {
    if (hole.id === "UNO:D8" || hole.id === "UNO:GND") continue;
    const delta = Math.hypot(hole.x - x, hole.y - y);
    if (delta < distance) { distance = delta; best = hole.id; }
  }
  return best;
}

export function canPlaceComponent(doc: BreadboardDocument, kind: "led" | "resistor", a: string, b: string): string | null {
  if (!breadboardHoleIds.has(a) || !breadboardHoleIds.has(b) || a === b) return "Choose two different breadboard holes.";
  const occupied = new Set<string>();
  for (const other of [kind === "led" ? doc.resistor : doc.led]) {
    if (other) { occupied.add(other.a); occupied.add(other.b); }
  }
  for (const wire of doc.wires) { occupied.add(wire.from); occupied.add(wire.to); }
  if (occupied.has(a) || occupied.has(b)) return "That hole already contains a lead or jumper. Select a free hole.";
  const first = holePositions.get(a)!;
  const second = holePositions.get(b)!;
  const gap = Math.hypot(first.x - second.x, first.y - second.y);
  if (gap < 20 || gap > 170) return "Place the two leads 20–170 units apart; use nearby breadboard holes.";
  return null;
}

export function addBoardWire(doc: BreadboardDocument, from: string, to: string): BreadboardDocument {
  if (!holePositions.has(from) || !holePositions.has(to) || from === to) throw Error("Select two different valid terminals.");
  if (doc.wires.length >= 80) throw Error("Maximum 80 jumper wires for this learning workbench.");
  const occupied = new Set([
    doc.led?.a, doc.led?.b, doc.resistor?.a, doc.resistor?.b,
    ...doc.wires.flatMap(wire => [wire.from, wire.to]),
  ]);
  if (occupied.has(from) || occupied.has(to)) throw Error("That terminal is occupied. Use another hole in the same connected strip.");
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID() : `wire-${Date.now()}-${doc.wires.length}`;
  return { ...doc, wires: [...doc.wires, { id, from, to }] };
}

export function evaluateBreadboard(doc: BreadboardDocument) {
  const invalidCode = !supportsFastSketch(lab3dProject("led-blink"), doc.code);
  const sketch = checkLedSketch(doc.code);
  if (!doc.led || !doc.resistor) {
    return { ready: false, message: "Place a 330 Ω resistor and LED in separate breadboard holes.", sketch };
  }
  const parent = new Map(holes.map(hole => [hole.id, hole.id]));
  function root(id: string): string {
    const next = parent.get(id)!;
    if (next === id) return id;
    const result = root(next);
    parent.set(id, result);
    return result;
  }
  function join(a: string, b: string) { parent.set(root(a), root(b)); }
  // Standard solderless breadboard: 5 interconnected holes per column on each
  // side of the central trench; upper and lower rails are separate continuous buses.
  for (let column = 1; column <= 20; column++) {
    for (const row of ["B", "C", "D", "E"]) join(`A${column}`, `${row}${column}`);
    for (const row of ["G", "H", "I", "J"]) join(`F${column}`, `${row}${column}`);
    if (column > 1) { join("P1", `P${column}`); join("N1", `N${column}`); }
  }
  for (const wire of doc.wires) join(wire.from, wire.to);
  const equal = (a: string, b: string) => root(a) === root(b);
  const { led, resistor } = doc;
  if (equal("UNO:D8", "UNO:GND")) return { ready: false, message: "Short circuit: Arduino D8 is directly connected to GND.", sketch };
  if (equal(led.a, led.b)) return { ready: false, message: "LED anode and cathode are shorted together.", sketch };
  if (equal(resistor.a, resistor.b)) return { ready: false, message: "Both resistor leads are connected to the same electrical strip.", sketch };

  const forward = (r1: string, r2: string) =>
    (equal("UNO:D8", r1) && equal(r2, led.a) && equal(led.b, "UNO:GND")) ||
    (equal("UNO:D8", led.a) && equal(led.b, r1) && equal(r2, "UNO:GND"));
  const circuitReady = forward(resistor.a, resistor.b) || forward(resistor.b, resistor.a);
  if (!circuitReady) return {
    ready: false,
    message: "Complete the path D8 → 330 Ω resistor → LED anode (+) → LED cathode (−) → GND. The resistor may also be after the LED.",
    sketch,
  };
  if (invalidCode || !sketch.ok) return {
    ready: false,
    message: "The wiring is connected, but this lightweight preview only runs the starter blink sketch with numeric delay changes. Export other sketches for testing on real hardware.",
    sketch,
  };
  return {
    ready: true,
    message: "Connected: D8 drives the LED through a 330 Ω current-limiting resistor. Ready for the blink preview.",
    sketch,
  };
}
