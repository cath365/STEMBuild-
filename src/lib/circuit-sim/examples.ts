// Ready-made circuits for the live simulator, in grid units (one unit = 20 px on screen).
import type { SimElement, SimKind } from "@/lib/circuit-sim/engine";

export type SimExample = { id: string; title: string; level: "Basics" | "Intermediate" | "Advanced"; summary: string; tryThis: string; speed?: number; elements: SimElement[] };

let counter = 0;
const el = (kind: SimKind, x1: number, y1: number, x2: number, y2: number, extra: Partial<SimElement> = {}): SimElement => ({ id: `${kind}-${++counter}`, kind, x1, y1, x2, y2, ...extra });
/** Wires along a path of grid points. */
const wires = (...points: [number, number][]) => points.slice(1).map((p, i) => el("wire", points[i][0], points[i][1], p[0], p[1]));

function build(make: () => SimElement[]) {
  counter = 0;
  return make();
}

export const SIM_EXAMPLES: SimExample[] = [
  {
    id: "led-resistor", title: "LED with a resistor", level: "Basics",
    summary: "A 9 V battery, a 470 Ω resistor and a red LED in one loop.",
    tryThis: "Select the resistor and lower its value. Watch the current rise and the LED get brighter. Below about 100 Ω the LED burns out.",
    elements: build(() => [
      el("battery", 6, 16, 6, 8, { value: 9 }),
      ...wires([6, 8], [6, 5], [10, 5]),
      el("resistor", 10, 5, 18, 5, { value: 470 }),
      ...wires([18, 5], [24, 5], [24, 8]),
      el("led", 24, 8, 24, 14, { colour: "red" }),
      ...wires([24, 14], [24, 19], [6, 19], [6, 16]),
    ]),
  },
  {
    id: "led-no-resistor", title: "LED without a resistor", level: "Basics",
    summary: "The same loop with a plain wire where the resistor should be.",
    tryThis: "Press Run and watch the LED burn out. Then replace the wire with a resistor (Delete it, pick Resistor, drag between the two points) and press Reset.",
    elements: build(() => [
      el("battery", 6, 16, 6, 8, { value: 9 }),
      ...wires([6, 8], [6, 5], [24, 5], [24, 8]),
      el("led", 24, 8, 24, 14, { colour: "green" }),
      ...wires([24, 14], [24, 19], [6, 19], [6, 16]),
    ]),
  },
  {
    id: "series-parallel", title: "Series and parallel lamps", level: "Basics",
    summary: "Two lamps in series on the left, two in parallel on the right, all from one 6 V battery.",
    tryThis: "Compare the brightness. Series lamps share the voltage and glow dimly; parallel lamps each get the full 6 V.",
    elements: build(() => [
      el("battery", 4, 18, 4, 10, { value: 6 }),
      ...wires([4, 10], [4, 4], [14, 4], [24, 4], [34, 4]),
      el("lamp", 14, 4, 14, 10), el("lamp", 14, 12, 14, 18), ...wires([14, 10], [14, 12]),
      el("lamp", 24, 4, 24, 12), el("lamp", 34, 4, 34, 12),
      ...wires([24, 12], [24, 22]), ...wires([34, 12], [34, 22], [24, 22], [14, 22], [4, 22], [4, 18]), ...wires([14, 18], [14, 22]),
    ]),
  },
  {
    id: "divider", title: "Voltage divider", level: "Basics",
    summary: "Two resistors share 9 V. The voltmeter reads the middle point.",
    tryThis: "Change the bottom resistor. Vout = 9 V × R2 ÷ (R1 + R2). With equal resistors it reads 4.5 V.",
    elements: build(() => [
      el("battery", 6, 18, 6, 8, { value: 9 }),
      ...wires([6, 8], [6, 4], [18, 4], [18, 6]),
      el("resistor", 18, 6, 18, 12, { value: 10000 }),
      el("resistor", 18, 12, 18, 18, { value: 10000 }),
      ...wires([18, 18], [18, 22], [6, 22], [6, 18]),
      ...wires([18, 12], [28, 12]), el("voltmeter", 28, 12, 28, 22), ...wires([28, 22], [18, 22]),
      el("ground", 6, 22, 6, 24),
    ]),
  },
  {
    id: "switch-logic", title: "Switches: AND and OR", level: "Basics",
    summary: "Two switches in series light the left lamp (AND). Two in parallel light the right lamp (OR).",
    tryThis: "Click the switches while running. The left lamp needs both closed; the right lamp needs either.",
    elements: build(() => [
      el("battery", 4, 20, 4, 12, { value: 6 }),
      ...wires([4, 12], [4, 4], [12, 4]),
      el("switch", 12, 4, 16, 4), ...wires([16, 4], [18, 4]), el("switch", 18, 4, 22, 4),
      ...wires([22, 4], [24, 4], [24, 8]), el("lamp", 24, 8, 24, 14), ...wires([24, 14], [24, 24]),
      ...wires([12, 4], [12, 10], [30, 10]),
      el("switch", 30, 10, 34, 10), el("switch", 30, 14, 34, 14), ...wires([30, 10], [30, 14]), ...wires([34, 10], [34, 14], [38, 14], [38, 16]),
      el("lamp", 38, 16, 38, 22), ...wires([38, 22], [38, 24], [24, 24], [4, 24], [4, 20]),
    ]),
  },
  {
    id: "button-led", title: "Push button and LED", level: "Basics",
    summary: "A momentary push button switches an LED through its resistor.",
    tryThis: "Press and hold the button while running. Current only flows while the contacts touch.",
    elements: build(() => [
      el("battery", 6, 16, 6, 8, { value: 5 }),
      ...wires([6, 8], [6, 5], [10, 5]), el("button", 10, 5, 14, 5), ...wires([14, 5], [16, 5]),
      el("resistor", 16, 5, 22, 5, { value: 220 }), ...wires([22, 5], [26, 5], [26, 8]),
      el("led", 26, 8, 26, 14, { colour: "blue" }), ...wires([26, 14], [26, 19], [6, 19], [6, 16]),
    ]),
  },
  {
    id: "rc-charge", title: "Capacitor charging (RC)", level: "Intermediate",
    summary: "Close the switch: a 100 µF capacitor charges through 10 kΩ. The time constant R × C is 1 second.",
    tryThis: "Watch the voltmeter climb quickly, then slowly approach 9 V. After 1 s it reaches 63 %; after 5 s it is almost full. Open the switch and the charge stays.",
    elements: build(() => [
      el("battery", 6, 18, 6, 10, { value: 9 }),
      ...wires([6, 10], [6, 5], [10, 5]), el("switch", 10, 5, 14, 5, { closed: false }), ...wires([14, 5], [16, 5]),
      el("resistor", 16, 5, 22, 5, { value: 10000 }), ...wires([22, 5], [26, 5], [26, 10]),
      el("capacitor", 26, 10, 26, 16, { value: 100e-6 }), ...wires([26, 16], [26, 22], [6, 22], [6, 18]),
      ...wires([26, 10], [34, 10]), el("voltmeter", 34, 10, 34, 16), ...wires([34, 16], [34, 22], [26, 22]),
    ]),
  },
  {
    id: "cap-flash", title: "Capacitor stores energy", level: "Intermediate",
    summary: "Hold the button to charge a 1000 µF capacitor. Release it and the capacitor alone keeps the LED lit while it fades.",
    tryThis: "Hold the button for a second, then let go. The LED fades out as the capacitor discharges through the resistor.",
    elements: build(() => [
      el("battery", 4, 18, 4, 10, { value: 9 }),
      ...wires([4, 10], [4, 5], [8, 5]), el("button", 8, 5, 12, 5), el("resistor", 12, 5, 16, 5, { value: 47 }), ...wires([16, 5], [18, 5], [18, 10]),
      el("capacitor", 18, 10, 18, 16, { value: 1000e-6 }), ...wires([18, 16], [18, 22], [4, 22], [4, 18]),
      ...wires([18, 5], [28, 5]), el("resistor", 28, 5, 34, 5, { value: 330 }), ...wires([34, 5], [36, 5], [36, 10]),
      el("led", 36, 10, 36, 16, { colour: "yellow" }), ...wires([36, 16], [36, 22], [18, 22]),
    ]),
  },
  {
    id: "transistor-switch", title: "Transistor switch", level: "Intermediate",
    summary: "A tiny base current (through 10 kΩ) lets a much larger collector current light the LED.",
    tryThis: "Hold the button and compare the base current with the LED current in the readings: the transistor amplifies about 100 times until it saturates.",
    elements: build(() => [
      el("battery", 4, 22, 4, 14, { value: 9 }),
      ...wires([4, 14], [4, 4], [10, 4], [26, 4], [26, 6]),
      el("resistor", 26, 6, 26, 10, { value: 470 }), el("led", 26, 10, 26, 14, { colour: "red" }), ...wires([26, 14], [26, 15]),
      el("npn", 26, 15, 26, 19), ...wires([26, 19], [26, 26], [4, 26], [4, 22]),
      ...wires([10, 4], [10, 8]), el("button", 10, 8, 10, 12), ...wires([10, 12], [10, 17], [12, 17]),
      el("resistor", 12, 17, 18, 17, { value: 10000 }), ...wires([18, 17], [24, 17]),
    ]),
  },
  {
    id: "diode-direction", title: "Diodes are one-way", level: "Intermediate",
    summary: "Two identical loops; only the diode's direction differs.",
    tryThis: "The left lamp lights; the right one does not. Select a diode: one shows about 0.8 V across it, the other blocks the whole 6 V.",
    elements: build(() => [
      el("battery", 4, 18, 4, 10, { value: 6 }),
      ...wires([4, 10], [4, 4], [8, 4]), el("diode", 8, 4, 12, 4), ...wires([12, 4], [16, 4], [16, 8]),
      el("lamp", 16, 8, 16, 14), ...wires([16, 14], [16, 22], [4, 22], [4, 18]),
      el("battery", 24, 18, 24, 10, { value: 6 }),
      ...wires([24, 10], [24, 4], [28, 4]), el("diode", 32, 4, 28, 4), ...wires([32, 4], [36, 4], [36, 8]),
      el("lamp", 36, 8, 36, 14), ...wires([36, 14], [36, 22], [24, 22], [24, 18]),
    ]),
  },
  {
    id: "half-wave", title: "Half-wave rectifier", level: "Advanced", speed: 0.02,
    summary: "A 6 V AC source and one diode: current only flows during the positive half of each cycle.",
    tryThis: "Watch the dots: they move in pulses, always in the same direction through the resistor. The simulation is slowed 50 times so you can see each 50 Hz cycle.",
    elements: build(() => [
      el("ac", 6, 18, 6, 10, { value: 6, freq: 50 }),
      ...wires([6, 10], [6, 5], [10, 5]), el("diode", 10, 5, 14, 5), ...wires([14, 5], [22, 5], [22, 8]),
      el("resistor", 22, 8, 22, 16, { value: 1000 }), ...wires([22, 16], [22, 21], [6, 21], [6, 18]),
      ...wires([22, 8], [30, 8]), el("voltmeter", 30, 8, 30, 16), ...wires([30, 16], [30, 21], [22, 21]),
    ]),
  },
  {
    id: "bridge", title: "Bridge rectifier with smoothing", level: "Advanced", speed: 0.02,
    summary: "Four diodes turn both halves of the AC wave into DC; a 470 µF capacitor smooths it for the LED.",
    tryThis: "Delete the capacitor and press Run: the LED flickers at 100 Hz (watch the dots). Put it back and the voltage stays steady.",
    elements: build(() => [
      el("ac", 4, 18, 4, 10, { value: 9, freq: 50 }),
      ...wires([4, 10], [4, 6], [6, 6]), el("resistor", 6, 6, 12, 6, { value: 10 }), ...wires([4, 18], [4, 22], [12, 22]),
      el("diode", 12, 6, 18, 10), el("diode", 12, 22, 18, 18),
      el("diode", 10, 14, 12, 6), el("diode", 10, 14, 12, 22),
      ...wires([18, 10], [18, 14], [18, 18]), ...wires([18, 14], [24, 14], [24, 4]),
      ...wires([10, 14], [8, 14], [8, 26], [28, 26]),
      ...wires([24, 4], [28, 4], [28, 8]), el("capacitor", 28, 8, 28, 20, { value: 470e-6 }), ...wires([28, 20], [28, 26]),
      ...wires([28, 4], [34, 4]), el("resistor", 34, 4, 38, 4, { value: 470 }), ...wires([38, 4], [40, 4], [40, 10]),
      el("led", 40, 10, 40, 16, { colour: "white" }), ...wires([40, 16], [40, 26], [28, 26]),
    ]),
  },
  {
    id: "motor-buzzer", title: "Motor and buzzer", level: "Basics",
    summary: "A switch runs a DC motor; a push button sounds a buzzer. Both share one battery.",
    tryThis: "Close the switch to spin the motor, and hold the button for the buzzer. Reverse the battery (delete it and draw it the other way) and the motor spins backwards.",
    elements: build(() => [
      el("battery", 4, 18, 4, 10, { value: 6 }),
      ...wires([4, 10], [4, 4], [10, 4]), el("switch", 10, 4, 14, 4), ...wires([14, 4], [20, 4], [20, 8]),
      el("motor", 20, 8, 20, 16), ...wires([20, 16], [20, 22], [4, 22], [4, 18]),
      ...wires([4, 4], [4, 2], [28, 2]), el("button", 28, 2, 32, 2), ...wires([32, 2], [36, 2], [36, 8]),
      el("buzzer", 36, 8, 36, 16), ...wires([36, 16], [36, 22], [20, 22]),
    ]),
  },
  {
    id: "kirchhoff", title: "Currents add up (Kirchhoff)", level: "Intermediate",
    summary: "Three resistors in parallel, each with its own ammeter. The battery's ammeter reads their total.",
    tryThis: "Add the three branch currents: they equal the total. Change one resistor and watch only its branch and the total change.",
    elements: build(() => [
      el("battery", 4, 18, 4, 10, { value: 9 }),
      ...wires([4, 10], [4, 4]), el("ammeter", 4, 4, 10, 4), ...wires([10, 4], [18, 4], [28, 4], [38, 4]),
      el("ammeter", 18, 4, 18, 8), el("resistor", 18, 8, 18, 16, { value: 1000 }),
      el("ammeter", 28, 4, 28, 8), el("resistor", 28, 8, 28, 16, { value: 2200 }),
      el("ammeter", 38, 4, 38, 8), el("resistor", 38, 8, 38, 16, { value: 4700 }),
      ...wires([18, 16], [18, 22]), ...wires([28, 16], [28, 22]), ...wires([38, 16], [38, 22], [28, 22], [18, 22], [4, 22], [4, 18]),
    ]),
  },
  {
    id: "short", title: "Short circuit", level: "Basics",
    summary: "A wire straight across the battery, beside a lamp.",
    tryThis: "The lamp stays dark: almost all the current takes the zero-resistance wire. Delete the short wire and the lamp lights.",
    elements: build(() => [
      el("battery", 6, 16, 6, 8, { value: 6 }),
      ...wires([6, 8], [6, 4], [16, 4], [26, 4], [26, 8]), el("lamp", 26, 8, 26, 16), ...wires([26, 16], [26, 20], [16, 20], [6, 20], [6, 16]),
      el("wire", 16, 4, 16, 20),
    ]),
  },
];

export const EMPTY_CIRCUIT: SimElement[] = [];
