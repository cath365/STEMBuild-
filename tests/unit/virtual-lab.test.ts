import test from "node:test";
import assert from "node:assert/strict";
import { bandsFromResistor, batteryLife, capacitorFromCode, formatSI, ledResistor, parallelResistance, parseSI, resistorFromBands, solveOhm, standardResistor, timer555, voltageDivider } from "../../src/lib/electronics";
import { measureResistance, solveCircuit, type CircuitElement } from "../../src/lib/dc-circuit";
import { measure, simulateScope } from "../../src/lib/scope";
import { evaluateGate, LOGIC_CIRCUITS, truthTable } from "../../src/lib/logic";

const close = (actual: number, expected: number, tolerance: number, label = "") => assert.ok(Math.abs(actual - expected) <= tolerance, `${label} expected ${expected} ± ${tolerance}, got ${actual}`);

test("formats engineering units", () => {
  assert.equal(formatSI(4700, "Ω"), "4.7 kΩ");
  assert.equal(formatSI(0.0215, "A"), "21.5 mA");
  assert.equal(formatSI(1e-7, "F"), "100 nF");
  assert.equal(formatSI(2_200_000, "Ω"), "2.2 MΩ");
});

test("parses values the way engineers write them", () => {
  assert.equal(parseSI("4.7k"), 4700);
  assert.equal(parseSI("4k7"), 4700);
  assert.equal(parseSI("10 kΩ"), 10_000);
  assert.equal(parseSI("2.2M"), 2_200_000);
  assert.equal(parseSI("330"), 330);
  assert.equal(parseSI("4R7"), 4.7);
  close(parseSI("100n"), 100e-9, 1e-18);
  close(parseSI("1uF"), 1e-6, 1e-18);
  close(parseSI("20mA"), 0.02, 1e-12);
  assert.ok(Number.isNaN(parseSI("abc")));
});

test("resistor colour code works in both directions", () => {
  assert.deepEqual(resistorFromBands(["yellow", "violet", "red", "gold"]).ohms, 4700);
  assert.equal(resistorFromBands(["brown", "black", "black", "red", "brown"]).ohms, 10_000);
  assert.equal(resistorFromBands(["orange", "orange", "brown", "gold"]).ohms, 330);
  assert.deepEqual(bandsFromResistor(330), ["orange", "orange", "brown", "gold"]);
  assert.deepEqual(bandsFromResistor(4.7), ["yellow", "violet", "gold", "gold"]);
  assert.deepEqual(bandsFromResistor(1_000_000), ["brown", "black", "green", "gold"]);
  assert.deepEqual(bandsFromResistor(10_000, 5), ["brown", "black", "black", "red", "brown"]);
  assert.throws(() => resistorFromBands(["gold", "violet", "red", "gold"]));
});

test("standard values, capacitor codes and formulas", () => {
  assert.equal(standardResistor(150, undefined, "up"), 150);
  assert.equal(standardResistor(151, undefined, "up"), 180);
  assert.equal(standardResistor(4600), 4700);
  close(capacitorFromCode("104")!.farads, 100e-9, 1e-15);
  assert.equal(capacitorFromCode("473K")!.tolerance, "±10%");
  assert.equal(capacitorFromCode("hello"), null);
  const ohm = solveOhm({ volts: 9, ohms: 450 });
  close(ohm.amps, 0.02, 1e-12); close(ohm.watts, 0.18, 1e-12);
  close(solveOhm({ ohms: 100, watts: 0.25 }).volts, 5, 1e-9);
  const led = ledResistor(5, 2, 0.02)!;
  close(led.exact, 150, 1e-9); assert.equal(led.standard, 150);
  close(voltageDivider(5, 10_000, 10_000).vout, 2.5, 1e-12);
  close(parallelResistance([100, 100]), 50, 1e-12);
  close(timer555(1000, 10_000, 10e-6).frequency, 6.87, 0.01);
  close(batteryLife(2000, 100).hours, 16, 1e-9);
});

test("DC solver: LED with a series resistor behaves like the real thing", () => {
  const circuit: CircuitElement[] = [
    { id: "bat", kind: "battery", a: "P", b: "N", value: 9 },
    { id: "r", kind: "resistor", a: "P", b: "X", value: 330 },
    { id: "led", kind: "led", a: "X", b: "N", colour: "red" },
  ];
  const s = solveCircuit(circuit);
  const current = s.elements.led.current;
  close(current, (9 - 2) / (330 + 15 + 0.3), 0.0005, "LED current");
  assert.equal(s.elements.led.ledOn, true);
  assert.deepEqual(s.warnings, []);
  // Reversed LED blocks current.
  const reversed = solveCircuit(circuit.map((e) => e.id === "led" ? { ...e, a: "N", b: "X" } : e));
  assert.equal(reversed.elements.led.ledOn, false);
  close(reversed.voltages.X, 9, 0.01, "full supply across reversed LED");
  // No resistor: the LED would burn out.
  const direct = solveCircuit([{ id: "bat", kind: "battery", a: "P", b: "N", value: 9 }, { id: "led", kind: "led", a: "P", b: "N" }]);
  assert.equal(direct.elements.led.overCurrent, true);
  assert.ok(direct.warnings.some((w) => w.includes("burn out")));
});

test("DC solver: divider, short circuit, open switch and ohmmeter", () => {
  const divider: CircuitElement[] = [
    { id: "bat", kind: "battery", a: "P", b: "N", value: 6 },
    { id: "r1", kind: "resistor", a: "P", b: "M", value: 2000 },
    { id: "r2", kind: "resistor", a: "M", b: "N", value: 1000 },
  ];
  close(solveCircuit(divider).voltages.M, 2, 0.001, "divider midpoint");
  const shorted = solveCircuit([...divider, { id: "w", kind: "wire", a: "P", b: "N" }]);
  assert.ok(shorted.warnings.some((w) => w.startsWith("Short circuit")));
  const open = solveCircuit([...divider, { id: "s", kind: "switch", a: "M", b: "X", closed: false }, { id: "r3", kind: "resistor", a: "X", b: "N", value: 1000 }]);
  close(open.voltages.M, 2, 0.001, "open switch draws nothing");
  close(measureResistance(divider, "P", "N"), 3000, 0.5, "series 2k + 1k");
  close(measureResistance([...divider, { id: "r3", kind: "resistor", a: "P", b: "N", value: 3000 }], "P", "N"), 1500, 0.5, "parallel");
  assert.equal(measureResistance([...divider.slice(0, 2), { id: "r2", kind: "resistor", a: "M", b: "N", value: 1000, broken: true }], "M", "N"), Infinity);
});

test("oscilloscope: RC low-pass averages PWM and measurements are correct", () => {
  const generator = { waveform: "sine" as const, frequency: 1000, amplitude: 2, offset: 0, duty: 0.5 };
  const direct = simulateScope({ generator, circuit: "direct", ohms: 1000, farads: 1e-6, windowSeconds: 5e-3, triggerLevel: 0 });
  const m = measure(direct.ch1, direct.t);
  close(m.vpp, 4, 0.02, "Vpp"); close(m.rms, 2 / Math.SQRT2, 0.05, "Vrms"); close(m.frequency!, 1000, 5, "frequency");
  const pwm = simulateScope({ generator: { ...generator, waveform: "pwm", amplitude: 5, duty: 0.25 }, circuit: "rc-lowpass", ohms: 10_000, farads: 10e-6, windowSeconds: 10e-3, triggerLevel: 2.5 });
  close(measure(pwm.ch2, pwm.t).mean, 1.25, 0.1, "PWM average = duty × 5 V");
  const rectified = simulateScope({ generator: { ...generator, amplitude: 5 }, circuit: "half-wave", ohms: 1000, farads: 1e-6, windowSeconds: 5e-3, triggerLevel: 0 });
  const r = measure(rectified.ch2, rectified.t);
  close(r.min, 0, 1e-9, "no negative half"); close(r.max, 4.3, 0.02, "peak minus diode drop");
});

test("logic gates and circuits match their truth tables", () => {
  assert.equal(evaluateGate("XOR", true, false), true);
  assert.equal(evaluateGate("NAND", true, true), false);
  const full = LOGIC_CIRCUITS.find((c) => c.id === "full-adder")!;
  for (const row of truthTable(full.inputs)) {
    const total = Number(row.A) + Number(row.B) + Number(row.Cin);
    assert.equal(full.outputs[0].evaluate(row), Boolean(total & 1));
    assert.equal(full.outputs[1].evaluate(row), total >= 2);
  }
  assert.equal(truthTable(["A", "B", "C"]).length, 8);
});
