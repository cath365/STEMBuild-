export const showcaseBoards = {
  uno: { name: "Arduino Uno", sensorPin: 2, greenPin: 8, redPin: 9, voltage: "5 V", baud: 9600, file: "smart-monitor-uno.ino" },
  esp32: { name: "ESP32", sensorPin: 4, greenPin: 18, redPin: 19, voltage: "3.3 V", baud: 115200, file: "smart-monitor-esp32.ino" },
} as const;

export function monitorCode(board: keyof typeof showcaseBoards) {
  const b = showcaseBoards[board];
  return `// STEMBuild: Smart Environment Monitor — ${b.name}
// DHT22 sample. Confirm your exact sensor and board before wiring.
#include <DHT.h>
const int SENSOR_PIN = ${b.sensorPin};
const int GREEN_LED = ${b.greenPin};
const int RED_LED = ${b.redPin};
#define SENSOR_TYPE DHT22
DHT sensor(SENSOR_PIN, SENSOR_TYPE);

void setup() {
  Serial.begin(${b.baud});
  pinMode(GREEN_LED, OUTPUT);
  pinMode(RED_LED, OUTPUT);
  sensor.begin();
}

void loop() {
  delay(2500); // Allow time between DHT measurements.
  float humidity = sensor.readHumidity();
  float temperature = sensor.readTemperature();
  if (isnan(humidity) || isnan(temperature)) {
    Serial.println("Read failed: check power, ground, DATA and sensor type.");
    digitalWrite(GREEN_LED, LOW);
    digitalWrite(RED_LED, HIGH);
    delay(250);
    digitalWrite(RED_LED, LOW); // Flashing red means a reading fault.
    return;
  }
  Serial.print("Temperature C: "); Serial.print(temperature, 1);
  Serial.print(" | Humidity %: "); Serial.println(humidity, 1);
  // Example classroom thresholds, not an environmental safety alarm.
  bool aboveThreshold = temperature > 30.0 || humidity > 75.0;
  digitalWrite(GREEN_LED, aboveThreshold ? LOW : HIGH);
  digitalWrite(RED_LED, aboveThreshold ? HIGH : LOW);
}
`;
}

export const monitorRubric = [
  ["Safe circuit and sensor wiring", "Correct supply, common ground, sensor pinout and LED resistors."],
  ["Sensor reading and interpretation", "Three actual readings, units and an explanation of variation."],
  ["Microcontroller program", "Correct board pins, sensor type, reading interval and indicators."],
  ["Testing and troubleshooting", "A deliberate check, what changed and what happened afterwards."],
  ["Evidence and explanation", "Clear circuit/result evidence and an honest account of unresolved faults."],
  ["Connected-data understanding", "Explain how validated readings could reach an ESP32 dashboard."],
] as const;
