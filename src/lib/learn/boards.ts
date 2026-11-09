// Microcontroller boards a learner can wire a component to. Pin pools are in the order we prefer
// to hand pins out, chosen so beginners avoid boot-strapping, flash and USB-serial pins.

export type BoardId = "uno" | "nano" | "mega" | "esp32" | "pico";
export type CodeLanguage = "arduino" | "micropython";

export type BoardProfile = {
  id: BoardId;
  /** Component-catalog slug for this board's own guide page. */
  slug: string;
  name: string;
  chip: string;
  logic: 5 | 3.3;
  summary: string;
  /** Pin ids. Display labels come from pinLabel(). */
  power5v: string;
  power3v3: string;
  gnd: string;
  digital: string[];
  pwm: string[];
  analog: string[];
  i2c: { sda: string; scl: string };
  spi: { mosi: string; miso: string; sck: string; cs: string };
  /** Board-side UART pins: tx goes to the module's RX. `soft` means SoftwareSerial on ordinary pins. */
  uart: { tx: string; rx: string; soft?: boolean; name: string };
  adc: { bits: number; max: number; ref: number; note: string };
  languages: CodeLanguage[];
  powerIn: string;
  cautions: string[];
};

const avrDigital = ["D7", "D8", "D4", "D2", "D12", "D13", "D3", "D5", "D6", "D10", "D11", "D9"];
const avrPwm = ["D9", "D6", "D5", "D10", "D11", "D3"];

export const BOARDS: BoardProfile[] = [
  {
    id: "uno", slug: "arduino-uno", name: "Arduino Uno", chip: "ATmega328P", logic: 5,
    summary: "The classic 5 V learning board. Pins are labelled 0–13 and A0–A5; a ~ marks PWM pins.",
    power5v: "5V", power3v3: "3V3", gnd: "GND",
    digital: avrDigital, pwm: avrPwm, analog: ["A0", "A1", "A2", "A3"],
    i2c: { sda: "A4", scl: "A5" }, spi: { mosi: "D11", miso: "D12", sck: "D13", cs: "D10" },
    uart: { tx: "D3", rx: "D2", soft: true, name: "link" },
    adc: { bits: 10, max: 1023, ref: 5, note: "10-bit: 0–1023 for 0–5 V (about 4.9 mV per step)." },
    languages: ["arduino"],
    powerIn: "USB, or 7–12 V into the barrel jack or VIN. Feeding 5 V into the 5V pin bypasses the regulator: only use a clean, regulated 5 V there.",
    cautions: ["D0 and D1 are the USB serial line: leave them free so uploads work.", "Each pin can give about 20 mA (40 mA absolute maximum). The 3.3V pin supplies only about 50 mA."],
  },
  {
    id: "nano", slug: "arduino-nano", name: "Arduino Nano", chip: "ATmega328P", logic: 5,
    summary: "The same chip as the Uno on a breadboard-friendly board. Same pin numbers, plus A6 and A7.",
    power5v: "5V", power3v3: "3V3", gnd: "GND",
    digital: avrDigital, pwm: avrPwm, analog: ["A0", "A1", "A2", "A3", "A6", "A7"],
    i2c: { sda: "A4", scl: "A5" }, spi: { mosi: "D11", miso: "D12", sck: "D13", cs: "D10" },
    uart: { tx: "D3", rx: "D2", soft: true, name: "link" },
    adc: { bits: 10, max: 1023, ref: 5, note: "10-bit: 0–1023 for 0–5 V. A6 and A7 are analog-input only." },
    languages: ["arduino"],
    powerIn: "USB (mini or USB-C on clones), or 7–12 V into VIN.",
    cautions: ["Many clones use a CH340 USB chip: install its driver if the port does not appear.", "The 3V3 pin on many Nanos supplies very little current; power 3.3 V modules from a separate regulator."],
  },
  {
    id: "mega", slug: "arduino-mega", name: "Arduino Mega 2560", chip: "ATmega2560", logic: 5,
    summary: "A 5 V board with 54 digital pins, 16 analog inputs and four hardware serial ports.",
    power5v: "5V", power3v3: "3V3", gnd: "GND",
    digital: ["D7", "D8", "D4", "D22", "D23", "D24", "D25", "D26", "D27", "D28", "D29", "D30", "D2", "D3"],
    pwm: ["D9", "D6", "D5", "D10", "D11", "D12", "D13", "D3"],
    analog: ["A0", "A1", "A2", "A3", "A4", "A5"],
    i2c: { sda: "D20", scl: "D21" }, spi: { mosi: "D51", miso: "D50", sck: "D52", cs: "D53" },
    uart: { tx: "D18", rx: "D19", name: "Serial1" },
    adc: { bits: 10, max: 1023, ref: 5, note: "10-bit: 0–1023 for 0–5 V." },
    languages: ["arduino"],
    powerIn: "USB, or 7–12 V into the barrel jack or VIN.",
    cautions: ["I2C is on D20/D21 and SPI on D50–D53, not A4/A5 and D11–D13 as on the Uno.", "D0/D1 are the USB serial line; use Serial1–Serial3 for modules."],
  },
  {
    id: "esp32", slug: "esp32", name: "ESP32 DevKit", chip: "ESP32-WROOM-32", logic: 3.3,
    summary: "A 3.3 V board with Wi-Fi and Bluetooth. Pins are GPIO numbers; the silk-screen may read D25, G25 or 25.",
    power5v: "VIN", power3v3: "3V3", gnd: "GND",
    digital: ["GPIO26", "GPIO27", "GPIO25", "GPIO14", "GPIO13", "GPIO4", "GPIO18", "GPIO19", "GPIO23", "GPIO16", "GPIO17", "GPIO32", "GPIO33"],
    pwm: ["GPIO26", "GPIO27", "GPIO25", "GPIO14", "GPIO13", "GPIO4", "GPIO18", "GPIO19", "GPIO23"],
    analog: ["GPIO34", "GPIO35", "GPIO32", "GPIO33", "GPIO36", "GPIO39"],
    i2c: { sda: "GPIO21", scl: "GPIO22" }, spi: { mosi: "GPIO23", miso: "GPIO19", sck: "GPIO18", cs: "GPIO5" },
    uart: { tx: "GPIO17", rx: "GPIO16", name: "Serial2" },
    adc: { bits: 12, max: 4095, ref: 3.3, note: "12-bit: 0–4095, roughly 0–3.1 V. Analog pins here are on ADC1, which still works while Wi-Fi is on (ADC2 does not)." },
    languages: ["arduino", "micropython"],
    powerIn: "USB, or 5 V into the VIN (5V) pin. Never put more than 3.3 V on any GPIO.",
    cautions: ["GPIO pins take 3.3 V maximum: 5 V signals need a divider or level shifter.", "Avoid GPIO 0, 2, 5, 12 and 15 for inputs (they set the boot mode) and GPIO 6–11 (flash).", "GPIO 34–39 are input-only and have no internal pull-ups."],
  },
  {
    id: "pico", slug: "raspberry-pi-pico", name: "Raspberry Pi Pico", chip: "RP2040", logic: 3.3,
    summary: "A 3.3 V board programmed in MicroPython or C/C++. Pins are GP numbers; the physical pin number is shown too.",
    power5v: "VBUS", power3v3: "3V3", gnd: "GND",
    digital: ["GP15", "GP14", "GP13", "GP12", "GP11", "GP10", "GP9", "GP8", "GP22", "GP21", "GP20", "GP7", "GP6"],
    pwm: ["GP15", "GP14", "GP13", "GP12", "GP11", "GP10", "GP9", "GP8"],
    analog: ["GP26", "GP27", "GP28"],
    i2c: { sda: "GP4", scl: "GP5" }, spi: { mosi: "GP19", miso: "GP16", sck: "GP18", cs: "GP17" },
    uart: { tx: "GP0", rx: "GP1", name: "Serial1" },
    adc: { bits: 12, max: 1023, ref: 3.3, note: "Only GP26–GP28 are analog. MicroPython's read_u16() gives 0–65535; Arduino's analogRead() gives 0–1023 by default." },
    languages: ["arduino", "micropython"],
    powerIn: "USB, or 1.8–5.5 V into VSYS (pin 39). VBUS (pin 40) carries 5 V only while USB is plugged in.",
    cautions: ["GPIO pins take 3.3 V maximum: 5 V signals need a divider or level shifter.", "Hold BOOTSEL while plugging in USB to install MicroPython or recover the board."],
  },
];

export const BOARD_BY_ID = Object.fromEntries(BOARDS.map((b) => [b.id, b])) as Record<BoardId, BoardProfile>;
export const DEFAULT_BOARD: BoardId = "uno";
export const BOARD_STORAGE_KEY = "stembuild-board-v1";

export function isBoardId(value: unknown): value is BoardId {
  return typeof value === "string" && value in BOARD_BY_ID;
}

// Raspberry Pi Pico physical pin numbers, so learners can count pins on the board.
const PICO_PHYSICAL: Record<string, number> = {
  GP0: 1, GP1: 2, GP2: 4, GP3: 5, GP4: 6, GP5: 7, GP6: 9, GP7: 10, GP8: 11, GP9: 12, GP10: 14, GP11: 15, GP12: 16, GP13: 17,
  GP14: 19, GP15: 20, GP16: 21, GP17: 22, GP18: 24, GP19: 25, GP20: 26, GP21: 27, GP22: 29, GP26: 31, GP27: 32, GP28: 34,
  "3V3": 36, VBUS: 40, GND: 38,
};

/** What the learner should look for on the board, e.g. "D9 (~)", "GP15 · pin 20", "3.3V". */
export function pinLabel(board: BoardProfile, pin: string) {
  if (board.id === "pico") {
    const physical = PICO_PHYSICAL[pin];
    const name = pin === "3V3" ? "3V3(OUT)" : pin;
    return physical ? `${name} · pin ${physical}` : name;
  }
  if (pin === "3V3") return board.id === "esp32" ? "3V3" : "3.3V";
  if (board.id === "esp32" && pin === "VIN") return "VIN (5 V from USB)";
  if (board.logic === 5 && board.pwm.includes(pin)) return `${pin} (~)`;
  return pin;
}

/** The pin as written in code: 9, A0, 26. */
export function codePin(board: BoardProfile, pin: string) {
  if (/^D\d+$/.test(pin)) return pin.slice(1);
  if (pin.startsWith("GPIO")) return pin.slice(4);
  if (pin.startsWith("GP")) return pin.slice(2);
  return pin;
}
