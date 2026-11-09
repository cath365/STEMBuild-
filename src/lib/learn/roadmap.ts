// The path from a first LED to embedded-engineering skills. Each stage has core components
// (counted for progress) and extras to explore.

export type RoadmapStage = {
  id: string;
  title: string;
  goal: string;
  core: string[];
  more: string[];
  skills: string[];
  project: { slug: string; title: string };
  career: string;
};

export const ROADMAP: RoadmapStage[] = [
  {
    id: "first-circuits", title: "First circuits", goal: "Make light and sound, and read buttons and knobs.",
    core: ["breadboard", "led", "resistor-330", "push-button", "resistor-10k", "potentiometer", "buzzer"],
    more: ["rgb-led", "toggle-switch", "jumper-wires", "arduino-uno"],
    skills: ["Ohm's law and current limiting", "Digital output and input", "Pull-up resistors and debouncing", "Analog readings with the ADC", "PWM for brightness and tone"],
    project: { slug: "button-light", title: "Push-Button Light" },
    career: "Bringing up a new board always starts like this: blink an LED, read a button, print to serial. Every embedded engineer does it.",
  },
  {
    id: "sensing", title: "Sensing the world", goal: "Turn light, temperature, distance and motion into numbers you can trust.",
    core: ["ldr", "lm35", "dht11-dht22", "ds18b20", "hc-sr04", "pir", "ir-obstacle", "soil-moisture"],
    more: ["line-sensor", "water-level", "rain-sensor", "flame-sensor", "sound-sensor", "hall-sensor", "gas-sensor"],
    skills: ["Voltage dividers", "Converting raw counts into real units", "Calibration and thresholds", "Timing pulses (time of flight)", "Single-wire digital protocols (1-Wire, DHT)"],
    project: { slug: "plant-monitor", title: "Smart Plant Monitor" },
    career: "Sensor integration and calibration is daily work for IoT, agri-tech and test engineers.",
  },
  {
    id: "motion", title: "Making things move", goal: "Drive motors, servos and relays safely, with the right driver and power.",
    core: ["transistor-npn", "diode", "mosfet", "servo", "dc-motor", "l298n", "stepper-motor", "relay-module"],
    more: ["tb6612fng", "l293d", "uln2003", "vibration-motor", "solenoid", "robot-chassis", "robot-wheels", "servo-bracket"],
    skills: ["Why pins cannot power loads", "Transistor and MOSFET switches", "Flyback protection", "H-bridges and PWM speed control", "Separate supplies with a common ground"],
    project: { slug: "obstacle-robot", title: "Obstacle-Avoiding Robot" },
    career: "Robotics, automation and mechatronics roles are built on exactly these driver and power skills.",
  },
  {
    id: "buses", title: "Displays and data buses", goal: "Talk to smart chips over I2C and SPI, show results and log data.",
    core: ["oled-i2c", "lcd-1602", "mpu6050", "bme280", "rtc", "sd-card", "keypad-4x4", "rotary-encoder"],
    more: ["seven-segment", "led-matrix", "tft-display", "joystick"],
    skills: ["I2C addresses and bus scanning", "SPI and chip-select", "Reading datasheets and registers", "Using and choosing libraries", "Data logging with timestamps"],
    project: { slug: "weather-station", title: "Mini Weather Station" },
    career: "Bringing up I2C and SPI peripherals from a datasheet is the heart of junior firmware work.",
  },
  {
    id: "connected", title: "Connected systems", goal: "Send data over Bluetooth, radio, GPS and cellular, and build IoT devices.",
    core: ["esp32", "raspberry-pi-pico", "hc05", "nrf24l01", "lora", "neo6m"],
    more: ["sim800", "rfid-rc522", "esp32-cam", "arduino-mega", "arduino-nano", "microbit"],
    skills: ["UART and AT commands", "3.3 V design and level shifting", "Radio range and reliability", "Parsing streamed data (NMEA)", "Device-to-cloud thinking"],
    project: { slug: "connected-sensor-dashboard", title: "Connected Sensor Dashboard" },
    career: "IoT developers connect devices like these to networks and dashboards in agriculture, logistics and utilities.",
  },
  {
    id: "power", title: "Power and real products", goal: "Run projects from batteries and the sun, safely and for a long time.",
    core: ["battery-pack", "18650", "tp4056", "buck-converter", "boost-converter", "solar-panel"],
    more: ["regulated-5v-supply", "stm32"],
    skills: ["Power budgets and battery life", "Li-ion safety and charging", "Switching regulators", "Designing for the field, not the bench", "Moving from prototype to product"],
    project: { slug: "livestock-tracker", title: "Livestock Tracker Prototype" },
    career: "Hardware and product-design engineers decide how a device is powered, protected and made reliable.",
  },
];

export const CAREER_ROLES = [
  { title: "Embedded firmware engineer", stages: ["first-circuits", "buses", "connected"], what: "Writes the code that runs on microcontrollers: drivers, timing, communication and low-power modes." },
  { title: "IoT developer", stages: ["sensing", "connected", "power"], what: "Connects sensors to networks and dashboards, and keeps devices running in the field." },
  { title: "Robotics technician / engineer", stages: ["sensing", "motion", "buses"], what: "Builds, wires, tunes and repairs robots and automated machines." },
  { title: "Hardware test engineer", stages: ["first-circuits", "sensing", "buses"], what: "Designs tests and fixtures that prove each board works before it ships." },
  { title: "Electronics design engineer", stages: ["motion", "power", "buses"], what: "Designs circuits and PCBs: power supplies, drivers, protection and sensor front-ends." },
];

export function stageOf(slug: string) {
  return ROADMAP.find((stage) => stage.core.includes(slug) || stage.more.includes(slug));
}

/** The next not-yet-learned core component after this one, within its stage, then the next stage. */
export function nextAfter(slug: string, learned: ReadonlySet<string>) {
  const order = ROADMAP.flatMap((stage) => stage.core);
  const start = Math.max(0, order.indexOf(slug));
  for (let i = 1; i <= order.length; i++) {
    const candidate = order[(start + i) % order.length];
    if (candidate !== slug && !learned.has(candidate)) return candidate;
  }
  return null;
}
