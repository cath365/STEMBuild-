"use client";

// The 53 MB avr-gcc toolchain is fetched on first compile from a public CDN, with a mirror if
// the first is blocked. Both URLs are version-pinned (immutable), and the service worker keeps
// them so later compiles work offline and never re-download.
export const COMPILER_MIRRORS = [
  "https://cdn.jsdelivr.net/npm/@horang-corp/avr-gcc-wasm@0.2.0/",
  "https://unpkg.com/@horang-corp/avr-gcc-wasm@0.2.0/",
];

type RemoteModule = Record<string, any>;

function remoteImport(url: string): Promise<RemoteModule> {
  // Keep remote toolchains out of the main Next.js bundle. They load only after
  // a learner explicitly chooses Full Firmware Mode.
  const importer = new Function("url", "return import(url)") as (url: string) => Promise<RemoteModule>;
  return importer(url);
}

/** The AVR emulator ships with the site (code-split), so it needs no third-party server. */
async function loadAvr8(): Promise<RemoteModule> {
  return (await import("avr8js")) as unknown as RemoteModule;
}

function loadIntelHex(source: string, target: Uint8Array) {
  let upperAddress = 0;
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line.startsWith(":") || line.length < 11) continue;
    const byteCount = Number.parseInt(line.slice(1, 3), 16);
    const address = Number.parseInt(line.slice(3, 7), 16);
    const recordType = Number.parseInt(line.slice(7, 9), 16);
    if (recordType === 0x04) {
      upperAddress = Number.parseInt(line.slice(9, 13), 16) << 16;
      continue;
    }
    if (recordType !== 0x00) continue;
    const base = upperAddress + address;
    for (let index = 0; index < byteCount; index++) {
      const targetIndex = base + index;
      if (targetIndex < target.length) {
        target[targetIndex] = Number.parseInt(line.slice(9 + index * 2, 11 + index * 2), 16);
      }
    }
  }
}

export type FirmwareCompileResult = {
  hex: string;
  flashBytes: number;
  fitsTarget: boolean;
  compileMs: number;
};

export async function compileUnoFirmware(source: string): Promise<FirmwareCompileResult> {
  const started = performance.now();
  let compiler: RemoteModule;
  // Arduino IDE preprocessing implicitly provides Arduino.h for .ino sketches.
  // The WASM compiler consumes C++ directly, so mirror that standard step when needed.
  const compileSource = /#\s*include\s*[<"]Arduino\.h[>"]/.test(source) ? source : `#include <Arduino.h>\n${source}`;
  // Pick the first mirror whose compiler module downloads. A mirror is skipped only when the
  // download fails; errors in the learner's code are reported straight away, never retried.
  let base = "";
  let downloadError: unknown = null;
  for (const mirror of COMPILER_MIRRORS) {
    try { compiler = await remoteImport(`${mirror}index.js`); base = mirror; break; } catch (error) { downloadError = error; }
  }
  if (!base) throw new Error(`The compiler could not be downloaded (network): ${downloadError instanceof Error ? downloadError.message : String(downloadError)}`);
  const finish = (result: RemoteModule) => ({
    hex: String(result.hex),
    flashBytes: Number(result.flashBytes ?? 0),
    fitsTarget: Boolean(result.fitsTarget),
    compileMs: performance.now() - started,
  });
  try {
    return finish(await compiler!.compile({ source: compileSource, sensors: [], assetsBase: base }));
  } catch (workerError) {
    // Some browsers block a cross-origin module Worker. The package also
    // exposes the same compiler pipeline for direct execution.
    try {
      const direct = await remoteImport(`${base}firmware-builder.js`);
      return finish(await direct.buildFirmware({ source: compileSource, sensors: [], assetsBase: base }));
    } catch (directError) {
      const first = workerError instanceof Error ? workerError.message : String(workerError);
      const second = directError instanceof Error ? directError.message : String(directError);
      throw new Error(`Browser AVR compilation failed. Worker: ${first}. Direct fallback: ${second}`);
    }
  }
}

// ATmega328P data-space addresses: TCCRnA holds the COMnx1 enable bits, OCRnx the compare value.
const PWM_OUTPUTS = [
  { pin: 6, tccr: 0x44, bit: 0x80, ocr: 0x47 },  // OC0A
  { pin: 5, tccr: 0x44, bit: 0x20, ocr: 0x48 },  // OC0B
  { pin: 9, tccr: 0x80, bit: 0x80, ocr: 0x88 },  // OC1A (low byte)
  { pin: 10, tccr: 0x80, bit: 0x20, ocr: 0x8a }, // OC1B (low byte)
  { pin: 11, tccr: 0xb0, bit: 0x80, ocr: 0xb3 }, // OC2A
  { pin: 3, tccr: 0xb0, bit: 0x20, ocr: 0xb4 },  // OC2B
];

export type UnoBoardState = {
  /** Digital pins D0–D13: fraction of time HIGH during the last frame (0 = LOW, 1 = HIGH, between = PWM). */
  duty: number[];
  cycles: number;
};

export type UnoBoardSimulation = {
  /** Drive an input pin (D2–D13) HIGH or LOW, e.g. a push button. */
  setDigitalInput(pin: number, high: boolean): void;
  /** Set the voltage (0–5 V) seen by analogRead(A0–A5). */
  setAnalogVoltage(channel: number, volts: number): void;
  stop(): void;
};

/**
 * Runs compiled Uno firmware with every digital pin observable, serial output and analog inputs.
 * Pin mapping (ATmega328P): D0–D7 = PD0–PD7, D8–D13 = PB0–PB5, A0–A5 = ADC0–ADC5.
 */
export async function startUnoBoard(
  hex: string,
  options: { onFrame: (state: UnoBoardState) => void; onSerial: (text: string) => void; analogVolts: number[]; inputs: Record<number, boolean> },
): Promise<UnoBoardSimulation> {
  const avr = await loadAvr8();
  const program = new Uint16Array(0x4000);
  loadIntelHex(hex, new Uint8Array(program.buffer));

  const cpu = new avr.CPU(program);
  new avr.AVRTimer(cpu, avr.timer0Config);
  new avr.AVRTimer(cpu, avr.timer1Config);
  new avr.AVRTimer(cpu, avr.timer2Config);
  const portB = new avr.AVRIOPort(cpu, avr.portBConfig);
  new avr.AVRIOPort(cpu, avr.portCConfig);
  const portD = new avr.AVRIOPort(cpu, avr.portDConfig);
  const usart = new avr.AVRUSART(cpu, avr.usart0Config, 16_000_000);
  const adc = new avr.AVRADC(cpu, avr.adcConfig);
  adc.avcc = 5;
  options.analogVolts.forEach((volts, channel) => { adc.channelValues[channel] = volts; });

  let pending = "";
  usart.onByteTransmit = (byte: number) => { pending += String.fromCharCode(byte); };

  // Track how long each pin spends HIGH so PWM (analogWrite) shows as brightness.
  const level = new Array<boolean>(14).fill(false);
  const highCycles = new Array<number>(14).fill(0);
  const since = new Array<number>(14).fill(0);
  let frameStart = 0;
  const watch = (port: { addListener(listener: (value: number) => void): void }, firstPin: number, count: number) => {
    port.addListener((value: number) => {
      for (let bit = 0; bit < count; bit++) {
        const pin = firstPin + bit;
        const high = Boolean(value & (1 << bit));
        if (high === level[pin]) continue;
        if (level[pin]) highCycles[pin] += cpu.cycles - since[pin];
        level[pin] = high;
        since[pin] = cpu.cycles;
      }
    });
  };
  watch(portD, 0, 8);
  watch(portB, 8, 6);

  const setInput = (pin: number, high: boolean) => {
    if (pin >= 0 && pin <= 7) portD.setPin(pin, high);
    else if (pin >= 8 && pin <= 13) portB.setPin(pin - 8, high);
  };
  // Unconnected inputs float; default them HIGH so INPUT_PULLUP buttons read "released".
  for (let pin = 2; pin <= 13; pin++) setInput(pin, options.inputs[pin] ?? true);

  let stopped = false;
  let frame = 0;
  let lastTime = performance.now();
  const runChunk = (now: number) => {
    if (stopped) return;
    const elapsed = Math.min(Math.max(now - lastTime, 0), 50);
    lastTime = now;
    const stopAt = cpu.cycles + elapsed * 16_000;
    const deadline = performance.now() + 8;
    let instructions = 0;
    while (!stopped && cpu.cycles < stopAt) {
      avr.avrInstruction(cpu);
      cpu.tick();
      if (++instructions % 1024 === 0 && performance.now() >= deadline) break;
    }
    const total = Math.max(1, cpu.cycles - frameStart);
    const duty = level.map((high, pin) => {
      const value = (highCycles[pin] + (high ? cpu.cycles - Math.max(since[pin], frameStart) : 0)) / total;
      highCycles[pin] = 0;
      since[pin] = cpu.cycles;
      return Math.min(1, Math.max(0, value));
    });
    // Hardware PWM (analogWrite) is exact from the timer registers: while a pin's compare-output
    // mode is enabled, its duty is OCR / 255 (the Arduino core runs all three timers in 8-bit mode).
    for (const { pin, tccr, bit, ocr } of PWM_OUTPUTS) {
      if (cpu.data[tccr] & bit) duty[pin] = cpu.data[ocr] / 255;
    }
    frameStart = cpu.cycles;
    if (pending) { options.onSerial(pending); pending = ""; }
    options.onFrame({ duty, cycles: cpu.cycles });
    if (!stopped) frame = requestAnimationFrame(runChunk);
  };
  frame = requestAnimationFrame(runChunk);

  return {
    setDigitalInput: setInput,
    setAnalogVoltage(channel: number, volts: number) { adc.channelValues[channel] = Math.min(5, Math.max(0, volts)); },
    stop() { stopped = true; cancelAnimationFrame(frame); },
  };
}

export type StudioPinMode = "output" | "input" | "pullup";
export type StudioSnapshot = { duty: number[]; mode: StudioPinMode[]; freq: number[]; pulseUs: number[]; cycles: number };
export type StudioUltrasonic = { trigPin: number; echoPin: number; distanceCm: number };

export type UnoStudioSimulation = {
  setDigital(pin: number, high: boolean): void;
  setAnalog(channel: number, volts: number): void;
  setUltrasonic(links: StudioUltrasonic[]): void;
  /** Run `callback` after `micros` of emulated time (used for switch-bounce tests). */
  scheduleMicros(micros: number, callback: () => void): void;
  cycles(): number;
  /** Pin transitions since the last call (for the logic analyzer), with emulated cycle timestamps. */
  drainEdges(): StudioEdge[];
  /** Current logic level of D0–D13. */
  levels(): boolean[];
  stop(): void;
};

export type StudioEdge = { pin: number; high: boolean; cycle: number };
const MAX_PENDING_EDGES = 60_000;

/**
 * Full-board emulation for Maker Studio: every pin's mode and duty, tone frequency and pulse width,
 * analog inputs, serial output and an HC-SR04 echo generated in emulated microseconds.
 */
export async function startUnoStudio(
  hex: string,
  options: { onFrame: (snapshot: StudioSnapshot) => void; onSerial: (text: string) => void },
): Promise<UnoStudioSimulation> {
  const avr = await loadAvr8();
  const program = new Uint16Array(0x4000);
  loadIntelHex(hex, new Uint8Array(program.buffer));
  const cpu = new avr.CPU(program);
  new avr.AVRTimer(cpu, avr.timer0Config);
  new avr.AVRTimer(cpu, avr.timer1Config);
  new avr.AVRTimer(cpu, avr.timer2Config);
  const portB = new avr.AVRIOPort(cpu, avr.portBConfig);
  new avr.AVRIOPort(cpu, avr.portCConfig);
  const portD = new avr.AVRIOPort(cpu, avr.portDConfig);
  const usart = new avr.AVRUSART(cpu, avr.usart0Config, 16_000_000);
  const adc = new avr.AVRADC(cpu, avr.adcConfig);
  adc.avcc = 5;
  let pending = "";
  usart.onByteTransmit = (byte: number) => { pending += String.fromCharCode(byte); };

  const level = new Array<boolean>(14).fill(false);
  const highCycles = new Array<number>(14).fill(0);
  const since = new Array<number>(14).fill(0);
  const rises = new Array<number>(14).fill(0);
  const firstRise = new Array<number>(14).fill(-1);
  const lastRise = new Array<number>(14).fill(-1);
  const pulseUs = new Array<number>(14).fill(0);
  let frameStart = 0;
  let ultrasonic: StudioUltrasonic[] = [];
  const trigRise = new Array<number>(14).fill(-1);

  const setInput = (pin: number, high: boolean) => {
    if (pin >= 0 && pin <= 7) portD.setPin(pin, high);
    else if (pin >= 8 && pin <= 13) portB.setPin(pin - 8, high);
  };

  let edgeLog: StudioEdge[] = [];
  const onEdge = (pin: number, high: boolean) => {
    const now = cpu.cycles;
    if (edgeLog.length < MAX_PENDING_EDGES) edgeLog.push({ pin, high, cycle: now });
    if (high) {
      rises[pin]++;
      if (firstRise[pin] < 0) firstRise[pin] = now;
      lastRise[pin] = now;
      trigRise[pin] = now;
    } else if (lastRise[pin] >= 0) {
      pulseUs[pin] = (now - lastRise[pin]) / 16;
      // HC-SR04: a TRIG pulse of at least ~8 µs starts a measurement.
      for (const link of ultrasonic) {
        if (link.trigPin !== pin || trigRise[pin] < 0 || now - trigRise[pin] < 8 * 16) continue;
        const echoUs = link.distanceCm > 400 ? 38_000 : link.distanceCm * 58;
        cpu.addClockEvent(() => {
          setInput(link.echoPin, true);
          cpu.addClockEvent(() => setInput(link.echoPin, false), Math.round(echoUs * 16));
        }, 460 * 16);
      }
    }
  };

  const watch = (port: { addListener(listener: (value: number) => void): void }, firstPin: number, count: number) => {
    port.addListener((value: number) => {
      for (let bit = 0; bit < count; bit++) {
        const pin = firstPin + bit;
        const high = Boolean(value & (1 << bit));
        if (high === level[pin]) continue;
        if (level[pin]) highCycles[pin] += cpu.cycles - since[pin];
        level[pin] = high;
        since[pin] = cpu.cycles;
        onEdge(pin, high);
      }
    });
  };
  watch(portD, 0, 8);
  watch(portB, 8, 6);
  for (let pin = 0; pin <= 13; pin++) setInput(pin, false);

  const modeOf = (pin: number): StudioPinMode => {
    const state = pin < 8 ? portD.pinState(pin) : portB.pinState(pin - 8);
    return state === avr.PinState.Input ? "input" : state === avr.PinState.InputPullUp ? "pullup" : "output";
  };

  let stopped = false;
  let frame = 0;
  let lastTime = performance.now();
  const runChunk = (now: number) => {
    if (stopped) return;
    const elapsed = Math.min(Math.max(now - lastTime, 0), 50);
    lastTime = now;
    const stopAt = cpu.cycles + elapsed * 16_000;
    const deadline = performance.now() + 10;
    let instructions = 0;
    while (!stopped && cpu.cycles < stopAt) {
      avr.avrInstruction(cpu);
      cpu.tick();
      if (++instructions % 1024 === 0 && performance.now() >= deadline) break;
    }
    const total = Math.max(1, cpu.cycles - frameStart);
    const duty = level.map((high, pin) => {
      const value = (highCycles[pin] + (high ? cpu.cycles - Math.max(since[pin], frameStart) : 0)) / total;
      highCycles[pin] = 0;
      since[pin] = cpu.cycles;
      return Math.min(1, Math.max(0, value));
    });
    for (const { pin, tccr, bit, ocr } of PWM_OUTPUTS) {
      if (cpu.data[tccr] & bit) duty[pin] = cpu.data[ocr] / 255;
    }
    // Tone frequency from rising edges inside this frame (needs at least two edges).
    const freq = rises.map((count, pin) => count >= 2 && lastRise[pin] > firstRise[pin] ? ((count - 1) * 16_000_000) / (lastRise[pin] - firstRise[pin]) : 0);
    rises.fill(0); firstRise.fill(-1);
    // A pulse width older than 50 ms of emulated time no longer represents a live servo signal.
    const pulses = pulseUs.map((us, pin) => lastRise[pin] >= 0 && cpu.cycles - lastRise[pin] < 50 * 16_000 ? us : 0);
    frameStart = cpu.cycles;
    if (pending) { options.onSerial(pending); pending = ""; }
    options.onFrame({ duty, mode: Array.from({ length: 14 }, (_, pin) => modeOf(pin)), freq, pulseUs: pulses, cycles: cpu.cycles });
    if (!stopped) frame = requestAnimationFrame(runChunk);
  };
  frame = requestAnimationFrame(runChunk);

  return {
    setDigital: (pin, high) => { if (modeOf(pin) !== "output") setInput(pin, high); },
    setAnalog: (channel, volts) => { adc.channelValues[channel] = Math.min(5, Math.max(0, volts)); },
    setUltrasonic: (links) => { ultrasonic = links; },
    scheduleMicros: (micros, callback) => { cpu.addClockEvent(callback, Math.max(1, Math.round(micros * 16))); },
    cycles: () => cpu.cycles,
    drainEdges: () => { const drained = edgeLog; edgeLog = []; return drained; },
    levels: () => level.slice(),
    stop: () => { stopped = true; cancelAnimationFrame(frame); },
  };
}

export type AVRSimulation = {
  setButtonPressed(pressed: boolean): void;
  stop(): void;
};

export async function startUnoFirmwareSimulation(
  hex: string,
  options: {
    buttonProject: boolean;
    onLedChange: (on: boolean) => void;
    onCycles?: (cycles: number) => void;
  },
): Promise<AVRSimulation> {
  const avr = await loadAvr8();
  const FLASH_WORDS = 0x4000; // ATmega328P has 32 KB flash (16K words).
  const program = new Uint16Array(FLASH_WORDS);
  loadIntelHex(hex, new Uint8Array(program.buffer));

  const cpu = new avr.CPU(program);
  new avr.AVRTimer(cpu, avr.timer0Config);
  new avr.AVRTimer(cpu, avr.timer1Config);
  new avr.AVRTimer(cpu, avr.timer2Config);
  const portB = new avr.AVRIOPort(cpu, avr.portBConfig);
  new avr.AVRIOPort(cpu, avr.portCConfig);
  const portD = new avr.AVRIOPort(cpu, avr.portDConfig);

  let stopped = false;
  let lastLed = false;
  // Arduino D8 is ATmega328P PB0.
  portB.addListener((value: number) => {
    const current = Boolean(value & 0x01);
    if (current !== lastLed) {
      lastLed = current;
      options.onLedChange(current);
    }
  });

  // Arduino D2 is ATmega328P PD2. INPUT_PULLUP reads HIGH while released.
  if (options.buttonProject) portD.setPin(2, true);

  // Pace emulation to the Uno's 16 MHz clock, yielding every frame. A bounded
  // execution budget keeps touch/Stop responsive on slower phones; such devices
  // may simulate more slowly rather than locking the interface.
  let frame = 0;
  let lastTime = performance.now();
  const runChunk = (now: number) => {
    if (stopped) return;
    const elapsed = Math.min(Math.max(now - lastTime, 0), 50);
    lastTime = now;
    const stopAt = cpu.cycles + elapsed * 16_000;
    const deadline = performance.now() + 8;
    let instructions = 0;
    while (!stopped && cpu.cycles < stopAt) {
      avr.avrInstruction(cpu);
      cpu.tick();
      if (++instructions % 1024 === 0 && performance.now() >= deadline) break;
    }
    options.onCycles?.(cpu.cycles);
    if (!stopped) frame = requestAnimationFrame(runChunk);
  };
  frame = requestAnimationFrame(runChunk);

  return {
    setButtonPressed(pressed: boolean) {
      if (options.buttonProject) portD.setPin(2, !pressed);
    },
    stop() {
      stopped = true;
      options.onLedChange(false);
      cancelAnimationFrame(frame);
    },
  };
}
