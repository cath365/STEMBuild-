export type Lab3DPart = {
  id: "arduino" | "breadboard" | "resistor" | "led";
  label: string;
  componentSlug: string;
  hint: string;
  target: { left: number; top: number; width: number; height: number };
};

export const ledLabParts: Lab3DPart[] = [
  { id:"arduino", label:"Arduino Uno", componentSlug:"arduino-uno", hint:"Controller board", target:{left:7,top:22,width:30,height:44} },
  { id:"breadboard", label:"Breadboard", componentSlug:"breadboard", hint:"Prototype area", target:{left:50,top:20,width:38,height:46} },
  { id:"resistor", label:"330 Ω resistor", componentSlug:"resistor-330", hint:"Limits LED current", target:{left:57,top:51,width:15,height:10} },
  { id:"led", label:"Red LED", componentSlug:"led", hint:"Visual output", target:{left:77,top:42,width:9,height:17} },
];

export const ledLabConnections = [
  { id:"d8-resistor", from:"Arduino D8", to:"330 Ω resistor", purpose:"GPIO output through current limiting" },
  { id:"resistor-led", from:"330 Ω resistor", to:"LED anode (+)", purpose:"limited current into LED" },
  { id:"led-ground", from:"LED cathode (-)", to:"Arduino GND", purpose:"return path to ground" },
] as const;

export const defaultLedSketch = `// STEMBuild 3D Lab — Arduino Uno LED
// This is normal Arduino source and can be copied to Arduino IDE.

const int LED_PIN = 8;

void setup() {
  pinMode(LED_PIN, OUTPUT);
}

void loop() {
  digitalWrite(LED_PIN, HIGH);
  delay(500);
  digitalWrite(LED_PIN, LOW);
  delay(500);
}
`;

export type SketchCheck = {
  ok: boolean;
  messages: string[];
  highDelayMs: number;
  lowDelayMs: number;
};

export function checkLedSketch(source: string): SketchCheck {
  const messages: string[] = [];
  const normalized = source.replace(/\/\/.*$/gm, " ").replace(/\s+/g, " ");

  if (!/LED_PIN\s*=\s*8\b/.test(normalized)) messages.push("Set LED_PIN to Arduino D8 so the program matches the wiring.");
  if (!/pinMode\s*\(\s*LED_PIN\s*,\s*OUTPUT\s*\)/.test(normalized)) messages.push("setup() needs pinMode(LED_PIN, OUTPUT).");
  if (!/digitalWrite\s*\(\s*LED_PIN\s*,\s*HIGH\s*\)/.test(normalized)) messages.push("The sketch never drives the LED HIGH.");
  if (!/digitalWrite\s*\(\s*LED_PIN\s*,\s*LOW\s*\)/.test(normalized)) messages.push("The sketch never drives the LED LOW.");

  const delays = [...normalized.matchAll(/delay\s*\(\s*(\d+)\s*\)/g)].map((match) => Number(match[1]));
  const highDelayMs = Math.min(Math.max(delays[0] ?? 500, 80), 2500);
  const lowDelayMs = Math.min(Math.max(delays[1] ?? delays[0] ?? 500, 80), 2500);
  if (delays.length === 0) messages.push("Add delay(...) so the LED state remains visible in this prototype.");

  return { ok: messages.length === 0, messages, highDelayMs, lowDelayMs };
}

export function labReadiness(placed: string[], connected: string[], source: string) {
  const missingParts = ledLabParts.filter((part) => !placed.includes(part.id)).map((part) => part.label);
  const missingConnections = ledLabConnections.filter((wire) => !connected.includes(wire.id)).map((wire) => `${wire.from} → ${wire.to}`);
  const sketch = checkLedSketch(source);
  return {
    ready: missingParts.length === 0 && missingConnections.length === 0 && sketch.ok,
    missingParts,
    missingConnections,
    sketch,
  };
}
