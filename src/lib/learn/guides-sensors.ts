import type { ComponentGuide } from "@/lib/learn/types";
import { analogSensorCode, digitalSensorCode } from "@/lib/learn/templates";

const moduleTrimmer = "The blue trimmer on the module sets the trigger point. Turn it slowly until the module's LED just switches.";

export const sensorGuides: ComponentGuide[] = [
  {
    slug: "ldr", idea: "Its resistance falls as light rises. Pair it with a fixed resistor and light becomes a voltage.",
    howItWorks: [
      "A photoresistor (LDR) is a resistor made of a light-sensitive material: thousands of ohms in the dark, a few hundred in bright light.",
      "A board cannot measure resistance directly, so put the LDR in a voltage divider with a 10 kΩ resistor. The voltage at the middle rises as light increases, and the ADC reads it.",
      "LDRs are slow (tens of milliseconds) and vary from part to part, so they suit 'is it dark?' decisions rather than precise light measurement.",
    ],
    facts: [["Resistance", "≈ 1 MΩ dark · ≈ 1 kΩ bright room (varies)"], ["Partner resistor", "10 kΩ"], ["Polarity", "None"]],
    supply: "logic",
    pins: [
      { id: "top", label: "LDR lead 1", role: "vcc" },
      { id: "node", label: "LDR lead 2 (divider middle)", role: "analog", note: "Also connect a 10 kΩ resistor from this point to GND." },
      { id: "resistor", label: "10 kΩ resistor, other end", role: "gnd" },
    ],
    code: analogSensorCode("node", "light", "higher = brighter"),
    expected: "Covering the LDR makes the reading drop; a torch makes it rise.",
    mistakes: ["Leaving out the 10 kΩ resistor: the reading hardly changes.", "Swapping the LDR and resistor positions: it still works but reads higher in the dark. Just know which way round you built it.", "Expecting lux values: an LDR needs calibrating against a light meter for that."],
    check: { question: "Why is the LDR wired with a 10 kΩ resistor?", options: ["To protect the LDR", "To form a voltage divider so the changing resistance becomes a changing voltage", "To make it more sensitive to colour"], answer: 1, why: "The ADC measures voltage; the divider converts the LDR's resistance into one." },
    inIndustry: "Street lights and automatic night lights use the same divider idea; phones use calibrated photodiodes.",
    related: ["resistor-10k", "potentiometer"],
  },
  {
    slug: "dht11-dht22", idea: "Temperature and humidity in one sensor, sent as a timed digital message on a single wire.",
    howItWorks: [
      "Inside are a humidity-sensing element, a thermistor and a small chip that converts both into numbers.",
      "The board pulls the data line LOW to ask for a reading; the sensor replies with 40 bits whose meaning is set by how long each pulse lasts. A library handles that timing for you.",
      "The DHT11 (blue) is cheap and coarse; the DHT22 (white) is more accurate and covers a wider range. Neither should be read more often than about once every 2 seconds.",
    ],
    facts: [["DHT11", "0–50 °C ±2 °C · 20–80 % RH ±5 %"], ["DHT22", "−40–80 °C ±0.5 °C · 0–100 % RH ±2–5 %"], ["Read interval", "≥ 1 s (DHT11), ≥ 2 s (DHT22)"], ["Supply", "3.3–5.5 V"]],
    supply: "logic",
    pins: [
      { id: "vcc", label: "VCC (pin 1)", role: "vcc" },
      { id: "data", label: "DATA (pin 2)", role: "digital", note: "Bare sensor: add a 10 kΩ pull-up from DATA to VCC. 3-pin modules already have it." },
      { id: "nc", label: "NC (pin 3)", role: "nc" },
      { id: "gnd", label: "GND (pin 4)", role: "gnd" },
    ],
    code: {
      arduino: `#include <DHT.h>

#define DHT_PIN {pin:data}
#define DHT_TYPE DHT22   // DHT11 for the blue sensor

DHT dht(DHT_PIN, DHT_TYPE);

void setup() {
  Serial.begin(115200);
  dht.begin();
}

void loop() {
  delay(2000);                        // the sensor needs time between readings
  float humidity = dht.readHumidity();
  float celsius = dht.readTemperature();
  if (isnan(humidity) || isnan(celsius)) {
    Serial.println("Read failed: check wiring, DHT_TYPE and the pull-up");
    return;
  }
  Serial.print("temp:");
  Serial.print(celsius, 1);
  Serial.print(" humidity:");
  Serial.println(humidity, 1);
}
`,
      micropython: `import dht
from machine import Pin
import time

sensor = dht.DHT22(Pin({pin:data}))   # dht.DHT11 for the blue sensor
while True:
    try:
        sensor.measure()
        print("temp:", sensor.temperature(), "humidity:", sensor.humidity())
    except OSError:
        print("Read failed: check wiring and the pull-up")
    time.sleep(2)
`,
    },
    libs: { arduino: ["DHT sensor library (Adafruit)", "Adafruit Unified Sensor"], micropython: "Built in (dht module)" },
    expected: "Temperature and humidity print every 2 seconds; breathing on the sensor raises the humidity.",
    mistakes: ["Wrong DHT_TYPE: readings are nonsense or fail.", "Reading faster than every 2 seconds: the sensor returns errors or stale values.", "Pin order guessed on a 3-pin module: labels differ between modules. Read the silk-screen."],
    check: { question: "Why does the code wait 2 seconds between DHT22 readings?", options: ["To save power", "The sensor needs that long between measurements", "Serial printing is slow"], answer: 1, why: "The DHT22's datasheet specifies a minimum 2-second sampling period." },
    inIndustry: "Greenhouse controllers, server-room monitors and cold-chain loggers track temperature and humidity like this.",
    related: ["bme280", "ds18b20"],
  },
  {
    slug: "ds18b20", idea: "A digital thermometer with its own serial number, so many can share one wire.",
    howItWorks: [
      "The DS18B20 measures temperature and sends it as a number over the 1-Wire bus: one data wire plus ground (and usually power).",
      "Each sensor has a unique 64-bit address, so you can hang several on the same pin and read them one by one.",
      "The waterproof probe version is ideal for liquids and soil. The data line needs a 4.7 kΩ pull-up to VDD.",
    ],
    facts: [["Range", "−55 to 125 °C, ±0.5 °C (−10 to 85 °C)"], ["Resolution", "9–12 bit; 12-bit takes 750 ms"], ["Probe wires", "Usually red VDD, black GND, yellow DQ"], ["Pull-up", "4.7 kΩ DQ to VDD"]],
    supply: "logic",
    pins: [
      { id: "gnd", label: "GND", role: "gnd" },
      { id: "dq", label: "DQ (data)", role: "digital", note: "Add a 4.7 kΩ pull-up from DQ to VDD." },
      { id: "vdd", label: "VDD", role: "vcc" },
    ],
    code: {
      arduino: `#include <OneWire.h>
#include <DallasTemperature.h>

OneWire bus({pin:dq});
DallasTemperature sensors(&bus);

void setup() {
  Serial.begin(115200);
  sensors.begin();
  Serial.print("Sensors found: ");
  Serial.println(sensors.getDeviceCount());
}

void loop() {
  sensors.requestTemperatures();               // all sensors measure at once
  float celsius = sensors.getTempCByIndex(0);
  if (celsius == DEVICE_DISCONNECTED_C) {
    Serial.println("No sensor: check the 4.7 kOhm pull-up and wiring");
  } else {
    Serial.print("temp:");
    Serial.println(celsius, 2);
  }
  delay(1000);
}
`,
      micropython: `import onewire, ds18x20
from machine import Pin
import time

bus = ds18x20.DS18X20(onewire.OneWire(Pin({pin:dq})))
roms = bus.scan()
print("Sensors found:", len(roms))
while True:
    bus.convert_temp()
    time.sleep_ms(750)                 # 12-bit conversion time
    for rom in roms:
        print("temp:", bus.read_temp(rom))
    time.sleep(1)
`,
    },
    libs: { arduino: ["OneWire", "DallasTemperature"], micropython: "Built in (onewire, ds18x20)" },
    expected: "One temperature per second; holding the sensor warms it within a few seconds.",
    mistakes: ["No pull-up resistor: 'Sensors found: 0' or −127 °C.", "A reading of 85 °C straight after power-up: that is the sensor's reset value, not a real temperature.", "Sensor connected backwards: it gets hot quickly. Unplug it at once."],
    check: { question: "Why can several DS18B20s share one data pin?", options: ["They take turns by timing", "Each has a unique 64-bit address", "They all report the same temperature"], answer: 1, why: "The bus addresses each sensor by its serial number." },
    inIndustry: "Food-safety probes, aquariums, battery-pack monitoring and HVAC systems use 1-Wire temperature sensors.",
    related: ["dht11-dht22", "lm35"],
  },
  {
    slug: "lm35", idea: "An analog thermometer: 10 mV out for every degree Celsius.",
    howItWorks: [
      "The LM35's output voltage is proportional to temperature: 0 V at 0 °C, 0.25 V at 25 °C, 1.0 V at 100 °C.",
      "Read it with an analog pin, convert the reading to volts, then multiply by 100 to get °C.",
      "It needs at least 4 V to run, so power it from 5 V even on a 3.3 V board. Its output stays far below 3.3 V, so that is safe.",
    ],
    facts: [["Scale", "10 mV per °C, 0 V at 0 °C"], ["Accuracy", "±0.5 °C at 25 °C"], ["Supply", "4–30 V"], ["Pins (flat face toward you)", "+Vs, Vout, GND"]],
    supply: "5v",
    pins: [
      { id: "vs", label: "+Vs (left)", role: "vcc" },
      { id: "vout", label: "Vout (middle)", role: "analog", note3v3: "Vout is only 0.25 V at 25 °C, safely below 3.3 V." },
      { id: "gnd", label: "GND (right)", role: "gnd" },
    ],
    code: {
      arduino: `// LM35: 10 mV per degree Celsius.
const int SENSOR = {pin:vout};

void setup() {
  Serial.begin(115200);
}

void loop() {
  float volts = analogRead(SENSOR) * {VREF} / {ADC_MAX};
  float celsius = volts * 100.0;
  Serial.print("temp:");
  Serial.println(celsius, 1);
  delay(500);
}
`,
      micropython: `from machine import ADC, Pin
import time

sensor = ADC(Pin({pin:vout}))
{MP_ATTEN:sensor}
while True:
    volts = sensor.read_u16() * 3.3 / 65535
    print("temp:", round(volts * 100, 1))   # 10 mV per degree Celsius
    time.sleep_ms(500)
`,
    },
    expected: "Room temperature reads about 20–30 °C; pinching the sensor raises it.",
    mistakes: ["Wired backwards (looking at the curved side): it heats up fast. Unplug it.", "Confusing it with a TMP36, which adds a 0.5 V offset: readings 50 °C too high.", "On the ESP32, readings below about 0.1 V are inaccurate because of the ADC's non-linearity; calibrate, or use a DS18B20."],
    check: { question: "The LM35 outputs 0.31 V. What is the temperature?", options: ["3.1 °C", "31 °C", "310 °C"], answer: 1, why: "0.31 V ÷ 0.010 V per °C = 31 °C." },
    inIndustry: "Analog sensors with a known scale factor are everywhere in industrial measurement; converting counts to units is basic firmware work.",
    related: ["ds18b20", "potentiometer"],
  },
  {
    slug: "hc-sr04", idea: "It shouts an ultrasonic click and times the echo: distance = time × speed of sound ÷ 2.",
    howItWorks: [
      "A 10 µs pulse on TRIG makes the module send a burst of 40 kHz sound. ECHO then goes HIGH and stays HIGH until the reflection comes back.",
      "Sound travels about 343 m/s, so the echo takes about 58 µs per centimetre there and back. pulseIn() measures the ECHO pulse.",
      "Soft, angled or very small objects reflect poorly. Expect useful readings from about 2 cm to 4 m.",
    ],
    facts: [["Range", "≈ 2 cm – 4 m"], ["Conversion", "distance (cm) = echo time (µs) ÷ 58"], ["Supply", "5 V (the HC-SR04P version runs at 3.3 V)"], ["Beam", "About 15° cone"]],
    supply: "5v",
    pins: [
      { id: "vcc", label: "VCC", role: "vcc" },
      { id: "trig", label: "TRIG", role: "digital", note3v3: "A 3.3 V pulse is enough to trigger most modules." },
      { id: "echo", label: "ECHO", role: "digital", out5v: "divider" },
      { id: "gnd", label: "GND", role: "gnd" },
    ],
    code: {
      arduino: `// HC-SR04: send a 10 µs pulse, time the echo, convert to centimetres.
const int TRIG = {pin:trig}, ECHO = {pin:echo};

void setup() {
  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);
  Serial.begin(115200);
}

void loop() {
  digitalWrite(TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG, HIGH);                  // 10 µs start pulse
  delayMicroseconds(10);
  digitalWrite(TRIG, LOW);
  long echoUs = pulseIn(ECHO, HIGH, 30000);  // 0 if no echo within about 5 m
  long cm = echoUs / 58;                     // 58 µs per cm, there and back
  Serial.print("cm:");
  Serial.println(cm);
  delay(100);
}
`,
      micropython: `from machine import Pin, time_pulse_us
import time

trig = Pin({pin:trig}, Pin.OUT, value=0)
echo = Pin({pin:echo}, Pin.IN)
while True:
    trig.value(1)                       # 10 µs start pulse
    time.sleep_us(10)
    trig.value(0)
    echo_us = time_pulse_us(echo, 1, 30000)
    print("cm:", echo_us // 58 if echo_us > 0 else "no echo")
    time.sleep_ms(100)
`,
    },
    expected: "Moving your hand toward the sensor makes the distance fall.",
    mistakes: ["ECHO connected straight to a 3.3 V board: the 5 V pulse can damage the pin over time.", "Readings of 0: nothing reflected within range, or TRIG and ECHO swapped.", "Triggering faster than about every 60 ms: echoes from the last ping confuse the reading."],
    check: { question: "The echo pulse lasts 1160 µs. How far away is the object?", options: ["11.6 cm", "20 cm", "58 cm"], answer: 1, why: "1160 µs ÷ 58 µs/cm = 20 cm." },
    inIndustry: "Parking sensors, tank-level gauges and robot obstacle detection use time-of-flight measurement.",
    studio: { type: "ultrasonic", pins: { vcc: "vcc", trig: "trig", echo: "echo", gnd: "gnd" }, props: { distance: 60 } },
    related: ["ir-obstacle", "buzzer"],
  },
  {
    slug: "pir", idea: "It notices moving warm bodies by the change in infrared light, not by seeing them.",
    howItWorks: [
      "A pyroelectric sensor behind a faceted plastic lens sees infrared from different zones. When a warm body moves between zones, the signal changes and OUT goes HIGH.",
      "It does not detect someone sitting perfectly still, and it cannot measure distance.",
      "The HC-SR501 has two trimmers (sensitivity and how long OUT stays HIGH) and a jumper for single or repeat triggering. It needs 30–60 seconds after power-up to settle.",
    ],
    facts: [["Supply", "5–20 V (HC-SR501)"], ["Output", "3.3 V HIGH: safe for every board"], ["Range", "Up to about 7 m, 110° cone"], ["Warm-up", "30–60 s after power-up"]],
    supply: "5v",
    pins: [
      { id: "vcc", label: "VCC", role: "vcc" },
      { id: "out", label: "OUT", role: "digital" },
      { id: "gnd", label: "GND", role: "gnd" },
    ],
    code: digitalSensorCode("out", false, "motion", "clear"),
    expected: "Waving a hand prints 'motion'; after the hold time it prints 'clear'.",
    mistakes: ["Testing immediately after power-up: false triggers for the first minute.", "Hold-time trimmer at maximum: OUT stays HIGH for several minutes.", "Pointing it at a heater or a sunny window: heat changes trigger it."],
    check: { question: "What does a PIR sensor actually detect?", options: ["Distance to a person", "A change in infrared between its zones, caused by movement of warm objects", "Visible light"], answer: 1, why: "It responds to changes in infrared, so a still person can go unnoticed." },
    inIndustry: "Burglar alarms, automatic lighting and energy-saving building controls use PIR sensors.",
    studio: { type: "pir", pins: { vcc: "vcc", out: "out", gnd: "gnd" } },
    related: ["hc-sr04"],
  },
  {
    slug: "ir-obstacle", idea: "An infrared LED and receiver: when something reflects the light back, the output goes LOW.",
    howItWorks: [
      "One LED sends invisible infrared light; a photodiode beside it looks for the reflection. A comparator chip (LM393) turns 'enough reflection' into a clean digital signal.",
      "Most modules pull OUT LOW when an obstacle is close (2–30 cm, set by the trimmer).",
      "Black or shiny surfaces reflect little infrared, and sunlight can swamp it, so test in your real conditions.",
    ],
    facts: [["Pins", "VCC, GND, OUT"], ["Output", "LOW when an obstacle is detected (most modules)"], ["Range", "≈ 2–30 cm, adjustable"], ["Supply", "3.3–5 V"]],
    supply: "logic",
    pins: [{ id: "vcc", label: "VCC", role: "vcc" }, { id: "gnd", label: "GND", role: "gnd" }, { id: "out", label: "OUT", role: "digital", note: moduleTrimmer }],
    code: digitalSensorCode("out", true, "obstacle", "clear"),
    expected: "Holding a hand in front prints 'obstacle'; moving away prints 'clear'.",
    mistakes: ["Testing in direct sunlight: constant false detections.", "Expecting distance values: this module only says yes or no."],
    check: { question: "Why might this sensor miss a black object?", options: ["Black absorbs infrared, so little light reflects back", "Black objects are too cold", "The comparator ignores black"], answer: 0, why: "Detection depends on reflected infrared, which dark matte surfaces absorb." },
    inIndustry: "Paper-feed sensors in printers, counting on conveyor belts and touch-free taps use reflective IR sensing.",
    related: ["line-sensor", "hc-sr04"],
  },
  {
    slug: "line-sensor", idea: "It sees the difference between a light floor and a black line, which is how line-following robots steer.",
    howItWorks: [
      "A TCRT5000 combines an infrared LED and a phototransistor facing the floor. A white surface reflects strongly; a black line reflects little.",
      "The comparator output (DO) switches when the reflection crosses the trimmer's threshold. On most modules DO is LOW over white and HIGH over black; check yours with the on-board LED.",
      "Mount it 3–10 mm above the floor. Robots use two or more sensors and steer to keep the line between them.",
    ],
    facts: [["Pins", "VCC, GND, DO (some also AO)"], ["Height above floor", "3–10 mm"], ["Supply", "3.3–5 V"]],
    supply: "logic",
    pins: [{ id: "vcc", label: "VCC", role: "vcc" }, { id: "gnd", label: "GND", role: "gnd" }, { id: "do", label: "DO", role: "digital", note: moduleTrimmer }],
    code: digitalSensorCode("do", false, "black line", "light floor"),
    expected: "Sliding the sensor over black tape prints 'black line'.",
    mistakes: ["Mounted too high: it cannot tell black from white.", "Assuming the output polarity: test over both surfaces and adjust the code."],
    check: { question: "Why does a line-following robot usually need at least two line sensors?", options: ["One for each wheel's power", "To tell whether the line has drifted left or right", "One is a spare"], answer: 1, why: "Comparing two sensors gives direction, so the robot knows which way to turn." },
    inIndustry: "Warehouse robots (AGVs) follow floor lines and tape with the same reflective sensing.",
    related: ["ir-obstacle", "l298n"],
  },
  {
    slug: "soil-moisture", idea: "Wet soil changes the probe's electrical behaviour; the module turns that into a voltage.",
    howItWorks: [
      "A capacitive probe (black, v1.2) measures how the soil changes the capacitance of a coated copper pad. Its output voltage falls as the soil gets wetter.",
      "Bare two-prong resistive probes measure current through the soil instead. They work, but corrode within weeks if powered all the time.",
      "Readings depend on soil type, so calibrate: note the value in dry air and in a glass of water, then map between them.",
    ],
    facts: [["Output (capacitive)", "Higher = drier, lower = wetter"], ["Supply", "3.3–5.5 V"], ["Calibrate", "Record dry and wet readings for your soil"]],
    supply: "logic",
    pins: [{ id: "vcc", label: "VCC", role: "vcc" }, { id: "gnd", label: "GND", role: "gnd" }, { id: "aout", label: "AOUT", role: "analog" }],
    code: analogSensorCode("aout", "moisture_raw", "lower = wetter on capacitive probes"),
    expected: "Pushing the probe into damp soil makes the reading drop.",
    mistakes: ["Pushing the probe in past the line: water reaches the electronics.", "Using a resistive probe powered all day: it corrodes. Power it from a pin only while reading.", "Using the same thresholds in different soils: always calibrate."],
    check: { question: "How do you make soil readings meaningful?", options: ["Use the raw number as a percentage", "Record the dry and wet readings and map between them", "Read it faster"], answer: 1, why: "The raw value depends on the probe and soil; calibration gives a 0–100 % scale." },
    inIndustry: "Smart irrigation and agricultural IoT systems save water by watering only when soil is dry.",
    related: ["water-level", "rain-sensor"],
  },
  {
    slug: "water-level", idea: "Exposed traces conduct more as water covers more of them, so the output rises with the water level.",
    howItWorks: [
      "The module's interleaved copper traces are joined by water. The more of the strip is submerged, the higher the output voltage on S.",
      "It is a rough indicator (empty, low, half, full), not a precise gauge, and the bare traces corrode with constant power.",
      "Power it from a pin and switch it on only while taking a reading to make it last far longer.",
    ],
    facts: [["Pins", "S (signal), + , −"], ["Output", "Rises as the water level rises"], ["Supply", "3.3–5 V"]],
    supply: "logic",
    pins: [{ id: "vcc", label: "+", role: "vcc" }, { id: "gnd", label: "−", role: "gnd" }, { id: "s", label: "S", role: "analog" }],
    code: analogSensorCode("s", "level_raw", "higher = more water"),
    expected: "Dipping the strip deeper into a cup of water raises the reading.",
    mistakes: ["Submerging the whole module: the components are not waterproof.", "Leaving it powered continuously: the traces corrode within days."],
    check: { question: "How can you make a resistive water sensor last longer?", options: ["Power it only while reading", "Use a higher voltage", "Read it more often"], answer: 0, why: "Corrosion happens while current flows; switching power off between readings slows it down." },
    inIndustry: "Tank monitoring and flood alarms use level sensing; commercial systems use float switches or ultrasonic sensors for longevity.",
    related: ["soil-moisture", "hc-sr04"],
  },
  {
    slug: "rain-sensor", idea: "Raindrops bridge the board's traces; the module reports wetness as a voltage and a yes/no output.",
    howItWorks: [
      "The separate sensing plate has interleaved traces. Water lowers the resistance between them; the control module turns that into AO (analog) and, through a comparator, DO (digital).",
      "DO goes LOW when the plate is wet (on most modules); AO falls as wetness increases.",
      "Mount the plate at an angle so water runs off and it dries after the rain stops.",
    ],
    facts: [["Pins", "VCC, GND, DO, AO"], ["DO", "LOW when wet (most modules)"], ["AO", "Lower = wetter"], ["Supply", "3.3–5 V"]],
    supply: "logic",
    pins: [{ id: "vcc", label: "VCC", role: "vcc" }, { id: "gnd", label: "GND", role: "gnd" }, { id: "do", label: "DO", role: "digital", note: moduleTrimmer }, { id: "ao", label: "AO", role: "nc", note: "Optional: connect AO to an analog pin to measure how wet it is." }],
    code: digitalSensorCode("do", true, "rain", "dry"),
    expected: "A few drops of water on the plate print 'rain'.",
    mistakes: ["Mounting the plate flat: it stays wet long after the rain.", "Powering it continuously outdoors: the traces corrode."],
    check: { question: "What is the difference between the AO and DO outputs?", options: ["There is none", "AO gives a varying wetness level; DO gives wet or dry using the trimmer threshold", "DO is for power"], answer: 1, why: "The comparator turns the analog level into a yes/no signal at the threshold you set." },
    inIndustry: "Car rain-sensing wipers and automatic skylights react to rain, using optical sensors in commercial products.",
    related: ["soil-moisture"],
  },
  {
    slug: "mpu6050", idea: "An accelerometer and a gyroscope on one chip: it senses tilt, shake and rotation.",
    howItWorks: [
      "The accelerometer measures acceleration on X, Y and Z, including gravity, so at rest it shows which way is down (1 g on one axis).",
      "The gyroscope measures how fast the board is rotating around each axis, in degrees per second.",
      "It talks over I2C at address 0x68. Wake it by writing 0 to register 0x6B, then read 14 bytes starting at 0x3B: accelerometer, temperature and gyroscope.",
    ],
    facts: [["Interface", "I2C, address 0x68 (0x69 if AD0 is HIGH)"], ["Default ranges", "±2 g (16384 per g) · ±250 °/s (131 per °/s)"], ["Module supply", "GY-521 has a regulator: 3.3–5 V"]],
    supply: "logic",
    pins: [{ id: "vcc", label: "VCC", role: "vcc" }, { id: "gnd", label: "GND", role: "gnd" }, { id: "scl", label: "SCL", role: "scl" }, { id: "sda", label: "SDA", role: "sda" }],
    code: {
      arduino: `// MPU6050 read directly over I2C: no library needed.
#include <Wire.h>

const uint8_t MPU = 0x68;   // 0x69 if AD0 is tied HIGH

int16_t read16() {
  int16_t high = Wire.read();
  return (high << 8) | Wire.read();
}

void setup() {
  Serial.begin(115200);
  Wire.begin();
  Wire.beginTransmission(MPU);
  Wire.write(0x6B);            // PWR_MGMT_1
  Wire.write(0);               // wake the sensor up
  if (Wire.endTransmission() != 0) Serial.println("MPU6050 not found: check SDA/SCL");
}

void loop() {
  Wire.beginTransmission(MPU);
  Wire.write(0x3B);            // first data register
  Wire.endTransmission(false);
  Wire.requestFrom((int)MPU, 14);
  float ax = read16() / 16384.0, ay = read16() / 16384.0, az = read16() / 16384.0;   // g
  read16();                    // temperature, skipped
  float gx = read16() / 131.0, gy = read16() / 131.0, gz = read16() / 131.0;          // degrees per second
  Serial.print("ax:"); Serial.print(ax, 2);
  Serial.print(" ay:"); Serial.print(ay, 2);
  Serial.print(" az:"); Serial.print(az, 2);
  Serial.print(" gx:"); Serial.print(gx, 1);
  Serial.print(" gy:"); Serial.print(gy, 1);
  Serial.print(" gz:"); Serial.println(gz, 1);
  delay(100);
}
`,
      micropython: `from machine import Pin, I2C
import struct, time

i2c = {MP_I2C}
MPU = 0x68
print("I2C devices:", [hex(a) for a in i2c.scan()])
i2c.writeto_mem(MPU, 0x6B, b"\\x00")          # wake the sensor up

while True:
    ax, ay, az, temp, gx, gy, gz = struct.unpack(">7h", i2c.readfrom_mem(MPU, 0x3B, 14))
    print("ax:", round(ax / 16384, 2), "ay:", round(ay / 16384, 2), "az:", round(az / 16384, 2),
          "gz:", round(gz / 131, 1))
    time.sleep_ms(100)
`,
    },
    expected: "Lying flat, az reads about 1.00; tilting moves gravity onto ax or ay.",
    mistakes: ["Forgetting to wake it: every value reads 0.", "Expecting the gyro to give an angle: it gives a rate. Integrating it drifts, which is why sensor fusion combines it with the accelerometer.", "Another I2C device at 0x68 (an RTC module): set AD0 HIGH to move the MPU6050 to 0x69."],
    check: { question: "The board lies flat and still. What should az read?", options: ["0 g", "About 1 g", "9.8 g"], answer: 1, why: "At rest the accelerometer measures gravity, 1 g on the vertical axis." },
    inIndustry: "Drones, phones, fitness trackers and self-balancing robots rely on inertial sensors and sensor fusion.",
    related: ["bme280", "oled-i2c"],
  },
  {
    slug: "bme280", idea: "Temperature, humidity and air pressure in one tiny I2C chip.",
    howItWorks: [
      "The BME280 measures temperature, relative humidity and barometric pressure, and returns calibrated values over I2C (address 0x76 or 0x77).",
      "Pressure falls about 12 Pa per metre of height, so it can also estimate altitude changes.",
      "Many small purple boards are 3.3 V only. Boards with a regulator and level shifter accept 5 V; check before connecting it to an Uno.",
    ],
    facts: [["Address", "0x76 (SDO to GND) or 0x77"], ["Accuracy", "±1 °C · ±3 % RH · ±1 hPa"], ["Look-alike", "BMP280: pressure only, chip id 0x58 instead of 0x60"]],
    supply: "3v3",
    pins: [
      { id: "vcc", label: "VIN / VCC", role: "vcc", note5v: "Use 3.3 V unless your breakout has a regulator and is marked 5 V-ready." },
      { id: "gnd", label: "GND", role: "gnd" },
      { id: "scl", label: "SCL", role: "scl" },
      { id: "sda", label: "SDA", role: "sda", note5v: "A bare 3.3 V breakout on a 5 V board should go through an I2C level shifter." },
    ],
    code: {
      arduino: `#include <Wire.h>
#include <Adafruit_BME280.h>

Adafruit_BME280 bme;

void setup() {
  Serial.begin(115200);
  if (!bme.begin(0x76) && !bme.begin(0x77)) {
    Serial.println("BME280 not found: check wiring and address (a BMP280 also fails here)");
    while (true) delay(1000);
  }
}

void loop() {
  Serial.print("temp:");
  Serial.print(bme.readTemperature(), 1);
  Serial.print(" humidity:");
  Serial.print(bme.readHumidity(), 1);
  Serial.print(" hPa:");
  Serial.println(bme.readPressure() / 100.0, 1);
  delay(2000);
}
`,
      micropython: `from machine import Pin, I2C

i2c = {MP_I2C}
for address in i2c.scan():
    if address in (0x76, 0x77):
        chip = i2c.readfrom_mem(address, 0xD0, 1)[0]
        print(hex(address), "chip id", hex(chip), "(0x60 = BME280, 0x58 = BMP280)")
# For readings, copy a BME280 MicroPython driver file (bme280.py) to the board.
`,
    },
    libs: { arduino: ["Adafruit BME280 Library", "Adafruit Unified Sensor"], micropython: "A bme280.py driver file (community driver)" },
    expected: "Temperature, humidity and pressure (around 1013 hPa at sea level) every 2 seconds.",
    mistakes: ["It is actually a BMP280 (no humidity): the library refuses it. Check the chip id.", "Wrong address: try 0x77 if 0x76 fails.", "Mounting it next to the board's regulator: it reads a few degrees too warm."],
    check: { question: "How can you tell a BME280 from a look-alike BMP280?", options: ["By colour", "By reading the chip id register: 0x60 for BME280, 0x58 for BMP280", "The BMP280 is larger"], answer: 1, why: "The boards look identical; only the id register (0xD0) is reliable." },
    inIndustry: "Weather stations, drones (altitude hold) and indoor-air monitors use combined environmental sensors.",
    related: ["dht11-dht22", "oled-i2c"],
  },
  {
    slug: "gas-sensor", idea: "A heated element whose resistance changes when certain gases reach it.",
    howItWorks: [
      "An MQ sensor (MQ-2 smoke/LPG, MQ-135 air quality) has a tiny heater and a tin-dioxide element. Gases at its surface lower its resistance, which the module turns into a voltage on AO.",
      "The heater draws about 150 mA and needs 5 V. Readings drift for the first minutes and stabilise properly only after a long burn-in.",
      "Use it to compare 'cleaner' with 'dirtier' air or to trigger a demo alarm. It is not a certified safety device.",
    ],
    facts: [["Supply", "5 V, ≈ 150 mA heater"], ["Warm-up", "A few minutes; 24–48 h burn-in for stable readings"], ["Outputs", "AO (level) and DO (threshold)"]],
    supply: "5v",
    pins: [
      { id: "vcc", label: "VCC", role: "vcc", note: "The heater gets warm: keep fingers and wires off the mesh cap." },
      { id: "gnd", label: "GND", role: "gnd" },
      { id: "ao", label: "AO", role: "analog", out5v: "divider" },
      { id: "do", label: "DO", role: "nc", note: "Optional threshold output (also 5 V)." },
    ],
    code: analogSensorCode("ao", "gas_raw", "higher = more gas; compare with clean air"),
    expected: "The reading settles after warm-up, then rises near a lighter's gas (unlit) or alcohol.",
    mistakes: ["Reading straight after power-up: values drift for several minutes.", "Using AO without a divider on a 3.3 V board: AO can reach 5 V.", "Relying on it for real gas safety: use a certified detector for that."],
    check: { question: "Why does an MQ sensor need warming up?", options: ["The heater must reach working temperature before readings are stable", "The ADC must warm up", "It charges a battery"], answer: 0, why: "Its sensing element only responds properly at its heater's operating temperature." },
    inIndustry: "Gas detection is a regulated safety field; certified detectors use calibrated electrochemical or catalytic sensors.",
    related: ["flame-sensor", "buzzer"],
  },
  {
    slug: "flame-sensor", idea: "An infrared photodiode tuned to the wavelengths flames give off.",
    howItWorks: [
      "The dark-tinted photodiode responds to infrared around 760–1100 nm, which flames emit strongly.",
      "The comparator output DO goes LOW when the IR level passes the trimmer's threshold; AO gives the raw level.",
      "Sunlight and incandescent bulbs also emit infrared, so expect false detections near them. This is a learning sensor, not a fire alarm.",
    ],
    facts: [["Detection", "Small flame at up to about 1 m"], ["DO", "LOW when flame detected (most modules)"], ["Supply", "3.3–5 V"]],
    supply: "logic",
    pins: [{ id: "vcc", label: "VCC", role: "vcc" }, { id: "gnd", label: "GND", role: "gnd" }, { id: "do", label: "DO", role: "digital", note: moduleTrimmer }, { id: "ao", label: "AO", role: "nc", note: "Optional: AO to an analog pin for the raw level." }],
    code: digitalSensorCode("do", true, "flame", "no flame"),
    expected: "A lighter flame at 20–50 cm prints 'flame'.",
    mistakes: ["Testing in sunlight: constant detections.", "Holding the flame too close: you can melt the sensor."],
    check: { question: "Why might the flame sensor trigger near a sunny window?", options: ["Sunlight contains infrared in the same range as flames", "The sensor is broken", "Heat melts it"], answer: 0, why: "It cannot tell the IR from a flame apart from IR from the sun." },
    inIndustry: "Industrial flame detectors combine UV and multiple IR bands to reject sunlight and hot objects.",
    related: ["gas-sensor"],
  },
  {
    slug: "hall-sensor", idea: "It detects a magnetic field, so a magnet can work as a contact-free switch.",
    howItWorks: [
      "A Hall-effect sensor produces a small voltage when a magnetic field passes through it. Switch-type parts (A3144, KY-003) turn that into a digital output.",
      "The A3144's output is open-collector: it pulls LOW when the right magnet pole is near, and the module's resistor pulls it HIGH otherwise.",
      "It counts wheel turns, detects a lid closing and measures speed with no moving contacts to wear out.",
    ],
    facts: [["Output", "LOW when a magnet's south pole faces the front (A3144)"], ["Supply", "4.5–24 V for the A3144"], ["Uses", "Speed, position, lid/door switches"]],
    supply: "5v",
    pins: [{ id: "vcc", label: "VCC (+)", role: "vcc" }, { id: "gnd", label: "GND (−)", role: "gnd" }, { id: "s", label: "S (signal)", role: "digital", out5v: "divider", note3v3: "Modules with a 3.3 V Hall chip (AH3144, US5881) can run from 3.3 V without the divider: check yours." }],
    code: digitalSensorCode("s", true, "magnet", "no magnet"),
    expected: "Bringing a magnet's south pole close prints 'magnet'.",
    mistakes: ["Using the wrong pole: try flipping the magnet.", "Weak fridge magnets: use a small neodymium magnet."],
    check: { question: "Why are Hall sensors popular for counting wheel turns?", options: ["They are very cheap", "They work without contact, so nothing wears out", "They measure distance"], answer: 1, why: "A magnet passing the sensor switches it with no mechanical wear." },
    inIndustry: "Cars use Hall sensors for wheel speed (ABS), crankshaft position and brushless motor control.",
    related: ["rotary-encoder"],
  },
  {
    slug: "sound-sensor", idea: "A microphone and comparator that tell you when it is loud, not what was said.",
    howItWorks: [
      "An electret microphone's tiny signal is compared against a threshold set by the trimmer. DO changes state when the sound is louder than that.",
      "AO gives the amplified signal, but it is too noisy and slow to sample for real audio. Use it for claps and noise levels.",
      "Set the trimmer in a quiet room until the module's LED just turns off.",
    ],
    facts: [["Pins", "VCC, GND, DO, AO (KY-038 style)"], ["Good for", "Clap switches, noise-level alarms"], ["Not for", "Recording or speech"]],
    supply: "logic",
    pins: [{ id: "vcc", label: "VCC (+)", role: "vcc" }, { id: "gnd", label: "GND", role: "gnd" }, { id: "do", label: "DO", role: "digital", note: moduleTrimmer }, { id: "ao", label: "AO", role: "nc", note: "Optional: AO to an analog pin to see the sound level." }],
    code: digitalSensorCode("do", false, "loud", "quiet"),
    expected: "A clap prints 'loud', then 'quiet' again.",
    mistakes: ["Trimmer set too sensitive: it never stops triggering.", "Expecting voice recognition: it only detects level."],
    check: { question: "What is the DO output's job?", options: ["To record sound", "To switch when the sound level passes the trimmer's threshold", "To power the microphone"], answer: 1, why: "The comparator turns 'louder than the set level' into a digital signal." },
    inIndustry: "Noise monitoring on construction sites and smart-building occupancy sensing start from sound-level detection.",
    related: ["buzzer"],
  },
];
