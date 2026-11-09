import type { ComponentGuide } from "@/lib/learn/types";
import { switchCode } from "@/lib/learn/templates";

export const basicGuides: ComponentGuide[] = [
  {
    slug: "led", idea: "A one-way light: current must flow from + to −, and a resistor sets how much.",
    howItWorks: [
      "An LED (light-emitting diode) gives off light when current flows from its anode (+, the longer leg) to its cathode (−, the flat edge of the rim). Connected the other way round, nothing flows and it stays dark.",
      "Once it is on, an LED holds an almost fixed voltage across itself (its forward voltage), so it hardly limits current on its own. The series resistor does that job: R = (supply − forward voltage) ÷ current.",
      "A microcontroller pin switches it on with HIGH and off with LOW. PWM (analogWrite) switches it on and off hundreds of times a second; the longer it is on in each cycle, the brighter it looks.",
    ],
    facts: [["Forward voltage", "≈ 2.0 V red · 2.1 V yellow · 3.0 V blue/white"], ["Comfortable current", "5–15 mA from a pin"], ["Resistor at 5 V", "220–330 Ω"], ["Resistor at 3.3 V", "100–220 Ω"]],
    supply: "logic",
    pins: [
      { id: "anode", label: "Anode (+), long leg", role: "pwm", via: "220 Ω resistor" },
      { id: "cathode", label: "Cathode (−), short leg", role: "gnd" },
    ],
    code: {
      arduino: `// LED on a PWM pin: blink three times, then fade up and down.
const int LED_PIN = {pin:anode};

void setup() {
  pinMode(LED_PIN, OUTPUT);
  for (int i = 0; i < 3; i++) {
    digitalWrite(LED_PIN, HIGH);   // on
    delay(400);
    digitalWrite(LED_PIN, LOW);    // off
    delay(400);
  }
}

void loop() {
  for (int level = 0; level <= 255; level += 5) {   // PWM: 0 = off, 255 = fully on
    analogWrite(LED_PIN, level);
    delay(15);
  }
  for (int level = 255; level >= 0; level -= 5) {
    analogWrite(LED_PIN, level);
    delay(15);
  }
}
`,
      micropython: `from machine import Pin, PWM
import time

led = Pin({pin:anode}, Pin.OUT)
for _ in range(3):              # blink three times
    led.value(1)
    time.sleep_ms(400)
    led.value(0)
    time.sleep_ms(400)

pwm = PWM(Pin({pin:anode}), freq=1000)
while True:                     # fade up and down
    for level in range(0, 65536, 2048):
        pwm.duty_u16(level)
        time.sleep_ms(15)
    for level in range(65535, -1, -2048):
        pwm.duty_u16(level)
        time.sleep_ms(15)
`,
    },
    expected: "The LED blinks three times, then fades smoothly up and down.",
    mistakes: ["LED in backwards: it stays dark. Turn it round; it is not damaged.", "No resistor: the LED, or the pin, can be damaged within seconds.", "On an Arduino Uno, analogWrite only fades on the ~ pins (3, 5, 6, 9, 10, 11). On other pins it just switches fully on or off."],
    check: { question: "Why does an LED need a resistor in series?", options: ["To make it brighter", "To limit the current, because the LED's voltage stays almost fixed", "To protect it from static electricity"], answer: 1, why: "Above its forward voltage an LED barely resists, so without a resistor the current climbs until something fails." },
    inIndustry: "Every product has status LEDs. Engineers choose the resistor and pin so the LED is clearly visible while using as little power as possible.",
    studio: { type: "led", pins: { anode: "anode", cathode: "cathode" }, props: { colour: "red" } },
    related: ["resistor-330", "rgb-led"],
  },
  {
    slug: "rgb-led", idea: "Three LEDs in one package: mix red, green and blue with PWM to make any colour.",
    howItWorks: [
      "Inside are a red, a green and a blue LED. In a common-cathode RGB LED their − legs are joined into one long leg that goes to GND; each colour has its own + leg.",
      "Each colour is a separate LED, so each needs its own resistor. Never share one resistor between colours: they would steal current from each other.",
      "Setting each colour's brightness with PWM mixes light: red + green looks yellow, all three look white.",
    ],
    facts: [["Legs", "4: R, common, G, B (common is the longest)"], ["Types", "Common cathode (− shared) or common anode (+ shared)"], ["Resistors", "One per colour, 220 Ω at 5 V"]],
    supply: "logic",
    pins: [
      { id: "r", label: "R (red +)", role: "pwm", via: "220 Ω resistor" },
      { id: "common", label: "Common (−), longest leg", role: "gnd", note: "Common-anode part? Connect this leg to {LOGIC} instead, and 255 then means off." },
      { id: "g", label: "G (green +)", role: "pwm", via: "220 Ω resistor" },
      { id: "b", label: "B (blue +)", role: "pwm", via: "220 Ω resistor" },
    ],
    code: {
      arduino: `// Common-cathode RGB LED: mix colours with PWM (0 = off, 255 = full).
const int RED = {pin:r}, GREEN = {pin:g}, BLUE = {pin:b};

void colour(int r, int g, int b) {
  analogWrite(RED, r);
  analogWrite(GREEN, g);
  analogWrite(BLUE, b);
}

void setup() {
  pinMode(RED, OUTPUT);
  pinMode(GREEN, OUTPUT);
  pinMode(BLUE, OUTPUT);
}

void loop() {
  colour(255, 0, 0);     delay(700);   // red
  colour(0, 255, 0);     delay(700);   // green
  colour(0, 0, 255);     delay(700);   // blue
  colour(255, 120, 0);   delay(700);   // orange
  colour(255, 255, 255); delay(700);   // white
}
`,
      micropython: `from machine import Pin, PWM
import time

red = PWM(Pin({pin:r}), freq=1000)
green = PWM(Pin({pin:g}), freq=1000)
blue = PWM(Pin({pin:b}), freq=1000)

def colour(r, g, b):            # 0..255 per channel
    red.duty_u16(r * 257)
    green.duty_u16(g * 257)
    blue.duty_u16(b * 257)

while True:
    for rgb in ((255, 0, 0), (0, 255, 0), (0, 0, 255), (255, 120, 0), (255, 255, 255)):
        colour(*rgb)
        time.sleep_ms(700)
`,
    },
    expected: "The LED cycles red, green, blue, orange and white.",
    mistakes: ["Common-anode part wired as common-cathode: nothing lights, or the colours are inverted.", "One resistor on the common leg instead of one per colour: colours look uneven and change when mixed.", "Using pins without PWM: colours only switch fully on or off."],
    check: { question: "On a common-cathode RGB LED, what does analogWrite(RED, 128) do?", options: ["Turns red off", "Lights red at about half brightness", "Changes the whole LED to purple"], answer: 1, why: "128 out of 255 keeps the red LED on for about half of each PWM cycle." },
    inIndustry: "Status lights on routers, chargers and medical devices often use one RGB LED to show several states.",
    studio: { type: "rgb-led", pins: { r: "r", common: "common", g: "g", b: "b" } },
    related: ["led"],
  },
  {
    slug: "resistor-330", idea: "A resistor limits current. 330 Ω is the safe default for an LED on a 5 V pin.",
    howItWorks: [
      "A resistor turns some electrical energy into heat so that less current flows. Ohm's law ties it together: current (A) = voltage (V) ÷ resistance (Ω).",
      "For a red LED on 5 V: (5 V − 2 V) ÷ 330 Ω ≈ 9 mA, bright enough to see and well within what a pin can give.",
      "Resistors have no polarity: either way round works. The coloured bands give the value; 330 Ω is orange-orange-brown.",
    ],
    facts: [["Colour bands", "Orange, orange, brown (+ gold = 5 %)"], ["Typical power rating", "¼ W"], ["LED current at 5 V", "≈ 9 mA (red)"], ["LED current at 3.3 V", "≈ 4 mA (red)"]],
    supply: "logic", pins: [],
    mistakes: ["Reading the bands from the wrong end: the tolerance band (gold or silver) goes on the right.", "Using 33 Ω (orange-orange-black) by mistake: ten times the current.", "Resistor in parallel with the LED instead of in series: it limits nothing."],
    check: { question: "A red LED (2 V) on a 5 V pin with 330 Ω. About how much current flows?", options: ["9 mA", "15 mA", "1.5 A"], answer: 0, why: "(5 − 2) V ÷ 330 Ω ≈ 0.009 A = 9 mA." },
    inIndustry: "Choosing resistor values and power ratings is everyday circuit design; engineers check every one against the datasheet of the part it protects.",
    related: ["led", "resistor-10k"],
  },
  {
    slug: "resistor-10k", idea: "10 kΩ is the classic pull-up or pull-down: it gives an input a definite level without wasting current.",
    howItWorks: [
      "An input pin that is connected to nothing floats: it picks up noise and reads random HIGHs and LOWs. A resistor to GND (pull-down) or to the supply (pull-up) gives it a default level.",
      "10 kΩ is large enough that very little current flows (0.5 mA at 5 V) and small enough to beat the noise. When a button connects the pin directly to the other rail, the button wins.",
      "Two resistors in series make a voltage divider: Vout = Vin × R2 ÷ (R1 + R2). With an LDR and a 10 kΩ you can turn light into a voltage the ADC can read.",
    ],
    facts: [["Colour bands", "Brown, black, orange"], ["Current at 5 V", "0.5 mA"], ["Common uses", "Pull-up, pull-down, voltage divider"]],
    supply: "logic", pins: [],
    mistakes: ["Leaving an input floating and seeing random presses.", "Using a 10 kΩ in series with an LED: only about 0.3 mA flows, so it is barely visible.", "Forgetting that most boards have built-in pull-ups (INPUT_PULLUP): you often do not need this resistor at all."],
    check: { question: "Why does a button input need a pull-up or pull-down resistor?", options: ["To make the button last longer", "So the pin has a definite level when the button is not pressed", "To speed up the reading"], answer: 1, why: "An unconnected input floats and reads noise. The resistor holds it at a known level until the button changes it." },
    inIndustry: "Pull-ups appear on every reset line, I2C bus and button in commercial electronics.",
    related: ["push-button", "ldr"],
  },
  {
    slug: "diode", idea: "A diode lets current flow one way only, which makes it a one-way valve for electricity.",
    howItWorks: [
      "Current flows from the anode to the cathode (the end with the stripe). In the reverse direction it blocks, up to its rated voltage.",
      "A silicon diode drops about 0.7 V when conducting (a Schottky diode about 0.3 V). That drop turns into heat, so check its current rating.",
      "Its most important job for makers is the flyback diode: across a motor, relay or solenoid it gives the coil's stored energy a safe path when the transistor switches off, instead of a high-voltage spike that destroys the transistor.",
    ],
    facts: [["1N4007", "1 A, 1000 V: power and flyback use"], ["1N4148", "Small-signal, fast, 200 mA"], ["Forward drop", "≈ 0.7 V silicon · 0.3 V Schottky"], ["Stripe", "Marks the cathode"]],
    supply: "logic", pins: [],
    mistakes: ["Flyback diode the wrong way round: it shorts the supply as soon as the motor turns on.", "Forgetting the flyback diode on a relay coil or motor: the switching transistor fails after a while.", "Using a small-signal 1N4148 for a 1 A load: it overheats."],
    check: { question: "Where does a flyback diode go when a transistor switches a motor?", options: ["In series with the motor", "Across the motor, with the stripe toward the positive supply", "Between the pin and the transistor"], answer: 1, why: "Across the coil and reverse-biased in normal running, it only conducts the spike when the motor is switched off." },
    inIndustry: "Every relay board and motor driver has protection diodes; leaving one out is a classic cause of field failures.",
    related: ["transistor-npn", "relay-module", "solenoid"],
  },
  {
    slug: "transistor-npn", idea: "A small current into the base lets a much larger current flow through the collector: a switch your pin can work.",
    howItWorks: [
      "A pin can only give about 20 mA. An NPN transistor (2N2222, BC547) used as a switch lets a small base current control a load of a few hundred milliamps.",
      "Current flows into the base through a resistor (about 1 kΩ), out of the emitter to GND. That turns on the path from collector to emitter, so the load, connected between the supply and the collector, switches on.",
      "Put the transistor on the GND side of the load (low-side switching). Motors and relays also need a flyback diode across them.",
    ],
    facts: [["2N2222", "Up to about 600 mA, 40 V"], ["BC547", "Up to 100 mA: small loads only"], ["Base resistor", "1 kΩ for most uses"], ["Pins (2N2222 TO-92, flat face toward you)", "E, B, C, but check your part"]],
    supply: "logic",
    pins: [
      { id: "base", label: "Base (B)", role: "digital", via: "1 kΩ resistor" },
      { id: "emitter", label: "Emitter (E)", role: "gnd" },
      { id: "collector", label: "Collector (C)", role: "ext", to: "Load − (buzzer, small motor or LED strip)" },
      { id: "load", label: "Load +", role: "ext", to: "{5V}, or the load's own supply", note: "With a motor or relay coil, add a diode across the load: stripe to Load +." },
    ],
    code: switchCode("base", "LOAD", 1000, 1000, "base current flows: the load switches on"),
    expected: "The load switches on for one second and off for one second.",
    mistakes: ["No base resistor: too much current flows from the pin into the base.", "Load connected to the emitter side: the transistor cannot switch fully on.", "Pin order guessed: TO-92 pinouts differ between part numbers. Check the datasheet."],
    check: { question: "Why put a 1 kΩ resistor between the pin and the base?", options: ["To limit the current into the base", "To make the load brighter", "To stop the transistor from overheating the load"], answer: 0, why: "The base behaves like a diode to the emitter; without a resistor the current is limited only by the pin." },
    inIndustry: "Transistor switches drive buzzers, LEDs and relays in almost every embedded product.",
    related: ["mosfet", "diode", "relay-module"],
  },
  {
    slug: "mosfet", idea: "A voltage on the gate switches a heavy load: amps of current, almost no drive current.",
    howItWorks: [
      "An N-channel MOSFET has a gate (G), drain (D) and source (S). A voltage between gate and source opens a low-resistance channel from drain to source.",
      "The gate draws almost no steady current, so one pin can switch amps, which suits LED strips, pumps and larger motors. With PWM it also controls their speed or brightness.",
      "Use a logic-level MOSFET that is fully on at your pin voltage (look for RDS(on) at VGS = 4.5 V for 5 V boards, 2.5 V for 3.3 V boards). A 10 kΩ resistor from gate to GND keeps it off while the board boots.",
    ],
    facts: [["Logic-level examples", "IRLZ44N (5 V boards), AO3400 / IRLB8721 (3.3 V boards)"], ["Gate resistor", "100–220 Ω in series, 10 kΩ gate to GND"], ["Inductive loads", "Add a flyback diode across the load"]],
    supply: "logic",
    pins: [
      { id: "gate", label: "Gate (G)", role: "pwm", via: "220 Ω resistor", note: "Also connect 10 kΩ from the gate to GND so the load stays off at power-up." },
      { id: "source", label: "Source (S)", role: "gnd" },
      { id: "drain", label: "Drain (D)", role: "ext", to: "Load − (LED strip, pump, motor)" },
      { id: "load", label: "Load +", role: "ext", to: "External supply + (for example 12 V)", note: "Join the external supply's − to {GND}: the board and the load need a common ground." },
    ],
    code: {
      arduino: `// Logic-level MOSFET: fade a 12 V LED strip (or set a pump's speed) with PWM.
const int GATE = {pin:gate};

void setup() {
  pinMode(GATE, OUTPUT);
}

void loop() {
  for (int duty = 0; duty <= 255; duty++) {   // 0 = off, 255 = fully on
    analogWrite(GATE, duty);
    delay(10);
  }
  for (int duty = 255; duty >= 0; duty--) {
    analogWrite(GATE, duty);
    delay(10);
  }
}
`,
      micropython: `from machine import Pin, PWM
import time

gate = PWM(Pin({pin:gate}), freq=1000)
while True:
    for duty in range(0, 65536, 1024):
        gate.duty_u16(duty)
        time.sleep_ms(10)
    for duty in range(65535, -1, -1024):
        gate.duty_u16(duty)
        time.sleep_ms(10)
`,
    },
    expected: "The load ramps smoothly up to full power and back down.",
    mistakes: ["A standard (non-logic-level) MOSFET such as the IRF540N: it barely turns on at 5 V or 3.3 V and gets hot.", "No common ground between the external supply and the board: the gate voltage has no reference.", "No flyback diode on a motor or solenoid: the MOSFET fails."],
    check: { question: "Why connect the external supply's − to the board's GND?", options: ["It is optional", "The gate voltage is measured against the source, so both circuits need the same reference", "To charge the board's battery"], answer: 1, why: "Without a shared ground the MOSFET does not see the pin's voltage between its gate and source." },
    inIndustry: "MOSFETs switch everything from phone chargers to electric-vehicle motors; power-stage design is a specialist career in itself.",
    related: ["transistor-npn", "diode", "solenoid"],
  },
  {
    slug: "push-button", idea: "A momentary switch: it joins two contacts only while you press it.",
    howItWorks: [
      "A tactile button has four legs, joined in two pairs. Pressing it connects one pair to the other. Fit it across the breadboard's centre gap so the pairs sit on separate rows.",
      "Wire one side to a pin and the other to GND, and turn on the board's internal pull-up (INPUT_PULLUP). The pin then reads HIGH normally and LOW while the button is held.",
      "Metal contacts bounce for a few milliseconds when they close, so one press can look like several. A short delay or a software timer (debouncing) ignores the bounces.",
    ],
    facts: [["Wiring", "One leg to the pin, the opposite leg to GND"], ["Reads", "HIGH released · LOW pressed (with INPUT_PULLUP)"], ["Bounce time", "Typically 1–10 ms"]],
    supply: "logic",
    pins: [
      { id: "a", label: "Leg 1", role: "digital", note: "Use the internal pull-up: pinMode(pin, INPUT_PULLUP)." },
      { id: "b", label: "Leg 2 (diagonally opposite)", role: "gnd" },
    ],
    code: {
      arduino: `// Button with the internal pull-up: reads LOW while pressed.
const int BUTTON_PIN = {pin:a};
bool wasPressed = false;
int presses = 0;

void setup() {
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  Serial.begin(115200);
}

void loop() {
  bool pressed = digitalRead(BUTTON_PIN) == LOW;
  if (pressed != wasPressed) {
    if (pressed) {
      presses++;
      Serial.print("pressed, count:");
      Serial.println(presses);
    }
    wasPressed = pressed;
    delay(30);   // ignore contact bounce
  }
}
`,
      micropython: `from machine import Pin
import time

button = Pin({pin:a}, Pin.IN, Pin.PULL_UP)   # reads 1 until pressed
was_pressed = False
presses = 0
while True:
    pressed = button.value() == 0
    if pressed != was_pressed:
        if pressed:
            presses += 1
            print("pressed, count:", presses)
        was_pressed = pressed
        time.sleep_ms(30)       # ignore contact bounce
`,
    },
    expected: "Each press prints one line with the press count.",
    mistakes: ["Both wires on legs that are already joined inside: the button seems always pressed.", "Forgetting INPUT_PULLUP: the pin floats and reports random presses.", "No debounce: one press counts as two or three."],
    check: { question: "With INPUT_PULLUP and the button wired to GND, what does the pin read while the button is held?", options: ["HIGH", "LOW", "It alternates"], answer: 1, why: "The button connects the pin straight to GND, which wins against the weak internal pull-up." },
    inIndustry: "Debouncing and input handling are standard interview questions for embedded firmware roles.",
    studio: { type: "button", pins: { a: "a", b: "b" } },
    related: ["resistor-10k", "toggle-switch"],
  },
  {
    slug: "toggle-switch", idea: "A switch that stays where you put it: it remembers its position without power.",
    howItWorks: [
      "A slide or toggle switch with three pins (SPDT) connects its middle pin (common) to one outer pin or the other.",
      "To read it, wire common to a pin with INPUT_PULLUP and one outer pin to GND. In that position the pin reads LOW; in the other position nothing is connected and the pull-up makes it read HIGH.",
      "Small slide switches are rated for signals and a few hundred milliamps. Never use one to switch mains or a heavy motor.",
    ],
    facts: [["Type", "SPDT: common + two throws"], ["Reads", "LOW in the GND position, HIGH in the other"], ["Rating", "Check the part: often 0.3 A at 30 V DC"]],
    supply: "logic",
    pins: [
      { id: "common", label: "Common (middle pin)", role: "digital", note: "Use the internal pull-up: pinMode(pin, INPUT_PULLUP)." },
      { id: "a", label: "Outer pin A", role: "gnd" },
      { id: "b", label: "Outer pin B", role: "nc" },
    ],
    code: {
      arduino: `// Slide switch: LOW in the GND position, HIGH (pull-up) in the other.
const int SWITCH_PIN = {pin:common};
int lastState = -1;

void setup() {
  pinMode(SWITCH_PIN, INPUT_PULLUP);
  Serial.begin(115200);
}

void loop() {
  int state = digitalRead(SWITCH_PIN);
  if (state != lastState) {
    Serial.println(state == LOW ? "switch: ON" : "switch: OFF");
    lastState = state;
  }
  delay(20);
}
`,
      micropython: `from machine import Pin
import time

switch = Pin({pin:common}, Pin.IN, Pin.PULL_UP)
last = None
while True:
    state = switch.value()
    if state != last:
        print("switch: ON" if state == 0 else "switch: OFF")
        last = state
    time.sleep_ms(20)
`,
    },
    expected: "Sliding the switch prints ON or OFF once per change.",
    mistakes: ["Wiring an outer pin to the board pin instead of the middle one: one position reads nothing.", "Connecting the two outer pins to 5 V and GND without a resistor while moving the switch on some types: brief shorts."],
    check: { question: "Which pin of a 3-pin slide switch goes to the board's input?", options: ["Either outer pin", "The middle (common) pin", "None: switches connect to power only"], answer: 1, why: "The common pin is the one that moves between the two outer contacts." },
    inIndustry: "Configuration switches (DIP switches) set addresses and modes on industrial equipment and are read exactly like this.",
    studio: { type: "switch", pins: { common: "common", a: "a", b: "b" } },
    related: ["push-button"],
  },
  {
    slug: "potentiometer", idea: "A knob that is a voltage divider: the middle pin's voltage moves between the two ends as you turn it.",
    howItWorks: [
      "A potentiometer is a resistive track with a sliding contact (the wiper). Connect the ends to GND and the supply; the wiper then outputs any voltage between them.",
      "The board's ADC (analog-to-digital converter) turns that voltage into a number: 0–1023 on an Arduino Uno, 0–4095 on an ESP32.",
      "Use it to set brightness, speed, thresholds or a servo angle. A 10 kΩ pot is the usual choice.",
    ],
    facts: [["Pins", "End, wiper (middle), end"], ["Common value", "10 kΩ linear (marked B10K)"], ["Output", "0 V to the supply voltage"]],
    supply: "logic",
    pins: [
      { id: "end1", label: "End 1", role: "gnd" },
      { id: "wiper", label: "Wiper (middle)", role: "analog" },
      { id: "end2", label: "End 2", role: "vcc", note3v3: "Use 3.3 V, not 5 V, so the wiper never exceeds the pin's limit." },
    ],
    code: {
      arduino: `// Read a potentiometer: raw ADC counts and the voltage they represent.
const int KNOB = {pin:wiper};

void setup() {
  Serial.begin(115200);
}

void loop() {
  int raw = analogRead(KNOB);              // 0..{ADC_MAX}
  float volts = raw * {VREF} / {ADC_MAX};
  Serial.print("raw:");
  Serial.print(raw);
  Serial.print(" volts:");
  Serial.println(volts, 2);
  delay(200);
}
`,
      micropython: `from machine import ADC, Pin
import time

knob = ADC(Pin({pin:wiper}))
{MP_ATTEN:knob}
while True:
    raw = knob.read_u16()               # 0..65535
    print("raw:", raw, "volts:", round(raw * 3.3 / 65535, 2))
    time.sleep_ms(200)
`,
    },
    expected: "Turning the knob moves the reading smoothly from 0 to the maximum.",
    mistakes: ["Wiper on an end pin: the reading only jumps between minimum and maximum.", "Both ends to the same rail: the reading never changes.", "On a 3.3 V board, powering the pot from 5 V: the pin sees more than 3.3 V."],
    check: { question: "On an Arduino Uno the wiper is at 2.5 V. About what does analogRead return?", options: ["255", "512", "1023"], answer: 1, why: "2.5 V is half of 5 V, and half of the 0–1023 range is about 512." },
    inIndustry: "Trimmer pots calibrate sensors on production lines; the same ADC skills read every analog sensor.",
    studio: { type: "potentiometer", pins: { end1: "end1", wiper: "wiper", end2: "end2" }, props: { position: 0.5 } },
    related: ["joystick", "ldr"],
  },
  {
    slug: "rotary-encoder", idea: "A knob that turns forever and reports each click and its direction.",
    howItWorks: [
      "Inside are two switches, A (CLK) and B (DT), that open and close slightly out of step as you turn. Which one changes first tells you the direction.",
      "Unlike a potentiometer it has no end stops and no absolute position: your code counts the clicks. Most modules (KY-040) also have a push switch (SW) on the shaft.",
      "Read CLK; each time it falls, read DT. If DT differs from CLK the knob turned one way, otherwise the other.",
    ],
    facts: [["Module", "KY-040: CLK, DT, SW, +, GND"], ["Typical resolution", "20 clicks per turn"], ["Push switch", "SW goes LOW when pressed"]],
    supply: "logic",
    pins: [
      { id: "clk", label: "CLK (A)", role: "digital" },
      { id: "dt", label: "DT (B)", role: "digital" },
      { id: "sw", label: "SW (push)", role: "digital" },
      { id: "vcc", label: "+", role: "vcc" },
      { id: "gnd", label: "GND", role: "gnd" },
    ],
    code: {
      arduino: `// KY-040 rotary encoder: count clicks in both directions; press to reset.
const int CLK = {pin:clk}, DT = {pin:dt}, SW = {pin:sw};
int position = 0;
int lastClk;

void setup() {
  pinMode(CLK, INPUT_PULLUP);
  pinMode(DT, INPUT_PULLUP);
  pinMode(SW, INPUT_PULLUP);
  lastClk = digitalRead(CLK);
  Serial.begin(115200);
}

void loop() {
  int clk = digitalRead(CLK);
  if (clk != lastClk && clk == LOW) {          // one click
    position += (digitalRead(DT) != clk) ? 1 : -1;
    Serial.print("position:");
    Serial.println(position);
  }
  lastClk = clk;
  if (digitalRead(SW) == LOW) {
    position = 0;
    Serial.println("reset");
    delay(250);
  }
}
`,
      micropython: `from machine import Pin
import time

clk = Pin({pin:clk}, Pin.IN, Pin.PULL_UP)
dt = Pin({pin:dt}, Pin.IN, Pin.PULL_UP)
sw = Pin({pin:sw}, Pin.IN, Pin.PULL_UP)
position = 0
last_clk = clk.value()
while True:
    now = clk.value()
    if now != last_clk and now == 0:          # one click
        position += 1 if dt.value() != now else -1
        print("position:", position)
    last_clk = now
    if sw.value() == 0:
        position = 0
        print("reset")
        time.sleep_ms(250)
`,
    },
    expected: "Turning clockwise counts up, anticlockwise counts down; pressing resets to 0.",
    mistakes: ["CLK and DT swapped: the direction is reversed (just swap them in code).", "Long delays in loop(): clicks are missed. Keep loop() fast or use interrupts.", "Expecting an absolute position after power-up: encoders only count changes."],
    check: { question: "How does the code know which way the encoder turned?", options: ["From how fast CLK changes", "From DT's level at the moment CLK falls", "From the SW pin"], answer: 1, why: "The two signals are a quarter-step apart, so DT's level at CLK's edge gives the direction." },
    inIndustry: "Encoders measure motor shaft position in robots, CNC machines and car steering systems.",
    related: ["potentiometer"],
  },
  {
    slug: "joystick", idea: "Two potentiometers at right angles plus a push switch: X, Y and click.",
    howItWorks: [
      "Moving the stick turns two pots. Each outputs about half the supply voltage at rest and swings toward 0 V or full supply as you push it.",
      "Read VRx and VRy with two analog pins. Expect the centre to be a little off half-scale; measure it at start-up and subtract it.",
      "Pressing the stick down closes the SW switch to GND: read it with INPUT_PULLUP.",
    ],
    facts: [["Pins", "GND, +5V, VRx, VRy, SW"], ["Centre", "≈ half of full scale"], ["Power", "Use your board's logic voltage so outputs stay in range"]],
    supply: "logic",
    pins: [
      { id: "gnd", label: "GND", role: "gnd" },
      { id: "vcc", label: "+5V", role: "vcc", note3v3: "Connect to 3.3 V on this board, despite the label, so VRx/VRy stay within the pin's limit." },
      { id: "vrx", label: "VRx", role: "analog" },
      { id: "vry", label: "VRy", role: "analog" },
      { id: "sw", label: "SW", role: "digital" },
    ],
    code: {
      arduino: `// Analog joystick: X and Y position plus the push switch.
const int X_PIN = {pin:vrx}, Y_PIN = {pin:vry}, SW_PIN = {pin:sw};
int centreX, centreY;

void setup() {
  pinMode(SW_PIN, INPUT_PULLUP);
  Serial.begin(115200);
  centreX = analogRead(X_PIN);   // leave the stick alone at start-up
  centreY = analogRead(Y_PIN);
}

void loop() {
  int x = analogRead(X_PIN) - centreX;
  int y = analogRead(Y_PIN) - centreY;
  bool pressed = digitalRead(SW_PIN) == LOW;
  Serial.print("x:");
  Serial.print(x);
  Serial.print(" y:");
  Serial.print(y);
  Serial.print(" pressed:");
  Serial.println(pressed ? 1 : 0);
  delay(100);
}
`,
      micropython: `from machine import ADC, Pin
import time

x_axis = ADC(Pin({pin:vrx}))
y_axis = ADC(Pin({pin:vry}))
{MP_ATTEN:x_axis}
{MP_ATTEN:y_axis}
button = Pin({pin:sw}, Pin.IN, Pin.PULL_UP)
centre_x, centre_y = x_axis.read_u16(), y_axis.read_u16()   # leave the stick alone at start-up
while True:
    x = x_axis.read_u16() - centre_x
    y = y_axis.read_u16() - centre_y
    print("x:", x, "y:", y, "pressed:", 1 if button.value() == 0 else 0)
    time.sleep_ms(100)
`,
    },
    expected: "Values near 0 at rest; pushing the stick moves x and y positive or negative.",
    mistakes: ["Powering from 5 V on a 3.3 V board: the analog pins see too much voltage.", "Assuming the centre is exactly half-scale: drift makes robots creep. Calibrate at start-up and add a small dead zone."],
    check: { question: "Why does the code read the joystick once at start-up?", options: ["To warm the sensor up", "To learn the real centre position, which is rarely exactly half-scale", "To check the switch"], answer: 1, why: "Subtracting the measured centre gives readings near zero at rest." },
    inIndustry: "The same calibration and dead-zone logic is used in game controllers, drone remotes and wheelchair controls.",
    related: ["potentiometer"],
  },
  {
    slug: "keypad-4x4", idea: "16 buttons on 8 wires: rows and columns are scanned one at a time.",
    howItWorks: [
      "The keys sit where 4 row wires cross 4 column wires. Pressing a key joins its row to its column.",
      "To scan, drive one row LOW and the others HIGH, then read the columns (with pull-ups). A column that reads LOW shows which key in that row is pressed. Repeat for each row, many times a second.",
      "This matrix idea (8 pins for 16 keys) is how keyboards, calculators and keypads all work.",
    ],
    facts: [["Wires", "8: R1–R4, C1–C4 (left to right on most keypads)"], ["Pins needed", "8 digital pins"], ["Library (Arduino)", "Keypad by Mark Stanley and Alexander Brevig"]],
    supply: "logic",
    pins: [
      { id: "r1", label: "R1", role: "digital" }, { id: "r2", label: "R2", role: "digital" }, { id: "r3", label: "R3", role: "digital" }, { id: "r4", label: "R4", role: "digital" },
      { id: "c1", label: "C1", role: "digital" }, { id: "c2", label: "C2", role: "digital" }, { id: "c3", label: "C3", role: "digital" }, { id: "c4", label: "C4", role: "digital" },
    ],
    code: {
      arduino: `#include <Keypad.h>

const byte ROWS = 4, COLS = 4;
char keys[ROWS][COLS] = {
  {'1', '2', '3', 'A'},
  {'4', '5', '6', 'B'},
  {'7', '8', '9', 'C'},
  {'*', '0', '#', 'D'}
};
byte rowPins[ROWS] = {{pin:r1}, {pin:r2}, {pin:r3}, {pin:r4}};
byte colPins[COLS] = {{pin:c1}, {pin:c2}, {pin:c3}, {pin:c4}};
Keypad keypad = Keypad(makeKeymap(keys), rowPins, colPins, ROWS, COLS);

void setup() {
  Serial.begin(115200);
}

void loop() {
  char key = keypad.getKey();
  if (key) {
    Serial.print("key:");
    Serial.println(key);
  }
}
`,
      micropython: `from machine import Pin
import time

KEYS = ("123A", "456B", "789C", "*0#D")
rows = [Pin(p, Pin.OUT, value=1) for p in ({pin:r1}, {pin:r2}, {pin:r3}, {pin:r4})]
cols = [Pin(p, Pin.IN, Pin.PULL_UP) for p in ({pin:c1}, {pin:c2}, {pin:c3}, {pin:c4})]

def scan():
    for r, row in enumerate(rows):
        row.value(0)                     # drive one row LOW
        for c, col in enumerate(cols):
            if col.value() == 0:         # a pressed key pulls its column LOW
                row.value(1)
                return KEYS[r][c]
        row.value(1)
    return None

last = None
while True:
    key = scan()
    if key and key != last:
        print("key:", key)
    last = key
    time.sleep_ms(30)
`,
    },
    libs: { arduino: ["Keypad (Mark Stanley, Alexander Brevig)"] },
    expected: "Each key press prints the key's character once.",
    mistakes: ["Rows and columns swapped: keys print as the wrong characters. Swap the two pin lists.", "Using D0/D1 on an Uno: uploads fail while the keypad is connected."],
    check: { question: "How can 8 wires read 16 keys?", options: ["Each wire carries two keys", "Rows are driven one at a time and the columns are read, so each key is a unique row-column pair", "The keypad has a chip that sends key codes"], answer: 1, why: "Scanning turns 4 rows × 4 columns into 16 distinct positions." },
    inIndustry: "Matrix scanning is used in door-entry panels, payment terminals and industrial control panels.",
    related: ["push-button"],
  },
];
