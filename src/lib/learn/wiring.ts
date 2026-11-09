// Turns a component guide into concrete wiring and code for one board: assigns pins from the
// board's pools, adds dividers or level shifters where 5 V and 3.3 V meet, and fills code templates.
import { codePin, pinLabel, type BoardProfile, type CodeLanguage } from "@/lib/learn/boards";
import type { ComponentGuide, GuidePin, Supply } from "@/lib/learn/types";

export type WireRow = {
  pinId: string;
  pinLabel: string;
  role: GuidePin["role"];
  /** Board pin id when the wire goes to the board. */
  boardPin?: string;
  target: string;
  via?: string;
  notes: string[];
  warn?: string;
};

export type Wiring = { rows: WireRow[]; pins: Record<string, string>; warnings: string[] };

const DIVIDER = "voltage divider: 1 kΩ in series, 2 kΩ to GND";
const SHIFTER = "logic-level shifter (BSS138 module)";

function supplyPin(board: BoardProfile, supply: Supply) {
  if (supply === "5v") return board.power5v;
  if (supply === "3v3") return board.power3v3;
  if (supply === "logic") return board.logic === 5 ? board.power5v : board.power3v3;
  return null;
}

function supplyVolts(board: BoardProfile, supply: Supply) {
  return supply === "5v" ? 5 : supply === "3v3" ? 3.3 : supply === "logic" ? board.logic : null;
}

export function resolveTokens(text: string, board: BoardProfile) {
  return text
    .replaceAll("{5V}", pinLabel(board, board.power5v))
    .replaceAll("{3V3}", pinLabel(board, board.power3v3))
    .replaceAll("{GND}", pinLabel(board, board.gnd))
    .replaceAll("{LOGIC}", pinLabel(board, board.logic === 5 ? board.power5v : board.power3v3));
}

/** Assigns board pins. Fixed buses first, then analog, then PWM, then everything else. */
export function assignPins(guide: ComponentGuide, board: BoardProfile): Record<string, string> {
  const used = new Set<string>();
  const pins: Record<string, string> = {};
  const fixed: Partial<Record<GuidePin["role"], string>> = {
    sda: board.i2c.sda, scl: board.i2c.scl, mosi: board.spi.mosi, miso: board.spi.miso, sck: board.spi.sck,
    tx: board.uart.rx, rx: board.uart.tx, // the module's TX goes to the board's RX
  };
  const take = (pool: string[], pin: GuidePin) => {
    const choice = pool.find((p) => !used.has(p));
    if (!choice) throw new Error(`${board.name} has no free pin for ${guide.slug}:${pin.id}`);
    used.add(choice);
    pins[pin.id] = choice;
  };
  const signals = guide.pins.filter((p) => !["vcc", "gnd", "ext", "nc"].includes(p.role));
  for (const pin of signals) {
    const bus = fixed[pin.role];
    if (bus) { used.add(bus); pins[pin.id] = bus; }
  }
  // SPI chip-select: the board's usual CS pin first, then any digital pin.
  for (const pin of signals.filter((p) => p.role === "cs")) take([board.spi.cs, ...board.digital], pin);
  for (const pin of signals.filter((p) => p.role === "analog")) take(board.analog, pin);
  for (const pin of signals.filter((p) => p.role === "pwm" || p.role === "servo")) take(board.pwm, pin);
  for (const pin of signals.filter((p) => p.role === "digital")) take(board.digital, pin);
  return pins;
}

export function wiringFor(guide: ComponentGuide, board: BoardProfile): Wiring {
  const pins = assignPins(guide, board);
  const warnings = new Set<string>();
  const rows = guide.pins.map((pin): WireRow => {
    const notes = [pin.note, board.logic === 3.3 ? pin.note3v3 : pin.note5v].filter((n): n is string => Boolean(n)).map((n) => resolveTokens(n, board));
    const row: WireRow = { pinId: pin.id, pinLabel: pin.label, role: pin.role, target: "", notes };
    if (pin.role === "vcc") {
      const supply = pin.supply ?? guide.supply;
      const boardPin = supplyPin(board, supply);
      if (boardPin) { row.boardPin = boardPin; row.target = pinLabel(board, boardPin); }
      else row.target = resolveTokens(pin.to ?? "External supply +", board);
    } else if (pin.role === "gnd") {
      row.boardPin = board.gnd;
      row.target = pinLabel(board, board.gnd);
    } else if (pin.role === "ext") {
      row.target = resolveTokens(pin.to ?? "", board);
    } else if (pin.role === "nc") {
      row.target = "Not connected";
    } else {
      row.boardPin = pins[pin.id];
      row.target = pinLabel(board, pins[pin.id]);
    }
    const vias = pin.via ? [pin.via] : [];
    // A 5 V output into a 3.3 V pin needs bringing down; a 3.3 V-only input driven by a 5 V pin too.
    const sourceVolts = supplyVolts(board, pin.supply ?? guide.supply);
    if (pin.out5v && board.logic === 3.3 && sourceVolts === 5) {
      vias.push(pin.out5v === "divider" ? DIVIDER : SHIFTER);
      row.warn = "This pin outputs 5 V. Your board's pins take 3.3 V maximum.";
      warnings.add("This part runs at 5 V, so its output is brought down to 3.3 V before it reaches your board.");
    }
    if (pin.max3v3 && board.logic === 5) {
      vias.push(pin.max3v3 === "divider" ? DIVIDER : SHIFTER);
      row.warn = "This input takes 3.3 V maximum. Your board drives 5 V.";
      warnings.add("This part is a 3.3 V device: signals from your 5 V board go through a divider or level shifter.");
    }
    if (vias.length) row.via = vias.join(" + ");
    return row;
  });
  if (board.id === "esp32" && guide.pins.some((p) => p.role === "analog")) warnings.add("Analog pins are on ADC1 (GPIO 32–39), which keeps working while Wi-Fi is on.");
  if (board.id === "pico" && guide.pins.some((p) => p.role === "analog")) warnings.add("Only GP26, GP27 and GP28 can read analog voltages on the Pico.");
  return { rows, pins, warnings: [...warnings] };
}

// ---------- Code templates ----------

const DROP = "\u0000drop";

function tokenValue(name: string, arg: string, board: BoardProfile, wiring: Wiring): string {
  const soft = board.uart.soft;
  const esp = board.id === "esp32";
  switch (name) {
    case "pin": {
      const pin = wiring.pins[arg];
      if (!pin) throw new Error(`Template uses unknown pin "${arg}"`);
      return codePin(board, pin);
    }
    case "ADC_MAX": return String(board.adc.max);
    case "VREF": return board.logic === 5 ? "5.0" : "3.3";
    case "SERVO_INCLUDE": return esp ? "#include <ESP32Servo.h>   // install \"ESP32Servo\" in the Library Manager" : "#include <Servo.h>";
    case "SD_APPEND": return esp ? "FILE_APPEND" : "FILE_WRITE";
    case "UART": return board.uart.name;
    case "UART_SETUP": return soft ? `#include <SoftwareSerial.h>\nSoftwareSerial link(${codePin(board, board.uart.rx)}, ${codePin(board, board.uart.tx)});   // RX, TX` : DROP;
    case "UART_BEGIN": return esp ? `Serial2.begin(${arg}, SERIAL_8N1, ${codePin(board, board.uart.rx)}, ${codePin(board, board.uart.tx)});   // RX, TX` : `${board.uart.name}.begin(${arg});`;
    case "MP_UART": return esp ? `UART(2, baudrate=${arg}, tx=17, rx=16)` : `UART(0, baudrate=${arg}, tx=Pin(0), rx=Pin(1))`;
    case "MP_I2C": return esp ? "I2C(0, sda=Pin(21), scl=Pin(22), freq=400000)" : "I2C(0, sda=Pin(4), scl=Pin(5), freq=400000)";
    case "MP_SPI": return esp ? "SPI(2, baudrate=1000000, sck=Pin(18), mosi=Pin(23), miso=Pin(19))" : "SPI(0, baudrate=1000000, sck=Pin(18), mosi=Pin(19), miso=Pin(16))";
    case "MP_ATTEN": return esp ? `${arg}.atten(ADC.ATTN_11DB)   # read the full 0-3.3 V range` : DROP;
    default: throw new Error(`Unknown template token {${name}}`);
  }
}

const TOKEN = /\{(pin|ADC_MAX|VREF|SERVO_INCLUDE|SD_APPEND|UART_SETUP|UART_BEGIN|UART|MP_UART|MP_I2C|MP_SPI|MP_ATTEN)(?::([^}]*))?\}/g;

export function renderCode(template: string, board: BoardProfile, wiring: Wiring) {
  const filled = template.replace(TOKEN, (_, name: string, arg = "") => tokenValue(name, arg, board, wiring));
  return filled.split("\n").filter((line) => !line.includes(DROP)).join("\n");
}

export function codeFor(guide: ComponentGuide, board: BoardProfile, wiring: Wiring, language: CodeLanguage) {
  const template = language === "arduino" ? guide.code?.arduino : guide.code?.micropython;
  if (!template || !board.languages.includes(language)) return null;
  return renderCode(template, board, wiring);
}

export function librariesFor(guide: ComponentGuide, board: BoardProfile, language: CodeLanguage) {
  if (language === "micropython") return guide.libs?.micropython ? [guide.libs.micropython] : [];
  return [...(guide.libs?.arduino ?? []), ...(board.id === "esp32" ? guide.libs?.esp32 ?? [] : [])];
}
