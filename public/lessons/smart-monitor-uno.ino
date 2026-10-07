// STEMBuild: Smart Environment Monitor — Arduino Uno
// DHT22 sample. Confirm your exact sensor and board before wiring.
#include <DHT.h>
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
