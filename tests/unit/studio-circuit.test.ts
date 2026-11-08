import test from "node:test";
import assert from "node:assert/strict";
import { buildNets, simulate, IDLE_BOARD, type BoardSnapshot, type PlacedPart, type StudioWire } from "../../src/lib/studio/circuit";

const part = (id: string, type: PlacedPart["type"], props: PlacedPart["props"] = {}): PlacedPart => ({ id, type, x: 0, y: 0, props });
let n = 0;
const wire = (a: string, b: string): StudioWire => ({ id: `w${n++}`, a, b, colour: "blue" });
const board = (outputs: Record<number, number>, extra: Partial<BoardSnapshot> = {}): BoardSnapshot => ({
  ...IDLE_BOARD,
  duty: IDLE_BOARD.duty.map((_, i) => outputs[i] ?? 0),
  mode: IDLE_BOARD.mode.map((_, i) => (i in outputs ? "output" : "input")),
  ...extra,
});

test("LED through a resistor lights; without one it burns out", () => {
  const doc = { parts: [part("r1", "resistor", { ohms: 220 }), part("led1", "led", { colour: "red" })], wires: [wire("uno:D13", "r1:a"), wire("r1:b", "led1:anode"), wire("led1:cathode", "uno:GND_B1")] };
  const lit = simulate(doc, buildNets(doc), board({ 13: 1 }));
  assert.ok(lit.views.led1.brightness! > 0.9, "220 Ω at 5 V gives ~13 mA: fully lit");
  assert.equal(simulate(doc, buildNets(doc), board({ 13: 0 })).views.led1.brightness, 0);
  assert.ok(Math.abs(simulate(doc, buildNets(doc), board({ 13: 0.5 })).views.led1.brightness! - 0.5) < 0.05, "PWM dims it");

  const direct = { parts: [part("led1", "led")], wires: [wire("uno:D13", "led1:anode"), wire("led1:cathode", "uno:GND_T")] };
  const result = simulate(direct, buildNets(direct), board({ 13: 1 }));
  assert.equal(result.views.led1.burnt, true);
  assert.deepEqual(result.burnt, ["led1"]);
  assert.ok(result.warnings[0].message.includes("burnt out"), "the bench check explains the burnt LED");
});

test("reversed LED and missing ground are explained", () => {
  const reversed = { parts: [part("r1", "resistor"), part("led1", "led")], wires: [wire("uno:5V", "r1:a"), wire("r1:b", "led1:cathode"), wire("led1:anode", "uno:GND_T")] };
  const r = simulate(reversed, buildNets(reversed), board({}));
  assert.equal(r.views.led1.brightness, 0);
  assert.ok(r.warnings.some((w) => w.message.includes("reversed")));
  const noGround = { parts: [part("r1", "resistor"), part("led1", "led")], wires: [wire("uno:D9", "r1:a"), wire("r1:b", "led1:anode")] };
  assert.ok(simulate(noGround, buildNets(noGround), board({ 9: 1 })).warnings.some((w) => w.message.includes("connect − to GND")));
});

test("button with INPUT_PULLUP reads HIGH released and LOW pressed; floating input is flagged", () => {
  const doc = { parts: [part("b1", "button")], wires: [wire("uno:D2", "b1:a"), wire("b1:b", "uno:GND_T")] };
  const pullup: BoardSnapshot = { ...IDLE_BOARD, mode: IDLE_BOARD.mode.map((m, i) => (i === 2 ? "pullup" : m)) };
  assert.equal(simulate(doc, buildNets(doc), pullup).digitalInputs[2], true);
  assert.equal(simulate(doc, buildNets(doc, new Set(["b1"])), pullup).digitalInputs[2], false);
  const floating = simulate(doc, buildNets(doc), IDLE_BOARD);
  assert.ok(floating.warnings.some((w) => w.message.includes("floating")));
  // A 10 kΩ pull-down fixes it for a button wired to 5V.
  const pulldown = { parts: [part("b1", "button"), part("r1", "resistor", { ohms: 10_000 })], wires: [wire("uno:D2", "b1:a"), wire("b1:b", "uno:5V"), wire("uno:D2", "r1:a"), wire("r1:b", "uno:GND_B2")] };
  assert.equal(simulate(pulldown, buildNets(pulldown), IDLE_BOARD).digitalInputs[2], false);
  assert.equal(simulate(pulldown, buildNets(pulldown, new Set(["b1"])), IDLE_BOARD).digitalInputs[2], true);
  assert.ok(!simulate(pulldown, buildNets(pulldown), IDLE_BOARD).warnings.some((w) => w.message.includes("floating")));
});

test("potentiometer and sensors produce the right analog voltages", () => {
  const doc = {
    parts: [part("p1", "potentiometer", { position: 0.25 }), part("t1", "temp-sensor", { celsius: 30 }), part("l1", "light-sensor", { light: 0.8 })],
    wires: [wire("p1:end1", "uno:GND_T"), wire("p1:end2", "uno:5V"), wire("p1:wiper", "uno:A0"),
      wire("t1:vcc", "uno:5V"), wire("t1:gnd", "uno:GND_B1"), wire("t1:out", "uno:A1"),
      wire("l1:vcc", "uno:5V"), wire("l1:gnd", "uno:GND_B1"), wire("l1:ao", "uno:A2")],
  };
  const { analogVolts } = simulate(doc, buildNets(doc), IDLE_BOARD);
  assert.ok(Math.abs(analogVolts[0] - 1.25) < 1e-9);
  assert.ok(Math.abs(analogVolts[1] - 0.8) < 1e-9);
  assert.ok(Math.abs(analogVolts[2] - 4) < 1e-9);
  const unpowered = { parts: [part("t1", "temp-sensor")], wires: [wire("t1:out", "uno:A1")] };
  assert.ok(simulate(unpowered, buildNets(unpowered), IDLE_BOARD).warnings.some((w) => w.message.includes("no power")));
});

test("servo angle, motor direction, buzzer frequency and ultrasonic link", () => {
  const doc = {
    parts: [part("s1", "servo"), part("m1", "motor-driver"), part("z1", "buzzer"), part("u1", "ultrasonic", { distance: 25 })],
    wires: [wire("s1:gnd", "uno:GND_T"), wire("s1:vcc", "uno:5V"), wire("s1:signal", "uno:D9"),
      wire("m1:vcc", "uno:5V"), wire("m1:gnd", "uno:GND_B1"), wire("m1:in1", "uno:D7"), wire("m1:in2", "uno:D6"), wire("m1:en", "uno:D5"),
      wire("z1:plus", "uno:D8"), wire("z1:minus", "uno:GND_B2"),
      wire("u1:vcc", "uno:5V"), wire("u1:gnd", "uno:GND_B2"), wire("u1:trig", "uno:D11"), wire("u1:echo", "uno:D12")],
  };
  const snapshot = board({ 9: 0.07, 7: 1, 6: 0, 5: 0.5, 8: 0.5, 11: 0 }, {});
  snapshot.pulseUs = snapshot.pulseUs.map((_, i) => (i === 9 ? 1472 : 0));
  snapshot.freq = snapshot.freq.map((_, i) => (i === 8 ? 440 : 0));
  const r = simulate(doc, buildNets(doc), snapshot);
  assert.equal(r.views.s1.angle, 90);
  assert.deepEqual([r.views.m1.direction, r.views.m1.speed], [1, 0.5]);
  assert.equal(r.views.z1.frequency, 440);
  assert.deepEqual(r.ultrasonic, [{ partId: "u1", trigPin: 11, echoPin: 12, distanceCm: 25 }]);
  assert.equal(r.digitalInputs[12], undefined, "ECHO is left to the emulator's timing");
});

test("shorts and fighting outputs are errors", () => {
  const short = { parts: [], wires: [wire("uno:5V", "uno:GND_T")] };
  assert.ok(simulate(short, buildNets(short), IDLE_BOARD).warnings.some((w) => w.level === "error"));
  const fight = { parts: [], wires: [wire("uno:D3", "uno:D4")] };
  assert.ok(simulate(fight, buildNets(fight), board({ 3: 1, 4: 0 })).warnings.some((w) => w.message.includes("both outputs")));
});
