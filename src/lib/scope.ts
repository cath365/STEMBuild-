// Signal generator + time-domain circuit models for the virtual oscilloscope (pure functions).

export type Waveform = "sine" | "square" | "triangle" | "pwm";
export type Generator = { waveform: Waveform; frequency: number; amplitude: number; offset: number; duty: number };
export type ScopeCircuit = "direct" | "rc-lowpass" | "rc-highpass" | "half-wave" | "half-wave-smoothed";

export const CIRCUITS: { id: ScopeCircuit; name: string; summary: string }[] = [
  { id: "direct", name: "Probe the generator", summary: "CH1 and CH2 both measure the generator output." },
  { id: "rc-lowpass", name: "RC low-pass filter", summary: "The capacitor charges through R. High frequencies are smoothed away; this is how PWM becomes an analog voltage." },
  { id: "rc-highpass", name: "RC high-pass filter", summary: "Output is taken across R. Steady (DC) parts are blocked and only changes pass." },
  { id: "half-wave", name: "Half-wave rectifier", summary: "A diode only conducts one way, so the negative half of the wave is removed (minus ~0.7 V drop)." },
  { id: "half-wave-smoothed", name: "Rectifier + smoothing capacitor", summary: "A capacitor holds the peak between pulses, leaving a small ripple: the start of a DC power supply." },
];

const DIODE_DROP = 0.7;

export function generatorValue(g: Generator, t: number) {
  const phase = ((t * g.frequency) % 1 + 1) % 1;
  switch (g.waveform) {
    case "sine": return g.offset + g.amplitude * Math.sin(2 * Math.PI * phase);
    case "square": return g.offset + (phase < 0.5 ? g.amplitude : -g.amplitude);
    case "triangle": return g.offset + g.amplitude * (phase < 0.5 ? 4 * phase - 1 : 3 - 4 * phase);
    // PWM swings 0 → amplitude like an Arduino pin (offset ignored).
    case "pwm": return phase < g.duty ? g.amplitude : 0;
  }
}

export type Trace = { t: number[]; ch1: number[]; ch2: number[] };

/**
 * Simulates `settle` seconds so filters reach steady state, then captures a window of
 * `windowSeconds` starting at the first rising trigger crossing of CH1 at `triggerLevel`.
 */
export function simulateScope(options: { generator: Generator; circuit: ScopeCircuit; ohms: number; farads: number; loadOhms?: number; windowSeconds: number; triggerLevel: number; samples?: number }): Trace {
  const { generator, circuit, ohms, farads, windowSeconds, triggerLevel } = options;
  const samples = options.samples ?? 800;
  const tau = ohms * farads;
  const period = 1 / generator.frequency;
  const settle = Math.min(Math.max(5 * tau, 3 * period), 50 * period + 5 * tau);
  const dtCapture = windowSeconds / samples;
  // Integration step: fine enough for both the signal and the filter time constant.
  // Bounded so a fast signal on a slow timebase stays responsive (it aliases, as real scopes can).
  const dt = Math.max(Math.min(period / 400, tau > 0 ? tau / 20 : period / 400, dtCapture), settle / 400_000, windowSeconds / 200_000);
  let vc = 0;
  const step = (vin: number) => {
    switch (circuit) {
      case "direct": return vin;
      case "rc-lowpass": vc += ((vin - vc) / tau) * dt; return vc;
      case "rc-highpass": vc += ((vin - vc) / tau) * dt; return vin - vc;
      case "half-wave": return Math.max(0, vin - DIODE_DROP);
      case "half-wave-smoothed": {
        const charging = vin - DIODE_DROP;
        if (charging > vc) vc = charging;
        else vc -= (vc / ((options.loadOhms ?? ohms) * farads)) * dt;
        return Math.max(vc, 0);
      }
    }
  };

  let t = 0;
  let previous = generatorValue(generator, 0);
  let out = step(previous);
  while (t < settle) { t += dt; previous = generatorValue(generator, t); out = step(previous); }
  // Trigger: wait (at most two periods) for CH1 to rise through the trigger level.
  const triggerDeadline = t + 2 * period;
  while (t < triggerDeadline) {
    t += dt;
    const value = generatorValue(generator, t);
    out = step(value);
    const crossed = previous < triggerLevel && value >= triggerLevel;
    previous = value;
    if (crossed) break;
  }
  const trace: Trace = { t: [], ch1: [], ch2: [] };
  const start = t;
  let nextSample = start;
  while (trace.t.length < samples) {
    if (t >= nextSample) {
      trace.t.push(t - start);
      trace.ch1.push(generatorValue(generator, t));
      trace.ch2.push(out);
      nextSample += dtCapture;
    }
    t += dt;
    out = step(generatorValue(generator, t));
  }
  return trace;
}

export type Measurements = { max: number; min: number; vpp: number; mean: number; rms: number; frequency: number | null };

export function measure(values: number[], times: number[]): Measurements {
  let max = -Infinity, min = Infinity, sum = 0, squares = 0;
  for (const value of values) { if (value > max) max = value; if (value < min) min = value; sum += value; squares += value * value; }
  const mean = sum / values.length;
  // Frequency from rising crossings of the mid level (needs a visible swing).
  let frequency: number | null = null;
  if (max - min > 0.05) {
    const mid = (max + min) / 2;
    const hysteresis = (max - min) * 0.1;
    const crossings: number[] = [];
    let armed = values[0] < mid - hysteresis;
    for (let i = 1; i < values.length; i++) {
      if (values[i] < mid - hysteresis) armed = true;
      else if (armed && values[i] >= mid) { crossings.push(times[i]); armed = false; }
    }
    if (crossings.length >= 2) frequency = (crossings.length - 1) / (crossings[crossings.length - 1] - crossings[0]);
  }
  return { max, min, vpp: max - min, mean, rms: Math.sqrt(squares / values.length), frequency };
}

/** 1-2-5 sequence used by real oscilloscope knobs. */
export const TIMEBASES = [10e-6, 20e-6, 50e-6, 100e-6, 200e-6, 500e-6, 1e-3, 2e-3, 5e-3, 10e-3, 20e-3, 50e-3, 100e-3, 200e-3];
export const VOLTS_PER_DIV = [0.1, 0.2, 0.5, 1, 2, 5];
