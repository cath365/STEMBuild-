import test from "node:test";
import assert from "node:assert/strict";
import { checkLedSketch, defaultLedSketch, labReadiness, ledLabConnections, ledLabParts } from "../../src/lib/lab3d";

test("3D LED lab defines unique parts and connections", () => {
  assert.equal(new Set(ledLabParts.map((part) => part.id)).size, ledLabParts.length);
  assert.equal(new Set(ledLabConnections.map((wire) => wire.id)).size, ledLabConnections.length);
});

test("default Arduino sketch maps to D8 and blink behavior", () => {
  const result = checkLedSketch(defaultLedSketch);
  assert.equal(result.ok, true);
  assert.equal(result.highDelayMs, 500);
  assert.equal(result.lowDelayMs, 500);
});

test("3D lab blocks Run until assembly, wiring and code are ready", () => {
  const incomplete = labReadiness([], [], defaultLedSketch);
  assert.equal(incomplete.ready, false);
  assert.equal(incomplete.missingParts.length, ledLabParts.length);
  assert.equal(incomplete.missingConnections.length, ledLabConnections.length);

  const ready = labReadiness(
    ledLabParts.map((part) => part.id),
    ledLabConnections.map((wire) => wire.id),
    defaultLedSketch,
  );
  assert.equal(ready.ready, true);
});

test("3D lab catches code that no longer matches the physical D8 wiring", () => {
  const source = defaultLedSketch.replace("LED_PIN = 8", "LED_PIN = 7");
  const result = checkLedSketch(source);
  assert.equal(result.ok, false);
  assert.match(result.messages.join(" "), /D8/);
});
