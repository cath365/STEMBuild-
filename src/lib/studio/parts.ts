// Maker Studio part library: geometry (for drawing and wiring) and behaviour notes.
// Pin coordinates are relative to the part's top-left corner on the studio canvas.

export type PinRole = "signal" | "power" | "ground" | "passive";
export type PartPin = { id: string; label: string; x: number; y: number; role: PinRole };
export type PartCategory = "Outputs" | "Inputs" | "Sensors" | "Motion" | "Passive";

export type PartType =
  | "led" | "rgb-led" | "seven-segment" | "buzzer" | "active-buzzer" | "traffic-light"
  | "button" | "switch" | "potentiometer" | "tilt-switch" | "joystick"
  | "light-sensor" | "temp-sensor" | "ultrasonic" | "pir"
  | "ir-obstacle" | "line-sensor" | "flame-sensor" | "sound-sensor" | "hall-sensor" | "soil-moisture" | "gas-sensor"
  | "servo" | "motor-driver" | "vibration-motor" | "relay"
  | "resistor";

/** A control shown under the workbench while running, to change what a sensor senses. */
export type PartControl =
  | { kind: "toggle"; prop: string; on: string; off: string }
  | { kind: "range"; prop: string; min: number; max: number; step: number; format: (value: number) => string };

export type PartDefinition = {
  type: PartType;
  name: string;
  category: PartCategory;
  width: number;
  height: number;
  pins: PartPin[];
  summary: string;
  /** How to wire it, in one line. */
  wiring: string;
  defaults?: Record<string, string | number | boolean>;
  control?: PartControl;
};

const row = (ids: [string, string, PinRole][], y: number, startX: number, gap: number): PartPin[] =>
  ids.map(([id, label, role], index) => ({ id, label, role, x: startX + index * gap, y }));

export const PART_DEFINITIONS: PartDefinition[] = [
  { type: "led", name: "LED", category: "Outputs", width: 44, height: 78, pins: [{ id: "anode", label: "+", x: 14, y: 78, role: "signal" }, { id: "cathode", label: "−", x: 30, y: 78, role: "ground" }], summary: "Lights when current flows from + (anode, long leg) to − (cathode). Always needs a series resistor.", wiring: "Pin → resistor → LED + ; LED − → GND", defaults: { colour: "red" } },
  { type: "rgb-led", name: "RGB LED", category: "Outputs", width: 64, height: 82, pins: row([["r", "R", "signal"], ["common", "−", "ground"], ["g", "G", "signal"], ["b", "B", "signal"]], 82, 11, 14), summary: "Three LEDs in one (common cathode). Mix colours with analogWrite on each channel.", wiring: "Each of R, G, B through its own resistor to a PWM pin (~); − to GND" },
  { type: "seven-segment", name: "7-segment display", category: "Outputs", width: 96, height: 124, pins: [...row([["g", "g", "signal"], ["f", "f", "signal"], ["common", "−", "ground"], ["a", "a", "signal"], ["b", "b", "signal"]], 0, 12, 18), ...row([["e", "e", "signal"], ["d", "d", "signal"], ["common2", "−", "ground"], ["c", "c", "signal"], ["dp", "dp", "signal"]], 124, 12, 18)], summary: "Common-cathode digit; this module has a resistor on every segment. Drive a segment HIGH to light it.", wiring: "a–g and dp to digital pins; − to GND" },
  { type: "buzzer", name: "Passive buzzer", category: "Outputs", width: 60, height: 70, pins: [{ id: "plus", label: "+", x: 22, y: 70, role: "signal" }, { id: "minus", label: "−", x: 38, y: 70, role: "ground" }], summary: "Plays the frequency of the square wave on its + pin. Use tone(pin, frequency).", wiring: "+ to a digital pin; − to GND" },
  { type: "button", name: "Push button", category: "Inputs", width: 56, height: 62, pins: [{ id: "a", label: "1", x: 14, y: 62, role: "passive" }, { id: "b", label: "2", x: 42, y: 62, role: "passive" }], summary: "Connects its two legs while held. Press and hold it on the canvas.", wiring: "One leg to a pin, other leg to GND; use pinMode(pin, INPUT_PULLUP)" },
  { type: "switch", name: "Slide switch", category: "Inputs", width: 72, height: 50, pins: row([["a", "A", "passive"], ["common", "C", "passive"], ["b", "B", "passive"]], 50, 14, 22), summary: "Connects the middle pin (C) to A or to B. Click it to slide.", wiring: "C to a pin; A to GND and B to 5V" },
  { type: "potentiometer", name: "Potentiometer", category: "Inputs", width: 76, height: 78, pins: row([["end1", "1", "passive"], ["wiper", "W", "signal"], ["end2", "2", "passive"]], 78, 16, 22), summary: "A voltage divider you can turn. The wiper voltage moves between the two ends.", wiring: "1 to GND, 2 to 5V, W to an analog pin (A0–A5)", defaults: { position: 0.5 } },
  { type: "light-sensor", name: "Light sensor module", category: "Sensors", width: 78, height: 64, pins: row([["vcc", "VCC", "power"], ["gnd", "GND", "ground"], ["ao", "AO", "signal"]], 64, 16, 23), summary: "LDR module. AO voltage rises as the light gets brighter.", wiring: "VCC to 5V, GND to GND, AO to an analog pin", defaults: { light: 0.6 } },
  { type: "temp-sensor", name: "TMP36 temperature sensor", category: "Sensors", width: 56, height: 70, pins: row([["vcc", "+Vs", "power"], ["out", "OUT", "signal"], ["gnd", "GND", "ground"]], 70, 10, 18), summary: "Outputs 0.5 V at 0 °C plus 10 mV per °C.", wiring: "+Vs to 5V, GND to GND, OUT to an analog pin", defaults: { celsius: 24 } },
  { type: "ultrasonic", name: "HC-SR04 distance sensor", category: "Sensors", width: 116, height: 70, pins: row([["vcc", "VCC", "power"], ["trig", "TRIG", "signal"], ["echo", "ECHO", "signal"], ["gnd", "GND", "ground"]], 70, 22, 24), summary: "Send a 10 µs pulse on TRIG; ECHO stays HIGH for 58 µs per cm. Read it with pulseIn().", wiring: "VCC to 5V, GND to GND, TRIG and ECHO to digital pins", defaults: { distance: 60 } },
  { type: "pir", name: "PIR motion sensor", category: "Sensors", width: 70, height: 70, pins: row([["vcc", "VCC", "power"], ["out", "OUT", "signal"], ["gnd", "GND", "ground"]], 70, 13, 22), summary: "OUT goes HIGH while it detects movement.", wiring: "VCC to 5V, GND to GND, OUT to a digital pin", defaults: { motion: false } },
  { type: "servo", name: "Micro servo", category: "Motion", width: 88, height: 74, pins: row([["gnd", "GND", "ground"], ["vcc", "V+", "power"], ["signal", "SIG", "signal"]], 74, 22, 22), summary: "Turns to an angle set by the pulse width (about 0.5–2.4 ms). Use the Servo library.", wiring: "GND to GND, V+ to 5V, SIG to a digital pin" },
  { type: "motor-driver", name: "DC motor + driver", category: "Motion", width: 120, height: 84, pins: row([["vcc", "VCC", "power"], ["gnd", "GND", "ground"], ["in1", "IN1", "signal"], ["in2", "IN2", "signal"], ["en", "EN", "signal"]], 84, 14, 23), summary: "One H-bridge channel with its motor. IN1/IN2 set direction, PWM on EN sets speed.", wiring: "VCC to 5V, GND to GND, IN1/IN2 to digital pins, EN to a PWM pin (~)" },
  { type: "active-buzzer", name: "Active buzzer", category: "Outputs", width: 60, height: 70, pins: [{ id: "plus", label: "+", x: 22, y: 70, role: "signal" }, { id: "minus", label: "−", x: 38, y: 70, role: "ground" }], summary: "Has its own oscillator: it beeps at one pitch whenever + is HIGH. No tone() needed.", wiring: "+ to a digital pin; − to GND" },
  { type: "traffic-light", name: "Traffic-light module", category: "Outputs", width: 64, height: 120, pins: row([["r", "R", "signal"], ["y", "Y", "signal"], ["g", "G", "signal"], ["gnd", "GND", "ground"]], 120, 11, 14), summary: "Red, yellow and green LEDs with resistors already on the board. Drive each pin HIGH to light it.", wiring: "R, Y, G to digital pins; GND to GND" },
  { type: "tilt-switch", name: "Tilt switch", category: "Inputs", width: 50, height: 62, pins: [{ id: "a", label: "1", x: 15, y: 62, role: "passive" }, { id: "b", label: "2", x: 35, y: 62, role: "passive" }], summary: "A ball inside joins the two legs while it is upright and lets go when tilted.", wiring: "One leg to a pin, the other to GND; use INPUT_PULLUP", defaults: { tilted: false }, control: { kind: "toggle", prop: "tilted", on: "Tilted", off: "Upright" } },
  { type: "joystick", name: "Joystick", category: "Inputs", width: 100, height: 92, pins: row([["gnd", "GND", "ground"], ["vcc", "+5V", "power"], ["vrx", "VRx", "signal"], ["vry", "VRy", "signal"], ["sw", "SW", "signal"]], 92, 14, 18), summary: "Two potentiometers (X and Y) and a push switch. Centre reads about half-scale.", wiring: "GND to GND, +5V to 5V, VRx and VRy to analog pins, SW to a digital pin (INPUT_PULLUP)", defaults: { x: 0.5, y: 0.5, pressed: false } },
  { type: "ir-obstacle", name: "IR obstacle sensor", category: "Sensors", width: 70, height: 66, pins: row([["vcc", "VCC", "power"], ["gnd", "GND", "ground"], ["out", "OUT", "signal"]], 66, 13, 22), summary: "Infrared LED and receiver. OUT goes LOW when something is close in front.", wiring: "VCC to 5V, GND to GND, OUT to a digital pin", defaults: { obstacle: false }, control: { kind: "toggle", prop: "obstacle", on: "Obstacle in front", off: "Clear" } },
  { type: "line-sensor", name: "Line sensor", category: "Sensors", width: 70, height: 66, pins: row([["vcc", "VCC", "power"], ["gnd", "GND", "ground"], ["do", "DO", "signal"]], 66, 13, 22), summary: "Looks down at the floor. DO goes HIGH over a black line, LOW over a light floor.", wiring: "VCC to 5V, GND to GND, DO to a digital pin", defaults: { black: false }, control: { kind: "toggle", prop: "black", on: "Over the black line", off: "Over the light floor" } },
  { type: "flame-sensor", name: "Flame sensor", category: "Sensors", width: 70, height: 66, pins: row([["vcc", "VCC", "power"], ["gnd", "GND", "ground"], ["do", "DO", "signal"]], 66, 13, 22), summary: "Infrared photodiode tuned to flames. DO goes LOW when it sees one.", wiring: "VCC to 5V, GND to GND, DO to a digital pin", defaults: { flame: false }, control: { kind: "toggle", prop: "flame", on: "Flame seen", off: "No flame" } },
  { type: "sound-sensor", name: "Sound sensor", category: "Sensors", width: 70, height: 66, pins: row([["vcc", "VCC", "power"], ["gnd", "GND", "ground"], ["do", "DO", "signal"]], 66, 13, 22), summary: "Microphone with a threshold. DO goes HIGH while the sound is loud.", wiring: "VCC to 5V, GND to GND, DO to a digital pin", defaults: { loud: false }, control: { kind: "toggle", prop: "loud", on: "Loud (clap!)", off: "Quiet" } },
  { type: "hall-sensor", name: "Hall (magnet) sensor", category: "Sensors", width: 70, height: 66, pins: row([["vcc", "VCC", "power"], ["gnd", "GND", "ground"], ["s", "S", "signal"]], 66, 13, 22), summary: "Senses a magnet without touching it. S goes LOW while a magnet is near.", wiring: "VCC to 5V, GND to GND, S to a digital pin", defaults: { magnet: false }, control: { kind: "toggle", prop: "magnet", on: "Magnet near", off: "No magnet" } },
  { type: "soil-moisture", name: "Soil-moisture sensor", category: "Sensors", width: 60, height: 110, pins: row([["vcc", "VCC", "power"], ["gnd", "GND", "ground"], ["aout", "AOUT", "signal"]], 110, 10, 20), summary: "Capacitive probe. AOUT voltage falls as the soil gets wetter.", wiring: "VCC to 5V, GND to GND, AOUT to an analog pin", defaults: { moisture: 0.3 }, control: { kind: "range", prop: "moisture", min: 0, max: 1, step: 0.01, format: (v) => `${Math.round(v * 100)}% wet` } },
  { type: "gas-sensor", name: "Gas sensor (MQ-2)", category: "Sensors", width: 70, height: 72, pins: row([["vcc", "VCC", "power"], ["gnd", "GND", "ground"], ["ao", "AO", "signal"]], 72, 13, 22), summary: "Heated sensing element. AO voltage rises with smoke or gas in the air.", wiring: "VCC to 5V, GND to GND, AO to an analog pin", defaults: { gas: 0.1 }, control: { kind: "range", prop: "gas", min: 0, max: 1, step: 0.01, format: (v) => (v < 0.25 ? "Clean air" : v < 0.6 ? "Some smoke" : "Heavy smoke") } },
  { type: "vibration-motor", name: "Vibration motor", category: "Motion", width: 66, height: 66, pins: row([["in", "IN", "signal"], ["vcc", "VCC", "power"], ["gnd", "GND", "ground"]], 66, 12, 21), summary: "Module with its own transistor. Buzzes while IN is HIGH; PWM on IN sets the strength.", wiring: "IN to a digital pin (~ for strength), VCC to 5V, GND to GND" },
  { type: "relay", name: "Relay module", category: "Motion", width: 96, height: 76, pins: row([["vcc", "VCC", "power"], ["gnd", "GND", "ground"], ["in", "IN", "signal"]], 76, 16, 22), summary: "An electromagnet switch with a lamp on its contacts. Most modules switch ON when IN is LOW.", wiring: "VCC to 5V, GND to GND, IN to a digital pin" },
  { type: "resistor", name: "Resistor", category: "Passive", width: 96, height: 24, pins: [{ id: "a", label: "", x: 0, y: 12, role: "passive" }, { id: "b", label: "", x: 96, y: 12, role: "passive" }], summary: "Limits current. 220–330 Ω for LEDs; 10 kΩ as a pull-up or pull-down.", wiring: "In series with an LED, or between a pin and GND/5V", defaults: { ohms: 220 } },
];

export const PART_BY_TYPE = Object.fromEntries(PART_DEFINITIONS.map((part) => [part.type, part])) as Record<PartType, PartDefinition>;
export const PART_CATEGORIES: PartCategory[] = ["Outputs", "Inputs", "Sensors", "Motion", "Passive"];
export const RESISTOR_VALUES = [100, 150, 220, 330, 470, 1000, 2200, 4700, 10_000, 47_000, 100_000];
export const LED_COLOURS = { red: { hex: "#ff3b30", vf: 2.0 }, yellow: { hex: "#ffd60a", vf: 2.1 }, green: { hex: "#30d158", vf: 2.2 }, blue: { hex: "#0a84ff", vf: 3.0 }, white: { hex: "#f5f5f7", vf: 3.0 } } as const;
export type LedColour = keyof typeof LED_COLOURS;

// ---------- Arduino Uno header ----------

export const UNO = { x: 40, y: 300, width: 400, height: 270 } as const;
export const DIGITAL_PINS = Array.from({ length: 14 }, (_, i) => `D${i}`);
export const ANALOG_PINS = Array.from({ length: 6 }, (_, i) => `A${i}`);
export const PWM_PINS = new Set(["D3", "D5", "D6", "D9", "D10", "D11"]);

/** Header pins in board order, with canvas coordinates. GND pins are electrically one node. */
export const UNO_PINS: { id: string; label: string; x: number; y: number }[] = [
  ...["GND_T", "D13", "D12", "D11", "D10", "D9", "D8"].map((id, i) => ({ id, label: id === "GND_T" ? "GND" : id.slice(1), x: UNO.x + 132 + i * 18, y: UNO.y + 16 })),
  ...["D7", "D6", "D5", "D4", "D3", "D2", "D1", "D0"].map((id, i) => ({ id, label: id.slice(1), x: UNO.x + 270 + i * 15.5, y: UNO.y + 16 })),
  ...["3V3", "5V", "GND_B1", "GND_B2"].map((id, i) => ({ id, label: id.startsWith("GND") ? "GND" : id, x: UNO.x + 150 + i * 18, y: UNO.y + UNO.height - 16 })),
  ...ANALOG_PINS.map((id, i) => ({ id, label: id, x: UNO.x + 256 + i * 18, y: UNO.y + UNO.height - 16 })),
];

export function isGround(unoPin: string) { return unoPin.startsWith("GND"); }

export function pinPosition(endpoint: string, parts: { id: string; type: PartType; x: number; y: number }[]) {
  const [owner, pinId] = endpoint.split(":");
  if (owner === "uno") {
    const pin = UNO_PINS.find((p) => p.id === pinId);
    return pin ? { x: pin.x, y: pin.y } : null;
  }
  const part = parts.find((p) => p.id === owner);
  const pin = part ? PART_BY_TYPE[part.type].pins.find((p) => p.id === pinId) : undefined;
  return part && pin ? { x: part.x + pin.x, y: part.y + pin.y } : null;
}
