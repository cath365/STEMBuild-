"use client";

const COMPILER_BASE = "https://cdn.jsdelivr.net/npm/@horang-corp/avr-gcc-wasm@0.2.0/";
const AVR8_URL = "https://esm.sh/avr8js@0.21.1";

type RemoteModule = Record<string, any>;

function remoteImport(url: string): Promise<RemoteModule> {
  // Keep remote toolchains out of the main Next.js bundle. They load only after
  // a learner explicitly chooses Full Firmware Mode.
  const importer = new Function("url", "return import(url)") as (url: string) => Promise<RemoteModule>;
  return importer(url);
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
  let module: RemoteModule;
  try {
    module = await remoteImport(`${COMPILER_BASE}index.js`);
    const result = await module.compile({
      source,
      sensors: [],
      assetsBase: COMPILER_BASE,
    });
    return {
      hex: String(result.hex),
      flashBytes: Number(result.flashBytes ?? 0),
      fitsTarget: Boolean(result.fitsTarget),
      compileMs: performance.now() - started,
    };
  } catch (workerError) {
    // Some browsers block a cross-origin module Worker. The package also
    // exposes the same compiler pipeline for direct execution.
    try {
      module = await remoteImport(`${COMPILER_BASE}firmware-builder.js`);
      const result = await module.buildFirmware({
        source,
        sensors: [],
        assetsBase: COMPILER_BASE,
      });
      return {
        hex: String(result.hex),
        flashBytes: Number(result.flashBytes ?? 0),
        fitsTarget: Boolean(result.fitsTarget),
        compileMs: performance.now() - started,
      };
    } catch (directError) {
      const first = workerError instanceof Error ? workerError.message : String(workerError);
      const second = directError instanceof Error ? directError.message : String(directError);
      throw new Error(`Browser AVR compilation failed. Worker: ${first}. Direct fallback: ${second}`);
    }
  }
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
  const avr = await remoteImport(AVR8_URL);
  const FLASH_WORDS = 0x8000;
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

  const schedule = typeof MessageChannel !== "undefined" ? new MessageChannel() : null;
  const workUnitCycles = 60_000;

  const runChunk = () => {
    if (stopped) return;
    const stopAt = cpu.cycles + workUnitCycles;
    while (!stopped && cpu.cycles < stopAt) {
      avr.avrInstruction(cpu);
      cpu.tick();
    }
    options.onCycles?.(cpu.cycles);
    if (!stopped) {
      if (schedule) schedule.port1.postMessage(0);
      else setTimeout(runChunk, 0);
    }
  };

  if (schedule) {
    schedule.port2.onmessage = runChunk;
    schedule.port1.postMessage(0);
  } else {
    setTimeout(runChunk, 0);
  }

  return {
    setButtonPressed(pressed: boolean) {
      if (options.buttonProject) portD.setPin(2, !pressed);
    },
    stop() {
      stopped = true;
      options.onLedChange(false);
      if (schedule) {
        schedule.port1.close();
        schedule.port2.close();
      }
    },
  };
}
