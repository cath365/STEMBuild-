export type GuideConnection = {
  from: string;
  to: string;
  purpose: string;
  caution?: string;
};

export type VerifiedBuildGuide = {
  projectSlug: string;
  board: string;
  boardSlug: string;
  title: string;
  status: "reviewed";
  statusNote: string;
  connections: GuideConnection[];
  prePowerChecks: string[];
  codeLanguage: string;
  code: string;
  expected: string[];
  commonMistakes: string[];
  sourceNotes: string[];
};

const ledUno = `const int LED_PIN = 8;

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

const ledEsp32 = `const int LED_PIN = 18;

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

const buttonUno = `const int BUTTON_PIN = 2;
const int LED_PIN = 8;

void setup() {
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  pinMode(LED_PIN, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  bool pressed = digitalRead(BUTTON_PIN) == LOW;
  digitalWrite(LED_PIN, pressed ? HIGH : LOW);
  Serial.println(pressed ? "PRESSED" : "RELEASED");
  delay(20);
}
`;

const buttonEsp32 = `const int BUTTON_PIN = 4;
const int LED_PIN = 18;

void setup() {
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  pinMode(LED_PIN, OUTPUT);
  Serial.begin(115200);
}

void loop() {
  bool pressed = digitalRead(BUTTON_PIN) == LOW;
  digitalWrite(LED_PIN, pressed ? HIGH : LOW);
  Serial.println(pressed ? "PRESSED" : "RELEASED");
  delay(20);
}
`;

const ldrUno = `const int LDR_PIN = A0;
const int LED_PIN = 8;
int threshold = 500; // Example only: replace after measuring your own light levels.

void setup() {
  pinMode(LED_PIN, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  int reading = analogRead(LDR_PIN);
  Serial.println(reading);
  digitalWrite(LED_PIN, reading < threshold ? HIGH : LOW);
  delay(200);
}
`;

const ldrEsp32 = `const int LDR_PIN = 34;   // Input-only ADC pin on classic ESP32.
const int LED_PIN = 18;
int threshold = 2000; // Example only: replace after measuring your own light levels.

void setup() {
  pinMode(LED_PIN, OUTPUT);
  Serial.begin(115200);
}

void loop() {
  int reading = analogRead(LDR_PIN);
  Serial.println(reading);
  digitalWrite(LED_PIN, reading < threshold ? HIGH : LOW);
  delay(200);
}
`;

const monitorUno = `#include <DHT.h>

const int SENSOR_PIN = 2;
const int GREEN_LED = 8;
const int RED_LED = 9;
#define SENSOR_TYPE DHT22
DHT sensor(SENSOR_PIN, SENSOR_TYPE);

void setup() {
  Serial.begin(9600);
  pinMode(GREEN_LED, OUTPUT);
  pinMode(RED_LED, OUTPUT);
  sensor.begin();
}

void loop() {
  delay(2500);
  float humidity = sensor.readHumidity();
  float temperature = sensor.readTemperature();

  if (isnan(humidity) || isnan(temperature)) {
    Serial.println("Read failed: check power, ground, DATA and sensor type.");
    digitalWrite(GREEN_LED, LOW);
    digitalWrite(RED_LED, HIGH);
    delay(250);
    digitalWrite(RED_LED, LOW);
    return;
  }

  Serial.print("Temperature C: ");
  Serial.print(temperature, 1);
  Serial.print(" | Humidity %: ");
  Serial.println(humidity, 1);

  // Instructional classroom threshold only; not a safety alarm.
  bool aboveThreshold = temperature > 30.0 || humidity > 75.0;
  digitalWrite(GREEN_LED, aboveThreshold ? LOW : HIGH);
  digitalWrite(RED_LED, aboveThreshold ? HIGH : LOW);
}
`;

const monitorEsp32 = `#include <DHT.h>

const int SENSOR_PIN = 4;
const int GREEN_LED = 18;
const int RED_LED = 19;
#define SENSOR_TYPE DHT22
DHT sensor(SENSOR_PIN, SENSOR_TYPE);

void setup() {
  Serial.begin(115200);
  pinMode(GREEN_LED, OUTPUT);
  pinMode(RED_LED, OUTPUT);
  sensor.begin();
}

void loop() {
  delay(2500);
  float humidity = sensor.readHumidity();
  float temperature = sensor.readTemperature();

  if (isnan(humidity) || isnan(temperature)) {
    Serial.println("Read failed: check power, ground, DATA and sensor type.");
    digitalWrite(GREEN_LED, LOW);
    digitalWrite(RED_LED, HIGH);
    delay(250);
    digitalWrite(RED_LED, LOW);
    return;
  }

  Serial.print("Temperature C: ");
  Serial.print(temperature, 1);
  Serial.print(" | Humidity %: ");
  Serial.println(humidity, 1);

  // Instructional classroom threshold only; not a safety alarm.
  bool aboveThreshold = temperature > 30.0 || humidity > 75.0;
  digitalWrite(GREEN_LED, aboveThreshold ? LOW : HIGH);
  digitalWrite(RED_LED, aboveThreshold ? HIGH : LOW);
}
`;

const ultrasonicUno = `const int TRIG_PIN = 9;
const int ECHO_PIN = 8;

float distanceCm() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  unsigned long duration = pulseIn(ECHO_PIN, HIGH, 30000UL);
  if (duration == 0) return -1.0;
  return duration * 0.0343f / 2.0f;
}

void setup() {
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  Serial.begin(9600);
}

void loop() {
  float cm = distanceCm();
  if (cm < 0) Serial.println("No echo");
  else {
    Serial.print(cm, 1);
    Serial.println(" cm");
  }
  delay(150);
}
`;

const servoUno = `#include <Servo.h>

Servo arm;
const int SERVO_PIN = 10;

void setup() {
  arm.attach(SERVO_PIN);
}

void loop() {
  arm.write(20);
  delay(800);
  arm.write(90);
  delay(800);
  arm.write(160);
  delay(800);
  arm.write(90);
  delay(800);
}
`;

const servoEsp32 = `// Install an ESP32-compatible Servo library for your Arduino-ESP32 setup.
#include <ESP32Servo.h>

Servo arm;
const int SERVO_PIN = 18;

void setup() {
  arm.setPeriodHertz(50);
  arm.attach(SERVO_PIN, 500, 2400);
}

void loop() {
  arm.write(20);
  delay(800);
  arm.write(90);
  delay(800);
  arm.write(160);
  delay(800);
  arm.write(90);
  delay(800);
}
`;

const motorDriverUno = `const int IN1 = 4;
const int IN2 = 5;

void stopMotor() {
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, LOW);
}

void forwardMotor() {
  digitalWrite(IN1, HIGH);
  digitalWrite(IN2, LOW);
}

void reverseMotor() {
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, HIGH);
}

void setup() {
  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  stopMotor();
}

void loop() {
  forwardMotor();
  delay(1200);
  stopMotor();
  delay(800);
  reverseMotor();
  delay(1200);
  stopMotor();
  delay(1200);
}
`;

const bluetoothCarUno = `#include <SoftwareSerial.h>

SoftwareSerial Bluetooth(10, 11); // Arduino D10 <- HC-05 TXD, D11 -> protected HC-05 RXD

const int IN1 = 4;
const int IN2 = 5;
const int IN3 = 6;
const int IN4 = 7;

unsigned long lastCommandAt = 0;
const unsigned long COMMAND_TIMEOUT_MS = 800;

void stopCar() {
  digitalWrite(IN1, LOW); digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW); digitalWrite(IN4, LOW);
}

void forward() {
  digitalWrite(IN1, HIGH); digitalWrite(IN2, LOW);
  digitalWrite(IN3, HIGH); digitalWrite(IN4, LOW);
}

void backward() {
  digitalWrite(IN1, LOW); digitalWrite(IN2, HIGH);
  digitalWrite(IN3, LOW); digitalWrite(IN4, HIGH);
}

void left() {
  digitalWrite(IN1, LOW); digitalWrite(IN2, HIGH);
  digitalWrite(IN3, HIGH); digitalWrite(IN4, LOW);
}

void right() {
  digitalWrite(IN1, HIGH); digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW); digitalWrite(IN4, HIGH);
}

void setup() {
  Serial.begin(9600);
  Bluetooth.begin(9600);
  pinMode(IN1, OUTPUT); pinMode(IN2, OUTPUT);
  pinMode(IN3, OUTPUT); pinMode(IN4, OUTPUT);
  stopCar();
}

void loop() {
  if (Bluetooth.available()) {
    char command = Bluetooth.read();
    lastCommandAt = millis();
    Serial.print("RX: "); Serial.println(command);

    switch (command) {
      case 'F': forward(); break;
      case 'B': backward(); break;
      case 'L': left(); break;
      case 'R': right(); break;
      default: stopCar(); break;
    }
  }

  if (millis() - lastCommandAt > COMMAND_TIMEOUT_MS) {
    stopCar();
  }
}
`;

const obstacleRobotUno = `#include <Servo.h>

const int IN1 = 4;
const int IN2 = 5;
const int IN3 = 6;
const int IN4 = 7;
const int ECHO_PIN = 8;
const int TRIG_PIN = 9;
const int SERVO_PIN = 10;

Servo scanner;

void stopCar() {
  digitalWrite(IN1, LOW); digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW); digitalWrite(IN4, LOW);
}

void forward() {
  digitalWrite(IN1, HIGH); digitalWrite(IN2, LOW);
  digitalWrite(IN3, HIGH); digitalWrite(IN4, LOW);
}

void turnLeft() {
  digitalWrite(IN1, LOW); digitalWrite(IN2, HIGH);
  digitalWrite(IN3, HIGH); digitalWrite(IN4, LOW);
}

void turnRight() {
  digitalWrite(IN1, HIGH); digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW); digitalWrite(IN4, HIGH);
}

float distanceCm() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  unsigned long duration = pulseIn(ECHO_PIN, HIGH, 30000UL);
  if (duration == 0) return 400.0;
  return duration * 0.0343f / 2.0f;
}

float lookAt(int angle) {
  scanner.write(angle);
  delay(350);
  return distanceCm();
}

void setup() {
  pinMode(IN1, OUTPUT); pinMode(IN2, OUTPUT);
  pinMode(IN3, OUTPUT); pinMode(IN4, OUTPUT);
  pinMode(TRIG_PIN, OUTPUT); pinMode(ECHO_PIN, INPUT);
  scanner.attach(SERVO_PIN);
  scanner.write(90);
  stopCar();
  delay(800);
}

void loop() {
  float ahead = distanceCm();

  if (ahead > 25.0) {
    forward();
    delay(40);
    return;
  }

  stopCar();
  delay(250);

  float leftDistance = lookAt(150);
  float rightDistance = lookAt(30);
  scanner.write(90);
  delay(200);

  if (leftDistance >= rightDistance) {
    turnLeft();
  } else {
    turnRight();
  }

  delay(450);
  stopCar();
  delay(150);
}
`;

export const verifiedBuildGuides: VerifiedBuildGuide[] = [
  {
    projectSlug:"first-led", board:"Arduino Uno", boardSlug:"arduino-uno", title:"Arduino Uno + LED",
    status:"reviewed", statusNote:"Source-reviewed wiring and code. Confirm the exact LED polarity and board labels before power.",
    connections:[
      {from:"Arduino D8",to:"330 Ω resistor",purpose:"limits LED current"},
      {from:"330 Ω resistor",to:"LED anode (+)",purpose:"drives the LED safely"},
      {from:"LED cathode (-)",to:"Arduino GND",purpose:"returns current to ground"},
    ],
    prePowerChecks:["LED has a series resistor.","LED polarity is confirmed.","No wire links 5 V directly to GND."],
    codeLanguage:"Arduino C++", code:ledUno,
    expected:["LED turns on for about 0.5 s.","LED turns off for about 0.5 s.","The pattern repeats."],
    commonMistakes:["LED reversed.","330 Ω resistor bypassed.","D8 in code does not match the physical wire."],
    sourceNotes:["Arduino Uno uses 5 V logic; keep GPIO current within board limits."],
  },
  {
    projectSlug:"first-led", board:"ESP32", boardSlug:"esp32", title:"ESP32 + LED",
    status:"reviewed", statusNote:"Source-reviewed wiring and code for a common ESP32 DevKit-style board. Confirm your board pin labels.",
    connections:[
      {from:"ESP32 GPIO18",to:"330 Ω resistor",purpose:"limits LED current"},
      {from:"330 Ω resistor",to:"LED anode (+)",purpose:"drives the LED"},
      {from:"LED cathode (-)",to:"ESP32 GND",purpose:"returns current to ground"},
    ],
    prePowerChecks:["Use 3.3 V GPIO only.","LED has a series resistor.","GPIO18 exists on your exact board."],
    codeLanguage:"Arduino C++", code:ledEsp32,
    expected:["LED blinks every half second."],
    commonMistakes:["Using a pin that is not broken out on the exact ESP32 board.","LED reversed.","No common ground."],
    sourceNotes:["ESP32 GPIO tolerance is 3.6 V maximum; do not apply 5 V to GPIO."],
  },
  {
    projectSlug:"button-light", board:"Arduino Uno", boardSlug:"arduino-uno", title:"Arduino Uno + push button + LED",
    status:"reviewed", statusNote:"Uses the Uno internal pull-up so the button wiring stays simple.",
    connections:[
      {from:"Arduino D2",to:"Button terminal A",purpose:"reads button state"},
      {from:"Button terminal B",to:"Arduino GND",purpose:"pulls D2 LOW when pressed"},
      {from:"Arduino D8",to:"330 Ω resistor → LED anode",purpose:"controls LED"},
      {from:"LED cathode",to:"Arduino GND",purpose:"LED return"},
    ],
    prePowerChecks:["Button terminals are identified; many 4-leg tactile switches pair legs internally.","LED has a resistor.","Button does not short 5 V to GND."],
    codeLanguage:"Arduino C++", code:buttonUno,
    expected:["Serial Monitor prints RELEASED until pressed.","Pressing the button lights the LED and prints PRESSED."],
    commonMistakes:["Using two internally connected legs on the same side of a tactile button.","Forgetting INPUT_PULLUP means pressed = LOW.","LED polarity reversed."],
    sourceNotes:["Arduino Uno digital inputs support internal pull-ups."],
  },
  {
    projectSlug:"button-light", board:"ESP32", boardSlug:"esp32", title:"ESP32 + push button + LED",
    status:"reviewed", statusNote:"Uses INPUT_PULLUP on GPIO4 and an LED on GPIO18.",
    connections:[
      {from:"ESP32 GPIO4",to:"Button terminal A",purpose:"reads button state"},
      {from:"Button terminal B",to:"ESP32 GND",purpose:"pulls input LOW when pressed"},
      {from:"ESP32 GPIO18",to:"330 Ω resistor → LED anode",purpose:"controls LED"},
      {from:"LED cathode",to:"ESP32 GND",purpose:"LED return"},
    ],
    prePowerChecks:["No 5 V signal is connected to ESP32 GPIO.","Button terminal pairs are understood.","LED has a current-limiting resistor."],
    codeLanguage:"Arduino C++", code:buttonEsp32,
    expected:["Pressing the button lights the LED.","Serial Monitor shows PRESSED / RELEASED."],
    commonMistakes:["Feeding 5 V into GPIO4.","Button mounted so both wires use the same internal contact pair.","Using a different GPIO without updating code."],
    sourceNotes:["ESP32 GPIO must remain at or below the documented tolerance."],
  },
  {
    projectSlug:"light-detector", board:"Arduino Uno", boardSlug:"arduino-uno", title:"Arduino Uno + LDR voltage divider",
    status:"reviewed", statusNote:"The threshold is intentionally a learner-calibrated value, not a universal number.",
    connections:[
      {from:"Arduino 5 V",to:"LDR lead 1",purpose:"powers the divider"},
      {from:"LDR lead 2",to:"Arduino A0 + 10 kΩ resistor",purpose:"creates the measurement node"},
      {from:"Other end of 10 kΩ resistor",to:"Arduino GND",purpose:"completes the divider"},
      {from:"Arduino D8",to:"330 Ω resistor → LED anode",purpose:"darkness indicator"},
      {from:"LED cathode",to:"Arduino GND",purpose:"LED return"},
    ],
    prePowerChecks:["A0 is connected only to the divider midpoint.","10 kΩ resistor reaches GND.","LED has its own 330 Ω resistor."],
    codeLanguage:"Arduino C++", code:ldrUno,
    expected:["Serial values change when you cover/uncover the LDR.","After calibration, the LED changes state around your chosen threshold."],
    commonMistakes:["Reading the wrong divider node.","Copying the example threshold without measuring local light.","Using a digital pin instead of A0."],
    sourceNotes:["Thresholds depend on the actual LDR, resistor tolerance and ambient light."],
  },
  {
    projectSlug:"light-detector", board:"ESP32", boardSlug:"esp32", title:"ESP32 + LDR voltage divider",
    status:"reviewed", statusNote:"Uses 3.3 V for the divider and GPIO34 as an input-only ADC pin on classic ESP32.",
    connections:[
      {from:"ESP32 3V3",to:"LDR lead 1",purpose:"powers the divider within GPIO limits"},
      {from:"LDR lead 2",to:"ESP32 GPIO34 + 10 kΩ resistor",purpose:"ADC measurement node"},
      {from:"Other end of 10 kΩ resistor",to:"ESP32 GND",purpose:"completes the divider"},
      {from:"ESP32 GPIO18",to:"330 Ω resistor → LED anode",purpose:"indicator"},
      {from:"LED cathode",to:"ESP32 GND",purpose:"LED return"},
    ],
    prePowerChecks:["Divider is powered from 3.3 V, not 5 V.","GPIO34 is available on your exact ESP32 board.","LED resistor is present."],
    codeLanguage:"Arduino C++", code:ldrEsp32,
    expected:["ADC values change with light.","A learner-calibrated threshold controls the LED."],
    commonMistakes:["Powering the divider from 5 V.","Expecting GPIO34 to provide an output or internal pull-up.","Using an arbitrary threshold without measuring."],
    sourceNotes:["Classic ESP32 GPIO34–39 are input-only; GPIO tolerance is 3.6 V."],
  },
  {
    projectSlug:"smart-environment-monitor", board:"Arduino Uno", boardSlug:"arduino-uno", title:"Arduino Uno + DHT22 + status LEDs",
    status:"reviewed", statusNote:"Matches the existing STEMBuild Smart Environment Monitor Arduino example.",
    connections:[
      {from:"Arduino 5 V",to:"DHT VCC",purpose:"sensor supply",caution:"Bare sensor/module pin order must be confirmed."},
      {from:"Arduino D2",to:"DHT DATA",purpose:"temperature/humidity data"},
      {from:"DHT GND",to:"Arduino GND",purpose:"common ground"},
      {from:"Arduino D8",to:"330 Ω → green LED",purpose:"normal-status indicator"},
      {from:"Arduino D9",to:"330 Ω → red LED",purpose:"example threshold/fault indicator"},
      {from:"DHT DATA",to:"10 kΩ → VCC",purpose:"pull-up for a bare DHT11/DHT22 when required"},
    ],
    prePowerChecks:["Exact DHT pin order is verified.","LED resistors are present.","Sensor type in code matches DHT11 or DHT22 hardware."],
    codeLanguage:"Arduino C++", code:monitorUno,
    expected:["Serial Monitor prints temperature and humidity.","Invalid readings print a clear failure message.","LEDs respond to the instructional threshold."],
    commonMistakes:["DHT11 hardware but DHT22 selected in code.","Missing DATA pull-up on a bare sensor.","Reading too frequently."],
    sourceNotes:["DHT sensors accept 3–5 V; bare four-pin sensors commonly need a pull-up on DATA."],
  },
  {
    projectSlug:"smart-environment-monitor", board:"ESP32", boardSlug:"esp32", title:"ESP32 + DHT22 + status LEDs",
    status:"reviewed", statusNote:"Matches the existing STEMBuild ESP32 Smart Environment Monitor example.",
    connections:[
      {from:"ESP32 3V3",to:"DHT VCC",purpose:"keeps DATA logic within ESP32 range"},
      {from:"ESP32 GPIO4",to:"DHT DATA",purpose:"temperature/humidity data"},
      {from:"DHT GND",to:"ESP32 GND",purpose:"common ground"},
      {from:"ESP32 GPIO18",to:"330 Ω → green LED",purpose:"normal-status indicator"},
      {from:"ESP32 GPIO19",to:"330 Ω → red LED",purpose:"example threshold/fault indicator"},
      {from:"DHT DATA",to:"10 kΩ → 3V3",purpose:"pull-up for a bare sensor when required"},
    ],
    prePowerChecks:["No DHT DATA pull-up goes to 5 V.","Exact DHT pin order is verified.","GPIO4/18/19 exist on the exact board."],
    codeLanguage:"Arduino C++", code:monitorEsp32,
    expected:["Serial Monitor at 115200 prints validated readings.","Status LEDs reflect the instructional threshold."],
    commonMistakes:["Pulling DATA up to 5 V.","Wrong sensor type.","Using a boot-sensitive/reassigned pin without updating code."],
    sourceNotes:["ESP32 GPIO tolerance is 3.6 V maximum."],
  },
  {
    projectSlug:"ultrasonic-distance-lab", board:"Arduino Uno", boardSlug:"arduino-uno", title:"Arduino Uno + HC-SR04 distance lab",
    status:"reviewed", statusNote:"Uses the 5 V HC-SR04 with direct Uno digital I/O.",
    connections:[
      {from:"Arduino 5 V",to:"HC-SR04 VCC",purpose:"sensor supply"},
      {from:"Arduino GND",to:"HC-SR04 GND",purpose:"common ground"},
      {from:"Arduino D9",to:"HC-SR04 TRIG",purpose:"starts each ultrasonic burst"},
      {from:"HC-SR04 ECHO",to:"Arduino D8",purpose:"measures echo pulse duration"},
    ],
    prePowerChecks:["Sensor labels read VCC, TRIG, ECHO, GND.","Nothing blocks the two transducers at very close range.","The sensor is not connected to a 3.3 V-only GPIO board."],
    codeLanguage:"Arduino C++", code:ultrasonicUno,
    expected:["Serial Monitor shows distance in centimetres.","Moving a flat object changes the reading.","A missing echo reports No echo instead of hanging forever."],
    commonMistakes:["TRIG and ECHO swapped.","Object is outside useful range or poorly angled.","Using the 5 V ECHO output directly on a 3.3 V board."],
    sourceNotes:["HC-SR04 is specified for 5 V operation with VCC, TRIG, ECHO and GND pins."],
  },
  {
    projectSlug:"servo-sweep-lab", board:"Arduino Uno", boardSlug:"arduino-uno", title:"Arduino Uno + micro servo sweep",
    status:"reviewed", statusNote:"The signal comes from D10; servo power should come from a suitable regulated 5 V source with common ground.",
    connections:[
      {from:"Arduino D10",to:"Servo signal",purpose:"position command"},
      {from:"Regulated 5 V supply +",to:"Servo V+",purpose:"servo power",caution:"Do not assume the Arduino 5 V rail can safely supply servo stall current."},
      {from:"Regulated 5 V supply GND",to:"Servo GND + Arduino GND",purpose:"common reference"},
    ],
    prePowerChecks:["Servo is unloaded for the first test.","Power supply voltage matches the servo.","Arduino and servo supply grounds are connected together."],
    codeLanguage:"Arduino C++", code:servoUno,
    expected:["Servo moves to roughly 20°, 90° and 160° in sequence.","Board remains stable without resetting."],
    commonMistakes:["Powering a loaded servo from an undersized board rail.","No common ground.","Forcing the horn beyond its mechanical range."],
    sourceNotes:["Servo current can exceed what a small board rail should supply; use an appropriate external supply."],
  },
  {
    projectSlug:"servo-sweep-lab", board:"ESP32", boardSlug:"esp32", title:"ESP32 + micro servo sweep",
    status:"reviewed", statusNote:"Uses GPIO18 for the control signal and an external regulated servo supply.",
    connections:[
      {from:"ESP32 GPIO18",to:"Servo signal",purpose:"position command"},
      {from:"Regulated 5 V supply +",to:"Servo V+",purpose:"servo power"},
      {from:"Regulated 5 V supply GND",to:"Servo GND + ESP32 GND",purpose:"common reference"},
    ],
    prePowerChecks:["Servo power is separate from GPIO.","Grounds are common.","ESP32-compatible servo library is installed."],
    codeLanguage:"Arduino C++", code:servoEsp32,
    expected:["Servo sweeps between the requested angles without resetting the ESP32."],
    commonMistakes:["Trying to power the servo from GPIO/3V3.","No shared ground.","Library not compatible with Arduino-ESP32 version."],
    sourceNotes:["ESP32 provides 3.3 V logic; servo power is a separate electrical requirement."],
  },
  {
    projectSlug:"motor-driver-test", board:"Arduino Uno", boardSlug:"arduino-uno", title:"Arduino Uno + L298N single-motor test",
    status:"reviewed", statusNote:"This guide verifies the control side. L298N module power-terminal/jumper layouts vary, so learners must match the exact module labels before motor power is connected.",
    connections:[
      {from:"Arduino D4",to:"L298N IN1",purpose:"Motor A direction input 1"},
      {from:"Arduino D5",to:"L298N IN2",purpose:"Motor A direction input 2"},
      {from:"L298N OUT1 / OUT2",to:"DC motor terminals",purpose:"drives Motor A"},
      {from:"Arduino GND",to:"L298N GND",purpose:"common logic reference"},
      {from:"Motor supply",to:"L298N motor-supply terminals",purpose:"powers motor stage",caution:"Use the exact module labels/specification. Do not guess the 5V/regulator jumper configuration."},
    ],
    prePowerChecks:["Wheels/motor shaft are free to move.","Motor voltage matches the supply.","Arduino GND and driver GND are common.","The exact L298N module power/jumper arrangement has been verified."],
    codeLanguage:"Arduino C++", code:motorDriverUno,
    expected:["Motor runs one direction, stops, reverses, stops.","Arduino remains powered and stable."],
    commonMistakes:["No common ground.","Motor powered from Arduino GPIO.","Incorrect module 5 V regulator/jumper assumption.","Motor leads need swapping if physical forward/reverse is opposite."],
    sourceNotes:["The L298 is a dual full-bridge driver intended for inductive loads such as DC motors."],
  },
  {
    projectSlug:"bluetooth-car", board:"Arduino Uno", boardSlug:"arduino-uno", title:"Arduino Uno + HC-05 + L298N Bluetooth car",
    status:"reviewed", statusNote:"Control mapping is reviewed; motor direction may need one channel inverted because physical motor orientation differs by chassis.",
    connections:[
      {from:"Arduino D4/D5",to:"L298N IN1/IN2",purpose:"left motor direction"},
      {from:"Arduino D6/D7",to:"L298N IN3/IN4",purpose:"right motor direction"},
      {from:"HC-05 TXD",to:"Arduino D10",purpose:"Bluetooth receive into SoftwareSerial"},
      {from:"Arduino D11",to:"HC-05 RXD through a suitable divider/level shift",purpose:"protects HC-05 RX logic"},
      {from:"Arduino GND",to:"HC-05 GND + L298N GND",purpose:"common reference"},
      {from:"Motor supply",to:"L298N motor supply",purpose:"powers motors",caution:"Verify the exact L298N module power/jumper labels."},
    ],
    prePowerChecks:["Lift driven wheels off the floor for the first command test.","HC-05 RXD is not driven directly by 5 V without protection.","Motor supply and common ground are correct.","F/B/L/R/S commands are visible in Serial Monitor before free driving."],
    codeLanguage:"Arduino C++", code:bluetoothCarUno,
    expected:["F, B, L and R commands move the lifted wheels in the intended pattern.","Any other command stops the car.","If Bluetooth commands stop, the timeout stops the motors."],
    commonMistakes:["RX/TX not crossed correctly.","No voltage protection on HC-05 RXD.","One motor mounted in the opposite orientation.","ENA/ENB not enabled on the exact driver module."],
    sourceNotes:["HC-05 carrier boards vary; verify supply and logic requirements printed/documented for the exact module."],
  },
  {
    projectSlug:"obstacle-robot", board:"Arduino Uno", boardSlug:"arduino-uno", title:"Arduino Uno obstacle-avoiding robot",
    status:"reviewed", statusNote:"Uses HC-SR04 on D9/D8, servo on D10 and two motor-driver channels on D4–D7.",
    connections:[
      {from:"Arduino D9",to:"HC-SR04 TRIG",purpose:"ultrasonic trigger"},
      {from:"HC-SR04 ECHO",to:"Arduino D8",purpose:"echo timing"},
      {from:"Arduino D10",to:"Servo signal",purpose:"left/right sensor scan"},
      {from:"Arduino D4/D5",to:"L298N IN1/IN2",purpose:"left motor channel"},
      {from:"Arduino D6/D7",to:"L298N IN3/IN4",purpose:"right motor channel"},
      {from:"External regulated servo supply",to:"Servo V+ / GND",purpose:"stable servo power"},
      {from:"Motor supply",to:"L298N motor supply",purpose:"motor power"},
      {from:"All grounds",to:"Common GND",purpose:"shared signal reference"},
    ],
    prePowerChecks:["Lift wheels for the first motor test.","Servo can rotate without hitting the chassis.","HC-SR04 sees forward without obstruction.","Servo and motor supplies are appropriate and share ground with Arduino."],
    codeLanguage:"Arduino C++", code:obstacleRobotUno,
    expected:["Robot drives forward while space ahead exceeds about 25 cm.","Near an obstacle it stops, scans left/right and chooses the clearer side.","A missing ultrasonic echo is treated as far away rather than freezing the loop."],
    commonMistakes:["Motor channel polarity reversed.","Servo powered from an undersized source.","HC-SR04 TRIG/ECHO swapped.","Scanner mounted so 30°/150° are opposite to the code's assumed sides."],
    sourceNotes:["Physical left/right motor polarity and servo horn mounting must be checked on the actual chassis."],
  },
];

export function guideFor(projectSlug: string, board: string) {
  return verifiedBuildGuides.find((guide) => guide.projectSlug === projectSlug && guide.board === board);
}

export function guideBoards(projectSlug: string) {
  return verifiedBuildGuides.filter((guide) => guide.projectSlug === projectSlug).map((guide) => guide.board);
}
