// Code templates shared by several guides. {pin:id} and the other tokens are filled per board.

/** A module with a digital output that changes state when it detects something. */
export function digitalSensorCode(pinId: string, activeLow: boolean, detected: string, clear: string) {
  const level = activeLow ? "LOW" : "HIGH";
  const mpLevel = activeLow ? 0 : 1;
  return {
    arduino: `const int SENSOR = {pin:${pinId}};
bool wasDetected = false;

void setup() {
  pinMode(SENSOR, INPUT);
  Serial.begin(115200);
}

void loop() {
  bool detected = digitalRead(SENSOR) == ${level};   // this module's output is ${level} when it triggers
  if (detected != wasDetected) {
    Serial.println(detected ? "${detected}" : "${clear}");
    wasDetected = detected;
  }
  delay(20);
}
`,
    micropython: `from machine import Pin
import time

sensor = Pin({pin:${pinId}}, Pin.IN)
was_detected = False
while True:
    detected = sensor.value() == ${mpLevel}   # this module's output is ${mpLevel} when it triggers
    if detected != was_detected:
        print("${detected}" if detected else "${clear}")
        was_detected = detected
    time.sleep_ms(20)
`,
  };
}

/** An analog output printed as raw counts and volts, ready for the serial plotter. */
export function analogSensorCode(pinId: string, name: string, comment: string) {
  return {
    arduino: `const int SENSOR = {pin:${pinId}};

void setup() {
  Serial.begin(115200);
}

void loop() {
  int raw = analogRead(SENSOR);                  // 0..{ADC_MAX}
  float volts = raw * {VREF} / {ADC_MAX};
  Serial.print("${name}:");                      // ${comment}
  Serial.print(raw);
  Serial.print(" volts:");
  Serial.println(volts, 2);
  delay(250);
}
`,
    micropython: `from machine import ADC, Pin
import time

sensor = ADC(Pin({pin:${pinId}}))
{MP_ATTEN:sensor}
while True:
    raw = sensor.read_u16()                      # 0..65535
    print("${name}:", raw, "volts:", round(raw * 3.3 / 65535, 2))   # ${comment}
    time.sleep_ms(250)
`,
  };
}

/** One H-bridge channel: two direction pins and a PWM speed pin. */
export function hBridgeCode(en: string, in1: string, in2: string, extraSetup = "", mpExtra = "") {
  return {
    arduino: `const int EN = {pin:${en}}, IN1 = {pin:${in1}}, IN2 = {pin:${in2}};

// speed: -255 (full reverse) .. 0 (stop) .. 255 (full forward)
void drive(int speed) {
  digitalWrite(IN1, speed > 0 ? HIGH : LOW);
  digitalWrite(IN2, speed < 0 ? HIGH : LOW);
  analogWrite(EN, abs(speed));
}

void setup() {
  pinMode(EN, OUTPUT);
  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);${extraSetup}
}

void loop() {
  drive(200);  delay(2000);   // forward
  drive(0);    delay(1000);   // stop
  drive(-200); delay(2000);   // reverse
  drive(0);    delay(1000);
}
`,
    micropython: `from machine import Pin, PWM
import time

en = PWM(Pin({pin:${en}}), freq=1000)
in1 = Pin({pin:${in1}}, Pin.OUT)
in2 = Pin({pin:${in2}}, Pin.OUT)${mpExtra}

def drive(speed):              # -255 (reverse) .. 255 (forward)
    in1.value(1 if speed > 0 else 0)
    in2.value(1 if speed < 0 else 0)
    en.duty_u16(abs(speed) * 257)

while True:
    drive(200)
    time.sleep(2)
    drive(0)
    time.sleep(1)
    drive(-200)
    time.sleep(2)
    drive(0)
    time.sleep(1)
`,
  };
}

/** Switch a load on and off through a transistor or MOSFET. */
export function switchCode(pinId: string, name: string, onMs: number, offMs: number, comment: string) {
  return {
    arduino: `const int ${name} = {pin:${pinId}};

void setup() {
  pinMode(${name}, OUTPUT);
  digitalWrite(${name}, LOW);    // start with the load off
}

void loop() {
  digitalWrite(${name}, HIGH);   // ${comment}
  delay(${onMs});
  digitalWrite(${name}, LOW);
  delay(${offMs});
}
`,
    micropython: `from machine import Pin
import time

${name.toLowerCase()} = Pin({pin:${pinId}}, Pin.OUT, value=0)   # start with the load off
while True:
    ${name.toLowerCase()}.value(1)   # ${comment}
    time.sleep_ms(${onMs})
    ${name.toLowerCase()}.value(0)
    time.sleep_ms(${offMs})
`,
  };
}

/** Bridge a serial module to the Serial Monitor in both directions. */
export function serialBridgeCode(baud: number, intro: string) {
  return `{UART_SETUP}

void setup() {
  Serial.begin(115200);
  {UART_BEGIN:${baud}}
  Serial.println("${intro}");
}

void loop() {
  if ({UART}.available()) Serial.write({UART}.read());   // module -> computer
  if (Serial.available()) {UART}.write(Serial.read());   // computer -> module
}
`;
}

/** List the addresses that answer on the I2C bus (MicroPython). */
export const I2C_SCAN_MP = `from machine import Pin, I2C

i2c = {MP_I2C}
print("I2C devices found:", [hex(address) for address in i2c.scan()])
`;
