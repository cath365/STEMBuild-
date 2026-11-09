import test from "node:test";
import assert from "node:assert/strict";
import { IDLE_BOARD, buildNets, simulate, type BoardSnapshot, type PlacedPart, type StudioWire } from "../../src/lib/studio/circuit";

const w = (a: string, b: string, i: number): StudioWire => ({ id: `w${i}`, a, b, colour: "blue" });
const part = (id: string, type: PlacedPart["type"], props: PlacedPart["props"] = {}): PlacedPart => ({ id, type, x: 0, y: 0, props });
const powered = (id: string) => [w(`${id}:vcc`, "uno:5V", 90), w(`${id}:gnd`, "uno:GND_T", 91)];
const run = (parts: PlacedPart[], wires: StudioWire[], board: BoardSnapshot = IDLE_BOARD) => simulate({ parts, wires }, buildNets({ parts, wires }), board);
const outputs = (pins: Record<number, number>): BoardSnapshot => ({
  ...IDLE_BOARD,
  mode: IDLE_BOARD.mode.map((m, i) => (i in pins ? "output" : m)),
  duty: IDLE_BOARD.duty.map((d, i) => pins[i] ?? d),
});

test("comparator sensor modules drive their pin at the right level", () => {
  const cases: [PlacedPart["type"], string, string, boolean][] = [
    ["ir-obstacle", "out", "obstacle", true], ["flame-sensor", "do", "flame", true], ["hall-sensor", "s", "magnet", true],
    ["line-sensor", "do", "black", false], ["sound-sensor", "do", "loud", false],
  ];
  for (const [type, pin, prop, activeLow] of cases) {
    const wires = [...powered("s1"), w(`s1:${pin}`, "uno:D2", 1)];
    const idle = run([part("s1", type, { [prop]: false })], wires).digitalInputs[2];
    const triggered = run([part("s1", type, { [prop]: true })], wires).digitalInputs[2];
    assert.equal(idle, activeLow, `${type} idle level`);
    assert.equal(triggered, !activeLow, `${type} triggered level`);
  }
  const unpowered = run([part("s1", "ir-obstacle", { obstacle: true })], [w("s1:out", "uno:D2", 1)]);
  assert.ok(unpowered.warnings.some((x) => /no power/.test(x.message)));
});

test("analog modules and the joystick produce voltages on analog pins", () => {
  const soil = (moisture: number) => run([part("s1", "soil-moisture", { moisture })], [...powered("s1"), w("s1:aout", "uno:A0", 1)]).analogVolts[0];
  assert.ok(soil(0) > soil(1), "wetter soil reads lower");
  assert.ok(soil(0) <= 5 && soil(1) > 0);
  const gas = (level: number) => run([part("s1", "gas-sensor", { gas: level })], [...powered("s1"), w("s1:ao", "uno:A1", 1)]).analogVolts[1];
  assert.ok(gas(0.9) > gas(0.1));
  const stick = run([part("j", "joystick", { x: 1, y: 0, pressed: true })], [...powered("j"), w("j:vrx", "uno:A2", 1), w("j:vry", "uno:A3", 2), w("j:sw", "uno:D4", 3)]);
  assert.equal(stick.analogVolts[2], 5);
  assert.equal(stick.analogVolts[3], 0);
  assert.equal(stick.digitalInputs[4], false);
});

test("tilt switch closes while upright", () => {
  const wires = [w("t:a", "uno:D3", 1), w("t:b", "uno:GND_T", 2)];
  const pullup: BoardSnapshot = { ...IDLE_BOARD, mode: IDLE_BOARD.mode.map((m, i) => (i === 3 ? "pullup" : m)) };
  assert.equal(run([part("t", "tilt-switch", { tilted: false })], wires, pullup).digitalInputs[3], false);
  assert.equal(run([part("t", "tilt-switch", { tilted: true })], wires, pullup).digitalInputs[3], true);
});

test("output modules respond to pins: active buzzer, traffic light, vibration, active-LOW relay", () => {
  const buzz = (duty: number) => run([part("z", "active-buzzer")], [w("z:plus", "uno:D8", 1), w("z:minus", "uno:GND_T", 2)], outputs({ 8: duty })).views.z.frequency;
  assert.equal(buzz(1), 2300);
  assert.equal(buzz(0), 0);
  const lights = run([part("t", "traffic-light")], [w("t:r", "uno:D10", 1), w("t:y", "uno:D9", 2), w("t:g", "uno:D8", 3), w("t:gnd", "uno:GND_T", 4)], outputs({ 10: 1, 9: 0, 8: 1 })).views.t.segments!;
  assert.deepEqual(lights, { r: 1, y: 0, g: 1 });
  assert.equal(run([part("v", "vibration-motor")], [...powered("v"), w("v:in", "uno:D5", 1)], outputs({ 5: 0.6 })).views.v.speed, 0.6);
  const relay = (duty: number) => run([part("r", "relay")], [...powered("r"), w("r:in", "uno:D7", 1)], outputs({ 7: duty })).views.r.direction;
  assert.equal(relay(0), 1);
  assert.equal(relay(1), 0);
  assert.equal(run([part("r", "relay")], [...powered("r")]).views.r.direction, 0, "unconnected IN stays off");
});
