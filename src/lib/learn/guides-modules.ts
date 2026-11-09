import type { ComponentGuide } from "@/lib/learn/types";
import { I2C_SCAN_MP, serialBridgeCode } from "@/lib/learn/templates";

const capacitorNote = "Solder or plug a 10 µF capacitor across VCC and GND, right at the module.";

export const moduleGuides: ComponentGuide[] = [
  {
    slug: "lcd-1602", idea: "Two lines of 16 characters. The I2C backpack cuts the wiring from 12 wires to 4.",
    howItWorks: [
      "A 16×2 character LCD shows letters and numbers from a built-in font. On its own it needs 6–10 data and control wires.",
      "The small PCF8574 'backpack' soldered on the back turns it into an I2C device (usually at address 0x27 or 0x3F), so only SDA, SCL, power and ground are needed.",
      "The blue trimmer on the backpack sets the contrast. If you see a row of solid boxes or nothing at all, turn it slowly.",
    ],
    facts: [["Address", "0x27 (PCF8574) or 0x3F (PCF8574A)"], ["Supply", "5 V"], ["Characters", "16 per line, 2 lines"]],
    supply: "5v",
    pins: [
      { id: "gnd", label: "GND", role: "gnd" },
      { id: "vcc", label: "VCC", role: "vcc" },
      { id: "sda", label: "SDA", role: "sda", out5v: "shifter", note3v3: "The backpack pulls SDA/SCL up to 5 V; a level shifter keeps your 3.3 V pins safe." },
      { id: "scl", label: "SCL", role: "scl", out5v: "shifter" },
    ],
    code: {
      arduino: `#include <Wire.h>
#include <LiquidCrystal_I2C.h>

LiquidCrystal_I2C lcd(0x27, 16, 2);   // try 0x3F if the screen stays blank

void setup() {
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("Hello, STEMBuild");
}

void loop() {
  lcd.setCursor(0, 1);                // column 0, second line
  lcd.print("Uptime: ");
  lcd.print(millis() / 1000);
  lcd.print(" s   ");
  delay(500);
}
`,
      micropython: `${I2C_SCAN_MP}# Expect 0x27 or 0x3f. For text, copy an I2C LCD driver (lcd_api.py + i2c_lcd.py) to the board.
`,
    },
    libs: { arduino: ["LiquidCrystal I2C (Frank de Brabander)"], micropython: "lcd_api.py + i2c_lcd.py (community driver)" },
    expected: "'Hello, STEMBuild' on the first line and a counting uptime on the second.",
    mistakes: ["Backlight on but no text: adjust the contrast trimmer.", "Wrong address: run an I2C scanner to find it.", "SDA and SCL swapped: nothing appears."],
    check: { question: "What does the I2C backpack on a 16×2 LCD do?", options: ["Makes the screen brighter", "Converts the LCD's many parallel wires into a 2-wire I2C connection", "Adds a touch screen"], answer: 1, why: "The PCF8574 is an I2C port expander that drives the LCD's parallel pins for you." },
    inIndustry: "Character LCDs remain common on lab instruments, vending machines and industrial controllers.",
    related: ["oled-i2c"],
  },
  {
    slug: "oled-i2c", idea: "A tiny, sharp screen whose pixels make their own light, controlled over two I2C wires.",
    howItWorks: [
      "Each of the 128×64 pixels is a tiny OLED that lights by itself, so there is no backlight and the contrast is excellent.",
      "The SSD1306 controller sits at I2C address 0x3C (sometimes 0x3D). The library draws into a copy of the screen in RAM, then display() sends it all at once.",
      "That copy needs 1 KB, half of an Arduino Uno's RAM, so keep the rest of a big Uno sketch lean.",
    ],
    facts: [["Resolution", "128 × 64 (also 128 × 32)"], ["Address", "0x3C (or 0x3D)"], ["Supply", "3.3–5 V modules"], ["RAM for buffer", "1 KB"]],
    supply: "logic",
    pins: [{ id: "gnd", label: "GND", role: "gnd" }, { id: "vcc", label: "VCC", role: "vcc" }, { id: "scl", label: "SCL", role: "scl" }, { id: "sda", label: "SDA", role: "sda" }],
    code: {
      arduino: `#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

Adafruit_SSD1306 display(128, 64, &Wire, -1);   // -1: no reset pin

void setup() {
  Serial.begin(115200);
  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {   // some modules use 0x3D
    Serial.println("OLED not found: check SDA/SCL and the address");
    while (true) delay(1000);
  }
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(2);
  display.setCursor(0, 0);
  display.println("STEMBuild");
  display.display();
}

void loop() {
  display.fillRect(0, 32, 128, 32, SSD1306_BLACK);   // clear the lower half
  display.setTextSize(1);
  display.setCursor(0, 40);
  display.print("Uptime: ");
  display.print(millis() / 1000);
  display.print(" s");
  display.display();                                 // send the buffer to the screen
  delay(500);
}
`,
      micropython: `# Install the driver once: in Thonny use Tools > Manage packages > "ssd1306",
# or on a board with Wi-Fi: import mip; mip.install("ssd1306")
from machine import Pin, I2C
import ssd1306, time

i2c = {MP_I2C}
oled = ssd1306.SSD1306_I2C(128, 64, i2c)          # address 0x3C
oled.text("STEMBuild", 0, 0)
oled.show()
start = time.time()
while True:
    oled.fill_rect(0, 32, 128, 16, 0)
    oled.text("Uptime: %d s" % (time.time() - start), 0, 40)
    oled.show()
    time.sleep_ms(500)
`,
    },
    libs: { arduino: ["Adafruit SSD1306", "Adafruit GFX Library"], micropython: "ssd1306 (micropython-lib)" },
    expected: "'STEMBuild' in large text with an uptime counter below.",
    mistakes: ["Forgetting display(): nothing changes on screen.", "Wrong address: run an I2C scanner.", "Running out of RAM on an Uno with a large sketch: the screen stays blank."],
    check: { question: "Why do you call display() after drawing?", options: ["To turn the screen on", "Drawing happens in a RAM buffer; display() sends it to the screen", "To clear the screen"], answer: 1, why: "The library draws into memory first and updates the screen in one transfer." },
    inIndustry: "Small OLEDs are used in wearables, test equipment and IoT devices for status displays.",
    related: ["lcd-1602", "mpu6050", "bme280"],
  },
  {
    slug: "seven-segment", idea: "Seven LED bars (plus a dot) that light in patterns to form the digits 0–9.",
    howItWorks: [
      "The segments are named a–g, clockwise from the top, with g in the middle. In a common-cathode display all the − ends are joined.",
      "Lighting a set of segments forms a digit: 1 is b + c, 8 is all seven. Each segment is an LED and needs its own resistor.",
      "Multi-digit displays share the segment pins and light one digit at a time very quickly (multiplexing).",
    ],
    facts: [["Segments", "a–g + dp"], ["Type", "Common cathode (5161AS) or common anode (5161BS)"], ["Resistors", "One 220 Ω per segment"]],
    supply: "logic",
    pins: [
      ...["a", "b", "c", "d", "e", "f", "g"].map((s) => ({ id: s, label: `Segment ${s}`, role: "digital" as const, via: "220 Ω resistor" })),
      { id: "common", label: "Common (−)", role: "gnd", note: "Either common pin (3 or 8) will do." },
      { id: "dp", label: "dp (decimal point)", role: "nc" },
    ],
    code: {
      arduino: `// Common-cathode 7-segment digit: count 0 to 9.
const int SEGMENTS[7] = {{pin:a}, {pin:b}, {pin:c}, {pin:d}, {pin:e}, {pin:f}, {pin:g}};   // a..g
const byte DIGITS[10] = {          // bit 0 = segment a ... bit 6 = segment g
  0b0111111, 0b0000110, 0b1011011, 0b1001111, 0b1100110,
  0b1101101, 0b1111101, 0b0000111, 0b1111111, 0b1101111
};

void show(int digit) {
  for (int s = 0; s < 7; s++) digitalWrite(SEGMENTS[s], (DIGITS[digit] >> s) & 1);
}

void setup() {
  for (int s = 0; s < 7; s++) pinMode(SEGMENTS[s], OUTPUT);
}

void loop() {
  for (int digit = 0; digit <= 9; digit++) {
    show(digit);
    delay(700);
  }
}
`,
      micropython: `from machine import Pin
import time

segments = [Pin(p, Pin.OUT) for p in ({pin:a}, {pin:b}, {pin:c}, {pin:d}, {pin:e}, {pin:f}, {pin:g})]
DIGITS = (0b0111111, 0b0000110, 0b1011011, 0b1001111, 0b1100110,   # bit 0 = a ... bit 6 = g
          0b1101101, 0b1111101, 0b0000111, 0b1111111, 0b1101111)

def show(digit):
    for s, pin in enumerate(segments):
        pin.value((DIGITS[digit] >> s) & 1)

while True:
    for digit in range(10):
        show(digit)
        time.sleep_ms(700)
`,
    },
    expected: "The display counts 0 to 9 and repeats.",
    mistakes: ["Common-anode display: every segment is inverted. Connect common to the supply and invert the bits.", "One resistor on the common pin: digits with more segments look dimmer.", "Segments in the wrong order: digits look scrambled. Check a–g against the datasheet."],
    check: { question: "Which segments light to show the digit 1?", options: ["a and d", "b and c", "f and e"], answer: 1, why: "b and c are the two right-hand vertical bars." },
    inIndustry: "Seven-segment displays are still used in clocks, fuel pumps, lifts and meters because they are bright and cheap.",
    related: ["led", "led-matrix"],
  },
  {
    slug: "led-matrix", idea: "64 LEDs in an 8×8 grid, driven by a MAX7219 chip that remembers the pattern for you.",
    howItWorks: [
      "The MAX7219 stores one byte per row and keeps the LEDs scanned and evenly lit by itself. Your code only sends it 16-bit messages: a register number and a value.",
      "Registers 1–8 hold the eight rows; others set brightness (0x0A), scan limit (0x0B) and wake from shutdown (0x0C).",
      "Data goes in on DIN, clocked by CLK, and is latched when CS goes HIGH. Modules can be chained for scrolling text.",
    ],
    facts: [["Driver", "MAX7219, 5 V"], ["Pins", "VCC, GND, DIN, CS, CLK"], ["Current", "Up to ≈ 300 mA at full brightness"]],
    supply: "5v",
    pins: [
      { id: "vcc", label: "VCC", role: "vcc" },
      { id: "gnd", label: "GND", role: "gnd" },
      { id: "din", label: "DIN", role: "digital", note3v3: "The MAX7219 expects at least 3.5 V for HIGH; 3.3 V often works, but a 74HCT125 buffer makes it reliable." },
      { id: "cs", label: "CS", role: "digital" },
      { id: "clk", label: "CLK", role: "digital" },
    ],
    code: {
      arduino: `// MAX7219 8x8 matrix driven directly: no library needed.
const int DIN = {pin:din}, CS = {pin:cs}, CLK = {pin:clk};
const byte SMILE[8] = {0x3C, 0x42, 0xA5, 0x81, 0xA5, 0x99, 0x42, 0x3C};

void send(byte reg, byte value) {
  digitalWrite(CS, LOW);
  shiftOut(DIN, CLK, MSBFIRST, reg);
  shiftOut(DIN, CLK, MSBFIRST, value);
  digitalWrite(CS, HIGH);          // the chip latches the 16 bits here
}

void setup() {
  pinMode(DIN, OUTPUT);
  pinMode(CS, OUTPUT);
  pinMode(CLK, OUTPUT);
  digitalWrite(CS, HIGH);
  send(0x09, 0x00);   // no digit decoding: raw LEDs
  send(0x0A, 0x04);   // brightness 0..15
  send(0x0B, 0x07);   // scan all 8 rows
  send(0x0C, 0x01);   // leave shutdown mode
  send(0x0F, 0x00);   // display test off
  for (int row = 0; row < 8; row++) send(row + 1, SMILE[row]);
}

void loop() {
  for (int level = 0; level <= 15; level++) { send(0x0A, level); delay(60); }
  for (int level = 15; level >= 0; level--) { send(0x0A, level); delay(60); }
}
`,
      micropython: `from machine import Pin
import time

din = Pin({pin:din}, Pin.OUT)
cs = Pin({pin:cs}, Pin.OUT, value=1)
clk = Pin({pin:clk}, Pin.OUT, value=0)
SMILE = (0x3C, 0x42, 0xA5, 0x81, 0xA5, 0x99, 0x42, 0x3C)

def send(register, value):
    cs.value(0)
    for bit in range(15, -1, -1):       # 16 bits, most significant first
        din.value(((register << 8 | value) >> bit) & 1)
        clk.value(1)
        clk.value(0)
    cs.value(1)                         # the chip latches here

for register, value in ((0x09, 0), (0x0A, 4), (0x0B, 7), (0x0C, 1), (0x0F, 0)):
    send(register, value)
for row in range(8):
    send(row + 1, SMILE[row])

while True:
    for level in list(range(16)) + list(range(15, -1, -1)):
        send(0x0A, level)
        time.sleep_ms(60)
`,
    },
    expected: "A smiley face that slowly pulses in brightness.",
    mistakes: ["Forgetting to leave shutdown mode (register 0x0C): nothing lights.", "Full brightness on USB power with several modules: the board resets.", "Pattern appears rotated: modules are mounted differently, so rotate the bytes."],
    check: { question: "What does the MAX7219 do that saves your code work?", options: ["It generates the font", "It stores the pattern and keeps scanning the LEDs by itself", "It measures light"], answer: 1, why: "Once you write the eight row bytes, the chip refreshes the display without any further help." },
    inIndustry: "LED driver chips run scoreboards, signage and bus-stop displays; the register-write pattern is the same on most peripheral chips.",
    related: ["seven-segment", "led"],
  },
  {
    slug: "tft-display", idea: "A full-colour graphic screen over SPI: pixels, shapes, text and images.",
    howItWorks: [
      "A 1.8\" TFT has 128×160 colour pixels and an ST7735 controller. Data travels over SPI, which is much faster than I2C, plus a DC pin that says whether a byte is a command or pixel data.",
      "Its logic is 3.3 V. On a 5 V Arduino, use a level shifter on the signal lines (or a module that states it is 5 V-tolerant).",
      "Drawing a full screen moves a lot of data, so redraw only the parts that change.",
    ],
    facts: [["Controller", "ST7735 (1.8\"), ILI9341 (2.4–2.8\")"], ["Interface", "SPI + DC + RESET + CS"], ["Logic", "3.3 V"]],
    supply: "3v3",
    pins: [
      { id: "vcc", label: "VCC", role: "vcc", note5v: "Modules with a regulator also accept 5 V; 3.3 V is always safe." },
      { id: "gnd", label: "GND", role: "gnd" },
      { id: "cs", label: "CS", role: "cs", max3v3: "shifter" },
      { id: "rst", label: "RESET", role: "digital", max3v3: "shifter" },
      { id: "dc", label: "A0 / DC", role: "digital", max3v3: "shifter" },
      { id: "sda", label: "SDA (MOSI)", role: "mosi", max3v3: "shifter" },
      { id: "sck", label: "SCK", role: "sck", max3v3: "shifter" },
      { id: "led", label: "LED (backlight)", role: "vcc", supply: "3v3" },
    ],
    code: {
      arduino: `#include <SPI.h>
#include <Adafruit_GFX.h>
#include <Adafruit_ST7735.h>

Adafruit_ST7735 tft({pin:cs}, {pin:dc}, {pin:rst});   // CS, DC (A0), RESET

void setup() {
  tft.initR(INITR_BLACKTAB);        // try INITR_GREENTAB if colours or edges look wrong
  tft.fillScreen(ST77XX_BLACK);
  tft.setTextColor(ST77XX_WHITE);
  tft.setTextSize(2);
  tft.setCursor(10, 20);
  tft.print("STEMBuild");
  tft.fillCircle(64, 95, 28, ST77XX_BLUE);
}

void loop() {
  tft.fillRect(10, 140, 110, 10, ST77XX_BLACK);   // redraw only what changes
  tft.setCursor(10, 140);
  tft.setTextSize(1);
  tft.print("Uptime: ");
  tft.print(millis() / 1000);
  tft.print(" s");
  delay(1000);
}
`,
    },
    libs: { arduino: ["Adafruit ST7735 and ST7789 Library", "Adafruit GFX Library"], micropython: "Needs a ST7735 driver; the Arduino code is the easiest start" },
    expected: "'STEMBuild', a blue circle and an uptime counter.",
    mistakes: ["White screen only: wiring or the wrong init (try INITR_GREENTAB or INITR_REDTAB).", "Driving it straight from 5 V pins: it may work for a while, then fail.", "Clearing the whole screen every loop: visible flicker."],
    check: { question: "What is the DC (A0) pin for?", options: ["Power", "It tells the display whether the byte on SPI is a command or pixel data", "Backlight brightness"], answer: 1, why: "The same SPI wires carry both commands and data; DC tells them apart." },
    inIndustry: "Embedded GUI work (thermostats, medical monitors, car dashboards) builds on SPI or parallel display drivers.",
    related: ["oled-i2c", "sd-card"],
  },
  {
    slug: "hc05", idea: "Bluetooth that behaves like a serial cable: what one side sends, the other receives.",
    howItWorks: [
      "The HC-05 speaks Bluetooth Classic SPP (serial port profile). Pair it with a phone or laptop, open a serial terminal app, and characters pass straight through to your board's UART.",
      "Its TXD connects to the board's RX and its RXD to the board's TX. The module's logic is 3.3 V, so on a 5 V board the RXD line needs a divider.",
      "In data mode it runs at 9600 baud by default. Holding the KEY/EN button at power-up enters AT command mode (38400 baud) to change its name or PIN.",
    ],
    facts: [["Default baud", "9600 (AT mode: 38400)"], ["PIN", "1234 or 0000"], ["Range", "≈ 10 m"], ["Logic", "3.3 V; carrier boards accept 3.6–6 V power"]],
    supply: "5v",
    pins: [
      { id: "vcc", label: "VCC", role: "vcc" },
      { id: "gnd", label: "GND", role: "gnd" },
      { id: "txd", label: "TXD", role: "tx" },
      { id: "rxd", label: "RXD", role: "rx", max3v3: "divider" },
      { id: "state", label: "STATE / EN", role: "nc" },
    ],
    code: {
      arduino: serialBridgeCode(9600, "Pair with HC-05 (PIN 1234 or 0000), then open a Bluetooth serial app."),
      micropython: `from machine import Pin, UART
import time

bt = {MP_UART:9600}
print("Pair with HC-05 (PIN 1234 or 0000) and send text from a Bluetooth serial app.")
while True:
    if bt.any():
        data = bt.read()
        print("received:", data)
        bt.write(b"echo: " + data)
    time.sleep_ms(20)
`,
    },
    expected: "Text typed in the phone app appears in the Serial Monitor (and the reverse).",
    mistakes: ["TX to TX and RX to RX: nothing arrives. Cross them over.", "No divider on RXD from a 5 V board: the module may fail over time.", "Expecting it to work with iPhones: they do not support Bluetooth Classic SPP. Use Android or a laptop."],
    check: { question: "The HC-05's TXD pin connects to which board pin?", options: ["TX", "RX", "5V"], answer: 1, why: "One side's transmit must feed the other side's receive." },
    inIndustry: "Serial-over-Bluetooth links configure industrial sensors and medical devices in the field; the ESP32 has Bluetooth built in.",
    related: ["neo6m", "sim800"],
  },
  {
    slug: "nrf24l01", idea: "A cheap 2.4 GHz radio that sends small packets between boards, with automatic acknowledgements.",
    howItWorks: [
      "Two (or up to six) nRF24L01+ modules exchange packets of up to 32 bytes. The receiver automatically confirms each packet, and the sender retries if no confirmation comes.",
      "It connects over SPI plus CE (radio enable) and CSN (chip select). Power is strictly 3.3 V, but its inputs tolerate 5 V logic.",
      "Most problems are power problems: the radio draws short current spikes, so add a 10 µF capacitor right across VCC and GND.",
    ],
    facts: [["Supply", "1.9–3.6 V only, never 5 V"], ["Data rate", "250 kbps – 2 Mbps"], ["Range", "≈ 30–100 m (PA+LNA versions further)"], ["Packet", "Up to 32 bytes"]],
    supply: "3v3",
    pins: [
      { id: "gnd", label: "GND", role: "gnd" },
      { id: "vcc", label: "VCC", role: "vcc", note: capacitorNote, note5v: "The 3.3V pin is just enough for the basic module; PA+LNA versions need their own 3.3 V regulator." },
      { id: "ce", label: "CE", role: "digital" },
      { id: "csn", label: "CSN", role: "cs" },
      { id: "sck", label: "SCK", role: "sck" },
      { id: "mosi", label: "MOSI", role: "mosi" },
      { id: "miso", label: "MISO", role: "miso" },
      { id: "irq", label: "IRQ", role: "nc" },
    ],
    code: {
      arduino: `// nRF24L01 transmitter. Load the RF24 library's GettingStarted example on a second board to receive.
#include <SPI.h>
#include <RF24.h>

RF24 radio({pin:ce}, {pin:csn});         // CE, CSN
const byte ADDRESS[6] = "NODE1";

void setup() {
  Serial.begin(115200);
  if (!radio.begin()) {
    Serial.println("nRF24 not responding: check 3.3 V, the capacitor and SPI wiring");
    while (true) delay(1000);
  }
  radio.setPALevel(RF24_PA_LOW);         // low power while the boards are close
  radio.openWritingPipe(ADDRESS);
  radio.stopListening();                 // this board transmits
}

void loop() {
  unsigned long uptime = millis() / 1000;
  bool delivered = radio.write(&uptime, sizeof(uptime));
  Serial.println(delivered ? "sent and acknowledged" : "no acknowledgement (is the receiver on?)");
  delay(1000);
}
`,
    },
    libs: { arduino: ["RF24 (TMRh20)"], micropython: "nrf24l01 driver (micropython-lib)" },
    expected: "'sent and acknowledged' every second once a receiver is running.",
    mistakes: ["Powering it from 5 V: the module is destroyed.", "No capacitor: random failures, especially from the Uno's 3.3V pin.", "Modules too close at high power: they can fail to talk at under 1 m. Use RF24_PA_LOW."],
    check: { question: "What is the most common cause of nRF24L01 problems?", options: ["Wrong baud rate", "Unstable 3.3 V power during transmit spikes", "Too much range"], answer: 1, why: "A capacitor at the module and an adequate 3.3 V supply fix most issues." },
    inIndustry: "2.4 GHz packet radios are used in wireless keyboards, toy drones and sensor networks.",
    related: ["lora", "hc05"],
  },
  {
    slug: "lora", idea: "Long-range, low-power radio: small messages over kilometres instead of metres.",
    howItWorks: [
      "LoRa spreads each message over a wide band using chirps, which lets a receiver pick it out far below the noise. Ranges of 2–10 km in open country are common.",
      "The price is speed: a few hundred bytes per second at most, and legal limits on how often you may transmit.",
      "SX1276/SX1278 modules (RFM95, Ra-02) are 3.3 V devices on SPI. Use the frequency band allowed where you live (433, 868 or 915 MHz), and always fit the antenna before transmitting.",
    ],
    facts: [["Bands", "433 MHz · 868 MHz (Europe, Africa) · 915 MHz (Americas)"], ["Range", "≈ 2–10 km line of sight"], ["Logic and power", "3.3 V only"]],
    supply: "3v3",
    pins: [
      { id: "vcc", label: "3.3V", role: "vcc", note5v: "This board's 3.3V pin gives only about 50 mA and transmitting needs up to 120 mA: use a separate 3.3 V regulator (AMS1117-3.3)." },
      { id: "gnd", label: "GND", role: "gnd" },
      { id: "nss", label: "NSS (CS)", role: "cs", max3v3: "shifter" },
      { id: "mosi", label: "MOSI", role: "mosi", max3v3: "shifter" },
      { id: "miso", label: "MISO", role: "miso" },
      { id: "sck", label: "SCK", role: "sck", max3v3: "shifter" },
      { id: "rst", label: "RESET", role: "digital", max3v3: "shifter" },
      { id: "dio0", label: "DIO0", role: "digital" },
      { id: "ant", label: "ANT", role: "ext", to: "Antenna for your band (fit it before transmitting)" },
    ],
    code: {
      arduino: `#include <SPI.h>
#include <LoRa.h>

const long FREQUENCY = 433E6;   // 433E6, 868E6 or 915E6: match your module and your country's rules

void setup() {
  Serial.begin(115200);
  LoRa.setPins({pin:nss}, {pin:rst}, {pin:dio0});   // NSS, RESET, DIO0
  if (!LoRa.begin(FREQUENCY)) {
    Serial.println("LoRa module not found: check 3.3 V and SPI wiring");
    while (true) delay(1000);
  }
}

int counter = 0;

void loop() {
  LoRa.beginPacket();
  LoRa.print("hello ");
  LoRa.print(counter++);
  LoRa.endPacket();
  Serial.println("packet sent");
  delay(5000);                  // keep within duty-cycle limits
}
`,
    },
    libs: { arduino: ["LoRa (Sandeep Mistry)"], micropython: "Needs an SX127x driver; start with the Arduino code" },
    expected: "'packet sent' every 5 seconds; a second board running the library's receiver example prints the messages.",
    mistakes: ["Transmitting without an antenna: the module can be damaged.", "Wrong frequency for the module (a 433 MHz board told 868 MHz): no range at all.", "Connecting it straight to 5 V Arduino pins: it is not 5 V tolerant."],
    check: { question: "What does LoRa trade for its long range?", options: ["Battery life", "Data rate: messages must be small and infrequent", "Size"], answer: 1, why: "Spreading the signal for range makes each bit take much longer to send." },
    inIndustry: "LoRaWAN networks carry readings from water meters, farm sensors and livestock trackers.",
    related: ["nrf24l01", "neo6m"],
  },
  {
    slug: "sim800", idea: "A mobile-network modem: send SMS, make calls and use GPRS data with text commands.",
    howItWorks: [
      "The SIM800L talks to the cellular network and to your board over UART. You control it with AT commands, plain text like AT+CSQ (signal quality) or AT+CMGS (send SMS).",
      "It needs 3.4–4.4 V and can draw 2 A in short bursts while transmitting. Board pins cannot supply that: use a Li-ion cell or a buck converter set to about 4 V, with a large capacitor.",
      "It works only on 2G (GSM) networks, which are being switched off in many countries. Check your local network before building with it.",
    ],
    facts: [["Supply", "3.4–4.4 V, 2 A peaks"], ["Default baud", "9600 (auto-baud)"], ["Network", "2G GSM only"], ["Status LED", "Blinks every 3 s once registered"]],
    supply: "external",
    pins: [
      { id: "vcc", label: "VCC", role: "vcc", to: "Li-ion cell + (3.7–4.2 V) or a buck converter at 4.0 V, 2 A", note: "Add a 470–1000 µF capacitor across VCC and GND at the module." },
      { id: "gnd", label: "GND", role: "gnd", note: "The supply's − joins here too." },
      { id: "txd", label: "TXD", role: "tx" },
      { id: "rxd", label: "RXD", role: "rx", max3v3: "divider", note3v3: "A 1 kΩ series resistor adds protection." },
      { id: "ant", label: "Antenna", role: "ext", to: "The supplied antenna (spring or stick)" },
    ],
    code: {
      arduino: `// SIM800L: send a few AT commands, then type your own in the Serial Monitor.
{UART_SETUP}

void setup() {
  Serial.begin(115200);
  {UART_BEGIN:9600}
  delay(1000);
  {UART}.println("AT");          // modem replies OK
  delay(300);
  {UART}.println("AT+CSQ");      // signal quality: 10-31 is usable
  delay(300);
  {UART}.println("AT+CREG?");    // ,1 or ,5 means registered on the network
}

void loop() {
  if ({UART}.available()) Serial.write({UART}.read());
  if (Serial.available()) {UART}.write(Serial.read());
}
`,
      micropython: `from machine import Pin, UART
import time

modem = {MP_UART:9600}
for command in ("AT", "AT+CSQ", "AT+CREG?"):   # OK, signal 10-31, registered ,1 or ,5
    modem.write(command + "\\r\\n")
    time.sleep_ms(500)
    print(command, "->", modem.read())
`,
    },
    expected: "OK, a signal-quality value and the registration status appear in the monitor.",
    mistakes: ["Powering it from the board's 5V or 3.3V pin: it resets every time it transmits.", "No antenna: it never registers.", "Using it where 2G has been switched off: it never finds a network."],
    check: { question: "Why does a SIM800L need its own power supply?", options: ["It needs 12 V", "It draws up to 2 A in bursts at 3.4–4.4 V, far more than board pins provide", "It needs AC"], answer: 1, why: "Transmit bursts collapse a weak supply and reset the modem." },
    inIndustry: "Cellular modules (now 4G LTE-M and NB-IoT) connect vending machines, trackers and remote meters.",
    related: ["neo6m", "battery-pack", "buck-converter"],
  },
  {
    slug: "neo6m", idea: "A GPS receiver that streams your position as lines of text, once a second.",
    howItWorks: [
      "The module listens to GPS satellites and calculates position, time and speed. It sends the results as NMEA sentences over UART at 9600 baud, for example $GPRMC (position and time) and $GPGGA (fix quality).",
      "It needs a clear view of the sky. The first fix after power-up (cold start) can take 1–5 minutes; the blinking LED means it has a fix.",
      "Reading positions needs only its TX line. A library such as TinyGPSPlus turns the sentences into latitude and longitude.",
    ],
    facts: [["Default baud", "9600"], ["Update rate", "1 Hz"], ["Cold start", "≈ 30 s – 5 min outdoors"], ["Accuracy", "≈ 2.5 m in good conditions"]],
    supply: "logic",
    pins: [
      { id: "vcc", label: "VCC", role: "vcc" },
      { id: "gnd", label: "GND", role: "gnd" },
      { id: "tx", label: "TX", role: "tx" },
      { id: "rx", label: "RX", role: "nc", note: "Only needed to configure the module." },
    ],
    code: {
      arduino: `// NEO-6M GPS: print the raw NMEA sentences. Look for $GPRMC and $GPGGA lines.
{UART_SETUP}

void setup() {
  Serial.begin(115200);
  {UART_BEGIN:9600}             // NEO-6M default
  Serial.println("Take the antenna outside or to a window: the first fix can take 1-5 minutes.");
}

void loop() {
  while ({UART}.available()) Serial.write({UART}.read());
}
`,
      micropython: `from machine import Pin, UART

gps = {MP_UART:9600}
print("Waiting for NMEA sentences (first fix outdoors takes 1-5 minutes)...")
while True:
    line = gps.readline()
    if not line:
        continue
    try:
        text = line.decode().strip()
    except UnicodeError:
        continue
    if text[3:6] in ("RMC", "GGA"):     # position/time and fix quality
        print(text)
`,
    },
    libs: { arduino: ["TinyGPSPlus (for latitude/longitude, optional)"] },
    expected: "Lines starting with $GP appear every second; with a fix, $GPRMC shows an A and coordinates.",
    mistakes: ["Testing indoors far from a window: no fix, just empty fields.", "TX to TX: nothing arrives. Module TX goes to board RX.", "Expecting a fix in seconds after first power-up: the first one is slow."],
    check: { question: "What does the NEO-6M send to the board?", options: ["Images", "Lines of text (NMEA sentences) with position, time and fix status", "Analog voltage"], answer: 1, why: "It streams ASCII sentences over UART that any board can read." },
    inIndustry: "Fleet tracking, agriculture and drone navigation all start from GNSS receivers like this.",
    related: ["sim800", "lora"],
  },
  {
    slug: "rfid-rc522", idea: "Reads the ID of a card or key tag held a few centimetres away, using a 13.56 MHz field.",
    howItWorks: [
      "The reader's antenna creates a radio field that powers the passive card, which replies with its unique ID (UID) and can store a little data.",
      "The RC522 talks to your board over SPI. It is a 3.3 V device; many Uno projects connect it directly, but a level shifter is the safe choice.",
      "UIDs can be copied, so use them to identify cards in projects rather than as real security.",
    ],
    facts: [["Frequency", "13.56 MHz (MIFARE Classic cards and fobs)"], ["Range", "≈ 2–5 cm"], ["Logic and power", "3.3 V"], ["Interface", "SPI (the SDA pin is chip select)"]],
    supply: "3v3",
    pins: [
      { id: "sda", label: "SDA (SS)", role: "cs", max3v3: "shifter" },
      { id: "sck", label: "SCK", role: "sck", max3v3: "shifter" },
      { id: "mosi", label: "MOSI", role: "mosi", max3v3: "shifter" },
      { id: "miso", label: "MISO", role: "miso" },
      { id: "irq", label: "IRQ", role: "nc" },
      { id: "gnd", label: "GND", role: "gnd" },
      { id: "rst", label: "RST", role: "digital", max3v3: "shifter" },
      { id: "vcc", label: "3.3V", role: "vcc" },
    ],
    code: {
      arduino: `#include <SPI.h>
#include <MFRC522.h>

MFRC522 reader({pin:sda}, {pin:rst});   // SS (labelled SDA), RST

void setup() {
  Serial.begin(115200);
  SPI.begin();
  reader.PCD_Init();
  Serial.println("Hold a card or tag near the reader...");
}

void loop() {
  if (!reader.PICC_IsNewCardPresent() || !reader.PICC_ReadCardSerial()) return;
  Serial.print("card UID:");
  for (byte i = 0; i < reader.uid.size; i++) {
    Serial.print(reader.uid.uidByte[i] < 0x10 ? " 0" : " ");
    Serial.print(reader.uid.uidByte[i], HEX);
  }
  Serial.println();
  reader.PICC_HaltA();                  // wait for the card to be removed
}
`,
    },
    libs: { arduino: ["MFRC522 (GithubCommunity / miguelbalboa)"], micropython: "Needs an MFRC522 driver; start with the Arduino code" },
    expected: "Holding a card near the reader prints its UID, for example 'card UID: 4A 3F 9C 12'.",
    mistakes: ["Powering it from 5 V: the module can be damaged.", "Header not soldered, just pushed through: intermittent readings.", "Holding the card too far away: keep it within 3 cm."],
    check: { question: "Why shouldn't an RFID card's UID be used as a real door key?", options: ["It changes every day", "UIDs can be copied to other cards", "It is too long"], answer: 1, why: "Cheap 'magic' cards can be written with any UID, so security systems use encrypted authentication." },
    inIndustry: "Access control, library systems, public transport and inventory tracking use RFID.",
    related: ["lcd-1602", "relay-module"],
  },
  {
    slug: "sd-card", idea: "Gigabytes of storage over SPI: log sensor data to files you can open on a computer.",
    howItWorks: [
      "SD cards understand a simple SPI mode, so a microcontroller can read and write files on a FAT32-formatted card.",
      "Common blue modules have a 3.3 V regulator and level shifter, so they run from 5 V on any board. Bare 3.3 V adapters must be powered from 3.3 V.",
      "Open the file, write, then close it (or flush) every time, so data survives if power is cut.",
    ],
    facts: [["Format", "FAT32, 32 GB or smaller works best"], ["Interface", "SPI: CS, SCK, MOSI, MISO"], ["Module supply", "5 V (regulated modules)"]],
    supply: "5v",
    pins: [
      { id: "gnd", label: "GND", role: "gnd" },
      { id: "vcc", label: "VCC", role: "vcc" },
      { id: "miso", label: "MISO", role: "miso" },
      { id: "mosi", label: "MOSI", role: "mosi" },
      { id: "sck", label: "SCK", role: "sck" },
      { id: "cs", label: "CS", role: "cs" },
    ],
    code: {
      arduino: `#include <SPI.h>
#include <SD.h>

const int CS_PIN = {pin:cs};

void setup() {
  Serial.begin(115200);
  if (!SD.begin(CS_PIN)) {
    Serial.println("Card not found: check wiring and that it is FAT32");
    while (true) delay(1000);
  }
  Serial.println("Card ready: logging to /log.csv");
}

void loop() {
  File file = SD.open("/log.csv", {SD_APPEND});   // adds to the end of the file
  if (file) {
    file.print(millis() / 1000);
    file.println(",hello");
    file.close();                    // close every time so data survives a power cut
    Serial.println("line written");
  }
  delay(5000);
}
`,
      micropython: `# Install the driver once: in Thonny use Tools > Manage packages > "sdcard",
# or on a board with Wi-Fi: import mip; mip.install("sdcard")
from machine import Pin, SPI
import sdcard, os, time

card = sdcard.SDCard({MP_SPI}, Pin({pin:cs}, Pin.OUT))
os.mount(os.VfsFat(card), "/sd")
while True:
    with open("/sd/log.csv", "a") as f:          # closed automatically after each write
        f.write("%d,hello\\n" % time.time())
    print("line written; files:", os.listdir("/sd"))
    time.sleep(5)
`,
    },
    libs: { arduino: ["SD (built in)"], micropython: "sdcard (micropython-lib)" },
    expected: "'line written' every 5 seconds; on a computer, log.csv contains one line per write.",
    mistakes: ["Card formatted as exFAT (64 GB+ cards): it is not found. Reformat as FAT32.", "Pulling power while the file is open: the last data is lost.", "Sharing SPI with another device whose CS is left floating: both misbehave. Give each device its own CS."],
    check: { question: "Why close the file after every write?", options: ["To save power", "So the data is actually written to the card and survives a power cut", "Files can only be written once"], answer: 1, why: "Writes are buffered in RAM until the file is flushed or closed." },
    inIndustry: "Data loggers for weather, vehicles and industrial machines record to SD or flash storage.",
    related: ["rtc", "bme280"],
  },
  {
    slug: "rtc", idea: "A clock chip with its own battery that keeps the date and time when the board is off.",
    howItWorks: [
      "A microcontroller's millis() resets at every power-up. A real-time clock keeps counting from a coin cell, so logs and alarms have real timestamps.",
      "The DS3231 is temperature-compensated: accurate to about a minute a year. It sits on I2C at 0x68 and stores time as BCD (binary-coded decimal) digits.",
      "Set it once (the Arduino example uses the time the sketch was compiled), then just read it.",
    ],
    facts: [["Chip", "DS3231 (accurate) or DS1307 (drifts more)"], ["Address", "0x68"], ["Accuracy", "±2 ppm ≈ 1 minute per year"], ["Backup", "CR2032 coin cell"]],
    supply: "logic",
    pins: [{ id: "gnd", label: "GND", role: "gnd" }, { id: "vcc", label: "VCC", role: "vcc" }, { id: "sda", label: "SDA", role: "sda" }, { id: "scl", label: "SCL", role: "scl" }],
    code: {
      arduino: `#include <Wire.h>
#include <RTClib.h>

RTC_DS3231 rtc;

void setup() {
  Serial.begin(115200);
  if (!rtc.begin()) {
    Serial.println("RTC not found: check SDA/SCL");
    while (true) delay(1000);
  }
  if (rtc.lostPower()) rtc.adjust(DateTime(F(__DATE__), F(__TIME__)));   // set from the compile time
}

void loop() {
  DateTime now = rtc.now();
  char text[20];
  snprintf(text, sizeof(text), "%04d-%02d-%02d %02d:%02d:%02d",
           now.year(), now.month(), now.day(), now.hour(), now.minute(), now.second());
  Serial.println(text);
  delay(1000);
}
`,
      micropython: `from machine import Pin, I2C
import time

i2c = {MP_I2C}
RTC = 0x68

def bcd(value):                          # each nibble is one decimal digit
    return (value >> 4) * 10 + (value & 0x0F)

while True:
    s, m, h, _, day, month, year = i2c.readfrom_mem(RTC, 0x00, 7)
    print("20%02d-%02d-%02d %02d:%02d:%02d" % (bcd(year), bcd(month & 0x1F), bcd(day),
                                                bcd(h & 0x3F), bcd(m), bcd(s & 0x7F)))
    time.sleep(1)
`,
    },
    libs: { arduino: ["RTClib (Adafruit)"] },
    expected: "The date and time print every second and survive unplugging the board.",
    mistakes: ["No coin cell: the time resets with the board.", "Some modules have a charging circuit meant for rechargeable LIR2032 cells: with a normal CR2032, remove the charging diode or resistor.", "An MPU6050 also at 0x68: move the MPU6050 to 0x69."],
    check: { question: "Why use an RTC instead of millis()?", options: ["It is faster", "It keeps real date and time, even while the board is unpowered", "It uses less memory"], answer: 1, why: "millis() counts from the last reset; the RTC runs from its own battery." },
    inIndustry: "Data loggers, access-control systems and meters need trustworthy timestamps for records and audits.",
    related: ["sd-card", "mpu6050"],
  },
];
