# STEMBuild First Robot Learning Path

This release completes the first visual, beginner-friendly path from a first LED circuit to an obstacle-avoiding robot.

## Path

1. My First LED Circuit
2. Push-Button Light
3. Automatic Light Detector
4. Smart Environment Monitor
5. Ultrasonic Distance Lab
6. Servo Sweep Lab
7. L298N Motor Driver Test
8. Bluetooth-Controlled Car
9. Obstacle-Avoiding Robot

The purpose of the bridge labs is to prevent a learner from moving directly from a simple sensor lesson into a complex robot without first understanding distance sensing, servo power/control and motor-driver behavior.

## Guide status

The exact board-specific guides in `src/lib/verified-build-guides.ts` are **source-reviewed**. This means the connection map and code have been checked against board/component documentation and safety constraints, but a guide is not labelled as physically validated merely because it is in the catalog.

A future bench-validation pass should record:
- exact board/revision,
- exact module/revision,
- measured supply voltage,
- motor/servo supply,
- code version,
- observed output,
- any polarity or wiring corrections.

## Technical references used for the reviewed guides

- Arduino Uno Rev3 technical specifications and pinout:
  https://store.arduino.cc/products/arduino-uno-rev3
- Arduino Uno R3 datasheet:
  https://docs.arduino.cc/resources/datasheets/A000066-datasheet.pdf
- Espressif GPIO voltage tolerance / ESP32 hardware FAQ:
  https://docs.espressif.com/projects/esp-faq/en/latest/hardware-related/hardware-design.html
- SparkFun HC-SR04 product documentation:
  https://www.sparkfun.com/ultrasonic-distance-sensor-hc-sr04.html
- Adafruit DHT11/DHT22 overview and wiring:
  https://learn.adafruit.com/dht/overview
  https://learn.adafruit.com/dht/connecting-to-a-dhtxx-sensor
- STMicroelectronics L298 dual full-bridge driver:
  https://www.st.com/en/motor-drivers/l298.html
- SparkFun beginner servo-control guidance:
  https://learn.sparkfun.com/tutorials/basic-servo-control-for-beginners/controlling-a-servo-with-arduino-and-servo-library

## Visual learning

The path combines:
- real component photographs where the image has been verified,
- component pin/role cards,
- board-specific connection maps,
- pre-power checks,
- reviewed example code,
- expected-result descriptions,
- common-mistake guidance.

If a real photo is not yet verified (for example, a specific L298N module revision), STEMBuild shows the explicit “Photo not yet verified” state instead of substituting an arbitrary image.

## Safety decisions

- ESP32 GPIO is treated as a 3.3 V system; 5 V signals are not connected directly.
- The HC-SR04 exact reviewed guide in this release is Arduino Uno only because its common ECHO output is 5 V.
- Servos use a suitable regulated external supply with common ground rather than assuming the controller rail can safely supply stall current.
- L298N module regulator/jumper layouts are treated as module-specific. The guide verifies control wiring but tells the learner to verify the exact motor-power terminal and jumper arrangement before power.
- HC-05 carrier boards are treated as variant-dependent; the Arduino TX path to HC-05 RXD requires appropriate logic protection unless exact carrier documentation proves otherwise.
- Motor/servo first tests happen with wheels/load made safe.
- Practical completion remains evidence/teacher-reviewed; finishing Build Mode alone is not assessment proof.
