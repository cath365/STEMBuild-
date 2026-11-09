import type { ComponentGuide, GuidePin } from "@/lib/learn/types";
import { hBridgeCode, switchCode } from "@/lib/learn/templates";

const commonGround = "Join the battery's − to {GND} as well: the board and the motor supply need a common ground.";

const stepperPins: GuidePin[] = [
  { id: "in1", label: "IN1", role: "digital" },
  { id: "in2", label: "IN2", role: "digital" },
  { id: "in3", label: "IN3", role: "digital" },
  { id: "in4", label: "IN4", role: "digital" },
  { id: "vcc", label: "+ (5–12 V)", role: "vcc", note: "One motor is fine on USB 5 V for a test; use a separate 5 V supply for longer runs or two motors." },
  { id: "gnd", label: "−", role: "gnd" },
  { id: "motor", label: "Motor socket", role: "ext", to: "28BYJ-48 stepper plug (it only fits one way)" },
];

const stepperCode = {
  arduino: `#include <Stepper.h>

const int STEPS_PER_REV = 2048;   // 28BYJ-48 in full-step mode
// For this motor the Stepper library needs the coil order IN1, IN3, IN2, IN4.
Stepper motor(STEPS_PER_REV, {pin:in1}, {pin:in3}, {pin:in2}, {pin:in4});

void setup() {
  motor.setSpeed(10);              // rpm; this geared motor tops out around 15
  Serial.begin(115200);
}

void loop() {
  Serial.println("one turn clockwise");
  motor.step(STEPS_PER_REV);
  delay(500);
  Serial.println("one turn back");
  motor.step(-STEPS_PER_REV);
  delay(500);
}
`,
  micropython: `from machine import Pin
import time

coils = [Pin(p, Pin.OUT) for p in ({pin:in1}, {pin:in2}, {pin:in3}, {pin:in4})]
SEQUENCE = ((1, 1, 0, 0), (0, 1, 1, 0), (0, 0, 1, 1), (1, 0, 0, 1))   # full steps, two coils on

def step(count, delay_ms=3):
    direction = 1 if count > 0 else -1
    for i in range(abs(count)):
        for coil, value in zip(coils, SEQUENCE[(i * direction) % 4]):
            coil.value(value)
        time.sleep_ms(delay_ms)
    for coil in coils:
        coil.value(0)              # release the coils so they do not heat up

while True:
    step(2048)                     # about one turn
    step(-2048)
`,
};

export const motionGuides: ComponentGuide[] = [
  {
    slug: "buzzer", idea: "A passive buzzer plays whatever frequency you send it, so it can play tones and tunes.",
    howItWorks: [
      "A piezo disc bends slightly each time the voltage changes. Switch it on and off 440 times a second and you hear 440 Hz (the note A).",
      "tone(pin, frequency) generates that square wave for you. A passive buzzer needs it; an active buzzer has its own oscillator and just beeps when given HIGH.",
      "To tell them apart, connect it briefly to 5 V and GND: an active buzzer beeps, a passive one only clicks.",
    ],
    facts: [["Passive", "Needs tone(): any frequency"], ["Active", "Beeps at one pitch with HIGH"], ["Loudest", "Near its resonant frequency, often 2–4 kHz"]],
    supply: "logic",
    pins: [
      { id: "plus", label: "+", role: "digital", note: "A 100 Ω resistor in series makes it quieter and protects the pin." },
      { id: "minus", label: "−", role: "gnd" },
    ],
    code: {
      arduino: `// Passive buzzer: a scale, then a short beep every second.
const int BUZZER = {pin:plus};
const int NOTES[] = {262, 294, 330, 349, 392, 440, 494, 523};   // C4 to C5 in Hz

void setup() {
  for (int i = 0; i < 8; i++) {
    tone(BUZZER, NOTES[i], 200);
    delay(250);
  }
}

void loop() {
  tone(BUZZER, 1000, 100);
  delay(1000);
}
`,
      micropython: `from machine import Pin, PWM
import time

buzzer = PWM(Pin({pin:plus}))
for freq in (262, 294, 330, 349, 392, 440, 494, 523):   # C4 to C5
    buzzer.freq(freq)
    buzzer.duty_u16(32768)      # 50 % duty: a square wave
    time.sleep_ms(200)
    buzzer.duty_u16(0)
    time.sleep_ms(50)

while True:
    buzzer.freq(1000)
    buzzer.duty_u16(32768)
    time.sleep_ms(100)
    buzzer.duty_u16(0)
    time.sleep_ms(900)
`,
    },
    expected: "It plays a rising scale, then beeps once a second.",
    mistakes: ["Using digitalWrite with a passive buzzer: you only hear a click.", "Using tone() with an active buzzer: it sounds rough or the pitch does not change.", "On an Uno, tone() blocks PWM on pins 3 and 11 while it plays."],
    check: { question: "What makes a passive buzzer play the note A (440 Hz)?", options: ["Setting the pin HIGH", "A square wave switching 440 times per second", "A 440 Ω resistor"], answer: 1, why: "The piezo moves with each voltage change, so the switching frequency is the pitch you hear." },
    inIndustry: "Microwave ovens, alarms and medical devices use buzzers for user feedback, often with standardised alarm tones.",
    studio: { type: "buzzer", pins: { plus: "plus", minus: "minus" } },
    related: ["hc-sr04"],
  },
  {
    slug: "vibration-motor", idea: "A tiny motor with an off-centre weight: when it spins, the whole device buzzes.",
    howItWorks: [
      "The unbalanced weight on the shaft shakes the motor as it spins, which is how phones vibrate.",
      "A bare coin motor draws 60–100 mA, more than a pin should give, so drive it through a transistor (with a diode across the motor) or use a module that has one.",
      "Pulse patterns (short-short-long) let you send different messages by touch.",
    ],
    facts: [["Current", "60–100 mA (bare coin motor)"], ["Voltage", "Typically 3 V; modules accept 3.3–5 V"], ["Drive", "Through a transistor or a vibration-motor module"]],
    supply: "logic",
    pins: [
      { id: "in", label: "IN (module signal)", role: "digital" },
      { id: "vcc", label: "VCC", role: "vcc" },
      { id: "gnd", label: "GND", role: "gnd" },
    ],
    code: {
      arduino: `// Vibration motor module: short, short, long.
const int MOTOR = {pin:in};

void buzz(int ms) {
  digitalWrite(MOTOR, HIGH);
  delay(ms);
  digitalWrite(MOTOR, LOW);
  delay(150);
}

void setup() {
  pinMode(MOTOR, OUTPUT);
}

void loop() {
  buzz(100);
  buzz(100);
  buzz(400);
  delay(2000);
}
`,
      micropython: `from machine import Pin
import time

motor = Pin({pin:in}, Pin.OUT, value=0)

def buzz(ms):
    motor.value(1)
    time.sleep_ms(ms)
    motor.value(0)
    time.sleep_ms(150)

while True:
    buzz(100)
    buzz(100)
    buzz(400)
    time.sleep(2)
`,
    },
    expected: "The motor buzzes short, short, long every two seconds.",
    mistakes: ["Driving a bare motor straight from a pin: too much current, and its voltage spikes can reset the board.", "No diode across a bare motor in a transistor circuit."],
    check: { question: "Why shouldn't a bare coin vibration motor be driven straight from a pin?", options: ["It needs AC", "It draws more current than a pin should supply", "It only works at 12 V"], answer: 1, why: "60–100 mA is well above the 20 mA a pin is comfortable giving." },
    inIndustry: "Haptic feedback design is a specialist area in phones, wearables and game controllers.",
    related: ["transistor-npn", "diode"],
  },
  {
    slug: "servo", idea: "A motor that holds an angle: the width of each pulse tells it where to point.",
    howItWorks: [
      "Inside a hobby servo are a DC motor, gears, a potentiometer on the output shaft and a control chip. The chip turns the motor until the pot reports the angle it was asked for.",
      "The board sends a pulse every 20 ms (50 Hz). About 0.5 ms means 0°, 1.5 ms the middle (90°) and 2.4 ms 180°. The Servo library generates these pulses on any pin.",
      "A moving servo can draw several hundred milliamps. One SG90 on USB is fine for a test; several, or bigger servos, need their own 5 V supply with a common ground.",
    ],
    facts: [["Signal", "50 Hz pulses, ≈ 0.5–2.4 ms wide"], ["SG90 supply", "4.8–6 V, up to ≈ 500 mA stalled"], ["Wire colours", "Brown/black GND, red V+, orange/yellow signal"]],
    supply: "5v",
    pins: [
      { id: "gnd", label: "GND (brown)", role: "gnd" },
      { id: "vcc", label: "V+ (red)", role: "vcc", note: "For more than one servo, use a separate 5 V supply and join its − to GND." },
      { id: "signal", label: "Signal (orange)", role: "servo", note3v3: "A 3.3 V signal drives SG90-type servos reliably." },
    ],
    code: {
      arduino: `{SERVO_INCLUDE}

Servo arm;

void setup() {
  arm.attach({pin:signal});
}

void loop() {
  for (int angle = 0; angle <= 180; angle += 2) {   // sweep out
    arm.write(angle);
    delay(15);
  }
  for (int angle = 180; angle >= 0; angle -= 2) {   // and back
    arm.write(angle);
    delay(15);
  }
}
`,
      micropython: `from machine import Pin, PWM
import time

servo = PWM(Pin({pin:signal}), freq=50)          # one pulse every 20 ms

def angle(degrees):
    pulse_us = 500 + degrees * 1900 // 180         # 0.5 ms .. 2.4 ms
    servo.duty_ns(pulse_us * 1000)

while True:
    for d in range(0, 181, 2):
        angle(d)
        time.sleep_ms(15)
    for d in range(180, -1, -2):
        angle(d)
        time.sleep_ms(15)
`,
    },
    libs: { arduino: ["Servo (built in)"], esp32: ["ESP32Servo"] },
    expected: "The servo arm sweeps smoothly from 0° to 180° and back.",
    mistakes: ["Powering several servos from the board's 5V pin: the board resets when they move.", "No common ground with an external servo supply: the servo jitters or ignores the signal.", "Forcing the arm by hand: it strips the plastic gears."],
    check: { question: "What sets a servo's angle?", options: ["The supply voltage", "The width of the pulse sent every 20 ms", "How long the pin stays HIGH in total"], answer: 1, why: "About 0.5 ms is one end, 1.5 ms the middle and 2.4 ms the other end." },
    inIndustry: "Servos steer RC vehicles and move robot joints; industrial servos use the same closed-loop principle with encoders.",
    studio: { type: "servo", pins: { gnd: "gnd", vcc: "vcc", signal: "signal" } },
    related: ["potentiometer", "dc-motor"],
  },
  {
    slug: "dc-motor", idea: "Spins when current flows; reverse the current and it reverses. It always needs a driver.",
    howItWorks: [
      "A brushed DC motor spins faster with more voltage and reverses when you swap its two wires. A gearbox (the yellow TT motors) trades speed for turning force.",
      "Motors draw far more current than a pin can give (hundreds of milliamps, more when starting or stalled), and they create electrical noise. Never connect one directly to the board.",
      "For one direction, switch it with a MOSFET and a flyback diode, as shown here. For forward and reverse, use an H-bridge driver such as the L298N or TB6612FNG.",
    ],
    facts: [["TT gear motor", "3–6 V, 150–250 mA running, over 1 A stalled"], ["Speed control", "PWM on the driver"], ["Reverse", "Swap the current direction (an H-bridge does this)"]],
    supply: "external",
    pins: [
      { id: "gate", label: "MOSFET gate", role: "pwm", via: "220 Ω resistor", note: "Add 10 kΩ from the gate to GND so the motor stays off at power-up." },
      { id: "source", label: "MOSFET source", role: "gnd" },
      { id: "motorMinus", label: "Motor −", role: "ext", to: "MOSFET drain" },
      { id: "motorPlus", label: "Motor +", role: "ext", to: "Battery pack + (4–6 V)", note: commonGround },
      { id: "diode", label: "Flyback diode (1N4007)", role: "ext", to: "Across the motor: stripe to Motor +" },
    ],
    code: {
      arduino: `// One-direction DC motor speed control through a logic-level MOSFET.
const int MOTOR = {pin:gate};

void setup() {
  pinMode(MOTOR, OUTPUT);
}

void loop() {
  for (int speed = 0; speed <= 255; speed += 5) {   // ramp up gently
    analogWrite(MOTOR, speed);
    delay(40);
  }
  delay(1500);
  for (int speed = 255; speed >= 0; speed -= 5) {   // and back down
    analogWrite(MOTOR, speed);
    delay(40);
  }
  delay(1500);
}
`,
      micropython: `from machine import Pin, PWM
import time

motor = PWM(Pin({pin:gate}), freq=1000)
while True:
    for speed in range(0, 65536, 1280):
        motor.duty_u16(speed)
        time.sleep_ms(40)
    time.sleep(1.5)
    for speed in range(65535, -1, -1280):
        motor.duty_u16(speed)
        time.sleep_ms(40)
    time.sleep(1.5)
`,
    },
    expected: "The motor speeds up, runs, slows down and stops, over and over.",
    mistakes: ["Motor wired straight to a pin: the pin or the board is damaged.", "No flyback diode: the MOSFET fails after a while.", "Motor powered from the board's 5V pin: the board resets each time the motor starts."],
    check: { question: "Why can't a motor be powered straight from a GPIO pin?", options: ["Motors need AC", "It needs far more current than a pin can give, and it produces voltage spikes", "Pins are too fast"], answer: 1, why: "A small motor can draw 1 A when starting; a pin is designed for about 20 mA." },
    inIndustry: "Motor control is central to robotics, drones, appliances and electric vehicles.",
    related: ["l298n", "tb6612fng", "mosfet", "diode"],
  },
  {
    slug: "l298n", idea: "A dual H-bridge: two motors, each with forward, reverse and PWM speed control.",
    howItWorks: [
      "An H-bridge is four switches around the motor. Closing opposite pairs sends current one way or the other, so IN1/IN2 choose the direction.",
      "PWM on ENA sets the speed. Take the ENA jumper off to use it; with the jumper on, the motor only runs at full speed.",
      "The L298N is an old bipolar design: it loses about 2 V inside, so a 6 V battery gives the motor only about 4 V. For small robots the TB6612FNG is more efficient.",
    ],
    facts: [["Motor supply", "5–35 V (into the 12V terminal)"], ["Current", "Up to ≈ 2 A per channel (with heatsink)"], ["Voltage loss", "≈ 2 V"], ["Logic", "Accepts 3.3 V and 5 V inputs"]],
    supply: "external",
    pins: [
      { id: "ena", label: "ENA (remove jumper)", role: "pwm" },
      { id: "in1", label: "IN1", role: "digital" },
      { id: "in2", label: "IN2", role: "digital" },
      { id: "out1", label: "OUT1", role: "ext", to: "Motor A terminal 1" },
      { id: "out2", label: "OUT2", role: "ext", to: "Motor A terminal 2" },
      { id: "vs", label: "12V (motor supply)", role: "ext", to: "Battery pack + (6–12 V)" },
      { id: "gnd", label: "GND", role: "gnd", note: "The battery's − goes to this same terminal: one common ground." },
      { id: "v5", label: "5V terminal", role: "nc", note: "With the 5V jumper on and up to 12 V in, this outputs 5 V. Do not also feed 5 V into it." },
    ],
    code: hBridgeCode("ena", "in1", "in2"),
    expected: "The motor runs forward for 2 s, stops, reverses for 2 s and stops.",
    mistakes: ["ENA jumper left on: speed control does nothing.", "No common ground between the battery, the L298N and the board: nothing moves or the board resets.", "Expecting full battery voltage at the motor: the L298N loses about 2 V."],
    check: { question: "What do IN1 and IN2 control on an L298N?", options: ["Speed", "Direction: which way current flows through the motor", "Which battery is used"], answer: 1, why: "IN1 HIGH/IN2 LOW is one direction, the reverse is the other, and both LOW stops." },
    inIndustry: "H-bridges drive motors in robots, printers, car windows and conveyor systems.",
    related: ["dc-motor", "tb6612fng", "l293d"],
  },
  {
    slug: "l293d", idea: "A dual H-bridge in a 16-pin chip that sits on a breadboard.",
    howItWorks: [
      "The L293D holds two H-bridges with built-in flyback diodes (the D). Each bridge has an enable pin for PWM speed and two inputs for direction.",
      "It needs two supplies: VCC1 (pin 16) at 5 V for its logic and VCC2 (pin 8) for the motors.",
      "It is good for small motors up to about 600 mA each. The four centre GND pins also carry heat away.",
    ],
    facts: [["Pin 1", "EN1,2: PWM speed"], ["Pins 2/7", "IN1/IN2: direction"], ["Pins 3/6", "OUT1/OUT2: to the motor"], ["Current", "600 mA per channel"]],
    supply: "5v",
    pins: [
      { id: "en", label: "EN1,2 (pin 1)", role: "pwm" },
      { id: "in1", label: "IN1 (pin 2)", role: "digital" },
      { id: "in2", label: "IN2 (pin 7)", role: "digital" },
      { id: "out1", label: "OUT1 (pin 3)", role: "ext", to: "Motor terminal 1" },
      { id: "out2", label: "OUT2 (pin 6)", role: "ext", to: "Motor terminal 2" },
      { id: "gnd", label: "GND (pins 4, 5, 12, 13)", role: "gnd", note: "The motor battery's − joins here too." },
      { id: "vcc1", label: "VCC1 (pin 16, logic)", role: "vcc" },
      { id: "vcc2", label: "VCC2 (pin 8, motors)", role: "ext", to: "Motor battery + (4.5–12 V)" },
    ],
    code: hBridgeCode("en", "in1", "in2"),
    expected: "The motor runs forward, stops, reverses and stops.",
    mistakes: ["Chip inserted the wrong way: find the notch, which marks the pin 1 end.", "Motor supply connected to VCC1: the chip can be destroyed.", "Running near 600 mA without cooling: the chip shuts down when hot."],
    check: { question: "Why does the L293D need two supply pins?", options: ["One is spare", "One powers its logic at 5 V; the other carries the motor current at the motor's voltage", "To drive two motors"], answer: 1, why: "Separating logic and motor power keeps the logic stable while motors use their own voltage." },
    inIndustry: "Small-motor drivers like this appear in toys, printers and simple automation.",
    related: ["l298n", "dc-motor"],
  },
  {
    slug: "tb6612fng", idea: "A small, efficient dual H-bridge built with MOSFETs: more power reaches the motor.",
    howItWorks: [
      "Like the L298N it has PWMA/AIN1/AIN2 for motor A (and B for motor B), but its MOSFET switches lose only about 0.5 V instead of 2 V.",
      "VCC is the logic supply (2.7–5.5 V) and VM is the motor supply (up to 13.5 V). STBY must be HIGH or the chip stays asleep.",
      "It handles 1.2 A per channel continuously, which is plenty for TT gear motors on small robots.",
    ],
    facts: [["Motor supply (VM)", "4.5–13.5 V"], ["Current", "1.2 A continuous, 3.2 A peak per channel"], ["Logic (VCC)", "2.7–5.5 V"]],
    supply: "logic",
    pins: [
      { id: "pwma", label: "PWMA", role: "pwm" },
      { id: "ain1", label: "AIN1", role: "digital" },
      { id: "ain2", label: "AIN2", role: "digital" },
      { id: "stby", label: "STBY", role: "digital", note: "Must be HIGH to run (or tie it to VCC)." },
      { id: "vcc", label: "VCC (logic)", role: "vcc" },
      { id: "gnd", label: "GND", role: "gnd", note: "The motor battery's − joins here too." },
      { id: "vm", label: "VM (motor supply)", role: "ext", to: "Battery pack + (4.5–12 V)" },
      { id: "ao1", label: "AO1", role: "ext", to: "Motor terminal 1" },
      { id: "ao2", label: "AO2", role: "ext", to: "Motor terminal 2" },
    ],
    code: (() => {
      const code = hBridgeCode("pwma", "ain1", "ain2", "\n  pinMode(STBY, OUTPUT);\n  digitalWrite(STBY, HIGH);   // wake the driver", "\nstby = Pin({pin:stby}, Pin.OUT, value=1)   # wake the driver");
      return { arduino: code.arduino.replace("const int EN =", "const int STBY = {pin:stby};\nconst int EN ="), micropython: code.micropython };
    })(),
    expected: "The motor runs forward, stops, reverses and stops.",
    mistakes: ["STBY left unconnected: nothing happens.", "Motor supply on VCC instead of VM: the logic side is overloaded.", "Soldering the header on the wrong side of the breakout: labels end up mirrored."],
    check: { question: "Why is the TB6612FNG often better than the L298N for small robots?", options: ["It is louder", "Its MOSFET bridge wastes much less voltage, so motors get more power and batteries last longer", "It needs no supply"], answer: 1, why: "≈ 0.5 V loss instead of ≈ 2 V makes a big difference on a 6 V battery pack." },
    inIndustry: "Choosing a driver by efficiency, current and heat is everyday hardware design work.",
    related: ["l298n", "dc-motor"],
  },
  {
    slug: "stepper-motor", idea: "It moves in exact steps, so you control position by counting them, with no sensor needed.",
    howItWorks: [
      "A stepper has several coils around a toothed rotor. Energising the coils in sequence pulls the rotor round one step at a time.",
      "The 28BYJ-48 is a small 5 V geared stepper: about 2048 full steps per output turn. It is slow (around 15 rpm) but precise.",
      "Its coils need more current than pins can give, so it plugs into a ULN2003 driver board, and the board's four inputs are driven by your pins.",
    ],
    facts: [["28BYJ-48", "5 V, ≈ 2048 steps per turn, ≈ 15 rpm max"], ["Driver", "ULN2003 board, inputs IN1–IN4"], ["Current", "≈ 240 mA while holding"]],
    supply: "5v",
    pins: stepperPins,
    code: stepperCode,
    libs: { arduino: ["Stepper (built in)"] },
    expected: "The shaft turns one full revolution clockwise, then one back.",
    mistakes: ["Wrong coil order in the Stepper library: the motor buzzes without turning. Use IN1, IN3, IN2, IN4.", "Setting the speed too high: the motor stalls and vibrates.", "Leaving the coils energised: the motor gets hot while standing still."],
    check: { question: "How does a stepper motor know its position?", options: ["It has an encoder", "It doesn't: the code counts the steps it has sent", "From the supply current"], answer: 1, why: "Steppers run open-loop; if a step is missed (stall), the count becomes wrong." },
    inIndustry: "3D printers, CNC machines, camera sliders and lab automation use steppers for precise positioning.",
    related: ["uln2003"],
  },
  {
    slug: "uln2003", idea: "Seven transistor switches in one chip, with diodes built in: ideal for stepper coils and relays.",
    howItWorks: [
      "The ULN2003 contains seven Darlington transistor switches. Each input from a pin switches its output to GND, sinking up to 500 mA.",
      "Flyback diodes for inductive loads are already inside, connected to the COM pin.",
      "The common blue driver board wires four channels to a socket for the 28BYJ-48 stepper and adds an LED per channel so you can watch the step sequence.",
    ],
    facts: [["Channels", "7 (4 used on the stepper board)"], ["Current", "Up to 500 mA per channel"], ["Inputs", "Work from 3.3 V and 5 V logic"]],
    supply: "5v",
    pins: stepperPins,
    code: stepperCode,
    libs: { arduino: ["Stepper (built in)"] },
    expected: "The four LEDs flicker in sequence and the stepper turns one revolution each way.",
    mistakes: ["Expecting it to source current: it only switches loads to GND (low-side).", "Powering two steppers from USB: the board browns out."],
    check: { question: "Why does the ULN2003 not need external flyback diodes?", options: ["Steppers make no spikes", "The diodes are built into the chip", "It uses AC"], answer: 1, why: "Its outputs include clamp diodes to the COM pin." },
    inIndustry: "Darlington arrays drive relays, solenoids and indicator lamps in industrial controllers.",
    related: ["stepper-motor", "relay-module"],
  },
  {
    slug: "relay-module", idea: "A switch moved by an electromagnet: a small signal switches a separate, isolated circuit.",
    howItWorks: [
      "A relay's coil pulls a metal contact across when energised. The module's transistor drives the coil, so your pin only sends a signal.",
      "The switched side has three screw terminals: COM (common), NO (normally open: connected only when the relay is on) and NC (normally closed).",
      "Many modules are active-LOW: the relay turns on when IN is LOW. You can hear it click.",
    ],
    facts: [["Coil supply", "5 V module: 5 V, ≈ 70 mA"], ["Contacts", "COM, NO, NC"], ["Logic", "Often active-LOW"]],
    supply: "5v",
    pins: [
      { id: "vcc", label: "VCC", role: "vcc" },
      { id: "gnd", label: "GND", role: "gnd" },
      { id: "in", label: "IN", role: "digital", note3v3: "Many 5 V modules switch from 3.3 V; if it clicks unreliably, use a 3.3 V-ready module or a transistor." },
      { id: "com", label: "COM + NO", role: "ext", to: "In series with the low-voltage device you are switching (for example a 5 V lamp)" },
    ],
    code: {
      arduino: `// Relay module: switch on for 2 s, off for 2 s. Listen for the click.
const int RELAY = {pin:in};
const bool ACTIVE_LOW = true;   // most blue relay modules switch on with LOW

void relay(bool on) {
  digitalWrite(RELAY, (on != ACTIVE_LOW) ? HIGH : LOW);
}

void setup() {
  relay(false);                 // set the off level first so it does not click at start-up
  pinMode(RELAY, OUTPUT);
  Serial.begin(115200);
}

void loop() {
  Serial.println("relay on");
  relay(true);
  delay(2000);
  Serial.println("relay off");
  relay(false);
  delay(2000);
}
`,
      micropython: `from machine import Pin
import time

ACTIVE_LOW = True                         # most blue relay modules switch on with LOW
relay = Pin({pin:in}, Pin.OUT, value=1 if ACTIVE_LOW else 0)   # start off

def set_relay(on):
    relay.value(0 if on == ACTIVE_LOW else 1)

while True:
    print("relay on")
    set_relay(True)
    time.sleep(2)
    print("relay off")
    set_relay(False)
    time.sleep(2)
`,
    },
    expected: "The relay clicks on and off every 2 seconds and its LED follows.",
    mistakes: ["Switching mains voltage while learning: mains can kill. Learn with low-voltage loads only, and leave mains wiring to qualified people.", "Assuming active-HIGH: the relay is on when you expect it off. Flip ACTIVE_LOW.", "Using NC instead of NO: the device runs when the relay is off."],
    check: { question: "Which terminals switch a device on only while the relay is energised?", options: ["COM and NC", "COM and NO", "VCC and GND"], answer: 1, why: "NO (normally open) connects to COM only while the coil is on." },
    inIndustry: "Relays switch heaters, pumps and motors in building automation; electricians handle the mains side.",
    related: ["transistor-npn", "diode"],
  },
  {
    slug: "solenoid", idea: "A coil that yanks a metal plunger in: a push or pull movement, used in locks and valves.",
    howItWorks: [
      "When current flows, the coil's magnetic field pulls the plunger in; a spring pushes it back when the current stops.",
      "Small solenoids need about 12 V and 0.3–1 A, far beyond a pin, so switch them with a logic-level MOSFET from a separate supply.",
      "The coil releases a large voltage spike when switched off: a flyback diode across it is essential. Many are not rated for continuous duty, so pulse them.",
    ],
    facts: [["Typical", "12 V, 0.3–1 A"], ["Driver", "Logic-level MOSFET + 1N4007 diode"], ["Duty", "Often intermittent: short pulses"]],
    supply: "external",
    pins: [
      { id: "gate", label: "MOSFET gate", role: "digital", via: "220 Ω resistor", note: "Add 10 kΩ from the gate to GND." },
      { id: "source", label: "MOSFET source", role: "gnd" },
      { id: "coilMinus", label: "Solenoid −", role: "ext", to: "MOSFET drain" },
      { id: "coilPlus", label: "Solenoid +", role: "ext", to: "12 V supply +", note: "Join the 12 V supply's − to {GND}." },
      { id: "diode", label: "Flyback diode (1N4007)", role: "ext", to: "Across the solenoid: stripe to Solenoid +" },
    ],
    code: switchCode("gate", "SOLENOID", 300, 3000, "plunger pulls in; keep pulses short so the coil stays cool"),
    expected: "The plunger snaps in for 0.3 s every 3 seconds.",
    mistakes: ["No flyback diode: the MOSFET is destroyed by the spike.", "Holding it on for minutes: the coil overheats.", "Using a weak supply: it buzzes instead of pulling in."],
    check: { question: "What happens without a flyback diode when the solenoid switches off?", options: ["Nothing", "The coil's energy creates a high voltage spike that can destroy the MOSFET", "The solenoid stays on"], answer: 1, why: "A coil resists sudden changes in current; the diode gives that current a safe path." },
    inIndustry: "Door locks, vending machines, washing-machine valves and car starters use solenoids.",
    related: ["mosfet", "diode", "relay-module"],
  },
];
