import test from "node:test";
import assert from "node:assert/strict";
import { buildCapture, captureToCsv, downsample, formatReading, MAX_STORED_SAMPLES, parseCaptureJson, parseSerialLine, readStoredCapture, summarize, type SerialPoint } from "../../src/lib/serial-capture";

test("parses Arduino Serial Plotter formats", () => {
  assert.deepEqual(parseSerialLine("temp:24.5,humidity:61"), { temp: 24.5, humidity: 61 });
  assert.deepEqual(parseSerialLine("temp:24.5 humidity:61"), { temp: 24.5, humidity: 61 });
  assert.deepEqual(parseSerialLine("24.5 61"), { value1: 24.5, value2: 61 });
  assert.deepEqual(parseSerialLine("24.5,61\r"), { value1: 24.5, value2: 61 });
  assert.deepEqual(parseSerialLine("512\t2.50"), { value1: 512, value2: 2.5 });
  assert.deepEqual(parseSerialLine("Temp = 24.5 C"), { Temp: 24.5 });
  assert.deepEqual(parseSerialLine("Distance: 12 cm"), { Distance: 12 });
  assert.deepEqual(parseSerialLine("-3.2e1"), { value1: -32 });
});

test("ignores prose, boot noise and oversized lines", () => {
  assert.equal(parseSerialLine("STEMBuild monitor ready"), null);
  assert.equal(parseSerialLine(""), null);
  assert.equal(parseSerialLine("ets Jun  8 2016 00:22:57"), null);
  assert.equal(parseSerialLine("9".repeat(300)), null);
});

const points: SerialPoint[] = Array.from({ length: 1000 }, (_, index) => ({ t: 5000 + index * 100, values: { temp: 20 + index / 100, ...(index % 2 ? { hum: 50 } : {}) } }));

test("summarises and downsamples captures, keeping the endpoints", () => {
  const [temp, hum] = summarize(points);
  assert.equal(temp.count, 1000);
  assert.equal(temp.min, 20);
  assert.ok(Math.abs(temp.max - 29.99) < 1e-9);
  assert.equal(hum.count, 500);
  const thinned = downsample(points, 10);
  assert.equal(thinned.length, 10);
  assert.equal(thinned[0], points[0]);
  assert.equal(thinned[9], points[999]);
});

test("built captures survive strict server validation and CSV export", () => {
  const capture = buildCapture(points, { baudRate: 9600, startedAt: new Date("2026-11-07T10:00:00Z"), totalLines: 1003, log: ["ready", "temp:20"] });
  assert.equal(capture.samples.length, MAX_STORED_SAMPLES);
  assert.equal(capture.samples[0].t, 0);
  assert.equal(capture.durationMs, 99_900);
  assert.deepEqual(capture.series, ["temp", "hum"]);
  const parsed = parseCaptureJson(JSON.stringify(capture));
  assert.deepEqual(parsed, capture);
  assert.deepEqual(readStoredCapture(capture), capture);
  const csv = captureToCsv(capture).split("\n");
  assert.equal(csv[0], "time_ms,temp,hum");
  assert.equal(csv[1], "0,20,");
});

test("rejects malformed or tampered captures", () => {
  const good = buildCapture(points.slice(0, 5), { baudRate: 115200, startedAt: new Date(), totalLines: 5, log: [] });
  assert.equal(parseCaptureJson(""), null);
  assert.equal(parseCaptureJson(null), null);
  assert.throws(() => parseCaptureJson("{not json"));
  assert.throws(() => parseCaptureJson(JSON.stringify({ ...good, baudRate: 1234 })));
  assert.throws(() => parseCaptureJson(JSON.stringify({ ...good, series: ["<script>"] })));
  assert.throws(() => parseCaptureJson(JSON.stringify({ ...good, samples: [{ t: 0, v: [1, 2] }, { t: 1, v: ["x", 2] }] })));
  assert.throws(() => parseCaptureJson(JSON.stringify({ ...good, samples: good.samples.map((s) => ({ ...s, v: [1] })) })));
  assert.throws(() => parseCaptureJson("x".repeat(130_000)));
  assert.equal(readStoredCapture({ version: 2 }), null);
});

test("formats readings compactly", () => {
  assert.equal(formatReading(24.5), "24.5");
  assert.equal(formatReading(20), "20");
  assert.equal(formatReading(0), "0");
  assert.equal(formatReading(512.34), "512.3");
  assert.equal(formatReading(1023.4), "1023");
  assert.equal(formatReading(NaN), "—");
});
