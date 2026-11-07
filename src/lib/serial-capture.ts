// Parsing, summarising and validating readings captured from a real board over USB serial.
// Shared by the browser monitor and the server action, so it has no browser or Node dependencies.

export const MAX_SERIES = 4;
export const MAX_STORED_SAMPLES = 600;
export const MAX_LOG_EXCERPT = 40;
export const BAUD_RATES = [9600, 19200, 38400, 57600, 115200] as const;

export type SerialPoint = { t: number; values: Record<string, number> };

export type SerialCapture = {
  version: 1;
  baudRate: number;
  startedAt: string;
  durationMs: number;
  totalLines: number;
  series: string[];
  samples: { t: number; v: (number | null)[] }[];
  logExcerpt: string[];
};

export type SeriesSummary = { name: string; count: number; min: number; max: number; mean: number; latest: number };

const LABEL = /^[A-Za-z_][\w .%/()°-]{0,23}$/;
const NUMBER = /^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?$/;

/**
 * Understands the Arduino Serial Plotter conventions:
 *   "24.5 61"            → value1, value2
 *   "24.5,61"            → value1, value2
 *   "temp:24.5,hum:61"   → temp, hum
 *   "Temp = 24.5 C"      → Temp
 * Lines with no numbers (boot messages, prose) return null and are shown only in the log.
 */
function tokenize(text: string) {
  const parts = text.split(/[,\t;]+/).map((part) => part.trim()).filter(Boolean);
  if (parts.length > 1) return parts;
  // Space-separated values ("24.5 61" or "temp:24.5 hum:61"); otherwise keep "Temp = 24.5 C" whole.
  const words = text.split(/\s+/);
  if (words.length > 1 && words.every((word) => NUMBER.test(word) || COMPACT_PAIR.test(word))) return words;
  return [text];
}

const COMPACT_PAIR = /^[A-Za-z_][\w.%/()°-]*[:=][-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?$/;
const PAIR = /^(.+?)\s*[:=]\s*([-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?)\s*[^\d\s]{0,4}$/;

export function parseSerialLine(line: string): Record<string, number> | null {
  const text = line.trim();
  if (!text || text.length > 240) return null;
  const out: Record<string, number> = {};
  let unnamed = 0;
  for (const token of tokenize(text)) {
    const pair = token.match(PAIR);
    if (pair && LABEL.test(pair[1].trim())) {
      const value = Number(pair[2]);
      if (Number.isFinite(value)) out[pair[1].trim()] = value;
      continue;
    }
    if (NUMBER.test(token)) {
      const value = Number(token);
      if (Number.isFinite(value)) out[`value${++unnamed}`] = value;
    }
  }
  return Object.keys(out).length ? out : null;
}

export function seriesNames(points: SerialPoint[]) {
  const names: string[] = [];
  for (const point of points) {
    for (const name of Object.keys(point.values)) {
      if (!names.includes(name)) names.push(name);
      if (names.length === MAX_SERIES) return names;
    }
  }
  return names;
}

export function summarize(points: SerialPoint[], names = seriesNames(points)): SeriesSummary[] {
  return names.map((name) => {
    let count = 0, min = Infinity, max = -Infinity, sum = 0, latest = NaN;
    for (const point of points) {
      const value = point.values[name];
      if (value === undefined) continue;
      count++; sum += value; latest = value;
      if (value < min) min = value;
      if (value > max) max = value;
    }
    return { name, count, min: count ? min : NaN, max: count ? max : NaN, mean: count ? sum / count : NaN, latest };
  });
}

/** Evenly thins a series to at most `limit` points, always keeping the first and last. */
export function downsample<T>(items: T[], limit: number): T[] {
  if (items.length <= limit) return items;
  const step = (items.length - 1) / (limit - 1);
  return Array.from({ length: limit }, (_, index) => items[Math.round(index * step)]);
}

export function buildCapture(points: SerialPoint[], options: { baudRate: number; startedAt: Date; totalLines: number; log: string[] }): SerialCapture {
  const names = seriesNames(points);
  const first = points[0]?.t ?? 0;
  const kept = downsample(points, MAX_STORED_SAMPLES);
  return {
    version: 1,
    baudRate: options.baudRate,
    startedAt: options.startedAt.toISOString(),
    durationMs: points.length ? Math.max(0, points[points.length - 1].t - first) : 0,
    totalLines: options.totalLines,
    series: names,
    samples: kept.map((point) => ({ t: Math.round(point.t - first), v: names.map((name) => point.values[name] ?? null) })),
    logExcerpt: options.log.slice(-MAX_LOG_EXCERPT).map((line) => line.slice(0, 160)),
  };
}

export function captureToPoints(capture: SerialCapture): SerialPoint[] {
  return capture.samples.map((sample) => ({
    t: sample.t,
    values: Object.fromEntries(capture.series.flatMap((name, index) => sample.v[index] == null ? [] : [[name, sample.v[index] as number]])),
  }));
}

export function captureToCsv(capture: SerialCapture) {
  const escape = (value: string) => /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
  const header = ["time_ms", ...capture.series].map(escape).join(",");
  return [header, ...capture.samples.map((sample) => [sample.t, ...sample.v.map((value) => value ?? "")].join(","))].join("\n");
}

/** Strict server-side validation. Returns null for an empty field; throws for anything malformed. */
export function parseCaptureJson(raw: unknown): SerialCapture | null {
  if (raw == null || raw === "") return null;
  if (typeof raw !== "string" || raw.length > 120_000) throw new Error("The hardware capture is too large or malformed.");
  let data: unknown;
  try { data = JSON.parse(raw); } catch { throw new Error("The hardware capture could not be read."); }
  const fail = () => { throw new Error("The hardware capture is malformed."); };
  if (!data || typeof data !== "object") fail();
  const c = data as Record<string, unknown>;
  if (c.version !== 1) fail();
  if (!BAUD_RATES.includes(c.baudRate as (typeof BAUD_RATES)[number])) fail();
  if (typeof c.startedAt !== "string" || Number.isNaN(Date.parse(c.startedAt))) fail();
  if (typeof c.durationMs !== "number" || !Number.isFinite(c.durationMs) || c.durationMs < 0 || c.durationMs > 24 * 3600_000) fail();
  if (typeof c.totalLines !== "number" || !Number.isInteger(c.totalLines) || c.totalLines < 0) fail();
  if (!Array.isArray(c.series) || c.series.length < 1 || c.series.length > MAX_SERIES || !c.series.every((name) => typeof name === "string" && LABEL.test(name))) fail();
  const width = (c.series as string[]).length;
  if (!Array.isArray(c.samples) || c.samples.length < 2 || c.samples.length > MAX_STORED_SAMPLES) fail();
  for (const sample of c.samples as unknown[]) {
    const s = sample as { t?: unknown; v?: unknown };
    if (!s || typeof s.t !== "number" || !Number.isFinite(s.t) || s.t < 0) fail();
    if (!Array.isArray(s.v) || s.v.length !== width || !s.v.every((value) => value === null || (typeof value === "number" && Number.isFinite(value)))) fail();
  }
  if (!Array.isArray(c.logExcerpt) || c.logExcerpt.length > MAX_LOG_EXCERPT || !c.logExcerpt.every((line) => typeof line === "string" && line.length <= 160)) fail();
  return {
    version: 1,
    baudRate: c.baudRate as number,
    startedAt: new Date(c.startedAt as string).toISOString(),
    durationMs: c.durationMs as number,
    totalLines: c.totalLines as number,
    series: c.series as string[],
    samples: c.samples as SerialCapture["samples"],
    logExcerpt: c.logExcerpt as string[],
  };
}

/** Read a stored Prisma Json value back into a capture, ignoring anything invalid. */
export function readStoredCapture(value: unknown): SerialCapture | null {
  if (!value) return null;
  try { return parseCaptureJson(JSON.stringify(value)); } catch { return null; }
}

export function formatReading(value: number) {
  if (!Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  return abs >= 1000 ? value.toFixed(0) : abs >= 100 ? value.toFixed(1) : value.toFixed(2).replace(/\.?0+$/, "");
}
