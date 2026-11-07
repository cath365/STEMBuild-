import test from "node:test";
import assert from "node:assert/strict";
import { projectBySlug } from "../../src/lib/build-catalog";
import { ownedBoardNames, projectReadiness } from "../../src/lib/my-components";

test("owned microcontrollers map to the board names projects use", () => {
  const boards = ownedBoardNames(["stm32", "esp32-cam", "led"]);
  assert.ok(boards.has("STM32"), "STM32 development board counts as an STM32 board");
  assert.ok(boards.has("ESP32"), "ESP32-CAM counts as an ESP32 board");
  assert.equal(boards.size, 2);
});

test("a project is ready only with every required part and a compatible board", () => {
  const project = projectBySlug("first-led")!;
  const parts = ["breadboard", "jumper-wires", "led", "resistor-330"];
  assert.deepEqual(projectReadiness(project, parts), { missing: [], hasBoard: false, ready: false });
  assert.equal(projectReadiness(project, [...parts, "stm32"]).ready, true);
  assert.deepEqual(projectReadiness(project, ["arduino-uno", "led"]).missing, ["breadboard", "jumper-wires", "resistor-330"]);
});
