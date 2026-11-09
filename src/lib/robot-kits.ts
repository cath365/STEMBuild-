// Robot kits for the Robot Builder: parts, the wiring each kit needs (with the reason for every
// wire), a top-view driving model for its arena, and the matching Arduino sketch.
// Pure functions so the behaviour can be unit-tested without a browser.

export type KitId = "line-follower" | "light-seeker" | "bluetooth-car";
export type KitPart = { id: string; name: string; image: string; x: number; y: number; w: number; h: number; pins: string[] };
export type KitConnection = { a: string; b: string; why: string };
export type RobotKit = {
  id: KitId; title: string; level: string; summary: string; learn: string[];
  parts: KitPart[]; connections: KitConnection[]; sketch: string; arena: "line" | "light" | "remote";
};

const uno = (pins: string[]): KitPart => ({ id: "uno", name: "Arduino Uno", image: "/images/cad/uno.webp", x: 150, y: 128, w: 70, h: 52, pins: ["5V", "GND", ...pins] });
const common: KitPart[] = [
  { id: "chassis", name: "Robot chassis", image: "/illustrations/robot-chassis.svg", x: 200, y: 150, w: 170, h: 230, pins: [] },
  { id: "motorL", name: "Left motor", image: "/images/cad/motor.webp", x: 98, y: 190, w: 56, h: 40, pins: ["+", "−"] },
  { id: "motorR", name: "Right motor", image: "/images/cad/motor.webp", x: 302, y: 190, w: 56, h: 40, pins: ["+", "−"] },
  { id: "wheels", name: "Wheels and caster", image: "/images/cad/wheel.webp", x: 200, y: 268, w: 60, h: 36, pins: [] },
  { id: "driver", name: "L298N motor driver", image: "/images/cad/l298n.webp", x: 250, y: 128, w: 64, h: 52, pins: ["VS", "GND", "IN1", "IN2", "IN3", "IN4", "OUT1", "OUT2", "OUT3", "OUT4"] },
  { id: "battery", name: "Motor battery pack", image: "/images/cad/battery.webp", x: 200, y: 212, w: 64, h: 40, pins: ["+", "−"] },
];
const drive: KitConnection[] = [
  { a: "uno:D4", b: "driver:IN1", why: "Left motor direction, first input." },
  { a: "uno:D5", b: "driver:IN2", why: "Left motor direction, second input. IN1 HIGH + IN2 LOW = forward." },
  { a: "uno:D6", b: "driver:IN3", why: "Right motor direction, first input." },
  { a: "uno:D7", b: "driver:IN4", why: "Right motor direction, second input." },
  { a: "driver:OUT1", b: "motorL:+", why: "The driver, not the Uno, powers the left motor." },
  { a: "driver:OUT2", b: "motorL:−", why: "Completes the left motor's circuit. Swap OUT1/OUT2 to reverse it." },
  { a: "driver:OUT3", b: "motorR:+", why: "The driver powers the right motor." },
  { a: "driver:OUT4", b: "motorR:−", why: "Completes the right motor's circuit." },
  { a: "battery:+", b: "driver:VS", why: "Motors get their own battery: they need far more current than the Uno can give." },
  { a: "battery:−", b: "driver:GND", why: "Battery return." },
  { a: "uno:GND", b: "driver:GND", why: "Common ground: the driver must share 0 V with the Uno to understand its signals." },
];
const motorsFn = `void motors(int left, int right) {                 // 1 = forward, 0 = stop, -1 = reverse
  digitalWrite(IN1, left > 0);  digitalWrite(IN2, left < 0);
  digitalWrite(IN3, right > 0); digitalWrite(IN4, right < 0);
}`;

export const ROBOT_KITS: RobotKit[] = [
  {
    id: "line-follower", title: "Line-following robot", level: "Beginner", arena: "line",
    summary: "Two infrared sensors look down at the floor. When the line slides under one of them, the robot turns that way.",
    learn: ["Digital sensors", "If / else decisions", "Differential steering"],
    parts: [uno(["D2", "D3", "D4", "D5", "D6", "D7"]), ...common,
      { id: "irL", name: "Left line sensor", image: "/images/cad/ir.webp", x: 168, y: 40, w: 46, h: 36, pins: ["VCC", "GND", "OUT"] },
      { id: "irR", name: "Right line sensor", image: "/images/cad/ir.webp", x: 232, y: 40, w: 46, h: 36, pins: ["VCC", "GND", "OUT"] }],
    connections: [
      { a: "uno:5V", b: "irL:VCC", why: "Powers the left sensor." }, { a: "uno:GND", b: "irL:GND", why: "Left sensor ground." },
      { a: "uno:D2", b: "irL:OUT", why: "The Uno reads the left sensor on D2: HIGH means it sees the black line." },
      { a: "uno:5V", b: "irR:VCC", why: "Powers the right sensor." }, { a: "uno:GND", b: "irR:GND", why: "Right sensor ground." },
      { a: "uno:D3", b: "irR:OUT", why: "The Uno reads the right sensor on D3." },
      ...drive,
    ],
    sketch: `// STEMBuild line follower: two IR line sensors and an L298N (ENA/ENB jumpers fitted).
const int LEFT_SENSOR = 2, RIGHT_SENSOR = 3;      // HIGH over the black line
const int IN1 = 4, IN2 = 5, IN3 = 6, IN4 = 7;

${motorsFn}

void setup() {
  pinMode(LEFT_SENSOR, INPUT);
  pinMode(RIGHT_SENSOR, INPUT);
  for (int pin = IN1; pin <= IN4; pin++) pinMode(pin, OUTPUT);
}

void loop() {
  bool left = digitalRead(LEFT_SENSOR) == HIGH;
  bool right = digitalRead(RIGHT_SENSOR) == HIGH;
  if (left && !right) motors(0, 1);         // line under the left sensor: turn left
  else if (right && !left) motors(1, 0);    // line under the right sensor: turn right
  else motors(1, 1);                         // line between the sensors: straight on
}
`,
  },
  {
    id: "light-seeker", title: "Light-seeking robot", level: "Intermediate", arena: "light",
    summary: "Two light sensors angled left and right. The robot turns toward whichever side is brighter and stops when it reaches the light.",
    learn: ["Analog sensors (analogRead)", "Comparing two readings", "Thresholds"],
    parts: [uno(["A0", "A1", "D4", "D5", "D6", "D7"]), ...common,
      { id: "ldrL", name: "Left light sensor", image: "/images/cad/ldr.webp", x: 160, y: 40, w: 46, h: 36, pins: ["VCC", "GND", "AO"] },
      { id: "ldrR", name: "Right light sensor", image: "/images/cad/ldr.webp", x: 240, y: 40, w: 46, h: 36, pins: ["VCC", "GND", "AO"] }],
    connections: [
      { a: "uno:5V", b: "ldrL:VCC", why: "Powers the left light sensor." }, { a: "uno:GND", b: "ldrL:GND", why: "Left sensor ground." },
      { a: "uno:A0", b: "ldrL:AO", why: "Analog pin A0 measures the left brightness (0–1023)." },
      { a: "uno:5V", b: "ldrR:VCC", why: "Powers the right light sensor." }, { a: "uno:GND", b: "ldrR:GND", why: "Right sensor ground." },
      { a: "uno:A1", b: "ldrR:AO", why: "A1 measures the right brightness." },
      ...drive,
    ],
    sketch: `// STEMBuild light seeker: two LDR modules (AO rises with light) and an L298N.
const int LEFT_EYE = A0, RIGHT_EYE = A1;
const int IN1 = 4, IN2 = 5, IN3 = 6, IN4 = 7;
const int ARRIVED = 700, DARK = 120, MARGIN = 40;   // ARRIVED is compared with the average of both eyes

${motorsFn}

void setup() {
  for (int pin = IN1; pin <= IN4; pin++) pinMode(pin, OUTPUT);
  Serial.begin(115200);
}

void loop() {
  int left = analogRead(LEFT_EYE), right = analogRead(RIGHT_EYE);
  Serial.print("left:"); Serial.print(left); Serial.print(" right:"); Serial.println(right);
  if ((left + right) / 2 > ARRIVED) motors(0, 0);       // both eyes bright: reached the light
  else if (max(left, right) < DARK) motors(-1, 1);       // too dark: spin to search
  else if (left > right + MARGIN) motors(0, 1);          // brighter on the left: turn left
  else if (right > left + MARGIN) motors(1, 0);          // brighter on the right: turn right
  else motors(1, 1);
  delay(20);
}
`,
  },
  {
    id: "bluetooth-car", title: "Bluetooth remote-control car", level: "Intermediate", arena: "remote",
    summary: "An HC-05 Bluetooth module receives letters from a phone app: F, B, L, R and S drive the car.",
    learn: ["Serial communication (UART)", "Commands and switch statements", "3.3 V signal safety"],
    parts: [uno(["D4", "D5", "D6", "D7", "D10", "D11"]), ...common,
      { id: "bt", name: "HC-05 Bluetooth module", image: "/images/cad/hc05.webp", x: 200, y: 48, w: 56, h: 36, pins: ["VCC", "GND", "TXD", "RXD"] }],
    connections: [
      { a: "uno:5V", b: "bt:VCC", why: "Powers the Bluetooth module (its board accepts 5 V)." }, { a: "uno:GND", b: "bt:GND", why: "Module ground." },
      { a: "bt:TXD", b: "uno:D10", why: "What the phone sends arrives on D10 (SoftwareSerial RX). Transmit goes to receive." },
      { a: "uno:D11", b: "bt:RXD", why: "D11 sends replies back. On a real robot put a 1 kΩ / 2 kΩ divider here: RXD takes 3.3 V." },
      ...drive,
    ],
    sketch: `// STEMBuild Bluetooth car: HC-05 on SoftwareSerial (D10 RX, D11 TX) and an L298N.
// Pair your phone with HC-05 (PIN 1234), then send F, B, L, R or S from a Bluetooth terminal app.
#include <SoftwareSerial.h>
SoftwareSerial bt(10, 11);   // RX, TX
const int IN1 = 4, IN2 = 5, IN3 = 6, IN4 = 7;

${motorsFn}

void setup() {
  for (int pin = IN1; pin <= IN4; pin++) pinMode(pin, OUTPUT);
  bt.begin(9600);
}

void loop() {
  if (!bt.available()) return;
  switch (bt.read()) {
    case 'F': motors(1, 1); break;
    case 'B': motors(-1, -1); break;
    case 'L': motors(-1, 1); break;
    case 'R': motors(1, -1); break;
    case 'S': motors(0, 0); break;
  }
}
`,
  },
];

export const KIT_BY_ID = Object.fromEntries(ROBOT_KITS.map((k) => [k.id, k])) as Record<KitId, RobotKit>;

// ---------- Wiring ----------

/** Checks a kit's wires: every required connection made, nothing joined that should not be. */
export function checkKitWiring(kit: RobotKit, wires: { a: string; b: string }[]) {
  const pins = kit.parts.flatMap((p) => p.pins.map((pin) => `${p.id}:${pin}`));
  const find = (parent: Map<string, string>, x: string): string => { const p = parent.get(x) ?? x; if (p === x) return x; const r = find(parent, p); parent.set(x, r); return r; };
  const allowed = new Map(pins.map((p) => [p, p]));
  for (const c of kit.connections) allowed.set(find(allowed, c.a), find(allowed, c.b));
  const made = new Map(pins.map((p) => [p, p]));
  for (const w of wires) made.set(find(made, w.a), find(made, w.b));
  const missing = kit.connections.filter((c) => find(made, c.a) !== find(made, c.b));
  const wrong = wires.filter((w) => !allowed.has(w.a) || !allowed.has(w.b) || find(allowed, w.a) !== find(allowed, w.b));
  return { ok: !missing.length && !wrong.length, missing, wrong, next: missing[0] ?? null };
}

/** Whether joining two pins is allowed (they belong to the same electrical net in the kit's design). */
export function canJoin(kit: RobotKit, a: string, b: string) {
  return checkKitWiring(kit, [{ a, b }]).wrong.length === 0 && a !== b;
}

export function pinName(kit: RobotKit, endpoint: string) {
  const [part, pin] = endpoint.split(":");
  return `${kit.parts.find((p) => p.id === part)?.name ?? part} ${pin}`;
}

// ---------- Driving models (top view, centimetres; heading 0 faces +z, increasing heading turns left) ----------

export type Pose = { x: number; z: number; heading: number };
export type DriveFrame = { pose: Pose; left: number; right: number; status: string; readings: Record<string, string>; laps?: number };

const TRACK_WIDTH = 14, SPEED = 20, WALL = 92;
const forward = (h: number) => ({ x: Math.sin(h), z: Math.cos(h) });
const leftOf = (h: number) => ({ x: Math.cos(h), z: -Math.sin(h) });

/** Moves a differential-drive robot (wheel speeds −1..1). Against a wall it can still turn on the
 *  spot, but it cannot move further into the wall; `bumped` reports that. */
export function driveStep(pose: Pose, left: number, right: number, dt: number): { pose: Pose; bumped: boolean } {
  const v = ((left + right) / 2) * SPEED, w = ((right - left) * SPEED) / TRACK_WIDTH;
  const heading = pose.heading + w * dt;
  const f = forward(heading);
  const next = { x: pose.x + f.x * v * dt, z: pose.z + f.z * v * dt, heading };
  if (Math.abs(next.x) > WALL || Math.abs(next.z) > WALL) return { pose: { ...pose, heading }, bumped: true };
  return { pose: next, bumped: false };
}

// Line track: an ellipse, sampled once so distance checks are fast.
export const TRACK = { rx: 70, rz: 50, halfWidth: 2.2 };
const TRACK_POINTS = Array.from({ length: 720 }, (_, i) => { const t = (i / 720) * Math.PI * 2; return { x: TRACK.rx * Math.cos(t), z: TRACK.rz * Math.sin(t) }; });
export function onLine(x: number, z: number) {
  let best = Infinity;
  for (const p of TRACK_POINTS) { const d = (p.x - x) ** 2 + (p.z - z) ** 2; if (d < best) best = d; }
  return Math.sqrt(best) <= TRACK.halfWidth;
}
export const LINE_START: Pose = { x: 0, z: TRACK.rz, heading: Math.PI / 2 };

export function sensorPoints(pose: Pose, ahead: number, apart: number) {
  const f = forward(pose.heading), l = leftOf(pose.heading);
  const front = { x: pose.x + f.x * ahead, z: pose.z + f.z * ahead };
  return { left: { x: front.x + l.x * apart, z: front.z + l.z * apart }, right: { x: front.x - l.x * apart, z: front.z - l.z * apart } };
}

export function stepLineFollower(pose: Pose, dt: number, travelled = 0): DriveFrame & { travelled: number } {
  const s = sensorPoints(pose, 10, 3);
  const left = onLine(s.left.x, s.left.z), right = onLine(s.right.x, s.right.z);
  const [l, r] = left && !right ? [0, 1] : right && !left ? [1, 0] : [1, 1];
  const { pose: moved, bumped } = driveStep(pose, l, r, dt);
  // Laps: the angle travelled around the track's centre, one lap per full turn.
  let delta = Math.atan2(moved.z, moved.x) - Math.atan2(pose.z, pose.x);
  if (delta > Math.PI) delta -= 2 * Math.PI;
  if (delta < -Math.PI) delta += 2 * Math.PI;
  const total = travelled + delta;
  const status = bumped ? "Bumped the wall: it lost the line" : left && !right ? "Line under the left sensor: turning left" : right && !left ? "Line under the right sensor: turning right" : "Line between the sensors: straight on";
  return {
    pose: moved, left: l, right: r, status, travelled: total, laps: Math.floor(Math.abs(total) / (2 * Math.PI)),
    readings: { "Left sensor (D2)": left ? "HIGH · black" : "LOW · floor", "Right sensor (D3)": right ? "HIGH · black" : "LOW · floor" },
  };
}
/** Arrival is judged on the average of both eyes, which is only high when the robot faces the light
 *  and is close (about 40 cm): a single eye looking sideways at the light cannot trigger it. */
export const ARRIVED = 700;

/** Brightness an LDR module would report (0–1023), facing 35° to one side of the robot. */
export function eyeReading(pose: Pose, side: 1 | -1, light: { x: number; z: number }) {
  const s = sensorPoints(pose, 9, 4)[side === 1 ? "left" : "right"];
  const dx = light.x - s.x, dz = light.z - s.z, d2 = dx * dx + dz * dz;
  const facing = pose.heading + side * 0.6;
  const cos = (Math.sin(facing) * dx + Math.cos(facing) * dz) / Math.sqrt(d2 || 1);
  // Falls off with distance squared; 1 m away it still reads about half of full scale facing the light.
  return Math.round(Math.min(1023, (1023 * 10000) / (d2 + 10000)) * (0.2 + 0.8 * Math.max(0, cos)));
}

export function stepLightSeeker(pose: Pose, light: { x: number; z: number }, dt: number): DriveFrame {
  const left = eyeReading(pose, 1, light), right = eyeReading(pose, -1, light);
  const brightest = Math.max(left, right), average = (left + right) / 2;
  let l = 1, r = 1, status = "Light ahead: driving straight";
  if (average > ARRIVED) { l = 0; r = 0; status = "Reached the light: stopped"; }
  else if (brightest < 120) { l = -1; r = 1; status = "Too dark: spinning to search"; }
  else if (left > right + 40) { l = 0; status = "Brighter on the left: turning left"; }
  else if (right > left + 40) { r = 0; status = "Brighter on the right: turning right"; }
  const next = driveStep(pose, l, r, dt);
  return { pose: next.pose, left: l, right: r, status: next.bumped ? "Bumped the wall: turning away" : status, readings: { "Left eye (A0)": String(left), "Right eye (A1)": String(right) } };
}

export type RemoteCommand = "F" | "B" | "L" | "R" | "S";
const COMMANDS: Record<RemoteCommand, [number, number, string]> = { F: [1, 1, "Forward"], B: [-1, -1, "Reverse"], L: [-1, 1, "Spinning left"], R: [1, -1, "Spinning right"], S: [0, 0, "Stopped"] };
export function stepRemote(pose: Pose, command: RemoteCommand, dt: number): DriveFrame {
  const [l, r, label] = COMMANDS[command];
  const next = driveStep(pose, l, r, dt);
  return { pose: next.pose, left: l, right: r, status: next.bumped ? "Bumped the wall: turn or reverse" : label, readings: { "Last command": command } };
}
