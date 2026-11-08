// Maker Studio challenges: open briefs checked by an automatic test bench that drives the
// learner's own circuit and code. Learners choose the pins and write the code themselves.
import type { PartType } from "@/lib/studio/parts";
import type { PartView } from "@/lib/studio/circuit";

export type ChallengeLevel = "Beginner" | "Intermediate" | "Advanced" | "Expert";

/** What the test bench can do to a running build. All waits are in emulated milliseconds. */
export type Harness = {
  find(type: PartType, pin?: string): string | null;
  press(partId: string): void;
  release(partId: string): void;
  /** Press with realistic contact bounce (several fast make/break transitions over ~3 ms). */
  bouncePress(partId: string): Promise<void>;
  bounceRelease(partId: string): Promise<void>;
  setProp(partId: string, key: string, value: number | boolean | string): void;
  wait(ms: number): Promise<void>;
  /** Emulated time since the simulation started, in milliseconds. */
  now(): number;
  view(partId: string): PartView;
  serial(): string;
  code: string;
};

export type Check = { label: string; passed: boolean; detail?: string };
export type Challenge = { id: string; level: ChallengeLevel; title: string; brief: string; criteria: string[]; parts: PartType[]; concepts: string[]; run(h: Harness): Promise<Check[]> };

const lit = (view: PartView) => (view.brightness ?? 0) > 0.4;
const missing = (what: string): Check[] => [{ label: `Your circuit needs ${what}`, passed: false, detail: "Add it from the parts list and wire it up." }];

/** Samples until `ms` of emulated time has passed; returns the readings and the exact elapsed time. */
async function sample<T>(h: Harness, ms: number, every: number, read: () => T) {
  const values: T[] = [];
  const start = h.now();
  while (h.now() - start < ms) { values.push(read()); await h.wait(every); }
  return Object.assign(values, { elapsedMs: h.now() - start });
}
const transitions = (values: boolean[]) => values.slice(1).filter((v, i) => v !== values[i]).length;
/** Full on/off cycles per second, from sampled on/off states over a measured time. */
const blinkRate = (values: boolean[] & { elapsedMs: number }) => transitions(values) / 2 / (values.elapsedMs / 1000);
const stripComments = (code: string) => code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

export const CHALLENGES: Challenge[] = [
  {
    id: "blink-2hz", level: "Beginner", title: "Blink at 2 Hz", parts: ["led", "resistor"], concepts: ["digitalWrite", "delay", "current limiting"],
    brief: "Make an LED flash twice every second: on for a quarter second, off for a quarter second.",
    criteria: ["The LED is protected by a resistor", "It turns fully on and fully off", "It completes about two flashes per second"],
    async run(h) {
      const led = h.find("led");
      if (!led) return missing("an LED");
      const states = await sample(h, 2000, 20, () => h.view(led));
      if (states.some((s) => s.burnt)) return [{ label: "The LED is protected by a resistor", passed: false, detail: "It burnt out. Put a 220 Ω resistor in series with it." }];
      const on = Object.assign(states.map(lit), { elapsedMs: states.elapsedMs });
      const rate = blinkRate(on);
      return [
        { label: "The LED is protected by a resistor", passed: true },
        { label: "It turns fully on and fully off", passed: on.includes(true) && on.includes(false) },
        { label: "It completes about two flashes per second", passed: rate >= 1.6 && rate <= 2.4, detail: `Measured ${rate.toFixed(1)} flashes per second.` },
      ];
    },
  },
  {
    id: "button-light", level: "Beginner", title: "Button-controlled light", parts: ["button", "led", "resistor"], concepts: ["digitalRead", "INPUT_PULLUP", "if statements"],
    brief: "The LED is on only while the button is held down.",
    criteria: ["LED is off when the button is released", "LED is on while the button is pressed", "It turns off again when released"],
    async run(h) {
      const led = h.find("led"), button = h.find("button");
      if (!led || !button) return missing("an LED and a push button");
      h.release(button); await h.wait(200);
      const off1 = !lit(h.view(led));
      h.press(button); await h.wait(200);
      const on = lit(h.view(led));
      h.release(button); await h.wait(200);
      const off2 = !lit(h.view(led));
      return [
        { label: "LED is off when the button is released", passed: off1 },
        { label: "LED is on while the button is pressed", passed: on, detail: on ? undefined : "Check the button wiring and use pinMode(pin, INPUT_PULLUP): pressed reads LOW." },
        { label: "It turns off again when released", passed: off2 },
      ];
    },
  },
  {
    id: "dimmer", level: "Intermediate", title: "Knob-controlled dimmer", parts: ["potentiometer", "led", "resistor"], concepts: ["analogRead", "map()", "PWM / analogWrite"],
    brief: "Turning the potentiometer smoothly changes the LED brightness, from almost off to full.",
    criteria: ["Low setting gives a dim LED", "Brightness rises as the knob turns", "High setting gives a bright LED"],
    async run(h) {
      const led = h.find("led"), pot = h.find("potentiometer");
      if (!led || !pot) return missing("an LED and a potentiometer");
      const read = async (position: number) => { h.setProp(pot, "position", position); await h.wait(250); return h.view(led).brightness ?? 0; };
      const low = await read(0.08), mid = await read(0.5), high = await read(0.95);
      return [
        { label: "Low setting gives a dim LED", passed: low < 0.3, detail: `Brightness ${Math.round(low * 100)}%` },
        { label: "Brightness rises as the knob turns", passed: low < mid && mid < high, detail: `${Math.round(low * 100)}% → ${Math.round(mid * 100)}% → ${Math.round(high * 100)}%. Is the LED on a PWM pin (~)?` },
        { label: "High setting gives a bright LED", passed: high > 0.7 },
      ];
    },
  },
  {
    id: "night-light", level: "Intermediate", title: "Automatic night light", parts: ["light-sensor", "led", "resistor"], concepts: ["analog thresholds", "sensor calibration"],
    brief: "The LED switches on automatically when it gets dark and off when it is bright.",
    criteria: ["Off in bright light", "On in the dark"],
    async run(h) {
      const led = h.find("led"), sensor = h.find("light-sensor");
      if (!led || !sensor) return missing("an LED and a light sensor");
      h.setProp(sensor, "light", 0.9); await h.wait(300);
      const bright = lit(h.view(led));
      h.setProp(sensor, "light", 0.1); await h.wait(300);
      const dark = lit(h.view(led));
      return [{ label: "Off in bright light", passed: !bright }, { label: "On in the dark", passed: dark, detail: dark ? undefined : "Print analogRead() to the Serial monitor to find a good threshold." }];
    },
  },
  {
    id: "parking-sensor", level: "Intermediate", title: "Parking sensor", parts: ["ultrasonic", "buzzer"], concepts: ["pulseIn()", "timing to distance", "tone()"],
    brief: "A buzzer sounds when an obstacle is closer than 20 cm, and stays silent when the way is clear.",
    criteria: ["Silent at 100 cm", "Sounds at 10 cm"],
    async run(h) {
      const sensor = h.find("ultrasonic"), buzzer = h.find("buzzer");
      if (!sensor || !buzzer) return missing("an HC-SR04 sensor and a buzzer");
      const sounding = async (cm: number) => { h.setProp(sensor, "distance", cm); await h.wait(300); return (await sample(h, 600, 40, () => (h.view(buzzer).frequency ?? 0) > 0)).some(Boolean); };
      const far = await sounding(100), near = await sounding(10);
      return [{ label: "Silent at 100 cm", passed: !far }, { label: "Sounds at 10 cm", passed: near, detail: near ? undefined : "distance_cm = pulseIn(echoPin, HIGH) / 58" }];
    },
  },
  {
    id: "servo-knob", level: "Advanced", title: "Servo follows a knob", parts: ["potentiometer", "servo"], concepts: ["Servo library", "map()", "pulse-width control"],
    brief: "Turning the potentiometer moves the servo across its full range: knob at one end is 0°, the other end 180°.",
    criteria: ["Knob at minimum → near 0°", "Knob in the middle → near 90°", "Knob at maximum → near 180°"],
    async run(h) {
      const servo = h.find("servo"), pot = h.find("potentiometer");
      if (!servo || !pot) return missing("a servo and a potentiometer");
      const angle = async (position: number) => { h.setProp(pot, "position", position); await h.wait(500); return h.view(servo).angle ?? -1; };
      const a0 = await angle(0), a1 = await angle(0.5), a2 = await angle(1);
      return [
        { label: "Knob at minimum → near 0°", passed: a0 <= 20, detail: `${a0}°` },
        { label: "Knob in the middle → near 90°", passed: a1 >= 70 && a1 <= 110, detail: `${a1}°` },
        { label: "Knob at maximum → near 180°", passed: a2 >= 160, detail: `${a2}°` },
      ];
    },
  },
  {
    id: "debounce-toggle", level: "Advanced", title: "Toggle switch with debouncing", parts: ["button", "led", "resistor"], concepts: ["edge detection", "switch bounce", "state machines"],
    brief: "Each press of the button toggles the LED: press once for on, press again for off. The test bench presses like a real button, with contact bounce.",
    criteria: ["First press turns the LED on", "Each later press flips it exactly once", "Holding the button does not keep toggling it"],
    async run(h) {
      const led = h.find("led"), button = h.find("button");
      if (!led || !button) return missing("an LED and a push button");
      h.release(button); await h.wait(300);
      const states: boolean[] = [lit(h.view(led))];
      for (let i = 0; i < 4; i++) {
        await h.bouncePress(button); await h.wait(150);
        await h.bounceRelease(button); await h.wait(250);
        states.push(lit(h.view(led)));
      }
      const flipsEachTime = states.slice(1).every((s, i) => s !== states[i]);
      await h.bouncePress(button); await h.wait(150);
      const pressed = lit(h.view(led));
      await h.wait(800);
      const held = lit(h.view(led));
      await h.bounceRelease(button); await h.wait(200);
      return [
        { label: "First press turns the LED on", passed: !states[0] && states[1] },
        { label: "Each later press flips it exactly once", passed: flipsEachTime, detail: `LED after each press: ${states.slice(1).map((s) => (s ? "on" : "off")).join(", ")}. Bounce causes several readings per press: ignore changes for ~50 ms.` },
        { label: "Holding the button does not keep toggling it", passed: pressed === held },
      ];
    },
  },
  {
    id: "no-delay", level: "Expert", title: "Two jobs at once (no delay())", parts: ["led", "led", "button", "resistor", "resistor"], concepts: ["millis()", "non-blocking code", "cooperative multitasking"],
    brief: "The LED on D13 blinks once per second while the LED on D8 instantly follows a button. delay() is not allowed: it would freeze the button.",
    criteria: ["The sketch does not call delay()", "D13 LED blinks about once per second", "D8 LED responds to the button within 50 ms"],
    async run(h) {
      const blinker = h.find("led", "D13"), follower = h.find("led", "D8"), button = h.find("button");
      if (!blinker || !follower || !button) return missing("LEDs on D13 and D8 (each with a resistor) and a push button");
      const usesDelay = /\bdelay\s*\(/.test(stripComments(h.code));
      const rate = blinkRate(await sample(h, 3000, 25, () => lit(h.view(blinker))));
      h.release(button); await h.wait(100);
      h.press(button); await h.wait(50);
      const fast = lit(h.view(follower));
      h.release(button); await h.wait(50);
      return [
        { label: "The sketch does not call delay()", passed: !usesDelay, detail: usesDelay ? "Track time with millis() instead." : undefined },
        { label: "D13 LED blinks about once per second", passed: rate >= 0.75 && rate <= 1.25, detail: `Measured ${rate.toFixed(2)} blinks per second.` },
        { label: "D8 LED responds to the button within 50 ms", passed: fast && !lit(h.view(follower)) },
      ];
    },
  },
  {
    id: "register-blink", level: "Expert", title: "Blink using registers", parts: ["led", "resistor"], concepts: ["DDRB / PORTB", "bit masks", "how digitalWrite works"],
    brief: "Blink an LED on D13 (port B, bit 5) once per second by writing the ATmega328P registers directly: no pinMode() or digitalWrite().",
    criteria: ["Uses DDRB and PORTB", "No pinMode() or digitalWrite()", "The LED on D13 blinks about once per second"],
    async run(h) {
      const led = h.find("led", "D13");
      if (!led) return missing("an LED on D13 with a resistor");
      const code = stripComments(h.code);
      const registers = /\bDDRB\b/.test(code) && /\bPORTB\b/.test(code);
      const helpers = /\b(pinMode|digitalWrite)\s*\(/.test(code);
      const rate = blinkRate(await sample(h, 3000, 25, () => lit(h.view(led))));
      return [
        { label: "Uses DDRB and PORTB", passed: registers, detail: registers ? undefined : "DDRB |= (1 << 5) makes D13 an output; PORTB ^= (1 << 5) toggles it." },
        { label: "No pinMode() or digitalWrite()", passed: !helpers },
        { label: "The LED on D13 blinks about once per second", passed: rate >= 0.75 && rate <= 1.25, detail: `Measured ${rate.toFixed(2)} blinks per second.` },
      ];
    },
  },
  {
    id: "interrupt-counter", level: "Expert", title: "Interrupt-driven press counter", parts: ["button"], concepts: ["attachInterrupt()", "volatile variables", "ISRs"],
    brief: "Count button presses with a hardware interrupt on D2 and print the running total to the Serial monitor.",
    criteria: ["Uses attachInterrupt()", "Prints the count after each press", "Shows 3 after three presses"],
    async run(h) {
      const button = h.find("button", "D2");
      if (!button) return missing("a push button on D2");
      const usesInterrupt = /\battachInterrupt\s*\(/.test(stripComments(h.code));
      h.release(button); await h.wait(300);
      for (let i = 0; i < 3; i++) { h.press(button); await h.wait(120); h.release(button); await h.wait(250); }
      const numbers = h.serial().match(/\d+/g)?.map(Number) ?? [];
      const last = numbers[numbers.length - 1];
      return [
        { label: "Uses attachInterrupt()", passed: usesInterrupt },
        { label: "Prints the count after each press", passed: numbers.includes(1) && numbers.includes(2) },
        { label: "Shows 3 after three presses", passed: last === 3, detail: last === undefined ? "Nothing numeric on the Serial monitor yet." : `Last number printed: ${last}` },
      ];
    },
  },
];
