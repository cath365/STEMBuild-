// Logic analyzer model: per-pin edge history in emulated CPU cycles (16 MHz), and measurements.
export const CPU_HZ = 16_000_000;

export type PinHistory = { base: boolean; edges: { cycle: number; high: boolean }[] };

/** Adds new edges and discards history older than `keepCycles`, remembering the level it left behind. */
export function appendEdges(history: Map<number, PinHistory>, edges: { pin: number; high: boolean; cycle: number }[], now: number, keepCycles: number, initial: boolean[] = []) {
  for (const edge of edges) {
    if (!history.has(edge.pin)) history.set(edge.pin, { base: !edge.high, edges: [] });
    history.get(edge.pin)!.edges.push({ cycle: edge.cycle, high: edge.high });
  }
  initial.forEach((level, pin) => { if (!history.has(pin)) history.set(pin, { base: level, edges: [] }); });
  const cutoff = now - keepCycles;
  for (const entry of history.values()) {
    let drop = 0;
    while (drop < entry.edges.length && entry.edges[drop].cycle < cutoff) drop++;
    if (drop) { entry.base = entry.edges[drop - 1].high; entry.edges.splice(0, drop); }
  }
}

export function levelAt(entry: PinHistory, cycle: number) {
  let level = entry.base;
  for (const edge of entry.edges) { if (edge.cycle > cycle) break; level = edge.high; }
  return level;
}

/** Step-wave segments [from, to) clipped to the window, for drawing. */
export function segments(entry: PinHistory, from: number, to: number) {
  const out: { from: number; to: number; high: boolean }[] = [];
  let level = levelAt(entry, from), start = from;
  for (const edge of entry.edges) {
    if (edge.cycle <= from) continue;
    if (edge.cycle >= to) break;
    if (edge.high !== level) { out.push({ from: start, to: edge.cycle, high: level }); start = edge.cycle; level = edge.high; }
  }
  out.push({ from: start, to, high: level });
  return out;
}

export type Measurement = { frequencyHz: number | null; duty: number; highUs: number | null; lowUs: number | null; edges: number };

export function measure(entry: PinHistory, from: number, to: number): Measurement {
  const segs = segments(entry, from, to);
  const span = Math.max(1, to - from);
  const highCycles = segs.filter((s) => s.high).reduce((sum, s) => sum + (s.to - s.from), 0);
  const rises = entry.edges.filter((e) => e.high && e.cycle > from && e.cycle < to).map((e) => e.cycle);
  const frequencyHz = rises.length >= 2 ? ((rises.length - 1) * CPU_HZ) / (rises[rises.length - 1] - rises[0]) : null;
  // Only complete pulses count (both ends inside the window).
  const inner = segs.slice(1, -1);
  const lastHigh = [...inner].reverse().find((s) => s.high);
  const lastLow = [...inner].reverse().find((s) => !s.high);
  return {
    frequencyHz,
    duty: highCycles / span,
    highUs: lastHigh ? ((lastHigh.to - lastHigh.from) * 1e6) / CPU_HZ : null,
    lowUs: lastLow ? ((lastLow.to - lastLow.from) * 1e6) / CPU_HZ : null,
    edges: segs.length - 1,
  };
}

export function formatDuration(us: number) {
  if (us >= 1e6) return `${(us / 1e6).toPrecision(3)} s`;
  if (us >= 1e3) return `${(us / 1e3).toPrecision(3)} ms`;
  return `${us.toPrecision(3)} µs`;
}

export function formatFrequency(hz: number) {
  if (hz >= 1e6) return `${(hz / 1e6).toPrecision(3)} MHz`;
  if (hz >= 1e3) return `${(hz / 1e3).toPrecision(3)} kHz`;
  return `${hz.toPrecision(3)} Hz`;
}
