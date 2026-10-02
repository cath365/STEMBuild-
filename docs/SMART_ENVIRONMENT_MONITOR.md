# SMART ENVIRONMENT MONITOR

## Purpose

This is STEMBuild's polished beginner showcase lesson/project for demonstrating the full learning-engineering workflow.

**Learning objective:** students learn how a microcontroller reads environmental sensors and converts temperature/humidity measurements into useful information.

The project is intentionally evidence-first. Opening the lesson, uploading firmware, or seeing code on screen does **not** mark the practical work successful.

Practical completion depends on:
- measurable learner evidence;
- valid recorded observations where applicable; and/or
- teacher rubric review.

## Supported boards

### Arduino Uno
- DHT data: D2
- green LED: D8 through 330 ohm
- red LED: D9 through 330 ohm
- optional low-current buzzer: D10
- Arduino C++
- Arduino IDE + DHT sensor library
- Serial Monitor: 9600 baud

### ESP32
- DHT data: GPIO4
- green LED: GPIO18 through 330 ohm
- red LED: GPIO19 through 330 ohm
- optional low-current buzzer: GPIO23
- Arduino C++
- Arduino IDE + ESP32 core + DHT sensor library
- Serial Monitor: 115200 baud

Exact sensor/module pinout and voltage requirements must be checked before power-up.

## Hardware

- compatible microcontroller
- breadboard
- jumper wires
- DHT11/DHT22 temperature-humidity sensor
- two LEDs
- 330 ohm resistors
- 10k pull-up where required by the exact sensor/module
- optional low-current buzzer

The threshold indicator is an educational example only. It is not a certified environmental, medical, fire or safety alarm.

## Student journey

1. Introduction
2. Components
3. Safety
4. Wiring
5. Code
6. Run test
7. Record readings
8. Troubleshoot
9. Answer assessment questions
10. Upload evidence
11. Teacher rubric
12. Learning analytics update

The UI labels each stage by evidence state. It does not infer that a test worked simply because the learner viewed the instructions.

## Evidence requirements

Learners are asked to record at least three observed temperature/humidity readings when valid readings are available.

Acceptable evidence can include:
- a clear circuit photograph;
- a serial-monitor screenshot/PDF;
- notes containing the observed readings;
- board-specific source code;
- troubleshooting records.

If valid readings were not obtained, the learner should document the failure honestly and submit troubleshooting evidence rather than fabricate measurements.

## Teacher rubric

The dedicated showcase rubric assesses:

- safe circuit and sensor wiring;
- sensor reading and interpretation;
- microcontroller programming;
- testing and troubleshooting;
- evidence and explanation;
- connected-data understanding.

The teacher remains responsible for final practical assessment.

## Learning analytics

Existing learner events capture:
- lesson start/completion;
- quiz attempts and answers;
- practical/project attempts;
- hardware selection;
- code submission;
- troubleshooting;
- evidence upload;
- teacher rubric scoring.

Skill updates are therefore based on stored events and teacher scores rather than generic page views.

## ESP32 advanced mode

After local sensor readings have been validated, the ESP32 variant exposes a collapsed **Advanced mode** explanation.

It describes how a future authenticated telemetry flow could send a payload such as:

```json
{
  "deviceId": "classroom-device-id",
  "temperatureC": 24.8,
  "humidityPct": 58,
  "measuredAt": "2026-10-02T08:00:00Z"
}
```

to a STEMBuild dashboard endpoint over HTTPS.

The current showcase does **not** claim that live telemetry ingestion is already implemented, and telemetry is not required for practical completion. Credentials should never be hard-coded into code shared among learners.
