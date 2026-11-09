import test from "node:test";
import assert from "node:assert/strict";
import { KIT_BY_ID, LINE_START, ROBOT_KITS, TRACK, canJoin, checkKitWiring, onLine, stepLightSeeker, stepLineFollower, stepRemote, type Pose } from "../../src/lib/robot-kits";

test("every kit is consistent: connections use real pins, and the full wiring passes", () => {
  for (const kit of ROBOT_KITS) {
    const pins = new Set(kit.parts.flatMap((p) => p.pins.map((pin) => `${p.id}:${pin}`)));
    for (const c of kit.connections) { assert.ok(pins.has(c.a), `${kit.id}: ${c.a}`); assert.ok(pins.has(c.b), `${kit.id}: ${c.b}`); assert.ok(c.why.length > 10); }
    assert.ok(checkKitWiring(kit, kit.connections).ok, kit.id);
    assert.equal(checkKitWiring(kit, []).next, kit.connections[0]);
    // Every pin that appears in the kit's sketch is wired.
    for (const pin of kit.sketch.match(/\b(?:IN\d|LEFT_SENSOR|RIGHT_SENSOR)\s*=\s*(\d+)/g) ?? []) assert.ok(kit.connections.some((c) => c.a === `uno:D${pin.split("=")[1].trim()}` || c.b === `uno:D${pin.split("=")[1].trim()}`), `${kit.id}: ${pin}`);
  }
});

test("wrong wires are refused and explained; equivalent ground wiring is accepted", () => {
  const kit = KIT_BY_ID["line-follower"];
  assert.equal(canJoin(kit, "uno:5V", "uno:GND"), false);
  assert.equal(canJoin(kit, "battery:+", "uno:5V"), false, "motor battery must not feed the Uno 5V");
  assert.equal(canJoin(kit, "uno:D2", "irR:OUT"), false, "sensors swapped");
  assert.equal(canJoin(kit, "irL:GND", "driver:GND"), true, "all grounds are one net");
  const partial = checkKitWiring(kit, [{ a: "uno:5V", b: "irL:VCC" }, { a: "uno:D2", b: "irR:OUT" }]);
  assert.equal(partial.ok, false);
  assert.equal(partial.wrong.length, 1);
});

test("line follower stays on the track and completes laps", () => {
  let pose: Pose = { ...LINE_START }, travelled = 0, laps = 0, worst = 0;
  for (let t = 0; t < 90; t += 0.02) {
    const f = stepLineFollower(pose, 0.02, travelled);
    pose = f.pose; travelled = f.travelled; laps = f.laps ?? 0;
    // Distance from the robot's centre to the ellipse, approximately.
    const k = Math.hypot(pose.x / TRACK.rx, pose.z / TRACK.rz);
    worst = Math.max(worst, Math.abs(k - 1) * Math.min(TRACK.rx, TRACK.rz));
  }
  assert.ok(laps >= 2, `laps ${laps}`);
  assert.ok(worst < 12, `strayed ${worst.toFixed(1)} cm from the line`);
  assert.ok(onLine(LINE_START.x, LINE_START.z));
});

test("light seeker drives to the light from anywhere in front, and stops there", () => {
  for (const light of [{ x: 60, z: -60 }, { x: -50, z: 20 }, { x: 0, z: -70 }, { x: -85, z: -85 }, { x: 80, z: 80 }]) {
    let pose: Pose = { x: 0, z: 60, heading: Math.PI };
    let status = "";
    for (let t = 0; t < 40 && !status.startsWith("Reached"); t += 0.02) { const f = stepLightSeeker(pose, light, 0.02); pose = f.pose; status = f.status; }
    assert.match(status, /Reached the light/, `light at ${JSON.stringify(light)}`);
    assert.ok(Math.hypot(pose.x - light.x, pose.z - light.z) < 60, `stops within about half a metre of the light (${Math.hypot(pose.x - light.x, pose.z - light.z).toFixed(0)} cm)`);
  }
});

test("remote car follows commands and stops at walls", () => {
  let pose: Pose = { x: 0, z: 0, heading: 0 };
  for (let i = 0; i < 50; i++) pose = stepRemote(pose, "F", 0.02).pose;
  assert.ok(pose.z > 15 && Math.abs(pose.x) < 1e-6, "forward along +z");
  const before = pose.heading;
  pose = stepRemote(pose, "L", 0.1).pose;
  assert.ok(pose.heading > before, "L turns left");
  let last = stepRemote(pose, "F", 0.02);
  for (let i = 0; i < 2000; i++) last = stepRemote(last.pose, "F", 0.02);
  assert.match(last.status, /Bumped the wall/);
  assert.ok(Math.abs(last.pose.x) <= 92 && Math.abs(last.pose.z) <= 92);
});
