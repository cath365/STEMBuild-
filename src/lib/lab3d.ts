export type Lab3DPart = {
  id: string;
  label: string;
  componentSlug: string;
  hint: string;
  target: { left: number; top: number; width: number; height: number };
};

export type Lab3DTerminal = {
  id: string;
  label: string;
  partId: string;
  left: number;
  top: number;
};

export type Lab3DConnection = {
  id: string;
  from: string;
  to: string;
  fromTerminal: string;
  toTerminal: string;
  purpose: string;
  wireClass: "wire-blue" | "wire-red" | "wire-black" | "wire-green";
  path: string;
};

export type Lab3DProject = {
  slug: "led-blink" | "button-light";
  title: string;
  shortTitle: string;
  description: string;
  parts: Lab3DPart[];
  terminals: Lab3DTerminal[];
  connections: Lab3DConnection[];
  defaultSketch: string;
  downloadName: string;
  inputMode: "none" | "button";
};

export type SketchCheck = {
  ok: boolean;
  messages: string[];
  highDelayMs: number;
  lowDelayMs: number;
};

const commonParts: Lab3DPart[] = [
  { id:"arduino", label:"Arduino Uno", componentSlug:"arduino-uno", hint:"Controller board", target:{left:6,top:21,width:31,height:45} },
  { id:"breadboard", label:"Breadboard", componentSlug:"breadboard", hint:"Prototype area", target:{left:49,top:18,width:40,height:49} },
  { id:"resistor", label:"330 Ω resistor", componentSlug:"resistor-330", hint:"Limits LED current", target:{left:57,top:51,width:15,height:10} },
  { id:"led", label:"Red LED", componentSlug:"led", hint:"Visual output", target:{left:77,top:40,width:9,height:18} },
];

export const defaultLedSketch = `// STEMBuild 3D Lab — Arduino Uno LED
// Copy this same source to Arduino IDE for the real circuit.

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

export const defaultButtonSketch = `// STEMBuild 3D Lab — Arduino Uno push-button light
// INPUT_PULLUP means the button reads LOW when pressed.

const int BUTTON_PIN = 2;
const int LED_PIN = 8;

void setup() {
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  pinMode(LED_PIN, OUTPUT);
}

void loop() {
  bool pressed = digitalRead(BUTTON_PIN) == LOW;
  digitalWrite(LED_PIN, pressed ? HIGH : LOW);
}
`;

const ledProject: Lab3DProject = {
  slug:"led-blink",
  title:"Arduino Uno LED Blink",
  shortTitle:"LED Blink",
  description:"Assemble a simple LED circuit, wire D8 through a resistor, then run the same Arduino-style sketch you can take to a real Uno.",
  parts: commonParts,
  terminals:[
    {id:"uno-d8",label:"D8",partId:"arduino",left:32,top:37},
    {id:"uno-gnd",label:"GND",partId:"arduino",left:30,top:55},
    {id:"r-in",label:"R1",partId:"resistor",left:59,top:55},
    {id:"r-out",label:"R2",partId:"resistor",left:69,top:55},
    {id:"led-a",label:"LED +",partId:"led",left:78,top:44},
    {id:"led-k",label:"LED −",partId:"led",left:82,top:56},
  ],
  connections:[
    {id:"d8-resistor",from:"Arduino D8",to:"330 Ω resistor",fromTerminal:"uno-d8",toTerminal:"r-in",purpose:"GPIO output through current limiting",wireClass:"wire-blue",path:"M 320 245 C 440 240, 500 330, 605 342"},
    {id:"resistor-led",from:"330 Ω resistor",to:"LED anode (+)",fromTerminal:"r-out",toTerminal:"led-a",purpose:"limited current into LED",wireClass:"wire-red",path:"M 670 342 C 720 342, 750 285, 790 280"},
    {id:"led-ground",from:"LED cathode (-)",to:"Arduino GND",fromTerminal:"led-k",toTerminal:"uno-gnd",purpose:"return path to ground",wireClass:"wire-black",path:"M 820 350 C 720 455, 455 465, 315 365"},
  ],
  defaultSketch:defaultLedSketch,
  downloadName:"stembuild-led-lab.ino",
  inputMode:"none",
};

const buttonProject: Lab3DProject = {
  slug:"button-light",
  title:"Arduino Uno Push-Button Light",
  shortTitle:"Push-Button Light",
  description:"Add a physical input. The virtual button pulls D2 LOW, and the same Arduino-style code controls the LED on D8.",
  parts:[
    ...commonParts,
    {id:"button",label:"Push button",componentSlug:"push-button",hint:"Digital input",target:{left:52,top:27,width:12,height:14}},
  ],
  terminals:[
    {id:"uno-d8",label:"D8",partId:"arduino",left:32,top:37},
    {id:"uno-d2",label:"D2",partId:"arduino",left:30,top:30},
    {id:"uno-gnd",label:"GND",partId:"arduino",left:30,top:55},
    {id:"button-sig",label:"BTN",partId:"button",left:56,top:31},
    {id:"button-gnd",label:"BTN GND",partId:"button",left:61,top:38},
    {id:"r-in",label:"R1",partId:"resistor",left:59,top:55},
    {id:"r-out",label:"R2",partId:"resistor",left:69,top:55},
    {id:"led-a",label:"LED +",partId:"led",left:78,top:44},
    {id:"led-k",label:"LED −",partId:"led",left:82,top:56},
  ],
  connections:[
    {id:"d2-button",from:"Arduino D2",to:"Button signal",fromTerminal:"uno-d2",toTerminal:"button-sig",purpose:"reads the button using INPUT_PULLUP",wireClass:"wire-green",path:"M 300 190 C 395 180, 470 205, 555 205"},
    {id:"button-ground",from:"Button",to:"Arduino GND",fromTerminal:"button-gnd",toTerminal:"uno-gnd",purpose:"pressing connects D2 to GND",wireClass:"wire-black",path:"M 610 235 C 520 340, 420 375, 305 360"},
    {id:"d8-resistor",from:"Arduino D8",to:"330 Ω resistor",fromTerminal:"uno-d8",toTerminal:"r-in",purpose:"LED output through current limiting",wireClass:"wire-blue",path:"M 320 245 C 440 240, 500 330, 605 342"},
    {id:"resistor-led",from:"330 Ω resistor",to:"LED anode (+)",fromTerminal:"r-out",toTerminal:"led-a",purpose:"limited current into LED",wireClass:"wire-red",path:"M 670 342 C 720 342, 750 285, 790 280"},
    {id:"led-ground",from:"LED cathode (-)",to:"Arduino GND",fromTerminal:"led-k",toTerminal:"uno-gnd",purpose:"LED return path",wireClass:"wire-black",path:"M 820 350 C 720 455, 455 465, 315 365"},
  ],
  defaultSketch:defaultButtonSketch,
  downloadName:"stembuild-button-light.ino",
  inputMode:"button",
};

export const lab3dProjects: Lab3DProject[] = [ledProject, buttonProject];

export function lab3dProject(slug: Lab3DProject["slug"]) {
  return lab3dProjects.find((project) => project.slug === slug) ?? ledProject;
}

function normalizedSource(source: string) {
  return source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/.*$/gm, " ").replace(/\s+/g, " ");
}

export function checkLedSketch(source: string): SketchCheck {
  const messages: string[] = [];
  const normalized = normalizedSource(source);

  if (!/LED_PIN\s*=\s*8\b/.test(normalized)) messages.push("Set LED_PIN to Arduino D8 so the program matches the wiring.");
  if (!/pinMode\s*\(\s*LED_PIN\s*,\s*OUTPUT\s*\)/.test(normalized)) messages.push("setup() needs pinMode(LED_PIN, OUTPUT).");
  if (!/digitalWrite\s*\(\s*LED_PIN\s*,\s*HIGH\s*\)/.test(normalized)) messages.push("The sketch never drives the LED HIGH.");
  if (!/digitalWrite\s*\(\s*LED_PIN\s*,\s*LOW\s*\)/.test(normalized)) messages.push("The sketch never drives the LED LOW.");

  const delays = [...normalized.matchAll(/delay\s*\(\s*(\d+)\s*\)/g)].map((match) => Number(match[1]));
  const highDelayMs = delays[0] ?? 500;
  const lowDelayMs = delays[1] ?? delays[0] ?? 500;
  if (delays.length === 0) messages.push("Add delay(...) so the LED state remains visible in this prototype.");

  return { ok: messages.length === 0, messages, highDelayMs, lowDelayMs };
}

export function checkButtonSketch(source: string): SketchCheck {
  const messages: string[] = [];
  const normalized = normalizedSource(source);

  if (!/BUTTON_PIN\s*=\s*2\b/.test(normalized)) messages.push("Set BUTTON_PIN to Arduino D2 so the program matches the wiring.");
  if (!/LED_PIN\s*=\s*8\b/.test(normalized)) messages.push("Set LED_PIN to Arduino D8 so the LED matches the wiring.");
  if (!/pinMode\s*\(\s*BUTTON_PIN\s*,\s*INPUT_PULLUP\s*\)/.test(normalized)) messages.push("Use pinMode(BUTTON_PIN, INPUT_PULLUP).");
  if (!/pinMode\s*\(\s*LED_PIN\s*,\s*OUTPUT\s*\)/.test(normalized)) messages.push("setup() needs pinMode(LED_PIN, OUTPUT).");
  if (!/digitalRead\s*\(\s*BUTTON_PIN\s*\)/.test(normalized)) messages.push("Read the button with digitalRead(BUTTON_PIN).");
  if (!/digitalWrite\s*\(\s*LED_PIN\s*,/.test(normalized)) messages.push("Drive the LED with digitalWrite(LED_PIN, ...).");

  return { ok: messages.length === 0, messages, highDelayMs:0, lowDelayMs:0 };
}

export function checkProjectSketch(project: Lab3DProject, source: string) {
  return project.slug === "button-light" ? checkButtonSketch(source) : checkLedSketch(source);
}

export function labReadiness(project: Lab3DProject, placed: string[], connected: string[], source: string) {
  const missingParts = project.parts.filter((part) => !placed.includes(part.id)).map((part) => part.label);
  const missingConnections = project.connections.filter((wire) => !connected.includes(wire.id)).map((wire) => `${wire.from} → ${wire.to}`);
  const sketch = checkProjectSketch(project, source);
  return {
    ready: missingParts.length === 0 && missingConnections.length === 0 && sketch.ok,
    missingParts,
    missingConnections,
    sketch,
  };
}

export function connectionForTerminals(project: Lab3DProject, a: string, b: string) {
  return project.connections.find((wire) =>
    (wire.fromTerminal === a && wire.toTerminal === b) ||
    (wire.fromTerminal === b && wire.toTerminal === a)
  );
}

// Fast mode is a template preview, not an Arduino interpreter. Never claim an
// arbitrary sketch works merely because pin names appear somewhere in its text.
export function supportsFastSketch(project: Lab3DProject, source: string) {
  const canonical = (text: string) => normalizedSource(text)
    .replace(/#\s*include\s*[<"]Arduino\.h[>"]/g, "")
    .replace(/delay\s*\(\s*\d+\s*\)/g, "delay(N)")
    .replace(/\s/g, "");
  const delays = [...normalizedSource(source).matchAll(/delay\s*\(\s*(\d+)\s*\)/g)].map(m=>Number(m[1]));
  return delays.every(n=>Number.isSafeInteger(n) && n <= 60_000) && canonical(source) === canonical(project.defaultSketch);
}


// Backups are deliberately small text documents; never import arbitrary hardware,
// code or wire IDs into a different project or use saved file data as trusted markup.
export type LabProjectBackup = {
  version: 1;
  slug: Lab3DProject["slug"];
  placed: string[];
  connected: string[];
  code: string;
};

export function parseLabProjectBackup(value: unknown): LabProjectBackup {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw Error("Invalid STEMBuild circuit project backup.");
  }
  const raw = value as Record<string, unknown>;
  if (raw.version !== 1 || (raw.slug !== "led-blink" && raw.slug !== "button-light") ||
      !Array.isArray(raw.placed) || !Array.isArray(raw.connected) ||
      raw.placed.length > 20 || raw.connected.length > 30 ||
      typeof raw.code !== "string" || raw.code.length > 50_000) {
    throw Error("Unsupported STEMBuild circuit backup.");
  }
  const project = lab3dProject(raw.slug);
  const partIds = new Set(project.parts.map((part) => part.id));
  const wireIds = new Set(project.connections.map((wire) => wire.id));
  if (raw.placed.some((id: unknown) => typeof id !== "string" || !partIds.has(id)) ||
      raw.connected.some((id: unknown) => typeof id !== "string" || !wireIds.has(id))) {
    throw Error("Circuit backup contains unknown components or wires.");
  }
  const placed = [...new Set(raw.placed)] as string[];
  const connected = [...new Set(raw.connected)] as string[];
  const selected = new Set(placed);
  if (project.connections.filter((wire) => connected.includes(wire.id)).some((wire) =>
    !selected.has(project.terminals.find((pin) => pin.id === wire.fromTerminal)?.partId ?? "") ||
    !selected.has(project.terminals.find((pin) => pin.id === wire.toTerminal)?.partId ?? "")
  )) {
    throw Error("Circuit backup has wires connected to missing parts.");
  }
  return { version: 1, slug: raw.slug, placed, connected, code: raw.code };
}
