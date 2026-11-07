import type { Metadata } from "next";
import { ToolShell } from "@/components/tools/tool-shell";
import { VirtualArduino } from "@/components/tools/virtual-arduino";

export const metadata: Metadata = {
  title: "Virtual Arduino Uno",
  description: "Write Arduino code, compile it in the browser and run it on an emulated ATmega328P with LEDs, buttons, sensors and a serial monitor.",
};

export default function Page() {
  return <ToolShell slug="virtual-arduino" eyebrow="LEVEL 2 · VIRTUAL ARDUINO UNO" title="No Arduino?" accent="Run your code anyway." intro="Write real Arduino C++. STEMBuild compiles it to machine code in your browser and runs it on a simulated ATmega328P chip, the same processor as a real Uno, with LEDs, buttons, sensors and a serial monitor.">
      <VirtualArduino />
      <div className="notice" style={{ marginTop: 16 }}><strong>ESP32, Raspberry Pi Pico or micro:bit?</strong> Their chips can’t be emulated in a browser yet, but the Arduino language (<code>pinMode</code>, <code>digitalWrite</code>, <code>analogRead</code>, <code>Serial</code>) is the same on an ESP32 and on a Pico with the Arduino core. What you learn here carries straight over; only pin numbers and the 3.3 V logic level change.</div>
  </ToolShell>;
}