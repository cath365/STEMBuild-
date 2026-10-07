import test from "node:test";
import assert from "node:assert/strict";
import {
  checkButtonSketch,
  checkLedSketch,
  connectionForTerminals,
  defaultButtonSketch,
  defaultLedSketch,
  lab3dProject,
  lab3dProjects,
  labReadiness,
} from "../../src/lib/lab3d";

test("3D Lab project definitions have unique parts, terminals and connections", () => {
  for (const project of lab3dProjects) {
    assert.equal(new Set(project.parts.map((part) => part.id)).size, project.parts.length, `${project.slug} duplicate part`);
    assert.equal(new Set(project.terminals.map((terminal) => terminal.id)).size, project.terminals.length, `${project.slug} duplicate terminal`);
    assert.equal(new Set(project.connections.map((wire) => wire.id)).size, project.connections.length, `${project.slug} duplicate connection`);
  }
});

test("default LED sketch maps to D8 and blink behavior", () => {
  const result = checkLedSketch(defaultLedSketch);
  assert.equal(result.ok, true);
  assert.equal(result.highDelayMs, 500);
  assert.equal(result.lowDelayMs, 500);
});

test("default button sketch maps D2 input and D8 output", () => {
  const result = checkButtonSketch(defaultButtonSketch);
  assert.equal(result.ok, true);
});

test("each 3D project blocks Run until assembly, wiring and code are ready", () => {
  for (const project of lab3dProjects) {
    const incomplete = labReadiness(project, [], [], project.defaultSketch);
    assert.equal(incomplete.ready, false);

    const ready = labReadiness(
      project,
      project.parts.map((part) => part.id),
      project.connections.map((wire) => wire.id),
      project.defaultSketch,
    );
    assert.equal(ready.ready, true, `${project.slug} should be ready`);
  }
});

test("tap-to-wire resolves reviewed terminal pairs only", () => {
  const led = lab3dProject("led-blink");
  assert.equal(connectionForTerminals(led, "uno-d8", "r-in")?.id, "d8-resistor");
  assert.equal(connectionForTerminals(led, "r-in", "uno-d8")?.id, "d8-resistor");
  assert.equal(connectionForTerminals(led, "uno-d8", "led-k"), undefined);
});

test("3D Lab catches code that no longer matches physical wiring", () => {
  assert.equal(checkLedSketch(defaultLedSketch.replace("LED_PIN = 8", "LED_PIN = 7")).ok, false);
  assert.equal(checkButtonSketch(defaultButtonSketch.replace("BUTTON_PIN = 2", "BUTTON_PIN = 3")).ok, false);
});
