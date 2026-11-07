// Engineering calculators used by the Virtual Electronics Lab. Pure functions, no browser APIs.

const PREFIXES: [number, string][] = [[1e9, "G"], [1e6, "M"], [1e3, "k"], [1, ""], [1e-3, "m"], [1e-6, "µ"], [1e-9, "n"], [1e-12, "p"]];

/** 4700 → "4.7 kΩ", 0.0215 → "21.5 mA". */
export function formatSI(value: number, unit: string, digits = 3) {
  if (!Number.isFinite(value)) return "—";
  if (value === 0) return `0 ${unit}`;
  const abs = Math.abs(value);
  const [scale, prefix] = PREFIXES.find(([factor]) => abs >= factor * 0.9995) ?? PREFIXES[PREFIXES.length - 1];
  return `${Number((value / scale).toPrecision(digits))} ${prefix}${unit}`;
}

const MULTIPLIERS: Record<string, number> = { p: 1e-12, n: 1e-9, u: 1e-6, "µ": 1e-6, m: 1e-3, "": 1, r: 1, R: 1, k: 1e3, K: 1e3, M: 1e6, G: 1e9 };

/** Parses how engineers write values: "4.7k", "4k7", "10 kΩ", "100n", "2.2M", "0.5", "1u". NaN if unreadable. */
export function parseSI(input: string) {
  const text = input.trim().replace(/\s+/g, "").replace(/(ohms?|Ω|F|A|V|W|Hz)$/i, "");
  const embedded = text.match(/^(\d+)([pnuµmrRkKMG])(\d+)$/);
  if (embedded) return Number(`${embedded[1]}.${embedded[3]}`) * MULTIPLIERS[embedded[2]];
  const plain = text.match(/^([-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?)([pnuµmrkKMG]?)$/);
  return plain ? Number(plain[1]) * MULTIPLIERS[plain[2]] : NaN;
}

export const E12 =[1.0, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2];
export const E24 = [1.0, 1.1, 1.2, 1.3, 1.5, 1.6, 1.8, 2.0, 2.2, 2.4, 2.7, 3.0, 3.3, 3.6, 3.9, 4.3, 4.7, 5.1, 5.6, 6.2, 6.8, 7.5, 8.2, 9.1];

/** Nearest standard resistor value; "up" picks the next value at or above (the safe choice for current limiting). */
export function standardResistor(ohms: number, series: number[] = E12, mode: "nearest" | "up" = "nearest") {
  if (!(ohms > 0) || !Number.isFinite(ohms)) return NaN;
  const decade = Math.floor(Math.log10(ohms));
  const candidates = [decade - 1, decade, decade + 1].flatMap((d) => series.map((m) => Number((m * 10 ** d).toPrecision(3))));
  if (mode === "up") return candidates.filter((value) => value >= ohms * 0.9999).sort((a, b) => a - b)[0];
  return candidates.reduce((best, value) => Math.abs(Math.log(value / ohms)) < Math.abs(Math.log(best / ohms)) ? value : best);
}

// ---------- Resistor colour code ----------

export type BandColour = "black" | "brown" | "red" | "orange" | "yellow" | "green" | "blue" | "violet" | "grey" | "white" | "gold" | "silver";

export const BAND_COLOURS: Record<BandColour, { hex: string; digit?: number; multiplier: number; tolerance?: number }> = {
  black: { hex: "#1b1b1b", digit: 0, multiplier: 1 },
  brown: { hex: "#7a4a24", digit: 1, multiplier: 10, tolerance: 1 },
  red: { hex: "#d32f2f", digit: 2, multiplier: 100, tolerance: 2 },
  orange: { hex: "#ef7d1a", digit: 3, multiplier: 1e3 },
  yellow: { hex: "#f4d03f", digit: 4, multiplier: 1e4 },
  green: { hex: "#2e8b57", digit: 5, multiplier: 1e5, tolerance: 0.5 },
  blue: { hex: "#1f5fd1", digit: 6, multiplier: 1e6, tolerance: 0.25 },
  violet: { hex: "#7b3fb0", digit: 7, multiplier: 1e7, tolerance: 0.1 },
  grey: { hex: "#8a8a8a", digit: 8, multiplier: 1e8, tolerance: 0.05 },
  white: { hex: "#f5f5f5", digit: 9, multiplier: 1e9 },
  gold: { hex: "#c9a227", multiplier: 0.1, tolerance: 5 },
  silver: { hex: "#b8bcc2", multiplier: 0.01, tolerance: 10 },
};

export const DIGIT_COLOURS = (Object.keys(BAND_COLOURS) as BandColour[]).filter((c) => BAND_COLOURS[c].digit !== undefined);
export const MULTIPLIER_COLOURS = Object.keys(BAND_COLOURS) as BandColour[];
export const TOLERANCE_COLOURS = (Object.keys(BAND_COLOURS) as BandColour[]).filter((c) => BAND_COLOURS[c].tolerance !== undefined);

/** Bands in reading order: 2 or 3 digit bands, a multiplier band, then a tolerance band. */
export function resistorFromBands(bands: BandColour[]) {
  if (bands.length !== 4 && bands.length !== 5) throw new Error("A resistor has 4 or 5 bands.");
  const digits = bands.slice(0, bands.length - 2);
  let significant = 0;
  for (const band of digits) {
    const digit = BAND_COLOURS[band].digit;
    if (digit === undefined) throw new Error(`${band} cannot be a digit band.`);
    significant = significant * 10 + digit;
  }
  const ohms = Number((significant * BAND_COLOURS[bands[bands.length - 2]].multiplier).toPrecision(6));
  const tolerance = BAND_COLOURS[bands[bands.length - 1]].tolerance;
  if (tolerance === undefined) throw new Error(`${bands[bands.length - 1]} is not a tolerance colour.`);
  return { ohms, tolerance, min: ohms * (1 - tolerance / 100), max: ohms * (1 + tolerance / 100) };
}

export function bandsFromResistor(ohms: number, bandCount: 4 | 5 = 4, tolerance: BandColour = bandCount === 4 ? "gold" : "brown"): BandColour[] | null {
  if (!(ohms >= 0.1) || ohms > 999e9) return null;
  const digitCount = bandCount - 2;
  let exponent = Math.floor(Math.log10(ohms)) - (digitCount - 1);
  let mantissa = Math.round(ohms / 10 ** exponent);
  if (mantissa >= 10 ** digitCount) { mantissa = Math.round(mantissa / 10); exponent++; }
  const multiplier = (Object.keys(BAND_COLOURS) as BandColour[]).find((c) => Math.abs(Math.log10(BAND_COLOURS[c].multiplier) - exponent) < 1e-9);
  if (!multiplier) return null;
  const digits = String(mantissa).padStart(digitCount, "0").split("").map((d) => DIGIT_COLOURS[Number(d)]);
  return [...digits, multiplier, tolerance];
}

// ---------- Capacitor code (e.g. 104 = 100 nF) ----------

export function capacitorFromCode(code: string) {
  const match = code.trim().toUpperCase().match(/^(\d)(\d)(\d)([BCDFGJKMZ])?$/);
  if (!match) return null;
  const picofarads = Number(`${match[1]}${match[2]}`) * 10 ** Number(match[3]);
  const tolerances: Record<string, string> = { B: "±0.1 pF", C: "±0.25 pF", D: "±0.5 pF", F: "±1%", G: "±2%", J: "±5%", K: "±10%", M: "±20%", Z: "+80/−20%" };
  return { farads: picofarads * 1e-12, tolerance: match[4] ? tolerances[match[4]] : null };
}

// ---------- Circuit formulas ----------

export type OhmInput = { volts?: number; amps?: number; ohms?: number; watts?: number };

/** Give any two of V, I, R, P and the other two are solved. */
export function solveOhm(input: OhmInput) {
  const known = Object.entries(input).filter(([, v]) => v !== undefined && Number.isFinite(v)) as [keyof OhmInput, number][];
  if (known.length !== 2) throw new Error("Enter exactly two values.");
  let { volts: v, amps: i, ohms: r, watts: p } = input;
  if (v !== undefined && i !== undefined) { r = v / i; p = v * i; }
  else if (v !== undefined && r !== undefined) { i = v / r; p = v * i; }
  else if (v !== undefined && p !== undefined) { i = p / v; r = v / i; }
  else if (i !== undefined && r !== undefined) { v = i * r; p = v * i; }
  else if (i !== undefined && p !== undefined) { v = p / i; r = v / i; }
  else if (r !== undefined && p !== undefined) { v = Math.sqrt(p * r); i = v / r; }
  return { volts: v!, amps: i!, ohms: r!, watts: p! };
}

export function ledResistor(supplyVolts: number, forwardVolts: number, currentAmps: number) {
  const exact = (supplyVolts - forwardVolts) / currentAmps;
  if (!(exact > 0)) return null;
  const standard = standardResistor(exact, E12, "up");
  const actualCurrent = (supplyVolts - forwardVolts) / standard;
  const resistorWatts = actualCurrent ** 2 * standard;
  return { exact, standard, actualCurrent, resistorWatts, ratingWatts: resistorWatts < 0.125 ? 0.125 : resistorWatts < 0.25 ? 0.25 : resistorWatts < 0.5 ? 0.5 : 1 };
}

export function voltageDivider(vin: number, r1: number, r2: number) {
  const vout = vin * r2 / (r1 + r2);
  return { vout, current: vin / (r1 + r2), ratio: r2 / (r1 + r2) };
}

export function seriesResistance(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0);
}

export function parallelResistance(values: number[]) {
  if (values.some((value) => value === 0)) return 0;
  return 1 / values.reduce((sum, value) => sum + 1 / value, 0);
}

export function rcTiming(ohms: number, farads: number) {
  const tau = ohms * farads;
  return { tau, fullCharge: 5 * tau, cutoffHz: 1 / (2 * Math.PI * tau) };
}

/** NE555 astable: R1 between VCC and DIS, R2 between DIS and THR/TRIG. */
export function timer555(r1: number, r2: number, farads: number) {
  const high = Math.LN2 * (r1 + r2) * farads;
  const low = Math.LN2 * r2 * farads;
  return { frequency: 1 / (high + low), high, low, duty: high / (high + low) };
}

/** Practical estimate: usable capacity is derated (self-discharge, cut-off voltage, regulator losses). */
export function batteryLife(capacityMah: number, loadMa: number, derating = 0.8) {
  return { hours: (capacityMah * derating) / loadMa };
}
