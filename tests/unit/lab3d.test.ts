import test from "node:test";
import assert from "node:assert/strict";
import {
  checkButtonSketch,
  checkLedSketch,
  defaultButtonSketch,
  defaultLedSketch,
  lab3dProject,
  lab3dProjects,
  labReadiness,
} from "../../src/lib/lab3d";

test("both real-engine projects retain valid Arduino pin mappings", () => {
  assert.equal(checkLedSketch(defaultLedSketch).ok, true);
  assert.equal(checkButtonSketch(defaultButtonSketch).ok, true);
});

test("all 3D projects require complete assembly and reviewed wiring", () => {
  for (const project of lab3dProjects) {
    assert.equal(labReadiness(project, [], [], project.defaultSketch).ready, false);
    assert.equal(
      labReadiness(
        project,
        project.parts.map((part) => part.id),
        project.connections.map((wire) => wire.id),
        project.defaultSketch,
      ).ready,
      true,
    );
  }
});

test("LED and button projects preserve the real Uno pins used by the AVR engine", () => {
  const led = lab3dProject("led-blink");
  const button = lab3dProject("button-light");
  assert.ok(led.terminals.some((terminal) => terminal.id === "uno-d8"));
  assert.ok(button.terminals.some((terminal) => terminal.id === "uno-d2"));
  assert.ok(button.terminals.some((terminal) => terminal.id === "uno-d8"));
});

test("bad real-hardware pin edits are rejected before either engine runs", () => {
  assert.equal(checkLedSketch(defaultLedSketch.replace("LED_PIN = 8", "LED_PIN = 7")).ok, false);
  assert.equal(checkButtonSketch(defaultButtonSketch.replace("BUTTON_PIN = 2", "BUTTON_PIN = 3")).ok, false);
});
