// Ready-made Maker Studio projects: wired circuits with working code, as starting points to modify.
import type { PlacedPart, StudioDoc, StudioWire } from "@/lib/studio/circuit";

const part = (id: string, type: PlacedPart["type"], x: number, y: number, props: PlacedPart["props"] = {}): PlacedPart => ({ id, type, x, y, props });
const w = (id: string, a: string, b: string, colour = "blue"): StudioWire => ({ id, a, b, colour });

export type StudioExample = { id: string; name: string; level: string; summary: string; doc: StudioDoc };

const blinkCode = `// Blink: the first program on every new board.
const int LED_PIN = 13;

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

export const EMPTY_DOC: StudioDoc = { version: 1, parts: [], wires: [], code: `void setup() {
  // runs once
}

void loop() {
  // runs forever
}
` };

export const STUDIO_EXAMPLES: StudioExample[] = [
  {
    id: "blink", name: "Blink an LED", level: "Beginner", summary: "D13 → 220 Ω → LED → GND. Change the delays and press Run again.",
    doc: { version: 1, code: blinkCode,
      parts: [part("r1", "resistor", 560, 190, { ohms: 220 }), part("led1", "led", 700, 120, { colour: "red" })],
      wires: [w("w1", "uno:D13", "r1:a", "orange"), w("w2", "r1:b", "led1:anode", "orange"), w("w3", "led1:cathode", "uno:GND_T", "black")] },
  },
  {
    id: "traffic", name: "Traffic light", level: "Beginner", summary: "Three LEDs in sequence on D10, D9 and D8.",
    doc: { version: 1,
      code: `const int RED = 10, AMBER = 9, GREEN = 8;

void setup() {
  pinMode(RED, OUTPUT);
  pinMode(AMBER, OUTPUT);
  pinMode(GREEN, OUTPUT);
}

void show(int red, int amber, int green, int ms) {
  digitalWrite(RED, red);
  digitalWrite(AMBER, amber);
  digitalWrite(GREEN, green);
  delay(ms);
}

void loop() {
  show(HIGH, LOW, LOW, 2000);   // stop
  show(HIGH, HIGH, LOW, 800);   // get ready
  show(LOW, LOW, HIGH, 2000);   // go
  show(LOW, HIGH, LOW, 800);    // slow down
}
`,
      parts: [part("r1", "resistor", 520, 110, { ohms: 220 }), part("r2", "resistor", 520, 170, { ohms: 220 }), part("r3", "resistor", 520, 230, { ohms: 220 }),
        part("led1", "led", 680, 60, { colour: "red" }), part("led2", "led", 750, 60, { colour: "yellow" }), part("led3", "led", 820, 60, { colour: "green" })],
      wires: [w("w1", "uno:D10", "r1:a", "red"), w("w2", "uno:D9", "r2:a", "yellow"), w("w3", "uno:D8", "r3:a", "green"),
        w("w4", "r1:b", "led1:anode", "red"), w("w5", "r2:b", "led2:anode", "yellow"), w("w6", "r3:b", "led3:anode", "green"),
        w("w7", "led1:cathode", "uno:GND_T", "black"), w("w8", "led2:cathode", "led1:cathode", "black"), w("w9", "led3:cathode", "led2:cathode", "black")] },
  },
  {
    id: "night-light", name: "Night light", level: "Intermediate", summary: "Light sensor on A0 switches an LED on when it gets dark. Drag the light slider.",
    doc: { version: 1,
      code: `const int LED_PIN = 9;
const int THRESHOLD = 400;   // tune this with the Serial monitor

void setup() {
  pinMode(LED_PIN, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  int light = analogRead(A0);
  Serial.print("light:");
  Serial.println(light);
  digitalWrite(LED_PIN, light < THRESHOLD ? HIGH : LOW);
  delay(200);
}
`,
      parts: [part("s1", "light-sensor", 600, 620, { light: 0.7 }), part("r1", "resistor", 560, 190, { ohms: 330 }), part("led1", "led", 700, 120, { colour: "white" })],
      wires: [w("w1", "s1:vcc", "uno:5V", "red"), w("w2", "s1:gnd", "uno:GND_B1", "black"), w("w3", "s1:ao", "uno:A0", "yellow"),
        w("w4", "uno:D9", "r1:a", "blue"), w("w5", "r1:b", "led1:anode", "blue"), w("w6", "led1:cathode", "uno:GND_T", "black")] },
  },
  {
    id: "parking", name: "Parking sensor", level: "Intermediate", summary: "HC-SR04 measures distance; the buzzer beeps faster as you get closer.",
    doc: { version: 1,
      code: `const int TRIG = 7, ECHO = 6, BUZZER = 8;

void setup() {
  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);
  Serial.begin(9600);
}

long readCm() {
  digitalWrite(TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG, LOW);
  return pulseIn(ECHO, HIGH, 30000) / 58;
}

void loop() {
  long cm = readCm();
  Serial.print("cm:");
  Serial.println(cm);
  if (cm > 0 && cm < 30) {
    tone(BUZZER, 1000, 60);
    delay(cm * 10);
  } else {
    noTone(BUZZER);
    delay(100);
  }
}
`,
      parts: [part("u1", "ultrasonic", 560, 120, { distance: 60 }), part("z1", "buzzer", 760, 120)],
      wires: [w("w1", "u1:vcc", "uno:5V", "red"), w("w2", "u1:gnd", "uno:GND_B2", "black"), w("w3", "u1:trig", "uno:D7", "green"), w("w4", "u1:echo", "uno:D6", "yellow"),
        w("w5", "z1:plus", "uno:D8", "blue"), w("w6", "z1:minus", "uno:GND_T", "black")] },
  },
  {
    id: "servo-knob", name: "Servo controlled by a knob", level: "Advanced", summary: "Potentiometer on A0 sets the servo angle on D9.",
    doc: { version: 1,
      code: `#include <Servo.h>

Servo arm;

void setup() {
  arm.attach(9);
}

void loop() {
  int raw = analogRead(A0);              // 0..1023
  int angle = map(raw, 0, 1023, 0, 180);  // 0..180 degrees
  arm.write(angle);
  delay(15);
}
`,
      parts: [part("p1", "potentiometer", 600, 620, { position: 0.3 }), part("s1", "servo", 600, 120)],
      wires: [w("w1", "p1:end1", "uno:GND_B1", "black"), w("w2", "p1:end2", "uno:5V", "red"), w("w3", "p1:wiper", "uno:A0", "yellow"),
        w("w4", "s1:gnd", "uno:GND_T", "black"), w("w5", "s1:vcc", "uno:5V", "red"), w("w6", "s1:signal", "uno:D9", "orange")] },
  },
  {
    id: "motor", name: "Motor speed and direction", level: "Advanced", summary: "H-bridge on D7/D6 sets direction; PWM on D5 sets speed from the knob.",
    doc: { version: 1,
      code: `const int IN1 = 7, IN2 = 6, EN = 5;

void setup() {
  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  pinMode(EN, OUTPUT);
}

void loop() {
  int raw = analogRead(A0);
  int speed = map(abs(raw - 512), 0, 512, 0, 255);
  // Left half of the knob: reverse. Right half: forward.
  digitalWrite(IN1, raw > 512 ? HIGH : LOW);
  digitalWrite(IN2, raw > 512 ? LOW : HIGH);
  analogWrite(EN, speed);
  delay(20);
}
`,
      parts: [part("m1", "motor-driver", 600, 110), part("p1", "potentiometer", 600, 620, { position: 0.8 })],
      wires: [w("w1", "m1:vcc", "uno:5V", "red"), w("w2", "m1:gnd", "uno:GND_B2", "black"), w("w3", "m1:in1", "uno:D7", "green"), w("w4", "m1:in2", "uno:D6", "yellow"), w("w5", "m1:en", "uno:D5", "blue"),
        w("w6", "p1:end1", "uno:GND_B1", "black"), w("w7", "p1:end2", "uno:5V", "red"), w("w8", "p1:wiper", "uno:A0", "orange")] },
  },
];
