import test from "node:test";
import assert from "node:assert/strict";
import { createState, step, terminals, type SimElement } from "../../src/lib/circuit-sim/engine";
import { SIM_EXAMPLES } from "../../src/lib/circuit-sim/examples";

const example = (id: string) => structuredClone(SIM_EXAMPLES.find((e) => e.id === id)!.elements);
const first = (els: SimElement[], kind: SimElement["kind"], n = 0) => els.filter((e) => e.kind === kind)[n];
const near = (actual: number, expected: number, tolerance: number, label: string) => assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: ${actual} not within ${tolerance} of ${expected}`);

/** Runs the circuit for `seconds` with a fixed time step and returns the last result. */
function run(els: SimElement[], seconds: number, dt = 1e-3, pressed = new Set<string>(), state = createState()) {
  let result = step(els, state, dt, pressed);
  for (let t = dt; t < seconds; t += dt) result = step(els, state, dt, pressed);
  return { result, state };
}

test("every example solves, and every component in it connects to something", () => {
  for (const ex of SIM_EXAMPLES) {
    const counts = new Map<string, number>();
    for (const e of ex.elements) for (const n of terminals(e)) counts.set(n, (counts.get(n) ?? 0) + 1);
    const dangling = ex.elements.filter((e) => e.kind !== "ground" && terminals(e).some((n) => counts.get(n) === 1));
    assert.deepEqual(dangling.map((e) => e.id), [], `${ex.id} has unconnected terminals`);
    const { result } = run(structuredClone(ex.elements), 0.05);
    assert.ok(result.ok, `${ex.id} did not solve`);
  }
});

test("Ohm's law: LED loop current matches (9 V − Vf) ÷ R", () => {
  const els = example("led-resistor");
  const { result } = run(els, 0.01);
  const led = result.readings.get(first(els, "led").id)!;
  near(led.current, (9 - 1.9) / (470 + 12), 0.0005, "LED current");
  assert.ok(led.level! > 0.5 && !led.burnt);
  first(els, "resistor").value = 47;                                  // far too small
  const again = run(els, 0.01).result;
  assert.ok(again.readings.get(first(els, "led").id)!.burnt, "LED should burn at ~140 mA");
  assert.ok(again.warnings.some((w) => /burnt out/.test(w)));
});

test("voltage divider reads half the supply; the voltmeter barely loads it", () => {
  const els = example("divider");
  near(run(els, 0.01).result.readings.get(first(els, "voltmeter").id)!.voltage, 4.5, 0.02, "Vout");
  first(els, "resistor", 1).value = 20000;
  near(run(els, 0.01).result.readings.get(first(els, "voltmeter").id)!.voltage, 6, 0.02, "Vout with 10k/20k");
});

test("series lamps are dimmer than parallel lamps", () => {
  const els = example("series-parallel");
  const { result } = run(els, 0.01);
  const lamps = els.filter((e) => e.kind === "lamp").map((e) => result.readings.get(e.id)!.level!);
  assert.ok(lamps[0] < lamps[2] / 3, `series ${lamps[0]} vs parallel ${lamps[2]}`);
  near(lamps[0], lamps[1], 1e-3, "series lamps match");
  near(lamps[2], lamps[3], 1e-3, "parallel lamps match");
  near(lamps[0], 0.25, 0.02, "each series lamp gets half the voltage, a quarter of the power");
});

test("AND/OR switches", () => {
  const els = example("switch-logic");
  const [s1, s2, s3] = els.filter((e) => e.kind === "switch");
  const lit = () => { const r = run(els, 0.005).result; return els.filter((e) => e.kind === "lamp").map((e) => r.readings.get(e.id)!.level! > 0.3); };
  assert.deepEqual(lit(), [false, false]);
  s1.closed = true; assert.deepEqual(lit(), [false, false]);
  s2.closed = true; assert.deepEqual(lit(), [true, false]);
  s3.closed = true; assert.deepEqual(lit(), [true, true]);
});

test("RC charging follows the time constant (63 % after R·C)", () => {
  const els = example("rc-charge");
  first(els, "switch").closed = true;
  const state = createState();
  const at1s = run(els, 1, 1e-3, new Set(), state).result.readings.get(first(els, "voltmeter").id)!.voltage;
  near(at1s, 9 * (1 - Math.exp(-1)), 0.1, "Vc after 1 s");
  const at5s = run(els, 4, 1e-3, new Set(), state).result.readings.get(first(els, "voltmeter").id)!.voltage;
  assert.ok(at5s > 8.9, `nearly full after 5 τ (${at5s})`);
});

test("capacitor keeps the LED lit after the button is released, then it fades", () => {
  const els = example("cap-flash");
  const button = first(els, "button").id;
  const state = createState();
  run(els, 0.5, 1e-3, new Set([button]), state);
  const led = first(els, "led").id;
  const justAfter = run(els, 0.02, 1e-3, new Set(), state).result.readings.get(led)!.current;
  const later = run(els, 1.5, 1e-3, new Set(), state).result.readings.get(led)!.current;
  assert.ok(justAfter > 0.01, `LED lit from the capacitor (${justAfter})`);
  assert.ok(later < justAfter / 4, "and fades");
});

test("transistor switch: tiny base current, larger saturated collector current", () => {
  const els = example("transistor-switch");
  const npn = first(els, "npn").id, button = first(els, "button").id;
  const off = run(els, 0.01).result.readings.get(npn)!;
  assert.equal(off.state, "off");
  const on = run(els, 0.01, 1e-3, new Set([button])).result.readings.get(npn)!;
  assert.equal(on.state, "saturated");
  near(on.base!, (9 - 0.7) / 10100, 0.0001, "base current");
  assert.ok(on.current > 10 * on.base!, "collector current is much larger");
  near(on.current, (9 - 1.9 - 0.2) / (470 + 12 + 1), 0.001, "collector current");
});

test("transistor in its active region multiplies base current by β", () => {
  // 9 V → 1 MΩ → base; collector through 100 Ω: Ib ≈ 8.3 µA, Ic ≈ 0.83 mA (far from saturation).
  const els: SimElement[] = [
    { id: "b", kind: "battery", x1: 0, y1: 10, x2: 0, y2: 0, value: 9 },
    { id: "w1", kind: "wire", x1: 0, y1: 0, x2: 10, y2: 0 },
    { id: "rc", kind: "resistor", x1: 10, y1: 0, x2: 10, y2: 4, value: 100 },
    { id: "q", kind: "npn", x1: 10, y1: 4, x2: 10, y2: 8, value: 100 },
    { id: "rb", kind: "resistor", x1: 0, y1: 0, x2: 8, y2: 6, value: 1e6 },
    { id: "w2", kind: "wire", x1: 10, y1: 8, x2: 10, y2: 10 },
    { id: "w3", kind: "wire", x1: 10, y1: 10, x2: 0, y2: 10 },
  ];
  const q = run(els, 0.01).result.readings.get("q")!;
  assert.equal(q.state, "active");
  near(q.current / q.base!, 100, 0.01, "β");
});

test("diodes conduct one way; the half-wave rectifier only passes positive half-cycles", () => {
  const els = example("diode-direction");
  const { result } = run(els, 0.01);
  const [forward, reverse] = els.filter((e) => e.kind === "diode").map((e) => result.readings.get(e.id)!);
  assert.equal(forward.state, "on");
  near(forward.voltage, 0.8, 0.1, "forward drop (0.7 V plus 0.5 Ω × 0.26 A)");
  assert.equal(reverse.state, "off");
  near(reverse.voltage, -6, 0.05, "reverse voltage");

  const rect = example("half-wave");
  const state = createState();
  const resistor = first(rect, "resistor").id;
  let minCurrent = Infinity, maxCurrent = -Infinity;
  for (let i = 0; i < 400; i++) { const c = step(rect, state, 1e-4).readings.get(resistor)!.current; minCurrent = Math.min(minCurrent, c); maxCurrent = Math.max(maxCurrent, c); }
  assert.ok(minCurrent > -1e-6, "never flows backwards");
  near(maxCurrent, (6 - 0.7) / 1000, 0.0004, "peak current");
});

test("bridge rectifier with smoothing keeps the LED steadily lit", () => {
  const els = example("bridge");
  const state = createState();
  run(els, 0.2, 1e-4, new Set(), state);
  const led = first(els, "led").id;
  let min = Infinity;
  for (let i = 0; i < 200; i++) min = Math.min(min, step(els, state, 1e-4).readings.get(led)!.current);
  assert.ok(min > 0.003, `LED never goes out (${min})`);
  assert.ok(!state.burnt.size);
});

test("Kirchhoff: branch currents add up to the total; a short starves the lamp", () => {
  const els = example("kirchhoff");
  const r = run(els, 0.01).result;
  const meters = els.filter((e) => e.kind === "ammeter").map((e) => r.readings.get(e.id)!.current);
  near(meters[1] + meters[2] + meters[3], meters[0], 1e-5, "sum of branches");
  near(meters[1], 9 / 1000, 0.0002, "1 kΩ branch");
  const short = example("short");
  const s = run(short, 0.01).result;
  assert.ok(s.warnings.some((w) => /Short circuit/.test(w)));
  assert.ok(s.readings.get(first(short, "lamp").id)!.level! < 0.01);
});
