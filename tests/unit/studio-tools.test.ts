import test from "node:test";
import assert from "node:assert/strict";
import { appendEdges, levelAt, measure, segments, CPU_HZ, type PinHistory } from "../../src/lib/studio/analyzer";
import { compileLineOffset, parseCompilerErrors } from "../../src/lib/studio/compile-errors";
import { decodeBuild, encodeBuild } from "../../src/lib/studio/share";
import { STUDIO_EXAMPLES } from "../../src/lib/studio/examples";

test("share links round-trip a whole build and reject tampered data", async () => {
  for (const example of STUDIO_EXAMPLES) {
    const encoded = await encodeBuild(example.doc);
    assert.match(encoded, /^[A-Za-z0-9_-]+$/);
    assert.ok(encoded.length < JSON.stringify(example.doc).length, `${example.id} compresses`);
    assert.deepEqual(await decodeBuild(encoded), example.doc);
  }
  assert.equal(await decodeBuild("not+valid/base64"), null);
  assert.equal(await decodeBuild("AAAA"), null);
  assert.equal(await decodeBuild(""), null);
});

const us = (n: number) => (n * CPU_HZ) / 1e6;

test("analyzer measures a 1 kHz, 25% duty PWM signal", () => {
  const history = new Map<number, PinHistory>();
  const edges = [];
  for (let k = 0; k < 20; k++) { edges.push({ pin: 9, high: true, cycle: us(k * 1000) }); edges.push({ pin: 9, high: false, cycle: us(k * 1000 + 250) }); }
  appendEdges(history, edges, us(20_000), us(1e6));
  const entry = history.get(9)!;
  const m = measure(entry, us(2_000), us(12_000));
  assert.ok(Math.abs(m.frequencyHz! - 1000) < 1e-6);
  assert.ok(Math.abs(m.duty - 0.25) < 1e-9);
  assert.ok(Math.abs(m.highUs! - 250) < 1e-9);
  assert.ok(Math.abs(m.lowUs! - 750) < 1e-9);
  assert.equal(levelAt(entry, us(2_100)), true);
  assert.equal(levelAt(entry, us(2_300)), false);
  // The window starts on a rising edge: one high pulse, then the low gap.
  assert.deepEqual(segments(entry, us(2_000), us(3_000)).map((s) => s.high), [true, false]);
});

test("analyzer prunes old history but keeps the level it left behind", () => {
  const history = new Map<number, PinHistory>();
  appendEdges(history, [{ pin: 13, high: true, cycle: 100 }, { pin: 13, high: false, cycle: 200 }, { pin: 13, high: true, cycle: 900 }], 1000, 500);
  const entry = history.get(13)!;
  assert.deepEqual(entry.edges, [{ cycle: 900, high: true }]);
  assert.equal(entry.base, false);
  const steady = measure(entry, 0, 800);
  assert.equal(steady.frequencyHz, null);
  assert.equal(steady.duty, 0);
});

test("compiler errors point at the learner's own lines", () => {
  const source = "void setup() {\n  pinMode(13, OUTPUT)\n}\nvoid loop() {\n  digitalWrit(13, HIGH);\n}\n";
  assert.equal(compileLineOffset(source), 1);
  const output = [
    "/tmp/sketch.cpp: In function 'void setup()':",
    "/tmp/sketch.cpp:3:22: error: expected ';' before '}' token",
    "/tmp/sketch.cpp:6:3: error: 'digitalWrit' was not declared in this scope",
    "/tmp/sketch.cpp:6:3: note: suggested alternative: 'digitalWrite'",
    "/usr/include/Arduino.h:120:5: error: something inside a library header",
  ].join("\n");
  const diagnostics = parseCompilerErrors(output, source);
  assert.deepEqual(diagnostics.map((d) => [d.line, d.severity]), [[2, "error"], [5, "error"], [5, "note"]]);
  assert.equal(diagnostics[1].message, "'digitalWrit' was not declared in this scope");
  assert.equal(compileLineOffset(`#include <Arduino.h>\n${source}`), 0);
});
